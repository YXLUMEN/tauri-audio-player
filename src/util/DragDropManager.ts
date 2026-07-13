import {Predicate} from "../types/types.ts";
import {clamp} from "./Math.ts";

export class DragDropManager {
    private readonly container: HTMLElement;
    private readonly itemSelector: string;
    private readonly callbacks: DragDropCallbacks;

    private ctrl: AbortController | null = null;
    private dragStartIndex: number = -1;
    private dragItem: HTMLElement | null = null;
    private placeholder: HTMLElement | null = null;
    private isDragging: boolean = false;

    private mouseDownTime: number = 0;
    private readonly mouseDownPos: { x: number; y: number } = {x: 0, y: 0};
    private readonly DRAG_THRESHOLD = 5; // 拖拽阈值，超过此距离才认为是拖拽
    private readonly CLICK_THRESHOLD = 200; // 点击阈值，超过此时间才认为是拖拽

    public constructor(
        container: HTMLElement,
        itemSelector: string,
        callbacks: DragDropCallbacks
    ) {
        this.container = container;
        this.itemSelector = itemSelector;
        this.callbacks = callbacks;

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
    }

    public initialize(): void {
        this.container.addEventListener('mousedown', this.onMouseDown);
    }

    public destroy(): void {
        this.container.removeEventListener('mousedown', this.onMouseDown);
        this.ctrl?.abort();
    }

    private getItemIndex(item: HTMLElement): number {
        const children = this.container.children;
        let realIndex = 0;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            // 跳过占位符
            if (child === this.placeholder) continue;
            // 检查是否匹配选择器
            if (child.matches(this.itemSelector)) {
                if (child === item) return realIndex;
                realIndex++;
            }
        }

        return -1;
    }

    private onMouseDown(event: MouseEvent): void {
        // 如果正在拖拽，或者点击的是按钮、输入框等交互元素，不触发拖拽
        if (this.isDragging) return;

        const target = event.target as HTMLElement;

        // 查找拖拽目标元素
        const dragItem = target.closest(this.itemSelector) as HTMLElement;
        if (!dragItem || !this.container.contains(dragItem)) return;

        // 获取拖拽项的索引（实际列表项索引）
        const index = this.getItemIndex(dragItem);
        if (index === -1) return;

        // 检查是否允许拖拽
        if (this.callbacks.onDragStart && !this.callbacks.onDragStart(index)) {
            return;
        }

        // 记录鼠标按下的时间和位置
        this.mouseDownTime = performance.now();
        this.mouseDownPos.x = event.clientX;
        this.mouseDownPos.y = event.clientY;
        this.dragStartIndex = index;
        this.dragItem = dragItem;

        // 阻止默认行为以防止选中文本
        event.preventDefault();
        this.ctrl?.abort();

        this.ctrl = new AbortController();
        const signal = this.ctrl.signal;

        this.container.addEventListener('mousemove', this.onMouseMove, {signal});
        this.container.addEventListener('mouseup', this.onMouseUp, {signal});
        this.container.addEventListener('mouseleave', this.onMouseUp, {signal});
    }

    private onMouseMove(event: MouseEvent): void {
        if (!this.dragItem) return;

        if (!this.isDragging) {
            const timeDiff = performance.now() - this.mouseDownTime;
            const distanceX = Math.abs(event.clientX - this.mouseDownPos.x);
            const distanceY = Math.abs(event.clientY - this.mouseDownPos.y);
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

            if (distance <= this.DRAG_THRESHOLD && timeDiff <= this.CLICK_THRESHOLD) {
                return;
            }
            this.isDragging = true;

            const placeholder = document.createElement('div');
            placeholder.className = 'drag-placeholder';
            this.placeholder = placeholder;
            this.dragItem.classList.add('dragging-item');

            // 在占位元素位置插入
            this.dragItem.parentNode?.insertBefore(this.placeholder, this.dragItem.nextSibling);
        }

        if (!this.placeholder) return;

        event.preventDefault();

        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        if (!elementBelow) return;

        // 查找目标列表项
        const targetItem = elementBelow.closest(this.itemSelector) as HTMLElement;
        if (!targetItem || targetItem === this.dragItem || !this.container.contains(targetItem)) {
            return;
        }

        // 用鼠标在目标元素内的垂直位置决定插入方向（上半插前，下半插后），
        // 而不依赖占位符的当前位置，从根本上避免循环抖动。
        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = event.clientY < midY;

        const children = this.container.children;
        const placeholderChildIndex = Array.prototype.indexOf.call(children, this.placeholder);
        const targetChildIndex = Array.prototype.indexOf.call(children, targetItem);

        // 计算插入后占位符应处于的 child 索引，判断是否需要移动
        const desiredIndex = insertBefore ? targetChildIndex : targetChildIndex + 1;
        if (placeholderChildIndex !== desiredIndex && placeholderChildIndex + 1 !== desiredIndex) {
            if (insertBefore) {
                targetItem.parentNode?.insertBefore(this.placeholder, targetItem);
            } else {
                targetItem.parentNode?.insertBefore(this.placeholder, targetItem.nextSibling);
            }

            this.callbacks.onDragOver?.(this.getItemIndex(targetItem));
        }
    }

    private onMouseUp(): void {
        // 如果没有开始拖拽（只是点击），直接重置状态
        if (!this.dragItem) return;

        // 如果正在进行拖拽操作
        if (this.isDragging && this.placeholder) {
            // 计算最终位置（基于实际列表项的索引）
            // 获取占位符在容器中的位置
            const children = Array.from(this.container.children);
            const placeholderChildIndex = children.indexOf(this.placeholder);

            // 计算目标实际列表项索引
            let targetRealIndex = 0;
            for (let i = 0; i < placeholderChildIndex; i++) {
                const child = children[i];
                if (child !== this.dragItem && child.matches(this.itemSelector)) {
                    targetRealIndex++;
                }
            }

            // 恢复拖拽项样式
            this.dragItem.classList.remove('dragging-item');

            // 移除占位元素
            this.placeholder.remove();

            // 调用回调函数
            if (this.callbacks.onDragEnd && this.dragStartIndex !== -1) {
                // 确保索引在有效范围内
                const items = this.container.querySelectorAll(this.itemSelector);
                const maxIndex = Math.max(0, items.length - 1);
                const adjustedFinalIndex = clamp(targetRealIndex, 0, maxIndex);

                if (this.dragStartIndex !== adjustedFinalIndex) {
                    this.callbacks.onDragEnd(this.dragStartIndex, adjustedFinalIndex, this.dragItem);
                }
            }
        }

        // 重置状态
        this.reset();
    }

    private reset() {
        this.ctrl?.abort();

        this.isDragging = false;
        this.dragItem = null;
        this.placeholder = null;
        this.dragStartIndex = -1;
        this.mouseDownTime = 0;
        this.mouseDownPos.x = 0;
        this.mouseDownPos.y = 0;
    }
}

export interface DragDropCallbacks {
    /** 拖拽开始时调用，返回是否允许拖拽 */
    onDragStart?: Predicate<number>;
    /** 拖拽结束时调用 */
    onDragEnd?: (fromIndex: number, toIndex: number, item: HTMLElement) => void;
    /** 拖拽经过某个元素时调用，用于视觉反馈 */
    onDragOver?: (targetIndex: number) => void;
}