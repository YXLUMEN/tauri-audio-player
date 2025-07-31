import {getCurrentPlaying} from "../data";
import createAlert from "../tools/base_page";
import {AbsAudioModel} from "./audio_model";
import {IAudioInfo, IStandardAudio, IVSMOptions} from "../../type/audio";
import {fetch} from '@tauri-apps/plugin-http';

export class VSM extends AbsAudioModel {
    private static audioListUrl = 'https://www.yangandxu.asia/audio/audio_lists';
    private static playUrl = 'https://www.yangandxu.asia/audio/play';
    private static lyricUrl = 'https://www.yangandxu.asia/audio/lyrics';

    public static vsmCache: Array<IAudioInfo> = [];

    public seq: number;
    public imgIndex: number;
    public maxCount: number;

    constructor() {
        super();

        this.seq = 0;
        this.imgIndex = 0;
        this.maxCount = 0;

        this.transform = this.transform.bind(this);
    }

    public async getAudioList(opts: IVSMOptions = {}): Promise<IAudioInfo[]> {
        if (VSM.vsmCache.length > 0 && !opts.seq && !opts.search) {
            return VSM.vsmCache;
        }

        const res = await fetch(VSM.audioListUrl, {
            body: JSON.stringify({
                'audio_lists': 1,
                'seq': 0,
                'search_string': opts.search || '',
                ...opts,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST'
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

    public async getLyric() {
        const hash = getCurrentPlaying().id;
        const res = await fetch(VSM.lyricUrl, {
            body: JSON.stringify({
                'audio_lyrics': true,
                'audio_hash': hash
            }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST'
        });
        if (res.status === 404) return null;

        return res.json();
    }

    public async parse(audioInfo: IAudioInfo): Promise<IStandardAudio> {
        // @ts-ignore
        return {
            url: `${VSM.playUrl}/${audioInfo.id}`,
            ...audioInfo
        };
    }

    public getCover() {
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

    public setSeq(num: number): void {
        this.seq = Math.min(this.maxCount, Math.max(0, num));
    }
}