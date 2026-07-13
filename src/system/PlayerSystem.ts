import {PageBuilder} from "../page/PageBuilder.ts";
import {PlayerProgressBar} from "../compound/player/PlayerProgressBar.ts";
import {PlayerProgressRender} from "../compound/player/PlayerProgressRender.ts";
import {PlayerContext} from "../context/PlayerContext.ts";
import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {PlayerBackground} from "../compound/player/PlayerBackground.ts";
import {PlayerAudioBox} from "../compound/player/PlayerAudioBox.ts";
import {PlayIconCompound} from "../compound/player/PlayIconCompound.ts";
import {ModeIconCompound} from "../compound/player/ModeIconCompound.ts";
import {ShortcutSystem} from "./ShortcutSystem.ts";
import {ShortcutAction} from "../builtin/ShortcutAction.ts";
import {PlayerVolume} from "../compound/player/PlayerVolume.ts";
import {PlayerControllerBtn} from "../compound/player/PlayerControllerBtn.ts";
import {PlayerTitle} from "../compound/player/PlayerTitle.ts";
import {AudioTotalTimeRender} from "../compound/player/AudioTotalTimeRender.ts";
import {QueueSystem} from "./QueueSystem.ts";
import {UiSystem} from "./UiSystem.ts";

export class PlayerSystem {
    public static BACKGROUND: PlayerBackground;

    public static init(builder: PageBuilder, compound: AudioCompound): void {
        const context = new PlayerContext(compound, QueueSystem.QUEUE, QueueSystem.CONTROLLER);

        const background = new PlayerBackground(context);
        this.BACKGROUND = background;
        const psgRender = new PlayerProgressRender(context);
        const modeIcon = new ModeIconCompound();
        const volume = new PlayerVolume(context);

        builder.singleton('player-background', background);
        builder.singleton('player-psg-render', psgRender);
        builder.singleton('player-psg-bar', new PlayerProgressBar(context, psgRender));
        builder.singleton('player-audio-box', new PlayerAudioBox(background));
        builder.singleton('play-icon', new PlayIconCompound(compound.audio));
        builder.singleton('mode-icon', modeIcon);
        builder.singleton('player-volume', volume);
        builder.singleton('player-controller-btn', new PlayerControllerBtn(context, QueueSystem.MODE, volume, QueueSystem.BOARD));
        builder.singleton('player-title', new PlayerTitle());
        builder.singleton('total-time', new AudioTotalTimeRender(context));

        const dispatcher = ShortcutSystem.DISPATCHER;
        dispatcher.register(ShortcutAction.PlayerBoardShow, () => background.togglePlayer());
        dispatcher.register(ShortcutAction.PlayerVolumeIncrease, () => volume.addVolume(0.2));
        dispatcher.register(ShortcutAction.PlayerVolumeDecrease, () => volume.addVolume(-0.2));
        dispatcher.register(ShortcutAction.PlayerVolumeMute, () => volume.toggleMuted());

        UiSystem.CLOSE_PAGE.register({
            priority: 0,
            close: background.closePlayer
        });

        Object.freeze(this);
    }
}