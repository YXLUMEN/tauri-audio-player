import {AudioInfos} from "../../audio/AudioInfos.ts";

export class PlayingQueueChange extends Event {
    public readonly queue: ReadonlyArray<AudioInfos>;
    public readonly append: boolean;

    public constructor(queue: AudioInfos[], append: boolean) {
        super('queue:change');
        this.queue = queue;
        this.append = append;
    }
}