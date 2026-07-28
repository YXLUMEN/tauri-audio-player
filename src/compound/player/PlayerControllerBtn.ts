import {BaseCompound} from "../BaseCompound.ts";
import {PlayerContext} from "../../context/PlayerContext.ts";
import {PlayModeAndNextIndex} from "../queue/PlayModeAndNextIndex.ts";
import {PlayerVolume} from "./PlayerVolume.ts";
import {createAlert} from "../../util/alert.ts";
import {collectAudio} from "../../database/db_util.ts";
import {PlayQueueBoard} from "../queue/PlayQueueBoard.ts";
import {appEvent} from "../../event/EventBus.ts";
import {ToggleLyric} from "../../event/ToggleLyric.ts";
import {DetailAppend} from "../../event/detail/DetailAppend.ts";
import {AlertCategories} from "../../types/AlertCategories.ts";
import {FolderChosenPopup} from "../folder/FolderChosenPopup.ts";
import {FolderAccessor} from "../folder/FolderAccessor.ts";

export class PlayerControllerBtn extends BaseCompound {
    private readonly context: PlayerContext;
    private readonly mode: PlayModeAndNextIndex;
    private readonly volume: PlayerVolume;
    private readonly board: PlayQueueBoard;
    private readonly popup: FolderChosenPopup;
    private readonly folder: FolderAccessor;

    public constructor(
        context: PlayerContext,
        mode: PlayModeAndNextIndex,
        volume: PlayerVolume,
        board: PlayQueueBoard,
        popup: FolderChosenPopup,
        folder: FolderAccessor
    ) {
        super();
        this.context = context;
        this.mode = mode;
        this.volume = volume;
        this.board = board;
        this.popup = popup;
        this.folder = folder;

        this.onClick = this.onClick.bind(this);
    }

    private onClick(event: PointerEvent): void {
        const target = event.target as HTMLElement;
        const action = target.closest('.control-icon')?.getAttribute('action');
        if (!action) return;

        event.stopPropagation();
        switch (action) {
            case 'lyric':
                appEvent.emit(new ToggleLyric());
                break;
            case 'play-mode':
                this.mode.switchMode();
                break;
            case 'forward':
                this.mode.playPrev();
                break;
            case 'backward':
                this.mode.playNext();
                break;
            case 'volume':
                this.volume.toggleMuted();
                break;
            case 'show-playing-board':
                this.board.toggleBoard();
                break;
            case 'play-pause':
                this.context.controller.togglePause();
                break;
            case 'collect':
                void this.collectFavour();
                break
        }
    }

    private async collectFavour() {
        const folder = await this.popup.select();
        if (!folder) {
            createAlert('收藏出现错误', AlertCategories.ERROR);
            return;
        }

        const info = this.context.queue.current();
        if (!info) return;

        const inner = await collectAudio(folder, info);
        if (!inner) return;

        if (this.folder.isId(folder)) {
            appEvent.emit(new DetailAppend(inner));
        }
    }

    public mount(target: HTMLElement): Promise<void> {
        target.removeEventListener('click', this.onClick);
        target.addEventListener('click', this.onClick);
        return Promise.resolve();
    }
}