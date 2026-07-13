import {AudioInfos} from "../../types/audio/AudioInfos.ts";
import {FormatLyric} from "../../types/Lyric.ts";
import {StandardAudio} from "../../types/audio/StandardAudio.ts";
import {ParserPlugin} from "../ParserPlugin.ts";
import baseFetch from "../../http/post_methods.ts";
import {createAlert} from "../../util/alert.ts";
import {randomCover} from "../../util/random.ts";
import {clamp} from "../../util/Math.ts";
import {ArtAuth} from "../../http/ArtAuth.ts";
import {appEvent} from "../../event/EventBus.ts";
import {DetailChange} from "../../event/detail/DetailChange.ts";

export class ArtParser extends ParserPlugin {
    private static readonly AUDIO_LISTS_URL: string = 'https://arctic-red-tide.xyz/api/asset/audio_lists';
    private static readonly PLAY_URL: string = 'https://arctic-red-tide.xyz/api/asset/play';
    private static readonly LYRIC_URL: string = 'https://arctic-red-tide.xyz/api/asset/lyrics';

    private readonly auth = new ArtAuth();
    private readonly cache: AudioInfos[] = [];

    private maxCount: number = 0;
    private seq: number = 0;
    private refresh: boolean = false;
    private searchString: string = '';

    public parse(info: StandardAudio): Promise<StandardAudio | null> {
        return Promise.resolve(new StandardAudio(
            info.uid,
            this.name,
            this.resolveUrl(info.uid),
            info.title,
            info.album,
            info.artist,
            info.cover,
            info.parent
        ));
    }

    public async audios(): Promise<AudioInfos[] | StandardAudio[] | null> {
        if (this.cache.length > 0 && !this.refresh && !this.searchString) {
            return this.cache;
        }
        this.refresh = false;

        const resp = await baseFetch(ArtParser.AUDIO_LISTS_URL, {
            headers: {
                'Authorization': `Bearer ${this.auth.access()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'audio_lists': 1,
                'seq': this.seq,
                'search_string': this.searchString,
            }),
        });

        const json = await resp
            .map(resp => resp.json() as Promise<Record<string, any>>)
            .mapErr(err => {
                console.error(`Error while fetch from 'art': ${err}`);
                return Promise.resolve(null);
            })
            .unwrap();

        if (json == null) {
            createAlert('未能获取播放列表', 'warning');
            return null;
        }

        const status = Number(json['status']);
        if (isNaN(status)) {
            console.warn('Response status invalid');
            return null;
        }

        if (status === 3103) {
            await this.auth.refresh();
            return null;
        }

        if (status !== 1009) {
            createAlert(json['msg'], json['category']);
            return null;
        }

        const maxCount = Number(json['item_counts']);
        this.maxCount = Number.isSafeInteger(maxCount) ? maxCount : 0;

        const infos = Object.values(json['audio_dict'])
            .values()
            .filter(raw => Array.isArray(raw))
            .filter(arr => arr.every(item => typeof item === 'string'))
            .map(raw => this.transform(raw));

        if (this.searchString.length > 0) {
            return infos.toArray();
        }

        this.cache.push(...infos);
        return this.cache;
    }

    public async lyrics(id: string): Promise<FormatLyric | null> {
        const result = await baseFetch(ArtParser.LYRIC_URL, {
            headers: {
                'Authorization': `Bearer ${this.auth.access()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'audio_lyrics': true,
                'audio_hash': id
            }),
        });

        if (result.isErr()) {
            return null;
        }
        const resp = result.unwrap();
        try {
            if (resp.status === 404) return null;
            const formated = await resp.json() as FormatLyric;

            if (formated.lyric == null) {
                return null;
            }
            if (formated.offset == null) {
                return {
                    lyric: formated.lyric,
                    offset: 0
                };
            }
            return formated;
        } catch (err) {
            console.warn(`Failed to fetch lyrics: ${err}`);
            return null;
        }
    }

    public isAll(): boolean {
        return this.seq === this.maxCount;
    }

    public setSeq(num: number): void {
        this.seq = clamp(num, 0, this.maxCount);
    }

    public setSearch(search: string): void {
        this.searchString = search;
    }

    public clearSearch(): void {
        this.searchString = '';
    }

    public async loadMore(): Promise<void> {
        const nextSeq = this.seq + 32;
        if (nextSeq < this.maxCount) {
            this.seq = nextSeq;
            this.refresh = true;
            appEvent.emit(new DetailChange(await this.audios()));
        }
    }

    private transform(raw: string[]): StandardAudio {
        return new StandardAudio(
            raw[4],
            this.name,
            this.resolveUrl(raw[4]),
            raw[1],
            raw[2],
            raw[0],
            randomCover()
        );
    }

    private resolveUrl(id: string) {
        return `${ArtParser.PLAY_URL}/${id}?token=${this.auth.access()}`;
    }

    public clearCache(): Promise<void> {
        this.cache.length = 0;
        this.seq = 0;
        return Promise.resolve();
    }

    public async reAuth(key: string, psd: string): Promise<void> {
        await this.auth.login(key, psd);
    }

    public load(): Promise<void> {
        return this.auth.loadToken();
    }
}

