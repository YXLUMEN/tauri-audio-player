import {Supplier} from "./types.ts";

export interface ClosePriority {
    readonly priority: number;
    readonly close: Supplier<boolean>;
}