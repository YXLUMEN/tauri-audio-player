import {QueueStatus} from "./queue_status";
import {dbHelper} from "../database/db_init";
import {isEmpty} from "../utils/util";
import {QueueController} from "./queue_controller";
import {IAudioInfo} from "../types/audio";

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

        const result = await dbHelper.getAll<IAudioInfo>('playing_history');
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return;
        }

        const infos = result.ok().get();
        if (isEmpty(infos)) return;

        const {index, currentTime} = JSON.parse(usedPlaying);
        await QueueStatus.setPlayingQueue(infos);

        await QueueController.switchAudio(Number(index), {scroll: true, play: false});

        document.getElementById('index-audio-control')!.classList.remove('hide');
        if (Number(index) !== QueueStatus.getCurrentIndex()) return;
        QueueStatus.getPlayer().currentTime = Number(currentTime);
    }
}