import * as v from "./env.js";
import {debounce, isEmpty} from "./tools/base_utilities.js";
import createAlert, {appendChildren} from "./tools/base_page.js";
import {IndexedDBHelper} from "./tools/db.js";
import {AbsAudioModel, Local, VSM} from "./plugins/exports";
import {createCleanObj, defaultLyrics, IFolderInfo} from "./default.js";
import {IAudioInfo, ILyric, IStandardAudio} from "../type/audio";


let audioIndex: number = -1;

let playingQueue: IAudioInfo[] = [];

let chosenRow: HTMLElement | null = null;
let chosenFolder: HTMLElement | null = null;

const loadedPlugins: { [key: string]: AbsAudioModel } = Object.create(null);

const dbHelper = new IndexedDBHelper('audio_player', 1, [
    {
        name: 'folder',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
            {name: 'name', keyPath: 'name', unique: true}
        ]
    },
    {
        name: 'favor',
        keyPath: 'index',
        autoIncrement: true,
        indexes: [
            {name: 'id', keyPath: 'id', unique: false},
            {name: 'parent', keyPath: 'parent', unique: false},
            {name: 'parent_id_index', keyPath: ['parent', 'id'], unique: true}
        ]
    },
    {
        name: 'playing_history',
        keyPath: 'index',
    },
    {
        name: 'shortcuts',
        keyPath: 'action',
        indexes: [
            {name: 'code', keyPath: 'code', unique: true},
        ]
    }
]);

// 歌词同步
const LYRIC_ACTIONS: { [key: string]: any } = Object.preventExtensions(createCleanObj({
    currentLine: 0,
    centralPos: 0,
    lineOffset: -50,
    lyricOffset: 0,
    maxScrollHeight: 0,
    lyrArray: [],
    syncLyricEnable: true
}));

function getPlugin(type: string): AbsAudioModel | null {
    const plugin = loadedPlugins[type];
    if (plugin) {
        return plugin;
    }

    let newPlugin: AbsAudioModel | null = null;
    switch (type) {
        case 'vsm':
            newPlugin = new VSM();
            break;
        case 'local':
            newPlugin = new Local();
            break;
        default:
            return null;
    }

    loadedPlugins[type] = newPlugin;
    return newPlugin;
}

async function clearPluginsCache() {
    for (const plugin of Object.values(loadedPlugins)) {
        if (!(plugin instanceof Local)) continue;
        const cache = plugin.getCache();

        // @ts-ignore
        for (const [id, url] of cache) {
            const inDom = document.getElementById(id);
            const inQueue = playingQueue.some(item => item.id === id);
            if (inDom || inQueue) continue;

            URL.revokeObjectURL(url);
            cache.delete(id);
        }
    }
}

/* 数据库操作 */

async function getFavorByFolder(folderId: number): Promise<IAudioInfo[]> {
    const db = await dbHelper.init();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('favor', 'readonly');
        const store = tx.objectStore('favor');
        const index = store.index('parent');
        const request = index.getAll(folderId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function createFolder(folder: IFolderInfo) {
    try {
        await dbHelper.add('folder', folder);
        createAlert('创建成功', 'success');
    } catch (err) {
        console.error(`创建歌单时出错: ${err.message}`);
        createAlert('创建失败', 'error');
    }
}

async function modifyFolder(folder: IFolderInfo) {
    try {
        await dbHelper.update('folder', folder);
        createAlert('修改成功', 'success')
    } catch (err) {
        console.error(`修改歌单出错: ${err.message}`);
        createAlert('修改失败', 'error');
    }
}

async function deleteFolder(folderId: number) {
    const db = await dbHelper.init();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['folder', 'favor'], 'readwrite');
        const folderStore = tx.objectStore('folder');
        const favorStore = tx.objectStore('favor');

        folderStore.delete(folderId);

        const index = favorStore.index('parent');
        const cursorRequest = index.openCursor(IDBKeyRange.only(folderId));
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        }

        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
    });
}


async function collectAudio(parent: number, audioInfo: IAudioInfo) {
    if (!parent) return;

    audioInfo.parent = parent;
    if (audioInfo.index) delete audioInfo.index;
    try {
        await dbHelper.add('favor', audioInfo);
        createAlert('已收藏', 'success');
    } catch (err) {
        if (err.name === 'ConstraintError') {
            createAlert('重复收藏', 'warning');
        } else {
            console.error(`收藏时出错: ${err.message}`);
            createAlert('收藏失败', 'error');
        }
    }
}

async function deCollectAudio(folderId: number, id: string) {
    const db = await dbHelper.init();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('favor', 'readwrite');
        const store = tx.objectStore('favor');
        const index = store.index('parent_id_index');

        const request = index.getKey([folderId, id]);

        request.onsuccess = () => {
            if (!request.result) {
                createAlert('未找到要取消的收藏项', 'info');
                resolve(null);
                return;
            }

            store.delete(request.result);
            createAlert('已取消收藏', 'success');
            chosenFolder?.click();
            resolve(request.result);
        };

        request.onerror = () => {
            console.error(`删除收藏时出错: ${request.error}`);
            createAlert('出现错误', 'error');
            reject(request.error);
        };
    });
}

async function storgePlayingQueue() {
    if (playingQueue.length <= 0) return;
    await clearPlayingQueueHistory();

    for (let i = 0, len = playingQueue.length; i < len; i++) {
        const row = playingQueue[i];
        row.index = i;
        if (row.parent) delete row.parent;
        await dbHelper.add('playing_history', row);
    }
}

async function clearPlayingQueueHistory() {
    const db = await dbHelper.init();
    const tx = db.transaction('playing_history', 'readwrite');
    const store = tx.objectStore('playing_history');
    store.clear();
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

function loadAudio(standard: IStandardAudio) {
    // 设置音频信息
    const {title, album, artist, url, cover} = standard;

    v.indexAudioTitle.firstElementChild.textContent = title;
    v.indexAudioTitle.lastElementChild.textContent = artist;

    document.getElementById('author-name').textContent = artist;
    document.getElementById('music-title').textContent = title;
    document.getElementById('album-name').textContent = album;

    v.lyricTitle.textContent = title;

    // 设置音乐, 并在加载后播放
    v.audioEle.src = url;
    v.audioEle.load();

    v.preLoadCover.src = cover;
}


async function switchAudio(
    newIndex: number = 0,
    scroll: boolean = true,
    play: boolean = true,
    force: boolean = false
): Promise<boolean> {
    if (newIndex < 0 || newIndex >= playingQueue.length) {
        return false;
    }

    if (newIndex === audioIndex && !force) {
        v.audioEle.currentTime = 0;
        v.pauseToggle();
        return false;
    }

    setAudioIndex(newIndex);
    const audio = playingQueue[audioIndex];
    if (!audio) return false;

    const standard = await getPlugin(audio.plugin).parse(audio);
    if (!standard) return false;

    loadAudio(standard);
    if (play) v.pauseToggle();
    highlightCurrentPlaying(scroll);

    return true;
}

function highlightCurrentPlaying(scroll: boolean = true) {
    const currentPlaying: HTMLElement = v.playingQueue.querySelector(`[play-index='${audioIndex}']`);
    if (currentPlaying) {
        v.playingBoard.querySelector('.queue-row.current')?.classList.remove('current');
        currentPlaying.classList.add('current');

        if (scroll) v.playingQueue.scrollTo({top: currentPlaying.offsetTop - 150, behavior: 'smooth'});
    }

    const currentRow = document.getElementById(getCurrentPlaying()?.id);
    if (currentRow) {
        v.folderContent.querySelector('.row.current')?.classList.remove('current');

        currentRow.classList.add('current');
    }
}

function createPlayingQueueItem(index: number, standardInfo: IStandardAudio) {
    const row = document.createElement('div');
    row.setAttribute('play-index', index.toString());
    row.classList.add('queue-row');

    // noinspection DuplicatedCode
    const cover = document.createElement('img');
    cover.src = standardInfo.cover;
    cover.classList.add('small-icon');

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
async function renderPlayingQueue(queue: IAudioInfo[], replace: boolean = true) {
    if (isEmpty(queue)) return;

    const frag = document.createDocumentFragment();
    let cannotLoad = 0;

    for (let i = 0, len = queue.length; i < len; i++) {
        const audio = queue[i];
        const standard = await getPlugin(audio.plugin).parse(audio);
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

        formatLyrics(await plugin.getLyric());
    } catch (err) {
        formatLyrics(defaultLyrics);
        console.warn('Failed to fetch lyrics:', err);
    } finally {
        highlightLine();
    }
}, 3000);

function createLyricRow(value: ILyric, offset: number) {
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

function formatLyrics(lyrics: {}) {
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
function resetLyricPos() {
    v.lyricContent.querySelector('.highlight-line')?.setAttribute('class', '');
    v.lyricContent.style.transform = 'translateY(0)';
    LYRIC_ACTIONS.currentLine = 0;
}

// 高亮当前播放行
function highlightLine() {
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

    allLyricRows[currentLine].classList.add('highlight-line');

    if (syncLyricEnable && currentLine > centralPos) {
        v.lyricContent.style.transform = `translateY(${(currentLine - centralPos) * lineOffset}px)`
    }
}

// 跨度较大时快速跳转歌词
const significantLeapFn = debounce(() => {
    const {lyrArray, currentLine, centralPos, syncLyricEnable} = LYRIC_ACTIONS;
    const length = lyrArray?.length || 0;

    if (length <= 1 || !v.lyricContent?.children) return;

    const currentTime = v.audioEle.currentTime;
    const liElements = v.lyricContent.children;
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
function syncLyric(currentTime: number) {
    const {currentLine, lyrArray, lyricOffset} = LYRIC_ACTIONS;

    if (currentLine >= lyrArray.length || lyrArray.length <= 1) return;

    const adjustedCurrentTime = currentTime + lyricOffset;
    const lyrTime = Number(lyrArray[currentLine].time);

    if (lyrTime * 3 <= adjustedCurrentTime) {
        significantLeapFn();
        return;
    }

    if (lyrTime <= adjustedCurrentTime) {
        highlightLine();
        LYRIC_ACTIONS.currentLine += 1;
    }
}

function getAudioIndex() {
    return audioIndex;
}

function setAudioIndex(index: number) {
    if (isNaN(index)) return;
    audioIndex = Math.min(Math.max(0, index), playingQueue.length);
}

function setAudioIndexUnclamp(index: number) {
    if (isNaN(index)) return;
    audioIndex = index;
}

function getPlayingQueue() {
    return [...playingQueue];
}

function getCurrentPlaying() {
    return playingQueue[audioIndex];
}

function getMaxAudioCount() {
    return playingQueue.length;
}


// 去除重复歌曲
function removeDuplicate(array: IAudioInfo[]) {
    if (array.length === 0) return;

    const merge = new Map();
    for (const item of array) {
        if (item?.id !== undefined && !merge.has(item.id)) {
            merge.set(item.id, item);
        }
    }

    return Array.from(merge.values());
}

// 设置播放队列
async function setPlayingQueue(queue: IAudioInfo[]) {
    if (!queue) return;
    playingQueue = queue;
    await renderPlayingQueue(playingQueue);
}


// 合并队列, 会去除id重复的元素
async function mergePlayingQueue(queue: IAudioInfo[]) {
    if (!queue) return;
    await setPlayingQueue(removeDuplicate(playingQueue.concat(queue)));
}


// 顺序添加
async function pushAudios(audios: IAudioInfo[] | IAudioInfo) {
    if (!audios) return;

    if (Array.isArray(audios)) {
        playingQueue = playingQueue.concat(audios);
    } else {
        playingQueue.push(audios);
    }

    await renderPlayingQueue(playingQueue, false);
}

async function insertAudio(at: number, audios: IAudioInfo[] | IAudioInfo) {
    if (!audios) return;
    const insertIndex = Math.max(0, Math.min(at, playingQueue.length));

    if (Array.isArray(audios)) {
        playingQueue.splice(insertIndex, 0, ...audios);
    } else {
        playingQueue.splice(insertIndex, 0, audios);
    }

    await renderPlayingQueue(playingQueue);
}

async function moveAudio(from: number, to: number) {
    if (from < 0 || from > playingQueue.length) return;
    const toIndex = Math.max(0, Math.min(to, playingQueue.length));

    const audio = playingQueue.splice(from, 1)[0];
    playingQueue.splice(toIndex, 0, audio);

    await renderPlayingQueue(playingQueue);
}

async function unshiftAudios(audios: IAudioInfo[] | IAudioInfo) {
    if (!audios) return;

    if (Array.isArray(audios)) {
        playingQueue = audios.concat(playingQueue);
    } else {
        playingQueue.unshift(audios);
    }

    await renderPlayingQueue(playingQueue);
}

async function removeAudio(index: number) {
    if (index < 0 || index > playingQueue.length) return;

    if (index < audioIndex) {
        setAudioIndex(audioIndex - 1);
    } else if (playingQueue.length === 1) {
        await clearPlayingQueue();
        return;
    } else if (index === audioIndex) {
        await switchAudio(audioIndex + 1, false);
        setAudioIndex(index);
    }
    playingQueue.splice(index, 1);

    await renderPlayingQueue(playingQueue);
}

async function clearPlayingQueue() {
    if (playingQueue.length === 0) return;
    v.pauseToggle(true);
    v.audioEle.removeAttribute('src');

    playingQueue = [];
    setAudioIndexUnclamp(-1);

    v.playingQueue.textContent = '';
    await clearPluginsCache();
}

// 设置选中的音乐并高亮
function setChosenRow(row: HTMLElement) {
    v.folderContent.querySelector('.row.chosen')?.classList.remove('chosen');
    row?.classList.add('chosen');
    chosenRow = row;
}

function setChosenFolder(folder: HTMLElement) {
    chosenFolder = folder;
}

export {
    LYRIC_ACTIONS,
    dbHelper,
    significantLeapFn,
    chosenRow,
    chosenFolder,
    collectAudio,
    deCollectAudio,
    storgePlayingQueue,
    clearPlayingQueueHistory,
    getFavorByFolder,
    getPlugin,
    clearPluginsCache,
    getAudioIndex,
    setAudioIndex,
    setAudioIndexUnclamp,
    getMaxAudioCount,
    setChosenRow,
    setChosenFolder,
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
    createFolder,
    modifyFolder,
    deleteFolder,
    highlightCurrentPlaying,
    getPlayingQueue,
    getCurrentPlaying,
}