export interface ICacheAble {
    getCache(): Map<string, any>;

    clear(): void;

    clearUnused(inUseIds: Set<string>): void;
}

export interface IAuthAble {
    // 使用密钥获取token
    login(payload: any): Promise<void>;
    // 加载保存的token
    loadToken(): Promise<void>;
    // 获取新的access token
    refresh(): Promise<void>;
}