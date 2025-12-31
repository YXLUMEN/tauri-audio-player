export function deepFreeze<T>(obj: T, seen = new WeakSet()): Readonly<T> {
    if (obj === null || typeof obj !== 'object') return obj;
    if (seen.has(obj)) return obj;
    seen.add(obj);

    if (obj instanceof Map) {
        for (const [k, v] of obj) {
            deepFreeze(k as any, seen);
            deepFreeze(v as any, seen);
        }
    } else if (obj instanceof Set) {
        for (const v of obj) {
            deepFreeze(v as any, seen);
        }
    } else {
        for (const key of Reflect.ownKeys(obj)) {
            // @ts-ignore
            const value = obj[key];
            if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
                deepFreeze(value, seen);
            }
        }
    }

    return Object.freeze(obj);
}

export function createClean<T>(obj: T): T {
    return Object.assign(Object.create(null), obj);
}

export function createStatus<T>(obj: T): T {
    return Object.seal(createClean(obj));
}

export function config<T>(obj: T): T {
    return Object.freeze(createClean(obj));
}

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