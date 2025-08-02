import * as d from "./data";
import * as v from "./env";
import * as p from "./player";
import {displayedContent, setDisplayFolder} from "./index";
import {defaultShortcuts} from "./default";
import {VSM} from "./plugins/vsm";
import {throttleTimeOut} from "./tools/base_utilities";

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
    const customShortcuts = await d.dbHelper.getAll('shortcuts');
    const keyMap: { [key: string]: Function } = {
        'toggle-play': v.pauseToggle,
        'forward': p.anonymous_fun.skipBackward,
        'backward': p.anonymous_fun.skipForward,
        'volume-increase': p.anonymous_fun.arrowUp,
        'volume-decrease': p.anonymous_fun.arrowDown,
        'switch-mode': p.modeToggle,
        'switch-mute': v.setMuted,
        'scroll-current': d.highlightCurrentPlaying,
        'toggle-lyric': p.lyricDisplayFn,
        'toggle-playing-queue': p.togglePlayingBoard,
        'toggle-settings': p.toggleSettings,
        'toggle-player': p.togglePlayer,
        'update-vsm': vsmAdd,
        'close-page': p.closePage,
    }

    for (const key of defaultShortcuts) {
        shortcuts.set(key.code, keyMap[key.action]);
    }
    if (customShortcuts.length > 0) for (const key of customShortcuts) {
        shortcuts.set(key.code, keyMap[key.action]);
    }
}

// vsm专用
async function vsmAdd() {
    if (d.chosenFolder?.getAttribute('plugin') !== 'vsm') return;

    const vsm = d.getPlugin('vsm');
    if (!(vsm instanceof VSM)) return;

    vsm.setSeq(vsm.seq + 32);
    if (vsm.seq < vsm.maxCount) {
        await vsm.getAudioList({seq: vsm.seq});
    }

    await setDisplayFolder(VSM.vsmCache);
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
    } catch (e) {
        console.error(`绑定快捷键失败: ${e.message}`);
    }
}

export {
    initShortcuts,
    enableShortcut,
    mapKeys,
    keyControlFn,
}