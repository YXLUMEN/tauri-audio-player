import {AudioInfo, IFormatLyric, StandardAudio} from "../types/audio";
import {Result} from "../utils/Result";

export abstract class AbsAudioModel {
    public abstract getPluginName(): string;

    public abstract getAudioList(opt?: any): Promise<AudioInfo[] | StandardAudio[] | null>;

    public abstract getLyric(): Promise<Result<IFormatLyric | null, Error>>;

    // 解析为标准音频信息
    public abstract parse(audioInfo: AudioInfo): Promise<StandardAudio | null>;

    public abstract isAll(): boolean;
}
