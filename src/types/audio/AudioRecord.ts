export interface AudioRecord {
    readonly uid: string;
    readonly plugin: string;
    readonly url?: string;
    parent?: number;
}