import SpectrumDiagram from "../utils/SpectrumDiagram";
import {debounce} from "../utils/util";
import {QueueStatus} from "../playing_queue/queue_status";

export class Dsd {
    public static readonly DSD = new SpectrumDiagram(
        document.getElementById('audio-canvas') as HTMLCanvasElement,
        window.innerWidth,
        400
    );

    public static async toggleDraw(event: Event) {
        if ((event.target as HTMLInputElement).checked) {
            await this.DSD.startDraw();
            if (this.DSD.canvas) this.DSD.canvas.style.display = 'block';
            return
        }
        this.DSD.stopDraw();
        if (this.DSD.canvas) this.DSD.canvas.style.display = 'none';
    }

    public static async switchDrawMode() {
        this.DSD.stopDraw();

        const selectedRadio = document.querySelector('input[name="draw-mode"]:checked') as HTMLInputElement;
        if (selectedRadio) await this.DSD.startDraw(selectedRadio.value)
    }

    public static changeFFTSize() {
        const target = document.querySelector('input[name="change-fftSize"]') as HTMLInputElement;
        const value: string = target.value;
        const n = value === '' ? 256 : Number(value);
        if (isNaN(n) || n < 32 || n > 32768 || (n & (n - 1)) !== 0) {
            alert('必须为2的次方并且满足[32,32768]');
            return false;
        }
        this.DSD.setAnalyser({fftSize: n});
    }

    public static changeDrawInterval() {
        const target = document.querySelector('input[name="change-draw-interval"]') as HTMLInputElement;
        const value = target.value;
        const tick = value === '' ? 10 : Number(value);
        if (isNaN(tick)) return;
        this.DSD.drawInterval = Math.max(0, tick);
    }

    public static changeDecibels() {
        const minEle = document.querySelector('input[name="min-decibels"]') as HTMLInputElement;
        const maxEle = document.querySelector('input[name="max-decibels"]') as HTMLInputElement;

        const minV = minEle.value;
        const maxV = maxEle.value;
        const [min, max] = [minV === '' ? -100 : Number(minV), maxV === '' ? -10 : Number(maxV)];
        if (isNaN(min) || isNaN(max) || min >= max) return;
        this.DSD.setAnalyser({
            minDecibels: min,
            maxDecibels: max,
        });
    }

    private static fftActions(action: string, event: Event) {
        switch (action) {
            case 'toggle-fft':
                this.toggleDraw(event).then();
                break
            case 'draw-mode':
                this.switchDrawMode().then();
                break;
            case 'change-fftSize-btn':
                this.changeFFTSize();
                break;
            case 'change-draw-interval-btn':
                this.changeDrawInterval();
                break;
            case 'min-decibels-btn':
                this.changeDecibels();
                break;
            case 'max-decibels-btn':
                this.changeDecibels();
        }
    }

    public static initialize() {
        // 初始化频谱分析
        document.getElementById('toggle-fft')!.addEventListener('change', async () => {
            const resizeDSD = debounce(() => {
                const width = window.innerWidth;
                this.DSD.width = width;
                this.DSD.setAnalyser({
                    fftSize: width >= 650 ? 256 : 128
                });
            }, 500);

            await this.DSD.initAudioSource(QueueStatus.getPlayer());
            this.DSD.setAnalyser();
            await this.switchDrawMode();
            resizeDSD();

            // 频谱图操作
            document.getElementById('fft-settings')!.addEventListener('click', event => {
                const target = (event.target as HTMLElement).closest('input');
                if (!target) return;
                const name = target.getAttribute('name')!;
                this.fftActions(name, event);
            });

            // 自动重绘
            window.addEventListener('resize', resizeDSD);
        }, {once: true});
    }
}
