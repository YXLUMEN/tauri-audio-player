import * as v from "./env";
import {clearPlayingQueueHistory, dbHelper} from "../db/db_init"
import {debounce, isEmpty} from "../util/base_utilities";
import createAlert, {appendChildren} from "../util/base_page";
import {getPlugin, isCacheAble, loadedPlugins} from "../plugins/plugin_init";
import {createCleanObj, defaultLyrics} from "../default";
import {IAudioInfo, IFormatLyric, ILyric, ILyricAction, IStandardAudio, ISwitchAudio} from "../api/audio";

const SIGNIFICANT_LAG_RATIO: number = 3;

let audioIndex: number = -1;

let playingQueue: IAudioInfo[] = [];

let chosenRow: HTMLElement | null = null;
let chosenFolder: HTMLElement | null = null;

// 歌词同步
const LYRIC_ACTIONS: ILyricAction = Object.preventExtensions(createCleanObj({
    currentLine: 0,
    centralPos: 0,
    lineOffset: -50,
    lyricOffset: 0,
    maxScrollHeight: 0,
    lyrArray: [],
    syncLyricEnable: true
}));

function clearPluginsCache(): void {
    // 播放队列中的 ID
    const inQueueIds = new Set<string>(
        playingQueue.map(item => item.id)
    );

    // 当前在 DOM(folder-content) 中的 ID
    const inDomIds = new Set<string>(
        Array.from(v.folderContent.querySelectorAll('[id]'))
            .map(el => el.id)
    );

    // 合并两者：只要出现在队列或 DOM，就不清理
    const inUseIds = new Set<string>([...inQueueIds, ...inDomIds]);

    // 委托每个插件自己清理
    for (const plugin of Object.values(loadedPlugins)) {
        if (!isCacheAble(plugin)) continue;
        plugin.clearUnused(inUseIds);
    }
}

function forceClearPluginsCache(): void {
    for (const plugin of Object.values(loadedPlugins)) {
        if (isCacheAble(plugin)) plugin.clear();
    }
}

async function storgePlayingQueue(): Promise<void> {
    if (playingQueue.length <= 0) return;
    await clearPlayingQueueHistory();

    for (let i = 0, len = playingQueue.length; i < len; i++) {
        const row = playingQueue[i];
        row.index = i;
        if (row.parent) delete row.parent;
        await dbHelper.add('playing_history', row);
    }
}

/* 音频操作 */

// 更新显示的音频信息
v.audioEle.addEventListener('loadedmetadata', () => {
    // 重置进度条
    const total = v.transTime(v.audioEle.duration);
    v.iTotalTime.textContent = total;
    v.audioTime.textContent = total;

    v.audioEle.currentTime = 0;
    v.updatePlayingProgress(0);

    // 重置歌词
    v.lyricContent.innerHTML = '<li>加载歌词中 . . .</li>';
    resetLyricPos();
    // 获取歌词
    fetchLyricFn();
});

let loadCtrl: AbortController | null = null;

function loadAudio(standard: IStandardAudio): Promise<boolean> {
    const {title, album, artist, url, cover} = standard;

    v.indexAudioTitle.firstElementChild!.textContent = title;
    v.indexAudioTitle.lastElementChild!.textContent = artist;

    document.getElementById('author-name')!.textContent = artist;
    document.getElementById('music-title')!.textContent = title;
    document.getElementById('album-name')!.textContent = album;

    document.getElementById('lyric-title')!.textContent = title;

    v.audioEle.src = url;
    v.audioEle.load();

    v.preLoadCover.src = cover;

    loadCtrl?.abort();
    return new Promise((resolve) => {
        const ctrl = new AbortController();
        loadCtrl = ctrl;

        let timer: number;

        const settle = (ok: boolean) => {
            if (ctrl.signal.aborted) return;
            ctrl.abort();
            if (timer) clearTimeout(timer);
            resolve(ok);
        };

        timer = setTimeout(() => settle(false), 3E4);

        v.audioEle.addEventListener('loadedmetadata', () => settle(true), {once: true, signal: ctrl.signal});
        v.audioEle.addEventListener('error', () => settle(false), {once: true, signal: ctrl.signal});

        // 外部中断
        ctrl.signal.addEventListener('abort', () => settle(false), {once: true});

        // 若在注册后立刻处于 aborted, 立刻返回
        if (ctrl.signal.aborted) {
            settle(false);
        }
    });
}

async function switchAudio(newIndex: number, opt: ISwitchAudio = {}): Promise<boolean> {
    if (newIndex < 0 || newIndex >= playingQueue.length) {
        return false;
    }

    const {force = false, play = true, scroll = false} = opt;

    try {
        if (newIndex === audioIndex && !force) {
            v.audioEle.currentTime = 0;
            return await v.pauseToggle(play);
        }

        v.showLoading();
        setAudioIndex(newIndex);
        const audio = playingQueue[audioIndex];
        if (!audio) return false;

        const standard = await getPlugin(audio.plugin)?.parse(audio);
        if (!standard) return false;

        const loaded = await loadAudio(standard);
        if (!loaded) return false;

        highlightCurrentPlaying(scroll);

        if (play) return await v.pauseToggle();
        return true;
    } finally {
        v.hideLoading();
    }
}

function highlightCurrentPlaying(scroll: boolean = true): void {
    // 高亮播放列表行
    const currentPlaying = v.playingQueue.querySelector(`[play-index='${audioIndex}']`);
    if (currentPlaying instanceof HTMLElement) {
        v.playingBoard.querySelector('.queue-row.current')?.classList.remove('current');
        currentPlaying.classList.add('current');

        if (scroll) {
            v.playingQueue.scrollTo({top: currentPlaying.offsetTop - 150, behavior: 'smooth'});
        }
    }

    // 高亮歌单行
    const id = getCurrentPlaying()?.id;
    if (id === undefined) return;
    const currentRow = document.getElementById(id);
    if (currentRow) {
        v.folderContent.querySelector('.row.current')?.classList.remove('current', 'playing');

        currentRow.classList.add('current');
        if (!v.audioEle.paused) currentRow.classList.add('playing');
    }
}

function createPlayingQueueItem(index: number, standardInfo: IStandardAudio): HTMLDivElement {
    const row = document.createElement('div');
    row.setAttribute('play-index', index.toString());
    row.classList.add('queue-row');

    const cover = document.createElement('img');
    cover.src = standardInfo.cover;
    cover.classList.add('small-cover');

    const title = document.createElement('div');
    const titleSpan = document.createElement('span');
    const artistSpan = document.createElement('span');
    titleSpan.textContent = standardInfo.title;
    artistSpan.textContent = standardInfo.artist;

    artistSpan.classList.add('less');
    title.classList.add('title');
    title.append(titleSpan, artistSpan);

    appendChildren(row, cover, title);
    return row;
}

/**
 * @param queue 将渲染的列表,为空跳过
 * @param replace 是否重新渲染整个列表
 * */
async function renderPlayingQueue(queue: IAudioInfo[], replace: boolean = true): Promise<void> {
    if (isEmpty(queue)) return;

    const frag = document.createDocumentFragment();
    let cannotLoad = 0;

    for (let i = 0, len = queue.length; i < len; i++) {
        const audio = queue[i];
        const standard = await getPlugin(audio.plugin)?.parse(audio);
        if (standard) {
            frag.appendChild(createPlayingQueueItem(i, standard));
        } else {
            cannotLoad += 1;
        }
    }

    replace ? v.playingQueue.replaceChildren(frag) : v.playingQueue.append(frag);
    if (v.playingBoard.classList.contains('hide')) v.playingQueue.scrollTo({top: 0});

    highlightCurrentPlaying(false);
    if (cannotLoad > 0) createAlert(`${cannotLoad} 个文件无法加载`, 'warning');
}

// 获取歌词
const fetchLyricFn = debounce(async () => {
    try {
        const plugin = getPlugin(playingQueue[audioIndex]?.plugin);
        if (!plugin) return;

        formatLyrics(await plugin.getLyric() ?? defaultLyrics);
    } catch (err) {
        formatLyrics(defaultLyrics);
        console.warn('Failed to fetch lyrics:', err);
    } finally {
        highlightLine();
    }
}, 3000);

function createLyricRow(value: ILyric, offset: number): HTMLDivElement {
    const {time, text, ex = ''} = value;

    const item = document.createElement('div');
    item.classList.add('lyric-item');

    const divText = document.createElement('div');
    divText.classList.add('text');
    divText.setAttribute('time', time.toString());
    divText.textContent = text;

    const exSpan = document.createElement('span');
    exSpan.textContent = ex;
    divText.appendChild(exSpan);

    const timeSpan = document.createElement('span');
    timeSpan.textContent = v.transTime(time + offset);
    timeSpan.classList.add('time');

    appendChildren(item, divText, timeSpan);
    return item;
}

function formatLyrics(lyrics: IFormatLyric): void {
    const {lyric, offset = 0} = lyrics || defaultLyrics;
    if (!lyric) throw new Error('no lyrics found');

    LYRIC_ACTIONS.lyrArray = lyric;
    LYRIC_ACTIONS.lyricOffset = offset;

    v.lyricOffsetEle.textContent = offset ? offset.toFixed(1) : '';

    const frag = document.createDocumentFragment();
    lyric.forEach((row: ILyric) => frag.append(createLyricRow(row, offset)));

    v.lyricContent.replaceChildren(frag);

    LYRIC_ACTIONS.maxScrollHeight = (lyric.length - 1) * LYRIC_ACTIONS.lineOffset;
}

// 重置滚动
function resetLyricPos(): void {
    v.lyricContent.querySelector('.highlight-line')?.setAttribute('class', '');
    v.lyricContent.style.transform = 'translateY(0)';
    LYRIC_ACTIONS.currentLine = 0;
}

// 高亮当前播放行
function highlightLine(): void {
    const allLyricRows = v.lyricContent.children;
    if (allLyricRows.length <= 1) return;

    const {currentLine, centralPos, syncLyricEnable, lineOffset} = LYRIC_ACTIONS;
    const NEAR_LINE_COUNT = 4;

    if (currentLine > 0) {
        const prevElement = allLyricRows[currentLine - 1];
        if (prevElement) {
            prevElement.classList.remove('highlight-line');
            prevElement.classList.add('near-line');
        }

        // Remove 'near-line' from element 3 lines above
        allLyricRows[currentLine - 3]?.classList.remove('near-line');

        // Add 'near-line' to the next few lines
        for (let i = NEAR_LINE_COUNT; i--;) {
            const nextElement = allLyricRows[currentLine + i];
            if (!nextElement) break;
            nextElement.classList.add('near-line');
        }
    }

    allLyricRows[currentLine]?.classList.add('highlight-line');

    if (syncLyricEnable && currentLine > centralPos) {
        v.lyricContent.style.transform = `translateY(${(currentLine - centralPos) * lineOffset}px)`
    }
}

// 跨度较大时快速跳转歌词
const significantLeapFn = debounce(() => {
    const {lyrArray, currentLine, centralPos, syncLyricEnable} = LYRIC_ACTIONS;
    const length = lyrArray?.length || 0;
    const liElements = v.lyricContent.children;

    if (length <= 1 || !liElements) return;

    const currentTime = v.audioEle.currentTime;
    const LOOK_AHEAD = 4;

    const start = Math.max(currentLine - LOOK_AHEAD, 0);
    const end = Math.min(currentLine + LOOK_AHEAD, length);
    for (let i = start; i < end; i++) {
        liElements.item(i)?.classList.remove('highlight-line', 'near-line');
    }

    if (lyrArray[1]?.time >= currentTime) {
        if (syncLyricEnable) v.lyricContent.style.transform = 'translateY(0)';
        LYRIC_ACTIONS.currentLine = 0;
        highlightLine();
        return;
    }

    for (let i = 0; i < length; i++) {
        const isLastLyric = i === length - 1;
        const currentLyricTime = lyrArray[i].time;
        const nextLyricTime = isLastLyric ? Infinity : lyrArray[i + 1].time;

        if (currentLyricTime <= currentTime && currentTime < nextLyricTime) {
            LYRIC_ACTIONS.currentLine = i;
            if (syncLyricEnable && i < centralPos * 2) {
                v.lyricContent.style.transform = 'translateY(0)';
            }
            break;
        }
    }

    highlightLine();
    v.updatePlayingProgress(currentTime);
}, 100);

// 同步歌词
function syncLyric(currentTime: number): void {
    const {currentLine, lyrArray, lyricOffset} = LYRIC_ACTIONS;

    if (currentLine >= lyrArray.length || lyrArray.length <= 1) return;

    const adjustedCurrentTime = currentTime + lyricOffset;
    const lyrTime = lyrArray[currentLine].time;

    if (lyrTime * SIGNIFICANT_LAG_RATIO <= adjustedCurrentTime) {
        significantLeapFn();
        return;
    }

    if (lyrTime <= adjustedCurrentTime) {
        highlightLine();
        LYRIC_ACTIONS.currentLine += 1;
    }
}

function getAudioIndex(): number {
    return audioIndex;
}

function setAudioIndex(index: number): void {
    if (isNaN(index)) return;
    audioIndex = Math.min(Math.max(0, index), playingQueue.length);
}

function setAudioIndexUnclamp(index: number): void {
    if (isNaN(index)) return;
    audioIndex = index;
}

function getPlayingQueue(): IAudioInfo[] {
    return [...playingQueue];
}

function getCurrentPlaying(): IAudioInfo | null {
    return playingQueue[audioIndex];
}

function getMaxAudioCount(): number {
    return playingQueue.length;
}

// 去除重复歌曲
function removeDuplicate(array: IAudioInfo[]): IAudioInfo[] | null {
    if (array.length === 0) return null;

    const merge = new Map<string, IAudioInfo>();
    for (const item of array) {
        if (item?.id !== undefined && !merge.has(item.id)) {
            merge.set(item.id, item);
        }
    }

    return Array.from(merge.values());
}

// 设置播放队列
async function setPlayingQueue(queue: IAudioInfo[] | null): Promise<void> {
    if (!queue) return;
    playingQueue = queue;
    await renderPlayingQueue(playingQueue);
}


// 合并队列, 会去除id重复的元素
async function mergePlayingQueue(queue: IAudioInfo[] | null) {
    if (!queue) return;
    await setPlayingQueue(removeDuplicate(playingQueue.concat(queue)));
}

// 顺序添加
async function pushAudios(audios: IAudioInfo[] | IAudioInfo | null): Promise<void> {
    if (!audios) return;

    if (Array.isArray(audios)) {
        playingQueue = playingQueue.concat(audios);
    } else {
        playingQueue.push(audios);
    }

    await renderPlayingQueue(playingQueue, false);
}

async function insertAudio(at: number, audios: IAudioInfo[] | IAudioInfo | null): Promise<void> {
    if (!audios) return;
    const insertIndex = Math.max(0, Math.min(at, playingQueue.length));

    if (Array.isArray(audios)) {
        playingQueue.splice(insertIndex, 0, ...audios);
    } else {
        playingQueue.splice(insertIndex, 0, audios);
    }

    await renderPlayingQueue(playingQueue);
}

async function moveAudio(from: number, to: number): Promise<void> {
    if (from < 0 || from > playingQueue.length) return;
    const toIndex = Math.max(0, Math.min(to, playingQueue.length));

    const audio = playingQueue.splice(from, 1)[0];
    playingQueue.splice(toIndex, 0, audio);

    await renderPlayingQueue(playingQueue);
}

async function unshiftAudios(audios: IAudioInfo[] | IAudioInfo): Promise<void> {
    if (!audios) return;

    if (Array.isArray(audios)) {
        playingQueue = audios.concat(playingQueue);
    } else {
        playingQueue.unshift(audios);
    }

    await renderPlayingQueue(playingQueue);
}

async function removeAudio(index: number): Promise<void> {
    if (index < 0 || index > playingQueue.length) return;

    if (index < audioIndex) {
        setAudioIndex(audioIndex - 1);
    } else if (playingQueue.length === 1) {
        await clearPlayingQueue();
        return;
    } else if (index === audioIndex) {
        await switchAudio(audioIndex + 1, {play: false});
        setAudioIndex(index);
    }
    playingQueue.splice(index, 1);

    await renderPlayingQueue(playingQueue);
}

async function clearPlayingQueue(): Promise<void> {
    if (playingQueue.length === 0) return;
    await v.pauseToggle(false);
    v.audioEle.removeAttribute('src');

    playingQueue = [];
    setAudioIndexUnclamp(-1);

    v.playingQueue.textContent = '';
    clearPluginsCache();
}

// 设置选中的音乐并高亮
function setChosenRow(row: HTMLElement | null): void {
    v.folderContent.querySelector('.row.chosen')?.classList.remove('chosen');
    row?.classList.add('chosen');
    chosenRow = row;
}

// 设置选中的歌单
function setChosenFolder(folder: HTMLElement | null): void {
    chosenFolder = folder;
}

export {
    LYRIC_ACTIONS,
    significantLeapFn,
    chosenRow,
    chosenFolder,
    clearPluginsCache,
    forceClearPluginsCache,
    getAudioIndex,
    setAudioIndex,
    setAudioIndexUnclamp,
    getMaxAudioCount,
    setChosenRow,
    setChosenFolder,
    removeDuplicate,
    setPlayingQueue,
    mergePlayingQueue,
    pushAudios,
    insertAudio,
    moveAudio,
    unshiftAudios,
    removeAudio,
    clearPlayingQueue,
    switchAudio,
    syncLyric,
    highlightCurrentPlaying,
    getPlayingQueue,
    getCurrentPlaying,
    storgePlayingQueue
}