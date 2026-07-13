import {AudioInfos} from "../types/audio/AudioInfos.ts";
import {StandardAudio} from "../types/audio/StandardAudio.ts";
import {FormatLyric} from "../types/Lyric.ts";

export abstract class ParserPlugin {
    public readonly name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract parse(info: AudioInfos): Promise<StandardAudio | null>;

    public abstract audios(): Promise<AudioInfos[] | StandardAudio[] | null>;

    public abstract lyrics(id: string): Promise<FormatLyric | null>;

    public abstract isAll(): boolean;

    public load(): Promise<void> {
        return Promise.resolve();
    }

    public reAuth(_key: string, _psd: string) {
        return Promise.resolve();
    }

    public clearCache(): Promise<void> {
        return Promise.resolve();
    }
}