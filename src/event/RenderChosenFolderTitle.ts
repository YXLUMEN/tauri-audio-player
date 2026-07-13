export class RenderChosenFolderTitle extends Event {
    public readonly title: string;
    public readonly cover: string;

    public constructor(title: string, cover: string) {
        super('folder:title');
        this.title = title;
        this.cover = cover;
    }
}