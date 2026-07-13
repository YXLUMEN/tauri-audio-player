import {config} from "../util/util.ts";
import {FormatLyric} from "../types/Lyric.ts";

export const DefaultLyric: FormatLyric = config({
    lyric: [{text: "暂无歌词", time: 0.0}],
    offset: 0
});
