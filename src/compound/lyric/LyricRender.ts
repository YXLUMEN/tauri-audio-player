import {BaseCompound} from "../BaseCompound.ts";
import {FormatLyric, Lyric} from "../../types/Lyric.ts";
import {LyricContext} from "../../context/LyricContext.ts";
import {transTime} from "../../util/Math.ts";
import {appEvent} from "../../event/EventBus.ts";
import {ForceUpdateProgressBar} from "../../event/ForceUpdateProgressBar.ts";
import {debounce} from "../../util/util.ts";
import {PlayerSystem} from "../../system/PlayerSystem.ts";
import {LoadLyric} from "../../event/LoadLyric.ts";

export class LyricRender extends BaseCompound {
    private readonly context: LyricContext;

    private lyricContent: HTMLElement | null = null;

    public constructor(context: LyricContext) {
        super();
        this.context = context;

        this.syncLyric = this.syncLyric.bind(this);
        context.audio.addEventListener('timeupdate', this.syncLyric);

        context.audio.addEventListener('seeked', () => {
            context.syncLyricEnable = true;
            this.significantLeap();
        }, {passive: true});

        context.audio.addEventListener('loadedmetadata', () => {
            if (this.lyricContent) this.lyricContent.innerHTML = '<li>加载歌词中 . . .</li>';
            this.resetLyricPos();
            appEvent.emit(new LoadLyric());
        });
    }

    public formatLyrics(lyrics: FormatLyric): void {
        if (!this.lyricContent) return;

        const {lyric, offset} = lyrics;

        this.context.lyrArray = lyric;
        this.context.lyricOffset = offset;

        const frag = document.createDocumentFragment();
        lyric.forEach(row => frag.append(this.createLyricRow(row, offset)));
        this.lyricContent.replaceChildren(frag);

        this.context.maxScrollHeight = (lyric.length - 1) * this.context.lineOffset;
    }

    public highlightLine(): void {
        if (!this.lyricContent) return;

        const allLyricRows = this.lyricContent.children;
        if (allLyricRows.length <= 1) return;

        const {currentLine, centralPos, syncLyricEnable, lineOffset} = this.context;
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

    private significantLeap = debounce(() => {
        if (!this.lyricContent) return;

        const {lyrArray, currentLine, centralPos, syncLyricEnable} = this.context;
        const length = lyrArray.length;
        const liElements = this.lyricContent.children;

        if (length <= 1 || !liElements) return;

        const currentTime = this.context.audio.currentTime;
        const LOOK_AHEAD = 4;

        const start = Math.max(currentLine - LOOK_AHEAD, 0);
        const end = Math.min(currentLine + LOOK_AHEAD, length);
        for (let i = start; i < end; i++) {
            liElements.item(i)?.classList.remove('highlight-line', 'near-line');
        }

        if (lyrArray[1]?.time >= currentTime) {
            if (syncLyricEnable) this.lyricContent.style.transform = 'translateY(0)';
            this.context.currentLine = 0;
            this.highlightLine();
            return;
        }

        for (let i = 0; i < length; i++) {
            const isLastLyric = i === length - 1;
            const currentLyricTime = lyrArray[i].time;
            const nextLyricTime = isLastLyric ? Infinity : lyrArray[i + 1].time;

            if (currentLyricTime <= currentTime && currentTime < nextLyricTime) {
                this.context.currentLine = i;
                if (syncLyricEnable && i < centralPos * 2) {
                    this.lyricContent.style.transform = 'translateY(0)';
                }
                break;
            }
        }

        this.highlightLine();
        appEvent.emit(new ForceUpdateProgressBar(this.context.audio.duration, currentTime));
    }, 100);

    private syncLyric(event: Event): void {
        if (!PlayerSystem.BACKGROUND.lyricDisplaying()) return;

        const currentTime = (event.target as HTMLAudioElement).currentTime;
        if (!Number.isFinite(currentTime)) return;

        const {currentLine, lyrArray, lyricOffset, customLyricOffset} = this.context;
        if (currentLine >= lyrArray.length || lyrArray.length <= 1) return;

        const adjustedCurrentTime = currentTime + lyricOffset + customLyricOffset;
        const lyrTime = lyrArray[currentLine].time;

        if (lyrTime * 3 <= adjustedCurrentTime) {
            this.significantLeap();
            return;
        }

        if (lyrTime <= adjustedCurrentTime) {
            this.highlightLine();
            this.context.currentLine += 1;
        }
    }

    private resetLyricPos(): void {
        if (this.lyricContent) {
            this.lyricContent.querySelector('.highlight-line')?.setAttribute('class', '');
            this.lyricContent.style.transform = 'translateY(0)';
        }

        this.context.currentLine = 0;
    }

    private createLyricRow(value: Lyric, offset: number): HTMLDivElement {
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

        item.append(divText, timeSpan);
        return item;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.lyricContent = target;
        return Promise.resolve();
    }
}