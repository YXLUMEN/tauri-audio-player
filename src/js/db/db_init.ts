import {IndexedDBHelper} from "./IndexedDBHelper";
import {IAudioInfo} from "../api/audio";
import {IFolderInfo} from "../default";
import createAlert from "../util/base_page";
import {chosenFolder} from "../render/data";

const dbHelper = new IndexedDBHelper('audio_player', 4, [
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

async function getFavorByFolder(folderId: number): Promise<IAudioInfo[]> {
    const db = await dbHelper.init();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('favor', 'readonly');
        const store = tx.objectStore('favor');
        const index = store.index('parent');
        const request = index.getAll(folderId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function createFolder(folder: IFolderInfo): Promise<void> {
    try {
        await dbHelper.add('folder', {name: folder.name, desc: folder.desc, cover: folder.cover});
        createAlert('创建成功', 'success');
    } catch (err) {
        let msg = '未知错误';
        if (err instanceof Error) {
            if (err.name === 'ConstraintError') return createAlert('歌单名称重复', 'warning');
            msg = err.message;
        }
        console.error(`创建歌单时出错: ${msg}`);
        createAlert('创建失败', 'error');
    }
}

async function modifyFolder(folder: IFolderInfo): Promise<void> {
    try {
        await dbHelper.update('folder', folder);
        createAlert('修改成功', 'success')
    } catch (err) {
        let msg = '未知错误';
        if (err instanceof Error) msg = err.message;

        console.error(`修改歌单出错: ${msg}`);
        createAlert('修改失败', 'error');
    }
}

async function deleteFolder(folderId: number): Promise<any> {
    const db = await dbHelper.init();
    const {promise, resolve, reject} = Promise.withResolvers();

    const tx = db.transaction(['folder', 'favor'], 'readwrite');
    const folderStore = tx.objectStore('folder');
    const favorStore = tx.objectStore('favor');

    folderStore.delete(folderId);

    const index = favorStore.index('parent');
    const cursorRequest = index.openCursor(IDBKeyRange.only(folderId));
    cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
            cursor.delete();
            cursor.continue();
        }
    }

    tx.oncomplete = () => resolve(null);
    tx.onerror = () => reject(tx.error);

    return promise;
}

async function collectAudio(parent: number, audioInfo: IAudioInfo): Promise<void> {
    audioInfo.parent = parent;
    if (audioInfo.index) delete audioInfo.index;
    try {
        await dbHelper.add('favor', audioInfo);
        createAlert('已收藏', 'success');

        const chosenFolderId = chosenFolder?.getAttribute('folder_id');
        if (chosenFolderId && Number(chosenFolderId) === parent) {
            chosenFolder?.click();
        }
    } catch (err) {
        let msg = '未知错误';
        if (err instanceof Error) {
            if (err.name === 'ConstraintError') return createAlert('重复收藏', 'warning');
            msg = err.message;
        }

        console.error(`收藏时出错: ${msg}`);
        createAlert('收藏失败', 'error');
    }
}

async function deCollectAudio(folderId: number, itemId: string): Promise<any> {
    const db = await dbHelper.init();

    const tx = db.transaction('favor', 'readwrite');
    const store = tx.objectStore('favor');
    const index = store.index('parent_id_index');

    const request = index.getKey([folderId, itemId]);

    const {promise, resolve, reject} = Promise.withResolvers();

    request.onsuccess = () => {
        if (request.result == undefined) {
            createAlert('未找到要取消的收藏项', 'info');
            resolve(null);
            return;
        }

        store.delete(request.result);
        createAlert('已取消收藏', 'success');
        chosenFolder?.click();
        resolve(request.result);
    };

    request.onerror = () => {
        console.error(`删除收藏时出错: ${request.error}`);
        createAlert('出现错误', 'error');
        reject(request.error);
    };

    return promise;
}

async function clearPlayingQueueHistory(): Promise<void> {
    const db = await dbHelper.init();
    const tx = db.transaction('playing_history', 'readwrite');
    const store = tx.objectStore('playing_history');
    store.clear();
}

export {
    dbHelper,
    getFavorByFolder,
    collectAudio,
    deCollectAudio,
    deleteFolder,
    modifyFolder,
    createFolder,
    clearPlayingQueueHistory,
}