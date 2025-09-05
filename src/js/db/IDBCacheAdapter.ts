import {IndexedDBHelper} from "./IndexedDBHelper";
import {CacheDB} from "../api/db";


export class IDBCacheAdapter implements CacheDB {
    private idb: IndexedDBHelper;
    private readonly storeName: string;

    public constructor(
        idb: IndexedDBHelper,
        storeName: string
    ) {
        this.storeName = storeName;
        this.idb = idb;
    }

    public async get<T = any>(key: string): Promise<T | undefined> {
        const rec = await this.idb.get(this.storeName, key);
        if (!rec) return undefined;
        const {key: _, ...value} = rec;
        return value as T;
    }

    public async set<T = any>(key: string, value: T): Promise<void> {
        const record = {key, ...(value as any)};
        await this.idb.update(this.storeName, record);
    }

    public async delete(key: string): Promise<void> {
        await this.idb.delete(this.storeName, key);
    }

    public async clear(): Promise<void> {
        await this.idb.clearStore(this.storeName);
    }
}
