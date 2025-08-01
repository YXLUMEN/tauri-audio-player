import * as d from "./data";
import * as v from "./env";
import {debounce, throttleTimeOut} from "./tools/base_utilities";
import {generateUniqueRandomNumbers} from "./tools/GenerateRandomNums";
import {renderCustomFolder} from "./index";
import createAlert, {playSound} from "./tools/base_page";
import {IAudioInfo} from "../interfaces/audio";

import {invoke} from '@tauri-apps/api/core';
import {open} from '@tauri-apps/plugin-dialog';
import {isAuthAble} from "./plugins/exports";


// 播放模式设置
let playMode: number = 0;

let randPlayedList: number[] = null;

let isSeeking: boolean = false;
let isPlayerDisplay: boolean = false;
let isLyricDisplay: boolean = false;

// 切换播放模式
function modeToggle() {
    playMode = (playMode + 1) % 3;
    v.playMode.src = `/img/audio/ico/play_mode_${playMode}.svg`;
}

// 获取下一曲index
function getNextAudioIndex(delta = 1) {
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
        if (randPlayedList.length % 4 === 0) localStorage.setItem('_random_list', JSON.stringify(randPlayedList));

        return random !== undefined ? random : (() => {
            // 如果数量极大,可以考虑百次分批生成
            randPlayedList = generateUniqueRandomNumbers(max);
            return randPlayedList.pop();
        })();
    }
    throw new Error('未知的播放模式');
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

// 自动重载token
const MAX_RETRY: number = 3;
let retryCount: number = 0;
let pendingRetry = false;
const onAudioError = throttleTimeOut(async () => {
    if (pendingRetry) return;
    if (retryCount >= MAX_RETRY) {
        createAlert('超过最大重试次数, 请检查Api密钥是否有效或尝试重启软件', 'error', {autoRemoveDelay: 0});
        return;
    }
    const currentPlay = d.getCurrentPlaying();
    const plugin = d.getPlugin(currentPlay.plugin);

    if (!isAuthAble(plugin)) return;
    pendingRetry = true;
    retryCount++;

    try {
        await plugin.refresh();

        const success = await d.switchAudio(d.getAudioIndex(), {force: true});
        if (success) {
            retryCount = 0;
            return;
        }

        const result = await d.dbHelper.get('auth', plugin.getPluginName());
        if (!result) return;
        await plugin.login({key: result.key, psd: result.psd});
    } catch (err) {
        createAlert(`Fail when reload: ${err.message}`, 'warning');
        console.error(err);
    } finally {
        pendingRetry = false;
    }
}, 1000);

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

//显示歌词
const lyricDisplayFn = throttleTimeOut(() => {
    v.textContainer.classList.toggle('hide');
    v.lyricBox.classList.toggle('hide');
    v.lyricTitle.classList.toggle('hide');
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

        localStorage.setItem('_random_list', JSON.stringify(randPlayedList));

        await d.storgePlayingQueue();
    } catch (err) {
        console.error(err);
    }
}

// 关闭 player 页面
document.getElementById('close-player').addEventListener('click', togglePlayer);

// 监听暂停已切换图标
v.audioEle.addEventListener('pause', () => {
    if (v.audioEle.paused) return v.pauseToggle(true);
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

// 音频出错监听
v.audioEle.addEventListener('error', onAudioError);

// 修改音量
v.volumeToggle.addEventListener('input', () => {
    const volume = Number(v.volumeToggle.value) / 100;
    if (v.audioEle.muted || v.audioEle.volume === volume) return;
    v.audioEle.volume = volume;
});

// 在切换模式时加载本地随机列表
v.playMode.addEventListener('load', () => {
    if (randPlayedList) return;
    try {
        const tempArray = JSON.parse(localStorage.getItem('_random_list'));
        randPlayedList = Array.isArray(tempArray) ? tempArray : [];
    } catch (err) {
        randPlayedList = [];
    }
}, {once: true});

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
v.lyricBox.addEventListener('wheel', (event) => {
    wheelRollingLyrics(event.deltaY > 0 ? 2 : -2);
}, {passive: true});

// 歌词微调
document.getElementById('set-lyric-offset').addEventListener('click', (event) => {
    const target = (<HTMLElement>event.target).closest('img');
    if (!target) return;

    const offset = target.alt;
    if (offset) d.LYRIC_ACTIONS.lyricOffset += Number(offset);
    else d.LYRIC_ACTIONS.lyricOffset = 0;

    v.lyricOffsetEle.textContent = offset ? d.LYRIC_ACTIONS.lyricOffset.toFixed(1) : '';
});

// 展示设置选项框
document.getElementById('setting').addEventListener('click', toggleSettings);

// 本地文件播放
document.getElementById('select-local-audio').addEventListener('click', async () => {
    try {
        const filePath: string[] = await open({
            title: '选则音频',
            multiple: true,
            directory: false,
            filters: [{name: 'Audios', extensions: ['mp3', 'flac', 'wav', 'ogg']}]
        });
        if (!filePath) return;
        if (filePath.length > 3) createAlert('解析多个文件中', 'info', {autoRemoveDelay: 4000});

        const list: Array<IAudioInfo> = [];
        for (const path of filePath) {
            const hash: string = await invoke('calculate_hash', {filePath: path});
            if (hash) {
                list.push({plugin: 'local', id: hash, url: path});
            }
        }

        await d.insertAudio(d.getAudioIndex() + 1, list);
        await playSound('audio/successful_hit.wav');

        await d.switchAudio(d.getAudioIndex() + 1);
    } catch (err) {
        console.error(err);
        createAlert('读取失败', 'warning');
    }
});

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
document.getElementById('toggle-fft').addEventListener('change', async () => {
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
    document.getElementById('fft-settings').addEventListener('click', (e) => {
        const target = (<HTMLElement>e.target).closest('input');
        if (!target) return;
        const name = target.getAttribute('name');
        fftActions.get(name)?.apply(null, [e]);
    });

    // 自动重绘
    window.addEventListener('resize', resizeDSD);
}, {once: true});

// 存储匿名操作函数,使CONTROL_MAP清晰
const anonymous_fun: { [key: string]: CallableFunction } = Object.freeze(Object.assign(Object.create(null), {
    skipForward: () => d.switchAudio(getNextAudioIndex(-1)),
    skipBackward: () => d.switchAudio(getNextAudioIndex(1)),
    arrowUp: () => wheelRollingLyrics(-4),
    arrowDown: () => wheelRollingLyrics(4),
}));

// 基本操作映射
const playerActionMap = new Map<string, Function>([
    ['lyric', lyricDisplayFn],
    ['play-mode', modeToggle],
    ['skip-forward', anonymous_fun.skipForward],
    ['right', anonymous_fun.skipForward],
    ['play-pause', v.pauseToggle],
    ['play', v.pauseToggle],
    ['skip-backward', anonymous_fun.skipBackward],
    ['left', anonymous_fun.skipBackward],
    ['volume', v.setMuted],
    ['show-playing-board', togglePlayingBoard]
]);

function applyPlayerAction(action: string) {
    playerActionMap.get(action)?.();
}

// 音频控制按钮
document.getElementById('cb-container').addEventListener('click', (event) => {
    event.stopPropagation();
    const id = (<HTMLElement>event.target).closest('.center-icon')?.getAttribute('id');
    if (!id) return;
    applyPlayerAction(id);
});

async function initPlayer(): Promise<void> {
    try {
        await renderCustomFolder();
    } catch (e) {
        console.error(`渲染歌单失败: ${e.message}`);
    }

    // 加载播放历史
    (async () => {
        const usedPlaying = localStorage.getItem('playing');
        if (!usedPlaying) return;

        const result = await d.dbHelper.getAll('playing_history');
        if (!result) return;

        const {index, currentTime} = JSON.parse(usedPlaying);
        await d.setPlayingQueue(result);

        const canPlay = await d.switchAudio(Number(index), {scroll: true, play: false});
        if (!canPlay) return;

        document.getElementById('index-audio-control').classList.remove('hide');
        v.audioEle.addEventListener('loadeddata', () => {
            v.audioEle.currentTime = Number(currentTime);
        }, {once: true});
    })().catch(console.error);
}


export {
    initPlayer,
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