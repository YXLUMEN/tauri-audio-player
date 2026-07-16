import {AudioInfos} from "../audio/AudioInfos.ts";
import {StandardAudio} from "../audio/StandardAudio.ts";
import {FormatLyric} from "../types/Lyric.ts";
import {AudioRecord} from "../audio/AudioRecord.ts";

export abstract class ParserPlugin {
    public readonly name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract parse(item: AudioInfos): Promise<StandardAudio | null>;

    public abstract audios(): Promise<AudioInfos[] | StandardAudio[] | null>;

    public abstract lyrics(id: string): Promise<FormatLyric | null>;

    public abstract isAll(): boolean;

    public init(): Promise<void> {
        return Promise.resolve();
    }

    public reload(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public reAuth(_key: string, _psd: string): Promise<boolean> {
        return Promise.resolve(true);
    }

    public clearCache(): Promise<void> {
        return Promise.resolve();
    }

    public modify(record: AudioRecord) {
        return record;
    }

    public recover(record: AudioRecord) {
        return new AudioInfos(record.uid, record.plugin, record.url);
    }
}