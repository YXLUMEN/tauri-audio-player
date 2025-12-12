import {AudioInfo} from "../types/audio";

// 去除重复歌曲
export function removeDuplicate(array: AudioInfo[]): AudioInfo[] | null {
    if (array.length === 0) return null;

    const merge = new Map<string, AudioInfo>();
    for (const item of array) {
        if (!merge.has(item.id)) {
            merge.set(item.id, item);
        }
    }

    return merge.values().toArray();
}
