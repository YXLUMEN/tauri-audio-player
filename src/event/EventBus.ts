import {Consumer} from "../types/types.ts";
import {AppEvents} from "./AppEvents.ts";

export class EventBus {
    private readonly bus = new EventTarget();

    public emit(event: Event): boolean {
        return this.bus.dispatchEvent(event);
    }

    public on<K extends keyof AppEvents>(
        type: K,
        handler: Consumer<AppEvents[K]>,
        options?: AddEventListenerOptions | boolean
    ): Consumer<void> {
        this.bus.addEventListener(type, handler as Consumer<Event>, options);
        return () => this.bus.removeEventListener(type, handler as Consumer<Event>);
    }

    public once<T extends Event>(
        type: keyof AppEvents,
        handler: Consumer<T>,
        options?: AddEventListenerOptions | boolean
    ): Consumer<void> {
        const wrapper = (event: T) => {
            handler(event);
            this.bus.removeEventListener(type, wrapper as Consumer<Event>);
        };

        this.bus.addEventListener(type, wrapper as Consumer<Event>, options);
        return () => this.bus.removeEventListener(type, wrapper as Consumer<Event>);
    }

    public off<K extends keyof AppEvents>(type: K, handler: Consumer<AppEvents[K]>) {
        this.bus.removeEventListener(type, handler as Consumer<Event>);
    }
}

export const appEvent = new EventBus();