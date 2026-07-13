import {Constructor} from "../types/types.ts";

export abstract class BaseCompound {
    public readonly callOnce: boolean;

    protected constructor(callOnce: boolean = false) {
        this.callOnce = callOnce;
    }

    protected assert(target: HTMLElement, selectors: string): HTMLElement {
        const result = target.querySelector(selectors);
        if (result instanceof HTMLElement) {
            return result;
        }
        throw new Error(`Cannot find element with query: ${selectors}`);
    }

    protected as<T extends HTMLElement>(
        target: HTMLElement,
        selectors: string,
        type: Constructor<T>
    ): T {
        const result = target.querySelector(selectors);
        if (result instanceof type) {
            return result;
        }
        throw new Error(`Cannot find element with query: ${selectors}`);
    }

    public abstract mount(target: HTMLElement, pageName: string): Promise<void>;

    public unmount(): Promise<void> {
        return Promise.resolve();
    }
}
