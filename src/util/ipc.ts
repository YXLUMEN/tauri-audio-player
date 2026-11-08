import type {AudioMeta} from "../audio/AudioMeta.ts";
import {invoke} from "@tauri-apps/api/core";

export function calculateHash(filePath: string) {
    return invoke('calculate_hash', {filePath})
}

export function fetchMeta(path: string): Promise<AudioMeta> {
    return invoke('fetch_meta', {path});
}