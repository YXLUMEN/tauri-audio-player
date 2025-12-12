import {VSM} from "./vsm";
import {AbsAudioModel} from "./audio_model";
import {Local} from "./local";
import {IAuthAble, ICacheAble} from "../types/plugin";

function isCacheAble(plugin: unknown): plugin is ICacheAble {
    return typeof plugin === 'object'
        && plugin !== null
        && typeof (plugin as ICacheAble).getCache === 'function';
}

function isAuthAble(plugin: unknown): plugin is IAuthAble {
    return typeof plugin === 'object'
        && plugin !== null
        && typeof (plugin as IAuthAble).loadToken === 'function';
}

const loadedPlugins: Record<string, AbsAudioModel> = Object.create(null);

function getPlugin(type: string): AbsAudioModel | null {
    if (!type) return null;

    type = type.toLowerCase();
    const plugin = loadedPlugins[type];
    if (plugin) {
        return plugin;
    }

    let newPlugin: AbsAudioModel | null = null;
    switch (type) {
        case 'vsm':
            newPlugin = new VSM();
            break;
        case 'local':
            newPlugin = new Local();
            break;
        default:
            return null;
    }

    loadedPlugins[type] = newPlugin;
    return newPlugin;
}

export {
    AbsAudioModel, VSM, Local, isCacheAble, isAuthAble, getPlugin, loadedPlugins
}