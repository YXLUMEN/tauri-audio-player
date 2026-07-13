import {ClientOptions} from "@tauri-apps/plugin-http";

export interface AppFetch extends RequestInit, ClientOptions {
    ignore_err?: Array<number>,
}