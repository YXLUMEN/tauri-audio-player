import * as v from "./env";
import * as d from "./data";
import createAlert, {appendChildren} from "../util/base_page";
import {applyPlayerAction, togglePlayer} from "./player";
import {defaultFolder, IFolderInfo} from "../default";
import {isEmpty, throttleTimeOut} from "../util/base_utilities";
import {open} from '@tauri-apps/plugin-dialog';
import {IAudioInfo, IStandardAudio} from "../api/audio";
import {enableShortcut, vsmAdd} from "../component/shortcuts";
import {randomCover} from "../util/generate_random_nums";
import {collectAudio, createFolder, dbHelper, getFavorByFolder} from "../db/db_init";
import {getPlugin} from "../plugins/plugin_init";


// 展示的音频列表
let displayedContent: IAudioInfo[] | null = [];

// 是否已经合并
let wasMerge: boolean = false;

// 创建歌单元素
function createFolderItem(folder: IFolderInfo): HTMLDivElement {
    const div = document.createElement("div");
    div.setAttribute('folder_id', folder.id.toString());
    div.classList.add('audio-folder');

    const img = document.createElement("img");
    img.classList.add('small-cover');
    img.src = folder.cover ?? randomCover();

    const span = document.createElement("span");
    span.textContent = folder.name;

    appendChildren(div, img, span);
    return div;
}

// 创建歌单内容元素
function createFolderContentItem(index: number, standard: IStandardAudio): HTMLDivElement {
    const row = document.createElement('div');
    row.id = standard.id;
    // noinspection JSCheckFunctionSignatures
    row.setAttribute('index', index.toString());
    row.classList.add('row');

    const play = document.createElement('div');
    play.classList.add('play-icon');
    // noinspection JSValidateTypes
    play.textContent = index.toString();

    // noinspection DuplicatedCode
    const cover = document.createElement('img');
    cover.src = standard.cover;
    cover.classList.add('small-cover');

    const title = document.createElement('div');
    const titleSpan = document.createElement('span');
    const artistSpan = document.createElement('span');
    titleSpan.textContent = standard.title;
    artistSpan.textContent = standard.artist;

    artistSpan.classList.add('less');
    title.classList.add('title');
    title.append(titleSpan, artistSpan);

    const album = document.createElement('div');
    const span2 = document.createElement('span');
    album.classList.add('album', 'less');
    span2.textContent = standard.album;
    album.append(span2);

    appendChildren(row, play, cover, title, album);
    return row;
}

// 渲染所有歌单
async function renderCustomFolder() {
    const playList: IFolderInfo[] = await dbHelper.getAll('folder');

    if (playList.length === 0) {
        v.customFolderList.replaceChildren(createFolderItem(defaultFolder));
        await dbHelper.add('folder', defaultFolder);
        return;
    }

    const frag = document.createDocumentFragment();
    playList.forEach(item => frag.append(createFolderItem(item)));

    v.customFolderList.replaceChildren(frag);
    d.chosenFolder?.classList.add('current');
}

// 渲染歌单内容
async function renderFolderContent(queue: IAudioInfo[] | null, start = 0) {
    if (isEmpty(queue)) {
        v.folderContent.textContent = '';
        showContentTip('无内容');
        return;
    }

    const frag = document.createDocumentFragment();
    for (let i = start; i < queue.length; i++) {
        const info = queue[i];
        const standard = await getPlugin(info.plugin)?.parse(info);
        if (!standard) continue;
        frag.append(createFolderContentItem(i, standard));
    }

    v.folderContent.replaceChildren(frag);
}

function showContentTip(text: string): void {
    const div = document.createElement("div");
    div.classList.add('load-more');
    const span = document.createElement("span");
    span.classList.add('less');
    span.textContent = text;
    div.append(span);

    v.folderContent.append(div);
    div.onclick = () => vsmAdd();
}

// 设置播放队列
async function setDisplayFolder(array: IAudioInfo[] | null, reRender: boolean = true) {
    displayedContent = array;
    if (reRender) {
        await renderFolderContent(displayedContent);
    }
}

// 终止输入
let pendingInput: ((reason?: any) => void) | null = null;

// 显示歌单信息界面并获取输入的值
async function getNewFolderInfo(create: boolean = false): Promise<IFolderInfo | null> {
    if (pendingInput) {
        pendingInput('Interrupted');
        pendingInput = null;
    }

    const nameInput = document.getElementById('folder-editor-name') as HTMLInputElement;
    const descInput = document.getElementById('folder-editor-desc') as HTMLInputElement;
    const coverImg = document.getElementById('folder-editor-cover') as HTMLInputElement;
    const confirmButtons = document.getElementById('folder-editor-buttons');

    if (!nameInput || !descInput || !coverImg || !confirmButtons) {
        console.error('Cannot find DOMElements!');
        return null;
    }

    let originId: number | undefined;
    if (create) {
        nameInput.value = '';
        descInput.value = '';
        coverImg.src = randomCover();
    } else {
        const folderId = d.chosenFolder?.getAttribute('folder_id');
        if (!folderId) return null;

        const id = Number(folderId);
        const folder: IFolderInfo = await dbHelper.get('folder', id);
        if (!folder) return null;

        originId = folder.id;
        nameInput.value = folder.name;
        descInput.value = folder.desc ?? '';
        coverImg.src = folder.cover ?? randomCover();
    }

    enableShortcut(false);
    const editor = document.getElementById('folder-editor')!;
    editor.classList.add('show');
    v.folderContent.parentElement!.classList.add('hide');

    const abort = new AbortController();
    const {promise, resolve, reject} = Promise.withResolvers();

    promise.finally(() => {
        pendingInput = null;
        abort.abort();

        v.folderContent.parentElement!.classList.remove('hide');
        editor.classList.remove('show');
        enableShortcut(true);
    });

    coverImg.addEventListener('click', async () => {
        try {
            const files = await open({
                title: '选择图片',
                directory: false,
                multiple: false,
                filters: [{name: 'Images', extensions: ['png', 'jpg', 'cover', 'ico']}]
            });

            if (files) coverImg.src = files[0];
        } catch (err) {
            console.warn('选择图片被取消或出错', err);
        }
    }, {signal: abort.signal});

    confirmButtons.addEventListener('click', event => {
        const action = (event.target as HTMLElement).closest('.base-button')?.getAttribute('action');
        if (!action) return;

        if (action === 'submit' && nameInput.value.trim() !== '') {
            resolve({
                id: originId,
                name: nameInput.value,
                desc: descInput.value,
                cover: coverImg.src
            });
        } else if (action === 'cancel') {
            resolve(null);
        }
    }, {signal: abort.signal});

    pendingInput = reject;
    return await promise as Promise<IFolderInfo | null>;
}

// 显示歌单选择框并返回选中的歌单
async function choseFolderToCollect(): Promise<number | null> {
    try {
        const playList: IFolderInfo[] = await dbHelper.getAll('folder');
        if (playList.length === 0) return null;

        const frag = document.createDocumentFragment();
        playList.forEach(item => frag.append(createFolderItem(item)));
        v.choseFolderContent.replaceChildren(frag);
    } catch (err) {
        console.error(err);
        return null;
    }

    const abort = new AbortController();
    const {promise, resolve} = Promise.withResolvers();

    promise.finally(() => {
        abort.abort();
        v.choseFolderContent.parentElement!.classList.remove('show');
    });

    v.choseFolderContent.addEventListener('click', (event) => {
        const id = (event.target as HTMLElement).closest('.audio-folder')?.getAttribute('folder_id');
        if (!id) return;
        resolve(Number(id));
    }, {signal: abort.signal});

    v.choseFolderContent.parentElement!.classList.add('show');

    return await promise as Promise<number | null>;
}

// 选择歌单
const selectFolder = throttleTimeOut(async (event: MouseEvent) => {
    const folder = (event.target as HTMLElement).closest('.audio-folder') as HTMLElement;
    if (!folder) return;

    v.indexLeftPanel.querySelector('.audio-folder.current')?.classList.remove('current');
    folder.classList.add('current');
    d.setChosenFolder(folder);
    wasMerge = false;

    let audios: IAudioInfo[] | IStandardAudio[] | null | undefined;
    const plugin = folder.getAttribute('plugin');

    if (plugin) {
        // 加载远程歌单
        audios = await getPlugin(plugin)?.getAudioList();
    } else {
        // 加载用户歌单
        const id = Number(folder.getAttribute('folder_id'));
        if (isNaN(id)) return;

        audios = await getFavorByFolder(id);
    }
    if (!audios) return;

    const folderTitle = document.getElementById('folder-info-title')!;
    const folderCover = document.getElementById('folder-info-cover') as HTMLImageElement;

    folderCover.src = folder.getElementsByTagName('img')?.[0].src || randomCover();
    folderTitle.textContent = folder.getElementsByTagName('span')?.[0]?.textContent || '歌单';

    await setDisplayFolder(audios);
    d.highlightCurrentPlaying();
    if (plugin && !getPlugin(plugin)?.isAll()) showContentTip('显示更多');
}, 300);

// 第一次载入后显示内容
v.indexLeftPanel.addEventListener('click', event => {
    const folder = (event.target as HTMLElement).closest('.audio-folder');
    if (!folder) return;

    document.getElementById('custom-folder-detail')!.classList.remove('hide');
    selectFolder(event);
    v.indexLeftPanel.addEventListener('click', selectFolder);
}, {once: true});

// 播放歌曲
async function playChosenRow(target: HTMLElement | null) {
    const index = target?.getAttribute('index');
    if (!index) return;
    if (!wasMerge) {
        await d.setPlayingQueue(displayedContent)
    }
    wasMerge = true;
    d.setAudioIndexUnclamp(-1);

    await d.switchAudio(Number(index));
}

// 展示播放器或处理操作按钮
const handleIndexPlayController = throttleTimeOut(async (event: MouseEvent) => {
    const action = (event.target as HTMLElement).getAttribute('action');
    if (!action) {
        togglePlayer();
        return;
    }

    if (action === 'collect') {
        const parent = await choseFolderToCollect();
        const info = d.getCurrentPlaying();
        if (!parent || !info) return;
        await collectAudio(parent, info);
        return;
    }

    applyPlayerAction(action);
}, 200);

// 展示播放器或处理操作按钮
document.getElementById('index-audio-control')!.addEventListener('click', handleIndexPlayController);

// 预加载避免闪烁, 同时作为音频切换触发
v.preLoadCover.addEventListener('load', () => {
    v.playerBackground.style.backgroundImage = `url(${v.preLoadCover.src})`;
    (v.indexAudioCover.firstElementChild as HTMLImageElement).src = v.preLoadCover.src;
});

// 初次加载后显示index控制面板
v.audioEle.addEventListener('play', () =>
    document.getElementById('index-audio-control')!.classList.remove('hide'), {once: true});

// 将歌单推入播放列表
document.getElementById('add-all')!.addEventListener('click', () => {
    if (displayedContent && displayedContent.length <= 0) return;
    d.pushAudios(displayedContent).catch(console.error);
});

// 新建歌单
document.getElementById('create-folder')!.addEventListener('click', async () => {
    try {
        const info = await getNewFolderInfo(true);
        if (!info) return;

        await createFolder(info);
        await renderCustomFolder();
    } catch (err) {
        console.error(err);
    }
});

// 选择歌曲
v.folderContent.addEventListener('click', (event) => {
    const row = (event.target as HTMLElement)?.closest('.row') as HTMLElement;
    if (!row) return;
    d.setChosenRow(row);
});

// 双击播放
v.folderContent.addEventListener('dblclick', (event) => {
    const row = (event.target as HTMLElement)?.closest('.row') as HTMLElement;
    if (!row) return;
    return playChosenRow(row);
});

// 清空播放列表
document.getElementById('playing-board-title')!.addEventListener('click', async (event) => {
    const action = (event.target as HTMLElement)?.getAttribute('action');
    if (action === 'collect-all') {
        const folderId = await choseFolderToCollect();
        if (!folderId) return;
        for (const audio of d.getPlayingQueue()) {
            audio.parent = folderId;
            if (audio.index) delete audio.index;
            try {
                await dbHelper.add('favor', audio);
            } catch (err) {
                if (err instanceof Error && err.name === 'ConstraintError') continue;
                console.error(err);
            }
        }
        createAlert('收藏完成', 'success');
        return;
    }
    if (action === 'clear-queue') {
        return d.clearPlayingQueue();
    }
});

function initIndex(): Promise<void> {
    return renderCustomFolder();
}

export {
    initIndex,
    renderFolderContent,
    renderCustomFolder,
    setDisplayFolder,
    showContentTip,
    playChosenRow,
    choseFolderToCollect,
    getNewFolderInfo,
    displayedContent,
}