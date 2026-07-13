import {clamp} from "../util/Math.ts";

export class ForceUpdateProgressBar extends Event {
    public readonly duration: number;
    public readonly current: number;

    public constructor(duration: number, current: number) {
        super('ui:psg');

        if (!Number.isFinite(current) || !Number.isFinite(duration)) {
            throw new TypeError('Argument must be a valid number');
        }
        this.duration = Math.max(0, duration);
        this.current = clamp(current, 0, duration);
    }
}