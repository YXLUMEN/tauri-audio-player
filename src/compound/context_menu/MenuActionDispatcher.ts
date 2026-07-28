import {ActionType} from "./ActionType.ts";
import {appEvent} from "../../event/EventBus.ts";
import {SwitchAudio} from "../../event/queue/SwitchAudio.ts";
import {createAlert, createConfirm} from "../../util/alert.ts";
import {collectAudio, deCollectAudio, deleteFolder, modifyFolder} from "../../database/db_util.ts";
import {CustomFolderChange} from "../../event/CustomFolderChange.ts";
import {DetailAppend} from "../../event/detail/DetailAppend.ts";
import {DetailRemove} from "../../event/detail/DetailRemove.ts";
import {AlertCategories} from "../../types/AlertCategories.ts";
import {QueueCompound} from "../queue/QueueCompound.ts";
import {DetailAccessor} from "../detail/DetailAccessor.ts";
import {FolderChosenPopup} from "../folder/FolderChosenPopup.ts";
import {FolderAccessor} from "../folder/FolderAccessor.ts";
import {FolderInput} from "../folder/FolderInput.ts";

export class MenuActionDispatcher {
    private readonly queue: QueueCompound;
    private readonly detail: DetailAccessor;
    private readonly folder: FolderAccessor;
    private readonly popup: FolderChosenPopup;
    private readonly input: FolderInput;

    public constructor(
        queue: QueueCompound,
        detail: DetailAccessor,
        popup: FolderChosenPopup,
        folder: FolderAccessor,
        input: FolderInput
    ) {
        this.queue = queue;
        this.detail = detail;
        this.popup = popup;
        this.folder = folder;
        this.input = input;
    }

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
                const info = this.detail.displayed()[index];
                if (!info) return;

                this.queue.add(info);
                createAlert('已添加至队列', AlertCategories.SUCCESS);
                break;
            }
            case 'next-play': {
                const info = this.detail.displayed()[index];
                if (!info) return;

                this.queue.insert(this.queue.index() + 1, info);
                createAlert('将在下一曲播放', AlertCategories.SUCCESS);
                break;
            }
            case 'collect': {
                const folder = await this.popup.select();
                const info = this.detail.displayed()[index];

                if (!folder || !info) break;
                const inner = await collectAudio(folder, info);
                if (!inner) return;

                if (this.folder.isId(folder)) {
                    appEvent.emit(new DetailAppend(inner));
                }
                break;
            }
            case 'de-collect': {
                const folder = this.folder.getChosen();
                if (folder?.getAttribute('plugin')) return;

                const folderId = folder?.getAttribute('data-folder-id');
                if (!folder) {
                    createAlert('不是合法的文件夹', AlertCategories.WARN);
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
                this.queue.move(index, this.queue.index());
                break;
            case 'de-play':
                this.queue.remove(index);
                break;
            case 'collect': {
                const folder = await this.popup.select();
                if (!folder) return;

                const info = this.queue.at(index);
                if (!info) {
                    createAlert('无效的选项', AlertCategories.WARN);
                    return;
                }

                const inner = await collectAudio(folder, info);
                if (!inner) return;

                if (this.folder.isId(folder)) {
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
            const folder = await this.input.inputFolderInfos(id);
            if (!folder) return;
            await modifyFolder(folder);
        } else if (action === 'delete-folder') {
            if (!await createConfirm('确定删除歌单吗?')) return;
            await deleteFolder(id);
        }

        appEvent.emit(new CustomFolderChange());
    }
}