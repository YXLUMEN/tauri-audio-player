export class ToggleLoading extends Event {
    public readonly show: boolean;

    public constructor(show: boolean) {
        super('queue:loading', {bubbles: false});
        this.show = show;
    }
}