import {BaseCompound} from "../BaseCompound.ts";
import {throttlePromise} from "../../util/util.ts";
import {createAlert, createConfirm} from "../../util/alert.ts";
import {clearPlayingQueueHistory} from "../../database/db_util.ts";
import {Parsers} from "../../plugin/Parsers.ts";
import {AlertCategories} from "../../types/AlertCategories.ts";

export class CleanCache extends BaseCompound {
    public constructor() {
        super(true);
    }

    public mount(target: HTMLElement): Promise<void> {
        const task = throttlePromise(async (event: PointerEvent) => {
            const action = (event.target as HTMLElement).getAttribute('data-action');
            if (!action) return;

            switch (action) {
                case 'clean-parse-cache': {
                    const ok = await createConfirm('将清空所有解析缓存,可能暂时降低运行效率');
                    if (!ok) return;

                    for (const entry of Parsers.iter()) {
                        await entry[1].clearCache();
                    }
                    createAlert('已清理解析缓存', AlertCategories.SUCCESS);
                    return;
                }
                case 'clean-history': {
                    localStorage.removeItem('playing');
                    void clearPlayingQueueHistory();
                    createAlert('已清除播放历史', AlertCategories.SUCCESS);
                    return;
                }
            }
        }, 1000);

        target.addEventListener('click', task);
        return Promise.resolve();
    }
}