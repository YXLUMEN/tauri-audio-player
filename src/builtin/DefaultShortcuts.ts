import {KeyBindingDef} from "../types/KeyBindingDef.ts";
import {ActionKey} from "./ActionKey.ts";

export const DefaultShortcuts: KeyBindingDef[] = [
    {action: ActionKey.PauseAndPlay, key: 'Space', scope: 'global'},
    {action: ActionKey.QueueBackward, key: 'ArrowLeft', scope: 'global'},
    {action: ActionKey.QueueForward, key: 'ArrowRight', scope: 'global'},
    {action: ActionKey.PlayerVolumeIncrease, key: 'ArrowUp', scope: 'global'},
    {action: ActionKey.PlayerVolumeDecrease, key: 'ArrowDown', scope: 'global'},
    {action: ActionKey.PlayerPlayMode, key: 'KeyR', scope: 'global'},
    {action: ActionKey.PlayerVolumeMute, key: 'KeyM', scope: 'global'},
    {action: ActionKey.QueueHighlightCurrent, key: 'KeyH', scope: 'global'},
    {action: ActionKey.PlayerShowLyric, key: 'KeyC', scope: 'global'},
    {action: ActionKey.QueueShowBoard, key: 'KeyL', scope: 'global'},
    {action: ActionKey.SettingShow, key: 'KeyS', scope: 'global'},
    {action: ActionKey.PlayerBoardShow, key: 'KeyP', scope: 'global'},
    {action: ActionKey.UpdateRemoteArt, key: 'NumpadAdd', scope: 'global'},
    {action: ActionKey.CloseCurrentPage, key: 'Escape', scope: 'global'},
];
Object.freeze(DefaultShortcuts);