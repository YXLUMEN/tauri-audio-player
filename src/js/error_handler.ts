import * as d from "./render/data";
import {audioEle} from "./render/env";
import {IAudioInfo} from "./api/audio";
import {throttleTimeOut} from "./util/base_utilities";
import createAlert from "./util/base_page";
import {getPlugin, isAuthAble} from "./plugins/plugin_init";
import {dbHelper} from "./db/db_init";

type TrackKey = string;

interface RetryState {
    retryCount: number;
    cooldownUntil: number;
    pending: boolean;
    timerId?: number;
}

const MAX_RETRY = 5;
const THROTTLE_MS = 1000;

let lastAlertAt: number = 0;

const retryStates = new Map<TrackKey, RetryState>();

function getRetryState(key: TrackKey): RetryState {
    let s = retryStates.get(key);
    if (s) return s;
    s = {retryCount: 0, cooldownUntil: 0, pending: false};
    retryStates.set(key, s);
    return s;
}

function clearRetryTimer(state?: RetryState): void {
    if (state?.timerId) {
        clearTimeout(state.timerId);
        state.timerId = undefined;
    }
}

function backoffDelay(n: number, base = 1000, cap = 15000, jitter = 300): number {
    return Math.min(base * Math.pow(2, n), cap) + Math.floor(Math.random() * jitter);
}

// 告警节流
const shouldThrottleAlert = (interval = 2000) => Date.now() - lastAlertAt < interval;
const touchAlert = () => lastAlertAt = Date.now();

const makeTrackKey = (p: IAudioInfo, idx: number) =>
    `${p?.plugin ?? 'unknown'}|${p?.id ?? 'no-id'}|${idx}`;

function currentTrackKey(): TrackKey | null {
    const p = d.getCurrentPlaying();
    const idx = d.getAudioIndex();
    if (!p) return null;
    return makeTrackKey(p, idx);
}

const isStale = (key: TrackKey) => currentTrackKey() !== key;

function retainOnlyActiveState(): void {
    const active = currentTrackKey();
    if (!active) {
        for (const k of retryStates.keys()) {
            clearRetryTimer(retryStates.get(k));
        }
        retryStates.clear();
        return;
    }

    for (const k of [...retryStates.keys()]) {
        if (k === active) continue;
        const s = retryStates.get(k);
        clearRetryTimer(s);
        retryStates.delete(k)
    }
}

function onceOnline(timeoutMs: number = 3E4): Promise<boolean> {
    if (window.navigator.onLine) return Promise.resolve(true);
    return new Promise((resolve) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => {
            ctrl.abort();
            resolve(false);
        }, timeoutMs);

        window.addEventListener('online', () => {
            clearTimeout(timer);
            ctrl.abort();
            resolve(true);
        }, {once: true, signal: ctrl.signal});
    });
}

async function reloadAudio(idx: number, state: RetryState): Promise<boolean> {
    const lastPlayed = audioEle.currentTime;
    const ok = await d.switchAudio(idx, {play: !audioEle.paused, force: true});
    if (!ok) return false;

    const dur = Number.isFinite(audioEle.duration) ? audioEle.duration : Number.POSITIVE_INFINITY;
    if (Number.isFinite(dur)) {
        audioEle.currentTime = Math.min(lastPlayed, Math.max(0, dur - 0.25));
    }
    state.retryCount = 0;
    return true;
}

function scheduleRetry(key: TrackKey, state: RetryState): void {
    const delay = Math.max(backoffDelay(state.retryCount - 1), THROTTLE_MS + 50);

    clearRetryTimer(state);
    state.timerId = setTimeout(() => {
        state.timerId = undefined;
        if (!isStale(key)) onAudioError();
    }, delay);
}

const onAudioError = throttleTimeOut(async () => {
    const currentPlay = d.getCurrentPlaying();
    const idx = d.getAudioIndex();
    if (!currentPlay) return;

    const key = makeTrackKey(currentPlay, idx);

    retainOnlyActiveState();
    const state = getRetryState(key);

    if (Date.now() < state.cooldownUntil || state.pending) return;
    if (isStale(key)) return;

    state.pending = true;

    try {
        if (state.retryCount >= MAX_RETRY) {
            createAlert('超过最大重试次数, 请检查Api密钥或者文件是否有效', 'error', {autoRemoveDelay: 0});
            state.retryCount = 0;
            state.cooldownUntil = Date.now() + 50_000;
            return;
        }

        state.retryCount++;

        // 1. 重载一次
        if (await reloadAudio(idx, state)) return;
        if (isStale(key)) return;

        // 2. 离线挂起, 上线重载
        if (!navigator.onLine) {
            if (!shouldThrottleAlert()) {
                createAlert('当前离线, 网络恢复后将自动重试', 'info');
                touchAlert();
            }

            const cameOnline = await onceOnline();
            if (!cameOnline || isStale(key)) {
                scheduleRetry(key, state);
                return;
            }

            if (await reloadAudio(idx, state)) return;
            if (isStale(key)) return;
        }

        // 3. 刷新Token
        const plugin = getPlugin(currentPlay.plugin);
        if (!isAuthAble(plugin)) {
            scheduleRetry(key, state);
            return;
        }

        const refreshed = await plugin.refresh();
        if (isStale(key)) return;

        if (refreshed && await reloadAudio(idx, state)) return;
        if (isStale(key)) return;

        // 4. 第三次重试, 才尝试验证
        if (state.retryCount >= 3) {
            const cred = await dbHelper.get('auth', plugin.getPluginName());
            if (!cred || isStale(key)) return;

            const logged = await plugin.login({key: cred.key, psd: cred.psd});
            if (!logged || isStale(key)) return;

            if (await reloadAudio(idx, state)) return;
            if (isStale(key)) return;
        }

        // 5. 下一次重试
        scheduleRetry(key, state);
    } catch (err) {
        let msg = '未知错误';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'string') msg = err;
        createAlert(`第 ${state.retryCount} 次重试失败: ${msg}`, 'warning');
        console.error(err);

        scheduleRetry(key, state);
    } finally {
        state.pending = false;
    }
}, THROTTLE_MS);

export {
    onAudioError
}