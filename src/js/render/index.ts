import * as v from "./env";
import * as d from "./data";
import createAlert, {appendChildren} from "./tools/base_page";
import {applyPlayerAction, enableShortcut, reMapKeys, togglePlayer} from "./player";
import {VSM} from "./plugins/vsm";
import {defaultFolder, defaultShortcuts, IFolderInfo} from "./default";
import {throttleTimeOut} from "./tools/base_utilities";
import {open} from '@tauri-apps/plugin-dialog';
import {IAudioInfo, IStandardAudio} from "../type/audio";


let displayedContent: IAudioInfo[] = [];
let wasMerge: boolean = false;

let chosenQueueRowId: string = null;

// 创建歌单元素
function createFolderItem(folder: IFolderInfo) {
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
function createFolderContentItem(index: number, standard: IStandardAudio) {
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
        await d.dbHelper.add('folder', defaultFolder);
        v.customFolderList.replaceChildren(createFolderItem(defaultFolder))
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

// 显示歌单信息界面并获取输入的值
async function getNewFolderInfo(create = false): Promise<IFolderInfo> {
    const name = <HTMLInputElement>document.getElementById('modify-folder-name');
    const desc = <HTMLInputElement>document.getElementById('modify-folder-desc');
    const cover = <HTMLInputElement>document.getElementById('modify-folder-cover');
    const buttonsContainer = document.getElementById('folder-modify-buttons');

    if (!name || !desc || !cover || !buttonsContainer) {
        console.error('Cannot find DOMElements!');
        return;
    }

    let originId: number;
    if (!create) {
        if (!d.chosenFolder) return;
        const folder: IFolderInfo = await d.dbHelper.get('folder', Number(d.chosenFolder.getAttribute('_id')));
        if (!folder) return;
        originId = folder.id;
        name.value = folder.name;
        desc.value = folder.desc;
        cover.src = folder.cover;
    } else {
        name.value = '';
        desc.value = '';
        cover.src = `/img/audio/webp/audio-${Math.round(Math.random() * 30)}.webp`;
    }

    enableShortcut(false);
    v.folderContent.parentElement.classList.add('hide');
    v.modifyFolder.classList.add('show');

    const abort = new AbortController();
    const {promise, resolve} = Promise.withResolvers();

    cover.addEventListener('click', async () => {
        const result = await open({
            title: '选择图片',
            directory: false,
            multiple: false,
            filters: [{name: 'Images', extensions: ['png', 'jpg', 'webp', 'ico']}]
        }).catch(console.error);

        if (result) cover.src = result[0];
    }, {signal: abort.signal});

    buttonsContainer.addEventListener('click', async (event) => {
        const action = (<HTMLElement>event.target).closest('.base-button')?.getAttribute('action');
        if (!action) return;

        if (action === 'submit' && name.value.trim() !== '') {
            const result = {name: name.value, desc: desc.value, cover: cover.src};
            if (create) {
                resolve(result);
                return;
            }

            // @ts-ignore
            result.id = originId
            resolve(result);
        }
    }, {signal: abort.signal});

    try {
        // @ts-ignore
        return await promise;
    } finally {
        abort.abort();
        v.folderContent.parentElement.classList.remove('hide');
        v.modifyFolder.classList.remove('show');
        enableShortcut(true);
    }
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
        // @ts-ignore
        return await promise;
    } finally {
        abort.abort();
        v.choseFolderContent.parentElement.classList.remove('show');
    }
}

// 右键菜单处理音乐元素
async function contextmenuHandleRow(action: string) {
    const index = Number(d.chosenRow.getAttribute('index'));
    if (isNaN(index)) return;

    switch (action) {
        case 'play':
            await playChosenRow(d.chosenRow);
            createAlert('开始播放', 'success');
            break;
        case 'add-to-queue':
            await d.pushAudios(displayedContent[index]);
            createAlert('已添加至队列', 'success');
            break;
        case 'next-play':
            await d.insertAudio(d.getAudioIndex() + 1, displayedContent[index]);
            createAlert('将在下一曲播放', 'success');
            break;
        case 'collect':
            await d.collectAudio(await choseFolderToCollect(), displayedContent[index]);
            break;
        case 'de-collect':
            if (d.chosenFolder?.getAttribute('plugin')) return;
            const parent: number = Number(d.chosenFolder.getAttribute('_id'));
            const id: string = d.chosenRow.id;
            if (!isNaN(parent) && id) {
                await d.deCollectAudio(parent, id);
                d.chosenFolder.click();
            }
    }

    d.setChosenRow(null);
}

async function contextmenuHandlerQueueRow(action: string) {
    const index = Number(chosenQueueRowId);
    if (isNaN(index)) return;

    switch (action) {
        case 'play':
            await d.switchAudio(index);
            createAlert('开始播放', 'success');
            break;
        case 'next-play':
            await d.moveAudio(index, d.getAudioIndex() + 1);
            createAlert('将在下一曲播放', 'success');
            break;
        case 'de-play':
            await d.removeAudio(index);
            break;
        case 'collect':
            await d.collectAudio(await choseFolderToCollect(), d.getPlayingQueue()[index]);
            break;
    }

    chosenQueueRowId = null;
}

// 右键菜单处理歌单元素
async function contextmenuHandleFolder(action: string) {
    const id = Number(d.chosenFolder.getAttribute('_id'));
    if (isNaN(id)) return;

    if (action === 'mod-folder') {
        const folder = await getNewFolderInfo();
        if (!folder) return;
        await d.modifyFolder(folder);
    } else if (action === 'delete-folder') {
        if (v.customFolderList.classList.length <= 1) {
            createAlert('您无法删除最后一个歌单', 'info');
            return;
        }
        await d.deleteFolder(id);
    }

    await renderCustomFolder();
    d.setChosenFolder(null);
}

// 选择歌单
const selectFolder = throttleTimeOut(async (event: Event) => {
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

    v.folderInfoCover.src = folder.getElementsByTagName('img')?.[0].src || '../asset/img/audio/webp/audio-11.webp';
    v.folderInfoTitle.textContent = folder.getElementsByTagName('span')?.[0]?.textContent || '歌单';

    await setDisplayFolder(audios);
}, 300);

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

// 展示播放器或处理操作按钮
const handleIndexPlayController = throttleTimeOut(async (event: Event) => {
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

// 设置快捷键
const setShortcut = throttleTimeOut((event: Event) => {
    const target = (<HTMLElement>event.target).closest('.key');
    if (!target) return;

    enableShortcut(false);
    target.classList.add('modifying');

    document.addEventListener('keydown', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        const action = target.getAttribute('action');
        if (!action) return;

        const code = event.code;
        if (defaultShortcuts.some(value => value.code === code)) {
            createAlert('按键重复', 'warning');
        } else {
            await d.dbHelper.update('shortcuts', {action, code});
            await reMapKeys();
            target.textContent = event.key.toUpperCase();
        }

        target.classList.remove('modifying');
        enableShortcut(true);
    }, {once: true});
}, 2000);

// 清理缓存
const clearCache = throttleTimeOut(async (event: Event) => {
    const action = (<HTMLElement>event.target).closest('input')?.getAttribute('action');
    if (!action) return;

    switch (action) {
        case 'clean-cover':
            await d.clearPluginsCache();
            createAlert('已清理封面缓存', 'success');
            break;
        case 'clean-history':
            localStorage.removeItem('playing');
            await d.clearPlayingQueueHistory();
            createAlert('已清除播放历史', 'success');
            break;
        case 'clean-vsm':
            VSM.vsmCache.length = 0;
            const plugin = d.getPlugin('vsm');
            if (plugin instanceof VSM) {
                plugin.seq = 0;
                createAlert('已清除VSM缓存', 'success');
            }

            break;
    }
}, 500);

// 预加载避免闪烁, 同时作为音频切换触发
v.preLoadCover.addEventListener('load', () => {
    v.playerBackground.style.backgroundImage = `url(${v.preLoadCover.src})`;
    (<HTMLImageElement>v.indexAudioCover.firstElementChild).src = v.preLoadCover.src;
});

v.audioEle.addEventListener('play', () =>
    document.getElementById('index-audio-control').classList.remove('hide'), {once: true});

v.indexLeftPanel.addEventListener('click', selectFolder);

// 将歌单推入播放列表
document.getElementById('add-all').addEventListener('click', () => {
    if (displayedContent.length <= 0) return;
    d.pushAudios(displayedContent).catch(console.error);
});

// 新建歌单
document.getElementById('create-folder').addEventListener('click', async () => {
    const info = await getNewFolderInfo(true);
    if (!info) return;
    await d.createFolder(info);
    await renderCustomFolder();
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

// 提交搜索
document.getElementById('search-submit').addEventListener('click', searchAudios);

// 清空播放列表
document.getElementById('clear-playing-queue').addEventListener('click', () => d.clearPlayingQueue());

// 展示播放器或处理操作按钮
document.getElementById('index-audio-control').addEventListener('click', handleIndexPlayController);

const chosenElement = (target: HTMLElement) => {
    const row: HTMLElement = target.closest('.row');
    if (row) {
        d.setChosenRow(row);
        v.indexContextmenu.querySelector('.menu.for-row').classList.add('show');
        return true;
    }

    const queueRow = target.closest('.queue-row');
    if (queueRow) {
        chosenQueueRowId = queueRow.getAttribute('play-index');
        v.indexContextmenu.querySelector('.menu.for-queue-row').classList.add('show');
        return true;
    }

    const folder: HTMLElement = target.closest('.audio-folder');
    if (folder) {
        d.setChosenFolder(folder);
        v.indexContextmenu.querySelector('.menu.for-folder').classList.add('show');
        return true;
    }
    return false;
}

// 展示右键菜单
document.addEventListener('contextmenu', (event) => {
    event.stopPropagation();
    event.preventDefault();

    v.indexContextmenu.querySelector('.menu.show')?.classList.remove('show');

    if (!chosenElement(<HTMLElement>event.target)) return;

    v.indexContextmenu.style.display = 'block';

    const menuWidth = v.indexContextmenu.offsetWidth;
    const menuHeight = v.indexContextmenu.offsetHeight;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = event.pageX;
    let top = event.pageY;

    if (left + menuWidth > windowWidth) left = left - menuWidth;
    if (top + menuHeight > windowHeight) top = top - menuHeight;

    v.indexContextmenu.style.left = `${left}px`;
    v.indexContextmenu.style.top = `${top}px`;
});

// 右键菜单操作
v.indexContextmenu.addEventListener('click', (event) => {
    const action = (<HTMLElement>event.target).closest('.item')?.getAttribute('action');
    if (!action) return;
    if (d.chosenRow) contextmenuHandleRow(action).catch(console.error);
    else if (chosenQueueRowId) contextmenuHandlerQueueRow(action).catch(console.error);
    else if (d.chosenFolder) contextmenuHandleFolder(action).catch(console.error);
});

// 隐藏右键菜单
document.addEventListener('click', (event) => {
    v.indexContextmenu.style.display = 'none';

    if (!v.choseFolderContent.parentElement.contains(<HTMLElement>event.target)) {
        v.choseFolderContent.parentElement.classList.remove('show');
    }
}, true);

// 设置快捷键
document.getElementById('shortcuts-settings').addEventListener('click', setShortcut);

// 重置快捷键
document.getElementById('shortcuts-settings').addEventListener('auxclick', async (event) => {
    const target = (<HTMLElement>event.target).closest('.key');
    if (!target) return;
    const action = target.getAttribute('action');
    if (!action) return;
    const defaultKey = defaultShortcuts.find(item => item.action === action);
    if (!defaultKey) return;

    target.textContent = defaultKey.code.replace('Key', '');
    await d.dbHelper.delete('shortcuts', action);
    await reMapKeys();
});

// 清理缓存
document.getElementById('clean-cache').addEventListener('click', clearCache);

export {
    displayedContent,
    renderFolderContent,
    renderCustomFolder,
    setDisplayFolder
}