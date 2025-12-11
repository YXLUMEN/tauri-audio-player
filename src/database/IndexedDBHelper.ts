import {Result} from "../utils/Result";
import {StoreConfig} from "../types/store";
import {DataBaseError} from "../types/errors";

export class IndexedDBHelper {
    private db: IDBDatabase | null = null;
    private readonly dbName: string;
    private readonly version: number;
    private readonly stores: StoreConfig[];

    public constructor(name: string, version: number, stores: StoreConfig[]) {
        this.dbName = name;
        this.version = version;
        this.stores = stores;
    }

    public init(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db);

        const {promise, resolve, reject} = Promise.withResolvers<IDBDatabase>();
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = () => {
            const db = request.result;
            for (const store of this.stores) {
                if (db.objectStoreNames.contains(store.name)) continue;

                const objectStore = db.createObjectStore(store.name, {
                    keyPath: store.keyPath,
                    autoIncrement: store.autoIncrement,
                });

                store.indexes?.forEach(index => {
                    objectStore.createIndex(index.name, index.keyPath, {unique: index.unique});
                });
            }
        };

        request.onsuccess = () => {
            this.db = request.result;
            resolve(this.db);
        };

        request.onerror = () => reject(request.error);

        return promise;
    }

    public async add(storeName: string, data: object): Promise<Result<IDBValidKey, DataBaseError>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<IDBValidKey, DataBaseError>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.add(data);
        request.onsuccess = () => resolve(Result.ok(request.result));
        request.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(request.error)));

        return promise;
    }

    public async get<T>(storeName: string, key: IDBValidKey): Promise<Result<T, DataBaseError>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<T, DataBaseError>>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(Result.ok(request.result ?? null));
        request.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(request.error)));

        return promise;
    }

    public async getByIndex<T>(
        storeName: string,
        indexName: string,
        key: IDBValidKey
    ): Promise<Result<T, DataBaseError>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<T, DataBaseError>>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.get(key);

        request.onsuccess = () => resolve(Result.ok(request.result ?? null));
        request.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(request.error)));

        return promise;
    }

    public async update(storeName: string, data: object): Promise<Result<IDBValidKey, DataBaseError>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<IDBValidKey, DataBaseError>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(Result.ok(request.result));
        request.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(request.error)));

        return promise;
    }

    public async delete(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<Result<boolean, DataBaseError>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<boolean, DataBaseError>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve(Result.ok(true));
        request.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(request.error)));

        return promise;
    }

    public async clearStore(storeName: string): Promise<Result<null, DataBaseError>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<null, DataBaseError>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve(Result.ok(null));
        request.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(request.error)));

        return promise;
    }

    public async getAll<T>(storeName: string): Promise<Result<T[], DataBaseError>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<T[], DataBaseError>>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(Result.ok(request.result));
        request.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(request.error)));

        return promise;
    }

    public static mapErr(error: DOMException | null): DataBaseError {
        if (!error) return new DataBaseError('Unknown error occurred.');
        return new DataBaseError(`${error.name}:${error.message} because ${error.cause} at\n ${error.stack}`);
    }
}