import * as d from "../render/data";
import * as v from "../render/env";
import * as p from "../render/player";
import {displayedContent, setDisplayFolder, showContentTip} from "../render";
import {defaultShortcuts} from "../default";
import {VSM} from "../plugins/vsm";
import {throttleTimeOut} from "../util/base_utilities";
import {dbHelper} from "../db/db_init";
import {getPlugin} from "../plugins/plugin_init";

const shortcuts: Map<string, Function> = new Map();

// 键盘操作
let ableShortcuts: boolean = true;

function enableShortcut(bl: boolean) {
    ableShortcuts = bl;
}

// 快捷键
const keyControlFn = throttleTimeOut((code: string) => {
    return shortcuts.get(code)?.();
}, 100);

async function mapKeys() {
    const customShortcuts = await dbHelper.getAll('shortcuts');
    const mapFunc: { [key: string]: Function } = {
        'toggle-play': v.pauseToggle,
        'forward': p.anonymous_fun.skipBackward,
        'backward': p.anonymous_fun.skipForward,
        'volume-increase': p.anonymous_fun.arrowUp,
        'volume-decrease': p.anonymous_fun.arrowDown,
        'switch-mode': p.modeToggle,
        'switch-mute': v.toggleMuted,
        'scroll-current': d.highlightCurrentPlaying,
        'toggle-lyric': p.lyricDisplayFn,
        'toggle-playing-queue': p.togglePlayingBoard,
        'toggle-settings': p.toggleSettings,
        'toggle-player': p.togglePlayer,
        'update-remote': vsmAdd,
        'close-page': p.closePage,
    }

    for (const key of defaultShortcuts) {
        shortcuts.set(key.code, mapFunc[key.action]);
    }
    if (customShortcuts.length > 0) for (const key of customShortcuts) {
        shortcuts.set(key.code, mapFunc[key.action]);
    }
}

// vsm专用 暂时
async function vsmAdd() {
    if (d.chosenFolder?.getAttribute('plugin') !== 'vsm') return;

    const vsm = getPlugin('vsm');
    if (!(vsm instanceof VSM)) return;

    vsm.setSeq(vsm.seq + 32);
    if (vsm.seq < vsm.maxCount) {
        await vsm.getAudioList({seq: vsm.seq});
    }

    await setDisplayFolder(VSM.vsmCache);
    if (!vsm.isAll()) showContentTip('显示更多');
    requestAnimationFrame(() => d.mergePlayingQueue(displayedContent));
}

document.addEventListener('keydown', (event) => {
    if (
        event.key === 'F5' ||
        (event.ctrlKey && event.key === 'r') ||
        (event.metaKey && event.key === 'r')
    ) {
        event.preventDefault();
        return;
    }

    if (!ableShortcuts || event.ctrlKey || event.metaKey || !shortcuts.has(event.code)) return;
    if ((<HTMLElement>event.target).classList.contains('base-input')) return;
    event.stopPropagation();
    event.preventDefault();

    keyControlFn(event.code);
});

async function initShortcuts(): Promise<void> {
    try {
        await mapKeys();
    } catch (err) {
        let msg = '未知错误';
        if (err instanceof Error) msg = err.message;
        else if (typeof err === 'string') msg = err;
        console.error(`绑定快捷键失败: ${msg}`);
    }
}

export {
    initShortcuts,
    enableShortcut,
    mapKeys,
    vsmAdd,
    keyControlFn,
}