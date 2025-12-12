import {StandardAudio} from "../types/audio";
import {createAlert} from "../utils/front/alert";
import {transTime} from "../utils/math/math";
import {QueueStatus} from "./queue_status";
import {QueueRender} from "./queue_render";
import {PlayerRender} from "../player/player_render";
import {LyricRender} from "../lyric/lyric_render";
import {LyricStatus} from "../lyric/lyric_status";
import {PlayMode} from "../play/play_mode";
import {PlayerStatus} from "../player/player_status";
import {Dsd} from "../spectrum_diagram";
import {PlayErrorHandler} from "../play/error_handler";
import {getPlugin} from "../plugins";

export class QueueController {
    // DOM
    private static readonly authorName = document.getElementById('author-name')!;
    private static readonly musicTitle = document.getElementById('music-title')!;
    private static readonly albumName = document.getElementById('album-name')!;
    private static readonly lyricTitle = document.getElementById('lyric-title')!;
    private static readonly lyricContent = document.getElementById('lyric-ul')!;
    private static readonly indexTotalTime = document.getElementById('i-total-time')!;
    private static readonly playerTotalTime = document.getElementById('audio-time')!;
    private static readonly indexAudioTitle = document.getElementById('index-audio-title')!;
    private static readonly coverPreload = document.getElementById('pre-load')! as HTMLImageElement;
    private static readonly playerBackground = document.getElementById('player-background')!;
    private static readonly indexAudioCover = document.getElementById('index-audio-cover')!;

    private static loadCtrl: AbortController | null = null;

    private static loadAudio(standard: StandardAudio): Promise<boolean> {
        this.indexAudioTitle.firstElementChild!.textContent = standard.title;
        this.indexAudioTitle.lastElementChild!.textContent = standard.artist;

        this.authorName.textContent = standard.artist;
        this.musicTitle.textContent = standard.title;
        this.albumName.textContent = standard.album;
        this.lyricTitle.textContent = standard.title;

        const audio = QueueStatus.getPlayer();
        audio.src = standard.url;
        audio.load();

        this.coverPreload.src = standard.cover;

        this.loadCtrl?.abort();

        const {promise, resolve} = Promise.withResolvers<boolean>();
        const ctrl = new AbortController();
        this.loadCtrl = ctrl;

        let timer: number;
        const settle = (ok: boolean) => {
            if (ctrl.signal.aborted) return;
            ctrl.abort();
            if (timer) clearTimeout(timer);
            resolve(ok);
        };

        timer = setTimeout(() => settle(false), 3E4);

        audio.addEventListener('loadedmetadata', () => {
            settle(true);
        }, {once: true, signal: ctrl.signal});

        audio.addEventListener('error', () => {
            settle(false);
        }, {once: true, signal: ctrl.signal});

        // 外部中断
        ctrl.signal.addEventListener('abort', () => settle(false), {once: true});

        // 若在注册后立刻处于 aborted, 立刻返回
        if (ctrl.signal.aborted) {
            settle(false);
        }
        return promise;
    }

    public static async pauseToggle(play: boolean = true): Promise<boolean> {
        const audio = QueueStatus.getPlayer();

        if (!audio.src) return false;
        try {
            if (audio.paused && play) {
                await audio.play();
                Dsd.DSD.audioContext?.resume().catch(console.error);
                QueueRender.setUiPlay();
            } else {
                audio.pause();
                Dsd.DSD.audioContext?.suspend().catch(console.error);
                QueueRender.setUiPause();
            }
            return true;
        } catch (err) {
            let msg = '未知错误';
            if (err instanceof Error) {
                if (err.name === 'AbortError') return true;
                msg = err.message;
            }

            console.error('Error playing audio:', err);
            createAlert(`无法加载音频: ${msg}`, 'warning');
            QueueRender.setUiPause();
            return false;
        }
    }

    public static async switchAudio(newIndex: number, force = false, play = true, scroll = false): Promise<boolean> {
        if (newIndex < 0 || newIndex >= QueueStatus.getMaxAudioCount()) {
            return false;
        }

        try {
            if (newIndex === QueueStatus.getCurrentIndex() && !force) {
                QueueStatus.getPlayer().currentTime = 0;
                return await this.pauseToggle(play);
            }

            QueueRender.showLoading();
            QueueStatus.setAudioIndex(newIndex);
            const audio = QueueStatus.getCurrentPlaying();
            if (!audio) return false;

            const standard = await getPlugin(audio.plugin)?.parse(audio);
            if (!standard) return false;

            const loaded = await this.loadAudio(standard);
            if (!loaded) return false;

            QueueRender.highlightCurrentPlaying(scroll);

            if (play) return this.pauseToggle();
            return true;
        } finally {
            QueueRender.hideLoading();
        }
    }

    public static initialize() {
        const audio = QueueStatus.getPlayer();

        audio.addEventListener('loadedmetadata', event => {
            // 重置进度条
            const audio = event.target as HTMLAudioElement;
            const total = transTime(audio.duration);
            this.indexTotalTime.textContent = total;
            this.playerTotalTime.textContent = total;

            audio.currentTime = 0;
            PlayerRender.updatePlayingProgress(0);

            // 重置歌词
            this.lyricContent.innerHTML = '<li>加载歌词中 . . .</li>';
            LyricRender.resetLyricPos();
            // 获取歌词
            LyricStatus.fetchLyricFn();
        });

        // 监听暂停已切换图标
        audio.addEventListener('pause', () => {
            if (audio.paused) return this.pauseToggle(false);
        });

        // 音频更新同步显示
        audio.addEventListener('timeupdate', event => {
            const currentTime = (event.target as HTMLAudioElement).currentTime;
            if (PlayerStatus.isPlayerShow && PlayerStatus.isLyricShow) LyricRender.syncLyric(currentTime);
            if (!PlayerStatus.isSeeking) PlayerRender.updatePlayingProgress(currentTime);
        }, {passive: true});

        // 音频跳跃时
        audio.addEventListener('seeked', () => {
            LyricStatus.syncLyricEnable = true;
            LyricRender.significantLeapFn();
        }, {passive: true});

        // 音频结束后下一曲
        audio.addEventListener('ended', () => this.switchAudio(PlayMode.getNextAudioIndex(1)));

        audio.addEventListener('error', PlayErrorHandler.errorHandler);

        this.coverPreload.addEventListener('load', () => {
            this.playerBackground.style.backgroundImage = `url(${this.coverPreload.src})`;
            (this.indexAudioCover.firstElementChild as HTMLImageElement).src = this.coverPreload.src;
        });
    }

    static {
        this.pauseToggle = this.pauseToggle.bind(this);
    }
}



