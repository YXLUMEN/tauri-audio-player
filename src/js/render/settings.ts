import {defaultShortcuts} from "./default";
import {IAudioInfo} from "../interfaces/audio";
import {throttleTimeOut} from "./tools/base_utilities";
import createAlert from "./tools/base_page";
import {updateApp} from "./update";
import {isAuthAble, VSM} from "./plugins/exports";
import {enableShortcut, mapKeys} from "./shortcuts";
import * as d from './data';
import {choseFolderToCollect} from "./index";

import {invoke} from '@tauri-apps/api/core';
import {open} from '@tauri-apps/plugin-dialog';
import {hideLoading, showLoading} from "./env";

// 设置快捷键
const setShortcut = throttleTimeOut((event: MouseEvent) => {
    const target = (<HTMLElement>event.target).closest('.key');
    if (!target) return;

    enableShortcut(false);
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
            await d.dbHelper.update('shortcuts', {action, code});
            await mapKeys();
            target.textContent = event.key.toUpperCase();
        }

        target.classList.remove('modifying');
        enableShortcut(true);
    }, {once: true});
}, 2000);

document.getElementById('shortcuts-settings').addEventListener('click', setShortcut);

// 清理缓存
const clearCache = throttleTimeOut(async (event: MouseEvent) => {
    const action = (<HTMLElement>event.target).closest('input')?.getAttribute('action');
    if (!action) return;

    switch (action) {
        case 'clean-parse-cache':
            d.forceClearPluginsCache();
            createAlert('已清理解析缓存', 'success');
            break;
        case 'clean-history':
            localStorage.removeItem('playing');
            await d.clearPlayingQueueHistory();
            createAlert('已清除播放历史', 'success');
            break;
        case 'clean-vsm':
            VSM.vsmCache.length = 0;
            const plugin = d.getPlugin('vsm');
            if (plugin instanceof VSM) {
                plugin.seq = 0;
                createAlert('已清除VSM缓存', 'success');
            }
            break;
    }
}, 500);

document.getElementById('clean-cache').addEventListener('click', clearCache);

// 重置快捷键
document.getElementById('shortcuts-settings').addEventListener('auxclick', async (event) => {
    const target = (<HTMLElement>event.target).closest('.key');
    if (!target) return;
    const action = target.getAttribute('action');
    if (!action) return;
    const defaultKey = defaultShortcuts.find(item => item.action === action);
    if (!defaultKey) return;

    target.textContent = defaultKey.code.replace('Key', '');
    await d.dbHelper.delete('shortcuts', action);
    await mapKeys();
});

// 检查更新
document.getElementById('check-update').addEventListener('click', async () => {
    const result = await updateApp();
    if (result === 0) createAlert('无可用更新');
    else if (result === 1) createAlert('开始更新', 'info', {autoRemoveDelay: 0});
});

// 启动时更新设置
document.getElementById('auto-check').addEventListener('input', function () {
    const inputEle = <HTMLInputElement>this;
    if (inputEle.checked) {
        localStorage.removeItem('not-check-when-start');
        return;
    }
    localStorage.setItem('not-check-when-start', '1');
});

// 退出到托盘
document.getElementById('quit-to-tray').addEventListener('click', function () {
    const inputEle = <HTMLInputElement>this;
    if (inputEle.checked) {
        localStorage.removeItem('quit-to-tray');
        return;
    }
    localStorage.setItem('quit-to-tray', '1');
});

// 设置Api并重新登录
document.getElementById('apis-settings').addEventListener('click', async (event) => {
    try {
        const label = (<HTMLElement>event.target).closest('.base-button')?.parentElement;
        if (!label) return;
        const keyEle: HTMLInputElement = <HTMLInputElement>label.querySelector('[name="api-key"]');
        const psdEle: HTMLInputElement = <HTMLInputElement>label.querySelector('[name="api-psd"]');
        const key = keyEle.value;
        const psd = psdEle.value;
        if (!key || !psd) return;

        const pluginName = label.getAttribute('action');
        await d.dbHelper.update('auth', {plugin: pluginName, key, psd});

        const plugin = d.getPlugin(pluginName);
        if (isAuthAble(plugin)) {
            await plugin.login({key, psd});
        }

        createAlert(`以设置 ${pluginName} API`, 'success');
    } catch (error) {
        console.error(error);
        createAlert(`设置失败: ${error.message}`, 'error', {autoRemoveDelay: 0});
    }
});

// 本地文件播放
document.getElementById('select-local-audio').addEventListener('click', async (event) => {
    const target = (<HTMLElement>event.target).closest('.base-button');
    if (!target) return;

    try {
        const filePath: string[] = await open({
            title: '选则音频',
            multiple: true,
            directory: false,
            filters: [{name: 'Audios', extensions: ['mp3', 'flac', 'wav', 'ogg', 'aac']}]
        });
        if (!filePath) return;
        showLoading();

        const list: IAudioInfo[] = [];
        for (const path of filePath) {
            const hash: string = await invoke('calculate_hash', {filePath: path});
            if (hash) list.push({plugin: 'local', id: hash, url: path});
        }

        await d.insertAudio(d.getAudioIndex() + 1, list);
        await d.switchAudio(d.getAudioIndex() + 1);

        if (target.getAttribute('action') !== 'local-collect') return;
        const folderId = await choseFolderToCollect();
        if (!folderId) return;

        for (const audio of list) {
            audio.parent = folderId;
            await d.dbHelper.add('favor', audio);
        }
    } catch (err) {
        console.error(err);
        createAlert('读取失败', 'warning');
    } finally {
        hideLoading();
    }
});

async function initSettings(): Promise<void> {
    try {
        // 加载API密钥
        const apiSettings = document.getElementById('apis-settings');
        const allLabel = apiSettings.querySelectorAll('label');
        for (const label of allLabel) {
            const pluginName = label.getAttribute('action');
            const result = await d.dbHelper.get('auth', pluginName);
            if (!result) continue;

            const keyEle: HTMLInputElement = <HTMLInputElement>label.querySelector('[name="api-key"]');
            const psdEle: HTMLInputElement = <HTMLInputElement>label.querySelector('[name="api-psd"]');
            if (keyEle && psdEle) {
                keyEle.value = result.key;
                psdEle.value = result.psd;
            }

            const plugin = d.getPlugin(pluginName);
            if (isAuthAble(plugin)) {
                await plugin.loadToken();
            }
        }
    } catch (e) {
        console.error(e);
        createAlert('自动加载密钥失败', 'warning');
    }
}

export {
    initSettings
}