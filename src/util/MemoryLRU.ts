import {Consumer, Pair} from "../types/types.ts";

export class MemoryLRU<K, V> {
    private readonly cacheMap = new Map<K, V>();

    private readonly capacity: number;
    private readonly onRemove: Consumer<Pair<K, V | null>> | null;

    public constructor(capacity: number, onRemove?: Consumer<Pair<K, V | null>>) {
        this.capacity = Math.max(1, capacity | 0);
        this.onRemove = onRemove ?? null;
    }

    public get(k: K): V | null {
        if (!this.cacheMap.has(k)) return null;
        const v = this.cacheMap.get(k)!;
        this.cacheMap.delete(k);
        this.cacheMap.set(k, v);
        return v;
    }

    public set(k: K, v: V): void {
        if (this.cacheMap.has(k)) this.cacheMap.delete(k);
        this.cacheMap.set(k, v);
        if (this.cacheMap.size > this.capacity) {
            const oldest = this.cacheMap.keys().next().value;
            if (oldest === undefined) return;
            const ov = this.cacheMap.get(oldest);
            this.cacheMap.delete(oldest);
            this.notify(oldest, ov);
        }
    }

    public delete(k: K): boolean {
        if (!this.cacheMap.has(k)) return false;
        const v = this.cacheMap.get(k)!;
        this.cacheMap.delete(k);
        this.notify(k, v);
        return true;
    }

    public clear(): void {
        if (this.notify) {
            for (const [k, v] of this.cacheMap) this.notify(k, v);
        }
        this.cacheMap.clear();
    }

    public size() {
        return this.cacheMap.size;
    }

    public stableValues(): V[] {
        return Array.from(this.cacheMap.values());
    }

    public values() {
        return this.cacheMap.values();
    }

    private notify(k: K, v: V | null = null): void {
        try {
            this.onRemove?.({key: k, value: v});
        } catch {
        }
    }
}