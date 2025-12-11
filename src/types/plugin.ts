import {Result} from "../utils/Result";
import {MemoryLRU} from "../utils/collection/MemoryLRU";

export interface ICacheAble {
    getCache(): MemoryLRU<any, any> | Map<string, any> | Array<any>

    clear(): void;

    clearUnused(inUseIds: Set<string>): void;
}

export interface IAuthAble {
    // 使用密钥获取token
    login(payload: any): Promise<Result<Promise<boolean>, boolean>>;

    // 加载保存的token
    loadToken(): Promise<void>;

    // 获取新的access token
    refresh(): Promise<Result<Promise<boolean>, boolean>>;
}
