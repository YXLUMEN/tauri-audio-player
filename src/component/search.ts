import {IAudioInfo} from "../types/audio";
import {dbHelper} from "../database/db_init";
import {getPlugin} from "../plugins/plugin_init";
import {createAlert} from "../utils/front/alert";
import {QueueRender} from "../playing_queue/queue_render";
import {removeDuplicate} from "../playing_queue/util";
import {IndexRender} from "../index/index_render";

async function searchAudios() {
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    if (!input || input.value.trim() === '') return;

    let result: IAudioInfo[] | null;

    const args = input.value.trim().toLowerCase().split(':');
    const value = args.splice(1).join('').trim();
    QueueRender.showLoading();

    switch (args[0]) {
        case 'v':
        case 'vsm':
            result = await searchVsm(value);
            break;
        case 'f':
        case 'fa':
        case 'favor':
        case 'favour':
            result = await searchFavour(value);
            break;
        default:
            result = await searchVsm(value);
            if (!result) break;
            result = result.concat(await searchFavour(value));
            result = removeDuplicate(result);
    }

    await IndexRender.setDisplayFolder(result);
    QueueRender.hideLoading();
}

async function searchFavour(arg: string): Promise<IAudioInfo[]> {
    const db = await dbHelper.init();
    const {promise, resolve} = Promise.withResolvers<void>();

    const matched: IAudioInfo[] = [];
    const items: Map<string, IAudioInfo> = new Map();

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

        const audio: IAudioInfo = cursor.value;
        items.set(audio.id, audio);
        cursor.continue();
    }

    await promise;

    arg = arg.toLowerCase();
    for (const raw of items.values()) {
        const standard = await getPlugin(raw.plugin)?.parse(raw);
        if (!standard) continue;
        const {title, album, artist} = standard;
        if (
            title.toLowerCase().includes(arg) ||
            album.toLowerCase().includes(arg) ||
            artist.toLowerCase().includes(arg)
        ) {
            matched.push(standard);
        }
    }

    return matched;
}

async function searchVsm(arg: string): Promise<IAudioInfo[] | null> {
    const result = await getPlugin('vsm')?.getAudioList({search: arg});
    if (!result) {
        createAlert('无结果', 'info');
        return null;
    }
    return result;
}

export function initSearch() {
    document.getElementById('search-submit')!.addEventListener('click', searchAudios);
}