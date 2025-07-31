function deepFreeze(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;

    Object.getOwnPropertyNames(obj).forEach((key) => {
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

function createCleanObj(obj: any): any {
    return Object.assign(Object.create(null), obj);
}

export interface IFolderInfo {
    id: number;
    name: string;
    desc?: string;
    cover: string;
}

const defaultFolder: IFolderInfo = Object.freeze({
    id: 1,
    name: '默认歌单',
    desc: '',
    cover: '/img/audio/cover/audio-0.webp'
});

export interface IShortCuts {
    action: string;
    code: string
}

const defaultShortcuts: IShortCuts[] = deepFreeze([
    {action: 'toggle-play', code: 'Space'},
    {action: 'backward', code: 'ArrowLeft'},
    {action: 'forward', code: 'ArrowRight'},
    {action: 'lyric-up', code: 'ArrowUp'},
    {action: 'lyric-down', code: 'ArrowDown'},
    {action: 'switch-mode', code: 'KeyR'},
    {action: 'switch-mute', code: 'KeyM'},
    {action: 'scroll-current', code: 'KeyH'},
    {action: 'toggle-lyric', code: 'KeyC'},
    {action: 'toggle-playing-queue', code: 'KeyL'},
    {action: 'toggle-settings', code: 'KeyS'},
    {action: 'toggle-player', code: 'KeyP'},
    {action: 'update-vsm', code: 'NumpadAdd'},
    {action: 'close-page', code: 'Escape'},
]);

const defaultLyrics = deepFreeze(createCleanObj({
    lyric: Object.freeze([Object.freeze({text: "暂无歌词", time: 0.0})])
}));

export {
    defaultFolder,
    defaultShortcuts,
    defaultLyrics,
    deepFreeze,
    createCleanObj
}