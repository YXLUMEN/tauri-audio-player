import {IFormatLyric} from "./api/audio";
import {IBaseFetch} from "./api/http";
import {IConfirm} from "./api/base";

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

function deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;

    Object.getOwnPropertyNames(obj).forEach((key) => {
        // @ts-ignore
        const value = obj[key];

        if (
            typeof value === 'object' &&
            value !== null &&
            !Object.isFrozen(value)
        ) {
            deepFreeze(value);
        }
    });

    return Object.freeze(obj);
}

function createCleanObj<T>(obj: T): T {
    return Object.assign(Object.create(null), obj);
}

const defaultFolder: IFolderInfo = createCleanObj({
    id: 1,
    name: '默认歌单',
    desc: '',
    cover: '/img/audio/cover/audio-2.webp'
} as const);

const defaultShortcuts: IShortCuts[] = deepFreeze([
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
] as const);

const defaultLyrics: IFormatLyric = deepFreeze(createCleanObj({
    lyric: [{text: "暂无歌词", time: 0.0}]
} as const));

const defaultConfirm: IConfirm = createCleanObj({
    timeout: 0,
    flag: 'default',
    category: 'info',
    defaultResult: false,
    strictTimeout: false,
    animation: true,
} as const);

const defaultFetch: IBaseFetch = deepFreeze(createCleanObj({
    method: 'POST',
    body: '',
    headers: {
        'Content-Type': 'application/json',
    },
    referrer: "about:client",
    cache: 'default',
    ignore_err: [],
} as const));

export {
    defaultFolder,
    defaultShortcuts,
    defaultLyrics,
    defaultConfirm,
    defaultFetch,
    deepFreeze,
    createCleanObj
}