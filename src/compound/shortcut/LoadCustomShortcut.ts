import {BaseCompound} from "../BaseCompound.ts";
import {ShortcutRegistry} from "./ShortcutRegistry.ts";
import {dbHelper} from "../../database/db_init.ts";
import {CustomKeyBinding} from "../../types/KeyBindingDef.ts";

export class LoadCustomShortcut extends BaseCompound {
    private readonly register: ShortcutRegistry;

    public constructor(register: ShortcutRegistry) {
        super(true);
        this.register = register;
    }

    public async mount(target: HTMLElement): Promise<void> {
        const result = await dbHelper.getAll<CustomKeyBinding>('shortcuts');
        if (result.isErr()) {
            console.log(result.unwrapErr());
            return;
        }
        const bindings = result.unwrap();
        if (bindings.length === 0) return;

        const map = this.register.remap(bindings);
        for (const [key, action] of map) {
            const element = target.querySelector(`[data-action="${action}"]`);
            if (element) {
                element.textContent = key.replace('Key', '');
                element.classList.add('custom');
            }
        }
    }
}