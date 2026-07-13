import {BaseCompound} from "../BaseCompound.ts";
import {FolderInfo} from "../../types/FolderInfo.ts";
import {dbHelper} from "../../database/db_init.ts";
import {randomCover} from "../../util/random.ts";
import {open} from "@tauri-apps/plugin-dialog";
import {Supplier} from "../../types/types.ts";
import {ShortcutSystem} from "../../system/ShortcutSystem.ts";
import {FolderRecord} from "../../types/FolderRecord.ts";

export class FolderInput extends BaseCompound {
    private container: HTMLElement | null = null;
    private name: HTMLInputElement | null = null;
    private desc: HTMLTextAreaElement | null = null;
    private cover: HTMLImageElement | null = null;
    private confirm: HTMLElement | null = null;

    private pendingInput: Supplier<void> | null = null;

    public constructor() {
        super(true);
    }

    public async inputFolderInfos(chosenFolder?: number): Promise<FolderInfo | null> {
        this.pendingInput?.();
        this.pendingInput = null;

        if (!this.container || !this.name || !this.desc || !this.cover || !this.confirm) {
            console.warn('Cannot find DOMElements!');
            return null;
        }

        let originId: number;
        if (!chosenFolder) {
            this.name.value = '';
            this.desc.value = '';
            this.cover.src = randomCover();
        } else {
            const result = await dbHelper.get<FolderRecord>('folder', chosenFolder);
            if (result.isErr()) {
                console.error(`Error while get folder ${chosenFolder}: ${result.unwrapErr()}`);
                return null;
            }

            const folder = result.unwrap();
            if (!folder) return null;

            originId = folder.id;
            this.name.value = folder.name;
            this.desc.value = folder.desc;
            this.cover.src = folder.cover;
        }

        const disposer = ShortcutSystem.GUARD.disable();
        this.container.classList.add('show');
        const content = document.getElementById('folder-content');
        content?.parentElement?.classList.add('hide');

        const abort = new AbortController();
        const {promise, resolve} = Promise.withResolvers<FolderInfo | null>();

        promise.finally(() => {
            this.pendingInput = null;
            abort.abort();

            content?.parentElement?.classList.remove('hide');
            this.container!.classList.remove('show');
            disposer.dispose();
        });

        this.cover.addEventListener('click', async () => {
            try {
                const files = await open({
                    title: '选择图片',
                    directory: false,
                    multiple: false,
                    filters: [{name: 'Images', extensions: ['png', 'jpg', 'cover', 'ico']}]
                });

                if (files) this.cover!.src = files[0];
            } catch (err) {
                console.warn('选择图片被取消或出错', err);
            }
        }, {signal: abort.signal});

        this.confirm.addEventListener('click', event => {
            const action = (event.target as HTMLElement).closest('.base-button')?.getAttribute('action');
            if (!action) return;

            const name = this.name!.value.trim();
            if (action === 'submit' && name !== '') {
                resolve(new FolderInfo(
                    originId,
                    name,
                    this.desc!.value,
                    this.cover!.src,
                ));
            } else if (action === 'cancel') {
                resolve(null);
            }
        }, {signal: abort.signal});

        this.pendingInput = () => resolve(null);
        return promise;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.container = target;
        this.name = this.as(target, '#folder-editor-name', HTMLInputElement);
        this.desc = this.as(target, '#folder-editor-desc', HTMLTextAreaElement);
        this.cover = this.as(target, '#folder-editor-cover', HTMLImageElement);
        this.confirm = this.assert(target, '#folder-editor-buttons');

        return Promise.resolve();
    }
}