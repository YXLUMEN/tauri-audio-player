export interface ICacheAble {
    getCache(): Map<string, any>;

    clear(): void;

    clearUnused(inUseIds: Set<string>): void;
}

export interface IAuthAble {
    initToken(): Promise<void>;

    login(payload: any): Promise<void>;

    refresh(): Promise<void>;
}