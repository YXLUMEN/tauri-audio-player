import {PageSplicer} from "./page/PageSplicer.ts";
import {PageSplicerConfig} from "./page/PageSplicerConfig.ts";
import {Window} from "@tauri-apps/api/window";
import {CompoundSystem} from "./compound/CompoundSystem.ts";
import {PageBuilder} from "./page/PageBuilder.ts";
import {NavCompound} from "./compound/global/NavCompound.ts";
import {PlayerSystem} from "./system/PlayerSystem.ts";
import {AudioCompound} from "./compound/global/AudioCompound.ts";
import {ContextmenuSystem} from "./system/ContextmenuSystem.ts";
import {QueueSystem} from "./system/QueueSystem.ts";
import {DetailSystem} from "./system/DetailSystem.ts";
import {ShortcutSystem} from "./system/ShortcutSystem.ts";
import {Tray} from "./system/Tray.ts";
import {FolderSystem} from "./system/FolderSystem.ts";
import {UiSystem} from "./system/UiSystem.ts";
import {LyricSystem} from "./system/LyricSystem.ts";
import {Parsers} from "./plugin/Parsers.ts";
import {invoke} from "@tauri-apps/api/core";
import {SettingsSystem} from "./system/SettingsSystem.ts";
import {HistorySystem} from "./system/HistorySystem.ts";

const app: Window = new Window('main');

export async function run() {
    const ctrl = new AbortController();
    preventEvents(ctrl.signal);

    const audio = new AudioCompound();

    await app.once('save_before_close', async () => {
        await HistorySystem.saveAll(audio);
        await invoke('confirm_save_done');
    });

    const splicerConfig: PageSplicerConfig = {
        basePath: 'pages',
        concurrency: 8,
        fetchTimeout: 15_000,
        maxRetries: 2,
        deferTimeoutBase: 500,
    };

    const splicer = new PageSplicer(splicerConfig);
    const compound = new CompoundSystem();
    const builder = new PageBuilder(compound);

    builder.singleton('nav-bar', new NavCompound(app));

    UiSystem.init();
    ShortcutSystem.init(builder);
    QueueSystem.init(builder, audio);
    DetailSystem.init(builder, audio);
    FolderSystem.init(builder);
    PlayerSystem.init(builder, audio);
    LyricSystem.init(builder, audio);
    ContextmenuSystem.init(builder);
    SettingsSystem.init(builder, audio);
    await Tray.init();
    await Parsers.loadAll();

    await splicer.bootstrap(document.body);
    ctrl.abort();

    await HistorySystem.load(audio);
}

function preventEvents(signal: AbortSignal) {
    document.addEventListener('keydown', ev => {
        ev.preventDefault();
        ev.stopPropagation();
    }, {signal});

    document.addEventListener('contextmenu', ev => {
        ev.preventDefault();
        ev.stopPropagation();
    }, {signal});

    window.addEventListener('beforeunload', ev => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
    }, {signal});
}