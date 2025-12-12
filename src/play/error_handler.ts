import {AudioInfo} from "../types/audio";
import {dbHelper} from "../database/db_init";
import {QueueStatus} from "../playing_queue/queue_status";
import {QueueController} from "../playing_queue/queue_controller";
import {throttleTimeOut} from "../utils/util";
import {createAlert} from "../utils/front/alert";
import {backoffDelay} from "../utils/Math";
import {getPlugin, isAuthAble} from "../plugins";

interface RetryState {
    retryCount: number;
    cooldownUntil: number;
    pending: boolean;
    abortCtrl: AbortController;
    timerId?: number;
}

interface Cred {
    key: string;
    psd: string;
}

export class PlayErrorHandler {
    public static readonly MAX_RETRY = 5;
    public static readonly THROTTLE_MS = 1000;

    private static readonly retryStates = new Map<string, RetryState>();
    private static lastAlertAt: number = 0;

    private static getRetryState(key: string): RetryState {
        const state = this.retryStates.get(key);
        if (state) return state;

        const s: RetryState = {
            retryCount: 0,
            cooldownUntil: 0,
            pending: false,
            abortCtrl: new AbortController(),
            timerId: undefined
        };
        this.retryStates.set(key, s);
        return s;
    }

    private static abortRetry(state: RetryState): void {
        state.abortCtrl.abort();
        clearTimeout(state.timerId);
        state.timerId = undefined;
    }

    private static currentTrackKey(): string | null {
        const current = QueueStatus.getCurrentPlaying();
        const idx = QueueStatus.getCurrentIndex();
        if (!current) return null;
        return this.makeTrackKey(current, idx);
    }

    private static retainOnlyActiveState(): void {
        const active = this.currentTrackKey();
        if (!active) {
            for (const k of this.retryStates.keys()) {
                const state = this.retryStates.get(k);
                if (state) this.abortRetry(state);
            }
            this.retryStates.clear();
            return;
        }

        for (const k of this.retryStates.keys()) {
            if (k === active) continue;
            const state = this.retryStates.get(k);
            if (state) this.abortRetry(state);
            this.retryStates.delete(k)
        }
    }

    private static onceOnline(timeoutMs: number = 3E4, signal: AbortSignal): Promise<boolean> {
        if (window.navigator.onLine) return Promise.resolve(true);
        if (signal.aborted) return Promise.resolve(false);

        const {promise, resolve} = Promise.withResolvers<boolean>();

        const ctrl = new AbortController();
        const timer = setTimeout(() => {
            ctrl.abort();
            resolve(false);
        }, timeoutMs);

        signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve(false);
        });

        window.addEventListener('online', () => {
            clearTimeout(timer);
            ctrl.abort();
            resolve(true);
        }, {once: true, signal: ctrl.signal});

        return promise;
    }

    private static async reloadAudio(idx: number, state: RetryState): Promise<boolean> {
        const audio = QueueStatus.getPlayer();
        const lastPlayed = audio.currentTime;
        const ok = await QueueController.switchAudio(idx, true, !audio.paused);
        if (!ok) return false;

        const dur = Number.isFinite(audio.duration) ? audio.duration : Number.POSITIVE_INFINITY;
        if (Number.isFinite(dur)) {
            audio.currentTime = Math.min(lastPlayed, Math.max(0, dur - 0.25));
        }
        state.retryCount = 0;
        return true;
    }

    private static scheduleRetry(key: string, state: RetryState): void {
        const delay = Math.max(backoffDelay(state.retryCount - 1), this.THROTTLE_MS + 50);

        this.abortRetry(state);
        state.timerId = setTimeout(() => {
            state.timerId = undefined;
            if (this.isStale(key)) return;
            this.errorHandler();
        }, delay);
    }

    private static isStale(key: string): boolean {
        return this.currentTrackKey() !== key;
    }

    private static shouldThrottleAlert(interval = 2000): boolean {
        return Date.now() - this.lastAlertAt < interval;
    }

    private static touchAlert(): void {
        this.lastAlertAt = Date.now();
    }

    private static makeTrackKey(info: AudioInfo, idx: number): string {
        return `${info?.plugin ?? 'unknown'}|${info?.id ?? 'no-id'}|${idx}`;
    }

    private static async onAudioError() {
        const currentPlay = QueueStatus.getCurrentPlaying();
        const idx = QueueStatus.getCurrentIndex();
        if (!currentPlay) return;

        const key = this.makeTrackKey(currentPlay, idx);

        this.retainOnlyActiveState();
        const state = this.getRetryState(key);

        if (Date.now() < state.cooldownUntil || state.pending) return;
        if (this.isStale(key)) return;

        state.pending = true;

        try {
            if (state.retryCount >= this.MAX_RETRY) {
                createAlert('超过最大重试次数, 请检查Api密钥或者文件是否有效', 'error', {autoRemoveDelay: 0});
                state.retryCount = 0;
                state.cooldownUntil = Date.now() + 50_000;
                return;
            }

            state.retryCount++;

            // 1. 重载一次
            if (await this.reloadAudio(idx, state)) return;
            if (this.isStale(key)) return;

            // 2. 离线挂起, 上线重载
            if (!navigator.onLine) {
                if (!this.shouldThrottleAlert()) {
                    createAlert('当前离线, 网络恢复后将自动重试', 'info');
                    this.touchAlert();
                }

                const cameOnline = await this.onceOnline(3E4, state.abortCtrl.signal);
                if (this.isStale(key) || state.abortCtrl.signal.aborted) return;

                if (!cameOnline) {
                    this.scheduleRetry(key, state);
                    return;
                }

                if (await this.reloadAudio(idx, state)) return;
                if (this.isStale(key)) return;
            }

            // 3. 刷新Token
            const plugin = getPlugin(currentPlay.plugin);
            if (!isAuthAble(plugin)) {
                this.scheduleRetry(key, state);
                return;
            }

            const refreshed = await plugin.refresh();
            if (this.isStale(key)) return;

            if (refreshed && await this.reloadAudio(idx, state)) return;
            if (this.isStale(key)) return;

            // 4. 第三次重试, 才尝试验证
            if (state.retryCount >= 3) {
                const result = await dbHelper.get<Cred>('auth', plugin.getPluginName());
                if (result.isErr()) {
                    console.error(result.unwrapErr());
                    return;
                }

                const cred = result.ok().get();
                if (!cred || this.isStale(key)) return;

                const logged = await plugin.login({key: cred.key, psd: cred.psd});
                if (!logged || this.isStale(key)) return;

                if (await this.reloadAudio(idx, state)) return;
                if (this.isStale(key)) return;
            }

            // 5. 下一次重试
            this.scheduleRetry(key, state);
        } catch (err) {
            let msg = '未知错误';
            if (err instanceof Error) msg = err.message;
            else if (typeof err === 'string') msg = err;
            createAlert(`第 ${state.retryCount} 次重试失败: ${msg}`, 'warning');
            console.error(err);

            this.scheduleRetry(key, state);
        } finally {
            state.pending = false;
        }
    }

    public static errorHandler = throttleTimeOut(this.onAudioError.bind(this), this.THROTTLE_MS);
}
