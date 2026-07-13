import {BaseCompound} from "../BaseCompound.ts";

export class PlayIconCompound extends BaseCompound {
    private readonly play = '/img/audio/ico/play.svg';
    private readonly pause = '/img/audio/ico/pause.svg';

    private readonly tracked: HTMLImageElement[] = [];

    public constructor(audio: HTMLAudioElement) {
        super();

        audio.addEventListener('play', () => {
            for (const img of this.tracked) {
                img.src = this.pause;
            }
        });
        audio.addEventListener('pause', () => {
            for (const img of this.tracked) {
                img.src = this.play;
            }
        });
    }

    public mount(target: HTMLElement): Promise<void> {
        if (target instanceof HTMLImageElement) {
            this.tracked.push(target);
        }

        return Promise.resolve();
    }
}