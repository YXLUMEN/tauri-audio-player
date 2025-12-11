import {PlayerRender} from "./player_render";
import {toggleSettings} from "../component/setting";
import {QueueController} from "../playing_queue/queue_controller";
import {createAlert} from "../utils/front/alert";
import {PlayerStatus} from "./player_status";
import {IndexController} from "../index/index_controller";

export class PlayerController {
    public static initialize() {
        document.getElementById('close-player')!.addEventListener('click', PlayerRender.togglePlayer);

        // 进度条拖动
        const iPgsPlay = document.getElementById('i-progress-played')! as HTMLInputElement;
        iPgsPlay.addEventListener('input', PlayerStatus.progressSeeking);
        iPgsPlay.addEventListener('change', PlayerStatus.progressLeap);

        const progressPlayed = document.getElementById('progress-played')! as HTMLInputElement;
        progressPlayed.addEventListener('input', PlayerStatus.progressSeeking);
        progressPlayed.addEventListener('change', PlayerStatus.progressLeap);

        // 选中播放队列
        document.getElementById('playing-queue')!.addEventListener('click', (event) => {
            const target = (event.target as HTMLElement).closest('.queue-row');
            if (!target) return;
            const index = Number(target.getAttribute('play-index'));
            if (isNaN(index)) {
                createAlert('无效选项', 'warning');
                return;
            }

            QueueController.switchAudio(index).catch();
        });

        // 关闭播放队列
        document.getElementById('close-playing-board')!.addEventListener('click', PlayerRender.closePlayingBoard);


        // 展示设置选项框
        document.getElementById('setting')!.addEventListener('click', toggleSettings);


        // 音频控制按钮
        document.getElementById('audio-box')!.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            const action = target.closest('.control-icon')?.getAttribute('action');
            if (!action) {
                if (!target.id || target?.id === 'player-box') return PlayerRender.togglePlayer();
                return;
            }

            IndexController.applyPlayAction(action);
        });
    }
}