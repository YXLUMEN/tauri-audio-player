import {Lyric} from "../types/Lyric.ts";

export class LyricContext {
    public readonly audio: HTMLAudioElement;

    public currentLine = 0;
    public centralPos = 0;
    public lineOffset = -50;

    // 系统偏移量
    public lyricOffset = 0;
    public customLyricOffset = 0;

    public maxScrollHeight = 0;
    public lyrArray: Lyric[] = [];
    public syncLyricEnable = true;

    public constructor(audio: HTMLAudioElement) {
        this.audio = audio;
    }
}