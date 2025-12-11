import {IAudioInfo, IStandardAudio} from "../types/audio";
import {getPlugin} from "../plugins/plugin_init";
import {isEmpty} from "../utils/util";
import {appendChildren} from "../utils/front/element";
import {createAlert} from "../utils/front/alert";
import {PlayMode} from "../play/play_mode";
import {QueueStatus} from "./queue_status";

export class QueueRender {
    private static readonly indexLoading = document.getElementById('index-loading')!;
    private static readonly indexAudioCover = document.getElementById('index-audio-cover')!;
    private static readonly playingQueue = document.getElementById('playing-queue')!;
    private static readonly playingBoard = document.getElementById('playing-board-container')!;
    private static readonly folderContent = document.getElementById('folder-content')!;

    private static createPlayingQueueItem(index: number, standardInfo: IStandardAudio): HTMLDivElement {
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
    public static async renderPlayingQueue(queue: IAudioInfo[], replace: boolean = true): Promise<void> {
        if (isEmpty(queue)) return;

        const frag = document.createDocumentFragment();
        let cannotLoad = 0;

        for (let i = 0, len = queue.length; i < len; i++) {
            const audio = queue[i];
            const standard = await getPlugin(audio.plugin)?.parse(audio);
            if (standard) {
                frag.appendChild(this.createPlayingQueueItem(i, standard));
            } else {
                cannotLoad += 1;
            }
        }

        replace ? this.playingQueue.replaceChildren(frag) : this.playingQueue.append(frag);
        if (this.playingBoard.classList.contains('hide')) {
            this.playingQueue.scrollTo({top: 0});
        }

        this.highlightCurrentPlaying(false);
        if (cannotLoad > 0) createAlert(`${cannotLoad} 个文件无法加载`, 'warning');
    }

    public static highlightCurrentPlaying(scroll: boolean = true): void {
        // 高亮播放列表行
        const currentPlayingEle = this.playingQueue.querySelector(
            `[play-index='${QueueStatus.getCurrentIndex()}']`
        ) as HTMLElement;
        if (currentPlayingEle) {
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

    static {
        this.highlightCurrentPlaying = this.highlightCurrentPlaying.bind(this);
    }
}


