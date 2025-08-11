import {VSM} from "./vsm";
import {AbsAudioModel, getPlugin} from "./plugin_init";
import {IAudioInfo, IMusicMetadata, IStandardAudio} from "../api/audio";
import {convertFileSrc, invoke} from '@tauri-apps/api/core';
import {ICacheAble} from "../api/plugin";
import {MemoryLRU} from "../db/memoryLRU";

export class Local extends AbsAudioModel implements ICacheAble {
    private static readonly pending = new Map<string, Promise<IStandardAudio | null>>();
    private static readonly mem = new MemoryLRU<string, IStandardAudio>(64, (event) => {
        const cover = event.value?.cover;
        if (cover) URL.revokeObjectURL(cover);
    });

    constructor() {
        super();
    }

    public getPluginName(): string {
        return 'local';
    }

    public getAudioList(): Promise<null> {
        throw new Error("Method not implemented.");
    }

    public async getLyric(): Promise<null> {
        return null;
    }

    public getCache(): MemoryLRU<string, IStandardAudio> {
        return Local.mem;
    }

    public clear(): void {
        Local.mem.clear(true);
        Local.pending.clear();
    }

    public clearUnused(inUseIds: Set<string>): void {
        const cache = Local.mem;

        for (const entry of cache.stableValues()) {
            if (inUseIds.has(entry.id)) continue;
            URL.revokeObjectURL(entry.cover);
            cache.delete(entry.id);
        }
    }

    public async parse(audioInfo: IAudioInfo): Promise<IStandardAudio | null> {
        const id = audioInfo.id.trim();
        if (!id) return null;

        const cacheStd = Local.mem.get(id);
        if (cacheStd) return cacheStd;

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
                    url: convertFileSrc(audioInfo.url!),
                    cover: coverUrl,
                }

                Local.mem.set(id, standard);

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

    public isAll(): boolean {
        return true;
    }
}