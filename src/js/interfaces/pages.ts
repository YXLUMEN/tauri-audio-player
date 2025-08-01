export interface IAlert {
    autoRemoveDelay?: number, // set 0 will no remove
    animation?: boolean,
}

export interface IConfirm {
    timeout?: number, // timeout: Set this to 0 to disable.
    flag?: string,
    category?: ECategories | string,
    defaultResult?: any,
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