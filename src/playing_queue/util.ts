import {IAudioInfo} from "../types/audio";

// 去除重复歌曲
export function removeDuplicate(array: IAudioInfo[]): IAudioInfo[] | null {
    if (array.length === 0) return null;

    const merge = new Map<string, IAudioInfo>();
    for (const item of array) {
        if (item?.id !== undefined && !merge.has(item.id)) {
            merge.set(item.id, item);
        }
    }

    return merge.values().toArray();
}
