import {config} from "../util/util.ts";
import {AlertCategories, Confirm} from "../types/AlertCategories.ts";

export const DefaultConfirm: Confirm = config({
    timeout: 0,
    flag: 'default',
    category: AlertCategories.INFO,
    defaultResult: false,
    strictTimeout: false,
    animation: true,
});