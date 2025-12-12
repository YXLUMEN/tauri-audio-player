import {StandardAudio} from "./audio";

export type CacheEnvelope<T> = {
    v: T | null;
    expiresAt: number;
    ver: string;
};

export type RemoveReason = 'evict' | 'delete' | 'clear' | 'expire';

export type RemoveEvent<K, V> = {
    key: K;
    value: V | null | undefined;
};

export interface CacheDB {
    get<T = any>(key: string): Promise<T | undefined>;

    set<T = any>(key: string, value: T): Promise<void>;

    delete(key: string): Promise<void>;

    clear(): Promise<void>;
}

export type TSupplier = () => Promise<StandardAudio | null>;