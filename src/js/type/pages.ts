export interface IAlert {
    autoRemoveDelay?: number,
    animation?: boolean,
}

export interface IConfirm {
    timeout?: number, // timeout: Set this to 0 to disable.
    flag?: string,
    category?: ECategories | string,
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