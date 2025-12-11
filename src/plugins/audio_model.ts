import {IAudioInfo, IFormatLyric, IStandardAudio} from "../types/audio";
import {Result} from "../utils/Result";

export abstract class AbsAudioModel {
    public abstract getPluginName(): string;

    public abstract getAudioList(opt?: any): Promise<IAudioInfo[] | IStandardAudio[] | null>;

    public abstract getLyric(): Promise<Result<IFormatLyric | null, Error>>;

    // 解析为标准音频信息
    public abstract parse(audioInfo: IAudioInfo): Promise<IStandardAudio | null>;

    public abstract isAll(): boolean;
}
