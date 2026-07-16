import {BaseCompound} from "../BaseCompound.ts";
import {DragDropCallbacks, DragDropManager} from "../../util/DragDropManager.ts";
import {updateFavorOrder} from "../../database/db_util.ts";
import {createAlert} from "../../util/alert.ts";
import {FolderSystem} from "../../system/FolderSystem.ts";
import {DetailContext} from "../../context/DetailContext.ts";
import {appEvent} from "../../event/EventBus.ts";
import {DetailMove} from "../../event/detail/DetailMove.ts";

export class DetailDragManager extends BaseCompound {
    private readonly context: DetailContext;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;
    }

    public mount(target: HTMLElement): Promise<void> {
        const callback: DragDropCallbacks = {
            onDragStart: (): boolean => FolderSystem.ACCESSOR.hasId(),
            onDragEnd: (fromIndex: number, toIndex: number): void => {
                if (!this.context.hasContent()) return;

                appEvent.emit(new DetailMove(fromIndex, toIndex));

                const folder = FolderSystem.ACCESSOR.getChosenId();
                if (folder === null) return;

                updateFavorOrder(folder, this.context.displayed()).then(result => {
                    if (result.isErr()) {
                        console.error('更新收藏顺序失败:', result.unwrapErr());
                        createAlert('更新顺序失败', 'error');
                    }
                });
            }
        };

        const manger = new DragDropManager(target, '.row', callback);
        manger.initialize();

        return Promise.resolve();
    }
}