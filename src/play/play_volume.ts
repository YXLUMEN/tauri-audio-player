import {QueueStatus} from "../playing_queue/queue_status";

export class PlayVolume {
    private static readonly indexVolumeToggle = document.getElementById('i-volume-toggle')! as HTMLInputElement;
    private static readonly playerVolumeToggle = document.getElementById('volume-toggle')! as HTMLInputElement;

    private static lastVolume: string = '70';

    public static toggleMuted() {
        const audio = QueueStatus.getPlayer();

        if (this.playerVolumeToggle.value === '0') {
            if (this.lastVolume === '0') this.lastVolume = '70';
            this.playerVolumeToggle.value = this.lastVolume;
            this.indexVolumeToggle.value = this.lastVolume;
            audio.muted = false;

            document.querySelectorAll('img[action="volume"]').forEach(img => {
                (img as HTMLImageElement).src = '/img/audio/ico/volume.svg';
            });
        } else {
            this.lastVolume = this.playerVolumeToggle.value;
            this.playerVolumeToggle.value = '0';
            this.indexVolumeToggle.value = '0';
            audio.muted = true;

            document.querySelectorAll('img[action="volume"]').forEach(img => {
                (img as HTMLImageElement).src = '/img/audio/ico/volume-muted.svg';
            });
        }
    }

    public static modifyVolume(volume: number) {
        const audio = QueueStatus.getPlayer();
        const volumeNum = Math.max(0, Math.min(100, volume)) / 100;

        if (audio.volume === volumeNum) return;
        if (volumeNum === 0) {
            return this.toggleMuted();
        }
        if (audio.muted) this.toggleMuted();

        const vol = volume.toString()
        this.playerVolumeToggle.value = vol;
        this.indexVolumeToggle.value = vol;

        audio.volume = volumeNum;

        const volumes = document.querySelectorAll('img[action="volume"]');
        if (volume >= 70) {
            volumes.forEach(img => {
                (img as HTMLImageElement).src = '/img/audio/ico/volume.svg';
            });
        } else if (volume > 30 && volume < 70) {
            volumes.forEach(img => {
                (img as HTMLImageElement).src = '/img/audio/ico/volume-mid.svg';
            });
        } else if (volume <= 30) {
            volumes.forEach(img => {
                (img as HTMLImageElement).src = '/img/audio/ico/volume-low.svg';
            });
        }
    }

    public static initialize() {
        this.playerVolumeToggle.addEventListener('input', () =>
            this.modifyVolume(Number(this.playerVolumeToggle.value))
        );
        this.indexVolumeToggle.addEventListener('input', () =>
            this.modifyVolume(Number(this.indexVolumeToggle.value))
        );
    }

    static {
        this.toggleMuted = this.toggleMuted.bind(this);
    }
}