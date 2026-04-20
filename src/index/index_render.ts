import type {AudioInfo, StandardAudio} from "../types/audio";
import {defaultFolder, IFolderInfo} from "../config/default";
import {dbHelper} from "../database/db_init";
import {appendChildren} from "../utils/front/element";
import {randomCover} from "../utils/math/random";
import {isEmpty} from "../utils/util";
import {createAlert} from "../utils/front/alert";
import {QueueStatus} from "../playing_queue/queue_status";
import {IndexController} from "./index_controller";
import {ART, getPlugin} from "../plugins";
import {DragDropManager} from "../utils/DragDropManager";
import {updateFavorOrder} from "../database/db_util";

export class IndexRender {
    private static readonly customFolderList = document.getElementById('custom-folder-list')!;
    private static readonly folderContent = document.getElementById('folder-content')!;
    private static readonly indexAudioControl = document.getElementById('index-audio-control')!

    public static displayedContent: AudioInfo[] | null = [];
    public static wasMerge: boolean = false;

    private static dragDropManager: DragDropManager | null = null;

    public static createFolderItem(folder: IFolderInfo): HTMLDivElement {
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
    private static createFolderContentItem(index: number, standard: StandardAudio): HTMLDivElement {
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

    // 渲染所有歌单
    public static async renderCustomFolder(): Promise<void> {
        const result = await dbHelper.getAll<IFolderInfo>('folder');
        if (result.isErr()) {
            console.error(result.unwrapErr());
            createAlert('渲染歌单出错');
            return;
        }

        const playList = result.ok().get();
        if (playList.length === 0) {
            this.customFolderList.replaceChildren(this.createFolderItem(defaultFolder));
            await dbHelper.add('folder', defaultFolder);
            return;
        }

        const frag = document.createDocumentFragment();
        playList.forEach(item => frag.append(this.createFolderItem(item)));

        this.customFolderList.replaceChildren(frag);
        IndexController.getChosenFolder()?.classList.add('current');
    }

    // 渲染歌单内容
    public static async renderFolderContent(queue: AudioInfo[] | null, start = 0) {
        if (isEmpty(queue)) {
            this.folderContent.textContent = '';
            this.showContentTip('无内容');
            return;
        }

        const frag = document.createDocumentFragment();
        for (let i = start; i < queue.length; i++) {
            const info = queue[i];
            const standard = await getPlugin(info.plugin)?.parse(info);
            if (!standard) continue;
            frag.append(this.createFolderContentItem(i, standard));
        }

        this.folderContent.replaceChildren(frag);
    }

    public static showContentTip(text: string): void {
        const div = document.createElement("div");
        div.classList.add('load-more');
        const span = document.createElement("span");
        span.classList.add('less');
        span.textContent = text;
        div.append(span);

        this.folderContent.append(div);
        div.onclick = () => ART.artAdd();
    }

    public static async setDisplayFolder(array: AudioInfo[] | null, reRender: boolean = true) {
        this.displayedContent = array;
        if (!reRender) return;
        await this.renderFolderContent(this.displayedContent);
    }

    private static initializeDragDrop(): void {
        if (this.dragDropManager) {
            this.dragDropManager.destroy();
        }

        this.dragDropManager = new DragDropManager(
            this.folderContent,
            '.row',
            {
                onDragStart: (): boolean => {
                    // 只有本地歌单（非远程插件歌单）才允许拖拽
                    const chosenFolder = IndexController.getChosenFolder();
                    if (!chosenFolder) return false;

                    // 检查是否是远程插件歌单
                    const plugin = chosenFolder.getAttribute('plugin');
                    if (plugin) return false;


                    return !!chosenFolder.getAttribute('folder_id');
                },
                onDragEnd: async (fromIndex: number, toIndex: number): Promise<void> => {
                    if (!this.displayedContent || this.displayedContent.length === 0) return;

                    // 更新内存中的数据顺序
                    const audio = this.displayedContent.splice(fromIndex, 1)[0];
                    this.displayedContent.splice(toIndex, 0, audio);

                    // 重新渲染以更新索引
                    await this.renderFolderContent(this.displayedContent);

                    // 更新数据库中的顺序
                    const chosenFolder = IndexController.getChosenFolder();
                    if (!chosenFolder) return;

                    const folderId = Number(chosenFolder.getAttribute('folder_id'));
                    if (isNaN(folderId)) return;

                    const result = await updateFavorOrder(folderId, this.displayedContent);
                    result.mapErr(error => {
                        console.error('更新收藏顺序失败:', error);
                        createAlert('更新顺序失败', 'error');
                    });
                }
            }
        );

        this.dragDropManager.initialize();
    }

    public static destroyDragDrop(): void {
        if (this.dragDropManager) {
            this.dragDropManager.destroy();
            this.dragDropManager = null;
        }
    }

    public static initialize() {
        QueueStatus.getPlayer().addEventListener('play', () =>
            this.indexAudioControl.classList.remove('hide'), {once: true});
        this.initializeDragDrop();
    }
}