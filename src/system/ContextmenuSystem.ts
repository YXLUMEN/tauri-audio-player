import {PageBuilder} from "../page/PageBuilder.ts";
import {Contextmenu} from "../compound/context_menu/Contextmenu.ts";

export class ContextmenuSystem {
    public static init(builder: PageBuilder) {
        builder.singleton('index-contextmenu', new Contextmenu());

        Object.freeze(this);
    }
}