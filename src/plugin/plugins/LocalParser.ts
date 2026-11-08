import {AudioInfos} from "../../audio/AudioInfos.ts";
import {FormatLyric} from "../../types/Lyric.ts";
import {StandardAudio} from "../../audio/StandardAudio.ts";
import {ParserPlugin} from "../ParserPlugin.ts";
import {MemoryLRU} from "../../util/MemoryLRU.ts";
import {convertFileSrc} from "@tauri-apps/api/core";
import {AudioMeta} from "../../audio/AudioMeta.ts";
import {randomCover} from "../../util/random.ts";
import {fetchMeta} from "../../util/ipc.ts";
import {StandardInfoBuilder} from "../../audio/StandardInfoBuilder.ts";

export class LocalParser extends ParserPlugin {
    private readonly pending: Map<string, Promise<StandardAudio>> = new Map();
    private readonly cache = new MemoryLRU<string, StandardAudio>(
        64,
        event => {
            const cover = event.value?.cover;
            if (cover) URL.revokeObjectURL(cover);
        }
    );
    private epoch: number = 0;

    public parse(info: AudioInfos): Promise<StandardAudio> {
        const uid = info.uid;
        const cache = this.cache.get(uid);
        if (cache) return Promise.resolve(cache);

        return this.pending.getOrInsertComputed(uid, () => this.parseTask(info, this.epoch));
    }

    private async parseTask(info: AudioInfos, epoch: number): Promise<StandardAudio> {
        const uid = info.uid;
        const builder = new StandardInfoBuilder().from(info);

        try {
            const path = info.url === undefined ? '' : info.url.trim();
            if (path.length === 0) return builder.build();

            const metadata = await fetchMeta(path);
            if (!metadata || epoch !== this.epoch) return builder.build();

            const coverUrl = this.buildCoverUrl(metadata);
            const standard = builder
                .plugin('local')
                .url(convertFileSrc(path))
                .title(metadata.title)
                .album(metadata.album || StandardAudio.DEFAULT.album)
                .artist(metadata.artist || StandardAudio.DEFAULT.artist)
                .cover(coverUrl)
                .build();

            this.cache.set(uid, standard);
            return standard;
        } catch (error) {
            console.error('Failed to parse local audio:', error);
            return builder.build();
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

    public audios(): Promise<AudioInfos[] | StandardAudio[] | null> {
        return Promise.resolve(null);
    }

    public lyrics(): Promise<FormatLyric | null> {
        return Promise.resolve(null);
    }

    public isAll(): boolean {
        return true;
    }

    public override async clearCache() {
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