import * as d from "./data";
import {IAudioInfo} from "../interfaces/audio";
import {throttleTimeOut} from "./tools/base_utilities";
import createAlert from "./tools/base_page";
import {isAuthAble} from "./plugins/exports";

const MAX_RETRY: number = 5;
let retryCount: number = 0;
let pendingRetry: boolean = false;

let lastKey: string = '';
let panicAt: string = '';
let cooldownUntil: number = 0;
let lastAlertAt: number = 0;

const shouldThrottleAlert = (interval = 2000) => Date.now() - lastAlertAt < interval;
const touchAlert = () => lastAlertAt = Date.now();

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

const makeTrackKey = (p: IAudioInfo, idx: number) =>
    `${p?.plugin ?? 'unknown'}|${p?.id ?? 'no-id'}|${idx}`;

const onAudioError = throttleTimeOut(async (_: any, play: boolean = true) => {
    if (Date.now() < cooldownUntil) return;

    if (pendingRetry) return;
    pendingRetry = true;

    const currentPlay = d.getCurrentPlaying();
    const idx = d.getAudioIndex();
    if (!currentPlay) {
        pendingRetry = false;
        return;
    }

    const key = makeTrackKey(currentPlay, idx);
    if (key !== lastKey) {
        retryCount = 0;
        lastKey = key;
    }

    panicAt = key;

    try {
        if (retryCount >= MAX_RETRY) {
            createAlert('超过最大重试次数, 请检查Api密钥或者文件是否有效', 'error', {autoRemoveDelay: 0});
            retryCount = 0;
            cooldownUntil = Date.now() + 5E4;
            return;
        }

        retryCount++;

        // 1. 重载一次
        const ok = await d.switchAudio(idx, {play, force: true});
        if (ok) {
            retryCount = 0;
            return;
        }
        if (panicAt !== key) return;

        const plugin = d.getPlugin(currentPlay.plugin);
        if (!isAuthAble(plugin)) return;

        // 2. 离线挂起, 上线重载
        if (!navigator.onLine) {
            if (!shouldThrottleAlert()) {
                createAlert('当前离线, 网络恢复后将自动重试', 'info');
                touchAlert();
            }

            const cameOnline = await onceOnline();
            if (panicAt !== key) return;

            if (!cameOnline) {
                // 冷却, 避免轮询
                cooldownUntil = Date.now() + 1000;
                createAlert('等待超时', 'warning');
                return;
            }

            const okAfterOnline = await d.switchAudio(idx, {play, force: true});
            if (okAfterOnline) {
                retryCount = 0;
                return;
            }
        }

        // 3. 刷新Token
        const refreshed = await plugin.refresh();
        if (panicAt !== key) return;

        if (refreshed) {
            const ok2 = await d.switchAudio(idx, {play, force: true});
            if (ok2) {
                retryCount = 0;
                return;
            }
        }

        // 4. 第四次重试, 才尝试验证
        if (retryCount < 4) return;

        const cred = await d.dbHelper.get('auth', plugin.getPluginName());
        if (!cred) return;

        const logged = await plugin.login({key: cred.key, psd: cred.psd});
        if (!logged || panicAt !== key) return;

        const ok3 = await d.switchAudio(idx, {play, force: true});
        if (ok3) {
            retryCount = 0;
            return;
        }
    } catch (err) {
        const errMsg = err?.message ?? '出现错误';
        createAlert(`第 ${retryCount} 次重试失败: ${errMsg}`, 'warning');
        console.error(err);
    } finally {
        pendingRetry = false;
    }
}, 1000);

export {
    onAudioError
}