import {dbHelper} from "../database/db_init.ts";
import {QueueSystem} from "./QueueSystem.ts";
import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {appEvent} from "../event/EventBus.ts";
import {SwitchAudio} from "../event/queue/SwitchAudio.ts";
import {Parsers} from "../plugin/Parsers.ts";

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

        const db = await dbHelper.init();
        const tx = db.transaction('playing_history', 'readwrite');
        const store = tx.objectStore('playing_history');
        store.clear();

        QueueSystem.QUEUE
            .iter()
            .map(item => {
                const record = item.persistable();
                const plugin = Parsers.get(item.plugin);
                plugin?.modify(record);
                const {parent, ...rest} = record;
                return rest as HistoryRecord;
            })
            .forEach((record, index) => {
                store.add(record, index);
            });
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

        const infos = raw.map(record => {
            const plugin = Parsers.get(record.plugin) ?? Parsers.LOCAL;
            return plugin.recover(record);
        });
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
    uid: string;
    plugin: string;
    url?: string;
    title?: string;
    album?: string;
    artist?: string;
    cover?: string;
}