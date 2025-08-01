import {getCurrentPlaying} from "../data";
import createAlert from "../tools/base_page";
import {AbsAudioModel} from "./audio_model";
import {IAudioInfo, IStandardAudio, IVSMOptions} from "../../interfaces/audio";
import baseFetch from "../tools/post_methods";
import {IAuthAble} from "./apis";
import {AuthToken} from "../../http/auth_token";

export class VSM extends AbsAudioModel implements IAuthAble {
    public static readonly PLUGIN_NAME: string = 'vsm';

    private static readonly audioListUrl: string = 'https://www.yangandxu.asia/api/asset/audio_lists';
    private static readonly playUrl: string = 'https://www.yangandxu.asia/api/asset/play';
    private static readonly lyricUrl: string = 'https://www.yangandxu.asia/api/asset/lyrics';

    public static vsmCache: Array<IAudioInfo> = [];

    public seq: number;
    public imgIndex: number;
    public maxCount: number;

    private readonly tokenAuthor: AuthToken;

    constructor() {
        super();

        this.seq = 0;
        this.imgIndex = 0;
        this.maxCount = 0;
        this.tokenAuthor = new AuthToken('https://www.yangandxu.asia/api/auth', 'https://www.yangandxu.asia/api/refresh');

        this.transform = this.transform.bind(this);
    }

    public getPluginName(): string {
        return VSM.PLUGIN_NAME;
    }

    public async getAudioList(opts: IVSMOptions = {}): Promise<IAudioInfo[]> {
        if (VSM.vsmCache.length > 0 && !opts.seq && !opts.search) {
            return VSM.vsmCache;
        }

        const token = this.tokenAuthor.accessToken;
        const res = await baseFetch(`${VSM.audioListUrl}?token=${token}`, {
            body: JSON.stringify({
                'audio_lists': 1,
                'seq': 0,
                'search_string': opts.search || '',
                ...opts,
            })
        });

        const json = await res.json();
        if (!json) {
            createAlert('未能获取播放列表', 'warning');
            return [];
        }

        if (json['status'] !== 1009) {
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

    public async getLyric(): Promise<any> {
        const hash = getCurrentPlaying().id;
        const token = this.tokenAuthor.accessToken;
        const res = await baseFetch(`${VSM.lyricUrl}?token=${token}`, {
            body: JSON.stringify({
                'audio_lyrics': true,
                'audio_hash': hash
            }),
        });
        if (res.status === 404) return null;

        return res.json();
    }

    public async parse(audioInfo: IAudioInfo): Promise<IStandardAudio> {
        const token = this.tokenAuthor.accessToken;
        // @ts-ignore
        return {
            url: `${VSM.playUrl}/${audioInfo.id}?token=${token}`,
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

    public async loadToken(): Promise<void> {
        const access = localStorage.getItem('vsm-access-token');
        if (access) {
            this.tokenAuthor.accessToken = access;
            return;
        }

        const refresh = localStorage.getItem('vsm-refresh-token');
        if (refresh) {
            this.tokenAuthor.refreshToken = refresh;
            await this.tokenAuthor.refresh({refresh_token: refresh});
            return;
        }
    }

    public async login(payload: any): Promise<void> {
        await this.tokenAuthor.authenticate(payload);

        localStorage.setItem('vsm-access-token', this.tokenAuthor.accessToken);
        localStorage.setItem('vsm-refresh-token', this.tokenAuthor.refreshToken);
    }

    public async refresh(): Promise<void> {
        await this.tokenAuthor.refresh({refresh_token: this.tokenAuthor.refreshToken});
    }

    public setSeq(num: number): void {
        this.seq = Math.min(this.maxCount, Math.max(0, num));
    }
}