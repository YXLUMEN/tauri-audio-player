import type {AudioInfo, StandardAudio} from "../types/audio";
import {defaultFolder, IFolderInfo} from "../config/default";
import {dbHelper} from "../database/db_init";
import {appendChildren} from "../utils/front/element";
import {randomCover} from "../utils/math/random";
import {config, createStatus, isEmpty} from "../utils/util";
import {createAlert} from "../utils/front/alert";
import {QueueStatus} from "../playing_queue/queue_status";
import {ART, getPlugin} from "../plugins";
import {DragDropCallbacks, DragDropManager} from "../utils/DragDropManager";
import {updateFavorOrder} from "../database/db_util";
import {getChosenFolder} from "./index_controller.ts";

interface Configs {
    customFolderList: HTMLElement;
    folderContent: HTMLElement;
    indexAudioControl: HTMLElement;
}

interface Status {
    displayedContent: AudioInfo[] | null;
    wasMerge: boolean;
    dragDropManager: DragDropManager | null
}

const configs: Configs = config({
    customFolderList: document.getElementById('custom-folder-list')!,
    folderContent: document.getElementById('folder-content')!,
    indexAudioControl: document.getElementById('index-audio-control')!
});

const status: Status = createStatus({
    displayedContent: null,
    wasMerge: false,
    dragDropManager: null,
});

export function createFolderItem(folder: IFolderInfo): HTMLDivElement {
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

function createFolderContentItem(index: number, standard: StandardAudio): HTMLDivElement {
    const row = document.createElement('div');
    row.id = standard.id;

    row.setAttribute('index', index.toString());
    row.classList.add('row');

    const play = document.createElement('div');
    play.classList.add('play-icon');

    play.textContent = index.toString();

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

export async function renderCustomFolder(): Promise<void> {
    const result = await dbHelper.getAll<IFolderInfo>('folder');
    if (result.isErr()) {
        console.error(result.unwrapErr());
        createAlert('渲染歌单出错');
        return;
    }

    const playList = result.ok().get();
    if (playList.length === 0) {
        configs.customFolderList.replaceChildren(createFolderItem(defaultFolder));
        await dbHelper.add('folder', defaultFolder);
        return;
    }

    const frag = document.createDocumentFragment();
    for (const item of playList) {
        frag.appendChild(createFolderItem(item));
    }

    configs.customFolderList.replaceChildren(frag);
    getChosenFolder()?.classList.add('current');
}

export async function renderFolderContent(queue: AudioInfo[] | null, start = 0) {
    if (isEmpty(queue)) {
        configs.folderContent.textContent = '';
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

    configs.folderContent.replaceChildren(frag);
}

export function showContentTip(text: string): void {
    const div = document.createElement("div");
    div.classList.add('load-more');
    const span = document.createElement("span");
    span.classList.add('less');
    span.textContent = text;
    div.append(span);

    configs.folderContent.append(div);
    div.onclick = () => ART.artAdd();
}

export async function setDisplayFolder(array: AudioInfo[] | null, reRender: boolean = true) {
    status.displayedContent = array;
    if (!reRender) return;

    await renderFolderContent(status.displayedContent);
}

function initializeDragDrop(): void {
    status.dragDropManager?.destroy();

    const callback: DragDropCallbacks = {
        onDragStart: (): boolean => {
            // 只有本地歌单（非远程插件歌单）才允许拖拽
            const chosenFolder = getChosenFolder();
            if (!chosenFolder) return false;

            // 检查是否是远程插件歌单
            const plugin = chosenFolder.getAttribute('plugin');
            if (plugin) return false;


            return !!chosenFolder.getAttribute('folder_id');
        },
        onDragEnd: async (fromIndex: number, toIndex: number): Promise<void> => {
            if (!status.displayedContent || status.displayedContent.length === 0) return;

            // 更新内存中的数据顺序
            const audio = status.displayedContent.splice(fromIndex, 1)[0];
            status.displayedContent.splice(toIndex, 0, audio);

            // 重新渲染以更新索引
            await renderFolderContent(status.displayedContent);

            // 更新数据库中的顺序
            const chosenFolder = getChosenFolder();
            if (!chosenFolder) return;

            const folderId = Number(chosenFolder.getAttribute('folder_id'));
            if (isNaN(folderId)) return;

            const result = await updateFavorOrder(folderId, status.displayedContent);
            result.mapErr(error => {
                console.error('更新收藏顺序失败:', error);
                createAlert('更新顺序失败', 'error');
            });
        }
    };

    status.dragDropManager = new DragDropManager(configs.folderContent, '.row', callback);
    status.dragDropManager.initialize();
}

export function destroyDragDrop(): void {
    status.dragDropManager?.destroy();
    status.dragDropManager = null;
}

export function initialize() {
    QueueStatus.getPlayer().addEventListener('play', () =>
        configs.indexAudioControl.classList.remove('hide'), {once: true});
    initializeDragDrop();
}

export function setDirty(bl = true) {
    status.wasMerge = bl;
}

export function isDirty() {
    return status.wasMerge;
}

export function getContent() {
    return status.displayedContent;
}