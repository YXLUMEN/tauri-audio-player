import {debounce, throttleTimeOut} from "../utils/util";
import {defaultLyrics} from "../config/default";
import {QueueStatus} from "../playing_queue/queue_status";
import {LyricRender} from "./lyric_render";
import {ILyric} from "../types/audio";
import {PlayerStatus} from "../player/player_status";
import {getPlugin} from "../plugins";

export class LyricStatus {
    private static readonly lyricContent = document.getElementById('lyric-ul')!;
    private static readonly textContainer = document.getElementById('text-container')!;
    private static readonly lyricContainer = document.getElementById('lyric-container')!;
    private static readonly playerBox = document.getElementById('player-box')!;
    private static readonly lyricBox = document.getElementById('lyric-box')!;
    private static readonly lyricOffsetSetter = document.getElementById('set-lyric-offset')!;
    private static readonly lyricOffsetDisplayer = document.getElementById('lyric-offset')!;

    public static readonly SIGNIFICANT_LAG_RATIO = 3;

    public static currentLine = 0;
    public static centralPos = 0;
    public static lineOffset = -50;

    // 系统偏移量
    public static lyricOffset = 0;
    public static customLyricOffset = 0;

    public static maxScrollHeight = 0;
    public static lyrArray: ILyric[] = [];
    public static syncLyricEnable = true;

    public static fetchLyricFn = debounce(async () => {
        const current = QueueStatus.getCurrentPlaying();
        if (!current) return;
        const plugin = getPlugin(current.plugin);
        if (!plugin) return;

        const result = await plugin.getLyric();
        result
            .map(lyric => {
                LyricRender.formatLyrics(lyric ?? defaultLyrics);
            })
            .mapErr(error => {
                LyricRender.formatLyrics(defaultLyrics);
                console.warn(`Failed to fetch lyrics: ${error}`);
            });

        LyricRender.highlightLine();
    }, 3000);

    public static lyricDisplayFn = throttleTimeOut(() => {
        this.textContainer.classList.toggle('hide');
        this.lyricContainer.classList.toggle('hide');
        PlayerStatus.isLyricShow = this.playerBox.classList.toggle('show-lyric');
    }, 600);

    // 重启歌词同步
    public static reEnableScrollLyric = debounce(() => {
        this.syncLyricEnable = true;
        LyricRender.significantLeapFn();
    }, 1E4);

    // 滚轮控制歌词
    public static wheelRollingLyrics(direction = -2) {
        this.syncLyricEnable = false;

        const currentTransformValue = Number(this.lyricContent.style.transform.match(/-?\d+/)?.[0] || -40);
        let deltaLine = direction * this.lineOffset + currentTransformValue;

        deltaLine = Math.max(Math.min(deltaLine, 0), this.maxScrollHeight);

        this.lyricContent.style.transform = `translateY(${deltaLine}px)`;
        this.reEnableScrollLyric();
    }

    public static initialize() {
        this.lyricContent.addEventListener('click', (event) => {
            if (this.lyrArray.length <= 1) return;
            const target = (event.target as HTMLElement).closest('.text');
            if (!target) return;

            const leap = Number(target.getAttribute('time'));
            if (isNaN(leap)) return;
            QueueStatus.getPlayer().currentTime = leap;
        });

        this.lyricBox.addEventListener('wheel', event => {
            this.wheelRollingLyrics(event.deltaY > 0 ? 2 : -2);
        }, {passive: true});

        this.lyricOffsetSetter.addEventListener('click', event => {
            const target = (event.target as HTMLElement).closest('img');
            if (!target) return;

            const offset = target.alt;
            if (offset) this.customLyricOffset += Number(offset);
            else this.customLyricOffset = 0;

            this.lyricOffsetDisplayer.textContent = offset ? this.customLyricOffset.toFixed(1) : '';
        });
    }

    static {
        this.lyricDisplayFn = this.lyricDisplayFn.bind(this);
    }
}