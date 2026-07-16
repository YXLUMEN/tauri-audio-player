import {Comparable} from "../types/Comparable.ts";
import {stringHashCode} from "../util/hash.ts";
import {AudioRecord} from "./AudioRecord.ts";

export class AudioInfos implements Comparable {
    public readonly uid: string;
    public readonly plugin: string;
    public readonly url?: string; // 可以直接播放的链接

    private hashCache: number | null = null;

    public constructor(
        uid: string,
        plugin: string,
        url?: string,
    ) {
        this.uid = uid;
        this.plugin = plugin;
        this.url = url;
    }

    public persistable(parent?: number): AudioRecord {
        return {
            parent,
            uid: this.uid,
            plugin: this.plugin,
            url: this.url,
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
