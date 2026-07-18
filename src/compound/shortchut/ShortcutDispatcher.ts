import {Consumer} from "../../types/types.ts";
import {ShortcutRegistry} from "./ShortcutRegistry.ts";
import {ShortcutGuard} from "./ShortcutGuard.ts";
import {CallDisposable} from "../../types/CallDisposable.ts";
import {ActionKey} from "../../builtin/ActionKey.ts";

export class ShortcutDispatcher {
    private readonly guard: ShortcutGuard;
    private readonly registry: ShortcutRegistry;
    private readonly commands = new Map<ActionKey, Consumer<void>>();

    public constructor(guard: ShortcutGuard, register: ShortcutRegistry) {
        this.guard = guard;
        this.registry = register;

        this.onKeyDown = this.onKeyDown.bind(this);
        document.addEventListener('keydown', this.onKeyDown);
    }

    public register(code: ActionKey, consumer: Consumer<void>): CallDisposable {
        if (this.commands.has(code)) {
            console.warn(`Action ${code} has been override`);
        }
        this.commands.set(code, consumer);
        return new ShortcutDispatcher.Disposer(this, code);
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (
            e.key === 'F5' ||
            (e.ctrlKey && e.key === 'r') ||
            (e.metaKey && e.key === 'r')
        ) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (this.guard.blocked()) return;

        const actionKey: ActionKey | null = this.registry.resolve(e, this.guard.scope());
        if (!actionKey) return;

        const command = this.commands.get(actionKey);
        if (!command) {
            console.warn(`[ShortcutSystem] No command registered for: ${actionKey}`);
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        command();
    }

    public dispose() {
        document.removeEventListener('keydown', this.onKeyDown);
        this.commands.clear();
    }

    private static readonly Disposer = class implements CallDisposable {
        private readonly dispatcher: ShortcutDispatcher;
        private readonly code: ActionKey;
        private disposed: boolean = false;

        public constructor(dispatcher: ShortcutDispatcher, code: ActionKey) {
            this.dispatcher = dispatcher;
            this.code = code;
        }

        public dispose() {
            if (this.disposed) return;
            this.disposed = true;

            this.dispatcher.commands.delete(this.code);
        }

        public [Symbol.dispose](): void {
            this.dispose();
        }
    }
}