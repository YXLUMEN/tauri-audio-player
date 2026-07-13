import {QueueSystem} from "./QueueSystem.ts";
import {listen} from "@tauri-apps/api/event";

export class Tray {
    private static initialized = false;

    public static async init() {
        if (this.initialized) return;
        this.initialized = true;

        await listen<string>('tray://action', event => {
            switch (event.payload) {
                case 'forward':
                    QueueSystem.MODE.playPrev();
                    break;
                case 'pause-play':
                    QueueSystem.CONTROLLER.togglePause()
                    break;
                case 'backward':
                    QueueSystem.MODE.playNext();
                    break;
            }
        });
    }
}

