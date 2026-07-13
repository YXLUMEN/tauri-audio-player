export interface Lyric {
    readonly time: number,
    readonly text: string,
    readonly ex?: string
}

export interface FormatLyric {
    readonly lyric: Lyric[]
    readonly offset: number;
}