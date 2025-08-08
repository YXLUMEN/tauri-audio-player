import {ClientOptions} from "@tauri-apps/plugin-http";

export interface IBaseFetch extends RequestInit, ClientOptions {
    ignore_err?: Array<number>, // baseFetch 不会创建警示框
}