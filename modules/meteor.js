
import { clamp, remove } from '../../fn/module.js';
import { updateValue } from './physics.js';
import { drawPath } from './canvas.js';

export function updateMeteor(terrainbox, meteor, t0, t1, objects, collisions) {
    const p0 = copy(meteor.position.value);
    updateValue(meteor.position, t1 - t0);

    const collision = detectObjectTerrainCollision(terrain, meteor, p0, r0);

    // Detect collision
    if (collision) {
        collision.t0 = t0;
        collision.t1 = t1;
        collision.time = collision.t * (t1 - t0) + t0;
        collision.velocity = copy(rocket.position.velocity);

        // If velocity is high, or if the craft is not upright or the ground is not level
        const g = abs(gradient(collision.st, collision.et));
        const vel = toPolar(collision.velocity)[0];

        collisions.push(collision);
    }
}

export function collideMeteor(terrainbox, meteor, t0, t1, objects) {
    updateValue(meteor.position, t1 - t0);
}

export function renderMeteor(ctx, viewbox, style, meteor, t0, t1) {
    ctx.save();
    ctx.translate(meteor.position.value[0], meteor.position.value[1]);
    drawPath(ctx, meteor.data);
    ctx.fillStyle = style.getPropertyValue('--terrain-fill');
    ctx.fill();
    ctx.restore();
}
