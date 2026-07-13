import {ActionType} from "./ActionType.ts";
import {appEvent} from "../../event/EventBus.ts";
import {SwitchAudio} from "../../event/SwitchAudio.ts";
import {QueueSystem} from "../../system/QueueSystem.ts";
import {createAlert, createConfirm} from "../../util/alert.ts";
import {collectAudio, deCollectAudio, deleteFolder, modifyFolder} from "../../database/db_util.ts";
import {CustomFolderChange} from "../../event/CustomFolderChange.ts";
import {DetailSystem} from "../../system/DetailSystem.ts";
import {FolderSystem} from "../../system/FolderSystem.ts";
import {DetailAppend} from "../../event/detail/DetailAppend.ts";
import {DetailRemove} from "../../event/detail/DetailRemove.ts";

export class MenuActionDispatcher {
    public async dispatch(action: string, type: ActionType, element: Element) {
        switch (type) {
            case ActionType.Row:
                await this.handleRow(action, element);
                break;
            case ActionType.QueueRow:
                await this.handlerQueueRow(action, element);
                break;
            case ActionType.Folder:
                await this.handleFolder(action, element);
                break;
        }
    }

    private async handleRow(action: string, element: Element): Promise<void> {
        const index = Number(element.getAttribute('data-index'));
        if (!Number.isSafeInteger(index)) return;

        switch (action) {
            case 'play': {
                element.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
                break;
            }
            case 'add-to-queue': {
                const info = DetailSystem.ACCESSOR.displayed()[index];
                if (!info) return;

                QueueSystem.QUEUE.add(info);
                createAlert('已添加至队列', 'success');
                break;
            }
            case 'next-play': {
                const info = DetailSystem.ACCESSOR.displayed()[index];
                if (!info) return;

                QueueSystem.QUEUE.insert(QueueSystem.QUEUE.index() + 1, info);
                createAlert('将在下一曲播放', 'success');
                break;
            }
            case 'collect': {
                const folder = await FolderSystem.POPUP.select();
                const info = DetailSystem.ACCESSOR.displayed()[index];

                if (!folder || !info) break;
                const inner = await collectAudio(folder, info);
                if (!inner) return;

                if (FolderSystem.ACCESSOR.isId(folder)) {
                    appEvent.emit(new DetailAppend(inner));
                }
                break;
            }
            case 'de-collect': {
                const folder = FolderSystem.ACCESSOR.getChosen();
                if (folder?.getAttribute('plugin')) return;

                const folderId = folder?.getAttribute('data-folder-id');
                if (!folder) {
                    createAlert('不是合法的文件夹', 'warning');
                    return;
                }

                const parent = Number(folderId);
                const id = element.getAttribute('data-uid');
                if (Number.isSafeInteger(parent) && id) {
                    await deCollectAudio(parent, id);
                    appEvent.emit(new DetailRemove(index, id));
                }
            }
        }
    }

    private async handlerQueueRow(action: string, element: Element) {
        const indexStr = element.getAttribute('data-index');
        const index = Number(indexStr);
        if (!Number.isSafeInteger(index)) return;

        switch (action) {
            case 'play':
                appEvent.emit(new SwitchAudio(index));
                break;
            case 'next-play':
                QueueSystem.QUEUE.move(index, QueueSystem.QUEUE.index());
                break;
            case 'de-play':
                QueueSystem.QUEUE.remove(index);
                break;
            case 'collect': {
                const folder = await FolderSystem.POPUP.select();
                if (!folder) return;

                const info = QueueSystem.QUEUE.at(index);
                if (!info) {
                    createAlert('无效的选项', 'warning');
                    return;
                }

                const inner = await collectAudio(folder, info);
                if (!inner) return;

                if (FolderSystem.ACCESSOR.isId(folder)) {
                    appEvent.emit(new DetailAppend(inner));
                }
            }
        }
    }

    private async handleFolder(action: string, element: Element) {
        const str = element.getAttribute('data-folder-id');
        const id = Number(str);
        if (!Number.isSafeInteger(id)) return;

        if (action === 'mod-folder') {
            const folder = await FolderSystem.INPUT.inputFolderInfos(id);
            if (!folder) return;
            await modifyFolder(folder);
        } else if (action === 'delete-folder') {
            if (!await createConfirm('确定删除歌单吗?')) return;
            await deleteFolder(id);
        }

        appEvent.emit(new CustomFolderChange());
    }
}