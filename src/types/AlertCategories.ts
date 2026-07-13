export type AlertCategories = 'info' | 'success' | 'warning' | 'error';

export interface Confirm {
    timeout?: number, // timeout: Set this to 0 to disable.
    flag?: string,
    category?: AlertCategories | string,
    defaultResult?: boolean,
    defaultReturn?: boolean,
    strictTimeout?: boolean,
    animation?: boolean,
}