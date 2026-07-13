import {PageBuilder} from "../page/PageBuilder.ts";
import {HighlightContent} from "../compound/detail/HighlightContent.ts";
import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {DetailSelector} from "../compound/detail/DetailSelector.ts";
import {DetailContext} from "../context/DetailContext.ts";
import {DetailTitle} from "../compound/detail/DetailTitle.ts";
import {DetailPlayController} from "../compound/detail/DetailPlayController.ts";
import {DetailAudioCover} from "../compound/detail/DetailAudioCover.ts";
import {DetailRender} from "../compound/detail/DetailRender.ts";
import {appEvent} from "../event/EventBus.ts";
import {DetailControllerTitle} from "../compound/detail/DetailControllerTitle.ts";
import {DetailDragManager} from "../compound/detail/DetailDragManager.ts";
import {DetailAccessor} from "../compound/detail/DetailAccessor.ts";
import {DetailAddAll} from "../compound/detail/DetailAddAll.ts";

export class DetailSystem {
    public static ACCESSOR: DetailAccessor;

    public static init(builder: PageBuilder, audio: AudioCompound) {
        const context = new DetailContext(audio.audio);

        this.ACCESSOR = new DetailAccessor(context);

        builder.singleton('detail-play-controller', new DetailPlayController(context));
        builder.singleton('detail-render', new DetailRender(context));
        builder.singleton('detail-select', new DetailSelector(context));
        builder.singleton('highlight-folder-content', new HighlightContent(context));
        builder.singleton('detail-title', new DetailTitle());
        builder.singleton('detail-cover', new DetailAudioCover(context));
        builder.singleton('detail-controller-title', new DetailControllerTitle());
        builder.singleton('detail-drag-manager', new DetailDragManager(context));
        builder.singleton('detail-add-all', new DetailAddAll(context));

        appEvent.on('folder:chosen', () => context.queueMerged = false);

        Object.freeze(this);
    }
}