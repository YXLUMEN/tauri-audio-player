export class DetailRemove extends Event {
    public readonly index: number;
    public readonly id: string;

    public constructor(index: number, id: string) {
        super('detail:content:remove');
        this.index = index;
        this.id = id;
    }
}