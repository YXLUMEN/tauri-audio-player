import {Window} from '@tauri-apps/api/window';
import {initSettings} from "./component/setting";
import {initTray} from "./component/tray";
import {ContextMenu} from "./component/context_menu";
import {Shortcuts} from "./component/shortcuts";
import {IndexController} from "./index/index_controller";
import {IndexRender} from "./index/index_render";
import {LyricStatus} from "./lyric/lyric_status";
import {PlayVolume} from "./play/play_volume";
import {PlayerController} from "./player/player_controller";
import {QueueController} from "./playing_queue/queue_controller";
import {Dsd} from "./spectrum_diagram";
import {QueueHistory} from "./playing_queue/queue_history";
import {invoke} from "@tauri-apps/api/core";

const appWindow: Window = new Window('main');

export async function initialize(): Promise<void> {
    document.getElementById('title-bar-minimize')!.addEventListener('click', () => appWindow.minimize());
    document.getElementById('title-bar-maximize')!.addEventListener('click', () => appWindow.toggleMaximize());
    document.getElementById('title-bar-close')!.addEventListener('click', () => {
        if (localStorage.getItem('quit-to-tray') === null) {
            return appWindow.hide();
        }
        return appWindow.close();
    });

    await appWindow.onResized(async () => {
        const maximizeIco = document.getElementById('title-bar-maximize')!;
        if (await appWindow.isMaximized()) {
            maximizeIco.innerHTML = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M812.2 65H351.6c-78.3 0-142.5 61.1-147.7 138.1-77 5.1-138.1 69.4-138.1 147.7v460.6c0 81.6 66.4 148 148 148h460.6c78.3 0 142.5-61.1 147.7-138.1 77-5.1 138.1-69.4 138.1-147.7V213c0-81.6-66.4-148-148-148z m-45.8 746.3c0 50.7-41.3 92-92 92H213.8c-50.7 0-92-41.3-92-92V350.7c0-50.7 41.3-92 92-92h460.6c50.7 0 92 41.3 92 92v460.6z m137.8-137.7c0 47.3-35.8 86.3-81.8 91.4V350.7c0-81.6-66.4-148-148-148H260.2c5.1-45.9 44.2-81.8 91.4-81.8h460.6c50.7 0 92 41.3 92 92v460.7z" fill="#8a8a8a"></path></svg>';
        } else {
            maximizeIco.innerHTML = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M812.3 959.4H213.7c-81.6 0-148-66.4-148-148V212.9c0-81.6 66.4-148 148-148h598.5c81.6 0 148 66.4 148 148v598.5C960.3 893 893.9 959.4 812.3 959.4zM213.7 120.9c-50.7 0-92 41.3-92 92v598.5c0 50.7 41.3 92 92 92h598.5c50.7 0 92-41.3 92-92V212.9c0-50.7-41.3-92-92-92H213.7z" fill="#8a8a8a"></path></svg>';
        }
    });

    loadDefaults();

    await checkUpdate();

    ContextMenu.initialize();
    IndexController.initialize();
    IndexRender.initialize();
    await IndexRender.renderCustomFolder();
    LyricStatus.initialize();
    PlayVolume.initialize();
    PlayerController.initialize();
    QueueController.initialize();
    await QueueHistory.loadHistory();
    Dsd.initialize();

    await Shortcuts.initShortcuts();
    await initSettings();
    await initTray();

    await appWindow.once('save-before-close', saveOnClosed);
}

async function saveOnClosed() {
    await QueueHistory.savePlayingQueue();
    await invoke('confirm_save_done');
}

function loadDefaults() {
    const shouldUpdate = localStorage.getItem('not-check-when-start');
    if (shouldUpdate !== null) {
        (document.getElementById('auto-check') as HTMLInputElement).checked = false;
    }

    const quitToTray = localStorage.getItem('quit-to-tray');
    if (quitToTray !== null) {
        (document.getElementById('quit-to-tray') as HTMLInputElement).checked = false;
    }
}

async function checkUpdate() {
    try {
        const shouldUpdate = localStorage.getItem('not-check-when-start');
        if (shouldUpdate !== null) return;

        const mod = await import('./http/update');
        await mod.updateApp();
    } catch (e) {
        console.error(e);
    }
}
