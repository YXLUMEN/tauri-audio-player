import {BaseCompound} from "../BaseCompound.ts";
import {PlayingQueueChange} from "../../event/PlayingQueueChange.ts";
import {StandardAudio} from "../../types/audio/StandardAudio.ts";
import {appEvent} from "../../event/EventBus.ts";
import {HighlightCurrent} from "../../event/HighlightCurrent.ts";
import {PromisePool} from "../../util/PromisePool.ts";
import {AudioInfos} from "../../types/audio/AudioInfos.ts";
import {ParserPlugin} from "../../plugin/ParserPlugin.ts";
import {Parsers} from "../../plugin/Parsers.ts";
import {QueueCompound} from "./QueueCompound.ts";

export class QueueRenderCompound extends BaseCompound {
    private readonly queueCompound: QueueCompound;
    private queue: HTMLElement | null = null;

    public constructor(queueCompound: QueueCompound) {
        super(true);
        this.queueCompound = queueCompound;
        this.render = this.render.bind(this);
    }

    private async render(event: PlayingQueueChange): Promise<void> {
        if (!this.queue) return;

        const queue = event.queue;
        if (queue.length === 0) {
            this.queue.replaceChildren();
            return;
        }

        const frag = document.createDocumentFragment();
        const tasks: Promise<StandardAudio | null>[] = [];
        const pool = new PromisePool(32);
        const job = (info: AudioInfos, plugin: ParserPlugin) => plugin.parse(info);

        for (const info of queue) {
            const plugin = Parsers.get(info.plugin);
            if (!plugin) continue;
            tasks.push(pool.submit(job, info, plugin));
        }

        let loadFailed = 0;
        const parsed = await Promise.allSettled(tasks);
        for (let i = 0; i < parsed.length; i++) {
            let standard: StandardAudio;
            const result = parsed[i];

            if (result.status === 'rejected') {
                standard = StandardAudio.DEFAULT;
                loadFailed++;
                console.warn(result.reason);
            } else if (result.value === null) {
                continue;
            } else {
                standard = result.value;
            }

            frag.appendChild(this.createPlayingQueueItem(i, standard));
        }

        if (event.replace) {
            this.queue.replaceChildren(frag);
        } else {
            this.queue.append(frag);
        }

        appEvent.emit(new HighlightCurrent());
        if (loadFailed > 0) alert(`${loadFailed} 个文件无法加载`);
    }

    private createPlayingQueueItem(index: number, standardInfo: StandardAudio): HTMLDivElement {
        const row = document.createElement('div');
        row.setAttribute('data-index', index.toString());
        row.classList.add('queue-row');

        const cover = document.createElement('img');
        cover.src = standardInfo.cover;
        cover.classList.add('small-cover');

        const title = document.createElement('div');
        const titleSpan = document.createElement('span');
        const artistSpan = document.createElement('span');
        titleSpan.textContent = standardInfo.title;
        artistSpan.textContent = standardInfo.artist;

        artistSpan.classList.add('less');
        title.classList.add('title');
        title.append(titleSpan, artistSpan);

        row.append(cover, title);
        return row;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.queue = target;

        appEvent.on('queue:change', this.render);

        appEvent.on('queue:highlight', event => {
            const current = target.querySelector(
                `[data-index='${this.queueCompound.index()}']`
            );
            if (!(current instanceof HTMLElement)) return;

            target.querySelector('.queue-row.current')?.classList.remove('current');
            current.classList.add('current');

            if (!event.scroll) return;
            current.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        });

        return Promise.resolve();
    }
}