export const ShortcutAction = {
    PauseAndPlay: 'queue.pause',
    QueueForward: 'queue.forward',
    QueueBackward: 'queue.backward',
    QueueHighlightCurrent: 'queue.highlight',
    QueueShowBoard: 'queue.show',
    PlayerVolumeIncrease: 'player.volume.increase',
    PlayerVolumeDecrease: 'player.volume.decrease',
    PlayerVolumeMute: 'player.volume.mute',
    PlayerPlayMode: 'player.mode',
    PlayerShowLyric: 'player.lyric.show',
    PlayerBoardShow: 'player.show',
    CloseCurrentPage: 'ui.close',
    SettingShow: 'setting.show',
    UpdateRemoteArt: 'queue.remote.art.update',
};
Object.freeze(ShortcutAction);

export type ActionKey = typeof ShortcutAction[keyof typeof ShortcutAction];
