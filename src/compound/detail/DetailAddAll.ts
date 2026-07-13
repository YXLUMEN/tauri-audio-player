import {BaseCompound} from "../BaseCompound.ts";
import {DetailContext} from "../../context/DetailContext.ts";
import {throttleTimeOut} from "../../util/util.ts";
import {QueueSystem} from "../../system/QueueSystem.ts";
import {createAlert} from "../../util/alert.ts";

export class DetailAddAll extends BaseCompound {
    private readonly context: DetailContext;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;
    }

    public mount(target: HTMLElement): Promise<void> {
        const onClick = throttleTimeOut(() => {
            QueueSystem.QUEUE.push(this.context.displayed());
            createAlert('已添加到播放列表', 'success');
        }, 2000);

        target.addEventListener('click', onClick);
        return Promise.resolve();
    }
}