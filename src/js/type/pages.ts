export interface IAlert {
    autoRemoveDelay?: number,
    animation?: boolean,
}

export interface IConfirm {
    timeout?: number, // timeout: Set this to 0 to disable.
    flag?: string,
    category?: 'info' | 'warning' | 'error',
    defaultReturn?: boolean,
    strictTimeout?: boolean,
    animation?: boolean,
}