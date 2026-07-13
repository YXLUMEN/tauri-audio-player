import {AudioInfos} from "../../types/audio/AudioInfos.ts";
import {AudioCompound} from "./AudioCompound.ts";
import {QueueCompound} from "../queue/QueueCompound.ts";
import {createAlert} from "../../util/alert.ts";

export class PlayErrorHandler {
    private readonly maxRetries = 5;
    private readonly throttleMs = 1000;
    private readonly queue: QueueCompound;

    private readonly state: RetryState;
    private lastAlertAt: number = 0;

    public constructor(audio: AudioCompound, queue: QueueCompound) {
        this.queue = queue;
        this.state = {
            hash: 0,
            retryCount: 0,
            cooldownUntil: 0,
            pending: false,
            timerId: undefined
        };
    }

    private async onAudioErr(): Promise<void> {
        const hash = this.currentHash();
        if (hash !== null && hash === this.state.hash && this.state.pending) {
            return;
        }

        this.state.pending = true;
        if (this.state.retryCount >= this.maxRetries) {
            createAlert('超过最大重试次数, 请检查Api密钥或者文件是否有效', 'error', 0);
            this.state.retryCount = 0;
            this.state.cooldownUntil = performance.now() + 50_000;
            return;
        }

        this.state.retryCount++;


    }

    private async reloadAudio(index: number): Promise<void> {

    }

    private currentHash(): number | null {
        const current = this.queue.current();
        if (!current) return null;
        const index = this.queue.index();
        return this.getHash(current, index);
    }

    private isStale(hash: number): boolean {
        return this.currentHash() !== hash;
    }

    private reset() {
        this.state.hash = 0;
        this.state.retryCount = 0;
        this.state.cooldownUntil = 0;
        this.state.pending = false;
        this.state.timerId = undefined;
    }

    private getHash(info: AudioInfos, index: number): number {
        return (31 * info.hashCode() + index) | 0;
    }
}

interface RetryState {
    hash: number;
    cooldownUntil: number;
    retryCount: number;
    pending: boolean;
    timerId?: number;
}