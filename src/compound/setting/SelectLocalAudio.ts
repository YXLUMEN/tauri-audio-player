import {open} from "@tauri-apps/plugin-dialog";
import {invoke} from "@tauri-apps/api/core";
import {PromisePool} from "../../util/PromisePool.ts";
import {appEvent} from "../../event/EventBus.ts";
import {ToggleLoading} from "../../event/queue/ToggleLoading.ts";
import {AudioInfos} from "../../audio/AudioInfos.ts";
import {SwitchAudio} from "../../event/queue/SwitchAudio.ts";
import {BaseCompound} from "../BaseCompound.ts";
import {QueueSystem} from "../../system/QueueSystem.ts";
import {FolderSystem} from "../../system/FolderSystem.ts";
import {collectBatch} from "../../database/db_util.ts";
import {DetailAppend} from "../../event/detail/DetailAppend.ts";

export class SelectLocalAudio extends BaseCompound {
    public constructor() {
        super(true);
        this.select = this.select.bind(this);
    }

    public async select(event: PointerEvent) {
        const target = (event.target as HTMLElement).closest('.base-button');
        if (!target) return;

        try {
            const filePath: string[] | null = await open({
                title: '选则音频',
                multiple: true,
                directory: false,
                filters: [{name: 'Audios', extensions: ['mp3', 'flac', 'wav', 'ogg', 'aac']}]
            });
            if (!filePath) return;
            appEvent.emit(new ToggleLoading(true));

            const job = async (path: string) => {
                const hash = await invoke('calculate_hash', {filePath: path});
                return {hash, path};
            };
            const pool = new PromisePool(16);
            const tasks: Promise<Result>[] = [];
            for (const path of filePath) {
                tasks.push(pool.submit(job, path));
            }

            const results = await Promise.allSettled(tasks);
            const list: AudioInfos[] = results
                .reduce((acc, res) => {
                    if (res.status !== 'fulfilled') return acc;
                    if (typeof res.value.hash === 'string') {
                        const {hash, path} = res.value;
                        acc.push(new AudioInfos(hash, 'local', path));
                    }
                    return acc;
                }, [] as AudioInfos[]);

            const queue = QueueSystem.QUEUE;
            const index = queue.index();
            queue.insert(index + 1, ...list);

            if (target.getAttribute('action') !== 'local-collect') {
                appEvent.emit(new SwitchAudio(index + 1));
                return;
            }

            const folder = await FolderSystem.POPUP.select();
            if (!folder) return;

            const inners = await collectBatch(folder, list);
            if (FolderSystem.ACCESSOR.isId(folder) && inners) {
                appEvent.emit(new DetailAppend(...inners));
            }
        } catch (err) {
            console.error(err);
        } finally {
            appEvent.emit(new ToggleLoading(false));
        }
    }

    public mount(target: HTMLElement): Promise<void> {
        target.addEventListener('click', this.select);
        return Promise.resolve();
    }
}

type Result = { hash: unknown, path: string };