import {defaultShortcuts} from "./default";
import {throttleTimeOut} from "./tools/base_utilities";
import createAlert from "./tools/base_page";
import {updateApp} from "./update";
import {clearPlayingQueueHistory, dbHelper, forceClearPluginsCache, getPlugin} from "./data";
import {isAuthAble, VSM} from "./plugins/exports";
import {enableShortcut, mapKeys} from "./shortcuts";

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
            await dbHelper.update('shortcuts', {action, code});
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
            forceClearPluginsCache();
            createAlert('已清理解析缓存', 'success');
            break;
        case 'clean-history':
            localStorage.removeItem('playing');
            await clearPlayingQueueHistory();
            createAlert('已清除播放历史', 'success');
            break;
        case 'clean-vsm':
            VSM.vsmCache.length = 0;
            const plugin = getPlugin('vsm');
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
    await dbHelper.delete('shortcuts', action);
    await mapKeys();
});

// 检查更新
document.getElementById('check-update').addEventListener('click', updateApp);

// 启动时更新设置
document.getElementById('auto-check').addEventListener('input', function () {
    const inputEle = <HTMLInputElement>this;
    const bl = inputEle.checked || false;
    localStorage.setItem('should-check-when-start', JSON.stringify(bl));
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
        await dbHelper.update('auth', {plugin: pluginName, key, psd});

        const plugin = getPlugin(pluginName);
        if (isAuthAble(plugin)) {
            await plugin.login({key, psd});
        }

        createAlert(`以设置 ${pluginName} API`, 'success');
    } catch (error) {
        console.error(error);
        createAlert(`设置失败: ${error.message}`, 'error', {autoRemoveDelay: 0});
    }
});

async function initSettings(): Promise<void> {
    try {
        // 加载API密钥
        const apiSettings = document.getElementById('apis-settings');
        const allLabel = apiSettings.querySelectorAll('label');
        for (const label of allLabel) {
            const pluginName = label.getAttribute('action');
            const result = await dbHelper.get('auth', pluginName);
            if (!result) continue;

            const keyEle: HTMLInputElement = <HTMLInputElement>label.querySelector('[name="api-key"]');
            const psdEle: HTMLInputElement = <HTMLInputElement>label.querySelector('[name="api-psd"]');
            if (keyEle && psdEle) {
                keyEle.value = result.key;
                psdEle.value = result.psd;
            }

            const plugin = getPlugin(pluginName);
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