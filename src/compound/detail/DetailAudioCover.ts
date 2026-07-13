import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";
import {DetailContext} from "../../context/DetailContext.ts";

export class DetailAudioCover extends BaseCompound {
    private readonly context: DetailContext;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;
    }

    public mount(target: HTMLElement): Promise<void> {
        const cover = this.as(target, 'img', HTMLImageElement);

        appEvent.on('ui:cover-loaded', event => {
            cover.src = event.url;
        });

        this.context.audio.addEventListener('play', () => target.classList.remove('paused'));
        this.context.audio.addEventListener('pause', () => target.classList.add('paused'));

        return Promise.resolve();
    }
}