import * as v from "./env";
import * as d from "./data";
import createAlert, {appendChildren} from "./tools/base_page";
import {applyPlayerAction, togglePlayer} from "./player";
import {defaultFolder, IFolderInfo} from "./default";
import {throttleTimeOut} from "./tools/base_utilities";
import {open} from '@tauri-apps/plugin-dialog';
import {IAudioInfo, IStandardAudio} from "../interfaces/audio";
import {enableShortcut} from "./shortcuts";


// 展示的音频列表
let displayedContent: IAudioInfo[] = [];

// 是否已经合并
let wasMerge: boolean = false;

// 创建歌单元素
function createFolderItem(folder: IFolderInfo): HTMLDivElement {
    const div = document.createElement("div");
    div.setAttribute('_id', folder.id.toString());
    div.classList.add('audio-folder');

    const img = document.createElement("img");
    img.classList.add('small-icon');
    img.src = folder.cover;

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
    cover.classList.add('small-icon');

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
    const playList: IFolderInfo[] = await d.dbHelper.getAll('folder');

    if (playList.length === 0) {
        v.customFolderList.replaceChildren(createFolderItem(defaultFolder));
        await d.dbHelper.add('folder', defaultFolder);
        return;
    }

    const frag = document.createDocumentFragment();
    playList.forEach(item => frag.append(createFolderItem(item)));

    v.customFolderList.replaceChildren(frag);
    d.chosenFolder?.classList.add('current');
}

// 渲染歌单内容
async function renderFolderContent(queue: IAudioInfo[] | null, start = 0) {
    if (!queue) {
        v.folderContent.textContent = '';
        return;
    }

    const frag = document.createDocumentFragment();
    for (let i = start; i < queue.length; i++) {
        const info = queue[i];
        const standard = await d.getPlugin(info.plugin).parse(info);
        if (!standard) continue;
        frag.append(createFolderContentItem(i, standard));
    }

    v.folderContent.replaceChildren(frag);
}

// 设置播放队列
async function setDisplayFolder(array: IAudioInfo[] | null, reRender: boolean = true) {
    displayedContent = array;
    if (reRender) {
        await renderFolderContent(displayedContent);
    }
}

// 终止输入
let pendingInput: (reason?: any) => void = null;

// 显示歌单信息界面并获取输入的值
async function getNewFolderInfo(create: boolean = false): Promise<IFolderInfo | null> {
    if (pendingInput) pendingInput('Interrupted');

    const nameInput = <HTMLInputElement>document.getElementById('modify-folder-name');
    const descInput = <HTMLInputElement>document.getElementById('modify-folder-desc');
    const coverImg = <HTMLInputElement>document.getElementById('modify-folder-cover');
    const confirmButtons = document.getElementById('folder-modify-buttons');

    if (!nameInput || !descInput || !coverImg || !confirmButtons) {
        console.error('Cannot find DOMElements!');
        return null;
    }

    let originId: number | undefined;
    if (create) {
        nameInput.value = '';
        descInput.value = '';
        coverImg.src = `/img/audio/cover/audio-${Math.round(Math.random() * 30)}.webp`;
    } else {
        if (!d.chosenFolder) return null;

        const id = Number(d.chosenFolder.getAttribute('_id'));
        const folder: IFolderInfo = await d.dbHelper.get('folder', id);
        if (!folder) return null;

        originId = folder.id;
        nameInput.value = folder.name;
        descInput.value = folder.desc;
        coverImg.src = folder.cover;
    }

    enableShortcut(false);
    v.folderContent.parentElement.classList.add('hide');
    v.modifyFolder.classList.add('show');

    const abort = new AbortController();
    const {promise, resolve, reject} = Promise.withResolvers();

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
        const action = (<HTMLElement>event.target).closest('.base-button')?.getAttribute('action');
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

    promise.finally(() => {
        pendingInput = null;
        abort.abort();
        v.folderContent.parentElement.classList.remove('hide');
        v.modifyFolder.classList.remove('show');
        enableShortcut(true);
    });

    pendingInput = reject;
    return await <Promise<IFolderInfo | null>>promise;
}

// 显示歌单选择框并返回选中的歌单
async function choseFolderToCollect(): Promise<number | null> {
    try {
        const playList: IFolderInfo[] = await d.dbHelper.getAll('folder');
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

    v.choseFolderContent.addEventListener('click', (event) => {
        const id = (<HTMLElement>event.target).closest('.audio-folder')?.getAttribute('_id');
        if (!id) return;
        resolve(Number(id));
    }, {signal: abort.signal});

    v.choseFolderContent.parentElement.classList.add('show');

    try {
        return await <Promise<number | null>>promise;
    } finally {
        abort.abort();
        v.choseFolderContent.parentElement.classList.remove('show');
    }
}

// 选择歌单
const selectFolder = throttleTimeOut(async (event: MouseEvent) => {
    const folder: HTMLElement = (<HTMLElement>event.target).closest('.audio-folder');
    if (!folder) return;

    v.indexLeftPanel.querySelector('.audio-folder.current')?.classList.remove('current');
    folder.classList.add('current');
    d.setChosenFolder(folder);
    wasMerge = false;

    let audios: IAudioInfo[];
    const plugin = folder.getAttribute('plugin');

    if (plugin) {
        // 加载特殊歌单
        audios = await d.getPlugin(plugin).getAudioList();
    } else {
        // 加载本地歌单
        const id = Number(folder.getAttribute('_id'));
        if (isNaN(id)) return;

        audios = await d.getFavorByFolder(id);
    }

    v.folderInfoCover.src = folder.getElementsByTagName('img')?.[0].src || '/img/audio/cover/audio-11.cover';
    v.folderInfoTitle.textContent = folder.getElementsByTagName('span')?.[0]?.textContent || '歌单';

    await setDisplayFolder(audios);
}, 300);

v.indexLeftPanel.addEventListener('click', selectFolder);

// 播放歌曲
async function playChosenRow(target: HTMLElement) {
    const index = target?.getAttribute('index');
    if (!index) return;
    if (!wasMerge) {
        await d.setPlayingQueue(displayedContent)
    }
    wasMerge = true;
    d.setAudioIndexUnclamp(-1);

    await d.switchAudio(Number(index));
}

// 提交搜索
async function searchAudios() {
    const input = <HTMLInputElement>document.getElementById('search-input');
    if (!input || input.value.trim() === '') return;
    createAlert('目前只支持VSM搜索, 且处于beta版', 'info');

    const result = await d.getPlugin('vsm').getAudioList({search: input.value.trim()});
    if (!result) {
        createAlert('无结果', 'info');
        return;
    }

    await setDisplayFolder(result);
}

document.getElementById('search-submit').addEventListener('click', searchAudios);

// 展示播放器或处理操作按钮
const handleIndexPlayController = throttleTimeOut(async (event: MouseEvent) => {
    const target = (<HTMLElement>event.target).closest('.item');
    if (!target) {
        togglePlayer();
        return;
    }

    const action = target.getAttribute('action');
    if (action === 'collect') {
        await d.collectAudio(await choseFolderToCollect(), d.getCurrentPlaying());
        return;
    }

    applyPlayerAction(action);
}, 200);

// 展示播放器或处理操作按钮
document.getElementById('index-audio-control').addEventListener('click', handleIndexPlayController);

// 预加载避免闪烁, 同时作为音频切换触发
v.preLoadCover.addEventListener('load', () => {
    v.playerBackground.style.backgroundImage = `url(${v.preLoadCover.src})`;
    (<HTMLImageElement>v.indexAudioCover.firstElementChild).src = v.preLoadCover.src;
});

v.audioEle.addEventListener('play', () =>
    document.getElementById('index-audio-control').classList.remove('hide'), {once: true});

// 将歌单推入播放列表
document.getElementById('add-all').addEventListener('click', () => {
    if (displayedContent.length <= 0) return;
    d.pushAudios(displayedContent).catch(console.error);
});

// 新建歌单
document.getElementById('create-folder').addEventListener('click', async () => {
    try {
        const info = await getNewFolderInfo(true);
        if (!info) return;
        delete info.id;

        await d.createFolder(info);
        await renderCustomFolder();
    } catch (err) {
        console.error(err);
    }
});

// 选择歌曲
v.folderContent.addEventListener('click', (event) => {
    const row: HTMLElement = (<HTMLElement>event.target).closest('.row');
    if (!row) return;
    d.setChosenRow(row);
});

// 双击播放
v.folderContent.addEventListener('dblclick', (event) =>
    playChosenRow((<HTMLElement>event.target).closest('.row'))
);

// 清空播放列表
document.getElementById('clear-playing-queue').addEventListener('click', () => d.clearPlayingQueue());

function initIndex(): Promise<void> {
    return renderCustomFolder();
}

export {
    initIndex,
    renderFolderContent,
    renderCustomFolder,
    setDisplayFolder,
    playChosenRow,
    choseFolderToCollect,
    getNewFolderInfo,
    displayedContent,
}