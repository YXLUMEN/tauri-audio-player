import {AudioInfos} from "../../types/audio/AudioInfos.ts";

export class DetailChange extends Event {
    public readonly detailContent: AudioInfos[] | null;

    public constructor(details: AudioInfos[] | null) {
        super('detail:content');
        this.detailContent = details;
    }
}