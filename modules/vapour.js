
import { clamp, remove } from '../../fn/module.js';
import { updateValue } from './physics.js';
import { drawCircle } from '../../colin/modules/canvas.js';

export function from() {
    return {
        type: 'vapour',
        collide: ['vapour'],
        data: [0, 0]
    };
}

export function of() {
    return {
        type: 'vapour',
        collide: ['vapour'],
        data: [0, 0]
    };
}

export function update(terrainbox, vapour, t0, t1, objects, terrain) {
    updateValue(vapour.position, t1 - t0);

    if (vapour.created < t1 - vapour.duration) {
        remove(objects, vapour);
    }
}

export function render(ctx, viewbox, style, vapour, t0, t1) {
    const decay = clamp(0, 1, (t1 - vapour.created) / vapour.duration);
    ctx.save();
    ctx.translate(vapour.position.value[0], vapour.position.value[1]);
    drawCircle(ctx, vapour.data, vapour.data[2] * (1 + 16 * Math.pow(decay, 2)));
    ctx.fillStyle = style.getPropertyValue('--vapour-fill') + ('0' + Math.floor(160 - 160 * Math.pow(decay, 0.1)).toString(16)).slice(-2);
    // Waaay slows it down
    //ctx.filter = "blur(2px)";
    ctx.fill();
    ctx.restore();
}




/* OLD */

export function updateVapour(terrainbox, vapour, t0, t1, objects) {
    updateValue(vapour.position, t1 - t0);

    if (vapour.created < t1 - vapour.duration) {
        remove(objects, vapour);
    }
}

export function renderVapour(ctx, viewbox, style, vapour, t0, t1) {
    const decay = clamp(0, 1, (t1 - vapour.created) / vapour.duration);
    ctx.save();
    ctx.translate(vapour.position.value[0], vapour.position.value[1]);
    drawCircle(ctx, vapour.data, vapour.data[2] * (1 + 16 * Math.pow(decay, 2)));
    ctx.fillStyle = style.getPropertyValue('--vapour-fill') + ('0' + Math.floor(160 - 160 * Math.pow(decay, 0.1)).toString(16)).slice(-2);
    // Waaay slows it down
    //ctx.filter = "blur(2px)";
    ctx.fill();
    ctx.restore();
}

/* --- */
