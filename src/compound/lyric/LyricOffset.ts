import {BaseCompound} from "../BaseCompound.ts";
import {LyricContext} from "../../context/LyricContext.ts";

export class LyricOffset extends BaseCompound {
    private readonly context: LyricContext;

    public constructor(context: LyricContext) {
        super(true);
        this.context = context;
    }

    public mount(target: HTMLElement): Promise<void> {
        const displayer = this.assert(target, '#lyric-offset');
        target.addEventListener('click', event => {
            const target = (event.target as HTMLElement).closest('img');
            if (!target) return;

            const alt = Number(target.alt);
            const offset = Number.isFinite(alt) ? alt : 0;
            if (offset === 0) {
                this.context.customLyricOffset = 0;
                displayer.textContent = '';
                return;
            }

            this.context.customLyricOffset += offset;
            displayer.textContent = this.context.customLyricOffset.toFixed(1);
        });

        return Promise.resolve();
    }
}