export interface CacheAble {
    getCache(): Map<string, string>;

    clear(): void;
}