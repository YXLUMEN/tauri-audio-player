import {ART} from "./art";
import {AudioModel} from "./audio_model";
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

const loadedPlugins: Record<string, AudioModel> = Object.create(null);

function getPlugin(type: string): AudioModel | null {
    if (!type) return null;

    type = type.toLowerCase();
    const plugin = loadedPlugins[type];
    if (plugin) {
        return plugin;
    }

    let newPlugin: AudioModel | null = null;
    switch (type) {
        case 'art':
            newPlugin = new ART();
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
    AudioModel, ART, Local, isCacheAble, isAuthAble, getPlugin, loadedPlugins
}