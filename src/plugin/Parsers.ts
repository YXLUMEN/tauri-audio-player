import {ParserPlugin} from "./ParserPlugin.ts";
import {Constructor} from "../types/types.ts";
import {ArtParser} from "./plugins/ArtParser.ts";
import {LocalParser} from "./plugins/LocalParser.ts";

export class Parsers {
    private static readonly MAP: Map<string, ParserPlugin> = new Map();

    public static readonly ART = this.register('art', ArtParser);
    public static readonly LOCAL = this.register('local', LocalParser);

    public static async loadAll(): Promise<void> {
        for (const plugin of this.MAP.values()) {
            await plugin.init();
        }
    }

    public static get(name: string): ParserPlugin | undefined {
        return this.MAP.get(name);
    }

    public static iter() {
        return this.MAP.entries();
    }

    private static register<T extends ParserPlugin>(name: string, C: Constructor<T>): T {
        return this.MAP.getOrInsert(name, new C(name)) as T;
    }
}