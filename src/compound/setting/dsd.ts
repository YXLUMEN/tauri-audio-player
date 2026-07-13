import SpectrumDiagram from "../../util/SpectrumDiagram.ts";
import {debounce} from "../../util/util.ts";
import {AudioCompound} from "../global/AudioCompound.ts";
import {BaseCompound} from "../BaseCompound.ts";

export class Dsd extends BaseCompound {
    private readonly audio: HTMLAudioElement;
    private DSD: SpectrumDiagram | null = null;

    public constructor(audio: AudioCompound) {
        super(true);
        this.audio = audio.audio;
    }

    public async toggleDraw(event: Event) {
        const canvas = this.DSD!.getCanvas();

        if ((event.target as HTMLInputElement).checked) {
            await this.DSD!.startDraw();
            if (canvas) canvas.style.display = 'block';
            return;
        }
        this.DSD!.stopDraw();
        if (canvas) canvas.style.display = 'none';
    }

    public async switchDrawMode() {
        this.DSD!.stopDraw();

        const selectedRadio = document.querySelector('input[name="draw-mode"]:checked') as HTMLInputElement;
        if (selectedRadio) await this.DSD!.startDraw(selectedRadio.value)
    }

    public changeFFTSize() {
        const target = document.querySelector('input[name="change-fftSize"]') as HTMLInputElement;
        const value: string = target.value;
        const num = value === '' ? 256 : Number(value);
        if (!Number.isInteger(num) || num < 32 || num > 32768 || (num & (num - 1)) !== 0) {
            alert('必须为2的次方并且满足[32,32768]');
            return false;
        }
        this.DSD!.setAnalyser({fftSize: num});
    }

    public changeDrawInterval() {
        const target = document.querySelector('input[name="change-draw-interval"]') as HTMLInputElement;
        const value = target.value;
        const tick = value === '' ? 10 : Number(value);
        if (!Number.isInteger(tick)) return;
        this.DSD!.setDrawInterval(tick);
    }

    public changeDecibels() {
        const minEle = document.querySelector('input[name="min-decibels"]') as HTMLInputElement;
        const maxEle = document.querySelector('input[name="max-decibels"]') as HTMLInputElement;

        const minV = minEle.value;
        const maxV = maxEle.value;
        const [min, max] = [minV === '' ? -100 : Number(minV), maxV === '' ? -10 : Number(maxV)];
        if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) return;
        this.DSD!.setAnalyser({
            minDecibels: min,
            maxDecibels: max,
        });
    }

    private fftActions(action: string, event: Event) {
        switch (action) {
            case 'toggle-fft':
                void this.toggleDraw(event);
                break
            case 'draw-mode':
                void this.switchDrawMode();
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

    public setDsd(dsd: SpectrumDiagram) {
        this.DSD = dsd;
    }

    public mount(target: HTMLElement) {
        const ctrl = new AbortController();

        // 初始化频谱分析
        this.assert(target, '#toggle-fft')!.addEventListener('change', async () => {
            const dsd = this.DSD;
            if (!dsd) return;
            ctrl.abort();

            const resizeDSD = debounce(() => {
                const width = window.innerWidth;
                dsd.setWidth(width);
                dsd.setAnalyser({
                    fftSize: width >= 650 ? 256 : 128
                });
            }, 500);

            await dsd.initAudioSource(this.audio);
            dsd.setAnalyser();
            await this.switchDrawMode();
            resizeDSD();

            // 频谱图操作
            this.assert(target, '#fft-settings')!.addEventListener('click', event => {
                const target = (event.target as HTMLElement).closest('input');
                if (!target) return;
                const name = target.getAttribute('name')!;
                this.fftActions(name, event);
            });

            // 自动重绘
            window.addEventListener('resize', resizeDSD);
        }, {signal: ctrl.signal});

        return Promise.resolve();
    }
}
