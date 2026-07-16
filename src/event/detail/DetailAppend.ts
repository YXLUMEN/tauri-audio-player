import {AudioInfos} from "../../audio/AudioInfos.ts";

export class DetailAppend extends Event {
    public readonly infos: AudioInfos[];

    public constructor(...infos: AudioInfos[]) {
        super('detail:content:append');
        this.infos = infos;
    }
}