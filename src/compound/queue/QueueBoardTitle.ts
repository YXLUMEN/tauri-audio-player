import {BaseCompound} from "../BaseCompound.ts";
import {QueueCompound} from "./QueueCompound.ts";
import {collectBatch} from "../../database/db_util.ts";
import {FolderChosenPopup} from "../folder/FolderChosenPopup.ts";

export class QueueBoardTitle extends BaseCompound {
    private readonly queue: QueueCompound;
    private readonly popup: FolderChosenPopup;

    public constructor(queue: QueueCompound, popup: FolderChosenPopup) {
        super(true);
        this.queue = queue;
        this.popup = popup;
        this.queueControl = this.queueControl.bind(this);
    }

    private queueControl(event: PointerEvent) {
        const action = (event.target as HTMLElement).getAttribute('data-action');
        if (!action) return;

        if (action === 'clear-queue') {
            this.queue.clear();
        } else if (action === 'collect-all') {
            void this.collectAll();
        }
    }

    private async collectAll() {
        const folderId = await this.popup.select();
        if (!folderId) return;

        const queue = this.queue.iter();
        await collectBatch(folderId, queue);
    }

    public mount(target: HTMLElement): Promise<void> {
        target.addEventListener('click', this.queueControl);
        return Promise.resolve();
    }
}