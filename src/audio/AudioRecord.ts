export interface AudioRecord {
    readonly parent?: number;
    readonly uid: string;
    readonly plugin: string;
    url?: string;
}

export interface StandardRecord extends AudioRecord {
    readonly title: string;
    readonly album: string;
    readonly artist: string;
    cover: string;
}