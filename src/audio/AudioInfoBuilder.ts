import {AudioRecord} from "./AudioRecord.ts";
import {AudioInfos} from "./AudioInfos.ts";

export class AudioInfoBuilder {
    protected _uid?: string;
    protected _plugin?: string;
    protected _url?: string

    public uid(uid: string) {
        this._uid = uid;
        return this;
    }

    public plugin(name: string) {
        this._plugin = name;
        return this;
    }

    public url(url: string) {
        this._url = url;
        return this;
    }

    public from(info: AudioRecord): this {
        this._uid = info.uid;
        this._plugin = info.plugin;
        this._url = info.url;
        return this;
    }

    public build() {
        if (!this._uid) {
            throw new Error(`AudioInfos required an id`);
        }
        if (!this._plugin) {
            throw new Error(`AudioInfos plugin requires a plugin`);
        }

        return new AudioInfos(
            this._uid,
            this._plugin,
            this._url
        );
    }
}