import {BaseCompound} from "../BaseCompound.ts";
import {FolderContext} from "../../context/FolderContext.ts";
import {AudioInfos} from "../../types/audio/AudioInfos.ts";
import {getFolderContent} from "../../database/db_util.ts";
import {Parsers} from "../../plugin/Parsers.ts";
import {randomCover} from "../../util/random.ts";
import {appEvent} from "../../event/EventBus.ts";
import {RenderChosenFolderTitle} from "../../event/RenderChosenFolderTitle.ts";
import {DetailChange} from "../../event/detail/DetailChange.ts";
import {FolderChosen} from "../../event/FolderChosen.ts";
import {FolderRecord} from "../../types/FolderRecord.ts";

export class FolderList extends BaseCompound {
    private readonly context: FolderContext;
    private panel: HTMLElement | null = null;

    public constructor(context: FolderContext) {
        super(true);
        this.context = context;
        this.selectFolder = this.selectFolder.bind(this);
    }

    private async selectFolder(event: PointerEvent): Promise<void> {
        if (!this.panel) return;

        const folder = (event.target as HTMLElement).closest('.audio-folder') as HTMLElement;
        if (!folder || folder === this.context.chosen) return;

        this.panel.querySelector('.audio-folder.current')?.classList.remove('current');
        folder.classList.add('current');

        this.context.chosen = folder;
        appEvent.emit(new FolderChosen());

        let audios: AudioInfos[] | null;
        const plugin = folder.getAttribute('plugin');

        if (plugin) {
            audios = await Parsers.get(plugin)?.audios() ?? null;
        } else {
            const id = Number(folder.getAttribute('data-folder-id'));
            if (!Number.isSafeInteger(id)) return;

            const result = await getFolderContent(id);
            if (result.isErr()) return;
            audios = result.unwrap();
        }

        if (!audios) return;

        const title = folder.getElementsByTagName('span')?.[0]?.textContent ?? '歌单';
        const cover = folder.getElementsByTagName('img')?.[0].src ?? randomCover();

        appEvent.emit(new DetailChange(audios));
        appEvent.emit(new RenderChosenFolderTitle(title, cover));
    }

    public mount(target: HTMLElement): Promise<void> {
        this.panel = target;

        const ctrl = new AbortController();
        target.addEventListener('click', async event => {
            const folder = (event.target as HTMLElement).closest('.audio-folder');
            if (!folder) return;

            ctrl.abort();
            await this.selectFolder(event);
            document.getElementById('custom-folder-detail')?.classList.remove('hide');

            target.addEventListener('click', this.selectFolder);
        }, {signal: ctrl.signal});

        return Promise.resolve();
    }

    public static createFolderItem(folder: FolderRecord): HTMLDivElement {
        const div = document.createElement("div");
        div.setAttribute('data-folder-id', folder.id.toString());
        div.classList.add('audio-folder');

        const img = document.createElement("img");
        img.classList.add('small-cover');
        img.src = folder.cover;

        const span = document.createElement("span");
        span.textContent = folder.name;

        div.append(img, span);
        return div;
    }
}