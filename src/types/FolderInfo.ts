import {randomCover} from "../util/random.ts";
import {FolderRecord} from "./FolderRecord.ts";

export class FolderInfo implements FolderRecord {
    public static readonly DEFAULT = new FolderInfo(
        1,
        '默认歌单',
        '',
        '/img/audio/cover/audio-2.webp'
    );

    public readonly id: number;
    public readonly name: string;
    public readonly desc: string;
    public readonly cover: string;

    public constructor(
        id: number,
        name: string,
        desc?: string,
        cover?: string,
    ) {
        this.id = id;
        this.name = name;
        this.desc = desc ?? '';
        this.cover = cover ?? randomCover();
    }

    public persistable(): FolderRecord {
        return {
            id: this.id,
            name: this.name,
            desc: this.desc,
            cover: this.cover,
        }
    }
}