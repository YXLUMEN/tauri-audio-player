import {check} from '@tauri-apps/plugin-updater';
import {relaunch} from '@tauri-apps/plugin-process';
import {createConfirm, playSound} from "../util/alert.ts";

type UpdateResult = 'NoUpdate' | 'UserCancel' | 'Updated' | 'UpdatedAndReboot';

export async function updateApp(callable?: Function): Promise<UpdateResult> {
    const update = await check();
    if (!update) return 'NoUpdate';

    console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);

    const updateIco = document.getElementById('update')!;
    updateIco.classList.remove('hide');
    updateIco.title = `可用更新: ${update.version}`

    await playSound('audio/successful_hit.wav');
    const shouldUpdate = await createConfirm(`发现新版本: ${update.version}`);
    if (!shouldUpdate) return 'UserCancel';

    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
        switch (event.event) {
            case 'Started':
                contentLength = event.data.contentLength ?? 0;
                console.log(`started downloading ${event.data.contentLength} bytes`);
                callable?.({done: false, contentLength});
                break;
            case 'Progress':
                downloaded += event.data.chunkLength;
                console.log(`downloaded ${downloaded} from ${contentLength}`);
                callable?.({done: false, downloaded});
                break;
            case 'Finished':
                console.log('download finished');
                callable?.({done: true});
                break;
        }
    });

    console.log('update installed');
    const restart = await createConfirm('更新完成, 是否立即重启软件', {flag: 'update', category: 'success'});
    if (!restart) {
        updateIco.classList.add('hide');
        return 'Updated';
    }

    await relaunch();
    return 'UpdatedAndReboot';
}