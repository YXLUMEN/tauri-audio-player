import {dbHelper} from "./db_init.ts";
import {Result} from "../util/Result.ts";
import {AudioInfos} from "../audio/AudioInfos.ts";
import {createAlert} from "../util/alert.ts";
import {AudioRecord} from "../audio/AudioRecord.ts";
import {FolderRecord} from "../types/FolderRecord.ts";
import {Parsers} from "../plugin/Parsers.ts";
import {AlertCategories} from "../types/AlertCategories.ts";

export async function getFolderContent(folderId: number): Promise<Result<AudioInfos[], string>> {
    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<AudioInfos[], string>>();

    const tx = db.transaction('favor', 'readonly');
    const store = tx.objectStore('favor');
    const index = store.index('parent');
    const request: IDBRequest<AudioRecord[]> = index.getAll(folderId);

    request.onsuccess = () => resolve(Result.ok(request.result.map(record => {
        const plugin = Parsers.get(record.plugin) ?? Parsers.LOCAL;
        return plugin.recover(record);
    })));

    request.onerror = () => resolve(Result.err(
        request.error === null ?
            'Unknown error at "getFavorByFolder"' :
            `Error at "getFavorByFolder" ${request.error.name}:${request.error.message} at\n ${request.error.stack}`
    ));

    return promise;
}

export async function createFolder(name: string, desc: string, cover: string): Promise<void> {
    const result = await dbHelper.add('folder', {name, desc, cover});

    if (result.isErr()) {
        const err = result.unwrapErr();
        if (err.name === 'ConstraintError') {
            createAlert('歌单名称重复', AlertCategories.WARN)
            return;
        }
        console.error(`创建歌单时出错: ${err.message}`);
        createAlert('创建失败', AlertCategories.ERROR);
        return;
    }

    createAlert('创建成功', AlertCategories.SUCCESS)
}

export async function modifyFolder(folder: FolderRecord): Promise<void> {
    const result = await dbHelper.update('folder', folder);
    if (result.isErr()) {
        const err = result.unwrapErr();
        console.error(`修改歌单出错: ${err.message}`);
        createAlert('修改失败', AlertCategories.ERROR);
        return;
    }
    createAlert('修改成功', AlertCategories.SUCCESS);
}

export async function deleteFolder(folderId: number): Promise<Result<null, Error>> {
    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<null, Error>>();

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
    tx.onerror = () => resolve(dbHelper.mapErr(tx.error));

    return promise;
}

export async function collectAudio(
    parent: number,
    item: AudioInfos
): Promise<AudioInfos | void> {
    const record = item.persistable(parent);
    const plugin = Parsers.get(item.plugin);
    plugin?.modify(record);

    const result = await dbHelper.add('favor', record);
    if (result.isErr()) {
        const err = result.unwrapErr();
        if (err.name === 'ConstraintError') {
            createAlert('重复收藏', AlertCategories.WARN);
            return;
        }

        console.error(`收藏时出错: ${err.message}`);
        createAlert('收藏失败', AlertCategories.ERROR);
        return;
    }

    createAlert('已收藏', AlertCategories.SUCCESS);
    return item;
}

export async function collectBatch(
    parent: number,
    items: Iterable<AudioInfos>
): Promise<AudioInfos[] | void> {
    const records = Iterator.from(items)
        .map(item => {
            const record = item.persistable(parent);
            const plugin = Parsers.get(item.plugin);
            plugin?.modify(record);
            return {record, item};
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

    for (const record of records) {
        const request = store.add(record.record);
        request.onsuccess = () => succeed.push(record.item);
        request.onerror = onerror;
    }

    tx.oncomplete = () => resolve(Result.ok(undefined));

    tx.onerror = () => resolve(dbHelper.mapErr(tx.error));
    tx.onabort = () =>
        resolve(dbHelper.mapErr(tx.error ?? new Error('Transaction aborted')));

    const result = await promise;

    if (result.isErr()) {
        console.error('收藏时出错', result.unwrapErr());
        createAlert('收藏失败', AlertCategories.ERROR);
        return;
    }

    createAlert('收藏完成', AlertCategories.SUCCESS);
    return succeed;
}

export async function deCollectAudio(parent: number, itemId: string): Promise<any> {
    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<number, Error>>();

    const tx = db.transaction('favor', 'readwrite');
    const store = tx.objectStore('favor');
    const index = store.index('parent_uid_index');

    const request = index.getKey([parent, itemId]);

    request.onsuccess = () => {
        const key = request.result as number | undefined;
        if (key == undefined) {
            createAlert('未找到要取消的收藏项', AlertCategories.INFO);
            resolve(Result.ok(-1));
            return;
        }

        store.delete(key);
        createAlert('已取消收藏', AlertCategories.SUCCESS);
        resolve(Result.ok(key));
    };

    request.onerror = () => {
        console.error(`删除收藏时出错: ${request.error}`);
        createAlert('出现错误', AlertCategories.ERROR);
        resolve(dbHelper.mapErr(tx.error));
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
 * @param parent 歌单ID
 * @param items 按新顺序排列的音频信息数组
 */
export async function updateFavorOrder(parent: number, items: Iterable<AudioInfos>): Promise<Result<void, Error>> {
    const records = Iterator.from(items)
        .map(item => {
            const record = item.persistable(parent);
            const plugin = Parsers.get(item.plugin);
            plugin?.modify(record);
            return record;
        });

    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();

    const tx = db.transaction('favor', 'readwrite');
    const store = tx.objectStore('favor');
    const parentIndex = store.index('parent');

    // 删除该歌单下的所有收藏
    // maybe sortOrder
    const request = parentIndex.openCursor(IDBKeyRange.only(parent));
    const keys: number[] = [];
    request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
            keys.push(cursor.primaryKey as number);
            cursor.delete();
            cursor.continue();
            return;
        }

        records.forEach((record, index) => {
            const key = keys[index] ?? undefined;
            store.add(record, key);
        });
    };

    tx.oncomplete = () => resolve(Result.ok(undefined));
    tx.onerror = () => resolve(dbHelper.mapErr(tx.error));

    return promise;
}
