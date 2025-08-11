import {IAudioInfo, IFormatLyric, IStandardAudio} from "../api/audio";

export abstract class AbsAudioModel {
    public abstract getPluginName(): string;

    public abstract getAudioList(opt?: any): Promise<IAudioInfo[] | IStandardAudio[] | null>;

    public abstract getLyric(): Promise<IFormatLyric | null>;

    // 解析为标准音频信息
    public abstract parse(audioInfo: IAudioInfo): Promise<IStandardAudio | null>;

    public abstract isAll(): boolean;
}
