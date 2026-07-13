import {BaseCompound} from "../BaseCompound.ts";
import {PlayerContext} from "../../context/PlayerContext.ts";
import {Pair} from "../../types/types.ts";
import {clamp} from "../../util/Math.ts";

export class PlayerVolume extends BaseCompound {
    private readonly context: PlayerContext;
    private readonly tracked: Pair<HTMLInputElement, HTMLImageElement>[] = [];

    private lastVolume: number = 0.7;

    public constructor(context: PlayerContext) {
        super();
        this.context = context;
        this.onInput = this.onInput.bind(this);
    }

    public toggleMuted(): void {
        const current = this.context.audio().volume;
        if (current === 0) {
            this.setVolume(this.lastVolume);
            return;
        }
        this.lastVolume = current;
        this.setVolume(0);
    }

    public addVolume(value: number): void {
        const volume = this.context.audio().volume + value;
        this.setVolume(volume);
    }

    public setVolume(volume: number) {
        const audio = this.context.audio();
        volume = clamp(volume, 0, 1);

        if (audio.volume === volume) return;
        audio.volume = volume;
        audio.muted = volume === 0;

        let icon: string;
        if (volume >= 0.7) {
            icon = '/img/audio/ico/volume.svg';
        } else if (volume > 0.3 && volume < 0.7) {
            icon = '/img/audio/ico/volume-mid.svg';
        } else if (volume > 0 && volume <= 0.3) {
            icon = '/img/audio/ico/volume-low.svg';
        } else {
            icon = '/img/audio/ico/volume-muted.svg';
        }

        const value = Math.floor(volume * 100).toString();
        for (const item of this.tracked) {
            item.key.value = value;
            item.value.src = icon;
        }
    }

    private onInput(event: InputEvent): void {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;

        const value = input.value;
        const num = Number(value) / 100;
        if (!Number.isFinite(num)) return;

        this.setVolume(num);
    }

    public mount(target: HTMLElement): Promise<void> {
        const input = this.as(target, 'input', HTMLInputElement);
        const icon = this.as(target, 'img', HTMLImageElement);
        this.tracked.push({
            key: input,
            value: icon
        });
        input.removeEventListener('input', this.onInput);
        input.addEventListener('input', this.onInput);

        return Promise.resolve();
    }
}