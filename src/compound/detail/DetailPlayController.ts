import {BaseCompound} from "../BaseCompound.ts";
import {DetailContext} from "../../context/DetailContext.ts";

export class DetailPlayController extends BaseCompound {
    private readonly context: DetailContext;

    public constructor(context: DetailContext) {
        super(true);
        this.context = context;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.context.audio.addEventListener('play', () => {
            target.classList.remove('hide');
        }, {once: true});
        return Promise.resolve();
    }
}