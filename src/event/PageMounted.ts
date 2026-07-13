export class PageMounted extends Event {
    public readonly name: string;
    public readonly content: HTMLElement;

    public constructor(name: string, content: HTMLElement) {
        super('page:mounted', {bubbles: true});
        this.name = name;
        this.content = content;
    }
}
