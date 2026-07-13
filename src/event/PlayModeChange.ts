export class PlayModeChange extends Event {
    public readonly mode: number;

    public constructor(mode: number) {
        super('queue:mode');
        this.mode = mode;
    }
}