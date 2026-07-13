import {BaseCompound} from "../BaseCompound.ts";
import {dbHelper} from "../../database/db_init.ts";
import {createAlert} from "../../util/alert.ts";
import {FolderInfo} from "../../types/FolderInfo.ts";
import {FolderList} from "./FolderList.ts";
import {FolderContext} from "../../context/FolderContext.ts";
import {appEvent} from "../../event/EventBus.ts";
import {FolderRecord} from "../../types/FolderRecord.ts";

export class CustomFolderRender extends BaseCompound {
    private readonly context: FolderContext;
    private customList: HTMLElement | null = null;

    public constructor(context: FolderContext) {
        super();
        this.context = context;
        this.render = this.render.bind(this);
        appEvent.on('folder:custom:change', this.render);
    }

    private async render(): Promise<void> {
        if (!this.customList) {
            console.error('Custom folder has not initial');
            return;
        }

        const result = await dbHelper.getAll<FolderRecord>('folder');
        if (result.isErr()) {
            console.error(result.unwrapErr());
            createAlert('渲染歌单出错');
            return;
        }

        const folders = result.unwrap();
        if (folders.length === 0) {
            this.customList.replaceChildren(FolderList.createFolderItem(FolderInfo.DEFAULT));
            await dbHelper.add('folder', FolderInfo.DEFAULT);
            return;
        }

        const frag = document.createDocumentFragment();
        for (const folder of folders) {
            frag.appendChild(FolderList.createFolderItem(folder));
        }
        this.customList.replaceChildren(frag);
        this.context.chosen?.classList.add('current');
    }

    public mount(target: HTMLElement): Promise<void> {
        this.customList = target;
        return this.render();
    }
}