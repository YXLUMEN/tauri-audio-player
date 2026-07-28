export class DetailTooltip extends Event {
    public readonly text: string;

    public constructor(text: string) {
        super('detail:tooltip');
        this.text = text;
    }
}