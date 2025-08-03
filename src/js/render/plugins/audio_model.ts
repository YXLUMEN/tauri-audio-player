import {IAudioInfo, IFormatLyric, IStandardAudio} from "../../interfaces/audio";

export abstract class AbsAudioModel {
    public abstract getPluginName(): string;

    public abstract getAudioList(opt?: any): Promise<IAudioInfo[] | IStandardAudio[]>;

    public abstract getLyric(): Promise<IFormatLyric | null>;

    // 解析为标准音频信息
    public abstract parse(audioInfo: IAudioInfo): Promise<IStandardAudio | null> ;
}
