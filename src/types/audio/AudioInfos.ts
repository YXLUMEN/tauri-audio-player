import {Comparable} from "../Comparable.ts";
import {stringHashCode} from "../../util/hash.ts";
import {AudioRecord} from "./AudioRecord.ts";

export class AudioInfos implements AudioRecord, Comparable {
    public readonly uid: string;
    public readonly plugin: string;
    public readonly url?: string; // 可以直接播放的链接
    public readonly parent?: number; // 文件夹 id
    private hashCache: number | null = null;

    public constructor(
        uid: string,
        plugin: string,
        url?: string,
        parent?: number,
    ) {
        this.uid = uid;
        this.plugin = plugin;
        this.url = url;
        this.parent = parent;
    }

    public static from(info: AudioRecord) {
        return new AudioInfos(info.uid, info.plugin, info.url, info.parent);
    }

    public persistable(): AudioRecord {
        return {
            uid: this.uid,
            plugin: this.plugin,
            url: this.url,
            parent: this.parent,
        };
    }

    public hashCode(): number {
        if (this.hashCache === null) {
            this.hashCache = this.genHashCode();
        }

        return this.hashCache;
    }

    public equal(other: unknown): boolean {
        if (other === this) return true;

        if (other instanceof AudioInfos) {
            return other.uid === this.uid &&
                other.plugin === this.plugin &&
                other.url === this.url;
        }
        return false;
    }

    protected genHashCode(): number {
        let hash = stringHashCode(this.plugin);
        hash = hash * 31 + stringHashCode(this.uid);
        return hash | 0;
    }
}
