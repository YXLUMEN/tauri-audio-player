import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";

export class LoadingUi extends BaseCompound {
    private readonly tracked: Set<HTMLElement> = new Set();

    public constructor() {
        super();

        appEvent.on('queue:loading', event => {
            for (const item of this.tracked) {
                item.classList.toggle('show', event.show);
            }
        });
    }

    public mount(target: HTMLElement): Promise<void> {
        this.tracked.add(target);
        return Promise.resolve();
    }
}