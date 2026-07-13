import {BaseCompound} from "../BaseCompound.ts";

export class PlayQueueBoard extends BaseCompound {
    private closeBoard: HTMLElement | null = null;
    private playBoard: HTMLElement | null = null;

    public constructor() {
        super(true);
    }

    public toggleBoard(force?: boolean) {
        this.playBoard?.classList.toggle('hide', force);
        this.closeBoard?.classList.toggle('hide', force);
    }

    public isHidden() {
        if (!this.playBoard || !this.closeBoard) return false;
        return this.playBoard.classList.contains('hide');
    }

    public mount(target: HTMLElement): Promise<void> {
        this.closeBoard = this.assert(target, '#close-playing-board');
        this.playBoard = this.assert(target, '#playing-board-container');

        this.closeBoard.addEventListener('click', () => this.toggleBoard(true));
        return Promise.resolve();
    }
}