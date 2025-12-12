export default class SpectrumDiagram {
    public audioContext: AudioContext | null = null;

    private readonly canvas: HTMLCanvasElement;
    private readonly canvasContext: CanvasRenderingContext2D;

    private cachedBarWidth: number;
    private cachedSliceWidth: number;
    private width: number;
    private height: number;

    private analyser: AnalyserNode | null = null;
    private source: MediaElementAudioSourceNode | null = null;

    private color: string;
    private isDrawing: boolean = true;
    private lastDrawTime: number = 0;
    private drawInterval: number = 10;
    private currentMode: string = 'bars';

    private bufferLength: number = 0;
    private dataArray: Uint8Array<ArrayBuffer> | null = null;

    public constructor(canvas: HTMLCanvasElement, width: number, height: number) {
        this.canvas = canvas;
        this.canvasContext = canvas.getContext('2d')!;
        this.color = 'rgba(0,185,115,0.3)';

        this.cachedBarWidth = 0;
        this.cachedSliceWidth = 0;

        this.width = width;
        this.height = height;

        this.drawBars = this.drawBars.bind(this);
        this.drawLineGraph = this.drawLineGraph.bind(this);
    }

    public getCanvas(): HTMLCanvasElement | null {
        return this.canvas;
    }

    public setColor(value: string) {
        this.color = value;
    }

    public setWidth(value: number) {
        this.width = Math.max(0, value);
    }

    public setHeight(value: number) {
        this.height = Math.max(0, value);
    }

    public setDrawInterval(value: number) {
        if (!Number.isInteger(value)) throw new Error('Interval must be a integer');
        this.drawInterval = Math.max(0, value);
    }

    public resizeCanvas(): void {
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.setupStyles();

        if (this.bufferLength > 0) {
            const percent = this.width / this.bufferLength;
            this.cachedBarWidth = percent - 1;
            this.cachedSliceWidth = percent;
        }
    }

    public async initAudioSource(audioElement: HTMLAudioElement): Promise<void> {
        if (this.source) this.source.disconnect();

        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();

        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    public setAnalyser(analyserOpts: AnalyserOptions = {}): void {
        if (!this.source) throw new Error('source is required');
        if (!this.analyser) throw new Error('analyser is required');

        Object.assign(this.analyser, {
            fftSize: 256,
            minDecibels: -100,
            maxDecibels: -10,
            smoothingTimeConstant: 0.85,
            ...analyserOpts,
        });

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        const percent = this.width / this.bufferLength;
        this.cachedBarWidth = percent - 1;
        this.cachedSliceWidth = percent;

        this.resizeCanvas();
    }

    public async startDraw(mode = this.currentMode): Promise<void> {
        this.isDrawing = true;
        this.currentMode = mode;

        const drawFunction = mode === 'lines' ? this.drawLineGraph : this.drawBars;
        requestAnimationFrame(drawFunction);
    }

    public stopDraw(): void {
        this.isDrawing = false;
    }

    public dispose(): void {
        this.isDrawing = false;

        this.source?.disconnect();
        this.source = null;

        this.analyser?.disconnect();
        this.audioContext?.close().catch(console.error);

        this.canvasContext.clearRect(0, 0, this.canvas?.width ?? this.width, this.canvas?.height ?? this.height);
        this.dataArray = null;
    }

    private setupStyles(): void {
        // Cache styles
        if (!this.canvasContext) return;
        this.canvasContext.fillStyle = this.color;
        this.canvasContext.strokeStyle = this.color;
        this.canvasContext.lineWidth = 6;
    }

    private async drawBars(): Promise<void> {
        if (!this.isDrawing) return;
        requestAnimationFrame(this.drawBars);

        const now = performance.now();
        if (now - this.lastDrawTime < this.drawInterval) return;
        if (!this.analyser || !this.dataArray || !this.canvasContext) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        this.canvasContext.clearRect(0, 0, this.width, this.height);

        let x = 0;
        const barWidth = this.cachedBarWidth;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = this.dataArray[i] * 1.5;
            this.canvasContext.fillRect(x, this.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
        this.lastDrawTime = now;
    }

    private async drawLineGraph(): Promise<void> {
        if (!this.isDrawing) return;
        requestAnimationFrame(this.drawLineGraph);

        const now = performance.now();
        if (now - this.lastDrawTime < this.drawInterval) return;
        if (!this.analyser || !this.dataArray || !this.canvasContext) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        this.canvasContext.clearRect(0, 0, this.width, this.height);
        this.canvasContext.beginPath();

        let x = 0;
        const sliceWidth = this.cachedSliceWidth;

        for (let i = 0; i < this.bufferLength; i++) {
            const y = this.height - (this.dataArray[i] / 255.0 * this.height);

            i === 0 ? this.canvasContext.moveTo(x, y) : this.canvasContext.quadraticCurveTo((x - sliceWidth / 2), y, x, y);
            x += sliceWidth;
        }
        this.canvasContext.stroke();
        this.lastDrawTime = now;
    }
}
