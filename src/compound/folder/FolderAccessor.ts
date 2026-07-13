import {FolderContext} from "../../context/FolderContext.ts";

export class FolderAccessor {
    private readonly context: FolderContext;

    public constructor(context: FolderContext) {
        this.context = context;
    }

    public getChosen() {
        return this.context.chosen;
    }

    public getChosenId(): number | null {
        const id = this.context.chosen?.getAttribute('data-folder-id');
        if (id == null) return null;
        const idx = Number(id);
        return Number.isSafeInteger(idx) ? idx : null;
    }

    public hasId() {
        return this.getChosenId() !== null;
    }

    public isId(id: number) {
        return this.getChosenId() === id;
    }
}