import {StandardAudio} from "../types/audio/StandardAudio.ts";

export class AudioTitleChange extends Event {
    public readonly standard: StandardAudio;

    public constructor(standard: StandardAudio) {
        super('ui:audio-title', {bubbles: false});
        this.standard = standard;
    }
}