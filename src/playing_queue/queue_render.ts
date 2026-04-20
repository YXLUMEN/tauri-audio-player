import {AudioInfo, StandardAudio} from "../types/audio";
import {appendChildren} from "../utils/front/element";
import {createAlert} from "../utils/front/alert";
import {PlayMode} from "../play/play_mode";
import {QueueStatus} from "./queue_status";
import {getPlugin} from "../plugins";
import {DragDropManager} from "../utils/DragDropManager";

export class QueueRender {
    private static readonly indexLoading = document.getElementById('index-loading')!;
    private static readonly indexAudioCover = document.getElementById('index-audio-cover')!;
    private static readonly playingQueue = document.getElementById('playing-queue')!;
    private static readonly playingBoard = document.getElementById('playing-board-container')!;
    private static readonly folderContent = document.getElementById('folder-content')!;

    private static dragDropManager: DragDropManager | null = null;

    private static createPlayingQueueItem(index: number, standardInfo: StandardAudio): HTMLDivElement {
        const row = document.createElement('div');
        row.setAttribute('play-index', index.toString());
        row.classList.add('queue-row');

        const cover = document.createElement('img');
        cover.src = standardInfo.cover;
        cover.classList.add('small-cover');

        const title = document.createElement('div');
        const titleSpan = document.createElement('span');
        const artistSpan = document.createElement('span');
        titleSpan.textContent = standardInfo.title;
        artistSpan.textContent = standardInfo.artist;

        artistSpan.classList.add('less');
        title.classList.add('title');
        title.append(titleSpan, artistSpan);

        appendChildren(row, cover, title);
        return row;
    }

    /**
     * 渲染播放列表
     * @param queue 将渲染的列表,为空跳过
     * @param replace 是否重新渲染整个列表
     * */
    public static async renderPlayingQueue(queue: AudioInfo[], replace: boolean = true): Promise<void> {
        if (queue.length === 0) return;

        const frag = document.createDocumentFragment();
        const promises: Promise<StandardAudio | null>[] = [];

        for (const audio of queue) {
            const plugin = getPlugin(audio.plugin);
            if (!plugin) continue;
            promises.push(plugin.parse(audio));
        }

        const parsed = await Promise.all(promises);
        for (let i = 0; i < parsed.length; i++) {
            const standard = parsed[i];
            if (!standard) continue;
            frag.appendChild(this.createPlayingQueueItem(i, standard))
        }
        const loadFailed = queue.length - frag.childElementCount;

        replace ? this.playingQueue.replaceChildren(frag) : this.playingQueue.append(frag);
        if (this.playingBoard.classList.contains('hide')) {
            this.playingQueue.scrollTo({top: 0});
        }

        this.highlightCurrentPlaying(false);
        if (loadFailed > 0) createAlert(`${loadFailed} 个文件无法加载`, 'warning');
    }

    public static highlightCurrentPlaying(scroll: boolean = true): void {
        // 高亮播放列表行
        const currentPlayingEle = this.playingQueue.querySelector(
            `[play-index='${QueueStatus.getCurrentIndex()}']`
        );
        if (currentPlayingEle instanceof HTMLElement) {
            this.playingBoard.querySelector('.queue-row.current')?.classList.remove('current');
            currentPlayingEle.classList.add('current');

            if (scroll) {
                this.playingQueue.scrollTo({top: currentPlayingEle.offsetTop - 150, behavior: 'smooth'});
            }
        }

        // 高亮歌单行
        const currentPlaying = QueueStatus.getCurrentPlaying();
        if (!currentPlaying) return;

        const currentRow = document.getElementById(currentPlaying.id);
        if (currentRow) {
            this.folderContent.querySelector('.row.current')?.classList.remove('current', 'playing');

            currentRow.classList.add('current');
            if (!QueueStatus.getPlayer().paused) currentRow.classList.add('playing');
        }
    }

    public static setUiPlay() {
        document.querySelectorAll('img[action="play-pause"]')
            .forEach(element => {
                if (element instanceof HTMLImageElement) {
                    element.src = '/img/audio/ico/pause.svg';
                }
            });
        this.indexAudioCover.classList.remove('paused');

        const id = QueueStatus.getCurrentPlaying()?.id;
        if (!id) return;
        document.getElementById(id)?.classList.add('playing');
    }

    public static setUiPause() {
        document.querySelectorAll('img[action="play-pause"]')
            .forEach(element => {
                if (element instanceof HTMLImageElement) {
                    element.src = '/img/audio/ico/play.svg';
                }
            });
        this.indexAudioCover.classList.add('paused');

        const id = QueueStatus.getCurrentPlaying()?.id;
        if (!id) return;
        document.getElementById(id)?.classList.remove('playing');
    }

    public static showLoading() {
        this.indexLoading.classList.add('show');
    }

    public static hideLoading() {
        this.indexLoading.classList.remove('show');
    }

    public static renderPlayMode() {
        document.querySelectorAll('img[action="play-mode"]')
            .forEach(element => {
                if (element instanceof HTMLImageElement) {
                    element.src = `/img/audio/ico/play_mode_${PlayMode.getPlayMode()}.svg`;
                }
            });
    }

    public static initialize(): void {
        if (this.dragDropManager) {
            this.dragDropManager.destroy();
        }

        this.dragDropManager = new DragDropManager(
            this.playingQueue,
            '.queue-row',
            {
                onDragStart: () => {
                    return true;
                },
                onDragEnd: (fromIndex: number, toIndex: number) => {
                    return QueueStatus.moveAudio(fromIndex, toIndex);
                }
            }
        );

        this.dragDropManager.initialize();
    }

    public static destroyDragDrop(): void {
        if (this.dragDropManager) {
            this.dragDropManager.destroy();
            this.dragDropManager = null;
        }
    }

    static {
        this.highlightCurrentPlaying = this.highlightCurrentPlaying.bind(this);
        this.initialize = this.initialize.bind(this);
        this.destroyDragDrop = this.destroyDragDrop.bind(this);
    }
}


