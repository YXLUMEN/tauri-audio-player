import {BaseCompound} from "../BaseCompound.ts";
import {dbHelper} from "../../database/db_init.ts";
import {FolderList} from "./FolderList.ts";
import {FolderRecord} from "../../types/FolderRecord.ts";

export class FolderChosenPopup extends BaseCompound {
    private content: HTMLElement | null = null;

    public constructor() {
        super(true);
    }

    public async select(): Promise<number | null> {
        if (!this.content) return null;

        const result = await dbHelper.getAll<FolderRecord>('folder');
        if (result.isErr()) {
            console.error(`Cannot find folder: ${result.unwrapErr()}`);
            return null;
        }

        const playList = result.unwrap();
        if (playList.length === 0) return null;

        const frag = document.createDocumentFragment();
        for (const item of playList) {
            frag.appendChild(FolderList.createFolderItem(item));
        }

        this.content.replaceChildren(frag);

        const abort = new AbortController();
        const {promise, resolve} = Promise.withResolvers<number | null>();

        promise.finally(() => {
            abort.abort();
            this.content?.parentElement?.classList.remove('show');
        });

        this.content.addEventListener('click', event => {
            const attribute = (event.target as HTMLElement)
                .closest('.audio-folder')
                ?.getAttribute('data-folder-id');
            if (!attribute) return;

            const id = Number(attribute);
            if (isNaN(id)) return;

            resolve(id);
        }, {signal: abort.signal});

        this.content.parentElement?.classList.add('show');
        return promise;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.content = target;

        document.addEventListener('click', event => {
            if (!target.parentElement?.contains(event.target as HTMLElement)) {
                target.parentElement?.classList.remove('show');
            }
        });

        return Promise.resolve();
    }
}
