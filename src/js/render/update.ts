import {check} from '@tauri-apps/plugin-updater';
import {createConfirm, playSound} from "./tools/base_page";
import {relaunch} from '@tauri-apps/plugin-process';

export async function updateApp(callable?: Function): Promise<number> {
    const update = await check();
    if (!update) return 0;

    console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);

    const updateIco = document.getElementById('update');
    updateIco.classList.remove('hide');
    updateIco.title = `可用更新: ${update.version}`

    await playSound('audio/successful_hit.wav');
    const shouldUpdate = await createConfirm(`发现新版本: ${update.version}`);
    if (!shouldUpdate) return 1;

    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
        switch (event.event) {
            case 'Started':
                contentLength = event.data.contentLength;
                console.log(`started downloading ${event.data.contentLength} bytes`);
                if (callable) callable({done: false, contentLength});
                break;
            case 'Progress':
                downloaded += event.data.chunkLength;
                console.log(`downloaded ${downloaded} from ${contentLength}`);
                if (callable) callable({done: false, downloaded});
                break;
            case 'Finished':
                console.log('download finished');
                if (callable) callable({done: true});
                break;
        }
    });
    callable = null;

    console.log('update installed');
    const restart = await createConfirm('更新完成, 是否立即重启软件', {flag: 'update', category: 'success'});
    if (!restart) {
        updateIco.classList.add('hide');
        return 2;
    }

    await relaunch();
}