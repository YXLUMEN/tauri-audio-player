import {AlertCategories, Confirm} from "../types/AlertCategories.ts";
import {DefaultConfirm} from "../builtin/DefaultConfirm.ts";

function removeNote(element: HTMLElement, animation: boolean): void {
    element.classList.remove('show');

    if (animation) {
        element.classList.add('close');
        element.addEventListener('animationend', () => element.remove(), {once: true});
        return;
    }

    element.remove();
}

export function createAlert(
    message: string,
    category: AlertCategories = AlertCategories.INFO,
    removeDelay: number = 2500,
    animation: boolean = true
): void {
    const baseAlertBox = document.querySelector('.base-alert-box');
    if (!baseAlertBox) throw new Error('base alert box does not exist');
    const boxChildren = baseAlertBox.getElementsByClassName('alert');

    // 清除较旧的警示框
    if (boxChildren.length > 4) {
        removeNote(boxChildren[0] as HTMLElement, false);
    }

    const alert = document.createElement('div');
    alert.className = `note ${category || 'info'} alert${animation ? ' show' : ''}`;

    const p = document.createElement('p');
    p.textContent = message;

    const img = document.createElement('img');
    setAttributes(img, {
        class: 'close',
        src: '/img/svg/shutdown.svg',
        alt: 'close',
        width: '20'
    });

    alert.append(p, img);

    // 手动关闭
    alert.onclick = event => {
        const target = (event.target as HTMLElement).closest('.close');
        if (!target) return;
        removeNote(alert, animation);
    };

    baseAlertBox.append(alert);

    // 自动移除
    if (!alert || removeDelay === 0) return;

    const index = Array.from(boxChildren).indexOf(alert);
    const totalDelay = Math.min(removeDelay * (index + 1), 10_000);

    setTimeout(removeNote, totalDelay, alert, animation);
}

export function createConfirm(message: string, opts?: Confirm): Promise<boolean> {
    const {timeout, flag, category, defaultResult, strictTimeout, animation} = {...DefaultConfirm, ...opts};
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

    confirm.append(agreeImg, p, disagreeImg);

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

function setAttributes(ele: HTMLElement, attributes: Record<string, string>): void {
    for (const [attr, value] of Object.entries(attributes)) {
        ele.setAttribute(attr, value)
    }
}