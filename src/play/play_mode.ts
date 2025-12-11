import {generateUniqueRandomNumbers} from "../utils/math/random";
import {QueueRender} from "../playing_queue/queue_render";
import {QueueStatus} from "../playing_queue/queue_status";


export class PlayMode {
    private static playMode: number = 0;
    private static randomPlayingQueue: number[] = [];

    public static getRandomPlayQueueRefer(): number[] {
        return this.randomPlayingQueue;
    }

    public static setRandomPlayQueue(list: number[]): void {
        this.randomPlayingQueue = list;
    }

    public static getPlayMode(): number {
        return this.playMode;
    }

    public static modeToggle() {
        this.playMode = (this.playMode + 1) % 4;
        QueueRender.renderPlayMode();
    }

    public static getNextAudioIndex(delta = 1): number {
        const max = QueueStatus.getMaxAudioCount();

        // 列表循环
        if (this.playMode === 0) {
            const next = (QueueStatus.getCurrentIndex() + delta) % max;
            return next < 0 ? max - 1 : next;
        }

        //单曲循环
        if (this.playMode === 1) return QueueStatus.getCurrentIndex();

        // 随机播放
        if (this.playMode === 2) {
            const random = this.getRandomPlayQueueRefer().pop();
            return random !== undefined ? random : (() => {
                this.randomPlayingQueue = generateUniqueRandomNumbers(max);
                return this.randomPlayingQueue.pop() ?? QueueStatus.getCurrentIndex() + 1;
            })();
        }

        // 顺序播放
        if (this.playMode === 3) {
            return Math.min(QueueStatus.getCurrentIndex(), max);
        }
        throw new RangeError('未知的播放模式');
    }

    static {
        this.modeToggle = this.modeToggle.bind(this);
    }
}