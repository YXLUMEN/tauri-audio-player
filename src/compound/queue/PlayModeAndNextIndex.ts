import {appEvent} from "../../event/EventBus.ts";
import {SwitchAudio} from "../../event/queue/SwitchAudio.ts";
import {QueueCompound} from "./QueueCompound.ts";
import {PlayModeChange} from "../../event/queue/PlayModeChange.ts";
import {generateUniqueRandomNumbers} from "../../util/random.ts";

export class PlayModeAndNextIndex {
    private readonly queue: QueueCompound;
    private playMode: number = 0;

    private cursor: number = 0;
    private randomList: number[] = [];

    public constructor(audio: HTMLAudioElement, queue: QueueCompound) {
        this.queue = queue;

        this.playNext = this.playNext.bind(this);
        this.playPrev = this.playPrev.bind(this);
        this.switchMode = this.switchMode.bind(this);
        this.order = this.order.bind(this);

        audio.addEventListener('ended', this.playNext);
        appEvent.on('queue:change', this.order);
    }

    public playNext() {
        appEvent.emit(new SwitchAudio(this.next(1)));
    }

    public playPrev() {
        appEvent.emit(new SwitchAudio(this.next(-1)));
    }

    public mode() {
        return this.playMode;
    }

    public switchMode() {
        this.playMode = (this.playMode + 1) % 4;
        appEvent.emit(new PlayModeChange(this.playMode));
    }

    private next(dir: number): number {
        const max = this.queue.length();
        const current = this.queue.index();

        // 列表循环
        if (this.playMode === 0) {
            return ((current + dir) % max + max) % max;
        }

        //单曲循环
        if (this.playMode === 1) return current;

        // 随机播放
        if (this.playMode === 2) {
            return this.nextRandom(dir);
        }

        // 顺序播放
        if (this.playMode === 3) {
            return Math.min(current + 1, max);
        }

        console.warn('未知的播放模式', this.playMode);
        this.playMode = 0;
        return current;
    }

    // 以后改成分批生成+原地洗牌+基础偏移就行
    private nextRandom(dir: number): number {
        const len = this.randomList.length;
        if (len === 0) return 0; // 始终返回可能的有效索引

        const max = this.queue.length();
        // 从下一个元素开始
        this.cursor = ((this.cursor + dir) % len + len) % len;

        let next = 0;
        let cursor = this.cursor;

        // 沿 dir 方向线性搜索第一个有效索引
        do {
            next = this.randomList[cursor];
            if (next < max) break;

            cursor = ((cursor + dir) % len + len) % len;
        } while (cursor !== this.cursor); // 绕回起点退出

        const positive = dir > 0;
        const delta = positive ? cursor - this.cursor : this.cursor - cursor;
        if (delta === 0) {
            if (next < max) return next;

            // 环绕后无合法项则全部失效
            this.randomList.length = 0;
            this.cursor = 0;
            return 0;
        }

        // offset 用于 splice 时决定是否保留 cursor 位置的有效项
        // 正向时删除 [cursor, this.cursor) 区间,保留 cursor 处有效项，offset=0
        // 反向时删除 (cursor, this.cursor] 区间,保留 cursor 处有效项，offset=1
        const offset = positive ? 0 : 1;

        if (delta > 0) {
            // 未环绕则删除 [this.cursor, cursor) 间的无效项
            this.randomList.splice(Math.min(this.cursor, cursor) + offset, delta);
            this.cursor = cursor;
            return next;
        }

        // 发生环绕,两段删除
        // 从较大下标到数组末尾
        this.randomList.splice(Math.max(this.cursor, cursor) + offset);
        // 从数组开头到较小下标
        this.randomList.splice(0, Math.min(this.cursor, cursor) + offset);
        this.cursor = cursor;

        return next;
    }

    private order(): void {
        const max = this.queue.length();
        if (max === 0) {
            this.randomList.length = 0;
            return;
        }

        const len = this.randomList.length;
        if (max === len) return;

        const delta = Math.abs(max - len);
        if (delta > len / 3) {
            this.randomList = generateUniqueRandomNumbers(max);
            return;
        }

        if (max > len) {
            const ran = generateUniqueRandomNumbers(delta, len);
            this.randomList.push(...ran);
            return;
        }
    }
}