import {IndexedDBHelper} from "./IndexedDBHelper";
import {CacheDB} from "../api/db";


export class IDBCacheAdapter implements CacheDB {
    constructor(
        private idb: IndexedDBHelper,
        private storeName: string
    ) {
    }

    async get<T = any>(key: string): Promise<T | undefined> {
        const rec = await this.idb.get(this.storeName, key);
        if (!rec) return undefined;
        const {key: _, ...value} = rec;
        return value as T;
    }

    async set<T = any>(key: string, value: T): Promise<void> {
        const record = {key, ...(value as any)};
        await this.idb.update(this.storeName, record);
    }

    async delete(key: string): Promise<void> {
        await this.idb.delete(this.storeName, key);
    }

    async clear(): Promise<void> {
        await this.idb.clearStore(this.storeName);
    }
}
