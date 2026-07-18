import {ShortcutGuard} from "../compound/shortchut/ShortcutGuard.ts";
import {ShortcutRegistry} from "../compound/shortchut/ShortcutRegistry.ts";
import {DefaultShortcuts} from "../builtin/DefaultShortcuts.ts";
import {ShortcutDispatcher} from "../compound/shortchut/ShortcutDispatcher.ts";
import {UiSystem} from "./UiSystem.ts";
import {Parsers} from "../plugin/Parsers.ts";
import {PageBuilder} from "../page/PageBuilder.ts";
import {LoadCustomShortcut} from "../compound/shortchut/LoadCustomShortcut.ts";
import {ActionKey} from "../builtin/ActionKey.ts";

export class ShortcutSystem {
    public static GUARD: ShortcutGuard;
    public static REGISTER: ShortcutRegistry;
    public static DISPATCHER: ShortcutDispatcher;

    public static init(builder: PageBuilder): void {
        this.GUARD = new ShortcutGuard();
        this.REGISTER = new ShortcutRegistry(DefaultShortcuts);
        this.DISPATCHER = new ShortcutDispatcher(this.GUARD, this.REGISTER);

        builder.singleton('load-custom-shortcut', new LoadCustomShortcut(this.REGISTER));

        Object.freeze(this);
        this.builtin();
    }

    private static builtin() {
        this.DISPATCHER.register(ActionKey.CloseCurrentPage, UiSystem.CLOSE_PAGE.close);
        this.DISPATCHER.register(ActionKey.UpdateRemoteArt, () => Parsers.ART.loadMore());
    }
}