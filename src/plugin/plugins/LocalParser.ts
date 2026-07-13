import {AudioInfos} from "../../types/audio/AudioInfos.ts";
import {FormatLyric} from "../../types/Lyric.ts";
import {StandardAudio} from "../../types/audio/StandardAudio.ts";
import {ParserPlugin} from "../ParserPlugin.ts";
import {MemoryLRU} from "../../util/MemoryLRU.ts";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {AudioMeta} from "../../types/audio/AudioMeta.ts";
import {randomCover} from "../../util/random.ts";

export class LocalParser extends ParserPlugin {
    private readonly pending: Map<string, Promise<StandardAudio | null>> = new Map();
    private readonly cache = new MemoryLRU<string, StandardAudio>(
        64,
        event => {
            const cover = event.value?.cover;
            if (cover) URL.revokeObjectURL(cover);
        }
    );
    private epoch: number = 0;

    public parse(info: AudioInfos): Promise<StandardAudio | null> {
        const uid = info.uid;
        const cache = this.cache.get(uid);
        if (cache) return Promise.resolve(cache);

        return this.pending.getOrInsertComputed(uid, () => this.parseTask(info, uid, this.epoch));
    }

    private async parseTask(info: AudioInfos, uid: string, epoch: number): Promise<StandardAudio | null> {
        try {
            const url = info.url === undefined ? '' : info.url.trim();
            if (url.length === 0) return null;

            const metadata: AudioMeta = await invoke('fetch_meta', {
                path: url,
            });
            if (!metadata || epoch !== this.epoch) return null;

            const coverUrl = this.buildCoverUrl(metadata);
            const standard = this.buildStandardAudio(uid, url, metadata, coverUrl);

            this.cache.set(uid, standard);
            return standard;
        } catch (error) {
            console.error('Failed to parse local audio:', error);
            return null;
        } finally {
            this.pending.delete(uid);
        }
    }

    private buildCoverUrl(metadata: AudioMeta): string {
        if (!metadata.cover) return randomCover();

        const blob = new Blob(
            [new Uint8Array(metadata.cover)],
            {type: metadata.cover_mime_type}
        );
        return URL.createObjectURL(blob);
    }

    private buildStandardAudio(
        id: string,
        originalPath: string,
        metadata: AudioMeta,
        coverUrl: string
    ): StandardAudio {
        return new StandardAudio(
            id,
            'local',
            convertFileSrc(originalPath),
            metadata.title,
            metadata.album || StandardAudio.DEFAULT.album,
            metadata.artist || StandardAudio.DEFAULT.artist,
            coverUrl
        );
    }

    public audios(): Promise<AudioInfos[] | StandardAudio[] | null> {
        return Promise.resolve(null);
    }

    public lyrics(): Promise<FormatLyric | null> {
        return Promise.resolve(null);
    }

    public isAll(): boolean {
        return true;
    }

    public async clearCache() {
        this.epoch++;
        this.cache.clear();
        await Promise.allSettled(this.pending.values());
    }

    public clearUnused(using: Set<string>): void {
        for (const value of this.cache.values()) {
            if (using.has(value.uid)) continue;
            this.cache.delete(value.uid);
        }
    }
}