// 音频播放时间换算
export function transTime(value: number) {
    const h = value / 3600 | 0;
    const remaining = value % 3600;
    const m = remaining / 60 | 0;
    const s = remaining % 60 | 0;

    if (h > 0) {
        return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}