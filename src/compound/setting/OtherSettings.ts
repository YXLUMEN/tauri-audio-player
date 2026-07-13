import {BaseCompound} from "../BaseCompound.ts";
import {createAlert} from "../../util/alert.ts";
import {updateApp} from "../../http/update.ts";

export class OtherSettings extends BaseCompound {
    public constructor() {
        super(true);
        this.onClick = this.onClick.bind(this);
    }

    private onClick(event: PointerEvent) {
        const element = event.target as HTMLElement;
        const action = element.getAttribute('data-action');
        if (!action) return;

        switch (action) {
            case 'check-update':
                void this.checkUpdate();
                break;
            case 'auto-check':
                this.autoCheckUpdate(element);
                break;
            case 'quit-to-tray':
                this.quitToTray(element);
                break;
        }
    }

    private async checkUpdate() {
        const result = await updateApp();
        if (result === 'NoUpdate') {
            createAlert('无可用更新');
        } else if (result === 'UserCancel') {
            createAlert('开始更新', 'info', 0);
        }
    }

    private autoCheckUpdate(element: HTMLElement) {
        if (!(element instanceof HTMLInputElement)) return;

        if (element.checked) localStorage.removeItem('not_check_when_start');
        else localStorage.setItem('not_check_when_start', 'true');
    }

    private quitToTray(element: HTMLElement) {
        if (!(element instanceof HTMLInputElement)) return;

        if (element.checked) localStorage.removeItem('quit-to-tray');
        else localStorage.setItem('not_quit_to_tray', 'true');
    }

    public mount(target: HTMLElement): Promise<void> {
        const autoCheck = this.as(target, '[data-action="auto-check"]', HTMLInputElement);
        if (localStorage.getItem('not_check_when_start')) {
            autoCheck.checked = false;
        }

        const quitToTray = this.as(target, '[data-action="quit-to-tray"]', HTMLInputElement);
        if (localStorage.getItem('not_quit_to_tray')) {
            quitToTray.checked = false;
        }

        target.addEventListener('click', this.onClick);
        return Promise.resolve();
    }
}