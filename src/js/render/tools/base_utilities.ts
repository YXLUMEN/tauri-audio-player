// 节流函数,使用日期计时
export function throttleDateTime(func: Function, wait: number = 200) {
    let lastExecutionTime = 0;
    return function (...args: any[]) {
        const now = Date.now();
        if (now - lastExecutionTime > wait) {
            func.apply(this, args);
            lastExecutionTime = now;
        }
    }
}

// 节流函数
export function throttleTimeOut(func: Function, wait: number = 200) {
    let timer: number = null;
    return function (...args: any[]) {
        if (timer) return;
        func.apply(this, args);
        timer = setTimeout((): any => timer = null, wait);
    }
}

/**
 * 防抖函数
 * @param func
 * @param wait default: 50ms
 * @param immediate
 * */
export function debounce(func: Function, wait: number = 50, immediate: boolean = false) {
    let timer: number;
    return function (...args: any[]) {
        if (immediate) wait = 0;
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

// 检查数组深度是否大于给定值
export function isDeeperThan(arr: Array<any>, level = 0): any {
    // 不是数数组，肯定是 false
    if (!Array.isArray(arr)) return false;
    // 如果是数组，层次肯定大于 0
    if (level === 0) return true;
    // 找到所有数组元素进行递归检查
    return arr.filter(el => Array.isArray(el)).some(el => isDeeperThan(el, level - 1));
}

/**
 * 获取最大深度;
 *
 *      [] will return -Infinity
 * 也就是只会计算含有元素的最深层
 * */
export function getMaxDeep(arr: Array<any>): any {
    // 不是数组，深度为 0
    if (!Array.isArray(arr)) return 0;
    // 是数组，深度 + 1，具体是多深，还要递归判断元素中的数组
    return 1 + Math.max(...arr.map(el => getMaxDeep(el)));
}

export function sleep(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function isMobile() {
    return /Mobile|Android|iPhone/.test(navigator.userAgent);
}


// 复制内容到剪贴板
export function copyText(content: string) {
    return navigator.clipboard.writeText(content);
}