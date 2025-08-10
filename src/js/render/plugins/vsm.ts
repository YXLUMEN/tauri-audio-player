import {getCurrentPlaying} from "../data";
import createAlert from "../tools/base_page";
import {AbsAudioModel} from "./audio_model";
import {IAudioInfo, IFormatLyric, IStandardAudio, IVSMOptions} from "../../interfaces/audio";
import baseFetch from "../tools/post_methods";
import {IAuthAble} from "./apis";

export class VSM extends AbsAudioModel implements IAuthAble {
    private static readonly AUDIO_LISTS_URL: string = 'https://www.yangandxu.asia/api/asset/audio_lists';
    private static readonly PLAY_URL: string = 'https://www.yangandxu.asia/api/asset/play';
    private static readonly LYRIC_URL: string = 'https://www.yangandxu.asia/api/asset/lyrics';
    private static readonly AUTH_URL: string = 'https://www.yangandxu.asia/api/auth';
    private static readonly REFRESH_URL: string = 'https://www.yangandxu.asia/api/refresh';

    public static vsmCache: Array<IAudioInfo> = [];

    public seq: number;
    public imgIndex: number;
    public maxCount: number;

    private accessToken: string;
    private refreshToken: string;

    constructor() {
        super();

        this.seq = 0;
        this.imgIndex = 0;
        this.maxCount = 0;

        this.transform = this.transform.bind(this);
    }

    public getPluginName(): string {
        return 'vsm'
    }

    public async getAudioList(opts: IVSMOptions = {}): Promise<IAudioInfo[]> {
        if (VSM.vsmCache.length > 0 && !opts.seq && !opts.search) {
            return VSM.vsmCache;
        }

        const res = await baseFetch(VSM.AUDIO_LISTS_URL, {
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

        const json = await res.json();
        if (!json) {
            createAlert('未能获取播放列表', 'warning');
            return [];
        }

        const status = json['status'];
        if (status === 3103) {
            await this.refresh();
            return;
        }
        if (status !== 1009) {
            createAlert(json['msg'], json['category']);
            return [];
        }

        this.maxCount = json['item_counts'];
        if (opts.search) {
            return Object.values(json['audio_dict']).map(this.transform);
        }

        VSM.vsmCache = VSM.vsmCache.concat(Object.values(json['audio_dict']).map(this.transform));
        return VSM.vsmCache;
    }

    public async getLyric(): Promise<IFormatLyric | null> {
        const hash = getCurrentPlaying().id;
        const res = await baseFetch(VSM.LYRIC_URL, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'audio_lyrics': true,
                'audio_hash': hash
            }),
        });
        if (res.status === 404) return null;

        return res.json();
    }

    public async parse(audioInfo: IAudioInfo): Promise<IStandardAudio> {
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

    private transform(raw: Array<string>) {
        return {
            plugin: 'vsm',
            id: raw[4],
            title: raw[1],
            album: raw[2],
            artist: raw[0],
            cover: this.getCover(),
        };
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

    public async login(payload: any): Promise<boolean> {
        try {
            const res = await baseFetch(VSM.AUTH_URL, {
                body: JSON.stringify(payload),
            });

            const {access_token, refresh_token} = await res.json();
            this.accessToken = access_token;
            this.refreshToken = refresh_token;

            localStorage.setItem('vsm-access-token', access_token);
            localStorage.setItem('vsm-refresh-token', refresh_token);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    public async refresh(): Promise<boolean> {
        try {
            const res = await baseFetch(VSM.REFRESH_URL, {
                body: JSON.stringify({refresh_token: this.refreshToken}),
            });

            const result = await res.json();
            if (!result || result['status'] !== 1016) {
                createAlert('无法连接认证服务器', 'warning');
                return false;
            }

            const access_token = result['access_token'];
            this.accessToken = access_token;
            localStorage.setItem('vsm-access-token', access_token);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    public setSeq(num: number): void {
        this.seq = Math.min(this.maxCount, Math.max(0, num));
    }
}