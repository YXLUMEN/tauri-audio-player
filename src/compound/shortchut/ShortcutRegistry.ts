import {ActionKey} from "../../builtin/ShortcutAction.ts";
import {CustomKeyBinding, KeyBindingDef} from "../../types/KeyBindingDef.ts";

export class ShortcutRegistry {
    private readonly actions: Map<ActionKey, string> = new Map();
    private readonly bindings: Map<Scope, Map<string, ActionKey>> = new Map();
    private readonly overrides: Map<Scope, Map<string, ActionKey | null>> = new Map();

    public constructor(builtin: KeyBindingDef[]) {
        for (const def of builtin) {
            this.register(def);
        }
    }

    public resolve(event: KeyboardEvent, scope: string): ActionKey | null {
        const key = this.toLookupKey(event);

        const override: ActionKey | null | undefined = this.overrides.get('global')?.get(key);
        if (override !== undefined) return override;

        const scoped: ActionKey | undefined = this.bindings.get(scope)?.get(key);
        if (scoped) return scoped;

        return this.bindings.get('global')?.get(key) ?? null;
    }

    public override(key: string, action: ActionKey): boolean {
        if (!this.actions.has(action)) return false;

        const overrides = this.overrides.getOrInsertComputed('global', this.createMap);
        overrides.set(key, action);

        const builtin = this.actions.get(action)!;
        overrides.set(builtin, null);
        return true;
    }

    public reset(action: ActionKey, key?: string): void {
        // 目前不支持多Key-Action
        if (!this.actions.has(action)) return;

        const overrides = this.overrides.get('global');
        if (!overrides) return;

        const builtin = this.actions.get(action)!;
        overrides.delete(builtin);

        if (key && overrides.delete(key)) {
            return;
        }

        for (const [key, act] of overrides.entries()) {
            if (act === action) {
                overrides.delete(key);
                break;
            }
        }
    }

    public remap(records: CustomKeyBinding[]): Map<string, ActionKey | null> {
        this.overrides.clear();
        const map = new Map<string, ActionKey | null>();
        for (const {key, action} of records) {
            map.set(key, action);
        }
        this.overrides.set('global', map);
        return map;
    }

    public isConflict(key: string): boolean {
        return this.bindings.get('global')?.get(key) != null;
    }

    public getDefault(action: ActionKey): string | undefined {
        return this.actions.get(action);
    }

    private register(def: KeyBindingDef): void {
        this.bindings.getOrInsertComputed(def.scope, this.createMap).set(def.key, def.action);
        this.actions.set(def.action, def.key);
    }

    public toLookupKey(e: KeyboardEvent): string {
        const mods = [
            e.ctrlKey && 'ctrl',
            e.shiftKey && 'shift',
            e.altKey && 'alt',
            e.metaKey && 'meta'
        ].filter(Boolean).sort().join('+');
        return mods ? `${mods}:${e.code}` : e.code;
    }

    private createMap() {
        return new Map();
    }
}

type Scope = string;