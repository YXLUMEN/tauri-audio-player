import * as d from "./data";
import * as v from "./env";
import {debounce, throttleTimeOut} from "../util/base_utilities";
import {generateUniqueRandomNumbers} from "../util/generate_random_nums";
import {onAudioError} from "../error_handler";
import {dbHelper} from "../db/db_init";


// 播放模式设置
let playMode: number = 0;

let randPlayedList: number[] = [];

let isSeeking: boolean = false;
let isPlayerDisplay: boolean = false;
let isLyricDisplay: boolean = false;

/* 播放器 */

// 切换播放模式
function modeToggle() {
    playMode = (playMode + 1) % 4;
    document.querySelectorAll('img[action="play-mode"]').forEach(img => {
        (<HTMLImageElement>img).src = `/img/audio/ico/play_mode_${playMode}.svg`;
    });
}

// 获取下一曲index
function getNextAudioIndex(delta = 1): number {
    const max = d.getMaxAudioCount();

    // 列表循环
    if (playMode === 0) {
        const next = (d.getAudioIndex() + delta) % max;
        return next < 0 ? max - 1 : next;
    }

    //单曲循环
    if (playMode === 1) return d.getAudioIndex();

    // 随机播放
    if (playMode === 2) {
        const random = randPlayedList.pop();
        return random !== undefined ? random : (() => {
            // 如果数量极大,可以考虑百次分批生成
            randPlayedList = generateUniqueRandomNumbers(max);
            return randPlayedList.pop() ?? d.getAudioIndex() + 1;
        })();
    }

    // 顺序播放
    if (playMode === 3) {
        return Math.min(d.getAudioIndex(), max);
    }
    throw new RangeError('未知的播放模式');
}

// 拖动进度条更改音乐进度
const progressSeeking = throttleTimeOut((event: Event) => {
    if (!v.audioEle?.currentTime) return;
    isSeeking = true;
    const value: string = (<HTMLInputElement>event.target).value;
    const duration: number = (Number(value) / 100) * v.audioEle.duration;
    v.updatePlayingProgress(duration);
}, 32);

// 音频进度跳跃
function progressLeap(event: Event) {
    if (!v.audioEle?.currentTime) return;
    const value = (<HTMLInputElement>event.target).value;
    v.audioEle.currentTime = (Number(value) / 100) * v.audioEle.duration;
    isSeeking = false;
}

// 点击关闭面板关闭音乐列表
function closePlayingBoard() {
    v.playingBoard.classList.add('hide');
    v.closeBoard.classList.add('hide');
}

// 点击列表展开音乐列表
function togglePlayingBoard() {
    v.playingBoard.classList.toggle('hide');
    v.closeBoard.classList.toggle('hide');
}

function togglePlayer() {
    isPlayerDisplay = v.playerBackground.classList.toggle('show');
}

function toggleSettings() {
    v.settings.classList.toggle('show');
}

function closePage() {
    if (v.settings.classList.contains('show')) {
        v.settings.classList.remove('show');
        return;
    }
    if (!v.closeBoard.classList.contains('hide')) {
        closePlayingBoard();
        return;
    }

    v.playerBackground.classList.remove('show');
    isPlayerDisplay = false;
}

function modifyVolume(volume: number) {
    const volumeNum = Math.max(0, Math.min(100, volume)) / 100;
    if (v.audioEle.volume === volumeNum) return;
    if (volumeNum === 0) {
        return v.toggleMuted();
    }
    if (v.audioEle.muted) v.toggleMuted();

    const vol = volume.toString()
    v.volumeToggle.value = vol;
    v.iVolumeToggle.value = vol;

    v.audioEle.volume = volumeNum;

    const volumes = document.querySelectorAll('img[action="volume"]');
    if (volume >= 70) {
        volumes.forEach(img => {
            (<HTMLImageElement>img).src = '/img/audio/ico/volume.svg';
        });
    } else if (volume > 30 && volume < 70) {
        volumes.forEach(img => {
            (<HTMLImageElement>img).src = '/img/audio/ico/volume-mid.svg';
        });
    } else if (volume <= 30) {
        volumes.forEach(img => {
            (<HTMLImageElement>img).src = '/img/audio/ico/volume-low.svg';
        });
    }
}

//显示歌词
const lyricDisplayFn = throttleTimeOut(() => {
    document.getElementById('text-container')!.classList.toggle('hide');
    document.getElementById('lyric-container')!.classList.toggle('hide');
    isLyricDisplay = v.playerBox.classList.toggle('show-lyric');
}, 600);

// 重启歌词同步
const reEnableScrollLyric = debounce(() => {
    d.LYRIC_ACTIONS.syncLyricEnable = true;
    d.significantLeapFn();
}, 1E4);

// 滚轮控制歌词
function wheelRollingLyrics(direction = -2) {
    d.LYRIC_ACTIONS.syncLyricEnable = false;

    const currentTransformValue = Number(v.lyricContent.style.transform.match(/-?\d+/)?.[0] || -40);
    let deltaLine = direction * d.LYRIC_ACTIONS.lineOffset + currentTransformValue;

    deltaLine = Math.max(Math.min(deltaLine, 0), d.LYRIC_ACTIONS.maxScrollHeight);

    v.lyricContent.style.transform = `translateY(${deltaLine}px)`;
    reEnableScrollLyric();
}

// 保存播放队列以及播放进度
async function savePlayingQueue() {
    try {
        if (d.getCurrentPlaying()) localStorage.setItem('playing', JSON.stringify({
            index: d.getAudioIndex(),
            currentTime: v.audioEle.currentTime
        }));

        await d.storgePlayingQueue();
    } catch (err) {
        console.error(err);
    }
}

// 关闭 player 页面
document.getElementById('close-player')!.addEventListener('click', togglePlayer);

// 监听暂停已切换图标
v.audioEle.addEventListener('pause', () => {
    if (v.audioEle.paused) return v.pauseToggle(false);
});

// 音频更新同步显示
v.audioEle.addEventListener('timeupdate', (event) => {
    const currentTime = (<HTMLAudioElement>event.target).currentTime;
    if (isPlayerDisplay && isLyricDisplay) d.syncLyric(currentTime);
    if (!isSeeking) v.updatePlayingProgress(currentTime);
}, {passive: true});

// 音频跳跃时
v.audioEle.addEventListener('seeked', () => {
    d.LYRIC_ACTIONS.syncLyricEnable = true;
    d.significantLeapFn();
}, {passive: true});

// 音频结束后下一曲
v.audioEle.addEventListener('ended', () => d.switchAudio(getNextAudioIndex(1)));

// 第一次错误不开始播放
v.audioEle.addEventListener('error', () => {
    onAudioError();
    v.audioEle.addEventListener('error', onAudioError);
}, {once: true});

// 修改音量
v.volumeToggle.addEventListener('input', () => modifyVolume(Number(v.volumeToggle.value)));
v.iVolumeToggle.addEventListener('input', () => modifyVolume(Number(v.iVolumeToggle.value)));

// 进度条拖动
v.iPgsPlay.addEventListener('input', progressSeeking);
v.iPgsPlay.addEventListener('change', progressLeap);

v.progressPlayed.addEventListener('input', progressSeeking);
v.progressPlayed.addEventListener('change', progressLeap);

// 选中播放队列
v.playingQueue.addEventListener('click', (event) => {
    const target = (<HTMLElement>event.target).closest('.queue-row');
    if (!target) return;
    d.switchAudio(Number(target.getAttribute('play-index'))).catch();
});

// 关闭播放队列
v.closeBoard.addEventListener('click', closePlayingBoard);

// 点击歌词行跳转
v.lyricContent.addEventListener('click', (event) => {
    if (d.LYRIC_ACTIONS.lyrArray.length <= 1) return;
    const target = (<HTMLElement>event.target).closest('.text');
    if (!target) return;

    const leap = Number(target.getAttribute('time'));
    if (isNaN(leap)) return;
    v.audioEle.currentTime = leap;
});

// 歌词滚轮控制
document.getElementById('lyric-box')!.addEventListener('wheel', event => {
    wheelRollingLyrics(event.deltaY > 0 ? 2 : -2);
}, {passive: true});

// 歌词微调
document.getElementById('set-lyric-offset')!.addEventListener('click', event => {
    const target = (<HTMLElement>event.target).closest('img');
    if (!target) return;

    const offset = target.alt;
    if (offset) d.LYRIC_ACTIONS.lyricOffset += Number(offset);
    else d.LYRIC_ACTIONS.lyricOffset = 0;

    v.lyricOffsetEle.textContent = offset ? d.LYRIC_ACTIONS.lyricOffset.toFixed(1) : '';
});

// 展示设置选项框
document.getElementById('setting')!.addEventListener('click', toggleSettings);

// 频谱操作
// @ts-ignore
const fftActions: Map<string, Function> = new Map([
    ['toggle-fft', v.toggleDraw],
    ['draw-mode', v.switchDrawMode],
    ['change-fftSize-btn', v.changeFFTSize],
    ['change-draw-interval-btn', v.changeDrawInterval],
    ['min-decibels-btn', v.changeDecibels],
    ['max-decibels-btn', v.changeDecibels]
]);

// 初始化频谱分析
document.getElementById('toggle-fft')!.addEventListener('change', async () => {
    const resizeDSD = debounce(() => {
        const width = window.innerWidth;
        v.DSD.width = width;
        v.DSD.setAnalyser({
            fftSize: width >= 650 ? 256 : 128
        });
    }, 500);

    await v.DSD.initAudioSource(v.audioEle);
    v.DSD.setAnalyser();
    await v.switchDrawMode();
    resizeDSD();

    // 频谱图操作
    document.getElementById('fft-settings')!.addEventListener('click', (e) => {
        const target = (<HTMLElement>e.target).closest('input');
        if (!target) return;
        const name = target.getAttribute('name')!;
        fftActions.get(name)?.apply(null, [e]);
    });

    // 自动重绘
    window.addEventListener('resize', resizeDSD);
}, {once: true});

// 存储匿名操作函数,使CONTROL_MAP清晰
const anonymous_fun: { [key: string]: () => {} } = Object.freeze(Object.assign(Object.create(null), {
    skipForward: () => d.switchAudio(getNextAudioIndex(-1)),
    skipBackward: () => d.switchAudio(getNextAudioIndex(1)),
    arrowUp: () => modifyVolume(Number(v.volumeToggle.value) + 2),
    arrowDown: () => modifyVolume(Number(v.volumeToggle.value) - 2),
}));

// 基本操作映射
const playerActionMap = new Map<string, Function>([
    ['lyric', lyricDisplayFn],
    ['play-mode', modeToggle],
    ['forward', anonymous_fun.skipForward],
    ['play-pause', v.pauseToggle],
    ['backward', anonymous_fun.skipBackward],
    ['volume', v.toggleMuted],
    ['show-playing-board', togglePlayingBoard]
]);

function applyPlayerAction(action: string) {
    playerActionMap.get(action)?.();
}

// 音频控制按钮
document.getElementById('audio-box')!.addEventListener('click', event => {
    const target = <HTMLElement>event.target;
    const action = target.closest('.control-icon')?.getAttribute('action');
    if (!action) {
        if (!target.id || target?.id === 'player-box') return togglePlayer();
        return;
    }
    applyPlayerAction(action);
});

async function loadHistory() {
    try {
        const usedPlaying = localStorage.getItem('playing');
        if (!usedPlaying) return;

        const result = await dbHelper.getAll('playing_history');
        if (!result) return;

        const {index, currentTime} = JSON.parse(usedPlaying);
        await d.setPlayingQueue(result);

        const ok = await d.switchAudio(Number(index), {scroll: true, play: false});
        if (!ok) return;

        document.getElementById('index-audio-control')!.classList.remove('hide');
        if (Number(index) !== d.getAudioIndex()) return;
        v.audioEle.currentTime = Number(currentTime);
    } catch (e) {
        console.error(e);
    }
}

function initPlayer(): void {
}


export {
    initPlayer,
    loadHistory,
    applyPlayerAction,
    togglePlayer,
    modeToggle,
    savePlayingQueue,
    togglePlayingBoard,
    toggleSettings,
    closePage,
    lyricDisplayFn,
    anonymous_fun,
}