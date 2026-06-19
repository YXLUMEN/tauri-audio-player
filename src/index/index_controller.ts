import {IFolderInfo} from "../config/default";
import {Supplier} from "../types/types";
import {randomCover} from "../utils/math/random";
import {QueueController} from "../playing_queue/queue_controller";
import {open} from "@tauri-apps/plugin-dialog";
import {Result} from "../utils/Result";
import {AudioInfo, StandardAudio} from "../types/audio";
import {config, createStatus, throttleTimeOut} from "../utils/util";
import {QueueRender} from "../playing_queue/queue_render";
import {collectAudio, createFolder, getFavorByFolder} from "../database/db_util";
import {dbHelper} from "../database/db_init";
import {QueueStatus} from "../playing_queue/queue_status";
import {createAlert} from "../utils/front/alert";
import {PlayerRender} from "../player/player_render";
import {LyricStatus} from "../lyric/lyric_status";
import {PlayMode} from "../play/play_mode";
import {PlayVolume} from "../play/play_volume";
import {getPlugin} from "../plugins";
import {setShortcut} from "../component/shortcuts.ts";
import {
    createFolderItem,
    getContent,
    isDirty,
    renderCustomFolder,
    setDirty,
    setDisplayFolder,
    showContentTip
} from "./index_render.ts";

interface Configs {
    folderContent: HTMLElement;
    choseFolderContent: HTMLElement;
    indexLeftPanel: HTMLElement;
}

interface Status {
    chosenRow: HTMLElement | null;
    chosenFolder: HTMLElement | null;
    pendingInput: Supplier<void> | null
}

const configs: Configs = config({
    folderContent: document.getElementById('folder-content')!,
    choseFolderContent: document.getElementById('chose-folder-content')!,
    indexLeftPanel: document.getElementById('index-left-panel')!
});

const status: Status = createStatus({
    chosenRow: null,
    chosenFolder: null,
    pendingInput: null,
});

export async function getNewFolderInfo(create: boolean = false): Promise<Result<IFolderInfo | string, string>> {
    if (status.pendingInput) {
        status.pendingInput();
        status.pendingInput = null;
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
        const folderId = status.chosenFolder?.getAttribute('folder_id');
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

    setShortcut(false);
    const editor = document.getElementById('folder-editor')!;
    editor.classList.add('show');
    configs.folderContent.parentElement!.classList.add('hide');

    const abort = new AbortController();
    const {promise, resolve} = Promise.withResolvers<Result<IFolderInfo | string, string>>();

    promise.finally(() => {
        status.pendingInput = null;
        abort.abort();

        configs.folderContent.parentElement!.classList.remove('hide');
        editor.classList.remove('show');
        setShortcut(true);
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
            resolve(Result.ok('Canceled'));
        }
    }, {signal: abort.signal});

    status.pendingInput = () => resolve(Result.err('Interrupted'));
    return promise;
}

export async function choseFolderToCollect(): Promise<Result<number, string>> {
    const result = await dbHelper.getAll<IFolderInfo>('folder');
    if (result.isErr()) return Result.err(`Cannot find folder: ${result.unwrapErr()}`);

    const optional = result.ok();
    if (optional.isEmpty()) return Result.err('Cannot find folder');

    const playList = optional.get();
    if (playList.length === 0) return Result.err('Cannot find folder');

    const content = configs.choseFolderContent;
    const frag = document.createDocumentFragment();
    for (const item of playList) {
        frag.appendChild(createFolderItem(item));
    }

    content.replaceChildren(frag);

    const abort = new AbortController();
    const {promise, resolve} = Promise.withResolvers<Result<number, string>>();

    promise.finally(() => {
        abort.abort();
        content.parentElement!.classList.remove('show');
    });

    content.addEventListener('click', (event) => {
        const attribute = (event.target as HTMLElement).closest('.audio-folder')?.getAttribute('folder_id');
        if (!attribute) return;
        const id = Number(attribute);
        if (isNaN(id)) return;
        resolve(Result.ok(id));
    }, {signal: abort.signal});

    content.parentElement!.classList.add('show');

    return promise;
}

async function selectFolderInner(event: MouseEvent) {
    const folder = (event.target as HTMLElement).closest('.audio-folder') as HTMLElement;
    if (!folder) return;

    configs.indexLeftPanel.querySelector('.audio-folder.current')?.classList.remove('current');
    folder.classList.add('current');

    setChosenFolder(folder);
    setDirty(false);

    let audios: AudioInfo[] | StandardAudio[] | null;
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

    await setDisplayFolder(audios);

    QueueRender.highlightCurrentPlaying();
    if (plugin && !getPlugin(plugin)?.isAll()) {
        showContentTip('显示更多');
    }
}

export const selectFolder = throttleTimeOut(selectFolderInner, 300);

export async function playChosenRow(target: HTMLElement | null) {
    if (!target) return;

    const index = target.getAttribute('index');
    if (!index) return;

    if (!isDirty()) {
        await QueueStatus.setPlayingQueue(getContent());
    }

    setDirty();
    QueueStatus.setAudioIndexUnclamp(-1);

    const num = Number(index);
    if (!Number.isSafeInteger(num)) return;
    await QueueController.switchAudio(num);
}

async function handlerIndexPlayControllerInner(event: MouseEvent) {
    const action = (event.target as HTMLElement).getAttribute('action');
    if (!action) {
        PlayerRender.togglePlayer();
        return;
    }

    if (action === 'collect') {
        const result = await choseFolderToCollect();
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

    applyPlayAction(action);
}

export const handleIndexPlayController = throttleTimeOut(handlerIndexPlayControllerInner, 200);

export function applyPlayAction(action: string) {
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

export function setChosenRow(row: HTMLElement | null): void {
    configs.folderContent.querySelector('.row.chosen')?.classList.remove('chosen');
    row?.classList.add('chosen');
    status.chosenRow = row;
}

export function getChosenRow() {
    return status.chosenRow;
}

export function setChosenFolder(folder: HTMLElement | null): void {
    status.chosenFolder = folder;
}

export function getChosenFolder() {
    return status.chosenFolder;
}

async function onCreateFolder() {
    const result = await getNewFolderInfo(true);
    if (result.isErr()) {
        console.error(result.unwrapErr());
        return;
    }

    const info = result.ok().get();
    if (typeof info === 'string') return;

    await createFolder(info);
    await renderCustomFolder();
}

async function onClearPlayingList(event: PointerEvent) {
    const action = (event.target as HTMLElement)?.getAttribute('action');

    if (action === 'collect-all') {
        const result = await choseFolderToCollect();
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
}

export function initialize() {
    const ctrl = new AbortController();

    configs.indexLeftPanel.addEventListener('click', event => {
        const folder = (event.target as HTMLElement).closest('.audio-folder');
        if (!folder) return;

        ctrl.abort();
        document.getElementById('custom-folder-detail')!.classList.remove('hide');
        selectFolder(event);

        configs.indexLeftPanel.addEventListener('click', selectFolder);
    }, {signal: ctrl.signal});

    document.getElementById('index-audio-control')!.addEventListener('click', handleIndexPlayController);

    // 将歌单推入播放列表
    document.getElementById('add-all')!.addEventListener('click', () => {
        const content = getContent();

        if (content && content.length <= 0) return;
        void QueueStatus.pushAudios(content);
    });

    // 新建歌单
    document.getElementById('create-folder')!.addEventListener('click', onCreateFolder);

    // 选择歌曲
    configs.folderContent.addEventListener('click', (event) => {
        const row = (event.target as HTMLElement)?.closest('.row') as HTMLElement;
        if (!row) return;
        setChosenRow(row);
    });

    // 双击播放
    configs.folderContent.addEventListener('dblclick', (event) => {
        const row = (event.target as HTMLElement)?.closest('.row') as HTMLElement | null;
        return row !== null ? playChosenRow(row) : null;
    });

    // 清空播放列表
    document.getElementById('playing-board-title')!.addEventListener('click', onClearPlayingList);
}
