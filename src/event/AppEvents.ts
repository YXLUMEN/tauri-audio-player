import {SwitchAudio} from "./SwitchAudio.ts";
import {AudioTitleChange} from "./AudioTitleChange.ts";
import {ClearParserCache} from "./ClearParserCache.ts";
import {CoverLoaded} from "./CoverLoaded.ts";
import {HighlightCurrent} from "./HighlightCurrent.ts";
import {PageMounted} from "./PageMounted.ts";
import {PlayingQueueChange} from "./PlayingQueueChange.ts";
import {ToggleLoading} from "./ToggleLoading.ts";
import {ClosePage} from "./ClosePage.ts";
import {ForceUpdateProgressBar} from "./ForceUpdateProgressBar.ts";
import {RenderChosenFolderTitle} from "./RenderChosenFolderTitle.ts";
import {CustomFolderChange} from "./CustomFolderChange.ts";
import {DetailChange} from "./detail/DetailChange.ts";
import {PlayModeChange} from "./PlayModeChange.ts";
import {LoadLyric} from "./LoadLyric.ts";
import {ToggleLyric} from "./ToggleLyric.ts";
import {FolderChosen} from "./FolderChosen.ts";
import {DetailAppend} from "./detail/DetailAppend.ts";
import {DetailRemove} from "./detail/DetailRemove.ts";
import {DetailMove} from "./detail/DetailMove.ts";


export interface AppEvents {
    'ui:audio-title': AudioTitleChange;
    'ui:cover-loaded': CoverLoaded;
    'ui:close': ClosePage;
    'ui:psg': ForceUpdateProgressBar;
    'queue:switch': SwitchAudio;
    'queue:change': PlayingQueueChange;
    'queue:highlight': HighlightCurrent;
    'queue:loading': ToggleLoading;
    'queue:mode': PlayModeChange;
    'parser:clear-cache': ClearParserCache;
    'folder:title': RenderChosenFolderTitle;
    'folder:custom:change': CustomFolderChange;
    'folder:chosen': FolderChosen;
    'detail:content': DetailChange;
    'detail:content:append': DetailAppend;
    'detail:content:remove': DetailRemove;
    'detail:content:move': DetailMove;
    'lyric:load': LoadLyric;
    'lyric:show': ToggleLyric;
}

declare global {
    interface DocumentEventMap {
        'page:mounted': PageMounted;
    }
}