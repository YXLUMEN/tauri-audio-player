import {config} from "../util/util.ts";
import {Confirm} from "../types/AlertCategories.ts";

export const DefaultConfirm: Confirm = config({
    timeout: 0,
    flag: 'default',
    category: 'info',
    defaultResult: false,
    strictTimeout: false,
    animation: true,
});