import {BaseCompound} from "../BaseCompound.ts";

export class SettingsPage extends BaseCompound {
    private page: HTMLElement | null = null;

    public constructor() {
        super(true);
        this.toggle = this.toggle.bind(this);
        this.close = this.close.bind(this);
    }

    public toggle() {
        this.page?.classList.toggle('show');
    }

    public close() {
        if (!this.page) return false;
        if (this.page.classList.contains('show')) {
            this.page.classList.remove('show');
            return true;
        }
        return false;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.page = target;
        return Promise.resolve();
    }
}