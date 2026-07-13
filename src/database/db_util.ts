import {dbHelper} from "./db_init.ts";
import {Result} from "../util/Result.ts";
import {AudioInfos} from "../types/audio/AudioInfos.ts";
import {createAlert} from "../util/alert.ts";
import {AudioRecord} from "../types/audio/AudioRecord.ts";
import {AudioInfoBuilder} from "../types/audio/AudioInfoBuilder.ts";
import {FolderInfo} from "../types/FolderInfo.ts";
import {FolderRecord} from "../types/FolderRecord.ts";

export async function getFolderContent(folderId: number): Promise<Result<AudioInfos[], string>> {
    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<AudioInfos[], string>>();

    const tx = db.transaction('favor', 'readonly');
    const store = tx.objectStore('favor');
    const index = store.index('parent');
    const request: IDBRequest<AudioRecord[]> = index.getAll(folderId);

    request.onsuccess = () => resolve(Result.ok(request.result.map(item => {
        return AudioInfos.from(item);
    })));

    request.onerror = () => resolve(Result.err(
        request.error === null ?
            'Unknown error at "getFavorByFolder"' :
            `Error at "getFavorByFolder" ${request.error.name}:${request.error.message} at\n ${request.error.stack}`
    ));

    return promise;
}

export async function createFolder(record: FolderRecord): Promise<void> {
    const result = await dbHelper.add('folder', {
        name: record.name,
        desc: record.desc,
        cover: record.cover
    });

    if (result.isErr()) {
        const err = result.unwrapErr();
        if (err.name === 'ConstraintError') {
            createAlert('歌单名称重复', 'warning')
            return;
        }
        console.error(`创建歌单时出错: ${err.message}`);
        createAlert('创建失败', 'error');
        return;
    }

    createAlert('创建成功', 'success')
}

export async function modifyFolder(folder: FolderInfo): Promise<void> {
    const result = await dbHelper.update('folder', folder.persistable());
    if (result.isErr()) {
        const err = result.unwrapErr();
        console.error(`修改歌单出错: ${err.message}`);
        createAlert('修改失败', 'error');
        return;
    }
    createAlert('修改成功', 'success');
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

export async function collectAudio(
    parent: number,
    info: AudioRecord
): Promise<AudioInfos | void> {
    const builder = new AudioInfoBuilder();
    builder.from(info);
    builder.parent(parent);
    const inner = builder.build();

    const result = await dbHelper.add('favor', inner.persistable());
    if (result.isErr()) {
        const err = result.unwrapErr();
        if (err.name === 'ConstraintError') {
            createAlert('重复收藏', 'warning');
            return;
        }

        console.error(`收藏时出错: ${err.message}`);
        createAlert('收藏失败', 'error');
        return;
    }

    createAlert('已收藏', 'success');
    return inner;
}

export async function collectBatch(
    parent: number,
    records: Iterable<AudioRecord>
): Promise<AudioInfos[] | void> {
    const inners = Iterator.from(records)
        .map(record => {
            const builder = new AudioInfoBuilder();
            builder.from(record);
            builder.parent(parent);
            return builder.build();
        });

    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();

    const tx = db.transaction('favor', 'readwrite');
    const store = tx.objectStore('favor');

    const succeed: AudioInfos[] = [];
    const onerror = (e: Event) => {
        if ((e.target as IDBRequest).error?.name === 'ConstraintError') {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    for (const inner of inners) {
        const request = store.add(inner.persistable());
        request.onsuccess = () => succeed.push(inner);
        request.onerror = onerror;
    }

    tx.oncomplete = () => resolve(Result.ok(undefined));

    tx.onerror = () => resolve(dbHelper.mapErr(tx.error));
    tx.onabort = () =>
        resolve(dbHelper.mapErr(tx.error ?? new Error('Transaction aborted')));

    const result = await promise;

    if (result.isErr()) {
        console.error('收藏时出错', result.unwrapErr());
        createAlert('收藏失败', 'error');
        return;
    }

    createAlert('收藏完成', 'success');
    return succeed;
}

export async function deCollectAudio(folderId: number, itemId: string): Promise<any> {
    const db = await dbHelper.init();

    const tx = db.transaction('favor', 'readwrite');
    const store = tx.objectStore('favor');
    const index = store.index('parent_uid_index');

    const request = index.getKey([folderId, itemId]);

    const {promise, resolve} = Promise.withResolvers();

    request.onsuccess = () => {
        if (request.result == undefined) {
            createAlert('未找到要取消的收藏项', 'info');
            resolve(null);
            return;
        }

        store.delete(request.result);
        createAlert('已取消收藏', 'success');
        resolve(request.result);
    };

    request.onerror = () => {
        console.error(`删除收藏时出错: ${request.error}`);
        createAlert('出现错误', 'error');
        resolve(request.error);
    };

    return promise;
}

export async function clearPlayingQueueHistory(): Promise<void> {
    const result = await dbHelper.clearStore('playing_history');
    if (result.isErr()) {
        console.error('[History]', result.unwrapErr());
    }
}

/**
 * 更新收藏列表中音频的顺序
 * @param folderId 歌单ID
 * @param records 按新顺序排列的音频信息数组
 */
export async function updateFavorOrder(folderId: number, records: Iterable<AudioRecord>): Promise<Result<null, string>> {
    const inners = Iterator.from(records)
        .map(record => {
            const builder = new AudioInfoBuilder();
            builder.from(record);
            builder.parent(folderId);
            return builder.build().persistable();
        })

    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<null, string>>();

    const tx = db.transaction('favor', 'readwrite');
    const store = tx.objectStore('favor');
    const parentIndex = store.index('parent');

    // 删除该歌单下的所有收藏
    // maybe sortOrder
    const request = parentIndex.openCursor(IDBKeyRange.only(folderId));
    request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
            cursor.delete();
            cursor.continue();
            return;
        }
        // 按新顺序添加
        for (const record of inners) {
            store.add(record);
        }
    };

    tx.oncomplete = () => resolve(Result.ok(null));
    tx.onerror = () => resolve(Result.err(
        tx.error === null ?
            'Unknown error at "updateFavorOrder"' :
            `Error at "updateFavorOrder" ${tx.error.name}:${tx.error.message}`
    ));

    return promise;
}