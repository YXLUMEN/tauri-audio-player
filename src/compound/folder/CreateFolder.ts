import {BaseCompound} from "../BaseCompound.ts";
import {FolderInput} from "./FolderInput.ts";
import {createFolder} from "../../database/db_util.ts";
import {appEvent} from "../../event/EventBus.ts";
import {CustomFolderChange} from "../../event/CustomFolderChange.ts";

export class CreateFolder extends BaseCompound {
    private readonly folderInput: FolderInput;

    public constructor(folderInput: FolderInput) {
        super();
        this.folderInput = folderInput;
        this.onClick = this.onClick.bind(this);
    }

    private async onClick() {
        const folder = await this.folderInput.inputFolderInfos();
        if (!folder) {
            console.warn('Fail to open input page');
            return;
        }

        await createFolder(folder.name, folder.desc, folder.cover);
        appEvent.emit(new CustomFolderChange());
    }

    public mount(target: HTMLElement): Promise<void> {
        target.removeEventListener('click', this.onClick);
        target.addEventListener('click', this.onClick);
        return Promise.resolve();
    }
}