import {ECategories, IAlert, IConfirm} from "../../types/base";
import {defaultConfirm} from "../../config/default";
import {appendChildren, setAttributes} from "./element";

function removeNote(element: HTMLElement, animation: boolean): void {
    element.classList.remove('show');

    if (animation) {
        element.classList.add('close');
        if (document.startViewTransition) document.startViewTransition(() => element.remove());
        else element.addEventListener('animationend', () => element.remove(), {once: true});
        return;
    }

    element.remove();
}

export function createAlert(message: string, category: ECategories = 'info', opts: IAlert = {}): void {
    const {autoRemoveDelay = 2500, animation = true} = opts;

    const baseAlertBox = document.querySelector('.base-alert-box');
    if (!baseAlertBox) throw new Error('base alert box does not exist');
    const boxChildren = baseAlertBox.getElementsByClassName('alert');

    // 清除较旧的警示框
    if (boxChildren.length > 4) {
        removeNote(boxChildren[0] as HTMLElement, false);
    }

    const alert = document.createElement('div');
    alert.className = `note ${category || 'info'} alert${animation ? ' show' : ''}`;
    if (animation) {
        alert.style.viewTransitionName = `note-animate-${Math.random().toString(36).substring(2, 9)}`;
    }

    const p = document.createElement('p');
    p.textContent = message;

    const img = document.createElement('img');
    setAttributes(img, {
        class: 'close',
        src: '/img/svg/shutdown.svg',
        alt: 'close',
        width: '20'
    });

    appendChildren(alert, p, img);

    // 手动关闭
    alert.onclick = event => {
        const target = (event.target as HTMLElement).closest('.close');
        if (!target) return;
        removeNote(alert, animation);
    };

    baseAlertBox.append(alert);

    // 自动移除
    if (!alert || !autoRemoveDelay) return;

    const index = Array.from(boxChildren).indexOf(alert);
    const totalDelay = Math.min(autoRemoveDelay * (index + 1), 10000);

    setTimeout(() => {
        removeNote(alert, animation);
    }, totalDelay);
}

export function createConfirm(message: string, opts: IConfirm = {}): Promise<boolean> {
    const {timeout, flag, category, defaultResult, strictTimeout, animation} = {...defaultConfirm, ...opts};
    const id = `confirm_${flag}`;

    if (document.getElementById(id)) return Promise.resolve(!!defaultResult);

    // 默认的提示框box
    const container = document.querySelector('.base-alert-box');
    if (!container) {
        console.error('Confirm container not found');
        return Promise.resolve(!!defaultResult);
    }

    const confirm = document.createElement('div');
    confirm.id = id;
    confirm.className = `note ${category} confirm${animation ? ' show' : ''}`;
    if (animation) {
        confirm.style.viewTransitionName = id;
    }

    const agreeImg = document.createElement('img');
    setAttributes(agreeImg, {
        class: 'action',
        src: '/img/svg/yes.svg',
        alt: 'agree',
        width: '20',
        action: 'agree'
    });

    const p = document.createElement('p');
    p.classList.add('text');
    p.textContent = message;

    const disagreeImg = document.createElement('img');
    setAttributes(disagreeImg, {
        class: 'action',
        src: '/img/svg/shutdown.svg',
        alt: 'disagree',
        width: '20',
        action: 'disagree'
    });

    appendChildren(confirm, agreeImg, p, disagreeImg);

    // 置于最上层
    if (container.firstChild) container.insertBefore(confirm, container.firstChild);
    else container.appendChild(confirm);

    const {promise, resolve, reject} = Promise.withResolvers();
    const abort = new AbortController();
    promise.finally(() => abort.abort());

    let timeoutId: number;
    if (timeout) {
        timeoutId = setTimeout(() => {
            console.warn(`Confirm timeout timeout: ${flag}`);

            if (abort.signal.aborted) return;
            strictTimeout ? reject(defaultResult) : resolve(defaultResult);
            removeNote(confirm, !!animation);
        }, timeout);
    }

    confirm.addEventListener('click', function (event) {
        const action = (event.target as HTMLElement).closest('.action')?.getAttribute('action');
        if (!action || abort.signal.aborted) return;

        clearTimeout(timeoutId);
        removeNote(this, !!animation);
        resolve(action === 'agree');
    }, {signal: abort.signal});

    return promise as Promise<boolean>;
}

export async function playSound(url: string): Promise<void> {
    try {
        const audioContext = new AudioContext();

        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.addEventListener('ended', () => audioContext.close(), {once: true});
    } catch (err) {
        console.error(err);
    }
}