export class HighlightCurrent extends Event {
    public readonly scroll: boolean;

    public constructor(scroll: boolean = false) {
        super('queue:highlight');
        this.scroll = scroll;
    }
}