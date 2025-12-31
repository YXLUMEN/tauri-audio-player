import {AudioModel} from "./audio_model";
import {AudioInfo, IArtOptions, IFormatLyric, StandardAudio} from "../types/audio";
import baseFetch from "../http/post_methods";
import {IAuthAble} from "../types/plugin";
import {Result} from "../utils/Result";
import {createAlert} from "../utils/front/alert";
import {QueueStatus} from "../playing_queue/queue_status";
import {IndexController} from "../index/index_controller";
import {IndexRender} from "../index/index_render";
import {getPlugin} from "./index";
import {clamp} from "../utils/Math";
import {AsyncResult} from "../utils/AsyncResult";

export class ART extends AudioModel implements IAuthAble {
    private static readonly cache: AudioInfo[] = [];
    private static readonly AUDIO_LISTS_URL: string = 'https://arctic-red-tide.xyz/api/asset/audio_lists';
    private static readonly PLAY_URL: string = 'https://arctic-red-tide.xyz/api/asset/play';
    private static readonly LYRIC_URL: string = 'https://arctic-red-tide.xyz/api/asset/lyrics';
    private static readonly AUTH_URL: string = 'https://arctic-red-tide.xyz/api/auth';
    private static readonly REFRESH_URL: string = 'https://arctic-red-tide.xyz/api/refresh';

    public seq: number = 0;
    public imgIndex: number = 0;
    public maxCount: number = 0;

    private accessToken: string = '';
    private refreshToken: string = '';

    public constructor() {
        super();
    }

    public static getCache() {
        return this.cache;
    }

    public getPluginName(): string {
        return 'art'
    }

    public async getAudioList(opts: IArtOptions = {}): Promise<AudioInfo[]> {
        if (ART.cache.length > 0 && !opts.seq && !opts.search) {
            return ART.cache;
        }

        const resp = baseFetch(ART.AUDIO_LISTS_URL, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'audio_lists': 1,
                'seq': 0,
                'search_string': opts.search || '',
                ...opts,
            }),
        });

        const result = await AsyncResult.from(resp)
            .map(resp => resp.json() as Promise<Record<string, any>>)
            .mapErr(async error => {
                console.error(`Error while fetch from 'art': ${error}`);
                return null;
            })
            .unwrap();

        const optional = result.ok();
        if (optional.isEmpty()) {
            createAlert('未能获取播放列表', 'warning');
            return [];
        }

        const json = optional.get();
        const status = Number(json['status']);
        if (status === 3103) {
            await this.refresh();
            return [];
        }
        if (status !== 1009) {
            createAlert(json['msg'], json['category']);
            return [];
        }

        const maxCount = Number(json['item_counts']);
        this.maxCount = Number.isSafeInteger(maxCount) ? maxCount : 0;

        const infos = Object.values(json['audio_dict'])
            .filter(raw => Array.isArray(raw))
            .filter(arr => arr.every(item => typeof item === 'string'))
            .map(arr => this.transform(arr));

        if (opts.search) {
            return infos;
        }

        ART.cache.push(...infos);
        return ART.cache;
    }

    public override async getLyric(): Promise<Result<IFormatLyric | null, Error>> {
        const hash = QueueStatus.getCurrentPlaying()?.id;
        if (!hash) return Result.ok(null);
        const result = await baseFetch(ART.LYRIC_URL, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'audio_lyrics': true,
                'audio_hash': hash
            }),
        });

        if (result.isErr()) return Result.err(result.unwrapErr());
        const resp = result.ok().get();

        if (resp.status === 404) return Result.ok(null);
        return Result.ok(await resp.json());
    }

    public async parse(audioInfo: AudioInfo): Promise<StandardAudio> {
        // @ts-ignore
        return {
            url: `${ART.PLAY_URL}/${audioInfo.id}?token=${this.accessToken}`,
            ...audioInfo
        };
    }

    public getCover(): string {
        this.imgIndex = (this.imgIndex + 1) % 30;
        return `/img/audio/cover/audio-${this.imgIndex}.webp`;
    }

    public isAll(): boolean {
        return this.seq === this.maxCount;
    }

    public async loadToken(): Promise<void> {
        const access = localStorage.getItem('art-access-token');
        if (access) {
            this.accessToken = access;
        }

        const refresh = localStorage.getItem('art-refresh-token');
        if (refresh) {
            this.refreshToken = refresh;
            return;
        }
        await this.refresh();
    }

    public async login(payload: any): Promise<Result<Promise<boolean>, boolean>> {
        const result = await baseFetch(ART.AUTH_URL, {
            body: JSON.stringify(payload),
        });

        return result
            .map(async resp => {
                const {access_token, refresh_token} = await resp.json();
                this.accessToken = access_token;
                this.refreshToken = refresh_token;

                localStorage.setItem('art-access-token', access_token);
                localStorage.setItem('art-refresh-token', refresh_token);
                return true;
            })
            .mapErr(error => {
                console.error(error);
                return false;
            });
    }

    public async refresh(): Promise<Result<Promise<boolean>, boolean>> {
        const result = await baseFetch(ART.REFRESH_URL, {
            body: JSON.stringify({refresh_token: this.refreshToken}),
        });

        return result
            .map(async resp => {
                const json = await resp.json();
                if (!json || json['status'] !== 1016) {
                    createAlert('无法连接认证服务器', 'warning');
                    return false;
                }

                const access_token = json['access_token'];
                this.accessToken = access_token;
                localStorage.setItem('art-access-token', access_token);
                return true;
            })
            .mapErr(error => {
                console.error(error);
                return false;
            });
    }

    public setSeq(num: number): void {
        this.seq = clamp(num, 0, this.maxCount);
    }

    private transform(raw: string[]): ArtAudioInfo {
        return {
            plugin: 'art',
            id: raw[4],
            title: raw[1],
            album: raw[2],
            artist: raw[0],
            cover: this.getCover(),
        };
    }

    public static async artAdd(): Promise<void> {
        if (IndexController.getChosenFolder()?.getAttribute('plugin') !== 'art') return;

        const plugin = getPlugin('art');
        if (plugin instanceof ART) {
            plugin.setSeq(plugin.seq + 32);
            if (plugin.seq < plugin.maxCount) {
                await plugin.getAudioList({seq: plugin.seq});
            }

            await IndexRender.setDisplayFolder(ART.cache);
            if (!plugin.isAll()) IndexRender.showContentTip('显示更多');
            requestAnimationFrame(() => QueueStatus.mergePlayingQueue(IndexRender.displayedContent));
        }
    }
}

interface ArtAudioInfo {
    plugin: 'art';
    id: string;
    title: string;
    album: string;
    artist: string;
    cover: string;
}