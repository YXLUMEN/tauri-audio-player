import {PageMounted} from "../event/PageMounted.ts";
import {CompoundSupplier} from "../types/types.ts";
import {isDev} from "../builtin/Global.ts";

export class CompoundSystem {
    private readonly compounds: Map<string, CompoundSupplier>;
    private readonly ctrl = new AbortController();
    private readonly mounted: Map<string, WeakSet<HTMLElement>> = new Map();

    public constructor(compounds?: Map<string, CompoundSupplier>) {
        this.compounds = compounds ?? new Map();

        document.addEventListener('page:mounted', (e: PageMounted) => {
            void this.bindPage(e.content, e.name);
        }, {signal: this.ctrl.signal});
    }

    public register(id: string, compound: CompoundSupplier): void {
        if (this.compounds.has(id)) {
            throw new Error(`Compound ${id} already registered`);
        }

        this.compounds.set(id, compound);
    }

    public detach(): void {
        this.compounds.clear();
        this.ctrl.abort();
    }

    private async bindPage(root: HTMLElement, pageName: string): Promise<void> {
        if (root.hasAttribute('data-compound')) {
            await this.resolve(root, pageName);
        }

        const candidates = root.querySelectorAll('[data-compound]');
        for (const candidate of candidates) {
            await this.resolve(candidate as HTMLElement, pageName);
        }
    }

    private async resolve(target: HTMLElement, pageName: string) {
        const tags = target.getAttribute('data-compound');
        if (!tags || tags.length === 0) return;

        const names = tags
            .split(',')
            .values()
            .map(s => s.trim())
            .filter(Boolean);

        for (const name of names) {
            const mountedNodes = this.mounted.getOrInsertComputed(name, this.createSet);
            if (mountedNodes.has(target)) {
                if (isDev) console.warn(`[CompoundSystem] Duplicate mount prevented for "${name}" on`, target);
                continue;
            }

            const supplier = this.compounds.get(name);
            if (!supplier) {
                console.warn(`[CompoundSystem] Unknown compound "${name}" on page "${pageName}"`);
                continue;
            }

            const instance = supplier(name, pageName, target);
            if (instance.callOnce) {
                this.compounds.delete(name);
                this.mounted.delete(name);
            }
            try {
                await instance.mount(target, pageName);
            } catch (err) {
                console.error(err);
            }
        }
    }

    private createSet() {
        return new WeakSet<HTMLElement>();
    }
}