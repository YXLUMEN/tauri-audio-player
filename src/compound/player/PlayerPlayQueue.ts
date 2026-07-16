import {BaseCompound} from "../BaseCompound.ts";
import {SwitchAudio} from "../../event/queue/SwitchAudio.ts";
import {DragDropManager} from "../../util/DragDropManager.ts";
import {QueueCompound} from "../queue/QueueCompound.ts";
import {appEvent} from "../../event/EventBus.ts";

export class PlayerPlayQueue extends BaseCompound {
    private readonly queue: QueueCompound;

    public constructor(queue: QueueCompound) {
        super(true);
        this.queue = queue;
    }

    public mount(target: HTMLElement): Promise<void> {
        target.addEventListener('click', event => {
            const target = (event.target as HTMLElement).closest('.queue-row');
            if (!target) return;

            const index = Number(target.getAttribute('data-index'));
            if (Number.isSafeInteger(index)) {
                appEvent.emit(new SwitchAudio(index));
            }
        });

        const dropManager = new DragDropManager(
            target,
            '.queue-row',
            {
                onDragEnd: (fromIndex: number, toIndex: number, item: HTMLElement) => {
                    this.queue.move(fromIndex, toIndex);
                    item.scrollIntoView(true);
                }
            }
        );

        dropManager.initialize();
        return Promise.resolve();
    }
}