export interface CacheAble {
    getCache(): Map<string, any>;

    clear(): void;

    clearUnused(inUseIds: Set<string>): void;
}