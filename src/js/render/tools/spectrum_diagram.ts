export default class SpectrumDiagram {
    public audioContext: AudioContext;

    private _canvas: HTMLCanvasElement;
    private canvasContext: CanvasRenderingContext2D;
    private _color: string;

    private cachedBarWidth: number;
    private cachedSliceWidth: number;

    private analyser: AnalyserNode;
    private source: MediaElementAudioSourceNode | null;

    private _width: number;
    private _height: number;
    private _drawInterval: number;
    private isDrawing: boolean;
    private lastDrawTime: number;

    private currentMode: string;
    private bufferLength: number;
    private dataArray: Uint8Array<ArrayBuffer>;


    constructor(canvas: HTMLCanvasElement, width: number, height: number) {
        this._canvas = canvas;
        this.canvasContext = canvas.getContext('2d');
        this._color = 'rgba(0,185,115,0.3)';

        this.cachedBarWidth = 0;
        this.cachedSliceWidth = 0;

        this.audioContext = null;
        this.analyser = null;
        this.source = null;

        this._width = width;
        this._height = height;

        this.isDrawing = true;
        this.lastDrawTime = 0;
        this._drawInterval = 10;

        this.currentMode = 'bars';

        this.drawBars = this.drawBars.bind(this);
        this.drawLineGraph = this.drawLineGraph.bind(this);
    }

    private setupStyles(): void {
        // Cache styles
        this.canvasContext.fillStyle = this._color;
        this.canvasContext.strokeStyle = this._color;
        this.canvasContext.lineWidth = 6;
    }

    public resizeCanvas(): void {
        this._canvas.width = this._width;
        this._canvas.height = this._height;
        this.setupStyles();

        if (this.bufferLength) {
            this.cachedBarWidth = (this._width / this.bufferLength) - 1;
            this.cachedSliceWidth = this._width / this.bufferLength;
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

        Object.assign(this.analyser, {
            fftSize: 256,
            minDecibels: -100,
            maxDecibels: -10,
            smoothingTimeConstant: 0.85,
            ...analyserOpts,
        });

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        this.cachedBarWidth = (this._width / this.bufferLength) - 1;
        this.cachedSliceWidth = this._width / this.bufferLength;

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

    private async drawBars(): Promise<void> {
        if (!this.isDrawing) return;
        requestAnimationFrame(this.drawBars);

        const now = performance.now();
        if (now - this.lastDrawTime < this._drawInterval) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        const [width, height] = [this._width, this._height];
        this.canvasContext.clearRect(0, 0, width, height);

        let x = 0;
        const barWidth = this.cachedBarWidth;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = this.dataArray[i] * 1.5;
            this.canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
        this.lastDrawTime = now;
    }

    private async drawLineGraph(): Promise<void> {
        if (!this.isDrawing) return;
        requestAnimationFrame(this.drawLineGraph);

        const now = performance.now();
        if (now - this.lastDrawTime < this._drawInterval) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        const [width, height] = [this._width, this._height];
        this.canvasContext.clearRect(0, 0, width, height);
        this.canvasContext.beginPath();

        let x = 0;
        const sliceWidth = this.cachedSliceWidth;

        for (let i = 0; i < this.bufferLength; i++) {
            const y = height - (this.dataArray[i] / 255.0 * height);

            i === 0 ? this.canvasContext.moveTo(x, y) : this.canvasContext.quadraticCurveTo((x - sliceWidth / 2), y, x, y);
            x += sliceWidth;
        }
        this.canvasContext.stroke();
        this.lastDrawTime = now;
    }

    public dispose(): void {
        this.isDrawing = false;

        this.source?.disconnect();
        this.source = null;

        this.analyser?.disconnect();
        this.audioContext?.close().catch(console.error);

        this.canvasContext?.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this.canvasContext = null;
        this._canvas = null;
        this.dataArray = null;
    }

    get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    set color(value: string) {
        this._color = value;
    }

    set drawInterval(value: number) {
        this._drawInterval = Math.max(0, value);
    }

    set height(value: number) {
        this._height = Math.max(0, value);
    }

    set width(value: number) {
        this._width = Math.max(0, value);
    }
}
