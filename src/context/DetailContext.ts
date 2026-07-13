import {AudioInfos} from "../types/audio/AudioInfos.ts";


export class DetailContext {
    public readonly audio: HTMLAudioElement
    public queueMerged: boolean = false;

    private readonly content: AudioInfos[] = [];
    private chosen: HTMLElement | null = null;

    public constructor(audio: HTMLAudioElement) {
        this.audio = audio;
    }

    public setChosen(row: HTMLElement | null): void {
        if (this.chosen === row) return;

        this.chosen?.classList.remove('chosen');
        this.chosen = row;
        this.chosen?.classList.add('chosen');
    }

    public getChosen() {
        return this.chosen;
    }

    public setDisplayed(value: AudioInfos[] | null): void {
        if (value === null) {
            this.content.length = 0;
            return;
        }

        for (let i = 0; i < value.length; i++) {
            this.content[i] = value[i];
        }
        this.content.length = value.length;
    }

    public displayed() {
        return this.content;
    }

    public hasContent() {
        return this.content.length > 0;
    }
}