import type {Window} from "@tauri-apps/api/window";
import {BaseCompound} from "../BaseCompound.ts";
import {SettingsSystem} from "../../system/SettingsSystem.ts";

export class NavCompound extends BaseCompound {
    private readonly app: Window;

    public constructor(app: Window) {
        super(true);
        this.app = app;
    }

    public async mount(target: HTMLElement) {
        const app = this.app;

        const maxElement = this.assert(target, '#title-bar-maximize');
        maxElement.onclick = () => app.toggleMaximize();

        this.assert(target, '#title-bar-minimize').onclick = () => app.minimize();
        this.assert(target, '#title-bar-close')!.onclick = () => {
            if (localStorage.getItem('not_quit_to_tray') === null) app.hide();
            else app.close();
        };
        this.assert(target, '#setting').onclick = SettingsSystem.PAGE.toggle;

        const parser = new DOMParser();
        const minStr = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M812.2 65H351.6c-78.3 0-142.5 61.1-147.7 138.1-77 5.1-138.1 69.4-138.1 147.7v460.6c0 81.6 66.4 148 148 148h460.6c78.3 0 142.5-61.1 147.7-138.1 77-5.1 138.1-69.4 138.1-147.7V213c0-81.6-66.4-148-148-148z m-45.8 746.3c0 50.7-41.3 92-92 92H213.8c-50.7 0-92-41.3-92-92V350.7c0-50.7 41.3-92 92-92h460.6c50.7 0 92 41.3 92 92v460.6z m137.8-137.7c0 47.3-35.8 86.3-81.8 91.4V350.7c0-81.6-66.4-148-148-148H260.2c5.1-45.9 44.2-81.8 91.4-81.8h460.6c50.7 0 92 41.3 92 92v460.7z" fill="#8a8a8a"></path></svg>';
        const maxStr = '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M812.3 959.4H213.7c-81.6 0-148-66.4-148-148V212.9c0-81.6 66.4-148 148-148h598.5c81.6 0 148 66.4 148 148v598.5C960.3 893 893.9 959.4 812.3 959.4zM213.7 120.9c-50.7 0-92 41.3-92 92v598.5c0 50.7 41.3 92 92 92h598.5c50.7 0 92-41.3 92-92V212.9c0-50.7-41.3-92-92-92H213.7z" fill="#8a8a8a"></path></svg>';
        const minIco = parser.parseFromString(minStr, 'image/svg+xml').documentElement;
        const maxIco = parser.parseFromString(maxStr, 'image/svg+xml').documentElement;

        await app.onResized(async () => {
            if (await app.isMaximized()) maxElement.replaceChildren(minIco);
            else maxElement.replaceChildren(maxIco);
        });
    }
}