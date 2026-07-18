import {BaseCompound} from "../BaseCompound.ts";
import {MenuActionDispatcher} from "./MenuActionDispatcher.ts";
import {ActionType} from "./ActionType.ts";

export class Contextmenu extends BaseCompound {
    private readonly actionDispatcher = new MenuActionDispatcher();
    private chosen: WeakRef<Element> | null = null;
    private type: ActionType = ActionType.None;

    private menu: HTMLElement | null = null;

    public constructor() {
        super(true);
        this.onClick = this.onClick.bind(this);
    }

    private onClick(event: PointerEvent) {
        const action = (event.target as HTMLElement).closest('.item')?.getAttribute('action');
        if (!action) return;

        const chosen = this.chosen?.deref();
        if (!chosen) return;
        this.actionDispatcher.dispatch(action, this.type, chosen)
            .catch(err => console.error(err));
        this.type = ActionType.None;
    }

    private chosenElement(target: HTMLElement) {
        this.type = ActionType.None;
        if (!this.menu) return;

        const row = target.closest('.row');
        if (row && row.isConnected) {
            this.type = ActionType.Row;
            this.menu.querySelector('.menu.for-row')?.classList.add('show');
            return row;
        }

        const queueRow = target.closest('.queue-row');
        if (queueRow && queueRow.isConnected) {
            this.type = ActionType.QueueRow;
            this.menu.querySelector('.menu.for-queue-row')?.classList.add('show');
            return queueRow;
        }

        const folder = target.closest('.audio-folder');
        if (folder && folder.isConnected) {
            this.type = ActionType.Folder;
            this.menu.querySelector('.menu.for-folder')?.classList.add('show');
            return folder;
        }
    }

    private displayMenu(element: HTMLElement, event: PointerEvent) {
        element.style.display = 'block';

        const menuWidth = element.offsetWidth;
        const menuHeight = element.offsetHeight;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let left = event.pageX;
        let top = event.pageY;

        if (left + menuWidth > windowWidth) left = left - menuWidth;
        if (top + menuHeight > windowHeight) top = top - menuHeight;

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
    }

    public mount(target: HTMLElement): Promise<void> {
        this.menu = target;

        document.addEventListener('contextmenu', event => {
            event.stopPropagation();
            event.preventDefault();

            target.querySelector('.menu.show')?.classList.remove('show');

            const chosen = this.chosenElement(event.target as HTMLElement);
            if (!chosen) return;

            this.chosen = new WeakRef(chosen);
            target.addEventListener('click', this.onClick, {once: true});

            this.displayMenu(target, event);
        });

        document.addEventListener('click', () => {
            target.style.display = 'none';
        });

        return Promise.resolve();
    }
}