import {AudioCompound} from "./global/AudioCompound.ts";
import {QueueCompound} from "./queue/QueueCompound.ts";
import {createAlert} from "../util/alert.ts";
import {AudioInfos} from "../audio/AudioInfos.ts";
import {Parsers} from "../plugin/Parsers.ts";
import {dbHelper} from "../database/db_init.ts";
import {KeyPair} from "./setting/TokenSettings.ts";
import {appEvent} from "../event/EventBus.ts";
import {SwitchAudio} from "../event/queue/SwitchAudio.ts";
import {backoffDelay} from "../util/Math.ts";

export class PlayErrorHandler {
    private readonly maxRetries = 5;
    private readonly resetMs = 10_000;
    private readonly throttleMs = 6000;

    private readonly queue: QueueCompound;
    private readonly audio: HTMLAudioElement;

    private pendingHash: number | null = null;
    private retryCount: number = 0;
    private cooldownUntil: number = 0;
    private lastHash: number | null = null;

    private ctrl: AbortController = new AbortController();
    private timerId: number | undefined;
    private lastAlertAt: number = 0;

    public constructor(audio: AudioCompound, queue: QueueCompound) {
        this.queue = queue;
        this.audio = audio.audio;

        this.onAudioErr = this.onAudioErr.bind(this);
        audio.audio.addEventListener('error', this.onAudioErr);
    }

    public abort() {
        this.ctrl.abort();
        this.ctrl = new AbortController();
        clearTimeout(this.timerId);
        this.timerId = undefined;
    }

    private onAudioErr(): void {
        const err = this.audio.error;
        if (!err) {
            console.warn('Unknown error occurrence');
            return;
        }

        switch (err.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                this.abort();
                return;
            case MediaError.MEDIA_ERR_NETWORK:
                void this.retry();
                return;
            case MediaError.MEDIA_ERR_DECODE:
                this.abort();
                createAlert('音频解码失败', 'warning');
                return;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                this.abort();
                createAlert('音频源失效', 'warning');
                return;
        }
    }

    private async retry(): Promise<void> {
        const current = this.queue.current();
        if (!current) return;

        const hash = this.currentHash();
        if (hash === null) return;

        // 发生切歌重置状态
        if (this.lastHash !== hash) {
            this.retryCount = 0;
            this.cooldownUntil = 0;
            this.lastHash = hash;
            clearTimeout(this.timerId);
            this.timerId = undefined;
        }

        // 重试冷却
        if (performance.now() < this.cooldownUntil) return;
        if (this.pendingHash === hash || this.isStale(hash)) return;

        // 终止当前任务
        this.abort();
        this.pendingHash = hash;

        try {
            if (this.retryCount >= this.maxRetries) {
                createAlert('请检查Api密钥或者文件是否有效', 'error', 0);
                this.retryCount = 0;
                this.cooldownUntil = performance.now() + this.resetMs;
                return;
            }

            this.retryCount++;
            const index = this.queue.index();

            // 重载一次
            if (await this.reloadAudio(index)) return;
            if (this.isAbort(hash)) return;

            // 离线挂起, 上线重载
            if (!navigator.onLine) {
                if (!this.shouldThrottleAlert()) {
                    createAlert('当前离线, 网络恢复后将自动重试', 'info');
                    this.touchAlert();
                }

                const online = await this.waitOnline(this.ctrl.signal);
                if (this.isAbort(hash)) return;

                if (!online) {
                    this.scheduleRetry(hash);
                    return;
                }

                if (await this.reloadAudio(index)) return;
                if (this.isAbort(hash)) return;
            }

            // 刷新 Token / 插件状态
            const plugin = Parsers.get(current.plugin);
            if (!plugin) {
                this.scheduleRetry(hash);
                return;
            }

            const refreshed = await plugin.reload();
            if (this.isAbort(hash)) return;

            if (refreshed && await this.reloadAudio(index)) return;
            if (this.isAbort(hash)) return;

            // 尝试重新验证
            if (this.retryCount >= this.maxRetries) {
                const result = await dbHelper.get<KeyPair>('auth', plugin.name);
                if (result.isErr()) {
                    console.error(result.unwrapErr());
                    return;
                }

                const keyPair = result.unwrap();
                if (!keyPair || this.isAbort(hash)) return;

                const logged = await plugin.reAuth(keyPair.key, keyPair.psd);
                if (!logged || this.isAbort(hash)) return;

                if (await this.reloadAudio(index)) return;
                if (this.isAbort(hash)) return;
            }

            // 下一次重试
            this.scheduleRetry(hash);
        } catch (err) {
            let msg = '未知错误';
            if (Error.isError(err)) msg = err.message;
            else if (typeof err === 'string') msg = err;

            createAlert(`第 ${this.retryCount} 次重试失败: ${msg}`, 'warning');
            console.error(err);

            this.scheduleRetry(hash);
        } finally {
            if (this.pendingHash === hash) this.pendingHash = null;
        }
    }

    private async reloadAudio(index: number): Promise<boolean> {
        const lastPlayed = this.audio.currentTime;
        const play = !this.audio.paused;

        const wait = this.waitLoadResult();
        appEvent.emit(new SwitchAudio(index, true, play));

        const ok = await wait;
        if (!ok) return false;

        const duration = this.audio.duration;
        if (Number.isFinite(duration)) {
            this.audio.currentTime = Math.min(lastPlayed, Math.max(0, duration - 0.25));
        }
        this.retryCount = 0;
        return true;
    }

    private waitLoadResult(timeout: number = 30_000): Promise<boolean> {
        const {promise, resolve} = Promise.withResolvers<boolean>();
        const ctrl = new AbortController();
        const signal = ctrl.signal;

        const settle = (ok: boolean) => {
            if (signal.aborted) return;
            ctrl.abort();
            clearTimeout(timer);
            resolve(ok);
        };

        const timer = setTimeout(() => settle(false), timeout);

        this.audio.addEventListener('canplay', () => settle(true), {once: true, signal});
        this.audio.addEventListener('error', () => settle(false), {once: true, signal});

        return promise;
    }

    private scheduleRetry(hash: number): void {
        clearTimeout(this.timerId);
        const delay = Math.max(backoffDelay(this.retryCount - 1), this.throttleMs);

        this.timerId = window.setTimeout(() => {
            this.timerId = undefined;
            if (this.isStale(hash)) return;
            void this.retry();
        }, delay);
    }

    private currentHash(): number | null {
        const current = this.queue.current();
        if (!current) return null;
        return this.getHash(current, this.queue.index());
    }

    private waitOnline(signal: AbortSignal, timeout = 3E4): Promise<boolean> {
        if (navigator.onLine) return Promise.resolve(true);
        if (signal.aborted) return Promise.resolve(false);

        const {promise, resolve} = Promise.withResolvers<boolean>();

        const ctrl = new AbortController();
        const timer = setTimeout(() => {
            ctrl.abort();
            resolve(false);
        }, timeout);

        signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve(false);
        }, {once: true, signal: ctrl.signal});

        window.addEventListener('online', () => {
            clearTimeout(timer);
            ctrl.abort();
            resolve(true);
        }, {once: true, signal: ctrl.signal});

        return promise;
    }

    private isAbort(hash: number) {
        return this.ctrl.signal.aborted || this.isStale(hash);
    }

    private isStale(hash: number): boolean {
        return this.currentHash() !== hash;
    }

    private shouldThrottleAlert(interval = 2000): boolean {
        return performance.now() - this.lastAlertAt < interval;
    }

    private touchAlert(): void {
        this.lastAlertAt = performance.now();
    }

    private getHash(info: AudioInfos, index: number): number {
        return (31 * info.hashCode() + index) | 0;
    }
}
