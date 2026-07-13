import {AudioInfos} from "../../types/audio/AudioInfos.ts";
import {clamp} from "../../util/Math.ts";
import {SwitchAudio} from "../../event/SwitchAudio.ts";
import {PlayingQueueChange} from "../../event/PlayingQueueChange.ts";
import {appEvent} from "../../event/EventBus.ts";
import {HighlightCurrent} from "../../event/HighlightCurrent.ts";

export class QueueCompound {
    private readonly audio: HTMLAudioElement;
    private readonly queue: AudioInfos[] = [];
    private audioIndex: number = -1;

    public constructor(audio: HTMLAudioElement) {
        this.audio = audio;
    }

    public at(index: number): AudioInfos | undefined {
        return this.queue[index];
    }

    public index(): number {
        return this.audioIndex;
    }

    public setIndex(index: number): void {
        if (!Number.isSafeInteger(index)) {
            console.warn('AudioIndex must be a positive integer');
            return;
        }
        this.audioIndex = clamp(index, 0, this.queue.length - 1);
    }

    public setIndexUnclamp(index: number): void {
        if (!Number.isSafeInteger(index)) {
            console.warn('AudioIndex must be a positive integer');
            return;
        }
        this.audioIndex = index;
    }

    public current(): AudioInfos | null {
        return this.queue[this.audioIndex] ?? null;
    }

    public length(): number {
        return this.queue.length;
    }

    public override(queue: AudioInfos[]): void {
        for (let i = 0; i < queue.length; i++) {
            this.queue[i] = queue[i];
        }
        this.queue.length = queue.length;
        this.emit();
    }

    public merge(queue: AudioInfos[]): void {
        const merged = this.queue.concat(queue);
        QueueCompound.removeDuplicateInplace(merged);
        this.override(merged);
    }

    public add(audio: AudioInfos): void {
        this.queue.push(audio);
        this.emit(false);
    }

    public push(audios: AudioInfos[]): void {
        for (const audio of audios) {
            this.queue.push(audio);
        }
        this.emit(false);
    }

    public insert(at: number, ...audios: AudioInfos[]): void {
        const index = clamp(at, 0, this.queue.length);
        this.queue.splice(index, 0, ...audios);
        this.emit();
    }

    public move(from: number, to: number): void {
        if (from < 0 || from >= this.queue.length) return;
        if (to < 0 || to >= this.queue.length) return;
        if (from === to) return;

        const index = this.audioIndex;
        if (from === index) {
            this.setIndexUnclamp(to);
        } else if (from < index && to >= index) {
            this.setIndexUnclamp(index - 1);
        } else if (from > index && to <= index) {
            this.setIndexUnclamp(index + 1);
        }

        const [audio] = this.queue.splice(from, 1);
        this.queue.splice(to, 0, audio);

        this.emit();
        appEvent.emit(new HighlightCurrent());
    }

    public remove(index: number): void {
        if (index < 0 || index > this.queue.length) return;

        if (index < this.audioIndex) {
            this.setIndex(this.audioIndex - 1);
        } else if (this.queue.length === 1) {
            this.clear();
            return;
        }

        if (index === this.audioIndex) {
            appEvent.emit(new SwitchAudio(this.audioIndex + 1, false, false));
            this.setIndex(index);
        }

        this.queue.splice(index, 1);
        this.emit();
    }

    public clear(): void {
        if (this.queue.length === 0) return;
        this.audio.pause();
        this.audio.removeAttribute('src');

        this.queue.length = 0;
        this.setIndex(-1);
        this.emit();
    }

    public iter() {
        return this.queue.values();
    }

    private emit(replace: boolean = true): void {
        appEvent.emit(new PlayingQueueChange(this.queue, replace));
    }

    public static removeDuplicateInplace(array: AudioInfos[]): void {
        if (array.length === 0) return;

        const seen = new Set<string>();
        let w = 0;

        for (let r = 0; r < array.length; r++) {
            const id = array[r].uid;

            if (seen.has(id)) continue;
            seen.add(id);

            array[w] = array[r];
            w++;
        }

        array.length = w;
    }
}