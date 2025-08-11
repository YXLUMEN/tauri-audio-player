export interface StoreConfig {
    name: string; // 对象存储名称
    keyPath: string; // 主键字段名
    autoIncrement?: boolean; // 是否启用主键自增
    indexes?: {
        name: string;       // 索引名称
        keyPath: string | string[];    // 索引字段路径
        unique?: boolean;   // 是否唯一索引
    }[];
}

export interface IAlert {
    autoRemoveDelay?: number, // set 0 will no remove
    animation?: boolean,
}

export interface IConfirm {
    timeout?: number, // timeout: Set this to 0 to disable.
    flag?: string,
    category?: ECategories | string,
    defaultResult?: boolean,
    defaultReturn?: boolean,
    strictTimeout?: boolean,
    animation?: boolean,
}

export enum ECategories {
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error'
}