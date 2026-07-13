import {BaseCompound} from "../BaseCompound.ts";
import {AudioInfos} from "../../types/audio/AudioInfos.ts";
import {StandardAudio} from "../../types/audio/StandardAudio.ts";
import {Parsers} from "../../plugin/Parsers.ts";
import {appEvent} from "../../event/EventBus.ts";
import {DetailContext} from "../../context/DetailContext.ts";
import {PromisePool} from "../../util/PromisePool.ts";
import {DetailChange} from "../../event/detail/DetailChange.ts";
import {DetailAppend} from "../../event/detail/DetailAppend.ts";
import {DetailRemove} from "../../event/detail/DetailRemove.ts";
import {DetailMove} from "../../event/detail/DetailMove.ts";
import {HighlightCurrent} from "../../event/HighlightCurrent.ts";

export class DetailRender extends BaseCompound {
    private readonly context: DetailContext;
    private container: HTMLElement | null = null;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;

        this.rerender = this.rerender.bind(this);
        this.append = this.append.bind(this);
        this.remove = this.remove.bind(this);
        this.move = this.move.bind(this);
    }

    private async rerender(event: DetailChange) {
        if (!this.container) return;

        this.context.setDisplayed(event.detailContent);

        const queue = this.context.displayed();
        const container = this.container;

        if (queue.length === 0) {
            container.replaceChildren();
            this.showTip(container, '无内容');
            return;
        }

        const frag = await this.createAll(queue);
        container.replaceChildren(frag);
        appEvent.emit(new HighlightCurrent());
    }

    private async append(event: DetailAppend) {
        if (!this.container) return;

        const content = this.context.displayed();
        content.push(...event.infos);

        const frag = await this.createAll(event.infos, content.length - 1);
        this.container.append(frag);
    }

    private async remove(event: DetailRemove) {
        if (!this.container) return;

        const displayed = this.context.displayed();
        const container = this.container;

        const index = event.index;
        const inner = displayed[index];
        const element = container.children[index];

        if (!element || inner.uid !== element.getAttribute('data-uid')) {
            console.warn(`[DetailRender] Remove target mismatch`, inner, element);
            return;
        }

        displayed.splice(index, 1);
        element.remove();

        for (let i = index, len = container.children.length; i < len; i++) {
            const item = container.children[i];
            const idx = i.toString();

            item.setAttribute('data-index', idx);
            const span = item.firstElementChild;
            if (span) span.textContent = idx;
        }
    }

    private async move(event: DetailMove) {
        if (!this.container) return;

        const container = this.container;
        const children = container.children;
        const {from, to} = event;

        if (
            from === to ||
            from < 0 || from >= children.length ||
            to < 0 || to >= children.length
        ) return;

        const node = children[event.from];

        if (to >= children.length - 1) {
            container.appendChild(node);
        } else {
            const adjustedTo = from < to
                ? to + 1
                : to;
            container.insertBefore(node, children[adjustedTo] ?? null);
        }

        const start = Math.min(from, to);
        const end = Math.max(from, to);
        for (let i = start; i <= end; i++) {
            const item = children[i];
            const idx = i.toString();
            item.setAttribute('data-index', idx);
            const playIcon = item.firstElementChild;
            if (playIcon) playIcon.textContent = idx;
        }

        const displayed = this.context.displayed();
        const [moved] = displayed.splice(from, 1);
        displayed.splice(to, 0, moved);
    }

    public mount(target: HTMLElement): Promise<void> {
        this.container = target;

        appEvent.on('detail:content', this.rerender);
        appEvent.on('detail:content:append', this.append);
        appEvent.on('detail:content:remove', this.remove);
        appEvent.on('detail:content:move', this.move);

        return Promise.resolve();
    }

    private async createAll(infos: AudioInfos[], start = 0) {
        const frag = document.createDocumentFragment();
        if (infos.length === 0) return frag;

        if (infos.length === 1) {
            const item = await this.parse(infos[0]);
            if (!item) return frag;
            frag.append(this.createItem(start, item));
            return frag;
        }

        const pool = new PromisePool(8);
        const tasks: Promise<StandardAudio | null>[] = new Array(infos.length);

        for (let i = 0; i < infos.length; i++) {
            tasks[i] = pool.submit(this.parse, infos[i]);
        }

        const results = await Promise.all(tasks);
        for (let i = 0; i < results.length; i++) {
            const standard = results[i];
            if (!standard) continue;
            frag.append(this.createItem(start + i, standard));
        }

        return frag;
    }

    private parse(info: AudioInfos) {
        const plugin = Parsers.get(info.plugin);
        return plugin !== undefined ? plugin.parse(info) : Promise.resolve(null);
    }

    private createItem(index: number, standard: StandardAudio) {
        const row = document.createElement('div');
        row.setAttribute('data-uid', standard.uid);
        row.setAttribute('data-index', index.toString());
        row.classList.add('row');

        const play = document.createElement('div');
        play.classList.add('play-icon');

        play.textContent = index.toString();

        const cover = document.createElement('img');
        cover.src = standard.cover;
        cover.classList.add('small-cover');

        const title = document.createElement('div');
        const titleSpan = document.createElement('span');
        const artistSpan = document.createElement('span');
        titleSpan.textContent = standard.title;
        artistSpan.textContent = standard.artist;

        artistSpan.classList.add('less');
        title.classList.add('title');
        title.append(titleSpan, artistSpan);

        const album = document.createElement('div');
        const span2 = document.createElement('span');
        album.classList.add('album', 'less');
        span2.textContent = standard.album;
        album.append(span2);

        row.append(play, cover, title, album);
        return row;
    }

    private showTip(target: HTMLElement, text: string): void {
        const div = document.createElement("div");
        div.classList.add('load-more');
        const span = document.createElement("span");
        span.classList.add('less');
        span.textContent = text;
        div.append(span);

        target.append(div);
    }
}