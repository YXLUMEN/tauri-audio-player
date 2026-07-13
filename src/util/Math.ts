export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
}

export function randNeg(min: number, max: number) {
    return min + (Math.random() - 0.5) * (max - min);
}

export function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function backoffDelay(n: number, base = 1000, cap = 15000, jitter = 300): number {
    return Math.min(base * Math.pow(2, n), cap) + Math.floor(Math.random() * jitter);
}

export function transTime(value: number) {
    const h = value / 3600 | 0;
    const remaining = value % 3600;
    const m = remaining / 60 | 0;
    const s = remaining % 60 | 0;

    return h > 0 ?
        `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}` :
        `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}