import {throttleTimeOut} from "../utils/util";
import {defaultShortcuts} from "../config/default";
import {createAlert} from "../utils/front/alert";
import {updateApp} from "../http/update";
import {invoke} from "@tauri-apps/api/core";
import {clearPlayingQueueHistory} from "../database/db_util";
import {dbHelper} from "../database/db_init";
import {open} from "@tauri-apps/plugin-dialog";
import {QueueRender} from "../playing_queue/queue_render";
import {QueueStatus} from "../playing_queue/queue_status";
import {QueueController} from "../playing_queue/queue_controller";
import {IndexController} from "../index/index_controller";
import {Shortcuts} from "./shortcuts";
import {ART, getPlugin, isAuthAble} from "../plugins";
import {PromisePool} from "../utils/collection/PromisePool";
import {AudioInfo} from "../types/audio";

const settings = document.getElementById('settings-container')!;

document.getElementById('shortcuts-settings')!.addEventListener('click', (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest('.key');
    if (!target) return;

    Shortcuts.enableShortcut(false);
    target.classList.add('modifying');

    document.addEventListener('keydown', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        const action = target.getAttribute('action');
        if (!action) return;

        const code = event.code;
        if (defaultShortcuts.some(value => value.code === code)) {
            createAlert('按键重复', 'warning');
        } else {
            await dbHelper.update('shortcuts', {action, code});
            await Shortcuts.mapKeys();
            target.textContent = event.key.toUpperCase();
        }

        target.classList.remove('modifying');
        Shortcuts.enableShortcut(true);
    }, {once: true});
});

// 清理缓存
const clearCache = throttleTimeOut(async (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest('input');
    if (!target) return;

    const action = target.getAttribute('action');

    switch (action) {
        case 'clean-parse-cache': {
            QueueStatus.forceClearPluginsCache();
            createAlert('已清理解析缓存', 'success');
            break;
        }
        case 'clean-history': {
            localStorage.removeItem('playing');
            await clearPlayingQueueHistory();
            createAlert('已清除播放历史', 'success');
            break;
        }
        case 'clean-art': {
            ART.getCache().length = 0;
            const plugin = getPlugin('art');
            if (plugin instanceof ART) {
                plugin.seq = 0;
                createAlert('已清除 Art网站 缓存', 'success');
            }
            break;
        }
    }
}, 500);

document.getElementById('clean-cache')!.addEventListener('click', clearCache);

// 重置快捷键
document.getElementById('shortcuts-settings')!.addEventListener('auxclick', async event => {
    const target = (event.target as HTMLElement).closest('.key');
    if (!target) return;
    const action = target.getAttribute('action');
    if (!action) return;
    const defaultKey = defaultShortcuts.find(item => item.action === action);
    if (!defaultKey) return;

    target.textContent = defaultKey.code.replace('Key', '');
    const result = await dbHelper.delete('shortcuts', action);
    if (result.isErr()) {
        createAlert(`重置时出现错误`, 'warning');
        console.error(result.unwrapErr());
    }
    await Shortcuts.mapKeys();
});

// 检查更新
document.getElementById('check-update')!.addEventListener('click', async () => {
    const result = await updateApp();
    if (result === 0) createAlert('无可用更新');
    else if (result === 1) createAlert('开始更新', 'info', {autoRemoveDelay: 0});
});

// 启动时更新设置
document.getElementById('auto-check')!.addEventListener('input', function () {
    const inputEle = this as HTMLInputElement;
    if (inputEle.checked) {
        localStorage.removeItem('not-check-when-start');
        return;
    }
    localStorage.setItem('not-check-when-start', '1');
});

// 退出到托盘
document.getElementById('quit-to-tray')!.addEventListener('click', function () {
    const inputEle = this as HTMLInputElement;
    if (inputEle.checked) {
        localStorage.removeItem('quit-to-tray');
        return;
    }
    localStorage.setItem('quit-to-tray', '1');
});

// 设置Api并重新登录
document.getElementById('apis-settings')!.addEventListener('click', async (event) => {
    const label = (event.target as HTMLElement).closest('.base-button')?.parentElement;
    if (!label) return;
    const keyEle = label.querySelector('[name="api-key"]') as HTMLInputElement;
    const psdEle = label.querySelector('[name="api-psd"]') as HTMLInputElement;
    const key = keyEle.value;
    const psd = psdEle.value;
    if (!key || !psd) return;

    const pluginName = label.getAttribute('action');
    if (!pluginName) return;

    const result = await dbHelper.update('auth', {plugin: pluginName, key, psd});

    if (result.isErr()) {
        const error = result.unwrapErr();

        let msg = '未知错误';
        if (error) msg = error.message;
        console.error(error);
        createAlert(`设置失败: ${msg}`, 'error', {autoRemoveDelay: 0});
        return;
    }

    const plugin = getPlugin(pluginName);
    if (isAuthAble(plugin)) {
        await plugin.login({key, psd});
    }

    createAlert(`已设置 "${pluginName}" API`, 'success');
});

// 本地文件播放
document.getElementById('select-local-audio')!.addEventListener('click', async (event) => {
    const target = (event.target as HTMLElement).closest('.base-button');
    if (!target) return;

    try {
        const filePath: string[] | null = await open({
            title: '选则音频',
            multiple: true,
            directory: false,
            filters: [{name: 'Audios', extensions: ['mp3', 'flac', 'wav', 'ogg', 'aac']}]
        });
        if (!filePath) return;
        QueueRender.showLoading();

        const pool = new PromisePool(6);
        const tasks: Promise<{ hash: unknown, path: string }>[] = filePath.map(path =>
            pool.submit(() =>
                invoke('calculate_hash', {filePath: path})
                    .then(hash => ({hash, path}))
            )
        );
        const results = await Promise.allSettled(tasks);
        const list: AudioInfo[] = results
            .reduce((acc, res) => {
                if (res.status !== 'fulfilled') return acc;
                if (typeof res.value.hash === 'string') {
                    const {hash, path} = res.value;
                    acc.push({plugin: 'local', id: hash, url: path});
                }
                return acc;
            }, [] as AudioInfo[]);

        const index = QueueStatus.getCurrentIndex();
        await QueueStatus.insertAudio(index + 1, list);
        await QueueController.switchAudio(index + 1);

        if (target.getAttribute('action') !== 'local-collect') return;
        const result = await IndexController.choseFolderToCollect();
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return;
        }

        const folderId = result.ok().get();
        if (!folderId) return;

        for (const audio of list) {
            audio.parent = folderId;
            await dbHelper.add('favor', audio);
        }
    } catch (err) {
        console.error(err);
        createAlert('读取失败', 'warning');
    } finally {
        QueueRender.hideLoading();
    }
});

type KeyPair = { key: string, psd: string };

export async function initSettings(): Promise<void> {
    const apiSettings = document.getElementById('apis-settings')!;
    const allLabel = apiSettings.querySelectorAll('label');

    let errors = 0;
    for (const label of allLabel) {
        const pluginName = label.getAttribute('action');
        if (!pluginName) continue;
        const result = await dbHelper.get<KeyPair>('auth', pluginName);

        if (result.isErr()) {
            errors++;
            console.error(result.unwrapErr());
            continue;
        }

        const pair = result.unwrap();
        if (!pair) continue;

        const keyEle = label.querySelector('[name="api-key"]');
        const psdEle = label.querySelector('[name="api-psd"]');
        if (keyEle instanceof HTMLInputElement && psdEle instanceof HTMLInputElement) {
            keyEle.value = pair.key;
            psdEle.value = pair.psd;
        }

        const plugin = getPlugin(pluginName);
        if (isAuthAble(plugin)) {
            await plugin.loadToken();
        }
    }

    if (errors > 0) {
        createAlert(`加载密钥失败 ${errors}/${allLabel.length}`, 'warning');
    }
}

export function toggleSettings() {
    settings.classList.toggle('show');
}