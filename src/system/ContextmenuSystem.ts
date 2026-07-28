import {PageBuilder} from "../page/PageBuilder.ts";
import {Contextmenu} from "../compound/context_menu/Contextmenu.ts";
import {MenuActionDispatcher} from "../compound/context_menu/MenuActionDispatcher.ts";
import {QueueSystem} from "./QueueSystem.ts";
import {DetailSystem} from "./DetailSystem.ts";
import {FolderSystem} from "./FolderSystem.ts";

export class ContextmenuSystem {
    public static init(builder: PageBuilder) {
        const dispatcher = new MenuActionDispatcher(
            QueueSystem.QUEUE,
            DetailSystem.ACCESSOR,
            FolderSystem.POPUP,
            FolderSystem.ACCESSOR,
            FolderSystem.INPUT
        );

        builder.singleton('index-contextmenu', new Contextmenu(dispatcher));

        Object.freeze(this);
    }
}