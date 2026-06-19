import {config, createStatus, throttleTimeOut} from "../utils/util";
import {dbHelper} from "../database/db_init";
import {defaultShortcuts, IShortCuts} from "../config/default";
import {QueueController} from "../playing_queue/queue_controller";
import {PlayMode} from "../play/play_mode";
import {PlayVolume} from "../play/play_volume";
import {QueueRender} from "../playing_queue/queue_render";
import {LyricStatus} from "../lyric/lyric_status";
import {PlayerRender} from "../player/player_render";
import {toggleSettings} from "./setting";
import {ART} from "../plugins";

interface Configs {
    volumeToggle: HTMLInputElement;
    shortcuts: Map<string, Function>;
}

const configs: Configs = config({
    volumeToggle: document.getElementById('volume-toggle') as HTMLInputElement,
    shortcuts: new Map()
});

interface Status {
    ableShortcuts: boolean;
}

const status: Status = createStatus({
    ableShortcuts: true,
});

export function setShortcut(bl: boolean): void {
    status.ableShortcuts = bl;
}

export async function mapKeys(): Promise<void> {
    const mapFunc: Record<string, Function> = {
        'toggle-play': QueueController.pauseToggle,
        'forward': () => QueueController.switchAudio(PlayMode.getNextAudioIndex(1)),
        'backward': () => QueueController.switchAudio(PlayMode.getNextAudioIndex(-1)),
        'volume-increase': () => PlayVolume.modifyVolume(Number(configs.volumeToggle.value) + 2),
        'volume-decrease': () => PlayVolume.modifyVolume(Number(configs.volumeToggle.value) - 2),
        'switch-mode': PlayMode.modeToggle,
        'switch-mute': PlayVolume.toggleMuted,
        'scroll-current': QueueRender.highlightCurrentPlaying,
        'toggle-lyric': LyricStatus.lyricDisplayFn,
        'toggle-playing-queue': PlayerRender.togglePlayingBoard,
        'toggle-settings': toggleSettings,
        'toggle-player': PlayerRender.togglePlayer,
        'update-remote': ART.artAdd,
        'close-page': PlayerRender.closePage,
    }

    configs.shortcuts.clear();
    for (const key of defaultShortcuts) {
        configs.shortcuts.set(key.code, mapFunc[key.action]);
    }

    const result = await dbHelper.getAll<IShortCuts>('shortcuts');
    if (result.isErr()) {
        const error = result.unwrapErr();

        let msg = '未知错误';
        if (error) msg = error.message;
        console.error(`绑定快捷键失败: ${msg}`);
        return;
    }

    const optional = result.ok();
    if (optional.isEmpty()) return;

    const custom = optional.get();
    if (custom.length === 0) return;

    for (const key of custom) {
        configs.shortcuts.set(key.code, mapFunc[key.action]);
    }
}

export async function initialize(): Promise<void> {
    try {
        await mapKeys();
    } catch (err) {
        let msg = '未知错误';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'string') msg = err;
        console.error(`绑定快捷键失败: ${msg}`);
    }

    const keyControlFn = throttleTimeOut((code: string) => {
        configs.shortcuts.get(code)?.();
    }, 100);

    window.addEventListener('keydown', event => {
        if (
            event.key === 'F5' ||
            (event.ctrlKey && event.key === 'r') ||
            (event.metaKey && event.key === 'r')
        ) {
            event.preventDefault();
            return;
        }

        if (!status.ableShortcuts) return;
        if ((event.target as HTMLElement).classList.contains('base-input')) return;
        event.stopPropagation();
        event.preventDefault();

        keyControlFn(event.code);
    });
}

