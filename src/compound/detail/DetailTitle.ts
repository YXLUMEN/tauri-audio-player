import {BaseCompound} from "../BaseCompound.ts";
import {appEvent} from "../../event/EventBus.ts";

export class DetailTitle extends BaseCompound {
    public constructor() {
        super(true);
    }

    public mount(target: HTMLElement): Promise<void> {
        const title = this.assert(target, '#folder-info-title');
        const cover = this.as(target, '#folder-info-cover', HTMLImageElement);

        appEvent.on('folder:title', event => {
            title.textContent = event.title;
            cover.src = event.cover;
        });
        return Promise.resolve();
    }
}