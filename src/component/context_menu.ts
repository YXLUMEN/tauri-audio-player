import {QueueController} from "../playing_queue/queue_controller";
import {createAlert, createConfirm} from "../utils/front/alert";
import {QueueStatus} from "../playing_queue/queue_status";
import {collectAudio, deCollectAudio, deleteFolder, modifyFolder} from "../database/db_util";
import {config, createStatus} from "../utils/util.ts";
import {
    choseFolderToCollect,
    getChosenFolder,
    getChosenRow,
    getNewFolderInfo,
    playChosenRow,
    setChosenFolder,
    setChosenRow
} from "../index/index_controller.ts";
import {getContent, renderCustomFolder} from "../index/index_render.ts";

interface Config {
    indexContextmenu: HTMLElement;
    choseFolderContent: HTMLElement;
}

interface Status {
    chosenQueueRowId: number | null;
}

const configs: Config = config({
    indexContextmenu: document.getElementById('index-contextmenu')!,
    choseFolderContent: document.getElementById('chose-folder-content')!
});

const status: Status = createStatus({
    chosenQueueRowId: null
});

function chosenElement(target: HTMLElement) {
    const row = target.closest('.row') as HTMLElement;
    if (row) {
        setChosenRow(row);
        configs.indexContextmenu.querySelector('.menu.for-row')?.classList.add('show');
        return true;
    }

    const queueRow = target.closest('.queue-row');
    if (queueRow) {
        const indexString = queueRow.getAttribute('play-index');
        const index = indexString === null ? null : Number(indexString);

        status.chosenQueueRowId = Number.isSafeInteger(index) ? index : null;
        configs.indexContextmenu.querySelector('.menu.for-queue-row')?.classList.add('show');
        return true;
    }

    const folder = target.closest('.audio-folder') as HTMLElement;
    if (folder) {
        setChosenFolder(folder);
        configs.indexContextmenu.querySelector('.menu.for-folder')?.classList.add('show');
        return true;
    }
    return false;
}

async function contextmenuHandleRow(action: string): Promise<void> {
    const row = getChosenRow();
    if (!row) return;

    const index = Number(row.getAttribute('index'));
    if (!Number.isSafeInteger(index)) return;

    switch (action) {
        case 'play': {
            await playChosenRow(row);
            createAlert('开始播放', 'success');
            break;
        }
        case 'add-to-queue': {
            const content = getContent();

            if (!content) break;
            await QueueStatus.pushAudios(content[index]);
            createAlert('已添加至队列', 'success');
            break;
        }
        case 'next-play': {
            const content = getContent();

            if (!content) break;
            await QueueStatus.insertAudio(QueueStatus.getCurrentIndex() + 1, content[index]);
            createAlert('将在下一曲播放', 'success');
            break;
        }
        case 'collect': {
            const result = await choseFolderToCollect();

            if (result.isErr()) {
                console.error(result.unwrapErr());
                return;
            }
            const folder = result.ok().get();
            const content = getContent();

            if (!content || !folder) break;
            await collectAudio(folder, content[index]);
            break;
        }
        case 'de-collect': {
            const folder = getChosenFolder();
            if (folder?.getAttribute('plugin')) return;

            const parent = Number(folder?.getAttribute('folder_id'));
            const id = row?.id;
            if (!isNaN(parent) && id) {
                await deCollectAudio(parent, id);
                folder?.click();
            }
        }
    }

    setChosenRow(null);
}

async function contextmenuHandlerQueueRow(action: string) {
    const index = Number(status.chosenQueueRowId);
    if (!Number.isSafeInteger(index)) return;

    switch (action) {
        case 'play':
            await QueueController.switchAudio(index);
            createAlert('开始播放', 'success');
            break;
        case 'next-play':
            await QueueStatus.moveAudio(index, QueueStatus.getCurrentIndex() + 1);
            createAlert('将在下一曲播放', 'success');
            break;
        case 'de-play':
            await QueueStatus.removeAudio(index);
            break;
        case 'collect': {
            const result = await choseFolderToCollect();
            if (result.isErr()) {
                console.error(result.unwrapErr());
                return;
            }

            const folder = result.ok().get();
            if (!folder) break;
            await collectAudio(folder, QueueStatus.getPlayingQueue()[index]);
            break;
        }
    }

    status.chosenQueueRowId = null;
}

async function contextmenuHandleFolder(action: string) {
    const id = Number(getChosenFolder()?.getAttribute('folder_id'));
    if (!Number.isSafeInteger(id)) return;

    if (action === 'mod-folder') {
        const result = await getNewFolderInfo();
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return;
        }

        const folder = result.ok().get();
        if (typeof folder === 'string') return;
        await modifyFolder(folder);
    } else if (action === 'delete-folder') {
        if (!await createConfirm('确定删除歌单吗?')) return;
        await deleteFolder(id);
    }

    setChosenFolder(null);
    await renderCustomFolder();
}

export function initialize() {
    // 展示右键菜单
    document.addEventListener('contextmenu', event => {
        event.stopPropagation();
        event.preventDefault();

        const menu = configs.indexContextmenu;
        menu.querySelector('.menu.show')?.classList.remove('show');

        if (!chosenElement(event.target as HTMLElement)) return;

        menu.style.display = 'block';

        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let left = event.pageX;
        let top = event.pageY;

        if (left + menuWidth > windowWidth) left = left - menuWidth;
        if (top + menuHeight > windowHeight) top = top - menuHeight;

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    });

    // 右键菜单操作
    configs.indexContextmenu.addEventListener('click', event => {
        const action = (event.target as HTMLElement).closest('.item')?.getAttribute('action');
        if (!action) return;

        if (getChosenRow()) {
            contextmenuHandleRow(action).catch(console.error);
            return;
        }
        if (status.chosenQueueRowId) {
            contextmenuHandlerQueueRow(action).catch(console.error);
            return;
        }
        if (getChosenFolder()) {
            contextmenuHandleFolder(action).catch(console.error);
        }
    });

    // 隐藏右键菜单
    document.addEventListener('click', event => {
        configs.indexContextmenu.style.display = 'none';

        if (!configs.choseFolderContent.parentElement?.contains(event.target as HTMLElement)) {
            configs.choseFolderContent.parentElement?.classList.remove('show');
        }
    }, true);
}
