/**
 * @example:
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