import {AudioInfoBuilder} from "./AudioInfoBuilder.ts";
import {StandardAudio} from "./StandardAudio.ts";
import {AudioRecord} from "./AudioRecord.ts";

export class StandardInfoBuilder extends AudioInfoBuilder {
    private _title?: string;
    private _album?: string;
    private _artist?: string;
    private _cover?: string;

    public from(item: AudioRecord): this {
        super.from(item);
        if (item instanceof StandardAudio) {
            this._title = item.title;
            this._album = item.album;
            this._artist = item.artist;
            this._cover = item.cover;
        }
        return this;
    }

    public title(title?: string): this {
        this._title = title
        return this;
    }

    public album(album?: string): this {
        this._album = album;
        return this;
    }

    public artist(artist?: string): this {
        this._artist = artist;
        return this;
    }

    public cover(cover?: string): this {
        this._cover = cover;
        return this;
    }

    public build(): StandardAudio {
        if (!this._uid) {
            throw new Error(`AudioInfos required an id`);
        }

        const d = StandardAudio.DEFAULT;
        return new StandardAudio(
            this._uid,
            this._plugin ?? d.plugin,
            this._url ?? d.url,
            this._title ?? d.title,
            this._album ?? d.album,
            this._artist ?? d.artist,
            this._cover ?? d.cover,
        );
    }
}