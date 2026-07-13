export class AudioCompound {
    public readonly audio: HTMLAudioElement;

    public constructor() {
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';

        this.audio.addEventListener('loadedmetadata', () => this.audio.currentTime = 0);
    }
}
