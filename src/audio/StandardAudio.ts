import {AudioInfos} from "./AudioInfos.ts";
import {stringHashCode} from "../util/hash.ts";
import {StandardRecord} from "./AudioRecord.ts";

export class StandardAudio extends AudioInfos {
    public static readonly DEFAULT = new StandardAudio(
        '__default__',
        'none',
        '',
        'unknown',
        'unknown',
        'unknown',
        ''
    );

    declare public readonly url: string;
    public readonly title: string;
    public readonly album: string;
    public readonly artist: string;
    public readonly cover: string;

    public constructor(
        id: string,
        plugin: string,
        url: string,
        title: string,
        album: string,
        artist: string,
        cover: string,
    ) {
        super(id, plugin, url);
        this.title = title;
        this.album = album;
        this.artist = artist;
        this.cover = cover;
    }

    public persistable(parent?: number): StandardRecord {
        return {
            parent,
            uid: this.uid,
            plugin: this.plugin,
            url: this.url,
            title: this.title,
            album: this.album,
            artist: this.artist,
            cover: this.cover,
        };
    }

    protected override genHashCode(): number {
        let hash = super.genHashCode();
        hash = (hash * 31 + stringHashCode(this.title)) | 0;
        hash = (hash * 31 + stringHashCode(this.album)) | 0;
        hash = (hash * 31 + stringHashCode(this.artist)) | 0;
        return hash;
    }

    public equal(other: unknown): boolean {
        if (!super.equal(other)) return false;
        if (other instanceof StandardAudio) {
            return other.title === this.title &&
                other.album === this.album &&
                other.artist === this.artist;
        }
        return false;
    }
}