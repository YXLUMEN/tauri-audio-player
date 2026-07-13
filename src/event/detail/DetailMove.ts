export class DetailMove extends Event {
    public readonly from: number;
    public readonly to: number;

    public constructor(from: number, to: number) {
        super('detail:content:move');
        this.from = from;
        this.to = to;
    }
}