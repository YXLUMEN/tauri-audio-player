import {BaseCompound} from "../BaseCompound.ts";
import {PlayerContext} from "../../context/PlayerContext.ts";
import {transTime} from "../../util/Math.ts";

export class AudioTotalTimeRender extends BaseCompound {
    private readonly tracked: HTMLElement[] = [];

    public constructor(context: PlayerContext) {
        super();
        context.audio().addEventListener('loadedmetadata', event => {
            const audio = event.target as HTMLAudioElement;
            const total = transTime(audio.duration);
            for (const item of this.tracked) {
                item.textContent = total;
            }
        });
    }

    public mount(target: HTMLElement): Promise<void> {
        this.tracked.push(target);
        return Promise.resolve();
    }
}