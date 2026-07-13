import {ActionKey} from "../builtin/ShortcutAction.ts";

export interface KeyBindingDef {
    readonly key: string;
    readonly action: ActionKey;
    readonly scope: string;
}

export interface CustomKeyBinding {
    readonly key: string;
    readonly action: ActionKey;
}