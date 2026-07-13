import {AudioCompound} from "../compound/global/AudioCompound.ts";
import {QueueCompound} from "../compound/queue/QueueCompound.ts";
import {ControllerCompound} from "../compound/queue/ControllerCompound.ts";

export class PlayerContext {
    public readonly compound: AudioCompound;
    public readonly queue: QueueCompound;
    public readonly controller: ControllerCompound;

    public isSeeking: boolean = false;
    public isPlayerShow: boolean = false;
    public isLyricShow: boolean = false;

    public constructor(audio: AudioCompound, queue: QueueCompound, controller: ControllerCompound) {
        this.compound = audio;
        this.queue = queue;
        this.controller = controller;
    }

    public audio() {
        return this.compound.audio;
    }
}