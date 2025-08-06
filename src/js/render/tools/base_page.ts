import {ECategories, IAlert, IConfirm} from "../../interfaces/pages";
import {defaultConfirm} from "../default";


/**
 * example:
 *
 *      {
 *          'class': 'sth',
 *          'src': '/example/good.png',
 *      }
 * */
export function setAttributes(ele: HTMLElement, attributes: { [key: string]: string }): void {
    Object.entries(attributes).forEach(([attr, value]) => ele.setAttribute(attr, value));
}

export function appendChildren(parentEle: HTMLElement, ...children: HTMLElement[]): void {
    children.forEach(item => parentEle.append(item));
}

// 播放音频
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

// 用于移除 base-alert-box 中的通知
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

// 创建通用提示框
export default function createAlert(message: string, category: ECategories | string = 'info', opts: IAlert = {}): void {
    const {autoRemoveDelay = 2500, animation = true} = opts;

    const baseAlertBox = document.querySelector('.base-alert-box');
    const boxChildren = baseAlertBox.getElementsByClassName('alert');

    // 清除较旧的警示框
    if (boxChildren.length > 4) {
        removeNote(<HTMLElement>boxChildren[0], false);
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
        const target = (<HTMLElement>event.target).closest('.close');
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

// 创建确认提示框
export function createConfirm(message: string, opts: IConfirm = {}): Promise<boolean> {
    const {timeout, flag, category, defaultResult, strictTimeout, animation} = {...defaultConfirm, ...opts};
    const id = `confirm_${flag}`;

    if (document.getElementById(id)) return Promise.resolve(defaultResult);

    // 默认的提示框box
    const container = document.querySelector('.base-alert-box');
    if (!container) {
        console.error('Confirm container not found');
        return Promise.resolve(defaultResult);
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

    let timeoutId: number = null;
    if (timeout) {
        timeoutId = setTimeout(() => {
            console.warn(`Confirm timeout timeout: ${flag}`);

            if (abort.signal.aborted) return;
            strictTimeout ? reject(defaultResult) : resolve(defaultResult);
            removeNote(confirm, animation);
        }, timeout);
    }

    confirm.addEventListener('click', function (event) {
        const action = (<HTMLElement>event.target).closest('.action')?.getAttribute('action');
        if (!action || abort.signal.aborted) return;

        clearTimeout(timeoutId);
        removeNote(this, animation);
        resolve(action === 'agree');
    }, {signal: abort.signal});

    return <Promise<boolean>>promise;
}
