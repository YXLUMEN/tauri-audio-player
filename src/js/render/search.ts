import createAlert from "./tools/base_page";
import {setDisplayFolder} from "./index";
import {dbHelper, getPlugin, removeDuplicate} from "./data";
import {IAudioInfo} from "../interfaces/audio";
import {hideLoading, showLoading} from "./env";

async function searchAudios() {
    const input = <HTMLInputElement>document.getElementById('search-input');
    if (!input || input.value.trim() === '') return;

    let result: IAudioInfo[] | null;

    const args = input.value.trim().toLowerCase().split(':');
    const value = args.splice(1).join('').trim();
    showLoading();
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
            result = result.concat(await searchFavour(value));
            result = removeDuplicate(result);
    }

    await setDisplayFolder(result);
    hideLoading();
}

async function searchFavour(arg: string): Promise<IAudioInfo[]> {
    const db = await dbHelper.init();

    const matched: IAudioInfo[] = [];
    const items: Map<string, IAudioInfo> = new Map();

    const tx = db.transaction('favor', 'readonly');
    const store = tx.objectStore('favor');
    const request = store.openCursor();

    const {promise, resolve, reject} = Promise.withResolvers();
    request.onerror = (err) => {
        console.error('Cursor error:', err);
        reject(err);
    };

    request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || items.size >= 128) {
            resolve(null);
            return;
        }

        const audio: IAudioInfo = cursor.value;
        items.set(audio.id, audio);
        cursor.continue();
    }

    await promise;

    for (const raw of items.values()) {
        const standard = await getPlugin(raw.plugin).parse(raw);
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
    const result = await getPlugin('vsm').getAudioList({search: arg});
    if (!result) {
        createAlert('无结果', 'info');
        return;
    }
    return result;
}

export function initSearch() {
    document.getElementById('search-submit').addEventListener('click', searchAudios);
}