import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";
import {DetailContext} from "../../context/DetailContext.ts";

export class HighlightContent extends BaseCompound {
    private readonly context: DetailContext;
    private currentRow: HTMLElement | null = null;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;
    }

    public mount(target: HTMLElement): Promise<void> {
        appEvent.on('queue:highlight', () => {
            const current = this.context.queue.current();
            if (!current) return;

            this.currentRow = target.querySelector(`[data-uid="${current.uid}"]`);
            if (!this.currentRow) return;

            target.querySelector('.row.current')?.classList.remove('current', 'playing');
            this.currentRow.classList.add('current');

            if (!this.context.audio.paused) {
                this.currentRow.classList.add('playing');
            }
        });

        this.context.audio.addEventListener('play', () => {
            this.currentRow?.classList.add('playing');
        });

        this.context.audio.addEventListener('pause', () => {
            this.currentRow?.classList.remove('playing');
        });

        return Promise.resolve();
    }
}