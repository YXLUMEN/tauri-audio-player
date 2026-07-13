import {BaseCompound} from "../BaseCompound.ts";
import {PlayModeChange} from "../../event/PlayModeChange.ts";
import {appEvent} from "../../event/EventBus.ts";

export class ModeIconCompound extends BaseCompound {
    private readonly tracked: HTMLImageElement[] = [];

    public constructor() {
        super();
        this.render = this.render.bind(this);
        appEvent.on('queue:mode', this.render);
    }

    private render(event: PlayModeChange): void {
        const url = `/img/audio/ico/play_mode_${event.mode}.svg`;
        for (const img of this.tracked) {
            img.src = url;
        }
    }

    public mount(target: HTMLElement): Promise<void> {
        if (target instanceof HTMLImageElement) {
            this.tracked.push(target);
        }

        return Promise.resolve();
    }
}