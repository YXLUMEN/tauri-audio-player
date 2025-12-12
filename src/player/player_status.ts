import {throttleTimeOut} from "../utils/util";
import {QueueStatus} from "../playing_queue/queue_status";
import {PlayerRender} from "./player_render";

export class PlayerStatus {
    public static isSeeking: boolean;
    public static isPlayerShow: boolean;
    public static isLyricShow: boolean;

    public static progressSeeking = throttleTimeOut((event: Event) => {
        const audio = QueueStatus.getPlayer();
        if (!audio.currentTime) return;

        this.isSeeking = true;
        const value: string = (event.target as HTMLInputElement).value;
        const num = Number(value);
        if (isNaN(num)) return;

        const duration: number = (num / 100) * audio.duration;

        PlayerRender.updatePlayingProgress(duration);
    }, 32);

    public static progressLeap(event: Event) {
        const audio = QueueStatus.getPlayer();
        if (!audio.currentTime) return;

        const value = (event.target as HTMLInputElement).value;
        const num = Number(value);
        if (isNaN(num)) return;

        audio.currentTime = (num / 100) * audio.duration;
        this.isSeeking = false;
    }

    static {
        this.progressSeeking = this.progressSeeking.bind(this);
        this.progressLeap = this.progressLeap.bind(this);
    }
}

