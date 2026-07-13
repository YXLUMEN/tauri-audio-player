import {BaseCompound} from "./BaseCompound.ts";

export abstract class LogicalCompound extends BaseCompound {
    protected constructor() {
        super(true);
    }

    public mount(): Promise<void> {
        return Promise.resolve();
    }
}