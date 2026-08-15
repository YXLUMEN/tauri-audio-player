import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";
import {ToggleLoading} from "../../event/queue/ToggleLoading.ts";

export class LoadingUi extends BaseCompound {
    private readonly tracked: Set<HTMLElement> = new Set();

    public constructor() {
        super();

        this.onLoading = this.onLoading.bind(this);
        appEvent.on('queue:loading', this.onLoading);
    }

    private onLoading(event: ToggleLoading): void {
        this.toggle(event.show);
    }

    private toggle(force: boolean) {
        for (const item of this.tracked) {
            item.classList.toggle('show', force);
        }
    }

    public mount(target: HTMLElement): Promise<void> {
        this.tracked.add(target);
        target.classList.toggle('show', false);

        return Promise.resolve();
    }
}