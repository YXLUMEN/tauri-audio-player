import {VSM} from "./vsm";
import {AbsAudioModel} from "./audio_model";
import {Local} from "./local";
import {IAuthAble, ICacheAble} from "./apis";

function isCacheAble(plugin: unknown): plugin is ICacheAble {
    return typeof plugin === 'object'
        && plugin !== null
        && typeof (plugin as ICacheAble).getCache === 'function';
}

function isAuthAble(plugin: unknown): plugin is IAuthAble {
    return typeof plugin === 'object'
        && plugin !== null
        && typeof (plugin as IAuthAble).initToken === 'function';
}

export {
    AbsAudioModel, VSM, Local, isCacheAble, isAuthAble,
}