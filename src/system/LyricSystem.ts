import {PageBuilder} from "../page/PageBuilder.ts";
import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {LyricContext} from "../context/LyricContext.ts";
import {LyricScroll} from "../compound/lyric/LyricScroll.ts";
import {LyricRender} from "../compound/lyric/LyricRender.ts";
import {LyricLoader} from "../compound/lyric/LyricLoader.ts";
import {LyricTitle} from "../compound/lyric/LyricTitle.ts";
import {LyricOffset} from "../compound/lyric/LyricOffset.ts";
import {ShortcutSystem} from "./ShortcutSystem.ts";
import {appEvent} from "../event/EventBus.ts";
import {ToggleLyric} from "../event/ToggleLyric.ts";
import {ActionKey} from "../builtin/ActionKey.ts";
import {QueueSystem} from "./QueueSystem.ts";
import {PlayerSystem} from "./PlayerSystem.ts";

export class LyricSystem {
    public static init(builder: PageBuilder, audio: AudioCompound) {
        const context = new LyricContext(audio.audio);

        const render = new LyricRender(context, PlayerSystem.BACKGROUND);

        new LyricLoader(QueueSystem.QUEUE, render);
        builder.singleton('lyric-scroll', new LyricScroll(context));
        builder.singleton('lyric-content-render', render);
        builder.singleton('lyric-title', new LyricTitle());
        builder.singleton('lyric-offset', new LyricOffset(context));

        ShortcutSystem.DISPATCHER.register(ActionKey.PlayerShowLyric, () => appEvent.emit(new ToggleLyric()));
    }
}