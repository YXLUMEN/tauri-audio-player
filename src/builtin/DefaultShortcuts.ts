import {KeyBindingDef} from "../types/KeyBindingDef.ts";
import {ShortcutAction} from "./ShortcutAction.ts";

export const DefaultShortcuts: KeyBindingDef[] = [
    {action: ShortcutAction.PauseAndPlay, key: 'Space', scope: 'global'},
    {action: ShortcutAction.QueueBackward, key: 'ArrowLeft', scope: 'global'},
    {action: ShortcutAction.QueueForward, key: 'ArrowRight', scope: 'global'},
    {action: ShortcutAction.PlayerVolumeIncrease, key: 'ArrowUp', scope: 'global'},
    {action: ShortcutAction.PlayerVolumeDecrease, key: 'ArrowDown', scope: 'global'},
    {action: ShortcutAction.PlayerPlayMode, key: 'KeyR', scope: 'global'},
    {action: ShortcutAction.PlayerVolumeMute, key: 'KeyM', scope: 'global'},
    {action: ShortcutAction.QueueHighlightCurrent, key: 'KeyH', scope: 'global'},
    {action: ShortcutAction.PlayerShowLyric, key: 'KeyC', scope: 'global'},
    {action: ShortcutAction.QueueShowBoard, key: 'KeyL', scope: 'global'},
    {action: ShortcutAction.SettingShow, key: 'KeyS', scope: 'global'},
    {action: ShortcutAction.PlayerBoardShow, key: 'KeyP', scope: 'global'},
    {action: ShortcutAction.UpdateRemoteArt, key: 'NumpadAdd', scope: 'global'},
    {action: ShortcutAction.CloseCurrentPage, key: 'Escape', scope: 'global'},
];