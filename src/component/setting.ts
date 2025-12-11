import {throttleTimeOut} from "../utils/util";
import {defaultShortcuts} from "../config/default";
import {createAlert} from "../utils/front/alert";
import {getPlugin, isAuthAble, VSM} from "../plugins/plugin_init";
import {updateApp} from "../http/update";
import {IAudioInfo} from "../types/audio";
import {invoke} from "@tauri-apps/api/core";
import {clearPlayingQueueHistory} from "../database/db_util";
import {dbHelper} from "../database/db_init";
import {open} from "@tauri-apps/plugin-dialog";
import {QueueRender} from "../playing_queue/queue_render";
import {QueueStatus} from "../playing_queue/queue_status";
import {QueueController} from "../playing_queue/queue_controller";
import {IndexController} from "../index/index_controller";
import {Shortcuts} from "./shortcuts";

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
        case 'clean-vsm': {
            VSM.vsmCache.length = 0;
            const plugin = getPlugin('vsm');
            if (plugin instanceof VSM) {
                plugin.seq = 0;
                createAlert('已清除VSM缓存', 'success');
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

    createAlert(`以设置 ${pluginName} API`, 'success');
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

        const list: IAudioInfo[] = [];
        for (const path of filePath) {
            const hash: string = await invoke('calculate_hash', {filePath: path});
            if (hash) list.push({plugin: 'local', id: hash, url: path});
        }

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

export async function initSettings(): Promise<void> {
    // 加载API密钥
    const apiSettings = document.getElementById('apis-settings')!;
    const allLabel = apiSettings.querySelectorAll('label');

    let errors = 0;
    for (const label of allLabel) {
        const pluginName = label.getAttribute('action');
        if (!pluginName) continue;
        const result = await dbHelper.get<{ key: string, psd: string }>('auth', pluginName);

        if (result.isErr()) {
            errors++;
            console.error(result.unwrapErr());
            continue;
        }

        const optional = result.ok();
        if (optional.isEmpty()) continue;

        const keyEle = label.querySelector('[name="api-key"]') as HTMLInputElement;
        const psdEle = label.querySelector('[name="api-psd"]') as HTMLInputElement;
        if (keyEle && psdEle) {
            keyEle.value = optional.get().key;
            psdEle.value = optional.get().psd;
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