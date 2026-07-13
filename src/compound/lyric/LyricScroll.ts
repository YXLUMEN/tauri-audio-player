import {BaseCompound} from "../BaseCompound.ts";
import {LyricContext} from "../../context/LyricContext.ts";
import {Consumer} from "../../types/types.ts";
import {debounce} from "../../util/util.ts";

export class LyricScroll extends BaseCompound {
    private readonly context: LyricContext;
    private readonly enableScrollLyric: Consumer<void>;

    private lyricContent: HTMLElement | null = null;

    public constructor(context: LyricContext) {
        super(true);
        this.context = context;

        this.wheelRollingLyrics = this.wheelRollingLyrics.bind(this);
        this.enableScrollLyric = debounce(() => {
            this.context.syncLyricEnable = true;
        }, 1E4);
    }

    private wheelRollingLyrics(event: WheelEvent) {
        if (!this.lyricContent) return;

        this.context.syncLyricEnable = false;

        const currentTransformValue = Number(this.lyricContent.style.transform.match(/-?\d+/)?.[0] || -40);
        let deltaLine = event.deltaY > 0 ? 2 : -2 * this.context.lineOffset + currentTransformValue;

        deltaLine = Math.max(Math.min(deltaLine, 0), this.context.maxScrollHeight);

        this.lyricContent.style.transform = `translateY(${deltaLine}px)`;
        this.enableScrollLyric();
    }

    public mount(target: HTMLElement): Promise<void> {
        this.lyricContent = this.assert(target, '#lyric-ul');

        target.addEventListener('wheel', this.wheelRollingLyrics, {passive: true});

        this.lyricContent.addEventListener('click', (event) => {
            if (this.context.lyrArray.length <= 1) return;
            const target = (event.target as HTMLElement).closest('.text');
            if (!target) return;

            const leap = Number(target.getAttribute('time'));
            if (isNaN(leap)) return;
            this.context.audio.currentTime = leap;
        });

        return Promise.resolve();
    }
}