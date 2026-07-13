import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";

export class DetailControllerTitle extends BaseCompound {
    public constructor() {
        super(true);
    }

    public mount(target: HTMLElement): Promise<void> {
        const title = target.firstElementChild;
        const artist = target.lastElementChild;
        if (!title || !artist) {
            throw new Error();
        }

        appEvent.on('ui:audio-title', ({standard}) => {
            title.textContent = standard.title;
            artist.textContent = standard.artist;
        });

        return Promise.resolve();
    }
}