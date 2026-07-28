import {BaseCompound} from "../BaseCompound.ts";
import {DetailContext} from "../../context/DetailContext.ts";
import {throttleTimeOut} from "../../util/util.ts";
import {createAlert} from "../../util/alert.ts";
import {AlertCategories} from "../../types/AlertCategories.ts";

export class DetailAddAll extends BaseCompound {
    private readonly context: DetailContext;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;
    }

    public mount(target: HTMLElement): Promise<void> {
        const onClick = throttleTimeOut(() => {
            this.context.queue.push(this.context.displayed());
            createAlert('已添加到播放列表', AlertCategories.SUCCESS);
        }, 2000);

        target.addEventListener('click', onClick);
        return Promise.resolve();
    }
}