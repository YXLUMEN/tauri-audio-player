import {BaseCompound} from "../BaseCompound.ts";
import {createAlert} from "../../util/alert.ts";
import {dbHelper} from "../../database/db_init.ts";
import {ShortcutSystem} from "../../system/ShortcutSystem.ts";
import {CustomKeyBinding} from "../../types/KeyBindingDef.ts";
import {ActionKey} from "../../builtin/ActionKey.ts";
import {AlertCategories} from "../../types/AlertCategories.ts";

export class SettingShortcut extends BaseCompound {
    private pendingAbort: AbortController | null = null;

    public constructor() {
        super(true);
        this.onClick = this.onClick.bind(this);
        this.onAxuClick = this.onAxuClick.bind(this);
    }

    private onClick(event: PointerEvent): void {
        this.pendingAbort?.abort();

        const target = (event.target as HTMLElement).closest('.key');
        if (!target) return;
        const action = target.getAttribute('data-action') as ActionKey | null;
        if (!action) return;

        const ctrl = new AbortController();
        const signal = ctrl.signal;
        this.pendingAbort = ctrl;

        const disposer = ShortcutSystem.GUARD.disable();
        target.classList.add('modifying');

        signal.addEventListener('abort', () => {
            target.classList.remove('modifying');
            disposer.dispose();
        }, {once: true});

        document.addEventListener('keydown', async event => {
            event.stopPropagation();
            event.preventDefault();

            const code = event.code;
            if (code === 'Escape') {
                ctrl.abort();
                return;
            }

            const key = ShortcutSystem.REGISTER.toLookupKey(event);
            if (ShortcutSystem.REGISTER.isConflict(key)) {
                createAlert('按键重复', AlertCategories.WARN);
                ctrl.abort();
                return;
            }

            const ok = ShortcutSystem.REGISTER.override(key, action);
            if (!ok) {
                createAlert('未发现此操作', AlertCategories.WARN);
                ctrl.abort();
                return;
            }

            await dbHelper.update('shortcuts', {action, key} satisfies CustomKeyBinding);
            target.textContent = event.key.toUpperCase();
            ctrl.abort();
        }, {once: true, signal});
    }

    private async onAxuClick(event: PointerEvent): Promise<void> {
        const target = (event.target as HTMLElement).closest('.key');
        if (!target) return;

        const action = target.getAttribute('data-action') as ActionKey | null;
        if (!action) return;

        const origin = ShortcutSystem.REGISTER.getDefault(action);
        if (!origin) return;

        ShortcutSystem.REGISTER.reset(action);
        target.textContent = origin.replace('Key', '');
        target.classList.remove('custom');

        const result = await dbHelper.delete('shortcuts', action);
        if (result.isErr()) {
            createAlert(`重置时出现错误`, AlertCategories.WARN);
            console.error(result.unwrapErr());
        }
    }

    public mount(target: HTMLElement): Promise<void> {
        target.addEventListener('click', this.onClick);
        target.addEventListener('auxclick', this.onAxuClick);
        return Promise.resolve();
    }
}