import SpectrumDiagram from "../util/spectrum_diagram";
import createAlert from "../util/base_page";
import {getCurrentPlaying} from "./data";

const indexContextmenu = document.getElementById('index-contextmenu')!;

const indexLeftPanel = document.getElementById('index-left-panel')!;

const customFolderList = document.getElementById('custom-folder-list')!;

const folderContent = document.getElementById('folder-content')!;

const indexAudioCover = document.getElementById('index-audio-cover')!;

const indexAudioTitle = document.getElementById('index-audio-title')!;

const choseFolderContent = document.getElementById('chose-folder-content')!;

const iPgsPlay = document.getElementById('i-progress-played')! as HTMLInputElement;

const iTotalTime = document.getElementById('i-total-time')!;

const iPlayedTime = document.getElementById('i-played-time')!;

const playerBackground = document.getElementById('player-background')!;

const playerBox = document.getElementById('player-box')!;

const audioEle = document.getElementById('audio-loader')! as HTMLAudioElement;
audioEle.loop = false;
audioEle.volume = .7;

const lyricContent = document.getElementById('lyric-ul')!;

const lyricOffsetEle = document.getElementById('lyric-offset')!;

const progressPlayed = document.getElementById('progress-played')! as HTMLInputElement;

const playedTime = document.getElementById('played-time')!;

const audioTime = document.getElementById('audio-time')!;

const iVolumeToggle = document.getElementById('i-volume-toggle')! as HTMLInputElement;

const volumeToggle = document.getElementById('volume-toggle')! as HTMLInputElement;

const closeBoard = document.getElementById('close-playing-board')!;

const playingBoard = document.getElementById('playing-board-container')!;

const playingQueue = document.getElementById('playing-queue')!;

const settings = document.getElementById('settings-container')!;

const DSD = new SpectrumDiagram(document.getElementById('audio-canvas') as HTMLCanvasElement, window.innerWidth, 400);

const preLoadCover = document.getElementById('pre-load')! as HTMLImageElement;

// 音频播放时间换算
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
    document.querySelectorAll('img[action="play-pause"]').forEach(img => {
        (img as HTMLImageElement).src = '/img/audio/ico/pause.svg';
    });

    indexAudioCover.classList.remove('paused');
    const id = getCurrentPlaying()?.id;
    if (id === undefined) return;
    document.getElementById(id)?.classList.add('playing');
}

function setUiPause() {
    document.querySelectorAll('img[action="play-pause"]').forEach(img => {
        (img as HTMLImageElement).src = '/img/audio/ico/play.svg';
    });

    indexAudioCover.classList.add('paused');
    const id = getCurrentPlaying()?.id;
    if (id === undefined) return;
    document.getElementById(id)?.classList.remove('playing');
}

// 切换播放状态
async function pauseToggle(play: boolean = true): Promise<boolean> {
    if (!audioEle.src) return false;
    try {
        if (audioEle.paused && play) {
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
        let msg = '未知错误';
        if (err instanceof Error) {
            if (err.name === 'AbortError') return true;
            msg = err.message;
        }

        console.error('Error playing audio:', err);
        createAlert(`无法加载音频: ${msg}`, 'warning');
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
        document.querySelectorAll('img[action="volume"]').forEach(img => {
            (img as HTMLImageElement).src = '/img/audio/ico/volume.svg';
        });
    } else {
        lastVolume = volumeToggle.value;
        volumeToggle.value = '0';
        iVolumeToggle.value = '0';
        audioEle.muted = true;
        document.querySelectorAll('img[action="volume"]').forEach(img => {
            (img as HTMLImageElement).src = '/img/audio/ico/volume-muted.svg';
        });
    }
}

function showLoading() {
    document.getElementById('index-loading')!.classList.add('show');
}

function hideLoading() {
    document.getElementById('index-loading')!.classList.remove('show');
}

async function toggleDraw(e: Event) {
    if ((e.target as HTMLInputElement).checked) {
        await DSD.startDraw();
        if (DSD.canvas) DSD.canvas.style.display = 'block';
    } else {
        DSD.stopDraw();
        if (DSD.canvas) DSD.canvas.style.display = 'none';
    }
}

async function switchDrawMode() {
    DSD.stopDraw();

    const selectedRadio = document.querySelector('input[name="draw-mode"]:checked') as HTMLInputElement;
    if (selectedRadio) await DSD.startDraw(selectedRadio.value)
}

function changeFFTSize() {
    const target = document.querySelector('input[name="change-fftSize"]') as HTMLInputElement;
    const value: string = target.value;
    const n = value === '' ? 256 : Number(value);
    if (isNaN(n) || n < 32 || n > 32768 || (n & (n - 1)) !== 0) {
        alert('必须为2的次方并且满足[32,32768]');
        return false;
    }
    DSD.setAnalyser({fftSize: n});
}

function changeDrawInterval() {
    const target = document.querySelector('input[name="change-draw-interval"]') as HTMLInputElement;
    const value = target.value;
    const tick = value === '' ? 10 : Number(value);
    if (isNaN(tick)) return;
    DSD.drawInterval = Math.max(0, tick);
}

function changeDecibels() {
    const minEle = document.querySelector('input[name="min-decibels"]') as HTMLInputElement;
    const maxEle = document.querySelector('input[name="max-decibels"]') as HTMLInputElement;

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