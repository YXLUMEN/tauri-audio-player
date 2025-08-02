import {Window} from '@tauri-apps/api/window';

const appWindow: Window = new Window('main');

async function initialize(): Promise<void> {
    const settings = await import('./js/render/settings');
    await settings.initSettings();

    const player = await import('./js/render/player');
    player.initPlayer().catch(e => console.error(`渲染歌单失败: ${e.message}`));

    document.getElementById('title-bar-minimize')?.addEventListener('click', () => appWindow.minimize());
    document.getElementById('title-bar-maximize')?.addEventListener('click', async function () {
        await appWindow.toggleMaximize();
        if (await appWindow.isMaximized()) {
            this.innerHTML = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M812.2 65H351.6c-78.3 0-142.5 61.1-147.7 138.1-77 5.1-138.1 69.4-138.1 147.7v460.6c0 81.6 66.4 148 148 148h460.6c78.3 0 142.5-61.1 147.7-138.1 77-5.1 138.1-69.4 138.1-147.7V213c0-81.6-66.4-148-148-148z m-45.8 746.3c0 50.7-41.3 92-92 92H213.8c-50.7 0-92-41.3-92-92V350.7c0-50.7 41.3-92 92-92h460.6c50.7 0 92 41.3 92 92v460.6z m137.8-137.7c0 47.3-35.8 86.3-81.8 91.4V350.7c0-81.6-66.4-148-148-148H260.2c5.1-45.9 44.2-81.8 91.4-81.8h460.6c50.7 0 92 41.3 92 92v460.7z" fill="#8a8a8a"></path></svg>';
        } else {
            this.innerHTML = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M812.3 959.4H213.7c-81.6 0-148-66.4-148-148V212.9c0-81.6 66.4-148 148-148h598.5c81.6 0 148 66.4 148 148v598.5C960.3 893 893.9 959.4 812.3 959.4zM213.7 120.9c-50.7 0-92 41.3-92 92v598.5c0 50.7 41.3 92 92 92h598.5c50.7 0 92-41.3 92-92V212.9c0-50.7-41.3-92-92-92H213.7z" fill="#8a8a8a"></path></svg>';
        }
    });
    document.getElementById('title-bar-close')?.addEventListener('click', async () => {
        await player.savePlayingQueue();
        await appWindow.close();
    });

    const contextMenu = await import('./js/render/context_menu');
    contextMenu.initContextMenu();

    const shortcuts = await import('./js/render/shortcuts');
    await shortcuts.initShortcuts();

    await player.loadHistory();
    await checkUpdate();
}

async function checkUpdate() {
    try {
        const shouldUpdate = localStorage.getItem('should-check-when-start');
        if (shouldUpdate == undefined) return;

        const bl = Boolean(JSON.parse(shouldUpdate));
        (<HTMLInputElement>document.getElementById('auto-check')).checked = bl;
        if (bl) {
            const mod = await import('./js/render/update');
            await mod.updateApp();
        }
    } catch (e) {
        console.error(e);
    }
}

initialize()
    .catch(async (err) => {
        const mod = await import('@tauri-apps/plugin-notification');

        let permissionGranted = await mod.isPermissionGranted();

        if (!permissionGranted) {
            const permission = await mod.requestPermission();
            permissionGranted = permission === 'granted';
        }

        if (permissionGranted) {
            mod.sendNotification({title: '初始化失败', body: err.message});
        }
    })
    .catch(() => appWindow.close());