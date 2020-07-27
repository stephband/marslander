
/* Explosion */

import { remove } from '../../fn/module.js';
import { updateValue } from './physics.js';
import { drawCircle } from './canvas.js';

export function updateExplosion(terrainbox, object, t0, t1, objects) {
    updateValue(object.position, t1 - t0);
    if (object.created < t1 - object.duration) {
        remove(objects, object);
    }
}

export function renderExplosion(ctx, viewbox, style, object, t0, t1) {
    const decay = 1 - ((t1 - object.created) / object.duration);
    drawCircle(ctx, object.position.value, 80 * decay * decay);
    ctx.fillStyle = style.getPropertyValue('--explosion-fill');
    ctx.fill();
}
