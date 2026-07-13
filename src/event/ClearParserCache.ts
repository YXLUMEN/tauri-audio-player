export class ClearParserCache extends Event {
    public readonly force: boolean;

    public constructor(force: boolean = false) {
        super('parser:clear-cache');
        this.force = force;
    }
}