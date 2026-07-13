import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";

export class PlayerTitle extends BaseCompound {
    public constructor() {
        super(true);
    }

    public mount(target: HTMLElement): Promise<void> {
        const musicTitle = this.assert(target, '#music-title');
        const authorName = this.assert(target, '#author-name');
        const albumName = this.assert(target, '#album-name');

        appEvent.on('ui:audio-title', ({standard}) => {
            musicTitle.textContent = standard.title;
            authorName.textContent = standard.artist;
            albumName.textContent = standard.album;
        });

        appEvent.on('lyric:show', event => {
            target.classList.toggle('hide', event.hide);
        });

        return Promise.resolve();
    }
}