export class CoverLoaded extends Event {
    public readonly url: string;

    public constructor(url: string) {
        super('ui:cover-loaded');
        this.url = url;
    }
}