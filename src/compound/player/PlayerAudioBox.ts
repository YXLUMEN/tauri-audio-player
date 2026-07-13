import {BaseCompound} from "../BaseCompound.ts";
import {PlayerBackground} from "./PlayerBackground.ts";

export class PlayerAudioBox extends BaseCompound {
    private readonly background: PlayerBackground;

    public constructor(background: PlayerBackground) {
        super();
        this.background = background;
    }

    public mount(target: HTMLElement): Promise<void> {
        target.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'DIV' || target.tagName === 'SECTION') {
                this.background.togglePlayer();
            }
        });

        return Promise.resolve();
    }
}