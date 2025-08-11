// 节流函数,使用日期计时
export function throttleDateTime<T extends (...args: any[]) => any>(func: T, wait: number = 200) {
    let lastExecutionTime = 0;
    return function (...args: Parameters<T>) {
        const now = Date.now();
        if (now - lastExecutionTime > wait) {
            // @ts-ignore
            func.apply(this, args);
            lastExecutionTime = now;
        }
    }
}

// 节流函数
export function throttleTimeOut<T extends (...args: any[]) => any>(func: T, wait: number = 200) {
    let timer: number | null = null;
    return function (...args: Parameters<T>) {
        if (timer) return;
        // @ts-ignore
        func.apply(this, args);
        timer = setTimeout((): any => timer = null, wait);
    }
}

export function throttleTimeOutWithResult<T extends (...args: any[]) => any>(func: T, wait: number = 200) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastResult: ReturnType<T> | undefined;

    return function (...args: Parameters<T>) {
        if (timer) return;
        // @ts-ignore
        lastResult = func.apply(this, args);
        timer = setTimeout((): any => timer = null, wait);
        return lastResult;
    }
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number = 50) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return function (...args: Parameters<T>) {
        if (timer) clearTimeout(timer);
        // @ts-ignore
        timer = setTimeout(() => func.apply(this, args), wait);
    }
}

/**
 * 空值判断,
 * 传入参数为 0, '', undefined, null, NaN, 空数组, 空对象 时返回 false;
 * */
export function isEmpty(obj: unknown): obj is null | undefined {
    if (obj === null || obj === undefined) return true;
    if (typeof obj !== "object") return !obj;
    if (Array.isArray(obj)) return obj.length === 0;
    if (Object.prototype.toString.call(obj) === "[object Object]") return Object.keys(obj).length === 0;
    return false;
}

export function sleep(time: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time));
}

// 复制内容到剪贴板
export function copyText(content: string): Promise<void> {
    return navigator.clipboard.writeText(content);
}