import {appEvent} from "../../event/EventBus.ts";
import {ClosePriority} from "../../types/ClosePriority.ts";
import {Consumer} from "../../types/types.ts";

export class ClosePageCompound {
    private readonly queue: ClosePriority[] = [];
    private readonly disposer: Consumer<void>;

    public constructor() {
        this.close = this.close.bind(this);
        this.disposer = appEvent.on('ui:close', this.close);
    }

    public close(): void {
        for (const closeable of this.queue) {
            if (closeable.close()) break;
        }
    }

    public register(closable: ClosePriority): void {
        this.queue.push(closable);
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    public dispose(): void {
        this.queue.length = 0;
        this.disposer();
    }
}