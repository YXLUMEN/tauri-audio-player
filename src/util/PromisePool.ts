export class PromisePool {
    private readonly activeTasks: Set<Promise<unknown>> = new Set();

    private readonly maxConcurrentTasks: number = 8;
    private readonly ctrl: AbortController = new AbortController();

    private defaultTimeout: number = 0;

    public constructor(maxConcurrentTasks = 8) {
        if (!Number.isInteger(maxConcurrentTasks) || maxConcurrentTasks < 1) {
            throw new Error('maxConcurrentTasks must be a positive integer');
        }
        this.maxConcurrentTasks = maxConcurrentTasks;
    }

    /**
     * 提交一个任务到池中执行
     * @returns {Promise} 包装后的任务Promise
     * @throws {Error} 如果池已被abort
     */
    public async submit<T, U extends unknown[]>(
        callback: (...args: U) => T | PromiseLike<T>,
        ...args: U
    ): Promise<Awaited<T>> {
        if (this.ctrl.signal.aborted) {
            throw new Error("Pool aborted");
        }

        while (this.activeTasks.size >= this.maxConcurrentTasks) {
            await Promise.race(this.activeTasks);
            if (this.ctrl.signal.aborted) {
                throw new Error("Pool aborted");
            }
        }

        return this.executeTask(callback, ...args);
    }

    private executeTask<T, U extends unknown[]>(
        callback: (...args: U) => T | PromiseLike<T>,
        ...args: U
    ): Promise<Awaited<T>> {
        const rawPromise = Promise.try(callback, ...args);
        // 使用包装函数将 rawPromise 与 timeout 和 abort 机制结合
        const wrappedPromise = this.withTimeoutAndAbort(rawPromise)
            .finally(() => this.activeTasks.delete(wrappedPromise));
        this.activeTasks.add(wrappedPromise);
        return wrappedPromise;
    }

    /**
     * 包装给定的 Promise，使之支持全局 abort 与默认 timeout(通过 race 的方式)
     */
    private async withTimeoutAndAbort<T>(task: Promise<T>): Promise<T> {
        const signal = this.ctrl.signal;
        if (signal.aborted) {
            throw new Error('Task aborted');
        }

        let timeout: number | undefined = undefined;
        const ctrl = new AbortController();
        const {promise: fail, reject} = Promise.withResolvers<never>();

        const endTask = (reason?: string) => {
            clearTimeout(timeout);
            ctrl.abort();
            if (reason) reject(new Error(reason));
        };

        signal.addEventListener(
            'abort',
            () => endTask('Task aborted'),
            {once: true, signal: ctrl.signal}
        );

        if (this.defaultTimeout > 0) timeout = setTimeout(
            endTask,
            this.defaultTimeout,
            'Timeout reached'
        );

        try {
            return await Promise.race([task, fail]);
        } finally {
            endTask();
        }
    }

    /**
     * 设置默认任务超时（单位：毫秒）
     * @param {number} ms  超时时间，非负整数;0表示取消超时限制
     * @throws {Error} 如果ms参数无效
     */
    public timeout(ms: number): void {
        if (!Number.isInteger(ms) || ms < 0) {
            throw new Error("Timeout must be a non-negative integer");
        }
        this.defaultTimeout = ms;
    }

    /**
     * 全局中断池中任务.后续提交将立即报错,且所有包装中的任务会因abort而reject.
     * 注意: 对于已启动的异步操作,若内部不支持abort则不能真正取消其执行.
     */
    public abort() {
        if (this.ctrl.signal.aborted) return;
        this.ctrl.abort();
    }

    /**
     * 获取当前活跃的任务数
     * @returns {number}
     */
    public get activeTaskCount(): number {
        return this.activeTasks.size;
    }

    /**
     * 获取并发上限
     * @returns {number}
     */
    public getMaxConcurrentTasks(): number {
        return this.maxConcurrentTasks;
    }

    public signal() {
        return this.ctrl.signal;
    }
}
