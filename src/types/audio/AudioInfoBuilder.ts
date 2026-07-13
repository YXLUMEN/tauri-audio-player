import {AudioRecord} from "./AudioRecord.ts";
import {AudioInfos} from "./AudioInfos.ts";

export class AudioInfoBuilder {
    private _uid?: string;
    private _plugin?: string;
    private _url?: string
    private _parent?: number;

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

    public parent(parentId: number) {
        if (parentId < 0 || !Number.isSafeInteger(parentId)) {
            throw new Error(`Invalid parent folder id: ${parentId}`);
        }
        this._parent = parentId;
        return this;
    }

    public from(info: AudioRecord): this {
        this._uid = info.uid;
        this._plugin = info.plugin;
        this._url = info.url;
        this._parent = info.parent;
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
            this._url,
            this._parent,
        );
    }
}