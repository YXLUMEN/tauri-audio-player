import {AudioInfos} from "../../audio/AudioInfos.ts";
import {StandardAudio} from "../../audio/StandardAudio.ts";
import {FormatLyric} from "../../types/Lyric.ts";
import {ParserPlugin} from "../ParserPlugin.ts";

export class EmptyParser extends ParserPlugin {
    public parse(): Promise<StandardAudio | null> {
        return Promise.resolve(null);
    }

    public audios(): Promise<AudioInfos[] | StandardAudio[] | null> {
        return Promise.resolve(null);
    }

    public lyrics(): Promise<FormatLyric | null> {
        return Promise.resolve(null);
    }

    public isAll(): boolean {
        return true;
    }
}