import {RemoveEvent, RemoveReason} from "../api/db";

export class MemoryLRU<K, V> {
    private cacheMap = new Map<K, V>();

    private readonly capacity: number;
    private readonly onRemove?: (event: RemoveEvent<K, V>) => void;

    public constructor(capacity: number, onRemove?: (event: RemoveEvent<K, V>) => void) {
        this.capacity = Math.max(0, capacity | 0);
        this.onRemove = onRemove;
    }

    public get(k: K): V | undefined {
        if (!this.cacheMap.has(k)) return undefined;
        const v = this.cacheMap.get(k)!;
        this.cacheMap.delete(k);
        this.cacheMap.set(k, v);
        return v;
    }

    public set(k: K, v: V) {
        if (this.cacheMap.has(k)) this.cacheMap.delete(k);
        this.cacheMap.set(k, v);
        while (this.cacheMap.size > this.capacity) {
            const oldest = this.cacheMap.keys().next().value;
            if (oldest === undefined) break;
            const ov = this.cacheMap.get(oldest);
            this.cacheMap.delete(oldest);
            this.notify(oldest, ov, 'evict');
        }
    }

    public delete(k: K, reason: RemoveReason = 'delete'): boolean {
        if (!this.cacheMap.has(k)) return false;
        const v = this.cacheMap.get(k)!;
        this.cacheMap.delete(k);
        this.notify(k, v, reason);
        return true;
    }

    public clear(notify: boolean = false) {
        if (notify) {
            for (const [k, v] of this.cacheMap) this.notify(k, v, 'clear');
        }
        this.cacheMap.clear();
    }

    public size() {
        return this.cacheMap.size;
    }

    public stableValues(): V[] {
        return Array.from(this.cacheMap.values());
    }

    private notify(k: K, v: V | undefined, reason: RemoveReason) {
        try {
            this.onRemove?.({key: k, value: v, reason});
        } catch {
        }
    }

}