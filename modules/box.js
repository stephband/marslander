import { get, last } from '../../fn/module.js';
import { drawPath } from './canvas.js';

export function renderBox(ctx, viewbox) {
    const surface = [
        [-100, -600],
        [100, -700],
        [100, -480],
        [-100, -480]
    ];

    ctx.save();
    drawPath(ctx, surface);
    ctx.strokeStyle = 'black';
    ctx.stroke();
    ctx.restore();
}