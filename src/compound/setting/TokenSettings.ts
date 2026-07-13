import {BaseCompound} from "../BaseCompound.ts";
import {dbHelper} from "../../database/db_init.ts";
import {createAlert} from "../../util/alert.ts";
import {Parsers} from "../../plugin/Parsers.ts";
import {PromisePool} from "../../util/PromisePool.ts";
import {clamp} from "../../util/Math.ts";

export class TokenSettings extends BaseCompound {
    private pending = false;

    public constructor() {
        super(true);
        this.setCred = this.setCred.bind(this);
    }

    private async setCred(event: PointerEvent) {
        const element = event.target as HTMLElement;
        if (!element) return;

        const type = element.getAttribute('name');
        if (type !== 'submit') return;

        const parent = element.parentElement;
        if (!parent) return;

        const keyElement = parent.querySelector('input[name="api-key"]') as HTMLInputElement;
        const psdElement = parent.querySelector('input[name="api-psd"]') as HTMLInputElement;
        if (!keyElement || !psdElement) return;

        if (this.pending) return;
        this.pending = true;

        const plugin = parent.getAttribute('data-plugin');
        if (!plugin) {
            this.pending = false;
            return;
        }

        const key = keyElement.value.trim();
        const psd = psdElement.value.trim();
        if (key.length === 0 || psd.length === 0) {
            this.pending = false;
            return;
        }

        const result = await dbHelper.update('auth', {plugin, key, psd});
        if (result.isErr()) {
            const err = result.unwrapErr();
            console.error(err);
            createAlert(`设置失败: ${err.message}`, 'error');
            this.pending = false;
            return;
        }

        const instance = Parsers.get(plugin);
        if (!instance) {
            this.pending = false;
            return;
        }

        await instance.reAuth(key, psd);
        createAlert(`已设置 "${plugin}" API`, 'success');
        this.pending = false;
    }

    private async loadPlugin(plugin: string, label: HTMLElement): Promise<PairWithLabel | void> {
        const instance = Parsers.get(plugin);
        if (!instance) throw new Error(`plugin ${plugin} not found`);

        const result = await dbHelper.get<KeyPair>('auth', plugin);
        if (result.isErr()) {
            throw new Error(`Error while loading plugin: ${plugin}`, {cause: result.unwrapErr()});
        }

        const pair = result.unwrap();
        if (!pair) return;

        await instance.load();
        return {
            label,
            plugin: pair.plugin,
            key: pair.key,
            psd: pair.psd
        };
    }

    private async load(target: HTMLElement) {
        const allLabel = target.querySelectorAll('[data-plugin]');
        if (allLabel.length === 0) return;

        const tasks: Promise<PairWithLabel | void>[] = [];
        const pool = new PromisePool(clamp(allLabel.length, 1, 6));

        for (const label of allLabel) {
            const plugin = label.getAttribute('data-plugin');
            if (!plugin) continue;
            tasks.push(pool.submit(this.loadPlugin, plugin, label));
        }

        let errors = 0;
        const results = await Promise.allSettled(tasks);
        for (const result of results) {
            if (result.status === 'rejected') {
                errors++;
                console.warn('[Token]', result.reason);
                continue;
            }

            const pair = result.value;
            if (!pair) continue;

            const keyElement = pair.label.querySelector('input[name="api-key"]') as HTMLInputElement;
            const psdElement = pair.label.querySelector('input[name="api-psd"]') as HTMLInputElement;
            if (keyElement && psdElement) {
                keyElement.value = pair.key;
                psdElement.value = pair.psd;
            }
        }

        if (errors > 0) {
            createAlert(`加载密钥失败 ${errors}/${allLabel.length}`, 'warning');
        }
    }

    public async mount(target: HTMLElement): Promise<void> {
        await this.load(target);
        target.addEventListener('click', this.setCred);
    }
}

type KeyPair = {
    plugin: string;
    key: string;
    psd: string;
}

type PairWithLabel = {
    label: HTMLElement;
    plugin: string;
    key: string;
    psd: string;
}