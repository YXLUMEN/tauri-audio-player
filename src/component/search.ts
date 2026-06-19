import {AudioInfo} from "../types/audio";
import {dbHelper} from "../database/db_init";
import {createAlert} from "../utils/front/alert";
import {QueueRender} from "../playing_queue/queue_render";
import {removeDuplicate} from "../playing_queue/util";
import {getPlugin} from "../plugins";
import {setDisplayFolder} from "../index/index_render.ts";

export async function searchAudios() {
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    if (!input || input.value.trim() === '') return;

    let result: AudioInfo[] | null;

    const arg = input.value.trim().toLowerCase();
    const args = arg.split(':');
    const value = args.length > 1 ? args.splice(1).join('').trim() : arg;
    QueueRender.showLoading();

    switch (args[0]) {
        case 'a':
        case 'art':
            result = await searchArt(value);
            break;
        case 'l':
        case 'local':
            result = await searchLocal(value);
            break;
        default:
            result = await searchArt(value);
            if (!result) result = [];
            const local = await searchLocal(value);
            result.push(...local);
            result = removeDuplicate(result);
    }

    await setDisplayFolder(result);
    QueueRender.hideLoading();
}

export async function searchLocal(arg: string): Promise<AudioInfo[]> {
    const db = await dbHelper.init();

    const items: Map<string, AudioInfo> = new Map();

    const {promise: dbTask, resolve} = Promise.withResolvers<void>();
    const tx = db.transaction('favor', 'readonly');
    const store = tx.objectStore('favor');
    const request = store.openCursor();

    request.onerror = event => {
        console.error(`[Search] Error on cursor: ${event.type}`);
        resolve();
    };

    request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.size >= 128) {
            resolve();
            return;
        }

        const audio: AudioInfo = cursor.value;
        items.set(audio.id, audio);
        cursor.continue();
    }

    await dbTask;

    const matched: AudioInfo[] = [];
    const searchArg = arg.toLowerCase();
    for (const item of items.values()) {
        const plugin = getPlugin(item.plugin);
        if (!plugin) continue;

        const standard = await plugin.parse(item);
        if (!standard) continue;

        const {title, album, artist} = standard;
        if (!title || !album || !artist) continue;
        if (
            title.toLowerCase().includes(searchArg) ||
            album.toLowerCase().includes(searchArg) ||
            artist.toLowerCase().includes(searchArg)
        ) {
            matched.push(standard);
        }
    }

    return matched;
}

export async function searchArt(arg: string): Promise<AudioInfo[] | null> {
    const plugin = getPlugin('art');
    if (!plugin) return null;

    const result = await plugin.getAudioList({search: arg});
    if (!result) {
        createAlert('无结果', 'info');
        return null;
    }
    return result;
}

export function initialize() {
    document.getElementById('search-submit')!.addEventListener('click', searchAudios);
}