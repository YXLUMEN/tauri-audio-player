import {AudioInfos} from "../types/audio/AudioInfos.ts";

export class PlayingQueueChange extends Event {
    public readonly queue: ReadonlyArray<AudioInfos>;
    public readonly replace: boolean;

    public constructor(queue: AudioInfos[], replace: boolean) {
        super('queue:change');
        this.queue = queue;
        this.replace = replace;
    }
}