import {appEvent} from "../../event/EventBus.ts";
import {debounce} from "../../util/util.ts";
import {Parsers} from "../../plugin/Parsers.ts";
import {DefaultLyric} from "../../builtin/DefaultLyric.ts";
import {LyricRender} from "./LyricRender.ts";
import {QueueCompound} from "../queue/QueueCompound.ts";

export class LyricLoader {
    public constructor(queue: QueueCompound, render: LyricRender) {
        const fetchLyric = debounce(async () => {
            const current = queue.current();
            if (!current) return;

            const plugin = Parsers.get(current.plugin);
            if (!plugin) return;

            const formated = await plugin.lyrics(current.uid) ?? DefaultLyric;
            render.formatLyrics(formated);
            render.highlightLine();
        }, 3000);

        appEvent.on('lyric:load', fetchLyric);
    }
}