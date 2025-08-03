import * as d from "./data";
import createAlert from "./tools/base_page";
import {choseFolderToCollect, getNewFolderInfo, playChosenRow, renderCustomFolder, displayedContent} from "./index";
import {choseFolderContent, indexContextmenu} from "./env";

// 选择的播放列表音频
let chosenQueueRowId: string = null;

function chosenElement(target: HTMLElement) {
    const row: HTMLElement = target.closest('.row');
    if (row) {
        d.setChosenRow(row);
        indexContextmenu.querySelector('.menu.for-row').classList.add('show');
        return true;
    }

    const queueRow = target.closest('.queue-row');
    if (queueRow) {
        chosenQueueRowId = queueRow.getAttribute('play-index');
        indexContextmenu.querySelector('.menu.for-queue-row').classList.add('show');
        return true;
    }

    const folder: HTMLElement = target.closest('.audio-folder');
    if (folder) {
        d.setChosenFolder(folder);
        indexContextmenu.querySelector('.menu.for-folder').classList.add('show');
        return true;
    }
    return false;
}

// 右键菜单处理歌单内容音频
async function contextmenuHandleRow(action: string) {
    const index = Number(d.chosenRow.getAttribute('index'));
    if (isNaN(index)) return;

    switch (action) {
        case 'play':
            await playChosenRow(d.chosenRow);
            createAlert('开始播放', 'success');
            break;
        case 'add-to-queue':
            await d.pushAudios(displayedContent[index]);
            createAlert('已添加至队列', 'success');
            break;
        case 'next-play':
            await d.insertAudio(d.getAudioIndex() + 1, displayedContent[index]);
            createAlert('将在下一曲播放', 'success');
            break;
        case 'collect':
            await d.collectAudio(await choseFolderToCollect(), displayedContent[index]);
            break;
        case 'de-collect':
            if (d.chosenFolder?.getAttribute('plugin')) return;
            const parent: number = Number(d.chosenFolder.getAttribute('folder_id'));
            const id: string = d.chosenRow.id;
            if (!isNaN(parent) && id) {
                await d.deCollectAudio(parent, id);
                d.chosenFolder.click();
            }
    }

    d.setChosenRow(null);
}

// 右键菜单处理播放列表音频
async function contextmenuHandlerQueueRow(action: string) {
    const index = Number(chosenQueueRowId);
    if (isNaN(index)) return;

    switch (action) {
        case 'play':
            await d.switchAudio(index);
            createAlert('开始播放', 'success');
            break;
        case 'next-play':
            await d.moveAudio(index, d.getAudioIndex() + 1);
            createAlert('将在下一曲播放', 'success');
            break;
        case 'de-play':
            await d.removeAudio(index);
            break;
        case 'collect':
            await d.collectAudio(await choseFolderToCollect(), d.getPlayingQueue()[index]);
            break;
    }

    chosenQueueRowId = null;
}

// 右键菜单处理歌单
async function contextmenuHandleFolder(action: string) {
    const id = Number(d.chosenFolder.getAttribute('folder_id'));
    if (isNaN(id)) return;

    if (action === 'mod-folder') {
        const folder = await getNewFolderInfo();
        if (!folder) return;
        await d.modifyFolder(folder);
    } else if (action === 'delete-folder') {
        await d.deleteFolder(id);
    }

    await renderCustomFolder();
    d.setChosenFolder(null);
}

// 展示右键菜单
document.addEventListener('contextmenu', (event) => {
    event.stopPropagation();
    event.preventDefault();

    indexContextmenu.querySelector('.menu.show')?.classList.remove('show');

    if (!chosenElement(<HTMLElement>event.target)) return;

    indexContextmenu.style.display = 'block';

    const menuWidth = indexContextmenu.offsetWidth;
    const menuHeight = indexContextmenu.offsetHeight;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = event.pageX;
    let top = event.pageY;

    if (left + menuWidth > windowWidth) left = left - menuWidth;
    if (top + menuHeight > windowHeight) top = top - menuHeight;

    indexContextmenu.style.left = `${left}px`;
    indexContextmenu.style.top = `${top}px`;
});

// 右键菜单操作
indexContextmenu.addEventListener('click', (event) => {
    const action = (<HTMLElement>event.target).closest('.item')?.getAttribute('action');
    if (!action) return;
    if (d.chosenRow) contextmenuHandleRow(action).catch(console.error);
    else if (chosenQueueRowId) contextmenuHandlerQueueRow(action).catch(console.error);
    else if (d.chosenFolder) contextmenuHandleFolder(action).catch(console.error);
});

// 隐藏右键菜单
document.addEventListener('click', (event) => {
    indexContextmenu.style.display = 'none';

    if (!choseFolderContent.parentElement.contains(<HTMLElement>event.target)) {
        choseFolderContent.parentElement.classList.remove('show');
    }
}, true);

function initContextMenu(): void {
}

export {
    initContextMenu,
}