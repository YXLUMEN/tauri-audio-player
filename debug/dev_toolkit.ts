type Mode = 'all' | 'nonEmpty' | 'flat';
type RootLike = Document | HTMLElement | ShadowRoot | DocumentFragment;

type DevToolsListener = {
    type?: string;
    listener?: EventListener | Function;
    useCapture?: boolean;
    passive?: boolean;
    once?: boolean;
    // 其它字段在不同版本 DevTools 中可能出现，这里不强约束
    [k: string]: unknown;
};

interface ShowListenersOptions {
    mode?: Mode;
    root?: RootLike;
    includeRoot?: boolean;
    includeShadow?: boolean;
    filterTypes?: string[];       // 仅包含指定事件类型
    filterSelector?: string;      // 仅包含匹配的元素
    logTable?: boolean;           // 是否 console.table 摘要
}

function showAllListeners(opts: ShowListenersOptions = {}) {
    const {
        mode = 'nonEmpty',
        root = document,
        includeRoot = false,
        includeShadow = true,
        filterTypes,
        filterSelector,
        logTable = false,
    } = opts;

    // @ts-ignore
    const gel = getEventListeners;
    if (typeof gel !== 'function') {
        // 返回空结构，交由调用方决定是否告警
        return {nodes: 0, entries: [] as any[], summary: {} as Record<string, number>};
    }

    const entries: any[] = [];
    const summary: Record<string, number> = Object.create(null);

    const isNonEmpty = (obj: unknown) =>
        obj != null &&
        typeof obj === 'object' &&
        Object.keys(obj as object).length > 0;

    const toCssPath = (el: Element) => {
        const parts: string[] = [];
        let cur: Element | null = el;
        while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
            const tag = cur.tagName.toLowerCase();
            const id = cur.id ? `#${CSS.escape(cur.id)}` : '';
            const cls = cur.classList?.length
                ? '.' + Array.from(cur.classList).map(c => CSS.escape(c)).join('.')
                : '';
            const sameTagSiblings = cur.parentElement
                ? Array.from(cur.parentElement.children).filter(n => n.tagName === cur!.tagName)
                : [];
            const nth = sameTagSiblings.length > 1
                ? `:nth-of-type(${sameTagSiblings.indexOf(cur) + 1})`
                : '';
            parts.unshift(`${tag}${id}${cls}${nth}`);
            cur = cur.parentElement;
        }
        return parts.join(' > ');
    };

    const visitNode = (node: RootLike | Element) => {
        // 只针对 Element 获取监听
        if ((node as Element).querySelectorAll) {
            const el = node as Element;
            if (!filterSelector || el.matches?.(filterSelector)) {
                const map = gel(el) || {};
                const hasAny = isNonEmpty(map);

                if (mode === 'all' || (mode === 'nonEmpty' && hasAny)) {
                    entries.push({
                        id: el.id || '',
                        tag: el.tagName?.toLowerCase?.() || '',
                        class: String((el as any).className ?? ''),
                        path: toCssPath(el),
                        listeners: map,
                    });
                } else if (mode === 'flat' && hasAny) {
                    for (const [type, handlers] of Object.entries(map)) {
                        if (filterTypes && !filterTypes.includes(type)) continue;
                        for (const h of handlers as DevToolsListener[]) {
                            const name =
                                (typeof h.listener === 'function' && (h.listener as Function).name) || '<anonymous>';
                            entries.push({
                                id: el.id || '',
                                tag: el.tagName?.toLowerCase?.() || '',
                                class: String((el as any).className ?? ''),
                                path: toCssPath(el),
                                type,
                                handlerName: name,
                                capture: !!(h.useCapture as boolean),
                                passive: !!(h.passive as boolean),
                                once: !!(h.once as boolean),
                            });
                        }
                    }
                }

                // 更新摘要
                for (const [type, handlers] of Object.entries(map)) {
                    if (filterTypes && !filterTypes.includes(type)) continue;
                    // @ts-ignore
                    summary[type] = (summary[type] || 0) + (handlers?.length || 0);
                }
            }
        }

        // 进入 Shadow DOM
        if (includeShadow && (node as Element).shadowRoot) {
            traverse((node as Element).shadowRoot as ShadowRoot);
        }
    };

    const traverse = (r: RootLike) => {
        // 可选地包含 root 自身
        if (includeRoot && (r as Element).tagName) visitNode(r);

        // 使用 TreeWalker 更轻量，也便于扩展过滤
        const walker = document.createTreeWalker(
            r,
            NodeFilter.SHOW_ELEMENT,
            null,
        );
        let cur: Node | null = walker.currentNode;
        while (cur) {
            visitNode(cur as Element);
            // 如果该元素拥有 shadowRoot，递归
            const el = cur as Element;
            if (includeShadow && (el as any).shadowRoot) {
                traverse((el as any).shadowRoot);
            }
            cur = walker.nextNode();
        }
    };

    traverse(root);

    if (logTable) {
        if (mode === 'flat') {
            console.table(entries.slice(0, 200)); // 防止超大输出
        } else {
            const countByNode = entries.map(e => ({
                tag: e.tag,
                id: e.id,
                class: e.class,
                path: e.path,
                total: Object.values(e.listeners).reduce((n: number, arr: any) => n + (arr?.length || 0), 0),
            }));
            console.table(countByNode.slice(0, 200));
        }
    }

    return {nodes: entries.length, entries, summary};
}