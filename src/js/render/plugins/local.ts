import {getPlugin} from "../data";
import {VSM} from "./vsm.js";
import {CacheAble} from "./cache_able";
import {AbsAudioModel} from "./exports";
import {IAudioInfo, IMusicMetadata, IStandardAudio} from "../../type/audio";
import {convertFileSrc, invoke} from '@tauri-apps/api/core';

export class Local extends AbsAudioModel implements CacheAble {
    private static urlCache = new Map<string, string>();
    private static fileCache = new Map<string, IStandardAudio>();

    constructor() {
        super();
    }

    public getAudioList(): Promise<Promise<IAudioInfo[]> | Promise<IStandardAudio[]>> {
        throw new Error("Method not implemented.");
    }

    public async getLyric() {
        return {};
    }

    public getCache() {
        return Local.urlCache;
    }

    public clear() {
        // @ts-ignore
        for (const url of Local.urlCache.values()) {
            URL.revokeObjectURL(url);
        }

        Local.urlCache.clear();
        Local.fileCache.clear();
    }

    public getCover(blob: Blob, id: string): string {
        if (!blob) {
            const vsm = getPlugin('vsm');
            if (vsm instanceof VSM) {
                return vsm.getCover();
            }
        }

        if (Local.urlCache.has(id)) {
            return Local.urlCache.get(id);
        }

        const url: string = URL.createObjectURL(blob);
        Local.urlCache.set(id, url);

        return url;
    }

    public async parse(audioInfo: IAudioInfo): Promise<IStandardAudio | null> {
        try {
            if (Local.fileCache.has(audioInfo.id)) {
                return Local.fileCache.get(audioInfo.id);
            }

            // @ts-ignore
            let extension: string = audioInfo.url.split('.').at(-1);
            if (!(extension in ['flac', 'mp3', 'ogg'])) extension = '';

            const metadata: IMusicMetadata = await invoke('get_audio_metadata', {path: audioInfo.url, extension});
            if (!metadata) return;

            const {title, artist, album} = metadata;
            const url: string = convertFileSrc(audioInfo.url);

            let blob: Blob | null = null;
            const picture = metadata.cover;
            if (picture) {
                const byteArray = new Uint8Array(picture);
                blob = new Blob([byteArray], {type: metadata.cover_mime_type});
            }
            const cover: string = this.getCover(blob, audioInfo.id.trim());

            const standard = {plugin: 'local', id: audioInfo.id, title, artist, album, url, cover}
            Local.fileCache.set(audioInfo.id, standard);

            if (Local.fileCache.size > 32) {
                const first: string = Local.fileCache.keys().next().value;
                if (!first) return;
                Local.fileCache.delete(first);
            }

            return standard
        } catch (err) {
            console.error(err);
        }
    }
}