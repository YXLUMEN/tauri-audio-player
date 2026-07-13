import {CallDisposable} from "../../types/CallDisposable.ts";

export class ShortcutGuard {
    private disableCounts: number = 0;
    private scopeStack: string[] = ['global'];

    public blocked(): boolean {
        return this.disableCounts > 0;
    }

    public scope(): string {
        return this.scopeStack[this.scopeStack.length - 1];
    }

    public disable(): CallDisposable {
        this.disableCounts++;
        return new ShortcutGuard.DisableDisposer(this);
    }

    public pushScope(scope: string): CallDisposable {
        this.scopeStack.push(scope);
        return new ShortcutGuard.ScopeDisposer(this.scopeStack, scope);
    }

    private static readonly DisableDisposer = class implements CallDisposable {
        private readonly guard: ShortcutGuard;
        private disposed = false;

        public constructor(guard: ShortcutGuard) {
            this.guard = guard;
        }

        public dispose(): void {
            if (this.disposed) return
            this.disposed = true;
            this.guard.disableCounts--;
        }

        public [Symbol.dispose](): void {
            this.dispose();
        }
    }
    private static readonly ScopeDisposer = class implements CallDisposable {
        private readonly stack: string[];
        private readonly scope: string;
        private disposed = false;

        public constructor(stack: string[], scope: string) {
            this.stack = stack;
            this.scope = scope;
        }

        public dispose() {
            if (this.disposed) return;
            this.disposed = true;

            const idx = this.stack.lastIndexOf(this.scope);
            if (idx !== -1) this.stack.splice(idx, 1);
        }

        public [Symbol.dispose](): void {
            this.dispose();
        }
    }
}