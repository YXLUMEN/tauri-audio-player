import {BaseCompound} from "../BaseCompound.ts";
import {Consumer} from "../../types/types.ts";
import {throttleTimeOut} from "../../util/util.ts";
import {PlayerProgressRender} from "./PlayerProgressRender.ts";
import {PlayerContext} from "../../context/PlayerContext.ts";


export class PlayerProgressBar extends BaseCompound {
    private readonly context: PlayerContext;
    private readonly render: PlayerProgressRender;
    private readonly throttleSeeking: Consumer<InputEvent>;

    public constructor(context: PlayerContext, render: PlayerProgressRender) {
        super();
        this.context = context;
        this.render = render;

        this.psgSeeking = this.psgSeeking.bind(this);
        this.psgLeap = this.psgLeap.bind(this);
        this.throttleSeeking = throttleTimeOut(this.psgSeeking, 32);
    }

    private psgSeeking(event: InputEvent) {
        if (!this.context.audio().currentTime) return;

        this.context.isSeeking = true;
        const value = (event.target as HTMLInputElement).value;
        const num = Number(value);
        if (!Number.isFinite(num)) return;

        const duration = this.context.audio().duration;
        const leap = (num / 100) * duration;
        this.render.updatePlayingProgress(leap, duration);
    }

    private psgLeap(event: Event) {
        if (!this.context.audio().currentTime) return;

        const value = (event.target as HTMLInputElement).value;
        const num = Number(value);
        if (!Number.isFinite(num)) return;

        this.context.audio().currentTime = (num / 100) * this.context.audio().duration;
        this.context.isSeeking = false;
    }

    public mount(target: HTMLElement): Promise<void> {
        if (target.id !== 'i-progress-played' && target.id !== 'progress-played') return Promise.resolve();

        target.removeEventListener('input', this.throttleSeeking);
        target.removeEventListener('change', this.psgLeap);

        target.addEventListener('input', this.throttleSeeking);
        target.addEventListener('change', this.psgLeap);

        return Promise.resolve();
    }
}