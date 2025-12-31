import {IFormatLyric} from "../types/audio";
import {IBaseFetch} from "../types/http";
import {IConfirm} from "../types/base";
import {config, deepFreeze} from "../utils/util";

export interface IFolderInfo {
    id: number;
    name: string;
    desc?: string;
    cover?: string;
}

export interface IShortCuts {
    action: string;
    code: string
}

export const defaultFolder: IFolderInfo = config({
    id: 1,
    name: '默认歌单',
    desc: '',
    cover: '/img/audio/cover/audio-2.webp'
});

export const defaultShortcuts: Readonly<IShortCuts[]> = deepFreeze([
    {action: 'toggle-play', code: 'Space'},
    {action: 'backward', code: 'ArrowLeft'},
    {action: 'forward', code: 'ArrowRight'},
    {action: 'volume-increase', code: 'ArrowUp'},
    {action: 'volume-decrease', code: 'ArrowDown'},
    {action: 'switch-mode', code: 'KeyR'},
    {action: 'switch-mute', code: 'KeyM'},
    {action: 'scroll-current', code: 'KeyH'},
    {action: 'toggle-lyric', code: 'KeyC'},
    {action: 'toggle-playing-queue', code: 'KeyL'},
    {action: 'toggle-settings', code: 'KeyS'},
    {action: 'toggle-player', code: 'KeyP'},
    {action: 'update-remote', code: 'NumpadAdd'},
    {action: 'close-page', code: 'Escape'},
]);

export const defaultLyrics: IFormatLyric = config({
    lyric: [{text: "暂无歌词", time: 0.0}]
});

export const defaultConfirm: IConfirm = config({
    timeout: 0,
    flag: 'default',
    category: 'info',
    defaultResult: false,
    strictTimeout: false,
    animation: true,
});

export const defaultFetch: IBaseFetch = config({
    method: 'POST',
    body: '',
    headers: {
        'Content-Type': 'application/json',
    },
    referrer: "about:client",
    cache: 'default',
    ignore_err: [],
});
