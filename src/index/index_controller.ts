import {IFolderInfo} from "../config/default";
import {Supplier} from "../types/types";
import {randomCover} from "../utils/math/random";
import {QueueController} from "../playing_queue/queue_controller";
import {open} from "@tauri-apps/plugin-dialog";
import {Result} from "../utils/Result";
import {IndexRender} from "./index_render";
import {IAudioInfo, IStandardAudio} from "../types/audio";
import {getPlugin} from "../plugins/plugin_init";
import {throttleTimeOut} from "../utils/util";
import {QueueRender} from "../playing_queue/queue_render";
import {collectAudio, createFolder, getFavorByFolder} from "../database/db_util";
import {dbHelper} from "../database/db_init";
import {QueueStatus} from "../playing_queue/queue_status";
import {createAlert} from "../utils/front/alert";
import {PlayerRender} from "../player/player_render";
import {LyricStatus} from "../lyric/lyric_status";
import {PlayMode} from "../play/play_mode";
import {PlayVolume} from "../play/play_volume";
import {Shortcuts} from "../component/shortcuts";

export class IndexController {
    private static readonly folderContent = document.getElementById('folder-content')!;
    private static readonly choseFolderContent = document.getElementById('chose-folder-content')!;
    private static readonly indexLeftPanel = document.getElementById('index-left-panel')!;

    private static pendingInput: Supplier<void> | null = null;

    public static async getNewFolderInfo(create: boolean = false): Promise<Result<IFolderInfo | null, string>> {
        if (this.pendingInput) {
            this.pendingInput();
            this.pendingInput = null;
        }

        const nameInput = document.getElementById('folder-editor-name') as HTMLInputElement;
        const descInput = document.getElementById('folder-editor-desc') as HTMLInputElement;
        const coverImg = document.getElementById('folder-editor-cover') as HTMLInputElement;
        const confirmButtons = document.getElementById('folder-editor-buttons');

        if (!nameInput || !descInput || !coverImg || !confirmButtons) {
            console.error('Cannot find DOMElements!');
            return Result.err('Cannot find DOMElements!');
        }

        let originId: number;
        if (create) {
            nameInput.value = '';
            descInput.value = '';
            coverImg.src = randomCover();
        } else {
            const folderId = QueueController.chosenFolder?.getAttribute('folder_id');
            if (!folderId) return Result.err('Cannot find folder');

            const id = Number(folderId);
            const result = await dbHelper.get<IFolderInfo>('folder', id);
            if (result.isErr()) return Result.err(`Error while get folder ${id}: ${result.unwrapErr()}`);

            const optional = result.ok();
            if (optional.isEmpty()) return Result.err('Cannot find folder');
            const folder = optional.get();

            originId = folder.id;
            nameInput.value = folder.name;
            descInput.value = folder.desc ?? '';
            coverImg.src = folder.cover ?? randomCover();
        }

        Shortcuts.enableShortcut(false);
        const editor = document.getElementById('folder-editor')!;
        editor.classList.add('show');
        this.folderContent.parentElement!.classList.add('hide');

        const abort = new AbortController();
        const {promise, resolve} = Promise.withResolvers<Result<IFolderInfo | null, string>>();

        promise.finally(() => {
            this.pendingInput = null;
            abort.abort();

            this.folderContent.parentElement!.classList.remove('hide');
            editor.classList.remove('show');
            Shortcuts.enableShortcut(true);
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
                resolve(Result.ok({
                    id: originId,
                    name: nameInput.value,
                    desc: descInput.value,
                    cover: coverImg.src
                }));
            } else if (action === 'cancel') {
                resolve(Result.ok(null));
            }
        }, {signal: abort.signal});

        this.pendingInput = () => resolve(Result.err('Interrupted'));
        return promise;
    }

    public static async choseFolderToCollect(): Promise<Result<number, string>> {
        const result = await dbHelper.getAll<IFolderInfo>('folder');
        if (result.isErr()) return Result.err(`Cannot find folder: ${result.unwrapErr()}`);

        const optional = result.ok();
        if (optional.isEmpty()) return Result.err('Cannot find folder');

        const playList = optional.get();
        if (playList.length === 0) return Result.err('Cannot find folder');

        const frag = document.createDocumentFragment();
        playList.forEach(item => frag.append(IndexRender.createFolderItem(item)));
        this.choseFolderContent.replaceChildren(frag);

        const abort = new AbortController();
        const {promise, resolve} = Promise.withResolvers<Result<number, string>>();

        promise.finally(() => {
            abort.abort();
            this.choseFolderContent.parentElement!.classList.remove('show');
        });

        this.choseFolderContent.addEventListener('click', (event) => {
            const attribute = (event.target as HTMLElement).closest('.audio-folder')?.getAttribute('folder_id');
            if (!attribute) return;
            const id = Number(attribute);
            if (isNaN(id)) return;
            resolve(Result.ok(id));
        }, {signal: abort.signal});

        this.choseFolderContent.parentElement!.classList.add('show');

        return promise;
    }

    public static selectFolder = throttleTimeOut(async (event: MouseEvent) => {
        const folder = (event.target as HTMLElement).closest('.audio-folder') as HTMLElement;
        if (!folder) return;

        this.indexLeftPanel.querySelector('.audio-folder.current')?.classList.remove('current');
        folder.classList.add('current');
        QueueController.setChosenFolder(folder);
        IndexRender.wasMerge = false;

        let audios: IAudioInfo[] | IStandardAudio[] | null;
        const plugin = folder.getAttribute('plugin');

        if (plugin) {
            // 加载远程歌单
            audios = await getPlugin(plugin)?.getAudioList() ?? null;
        } else {
            // 加载用户歌单
            const id = Number(folder.getAttribute('folder_id'));
            if (isNaN(id)) return;

            const result = await getFavorByFolder(id);
            if (result.isErr()) return;
            audios = result.ok().get();
        }

        if (!audios) return;

        const folderTitle = document.getElementById('folder-info-title')!;
        const folderCover = document.getElementById('folder-info-cover') as HTMLImageElement;

        folderCover.src = folder.getElementsByTagName('img')?.[0].src || randomCover();
        folderTitle.textContent = folder.getElementsByTagName('span')?.[0]?.textContent || '歌单';

        await IndexRender.setDisplayFolder(audios);
        QueueRender.highlightCurrentPlaying();
        if (plugin && !getPlugin(plugin)?.isAll()) IndexRender.showContentTip('显示更多');
    }, 300);

    public static async playChosenRow(target: HTMLElement | null) {
        const index = target?.getAttribute('index');
        if (!index) return;
        if (!IndexRender.wasMerge) {
            await QueueStatus.setPlayingQueue(IndexRender.displayedContent);
        }
        IndexRender.wasMerge = true;
        QueueStatus.setAudioIndexUnclamp(-1);

        await QueueController.switchAudio(Number(index));
    }

    public static handleIndexPlayController = throttleTimeOut(async (event: MouseEvent) => {
        const action = (event.target as HTMLElement).getAttribute('action');
        if (!action) {
            PlayerRender.togglePlayer();
            return;
        }

        if (action === 'collect') {
            const result = await this.choseFolderToCollect();
            if (result.isErr()) {
                console.error(result.unwrapErr());
                createAlert('收藏出现错误', 'error');
                return;
            }

            const parent = result.ok().get();
            const info = QueueStatus.getCurrentPlaying();
            if (!parent || !info) return;
            await collectAudio(parent, info);
            return;
        }

        this.applyPlayAction(action);
    }, 200);

    public static applyPlayAction(action: string) {
        switch (action) {
            case 'lyric':
                LyricStatus.lyricDisplayFn();
                break;
            case 'play-mode':
                PlayMode.modeToggle();
                break;
            case 'forward':
                QueueController.switchAudio(PlayMode.getNextAudioIndex(-1)).then();
                break;
            case 'backward':
                QueueController.switchAudio(PlayMode.getNextAudioIndex(1)).then();
                break;
            case 'volume':
                PlayVolume.toggleMuted();
                break;
            case 'show-playing-board':
                PlayerRender.togglePlayingBoard();
                break;
            case 'play-pause':
                QueueController.pauseToggle().then();
                break;
        }
    }

    public static initialize() {
        this.indexLeftPanel.addEventListener('click', event => {
            const folder = (event.target as HTMLElement).closest('.audio-folder');
            if (!folder) return;

            document.getElementById('custom-folder-detail')!.classList.remove('hide');
            this.selectFolder(event);
            this.indexLeftPanel.addEventListener('click', this.selectFolder.bind(this));
        }, {once: true});

        document.getElementById('index-audio-control')!.addEventListener('click', this.handleIndexPlayController.bind(this));

        // 将歌单推入播放列表
        document.getElementById('add-all')!.addEventListener('click', () => {
            if (IndexRender.displayedContent && IndexRender.displayedContent.length <= 0) return;
            QueueStatus.pushAudios(IndexRender.displayedContent).catch(console.error);
        });

        // 新建歌单
        document.getElementById('create-folder')!.addEventListener('click', async () => {
            const result = await this.getNewFolderInfo(true);
            if (result.isErr()) {
                console.error(result.unwrapErr());
                return;
            }

            const info = result.ok().get();
            if (!info) return;

            await createFolder(info);
            await IndexRender.renderCustomFolder();
        });

        // 选择歌曲
        this.folderContent.addEventListener('click', (event) => {
            const row = (event.target as HTMLElement)?.closest('.row') as HTMLElement;
            if (!row) return;
            QueueController.setChosenRow(row);
        });

        // 双击播放
        this.folderContent.addEventListener('dblclick', (event) => {
            const row = (event.target as HTMLElement)?.closest('.row') as HTMLElement;
            if (!row) return;
            return this.playChosenRow(row);
        });

        // 清空播放列表
        document.getElementById('playing-board-title')!.addEventListener('click', async (event) => {
            const action = (event.target as HTMLElement)?.getAttribute('action');
            if (action === 'collect-all') {
                const result = await this.choseFolderToCollect();
                if (result.isErr()) {
                    console.error(result.unwrapErr());
                    return;
                }

                const folderId = result.ok().get();
                if (!folderId) return;
                const queue = QueueStatus.getPlayingQueue();

                for (const audio of queue) {
                    audio.parent = folderId;
                    if (audio.index) delete audio.index;
                    const result = await dbHelper.add('favor', audio);
                    result.mapErr(error => {
                        if (error && error.name === 'ConstraintError') return;
                        console.error(error);
                    });
                }
                createAlert('收藏完成', 'success');
                return;
            }
            if (action === 'clear-queue') {
                return QueueStatus.clearPlayingQueue();
            }
        });
    }
}
