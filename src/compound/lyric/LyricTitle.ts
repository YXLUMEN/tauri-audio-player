import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";

export class LyricTitle extends BaseCompound {
    public constructor() {
        super(true);
    }

    public mount(target: HTMLElement): Promise<void> {
        const title = this.assert(target, '#lyric-title');

        appEvent.on('ui:audio-title', ({standard}) => {
            title.textContent = standard.title;
        });

        appEvent.on('lyric:show', event => {
            target.classList.toggle('hide', event.hide);
        });

        return Promise.resolve();
    }
}