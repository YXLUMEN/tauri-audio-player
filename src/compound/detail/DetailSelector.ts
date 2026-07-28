import {BaseCompound} from "../BaseCompound.ts";
import {DetailContext} from "../../context/DetailContext.ts";
import {appEvent} from "../../event/EventBus.ts";
import {SwitchAudio} from "../../event/queue/SwitchAudio.ts";

export class DetailSelector extends BaseCompound {
    private readonly context: DetailContext;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;
    }

    public playChosen() {
        const chosen = this.context.getChosen();
        if (!chosen) return;

        const index = chosen.getAttribute('data-index');
        if (!index) return;

        if (!this.context.queueMerged && this.context.hasContent()) {
            this.context.queue.override(this.context.displayed());
        }
        this.context.queueMerged = true;
        this.context.queue.setIndexUnclamp(-1);

        const num = Number(index);
        if (!Number.isSafeInteger(num)) return;
        appEvent.emit(new SwitchAudio(num));
    }

    public mount(target: HTMLElement): Promise<void> {
        target.addEventListener('click', event => {
            const row = (event.target as HTMLElement).closest('.row') as HTMLElement | null;
            this.context.setChosen(row);
        });

        target.addEventListener('dblclick', event => {
            const row = (event.target as HTMLElement).closest('.row') as HTMLElement | null;
            this.context.setChosen(row);
            this.playChosen();
        });

        return Promise.resolve();
    }
}