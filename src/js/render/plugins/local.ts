import {getPlugin} from "../data";
import {VSM} from "./vsm.js";
import {ICacheAble} from "./apis";
import {AbsAudioModel} from "./exports";
import {IAudioInfo, IMusicMetadata, IStandardAudio} from "../../interfaces/audio";
import {convertFileSrc, invoke} from '@tauri-apps/api/core';

export class Local extends AbsAudioModel implements ICacheAble {
    public static readonly CACHE_SIZE: number = 64;

    private static pending = new Map<string, Promise<IStandardAudio | null>>();
    private static cache = new Map<string, IStandardAudio>();

    constructor() {
        super();
    }

    public getPluginName(): string {
        return 'local';
    }

    public getAudioList(): Promise<null> {
        throw new Error("Method not implemented.");
    }

    public async getLyric() {
        return {};
    }

    public getCache() {
        return Local.cache;
    }

    public clear(): void {
        for (const entry of Local.cache.values()) {
            URL.revokeObjectURL(entry.cover);
        }

        Local.cache.clear();
        Local.pending.clear();
    }

    public clearUnused(inUseIds: Set<string>): void {
        const cache = Local.cache;
        const toDelete: string[] = [];

        for (const [id, std] of cache) {
            if (!inUseIds.has(id)) {
                URL.revokeObjectURL(std.cover);
                toDelete.push(id);
            }
        }

        toDelete.forEach(id => cache.delete(id));
    }

    public async parse(audioInfo: IAudioInfo): Promise<IStandardAudio | null> {
        const id = audioInfo.id.trim();
        if (!id) return null;

        if (Local.cache.has(id)) {
            const hit = Local.cache.get(id)!;
            // LRU: 移动到尾部
            Local.cache.delete(id);
            Local.cache.set(id, hit);
            return hit;
        }

        if (Local.pending.has(id)) {
            return Local.pending.get(id)!;
        }

        const job = (async (): Promise<IStandardAudio | null> => {
            try {
                const metadata: IMusicMetadata = await invoke('fetch_meta', {
                    path: audioInfo.url,
                });
                if (!metadata) return null;

                let coverUrl: string;
                if (metadata.cover) {
                    const blob = new Blob([new Uint8Array(metadata.cover)], {type: metadata.cover_mime_type});
                    coverUrl = URL.createObjectURL(blob);
                } else {
                    const vsm = getPlugin('vsm');
                    coverUrl = vsm instanceof VSM ? vsm.getCover() : '';
                }

                const standard: IStandardAudio = {
                    plugin: 'local',
                    id,
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    url: convertFileSrc(audioInfo.url),
                    cover: coverUrl,
                }

                Local.cache.set(id, standard);

                if (Local.cache.size > Local.CACHE_SIZE) {
                    const oldestKey = Local.cache.keys().next().value;
                    const oldest = Local.cache.get(oldestKey);
                    if (oldest) URL.revokeObjectURL(oldest.cover);
                    Local.cache.delete(oldestKey);
                }

                return standard
            } catch (err) {
                console.error(err);
                return null;
            } finally {
                Local.pending.delete(id);
            }
        })();

        Local.pending.set(id, job);
        return job;
    }
}