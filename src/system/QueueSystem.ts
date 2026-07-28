import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {PageBuilder} from "../page/PageBuilder.ts";
import {QueueCompound} from "../compound/queue/QueueCompound.ts";
import {ControllerCompound} from "../compound/queue/ControllerCompound.ts";
import {QueueRenderCompound} from "../compound/queue/QueueRenderCompound.ts";
import {LoadingUi} from "../compound/queue/LoadingUi.ts";
import {PlayerPlayQueue} from "../compound/player/PlayerPlayQueue.ts";
import {ShortcutSystem} from "./ShortcutSystem.ts";
import {PlayQueueBoard} from "../compound/queue/PlayQueueBoard.ts";
import {UiSystem} from "./UiSystem.ts";
import {PlayModeAndNextIndex} from "../compound/queue/PlayModeAndNextIndex.ts";
import {appEvent} from "../event/EventBus.ts";
import {HighlightCurrent} from "../event/queue/HighlightCurrent.ts";
import {PlayErrorHandler} from "../compound/queue/PlayErrorHandler.ts";
import {ActionKey} from "../builtin/ActionKey.ts";

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

        const dispatcher = ShortcutSystem.DISPATCHER;
        dispatcher.register(ActionKey.PauseAndPlay, () => this.CONTROLLER.togglePause());
        dispatcher.register(ActionKey.QueueShowBoard, () => this.BOARD.toggleBoard());
        dispatcher.register(ActionKey.QueueForward, this.MODE.playNext);
        dispatcher.register(ActionKey.QueueBackward, this.MODE.playPrev);
        dispatcher.register(ActionKey.PlayerPlayMode, this.MODE.switchMode);
        dispatcher.register(ActionKey.QueueHighlightCurrent, () => appEvent.emit(new HighlightCurrent(true)));

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