import {BaseCompound} from "../BaseCompound.ts";
import {PlayerContext} from "../../context/PlayerContext.ts";
import {clamp, transTime} from "../../util/Math.ts";
import {appEvent} from "../../event/EventBus.ts";

export class PlayerProgressRender extends BaseCompound {
    private indexPgsPlayed: HTMLInputElement | null = null;
    private playerPgsPlayed: HTMLInputElement | null = null;
    private indexPlayedTime: HTMLElement | null = null;
    private playerPlayedTime: HTMLElement | null = null;

    private lastTime: string = '';

    public constructor(context: PlayerContext) {
        super();

        context.audio().addEventListener('timeupdate', event => {
            if (context.isSeeking) return;

            const audio = event.target as HTMLAudioElement;
            const current = audio.currentTime;
            const duration = audio.duration;

            this.updatePlayingProgress(current, duration);
        }, {passive: true});

        appEvent.on('ui:psg', event => {
            this.updatePlayingProgress(event.current, event.duration);
        });
    }

    public updatePlayingProgress(current: number, duration: number) {
        if (!Number.isFinite(current) || !Number.isFinite(duration)) return;

        const time = transTime(current);
        if (this.lastTime === time) return;
        this.lastTime = time;

        const percent = clamp(current / (duration || 1), 0, 1) * 100;
        const pgs = percent.toFixed(2);

        if (this.indexPgsPlayed) {
            this.indexPgsPlayed.style.setProperty('--pct', `${pgs}%`);
            this.indexPgsPlayed.value = pgs;
        }
        if (this.playerPgsPlayed) {
            this.playerPgsPlayed.style.setProperty('--pct', `${pgs}%`);
            this.playerPgsPlayed.value = pgs;
        }
        if (this.indexPlayedTime) this.indexPlayedTime.textContent = time;
        if (this.playerPlayedTime) this.playerPlayedTime.textContent = time;
    }

    public mount(target: HTMLElement): Promise<void> {
        switch (target.id) {
            case 'i-progress-played':
                this.indexPgsPlayed = target as HTMLInputElement;
                break;
            case 'i-played-time':
                this.indexPlayedTime = target;
                break;
            case 'progress-played':
                this.playerPgsPlayed = target as HTMLInputElement;
                break;
            case 'played-time':
                this.playerPlayedTime = target;
                break;
        }

        return Promise.resolve();
    }
}