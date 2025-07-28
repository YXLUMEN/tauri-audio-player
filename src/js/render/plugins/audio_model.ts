import {IAudioInfo, IStandardAudio} from "../../type/audio";

export abstract class AbsAudioModel {
    public abstract getAudioList(opt?: any): Promise<IAudioInfo[] | IStandardAudio[]>;

    public abstract getLyric(): Promise<{}>;

    // 解析为标准音频信息
    public abstract parse(audioInfo: IAudioInfo): Promise<IStandardAudio | null> ;
}
