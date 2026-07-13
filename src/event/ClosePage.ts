export class ClosePage extends Event {
    public constructor() {
        super('ui:close', {cancelable: true});
    }
}