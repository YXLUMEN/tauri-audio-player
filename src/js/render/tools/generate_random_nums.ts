export class LCGRandomNum {
    public seed: number;
    public decimals: number;

    constructor(options: any) {
        const _options = {
            seed: Date.now(),
            decimals: 0,
            ...options
        };

        this.seed = (_options.seed || Date.now()) % 999999999;
        this.decimals = _options.decimals;
    }

    next(max: number): number {
        const rnd = (this.seed * 9301 + 49297) % 233280;
        const result = Math.floor(rnd / 233280.0 * max);
        return this.decimals ? Number(result.toFixed(this.decimals)) : result;
    }
}

export class MersenneTwister {
    private readonly N: number;
    private readonly M: number;
    private readonly MATRIX_A: number;
    private readonly UPPER_MASK: number;
    private readonly LOWER_MASK: number;
    private readonly mt: any[];
    private index: number;

    constructor(seed: number = Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) {
        this.N = 624;
        this.M = 397;
        this.MATRIX_A = 0x9908b0df;
        this.UPPER_MASK = 0x80000000;
        this.LOWER_MASK = 0x7fffffff;
        this.mt = new Array(this.N);
        this.index = this.N;
        this.mt[0] = seed;

        for (let i = 1; i < this.N; i++) {
            this.mt[i] = (1812433253 * (this.mt[i - 1] ^ (this.mt[i - 1] >>> 30)) + i) & 0xffffffff;
        }
    }

    extractNumber(): number {
        if (this.index >= this.N) this.twist();
        let y = this.mt[this.index];
        y ^= (y >>> 11);
        y ^= ((y << 7) & 0x9d2c5680);
        y ^= ((y << 15) & 0xefc60000);
        y ^= (y >>> 18);
        this.index++;
        return y >>> 0;
    }

    twist(): void {
        for (let i = 0; i < this.N; i++) {
            const y = (this.mt[i] & this.UPPER_MASK) + (this.mt[(i + 1) % this.N] & this.LOWER_MASK);
            this.mt[i] = this.mt[(i + this.M) % this.N] ^ (y >>> 1);
            if (y % 2 !== 0) this.mt[i] ^= this.MATRIX_A;
        }
        this.index = 0;
    }
}

export class xorShiftRandom {
    private seed: number;

    constructor(seed = Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) {
        this.seed = seed;
    }

    next(): number {
        this.seed ^= this.seed << 13;
        this.seed ^= this.seed >> 17;
        this.seed ^= this.seed << 5;
        this.seed = this.seed >>> 0;
        return this.seed;
    }
}

export function inRange(randomNum: number, min: number, max: number): number {
    return min + (randomNum % (max - min + 1));
}


// Fisher-Yates算法
export function shuffleArray(array: number[]): number[] {
    if (!Array.isArray(array)) {
        throw new TypeError("Expected an array to shuffle.");
    }

    const copy = array.slice();
    for (let i = copy.length; i--;) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * 生成随机数组; 使用Fisher-Yates算法; 未来可能会针对大数进行优化, 如使用Promise.
 * @param max Maximum value (exclusive)
 * @param count Number of values to generate (defaults to max)
 * @throws {RangeError} If count is less than one or greater than max
 * */
export function generateUniqueRandomNumbers(max: number, count: number = max): number[] {
    if (!Number.isInteger(max) || !Number.isInteger(count)) {
        throw new TypeError('Parameters must be integers');
    }
    if (max < 0) throw new RangeError('Max must be non-negative');
    if (count < 1) throw new RangeError('Count must be larger than 1');
    if (count > max) throw new RangeError(`Count (${count}) cannot exceed max value (${max})`);

    const allNumbers = Array.from({length: max}, (_, i) => i);
    return shuffleArray(allNumbers).slice(0, count);
}

export function randomCover(): string {
    return `/img/audio/cover/audio-${Math.round(Math.random() * 30)}.webp`;
}