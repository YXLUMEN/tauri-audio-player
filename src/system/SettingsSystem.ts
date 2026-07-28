import {PageBuilder} from "../page/PageBuilder.ts";
import {SettingsPage} from "../compound/setting/SettingsPage.ts";
import {ShortcutSystem} from "./ShortcutSystem.ts";
import {UiSystem} from "./UiSystem.ts";
import {SelectLocalAudio} from "../compound/setting/SelectLocalAudio.ts";
import {Dsd} from "../compound/setting/dsd.ts";
import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {DsdCanvas} from "../compound/setting/DsdCanvas.ts";
import {SettingShortcut} from "../compound/setting/SettingShortcut.ts";
import {OtherSettings} from "../compound/setting/OtherSettings.ts";
import {TokenSettings} from "../compound/setting/TokenSettings.ts";
import {CleanCache} from "../compound/setting/CleanCache.ts";
import {ActionKey} from "../builtin/ActionKey.ts";
import {QueueSystem} from "./QueueSystem.ts";
import {FolderSystem} from "./FolderSystem.ts";

export class SettingsSystem {
    public static PAGE: SettingsPage;

    public static init(builder: PageBuilder, audio: AudioCompound) {
        this.PAGE = new SettingsPage();

        const dsd = new Dsd(audio);

        builder.singleton('settings-page', this.PAGE);
        builder.singleton('select-local', new SelectLocalAudio(QueueSystem.QUEUE, FolderSystem.ACCESSOR, FolderSystem.POPUP));
        builder.singleton('dsd', dsd);
        builder.singleton('dsd-canvas', new DsdCanvas(dsd));
        builder.singleton('setting-shortcut', new SettingShortcut());
        builder.singleton('other-settings', new OtherSettings());
        builder.singleton('token-settings', new TokenSettings());
        builder.singleton('settings-clean-cache', new CleanCache());

        ShortcutSystem.DISPATCHER.register(ActionKey.SettingShow, this.PAGE.toggle);
        UiSystem.CLOSE_PAGE.register({
            priority: 2,
            close: this.PAGE.close
        });
    }
}