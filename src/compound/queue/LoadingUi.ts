import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";
import {ToggleLoading} from "../../event/queue/ToggleLoading.ts";

export class LoadingUi extends BaseCompound {
    private readonly tracked: Set<HTMLElement> = new Set();
    private loadCounts: number = 0;

    public constructor() {
        super();

        this.onLoading = this.onLoading.bind(this);
        appEvent.on('queue:loading', this.onLoading);
    }

    private onLoading(event: ToggleLoading): void {
        this.loadCounts += event.show ? 1 : -1;

        if (event.show && this.loadCounts === 1) {
            this.toggle(true);
            return;
        }

        if (this.loadCounts <= 0) {
            this.loadCounts = 0;
            this.toggle(false);
        }
    }

    private toggle(force: boolean) {
        for (const item of this.tracked) {
            item.classList.toggle('show', force);
        }
    }

    public mount(target: HTMLElement): Promise<void> {
        this.tracked.add(target);
        return Promise.resolve();
    }
}