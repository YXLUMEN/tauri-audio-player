import {FolderChosenPopup} from "../compound/folder/FolderChosenPopup.ts";
import {PageBuilder} from "../page/PageBuilder.ts";
import {FolderInput} from "../compound/folder/FolderInput.ts";
import {FolderContext} from "../context/FolderContext.ts";
import {FolderList} from "../compound/folder/FolderList.ts";
import {CreateFolder} from "../compound/folder/CreateFolder.ts";
import {CustomFolderRender} from "../compound/folder/CustomFolderRender.ts";
import {FolderAccessor} from "../compound/folder/FolderAccessor.ts";

export class FolderSystem {
    public static ACCESSOR: FolderAccessor;
    public static POPUP: FolderChosenPopup;
    public static INPUT: FolderInput;

    public static init(builder: PageBuilder) {
        const context = new FolderContext();

        this.ACCESSOR = new FolderAccessor(context);
        this.POPUP = new FolderChosenPopup();
        this.INPUT = new FolderInput();

        builder.singleton('folder-list', new FolderList(context));
        builder.singleton('folder-chosen-popup', this.POPUP);
        builder.singleton('detail-folder-input', this.INPUT);
        builder.singleton('create-folder', new CreateFolder(this.INPUT));
        builder.singleton('custom-folder-render', new CustomFolderRender(context));

        Object.freeze(this);
    }
}