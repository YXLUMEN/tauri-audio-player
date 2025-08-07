import SpectrumDiagram from "./tools/spectrum_diagram";
import createAlert from "./tools/base_page";
import {getCurrentPlaying} from "./data";

const indexContextmenu = document.getElementById('index-contextmenu');

const indexLeftPanel = document.getElementById('index-left-panel');

const customFolderList = document.getElementById('custom-folder-list');

const folderContent = document.getElementById('folder-content');

const indexAudioCover = document.getElementById('index-audio-cover');

const indexAudioTitle = document.getElementById('index-audio-title');

const choseFolderContent = document.getElementById('chose-folder-content');

const iPgsPlay: HTMLInputElement = <HTMLInputElement>document.getElementById('i-progress-played');

const iTotalTime = document.getElementById('i-total-time');

const iPlayedTime = document.getElementById('i-played-time');

const playerBackground = document.getElementById('player-background');

const playerBox = document.getElementById('player-box');

const audioEle: HTMLAudioElement = <HTMLAudioElement>document.getElementById('audio-loader');
audioEle.loop = false;
audioEle.volume = .7;

const lyricContent = document.getElementById('lyric-ul');

const lyricOffsetEle = document.getElementById('lyric-offset');

const progressPlayed: HTMLInputElement = <HTMLInputElement>document.getElementById('progress-played');

const playedTime = document.getElementById('played-time');

const audioTime = document.getElementById('audio-time');

const iVolumeToggle = <HTMLInputElement>document.getElementById('i-volume-toggle');

const volumeToggle = <HTMLInputElement>document.getElementById('volume-toggle');

const closeBoard = document.getElementById('close-playing-board');

const playingBoard = document.getElementById('playing-board-container');

const playingQueue = document.getElementById('playing-queue');

const settings = document.getElementById('settings-container');


const DSD = new SpectrumDiagram(<HTMLCanvasElement>document.getElementById('audio-canvas'), window.innerWidth, 400);

const preLoadCover = <HTMLImageElement>document.getElementById('pre-load');

/**
 * 音频播放时间换算
 * */
function transTime(value: number) {
    const h = value / 3600 | 0;
    const remaining = value % 3600;
    const m = remaining / 60 | 0;
    const s = remaining % 60 | 0;

    if (h > 0) {
        return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// 更新进度条
let lastTimeText = '';

function updatePlayingProgress(currentTime: number) {
    const time = transTime(currentTime);
    if (lastTimeText === time) return;
    lastTimeText = time;

    const duration = audioEle.duration || 1;
    const pgs = (Math.min(Math.max(currentTime / duration, 0), 1) * 100).toFixed(3);

    iPgsPlay.style.setProperty('--pct', `${pgs}%`);
    progressPlayed.style.setProperty('--pct', `${pgs}%`);

    iPgsPlay.value = pgs;
    progressPlayed.value = pgs;
    iPlayedTime.textContent = time;
    playedTime.textContent = time;
}

function setUiPlay() {
    document.querySelectorAll('[action="play-pause"]').forEach((img: HTMLImageElement) => {
        img.src = '/img/audio/ico/pause.svg';
    });

    indexAudioCover.classList.remove('paused');
    document.getElementById(getCurrentPlaying()?.id)?.classList.add('playing');
}

function setUiPause() {
    document.querySelectorAll('[action="play-pause"]').forEach((img: HTMLImageElement) => {
        img.src = '/img/audio/ico/play.svg';
    });

    indexAudioCover.classList.add('paused');
    document.getElementById(getCurrentPlaying()?.id)?.classList.remove('playing');
}

// 切换播放状态
async function pauseToggle(pause = false): Promise<boolean> {
    if (!audioEle.src) return false;
    try {
        if (audioEle.paused && !pause) {
            await audioEle.play();
            DSD.audioContext?.resume().catch(console.error);
            setUiPlay();
        } else {
            audioEle.pause();
            DSD.audioContext?.suspend().catch(console.error);
            setUiPause();
        }
        return true;
    } catch (err) {
        if (err.name === 'AbortError') return true;
        console.error('Error playing audio:', err);
        createAlert(`无法加载音频: ${err.message}`, 'warning');
        setUiPause();
        return false;
    }
}

let lastVolume: string = '70';

function toggleMuted() {
    // 存储上一次的音量
    if (volumeToggle.value === '0') {
        if (lastVolume === '0') lastVolume = '70';
        volumeToggle.value = lastVolume;
        iVolumeToggle.value = lastVolume;
        audioEle.muted = false;
        document.querySelectorAll('[action="volume"]').forEach((img: HTMLImageElement) => {
            img.src = '/img/audio/ico/volume.svg';
        });
    } else {
        lastVolume = volumeToggle.value;
        volumeToggle.value = '0';
        iVolumeToggle.value = '0';
        audioEle.muted = true;
        document.querySelectorAll('[action="volume"]').forEach((img: HTMLImageElement) => {
            img.src = '/img/audio/ico/volume-muted.svg';
        });
    }
}

function showLoading() {
    document.getElementById('index-loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('index-loading').classList.remove('show');
}

async function toggleDraw(e: Event) {
    if ((<HTMLInputElement>e.target).checked) {
        await DSD.startDraw();
        DSD.canvas.style.display = 'block';
    } else {
        DSD.stopDraw();
        DSD.canvas.style.display = 'none';
    }
}

async function switchDrawMode() {
    DSD.stopDraw();

    const selectedRadio = <HTMLInputElement>document.querySelector('input[name="draw-mode"]:checked');
    if (selectedRadio) await DSD.startDraw(selectedRadio.value)
}

function changeFFTSize() {
    const target = <HTMLInputElement>document.querySelector('input[name="change-fftSize"]');
    const value: string = target.value;
    const n = value === '' ? 256 : Number(value);
    if (isNaN(n) || n < 32 || n > 32768 || (n & (n - 1)) !== 0) {
        alert('必须为2的次方并且满足[32,32768]');
        return false;
    }
    DSD.setAnalyser({fftSize: n});
}

function changeDrawInterval() {
    const target = <HTMLInputElement>document.querySelector('input[name="change-draw-interval"]');
    const value = target.value;
    const tick = value === '' ? 10 : Number(value);
    if (isNaN(tick)) return;
    DSD.drawInterval = Math.max(0, tick);
}

function changeDecibels() {
    const minEle = <HTMLInputElement>document.querySelector('input[name="min-decibels"]');
    const maxEle = <HTMLInputElement>document.querySelector('input[name="max-decibels"]');

    const minV = minEle.value;
    const maxV = maxEle.value;
    const [min, max] = [minV === '' ? -100 : Number(minV), maxV === '' ? -10 : Number(maxV)];
    if (isNaN(min) || isNaN(max) || min >= max) return;
    DSD.setAnalyser({
        minDecibels: min,
        maxDecibels: max,
    });
}

export {
    indexContextmenu,
    indexLeftPanel,
    customFolderList,
    folderContent,
    indexAudioCover,
    indexAudioTitle,
    choseFolderContent,
    iTotalTime,
    iPgsPlay,
    playerBackground,
    playerBox,
    audioEle,
    lyricContent,
    lyricOffsetEle,
    audioTime,
    progressPlayed,
    volumeToggle,
    iVolumeToggle,
    closeBoard,
    playingBoard,
    playingQueue,
    settings,
    preLoadCover,
    DSD,
    transTime,
    updatePlayingProgress,
    pauseToggle,
    toggleMuted,
    toggleDraw,
    switchDrawMode,
    changeFFTSize,
    changeDrawInterval,
    changeDecibels,
    showLoading,
    hideLoading,
}