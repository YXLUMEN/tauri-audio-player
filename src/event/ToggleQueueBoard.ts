export class ToggleQueueBoard extends Event {
    public readonly force?: boolean;

    public constructor(force?: boolean) {
        super('queue:board:hide');
        this.force = force;
    }
}