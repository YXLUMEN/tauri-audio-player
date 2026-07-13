import {CompoundSystem} from "../compound/CompoundSystem.ts";
import {CompoundSupplier, Constructor} from "../types/types.ts";
import {BaseCompound} from "../compound/BaseCompound.ts";

export class PageBuilder {
    private readonly sys: CompoundSystem;

    public constructor(sys: CompoundSystem) {
        this.sys = sys;
    }

    public add(name: string, supplier: CompoundSupplier) {
        this.sys.register(name, supplier);
    }

    public poly(name: string, constructor: Constructor<BaseCompound>) {
        this.sys.register(name, () => new constructor);
    }

    public singleton(name: string, instance: BaseCompound) {
        this.sys.register(name, () => instance);
    }
}