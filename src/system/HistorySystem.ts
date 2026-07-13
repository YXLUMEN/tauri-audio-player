import {clearPlayingQueueHistory} from "../database/db_util.ts";
import {dbHelper} from "../database/db_init.ts";
import {QueueSystem} from "./QueueSystem.ts";
import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {AudioInfos} from "../types/audio/AudioInfos.ts";
import {appEvent} from "../event/EventBus.ts";
import {SwitchAudio} from "../event/SwitchAudio.ts";

export class HistorySystem {
    public static saveStatus(audio: AudioCompound): void {
        const queue = QueueSystem.QUEUE;
        if (!queue.current()) return;

        localStorage.setItem('playing', JSON.stringify({
            index: queue.index(),
            current_time: audio.audio.currentTime
        }));
    }

    public static async saveHistory(): Promise<void> {
        if (QueueSystem.QUEUE.length() === 0) return;
        await clearPlayingQueueHistory();

        const iter = QueueSystem.QUEUE
            .iter()
            .map((info, index): HistoryRecord => ({
                index,
                uid: info.uid,
                plugin: info.plugin,
                url: info.url,
            }));
        await dbHelper.push('playing_history', iter);
    }

    public static async saveAll(audio: AudioCompound): Promise<void> {
        this.saveStatus(audio);
        await this.saveHistory();
    }

    public static async load(audio: AudioCompound): Promise<void> {
        const result = await dbHelper.getAll<HistoryRecord>('playing_history');
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return;
        }

        const raw = result.unwrap();
        if (raw.length === 0) return;

        const infos = raw.map(info => new AudioInfos(info.uid, info.plugin, info.url));
        QueueSystem.QUEUE.override(infos);

        // 切换到历史播放
        const usedPlaying = localStorage.getItem('playing');
        if (!usedPlaying) return;

        const {index, current_time: currentTime} = JSON.parse(usedPlaying);
        if (typeof index !== 'number' || !Number.isInteger(index)) return;

        appEvent.emit(new SwitchAudio(index, false, false, true));

        document.getElementById('index-audio-control')?.classList.remove('hide');
        if (index !== QueueSystem.QUEUE.index()) return;

        audio.audio.addEventListener('canplaythrough', () => {
            audio.audio.currentTime = typeof currentTime === 'number' && Number.isFinite(currentTime) ? currentTime : 0;
        }, {once: true});
    }
}

interface HistoryRecord {
    index: number;
    uid: string;
    plugin: string;
    url?: string;
}