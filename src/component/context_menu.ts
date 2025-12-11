import {QueueController} from "../playing_queue/queue_controller";
import {createAlert, createConfirm} from "../utils/front/alert";
import {QueueStatus} from "../playing_queue/queue_status";
import {IndexController} from "../index/index_controller";
import {IndexRender} from "../index/index_render";
import {collectAudio, deCollectAudio, deleteFolder, modifyFolder} from "../database/db_util";


export class ContextMenu {
    private static readonly indexContextmenu = document.getElementById('index-contextmenu')!;
    private static readonly choseFolderContent = document.getElementById('chose-folder-content')!;

    private static chosenQueueRowId: string | null = null;

    private static chosenElement(target: HTMLElement) {
        const row = target.closest('.row') as HTMLElement;
        if (row) {
            QueueController.setChosenRow(row);
            this.indexContextmenu.querySelector('.menu.for-row')?.classList.add('show');
            return true;
        }

        const queueRow = target.closest('.queue-row');
        if (queueRow) {
            this.chosenQueueRowId = queueRow.getAttribute('play-index');
            this.indexContextmenu.querySelector('.menu.for-queue-row')?.classList.add('show');
            return true;
        }

        const folder = target.closest('.audio-folder') as HTMLElement;
        if (folder) {
            QueueController.setChosenFolder(folder);
            this.indexContextmenu.querySelector('.menu.for-folder')?.classList.add('show');
            return true;
        }
        return false;
    }

    // 右键菜单处理歌单内容音频
    private static async contextmenuHandleRow(action: string): Promise<void> {
        const row = QueueController.chosenRow;
        if (!row) return;

        const index = Number(row.getAttribute('index'));
        if (!Number.isSafeInteger(index)) return;

        switch (action) {
            case 'play': {
                await IndexController.playChosenRow(QueueController.chosenRow);
                createAlert('开始播放', 'success');
                break;
            }
            case 'add-to-queue': {
                if (!IndexRender.displayedContent) break;
                await QueueStatus.pushAudios(IndexRender.displayedContent?.[index]);
                createAlert('已添加至队列', 'success');
                break;
            }
            case 'next-play': {
                if (!IndexRender.displayedContent) break;
                await QueueStatus.insertAudio(QueueStatus.getCurrentIndex() + 1, IndexRender.displayedContent[index]);
                createAlert('将在下一曲播放', 'success');
                break;
            }
            case 'collect': {
                const result = await IndexController.choseFolderToCollect();
                if (result.isErr()) {
                    console.error(result.unwrapErr());
                    return;
                }
                const folder = result.ok().get();
                if (!IndexRender.displayedContent || !folder) break;
                await collectAudio(folder, IndexRender.displayedContent[index]);
                break;
            }
            case 'de-collect': {
                if (QueueController.chosenFolder?.getAttribute('plugin')) return;

                const parent = Number(QueueController.chosenFolder?.getAttribute('folder_id'));
                const id = QueueController.chosenRow?.id;
                if (!isNaN(parent) && id) {
                    await deCollectAudio(parent, id);
                    QueueController.chosenFolder?.click();
                }
            }
        }

        QueueController.setChosenRow(null);
    }

    // 右键菜单处理播放列表音频
    private static async contextmenuHandlerQueueRow(action: string) {
        const index = Number(this.chosenQueueRowId);
        if (isNaN(index)) return;

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
                const result = await IndexController.choseFolderToCollect();
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

        this.chosenQueueRowId = null;
    }

    // 右键菜单处理歌单
    private static async contextmenuHandleFolder(action: string) {
        const id = Number(QueueController.chosenFolder?.getAttribute('folder_id'));
        if (isNaN(id)) return;

        if (action === 'mod-folder') {
            const result = await IndexController.getNewFolderInfo();
            if (result.isErr()) {
                console.error(result.unwrapErr());
                return;
            }

            const folder = result.ok().get();
            if (!folder) return;
            await modifyFolder(folder);
        } else if (action === 'delete-folder') {
            if (!await createConfirm('确定删除歌单吗?')) return;
            await deleteFolder(id);
        }

        QueueController.setChosenFolder(null);
        await IndexRender.renderCustomFolder();
    }

    public static initialize() {
        // 展示右键菜单
        document.addEventListener('contextmenu', event => {
            event.stopPropagation();
            event.preventDefault();

            this.indexContextmenu.querySelector('.menu.show')?.classList.remove('show');

            if (!this.chosenElement(event.target as HTMLElement)) return;

            this.indexContextmenu.style.display = 'block';

            const menuWidth = this.indexContextmenu.offsetWidth;
            const menuHeight = this.indexContextmenu.offsetHeight;

            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let left = event.pageX;
            let top = event.pageY;

            if (left + menuWidth > windowWidth) left = left - menuWidth;
            if (top + menuHeight > windowHeight) top = top - menuHeight;

            this.indexContextmenu.style.left = `${left}px`;
            this.indexContextmenu.style.top = `${top}px`;
        });

        // 右键菜单操作
        this.indexContextmenu.addEventListener('click', event => {
            const action = (event.target as HTMLElement).closest('.item')?.getAttribute('action');
            if (!action) return;
            if (QueueController.chosenRow) {
                this.contextmenuHandleRow(action).catch(console.error);
            } else if (this.chosenQueueRowId) {
                this.contextmenuHandlerQueueRow(action).catch(console.error);
            } else if (QueueController.chosenFolder) {
                this.contextmenuHandleFolder(action).catch(console.error);
            }
        });

        // 隐藏右键菜单
        document.addEventListener('click', event => {
            this.indexContextmenu.style.display = 'none';

            if (!this.choseFolderContent.parentElement?.contains(event.target as HTMLElement)) {
                this.choseFolderContent.parentElement?.classList.remove('show');
            }
        }, true);
    }
}
