import {AudioInfos} from "../../audio/AudioInfos.ts";
import {StandardAudio} from "../../audio/StandardAudio.ts";
import {FormatLyric} from "../../types/Lyric.ts";
import {ParserPlugin} from "../ParserPlugin.ts";
import {AudioRecord} from "../../audio/AudioRecord.ts";

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

    public modify(record: AudioRecord): AudioRecord {
        return super.modify(record);
    }

    public recover(record: AudioRecord): AudioInfos {
        return super.recover(record);
    }
}