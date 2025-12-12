import {AudioInfo} from "../types/audio";
import {dbHelper} from "../database/db_init";
import {clearPlayingQueueHistory} from "../database/db_util";
import {removeDuplicate} from "./util";
import {QueueRender} from "./queue_render";
import {QueueController} from "./queue_controller";
import {clamp} from "../utils/Math";
import {isCacheAble, loadedPlugins} from "../plugins";


export class QueueStatus {
    private static audioPlayer = document.createElement('audio');
    private static playingQueueEle = document.getElementById('playing-queue')!;
    private static folderContent = document.getElementById('folder-content')!;

    private static playingIndex: number = -1;
    private static playingQueue: AudioInfo[] = [];

    static {
        this.audioPlayer.crossOrigin = 'anonymous';
    }

    public static getPlayer() {
        return this.audioPlayer;
    }

    public static getCurrentIndex(): number {
        return this.playingIndex;
    }

    public static setAudioIndex(index: number): void {
        if (!Number.isSafeInteger(index)) return;
        this.playingIndex = clamp(index, 0, this.playingQueue.length);
    }

    public static setAudioIndexUnclamp(index: number): void {
        if (!Number.isSafeInteger(index)) return;
        this.playingIndex = index;
    }

    public static getPlayingQueue(): AudioInfo[] {
        return [...this.playingQueue];
    }

    public static getCurrentPlaying(): AudioInfo | null {
        return this.playingQueue[this.playingIndex];
    }

    public static getMaxAudioCount(): number {
        return this.playingQueue.length;
    }

    // 设置播放队列
    public static async setPlayingQueue(queue: AudioInfo[] | null): Promise<void> {
        if (!queue) return;
        this.playingQueue = queue;
        await QueueRender.renderPlayingQueue(this.playingQueue);
    }

    // 合并队列, 会去除id重复的元素
    public static async mergePlayingQueue(queue: AudioInfo[] | null): Promise<void> {
        if (!queue) return;
        await this.setPlayingQueue(removeDuplicate(this.playingQueue.concat(queue)));
    }

    public static async pushAudios(audios: AudioInfo[] | AudioInfo | null): Promise<void> {
        if (!audios) return;

        if (Array.isArray(audios)) {
            this.playingQueue = this.playingQueue.concat(audios);
        } else {
            this.playingQueue.push(audios);
        }

        await QueueRender.renderPlayingQueue(this.playingQueue, false);
    }

    public static async insertAudio(at: number, audios: AudioInfo[] | AudioInfo | null): Promise<void> {
        if (!audios) return;
        const insertIndex = clamp(at, 0, this.playingQueue.length);

        if (Array.isArray(audios)) {
            this.playingQueue.splice(insertIndex, 0, ...audios);
        } else {
            this.playingQueue.splice(insertIndex, 0, audios);
        }

        await QueueRender.renderPlayingQueue(this.playingQueue);
    }

    public static async moveAudio(from: number, to: number): Promise<void> {
        if (from < 0 || from > this.playingQueue.length) return;
        const toIndex = Math.max(0, Math.min(to, this.playingQueue.length));

        const audio = this.playingQueue.splice(from, 1)[0];
        this.playingQueue.splice(toIndex, 0, audio);

        await QueueRender.renderPlayingQueue(this.playingQueue);
    }

    public static async unshiftAudios(audios: AudioInfo[] | AudioInfo): Promise<void> {
        if (!audios) return;

        if (Array.isArray(audios)) {
            this.playingQueue = audios.concat(this.playingQueue);
        } else {
            this.playingQueue.unshift(audios);
        }

        await QueueRender.renderPlayingQueue(this.playingQueue);
    }

    public static async removeAudio(index: number): Promise<void> {
        if (index < 0 || index > this.playingQueue.length) return;

        if (index < this.playingIndex) {
            this.setAudioIndex(this.playingIndex - 1);
        } else if (this.playingQueue.length === 1) {
            await this.clearPlayingQueue();
            return;
        }
        if (index === this.playingIndex) {
            await QueueController.switchAudio(this.playingIndex + 1, false, false);
            this.setAudioIndex(index);
        }
        this.playingQueue.splice(index, 1);

        await QueueRender.renderPlayingQueue(this.playingQueue);
    }

    public static async clearPlayingQueue(): Promise<void> {
        if (this.playingQueue.length === 0) return;
        await QueueController.pauseToggle(false);
        this.audioPlayer.removeAttribute('src');

        this.playingQueue.length = 0;
        this.setAudioIndexUnclamp(-1);

        this.playingQueueEle.textContent = '';
        this.clearPluginsCache();
    }

    public static async storgePlayingQueue(): Promise<void> {
        if (this.playingQueue.length <= 0) return;
        await clearPlayingQueueHistory();

        for (let i = 0, len = this.playingQueue.length; i < len; i++) {
            const row = this.playingQueue[i];
            row.index = i;
            row.parent = undefined;
            await dbHelper.add('playing_history', row);
        }
    }

    public static clearPluginsCache(): void {
        // 播放队列中的 ID
        const inQueueIds = new Set<string>(
            this.playingQueue.map(item => item.id)
        );

        // 当前在 DOM(folder-content) 中的 ID
        const inDomIds = new Set<string>(
            Array.from(this.folderContent.querySelectorAll('[id]'))
                .map(el => el.id)
        );

        const inUseIds = inQueueIds.union(inDomIds);

        for (const plugin of Object.values(loadedPlugins)) {
            if (!isCacheAble(plugin)) continue;
            plugin.clearUnused(inUseIds);
        }
    }

    public static forceClearPluginsCache(): void {
        for (const plugin of Object.values(loadedPlugins)) {
            if (isCacheAble(plugin)) plugin.clear();
        }
    }
}