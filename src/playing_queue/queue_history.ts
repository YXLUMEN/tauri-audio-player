import {QueueStatus} from "./queue_status";
import {dbHelper} from "../database/db_init";
import {isEmpty} from "../utils/util";
import {QueueController} from "./queue_controller";
import {AudioInfo} from "../types/audio";

export class QueueHistory {
    public static async savePlayingQueue() {
        try {
            if (QueueStatus.getCurrentPlaying()) localStorage.setItem('playing', JSON.stringify({
                index: QueueStatus.getCurrentIndex(),
                currentTime: QueueStatus.getPlayer().currentTime
            }));

            await QueueStatus.storgePlayingQueue();
        } catch (err) {
            console.error(err);
        }
    }

    public static async loadHistory() {
        const usedPlaying = localStorage.getItem('playing');
        if (!usedPlaying) return;

        const result = await dbHelper.getAll<AudioInfo>('playing_history');
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return;
        }

        const infos = result.ok().get();
        if (isEmpty(infos)) return;

        const {index, currentTime} = JSON.parse(usedPlaying);
        await QueueStatus.setPlayingQueue(infos);

        const num = Number(index);
        if (isNaN(num)) return;
        await QueueController.switchAudio(num, false,false,true);

        document.getElementById('index-audio-control')!.classList.remove('hide');
        if (num !== QueueStatus.getCurrentIndex()) return;
        QueueStatus.getPlayer().currentTime = Number(currentTime);
    }
}