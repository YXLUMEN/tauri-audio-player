// 节流函数,使用日期计时
export function throttleDateTime<T extends (...args: any[]) => any>(func: T, wait: number = 200) {
    let lastExecutionTime = 0;
    return function (...args: Parameters<T>) {
        const now = Date.now();
        if (now - lastExecutionTime > wait) {
            func.apply(this, args);
            lastExecutionTime = now;
        }
    }
}

// 节流函数
export function throttleTimeOut<T extends (...args: any[]) => any>(func: T, wait: number = 200) {
    let timer: number = null;
    return function (...args: Parameters<T>) {
        if (timer) return;
        func.apply(this, args);
        timer = setTimeout((): any => timer = null, wait);
    }
}

export function throttleTimeOutWithResult<T extends (...args: any[]) => any>(func: T, wait: number = 200) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastResult: ReturnType<T> | undefined;

    return function (...args: Parameters<T>) {
        if (timer) return;
        lastResult = func.apply(this, args);
        timer = setTimeout((): any => timer = null, wait);
        return lastResult;
    }
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number = 50) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return function (...args: Parameters<T>) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), wait);
    }
}

/**
 * 空值判断,
 * 传入参数为 0, '', undefined, null, NaN, 空数组, 空对象 时返回 false;
 * */
export function isEmpty(obj: any): boolean {
    if (typeof obj !== "object") return !obj;
    if (Object.prototype.toString.call(obj) === "[object Array]") return !obj.length;
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