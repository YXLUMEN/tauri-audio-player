import {IFormatLyric, ILyric} from "../types/audio";
import {appendChildren} from "../utils/front/element";
import {defaultLyrics} from "../config/default";
import {debounce} from "../utils/util";
import {transTime} from "../utils/math/math";
import {QueueStatus} from "../playing_queue/queue_status";
import {PlayerRender} from "../player/player_render";
import {LyricStatus} from "./lyric_status";

export class LyricRender {
    private static readonly lyricContent = document.getElementById('lyric-ul')!;

    private static createLyricRow(value: ILyric, offset: number): HTMLDivElement {
        const {time, text, ex = ''} = value;

        const item = document.createElement('div');
        item.classList.add('lyric-item');

        const divText = document.createElement('div');
        divText.classList.add('text');
        divText.setAttribute('time', time.toString());
        divText.textContent = text;

        const exSpan = document.createElement('span');
        exSpan.textContent = ex;
        divText.appendChild(exSpan);

        const timeSpan = document.createElement('span');
        timeSpan.textContent = transTime(time + offset);
        timeSpan.classList.add('time');

        appendChildren(item, divText, timeSpan);
        return item;
    }

    public static formatLyrics(lyrics: IFormatLyric): void {
        const {lyric = defaultLyrics.lyric, offset = 0} = lyrics;
        if (!lyric) throw new Error('no lyrics found');

        LyricStatus.lyrArray = lyric;
        LyricStatus.lyricOffset = offset;

        const frag = document.createDocumentFragment();
        lyric.forEach(row => frag.append(this.createLyricRow(row, offset)));

        this.lyricContent.replaceChildren(frag);

        LyricStatus.maxScrollHeight = (lyric.length - 1) * LyricStatus.lineOffset;
    }

    // 重置滚动
    public static resetLyricPos(): void {
        this.lyricContent.querySelector('.highlight-line')?.setAttribute('class', '');
        this.lyricContent.style.transform = 'translateY(0)';
        LyricStatus.currentLine = 0;
    }

    // 高亮当前播放行
    public static highlightLine(): void {
        const allLyricRows = this.lyricContent.children;
        if (allLyricRows.length <= 1) return;

        const {currentLine, centralPos, syncLyricEnable, lineOffset} = LyricStatus;
        const NEAR_LINE_COUNT = 4;

        if (currentLine > 0) {
            const prevElement = allLyricRows[currentLine - 1];
            if (prevElement) {
                prevElement.classList.remove('highlight-line');
                prevElement.classList.add('near-line');
            }

            // Remove 'near-line' from element 3 lines above
            allLyricRows[currentLine - 3]?.classList.remove('near-line');

            // Add 'near-line' to the next few lines
            for (let i = NEAR_LINE_COUNT; i--;) {
                const nextElement = allLyricRows[currentLine + i];
                if (!nextElement) break;
                nextElement.classList.add('near-line');
            }
        }

        allLyricRows[currentLine]?.classList.add('highlight-line');

        if (syncLyricEnable && currentLine > centralPos) {
            this.lyricContent.style.transform = `translateY(${(currentLine - centralPos) * lineOffset}px)`
        }
    }

    // 跨度较大时快速跳转歌词
    public static significantLeapFn = debounce(() => {
        const {lyrArray, currentLine, centralPos, syncLyricEnable} = LyricStatus;
        const length = lyrArray?.length || 0;
        const liElements = this.lyricContent.children;

        if (length <= 1 || !liElements) return;

        const currentTime = QueueStatus.getPlayer().currentTime;
        const LOOK_AHEAD = 4;

        const start = Math.max(currentLine - LOOK_AHEAD, 0);
        const end = Math.min(currentLine + LOOK_AHEAD, length);
        for (let i = start; i < end; i++) {
            liElements.item(i)?.classList.remove('highlight-line', 'near-line');
        }

        if (lyrArray[1]?.time >= currentTime) {
            if (syncLyricEnable) this.lyricContent.style.transform = 'translateY(0)';
            LyricStatus.currentLine = 0;
            this.highlightLine();
            return;
        }

        for (let i = 0; i < length; i++) {
            const isLastLyric = i === length - 1;
            const currentLyricTime = lyrArray[i].time;
            const nextLyricTime = isLastLyric ? Infinity : lyrArray[i + 1].time;

            if (currentLyricTime <= currentTime && currentTime < nextLyricTime) {
                LyricStatus.currentLine = i;
                if (syncLyricEnable && i < centralPos * 2) {
                    this.lyricContent.style.transform = 'translateY(0)';
                }
                break;
            }
        }

        this.highlightLine();
        PlayerRender.updatePlayingProgress(currentTime);
    }, 100);

    // 同步歌词
    public static syncLyric(currentTime: number): void {
        const {currentLine, lyrArray, lyricOffset, customLyricOffset} = LyricStatus;

        if (currentLine >= lyrArray.length || lyrArray.length <= 1) return;

        const adjustedCurrentTime = currentTime + lyricOffset + customLyricOffset;
        const lyrTime = lyrArray[currentLine].time;

        if (lyrTime * LyricStatus.SIGNIFICANT_LAG_RATIO <= adjustedCurrentTime) {
            this.significantLeapFn();
            return;
        }

        if (lyrTime <= adjustedCurrentTime) {
            this.highlightLine();
            LyricStatus.currentLine += 1;
        }
    }
}

