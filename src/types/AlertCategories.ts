export const enum AlertCategories {
    INFO = 'info',
    SUCCESS = 'success',
    WARN = 'warning',
    ERROR = 'error'
}

export interface Confirm {
    timeout?: number, // timeout: Set this to 0 to disable.
    flag?: string,
    category?: AlertCategories,
    defaultResult?: boolean,
    defaultReturn?: boolean,
    strictTimeout?: boolean,
    animation?: boolean,
}