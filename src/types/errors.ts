export class DataBaseError extends Error {
    public readonly errorName: string;

    public constructor(msg: string, error?: DOMException | null) {
        super(msg);
        this.errorName = error ? error.name : 'unknown';
    }
}