export class ToggleLyric extends Event {
    public readonly hide?: boolean;

    public constructor(hide?: boolean) {
        super('lyric:show');
        this.hide = hide;
    }
}