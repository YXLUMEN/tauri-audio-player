import {StoreConfig} from "../../interfaces/base";

export class IndexedDBHelper {
    private db: IDBDatabase = null;
    private readonly dbName: string;
    private readonly version: number;
    private readonly stores: StoreConfig[];

    constructor(name: string, version: number, stores: StoreConfig[]) {
        this.dbName = name;
        this.version = version;
        this.stores = stores;
    }

    init(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db);

        const {promise, resolve, reject} = Promise.withResolvers();
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = () => {
            const db = request.result;
            for (const store of this.stores) {
                if (db.objectStoreNames.contains(store.name)) continue;

                const objectStore = db.createObjectStore(store.name, {
                    keyPath: store.keyPath,
                    autoIncrement: store.autoIncrement,
                });

                store.indexes?.forEach(index =>
                    objectStore.createIndex(index.name, index.keyPath, {unique: index.unique})
                );
            }
        };

        request.onsuccess = () => {
            this.db = request.result;
            resolve(this.db);
        };

        request.onerror = () => reject(request.error);

        return <Promise<IDBDatabase>>promise;
    }

    async add(storeName: string, data: object): Promise<IDBValidKey> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName: string, key: IDBValidKey): Promise<any | undefined> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName: string, data: object): Promise<IDBValidKey> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<boolean> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName: string): Promise<any> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}