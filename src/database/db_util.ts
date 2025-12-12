import {Result} from "../utils/Result";
import {AudioInfo} from "../types/audio";
import {IFolderInfo} from "../config/default";
import {createAlert} from "../utils/front/alert";
import {dbHelper} from "./db_init";
import {IndexController} from "../index/index_controller";

export async function getFavorByFolder(folderId: number): Promise<Result<AudioInfo[], string>> {
    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<AudioInfo[], string>>();

    const tx = db.transaction('favor', 'readonly');
    const store = tx.objectStore('favor');
    const index = store.index('parent');
    const request = index.getAll(folderId);

    request.onsuccess = () => resolve(Result.ok(request.result));
    request.onerror = () => resolve(Result.err(
        request.error === null ?
            'Unknown error at "getFavorByFolder"' :
            `Error at "getFavorByFolder" ${request.error.name}:${request.error.message} at\n ${request.error.stack}`
    ));

    return promise;
}

export async function createFolder(folder: IFolderInfo): Promise<void> {
    const result = await dbHelper.add(
        'folder',
        {
            name: folder.name,
            desc: folder.desc,
            cover: folder.cover
        }
    );

    result
        .map(() => createAlert('创建成功', 'success'))
        .mapErr(error => {
            let msg = '未知错误';
            if (error) {
                if (error.name === 'ConstraintError') return createAlert('歌单名称重复', 'warning');
                msg = error.message;
            }
            console.error(`创建歌单时出错: ${msg}`);
            createAlert('创建失败', 'error');
        });
}

export async function modifyFolder(folder: IFolderInfo): Promise<void> {
    const result = await dbHelper.update('folder', folder);
    result
        .map(() => createAlert('修改成功', 'success'))
        .mapErr(error => {
            let msg = '未知错误';
            if (error) msg = error.message;

            console.error(`修改歌单出错: ${msg}`);
            createAlert('修改失败', 'error');
        });
}

export async function deleteFolder(folderId: number): Promise<Result<null, string>> {
    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<null, string>>();

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

    tx.oncomplete = () => resolve(Result.ok(null));
    tx.onerror = () => resolve(Result.err(
        tx.error === null ?
            'Unknown error at "deleteFolder"' :
            `Err at "deleteFolder" ${tx.error.name}:${tx.error.message} at\n ${tx.error.stack}`
    ));

    return promise;
}

export async function collectAudio(parent: number, audioInfo: AudioInfo): Promise<void> {
    audioInfo.parent = parent;
    if (audioInfo.index) audioInfo.index = undefined;

    const result = await dbHelper.add(
        'favor',
        {
            id: audioInfo.id,
            plugin: audioInfo.plugin,
            parent: parent,
            url: audioInfo.url,
        } satisfies AudioInfo
    );

    result
        .map(() => {
            createAlert('已收藏', 'success');

            const chosenFolderId = IndexController.getChosenFolder()?.getAttribute('folder_id');
            if (chosenFolderId && Number(chosenFolderId) === parent) {
                IndexController.getChosenFolder()?.click();
            }
        })
        .mapErr(error => {
            let msg = '未知错误';
            if (error) {
                if (error.name === 'ConstraintError') return createAlert('重复收藏', 'warning');
                msg = error.message;
            }

            console.error(`收藏时出错: ${msg}`);
            createAlert('收藏失败', 'error');
        });
}

export async function deCollectAudio(folderId: number, itemId: string): Promise<any> {
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
        IndexController.getChosenFolder()?.click();
        resolve(request.result);
    };

    request.onerror = () => {
        console.error(`删除收藏时出错: ${request.error}`);
        createAlert('出现错误', 'error');
        reject(request.error);
    };

    return promise;
}

export async function clearPlayingQueueHistory(): Promise<void> {
    const db = await dbHelper.init();
    const tx = db.transaction('playing_history', 'readwrite');
    const store = tx.objectStore('playing_history');
    store.clear();
}