export class SwitchAudio extends Event {
    public readonly index: number;
    public readonly force: boolean;
    public readonly instantPlay: boolean;
    public readonly scroll: boolean;

    public constructor(
        index: number,
        force = false,
        instantPlay = true,
        scroll = false
    ) {
        super('queue:switch');

        this.index = Math.max(0, Math.floor(index));
        this.force = force;
        this.instantPlay = instantPlay;
        this.scroll = scroll;
    }
}