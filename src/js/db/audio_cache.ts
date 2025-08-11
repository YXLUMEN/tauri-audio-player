import {IAudioInfo, IStandardAudio} from "../api/audio";
import {MemoryLRU} from "./memoryLRU";
import {CacheDB, CacheEnvelope, TSupplier} from "../api/db";

export class AudioCache {
    public static readonly SHOULD_CACHE = new Set<string>();
    public static readonly SHOULD_PERSIST = new Set<string>();

    private readonly mem: MemoryLRU<string, CacheEnvelope<IStandardAudio>>;
    private db: CacheDB;
    private inFlight = new Map<string, Promise<IStandardAudio | null>>();
    private version = 'v1';
    private ttlMs = 24 * 3600_000;
    private negativeTtlMs = 5 * 60_000;

    constructor(db: CacheDB, memoryCapacity: number = 200, mem?: MemoryLRU<string, CacheEnvelope<IStandardAudio>>) {
        this.db = db;
        this.mem = mem ?? new MemoryLRU<string, CacheEnvelope<IStandardAudio>>(memoryCapacity);
    }

    public async get(info: IAudioInfo): Promise<IStandardAudio | null | undefined> {
        const key = this.keyOf(info);
        const env = this.mem.get(key);
        const now = this.now();

        if (env) {
            if (env.ver === this.version && env.expiresAt > now) return env.v;
            this.mem.delete(key, 'expire');
        }

        if (!AudioCache.SHOULD_PERSIST.has(info.plugin)) return undefined;

        const dbData = await this.db.get<CacheEnvelope<IStandardAudio>>(key);
        if (!dbData) return undefined;
        if (dbData.ver !== this.version || dbData.expiresAt <= now) {
            if (Math.random() < 0.05) {
                await this.db.delete(key).catch();
            }
            return undefined;
        }

        this.mem.set(key, dbData);
        return dbData.v;
    }

    public async set(info: IAudioInfo, value: IStandardAudio | null): Promise<void> {
        const key = this.keyOf(info);
        const env: CacheEnvelope<IStandardAudio> = {
            v: value,
            expiresAt: this.now() + (value === null ? this.negativeTtlMs : this.ttlMs),
            ver: this.version,
        };
        this.mem.set(key, env);
        if (!AudioCache.SHOULD_PERSIST.has(info.plugin)) return;

        await this.db.set(key, env);
    }

    public async invalidate(info: IAudioInfo) {
        const key = this.keyOf(info);
        this.mem.delete(key);
        await this.db.delete(key).catch();
    }

    public async clear() {
        this.mem.clear(true);
        await this.db.clear();
    }

    // 同 key 并发只执行一次 supplier
    public async dedupe(info: IAudioInfo, supplier: TSupplier): Promise<IStandardAudio | null> {
        if (!AudioCache.SHOULD_CACHE.has(info.plugin)) {
            return supplier();
        }

        const key = this.keyOf(info);

        const cached = await this.get(info);
        if (cached !== undefined) return cached;

        const existing = this.inFlight.get(key);
        if (existing) return existing;

        const job = (async () => {
            try {
                const rehit = await this.get(info);
                if (rehit !== undefined) return rehit;

                const result = await supplier();
                await this.set(info, result);
                return result;
            } finally {
                this.inFlight.delete(key);
            }
        })();

        this.inFlight.set(key, job);
        return job;
    }

    private now(): number {
        return Date.now();
    }

    private keyOf(info: IAudioInfo): string {
        return `${info.plugin}|${info.id}`;
    }
}