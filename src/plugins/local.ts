import {VSM} from "./vsm";
import {AudioInfo, IFormatLyric, MusicMetadata, StandardAudio} from "../types/audio";
import {convertFileSrc, invoke} from '@tauri-apps/api/core';
import {ICacheAble} from "../types/plugin";
import {MemoryLRU} from "../utils/collection/MemoryLRU";
import {Result} from "../utils/Result";
import {AbsAudioModel, getPlugin} from "./index";

export class Local extends AbsAudioModel implements ICacheAble {
    private static readonly pending = new Map<string, Promise<StandardAudio | null>>();
    private static readonly mem = new MemoryLRU<string, StandardAudio>(
        64,
        event => {
            const cover = event.value?.cover;
            if (cover) URL.revokeObjectURL(cover);
        });

    public constructor() {
        super();
    }

    public getPluginName(): string {
        return 'local';
    }

    public getAudioList(): Promise<null> {
        return Promise.resolve(null);
    }

    public async getLyric(): Promise<Result<IFormatLyric | null, Error>> {
        return Result.ok(null);
    }

    public getCache(): MemoryLRU<string, StandardAudio> {
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

    public async parse(audioInfo: AudioInfo): Promise<StandardAudio | null> {
        const id = audioInfo.id.trim();
        if (!id) return null;

        const cacheStd = Local.mem.get(id);
        if (cacheStd) return cacheStd;

        if (Local.pending.has(id)) {
            return Local.pending.get(id)!;
        }

        const task = this.parseTask(audioInfo, id);
        Local.pending.set(id, task);
        return task;
    }

    private async parseTask(audioInfo: AudioInfo, id: string): Promise<StandardAudio | null> {
        try {
            if (!audioInfo.url || audioInfo.url.trim().length === 0) return null;

            const metadata: MusicMetadata = await invoke('fetch_meta', {
                path: audioInfo.url,
            });
            if (!metadata) return null;

            const coverUrl = this.buildCoverUrl(metadata);
            const standard = this.buildStandardAudio(id, audioInfo.url, metadata, coverUrl);

            Local.mem.set(id, standard);
            return standard;
        } catch (error) {
            console.error('Failed to parse local audio:', error);
            return null;
        } finally {
            Local.pending.delete(id);
        }
    }

    private buildCoverUrl(metadata: MusicMetadata): string {
        if (metadata.cover) {
            const blob = new Blob(
                [new Uint8Array(metadata.cover)],
                {type: metadata.cover_mime_type}
            );
            return URL.createObjectURL(blob);
        } else {
            const vsm = getPlugin('vsm');
            return vsm instanceof VSM ? vsm.getCover() : '';
        }
    }

    private buildStandardAudio(
        id: string,
        originalPath: string,
        metadata: MusicMetadata,
        coverUrl: string
    ): StandardAudio {
        return {
            plugin: 'local',
            id,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            url: convertFileSrc(originalPath),
            cover: coverUrl,
        };
    }

    public isAll(): boolean {
        return true;
    }
}