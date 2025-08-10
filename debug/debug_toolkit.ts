interface TimingOptions {
    iterations?: number;  // 统计次数
    warmup?: number;      // 预热次数
    label?: string;       // 标记
    forceAsync?: boolean; // 即使返回非 Promise 也用微任务包裹
    collectSamples?: boolean; // 是否返回每次样本
}

interface TimingResult {
    label: string;
    iterations: number;
    total: number; // ms
    mean: number;
    median: number;
    p95: number;
    min: number;
    max: number;
    samples?: number[];
}

export function timingIt<T>(fn: () => T | Promise<T>, opts: TimingOptions = {}): Promise<TimingResult> | TimingResult {
    const {
        iterations = 10,
        warmup = 2,
        label = String(Date.now()),
        forceAsync = false,
        collectSamples = false,
    } = opts;

    const runOnce = async () => {
        const t0 = performance.now();
        const r = fn();
        if (forceAsync || (r && typeof (r as any).then === 'function')) {
            await r;
        }
        const t1 = performance.now();
        return t1 - t0;
    };

    const run = async () => {
        // 预热
        for (let i = 0; i < warmup; i++) {
            await runOnce();
        }

        const samples: number[] = [];
        for (let i = 0; i < iterations; i++) {
            samples.push(await runOnce());
        }

        samples.sort((a, b) => a - b);
        const total = samples.reduce((a, b) => a + b, 0);
        const mean = total / iterations;
        const median = samples.length % 2
            ? samples[(samples.length - 1) / 2]
            : (samples[samples.length / 2 - 1] + samples[samples.length / 2]) / 2;
        const idx95 = Math.min(samples.length - 1, Math.floor(samples.length * 0.95));
        const p95 = samples[idx95];
        const min = samples[0];
        const max = samples[samples.length - 1];

        const res: TimingResult = {
            label,
            iterations,
            total: +total.toFixed(3),
            mean: +mean.toFixed(3),
            median: +median.toFixed(3),
            p95: +p95.toFixed(3),
            min: +min.toFixed(3),
            max: +max.toFixed(3),
            samples: collectSamples ? samples.map(n => +n.toFixed(3)) : undefined,
        };

        // 控制台展示
        console.log(`[timingIt] ${label} -> mean=${res.mean}ms, p95=${res.p95}ms (n=${iterations})`);
        return res;
    };

    // 返回 Promise（统一 async），这样同步/异步使用体验一致
    return run();
}
