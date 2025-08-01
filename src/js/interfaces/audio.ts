export interface IAudioInfo {
    plugin: string; // 加载的插件
    id: string; // 唯一标识,如hash,uuid
    url?: string; // 可以直接播放的链接
    parent?: number; // 父文件夹
    index?: number // 播放序列
}

export interface IMusicMetadata {
    title: string;
    album: string;
    artist: string;
    cover?: number[];
    cover_mime_type?: string;
}

export interface IStandardAudio extends IAudioInfo {
    title: string;
    album: string;
    artist: string;
    cover: string;
    url: string;
}

export interface IVSMOptions {
    seq?: number;
    search?: string;
}

export interface ILyric {
    time: number,
    text: string,
    ex?: string
}

export interface ISwitchAudio {
    scroll?: boolean,
    play?: boolean,
    force?: boolean,
}