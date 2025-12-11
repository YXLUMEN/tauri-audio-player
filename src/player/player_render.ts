import {transTime} from "../utils/math/math";
import {QueueStatus} from "../playing_queue/queue_status";
import {PlayerStatus} from "./player_status";


export class PlayerRender {
    private static readonly indexPgsPlayed = document.getElementById('i-progress-played')! as HTMLInputElement;
    private static readonly playerPgsPlayed = document.getElementById('progress-played')! as HTMLInputElement;
    private static readonly indexPlayedTime = document.getElementById('i-played-time')!;
    private static readonly playerPlayedTime = document.getElementById('played-time')!;
    private static readonly playingBoard = document.getElementById('playing-board-container')!;
    private static readonly closeBoard = document.getElementById('close-playing-board')!;
    private static readonly playerBackground = document.getElementById('player-background')!;
    private static readonly settings = document.getElementById('settings-container')!;

    private static lastTimeText: string = '';

    public static updatePlayingProgress(currentTime: number) {
        const time = transTime(currentTime);
        if (this.lastTimeText === time) return;
        this.lastTimeText = time;

        const duration = QueueStatus.getPlayer().duration || 1;
        const pgs = (Math.min(Math.max(currentTime / duration, 0), 1) * 100).toFixed(3);

        this.indexPgsPlayed.style.setProperty('--pct', `${pgs}%`);
        this.playerPgsPlayed.style.setProperty('--pct', `${pgs}%`);

        this.indexPgsPlayed.value = pgs;
        this.playerPgsPlayed.value = pgs;
        this.indexPlayedTime.textContent = time;
        this.playerPlayedTime.textContent = time;
    }

    // 点击关闭面板关闭音乐列表
    public static closePlayingBoard() {
        this.playingBoard.classList.add('hide');
        this.closeBoard.classList.add('hide');
    }

    // 点击列表展开音乐列表
    public static togglePlayingBoard() {
        this.playingBoard.classList.toggle('hide');
        this.closeBoard.classList.toggle('hide');
    }

    public static togglePlayer() {
        PlayerStatus.isPlayerShow = this.playerBackground.classList.toggle('show');
    }

    public static closePage() {
        if (this.settings.classList.contains('show')) {
            this.settings.classList.remove('show');
            return;
        }
        if (!this.closeBoard.classList.contains('hide')) {
            PlayerRender.closePlayingBoard();
            return;
        }

        this.playerBackground.classList.remove('show');
        PlayerStatus.isPlayerShow = false;
    }

    static {
        this.updatePlayingProgress = this.updatePlayingProgress.bind(this);
        this.closePlayingBoard = this.closePlayingBoard.bind(this);
        this.togglePlayingBoard = this.togglePlayingBoard.bind(this);
        this.closePage = this.closePage.bind(this);
        this.togglePlayer = this.togglePlayer.bind(this);
    }
}

