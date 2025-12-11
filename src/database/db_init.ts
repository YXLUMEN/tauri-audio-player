import {IndexedDBHelper} from "./IndexedDBHelper";

export const dbHelper = new IndexedDBHelper('audio_player', 4, [
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
        keyPath: 'index',
        autoIncrement: true,
        indexes: [
            {name: 'id', keyPath: 'id', unique: false},
            {name: 'parent', keyPath: 'parent', unique: false},
            {name: 'parent_id_index', keyPath: ['parent', 'id'], unique: true}
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
]);
