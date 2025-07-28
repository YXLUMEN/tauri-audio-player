import {VSM} from "./vsm";
import {AbsAudioModel} from "./audio_model";
import {Local} from "./local";
import {CacheAble} from "./cache_able";

function isCacheAble(plugin: unknown): plugin is CacheAble {
    return typeof plugin === 'object'
        && plugin !== null
        && typeof (plugin as CacheAble).getCache === 'function';
}


export {
    AbsAudioModel, VSM, Local, isCacheAble
}