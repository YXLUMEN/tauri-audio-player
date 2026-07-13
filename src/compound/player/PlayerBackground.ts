import {BaseCompound} from "../BaseCompound.ts";
import {PlayerContext} from "../../context/PlayerContext.ts";
import {appEvent} from "../../event/EventBus.ts";

export class PlayerBackground extends BaseCompound {
    private readonly context: PlayerContext;

    private background: HTMLElement | null = null;

    public constructor(context: PlayerContext) {
        super();
        this.context = context;
        this.closePlayer = this.closePlayer.bind(this);
    }

    public lyricDisplaying() {
        return this.context.isPlayerShow && this.context.isLyricShow;
    }

    public togglePlayer() {
        if (!this.background) return;
        this.context.isPlayerShow = this.background.classList.toggle('show');
    }

    public closePlayer() {
        if (!this.background) return false;
        this.context.isPlayerShow = false;
        this.background.classList.remove('show');
        return true;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.background = target;
        this.assert(target, '#close-player').addEventListener('click', this.closePlayer);

        const playerBox = this.assert(target, '#player-box');
        appEvent.on('lyric:show', event => {
            this.context.isLyricShow = playerBox.classList.toggle('show-lyric', event.hide);
        });

        return Promise.resolve();
    }
}