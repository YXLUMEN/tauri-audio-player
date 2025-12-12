import {AbsAudioModel} from "./audio_model";
import {AudioInfo, IFormatLyric, StandardAudio, IVSMOptions} from "../types/audio";
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

export class VSM extends AbsAudioModel implements IAuthAble {
    private static readonly vsmCache: AudioInfo[] = [];
    private static readonly AUDIO_LISTS_URL: string = 'https://www.yangandxu.asia/api/asset/audio_lists';
    private static readonly PLAY_URL: string = 'https://www.yangandxu.asia/api/asset/play';
    private static readonly LYRIC_URL: string = 'https://www.yangandxu.asia/api/asset/lyrics';
    private static readonly AUTH_URL: string = 'https://www.yangandxu.asia/api/auth';
    private static readonly REFRESH_URL: string = 'https://www.yangandxu.asia/api/refresh';

    public seq: number = 0;
    public imgIndex: number = 0;
    public maxCount: number = 0;

    private accessToken: string = '';
    private refreshToken: string = '';

    public constructor() {
        super();
    }

    public static getCache() {
        return this.vsmCache;
    }

    public getPluginName(): string {
        return 'vsm'
    }

    public async getAudioList(opts: IVSMOptions = {}): Promise<AudioInfo[]> {
        if (VSM.vsmCache.length > 0 && !opts.seq && !opts.search) {
            return VSM.vsmCache;
        }

        const resp = baseFetch(VSM.AUDIO_LISTS_URL, {
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
                console.error(`Error while fetch from vsm: ${error}`);
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

        const maxCount = Number(json['maxCount']);
        this.maxCount = Number.isSafeInteger(maxCount) ? maxCount : 0;

        const infos = Object.values(json['audio_dict'])
            .filter(raw => Array.isArray(raw))
            .filter(arr => arr.every(item => typeof item === 'string'))
            .map(arr => this.transform(arr));

        if (opts.search) {
            return infos;
        }

        VSM.vsmCache.push(...infos);
        return VSM.vsmCache;
    }

    public override async getLyric(): Promise<Result<IFormatLyric | null, Error>> {
        const hash = QueueStatus.getCurrentPlaying()?.id;
        if (!hash) return Result.ok(null);
        const result = await baseFetch(VSM.LYRIC_URL, {
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
            url: `${VSM.PLAY_URL}/${audioInfo.id}?token=${this.accessToken}`,
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
        const access = localStorage.getItem('vsm-access-token');
        if (access) {
            this.accessToken = access;
        }

        const refresh = localStorage.getItem('vsm-refresh-token');
        if (refresh) {
            this.refreshToken = refresh;
            return;
        }
        await this.refresh();
    }

    public async login(payload: any): Promise<Result<Promise<boolean>, boolean>> {
        const result = await baseFetch(VSM.AUTH_URL, {
            body: JSON.stringify(payload),
        });

        return result
            .map(async resp => {
                const {access_token, refresh_token} = await resp.json();
                this.accessToken = access_token;
                this.refreshToken = refresh_token;

                localStorage.setItem('vsm-access-token', access_token);
                localStorage.setItem('vsm-refresh-token', refresh_token);
                return true;
            })
            .mapErr(error => {
                console.error(error);
                return false;
            });
    }

    public async refresh(): Promise<Result<Promise<boolean>, boolean>> {
        const result = await baseFetch(VSM.REFRESH_URL, {
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
                localStorage.setItem('vsm-access-token', access_token);
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

    private transform(raw: string[]): VsmAudioInfo {
        return {
            plugin: 'vsm',
            id: raw[4],
            title: raw[1],
            album: raw[2],
            artist: raw[0],
            cover: this.getCover(),
        };
    }

    public static async vsmAdd(): Promise<void> {
        if (IndexController.getChosenFolder()?.getAttribute('plugin') !== 'vsm') return;

        const vsm = getPlugin('vsm');
        if (vsm instanceof VSM) {
            vsm.setSeq(vsm.seq + 32);
            if (vsm.seq < vsm.maxCount) {
                await vsm.getAudioList({seq: vsm.seq});
            }

            await IndexRender.setDisplayFolder(VSM.vsmCache);
            if (!vsm.isAll()) IndexRender.showContentTip('显示更多');
            requestAnimationFrame(() => QueueStatus.mergePlayingQueue(IndexRender.displayedContent));
        }
    }

    static {
        this.vsmAdd = this.vsmAdd.bind(this);
    }
}

interface VsmAudioInfo {
    plugin: 'vsm';
    id: string;
    title: string;
    album: string;
    artist: string;
    cover: string;
}