import {ECategories, IAlert, IConfirm} from "../../interfaces/pages";


/**
 * example:
 *
 *      {
 *          'class': 'sth',
 *          'src': '/example/good.png',
 *      }
 * */
export function setAttributes(ele: HTMLElement, attributes: { [key: string]: string }) {
    Object.entries(attributes).forEach(([attr, value]) => ele.setAttribute(attr, value));
}

export function appendChildren(parentEle: HTMLElement, ...children: HTMLElement[]) {
    children.forEach(item => parentEle.append(item));
}

export function toggleClass(element: HTMLElement, removeClass: string[], addClass: string[]) {
    element.classList.remove(...removeClass);
    element.classList.add(...addClass);
}


// 批量从ElementId获取HTML元素,不会进行存在性检查
export function batchGetElementsById(...ids: string[]) {
    return ids.map(id => document.getElementById(id));
}

export async function playSound(url: string) {
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
function removeNote(element: HTMLElement, animation: boolean) {
    element.classList.remove('show');

    if (animation) {
        element.classList.add('close');
        // @ts-ignore
        if (document.startViewTransition) document.startViewTransition(() => element.remove());
        else element.addEventListener('animationend', () => element.remove(), {once: true});
        return;
    }

    element.remove();
}

// 创建通用提示框
export default function createAlert(message: string, category: ECategories | string = 'info', opts: IAlert = {}) {
    const {autoRemoveDelay = 2500, animation = true} = opts;

    const baseAlertBox = document.querySelector('.base-alert-box');
    const boxChildren = baseAlertBox.getElementsByClassName('alert');

    // 清除较旧的警示框
    if (boxChildren.length > 6) for (let i = boxChildren.length - 6; i--;) removeNote(<HTMLElement>boxChildren[i], false);

    const alert = document.createElement('div');
    alert.className = `note ${category || 'info'} alert${animation ? ' show' : ''}`;
    if (animation) { // @ts-ignore
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
    alert.addEventListener('click', function alertAction(event) {
        const target = (<HTMLElement>event.target).closest('.close');
        if (!target) return;
        this.removeEventListener('click', alertAction);
        removeNote(this, animation);
    });

    // add to DOM
    baseAlertBox.appendChild(alert);

    // 自动移除
    if (!alert || !autoRemoveDelay) return;

    const totalDelay = Math.min(
        autoRemoveDelay * boxChildren.length,
        10000 // Cap maximum delay at 10 seconds
    );

    setTimeout(() => {
        removeNote(alert, animation);
    }, totalDelay);
}


// 创建确认提示框
export function createConfirm(message: string = '是否确认操作?', opts: IConfirm = {}) {
    const defaultOpt = {
        timeout: 0,
        flag: 'default',
        category: 'info',
        defaultResult: false,
        strictTimeout: false,
        animation: true,
        ...opts
    };

    const {timeout, flag, category, defaultResult, strictTimeout, animation} = defaultOpt;
    const id = `confirm_${flag}`;

    if (document.getElementById(id)) return Promise.resolve(defaultResult);

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

    const messageParagraph = document.createElement('p');
    messageParagraph.classList.add('text');
    messageParagraph.textContent = message;

    const disagreeImg = document.createElement('img');
    setAttributes(disagreeImg, {
        class: 'action',
        src: '/img/svg/shutdown.svg',
        alt: 'disagree',
        width: '20',
        action: 'disagree'
    });

    appendChildren(confirm, agreeImg, messageParagraph, disagreeImg);

    // 默认的提示框box
    const baseAlertBox = document.getElementsByClassName('base-alert-box')[0];
    if (baseAlertBox.firstChild) baseAlertBox.insertBefore(confirm, baseAlertBox.firstChild);
    else baseAlertBox.appendChild(confirm);

    const {promise, resolve, reject} = Promise.withResolvers();

    let timeoutId: number = null;
    if (timeout) {
        timeoutId = setTimeout(() => {
            strictTimeout ? reject(defaultResult) : resolve(defaultResult);
            console.warn(`Confirm timeout timeout: ${flag}`);
            removeNote(confirm, animation);
        }, timeout);
    }

    confirm.addEventListener('click', function confirmAction(event) {
        const action = (<HTMLElement>event.target).closest('.action')?.getAttribute('action');
        if (!action) return;
        clearTimeout(timeoutId);
        resolve(action === 'agree');
        this.removeEventListener('click', confirmAction);
        removeNote(this, animation);
    });

    return promise;
}
