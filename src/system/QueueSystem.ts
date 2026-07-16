import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {PageBuilder} from "../page/PageBuilder.ts";
import {QueueCompound} from "../compound/queue/QueueCompound.ts";
import {ControllerCompound} from "../compound/queue/ControllerCompound.ts";
import {QueueRenderCompound} from "../compound/queue/QueueRenderCompound.ts";
import {LoadingUi} from "../compound/queue/LoadingUi.ts";
import {PlayerPlayQueue} from "../compound/player/PlayerPlayQueue.ts";
import {ShortcutSystem} from "./ShortcutSystem.ts";
import {ShortcutAction} from "../builtin/ShortcutAction.ts";
import {PlayQueueBoard} from "../compound/queue/PlayQueueBoard.ts";
import {UiSystem} from "./UiSystem.ts";
import {PlayModeAndNextIndex} from "../compound/queue/PlayModeAndNextIndex.ts";
import {appEvent} from "../event/EventBus.ts";
import {HighlightCurrent} from "../event/queue/HighlightCurrent.ts";
import {QueueBoardTitle} from "../compound/queue/QueueBoardTitle.ts";
import {PlayErrorHandler} from "../compound/PlayErrorHandler.ts";

export class QueueSystem {
    public static QUEUE: QueueCompound;
    public static CONTROLLER: ControllerCompound;
    public static MODE: PlayModeAndNextIndex;
    public static BOARD: PlayQueueBoard;

    public static init(builder: PageBuilder, compound: AudioCompound): void {
        this.QUEUE = new QueueCompound(compound.audio);
        const errorHandler = new PlayErrorHandler(compound, this.QUEUE);
        this.CONTROLLER = new ControllerCompound(compound.audio, this.QUEUE, errorHandler);
        this.MODE = new PlayModeAndNextIndex(compound.audio, this.QUEUE);
        this.BOARD = new PlayQueueBoard();

        builder.singleton('queue-render', new QueueRenderCompound(this.QUEUE));
        builder.singleton('playing-queue', new PlayerPlayQueue(this.QUEUE));
        builder.singleton('loading-ui', new LoadingUi());
        builder.singleton('play-board', this.BOARD);
        builder.singleton('playing-board-title', new QueueBoardTitle(this.QUEUE));

        const dispatcher = ShortcutSystem.DISPATCHER;
        dispatcher.register(ShortcutAction.PauseAndPlay, () => this.CONTROLLER.togglePause());
        dispatcher.register(ShortcutAction.QueueShowBoard, () => this.BOARD.toggleBoard());
        dispatcher.register(ShortcutAction.QueueForward, this.MODE.playNext);
        dispatcher.register(ShortcutAction.QueueBackward, this.MODE.playPrev);
        dispatcher.register(ShortcutAction.PlayerPlayMode, this.MODE.switchMode);
        dispatcher.register(ShortcutAction.QueueHighlightCurrent, () => appEvent.emit(new HighlightCurrent(true)));

        UiSystem.CLOSE_PAGE.register({
            priority: 1,
            close: () => {
                if (this.BOARD.isHidden()) return false;
                this.BOARD.toggleBoard(true);
                return true;
            }
        });

        Object.freeze(this);
    }
}