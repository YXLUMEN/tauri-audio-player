import {IndexedDBHelper} from "./IndexedDBHelper.ts";

export const dbHelper = new IndexedDBHelper('audio_player', 1, [
    {
        // 歌单
        name: 'folder',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
            {name: 'name', keyPath: 'name', unique: true}
        ]
    },
    {
        // 收藏
        name: 'favor',
        keyPath: null,
        autoIncrement: true,
        indexes: [
            {name: 'uid', keyPath: 'id', unique: false},
            {name: 'parent', keyPath: 'parent', unique: false},
            {name: 'parent_uid_index', keyPath: ['parent', 'uid'], unique: true}
        ]
    },
    {
        // 播放历史
        name: 'playing_history',
        keyPath: 'index',
    },
    {
        // 自定义快捷键
        name: 'shortcuts',
        keyPath: 'action',
        indexes: [
            {name: 'code', keyPath: 'code', unique: true},
        ]
    },
    {
        // auth 密钥
        name: 'auth',
        keyPath: 'plugin'
    },
    {
        name: 'token',
        keyPath: 'key'
    }
]);
