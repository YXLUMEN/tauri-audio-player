import {QueueCompound} from "./QueueCompound.ts";
import {appEvent} from "../../event/EventBus.ts";
import {ToggleLoading} from "../../event/queue/ToggleLoading.ts";
import {HighlightCurrent} from "../../event/queue/HighlightCurrent.ts";
import {StandardAudio} from "../../audio/StandardAudio.ts";
import {AudioTitleChange} from "../../event/AudioTitleChange.ts";
import {SwitchAudio} from "../../event/queue/SwitchAudio.ts";
import {CoverLoaded} from "../../event/CoverLoaded.ts";
import {Parsers} from "../../plugin/Parsers.ts";
import {PlayErrorHandler} from "./PlayErrorHandler.ts";
import {createAlert} from "../../util/alert.ts";
import {AlertCategories} from "../../types/AlertCategories.ts";

export class ControllerCompound {
    private readonly audio: HTMLAudioElement;
    private readonly queue: QueueCompound;
    private readonly errorHandler: PlayErrorHandler;
    private readonly preload: HTMLImageElement;
    private loadCtrl: AbortController | null = null;

    public constructor(audio: HTMLAudioElement, queue: QueueCompound, errorHandler: PlayErrorHandler) {
        this.audio = audio;
        this.queue = queue;
        this.errorHandler = errorHandler;

        this.preload = new Image();
        this.preload.decoding = 'async';

        this.switch = this.switch.bind(this);
        this.catchErr = this.catchErr.bind(this);
        this.bind();
    }

    private async switch(event: SwitchAudio): Promise<void> {
        const index = event.index;
        if (index < 0 || index >= this.queue.length()) {
            return;
        }

        try {
            if (index === this.queue.index() && !event.force) {
                this.audio.currentTime = 0;
                this.togglePause(event.instantPlay);
                return;
            }

            appEvent.emit(new ToggleLoading(true));
            this.queue.setIndex(index);

            const audio = this.queue.current();
            if (!audio) return;

            const standard = await Parsers.get(audio.plugin)?.parse(audio);
            if (!standard) return;

            const loaded = await this.loadAudio(standard);
            if (!loaded) return;

            appEvent.emit(new HighlightCurrent(event.scroll));
            if (event.instantPlay) this.togglePause();
        } finally {
            appEvent.emit(new ToggleLoading(false));
        }
    }

    public togglePause(play: boolean = true): void {
        if (!this.audio.src) return;

        if (this.audio.paused && play) {
            this.audio.play().catch(this.catchErr);
            return;
        }
        this.audio.pause();
    }

    private loadAudio(standard: StandardAudio): Promise<boolean> {
        appEvent.emit(new AudioTitleChange(standard));

        const audio = this.audio;
        audio.src = standard.url;
        audio.load();

        this.preload.src = standard.cover;
        this.loadCtrl?.abort();

        const {promise, resolve} = Promise.withResolvers<boolean>();
        const ctrl = new AbortController();
        this.loadCtrl = ctrl;

        let timer: number | undefined;
        const settle = (ok: boolean) => {
            ctrl.abort();
            clearTimeout(timer);
            resolve(ok);
        };

        timer = setTimeout(settle, 3E4, false);

        audio.addEventListener('canplay', () => {
            settle(true);
        }, {once: true, signal: ctrl.signal});

        audio.addEventListener('error', () => {
            settle(false);
        }, {once: true, signal: ctrl.signal});

        // 外部中断
        ctrl.signal.addEventListener('abort', () => {
            this.loadCtrl = null;
            settle(false);
        }, {once: true});

        // 若在注册后立刻处于 aborted, 立刻返回
        if (ctrl.signal.aborted) {
            settle(false);
        }
        return promise;
    }

    private bind() {
        appEvent.on('queue:switch', this.switch);
        this.audio.addEventListener('play', () => {
            if (this.audio.paused) return this.togglePause(false);
        });
        this.preload.addEventListener('load', () => appEvent.emit(new CoverLoaded(this.preload.src)));
    }

    private catchErr(err: unknown) {
        if (Error.isError(err)) {
            switch (err.name) {
                case 'AbortError':
                    this.togglePause(true);
                    return;
                case 'NotAllowedError':
                    this.errorHandler.abort();
                    console.warn('播放被阻止');
                    break;
                case 'NotSupportedError':
                    this.errorHandler.abort();
                    createAlert('不支持的音频源', AlertCategories.WARN);
            }
        }

        console.error('Error playing audio:', err);
        this.audio.pause();
    }
}