import {BaseCompound} from "../BaseCompound.ts";
import {Dsd} from "./dsd.ts";
import SpectrumDiagram from "../../util/SpectrumDiagram.ts";

export class DsdCanvas extends BaseCompound {
    private readonly dsd: Dsd;

    public constructor(dsd: Dsd) {
        super(true);
        this.dsd = dsd;
    }

    public mount(target: HTMLElement): Promise<void> {
        if (!(target instanceof HTMLCanvasElement)) {
            throw new Error('[DsdCompound init] must be HTMLCanvasElement');
        }

        this.dsd.setDsd(new SpectrumDiagram(
            target,
            window.innerWidth,
            380
        ))
        return Promise.resolve();
    }
}