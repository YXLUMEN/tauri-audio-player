import {TrayIcon, TrayIconOptions} from '@tauri-apps/api/tray';
import {Menu} from '@tauri-apps/api/menu';
import {defaultWindowIcon} from '@tauri-apps/api/app';
import {getCurrentWindow} from "@tauri-apps/api/window";
import {QueueController} from "../playing_queue/queue_controller";
import {PlayMode} from "../play/play_mode";


export async function initTray(): Promise<void> {
    const oldTray = await TrayIcon.getById('main-tray');
    if (oldTray) {
        await oldTray.setMenu(null);
        await oldTray.close();
    }

    const menu = await Menu.new({
        id: 'tray-menu',
        items: [
            {
                id: 'forward',
                text: '上一曲',
                action: () => QueueController.switchAudio(PlayMode.getNextAudioIndex(1)),
            },
            {
                id: 'pause-play',
                text: '播放/暂停',
                action: () => QueueController.pauseToggle()
            },
            {
                id: 'backward',
                text: '下一曲',
                action: () => QueueController.switchAudio(PlayMode.getNextAudioIndex(-1)),
            },
            {
                id: 'quit',
                text: '退出',
                action: () => getCurrentWindow().close(),
            },
        ],
    });

    const options: TrayIconOptions = {
        id: 'main-tray',
        menu: menu,
        title: 'Lumen Audio Player',
        icon: await defaultWindowIcon() ?? undefined,
        showMenuOnLeftClick: false,
        action: async (event) => {
            if (event.type === 'DoubleClick') {
                const window = getCurrentWindow();
                await window.show();
                await window.unminimize();
                await window.setFocus()
            }
        },
    }

    await TrayIcon.new(options);
}