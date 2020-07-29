
import { drawPath } from './canvas.js';


/* Rocket */

export function renderRocket(ctx, viewbox, style, rocket) {
    ctx.save();
    ctx.translate(rocket.position.value[0], rocket.position.value[1]);
    ctx.rotate(rocket.rotation.value * 2 * Math.PI);

    drawPath(ctx, rocket.data);

    ctx.fillStyle = style.getPropertyValue('--rocket-fill');
    ctx.fill();
    ctx.restore();

    // ----------------
    /*if (rocket.shape1) {
        drawPath(ctx, rocket.shape1);
        ctx.fillStyle = 'red';
        ctx.fill();
    }*/
}

const controls = document.getElementById('controls');

export function renderFuel(ctx, viewbox, style, rocket) {
    controls.style.setProperty('--fuel', rocket.fuel.value);

    /*ctx.save();
    ctx.translate(viewbox[0], viewbox[1]);
    drawPath(ctx, [
        [0, 0],
        [rocket.fuel.value * viewbox[2], 0],
        [rocket.fuel.value * viewbox[2], viewbox[3]],
        [0, viewbox[3]]
    ]);
    ctx.fillStyle = style.getPropertyValue('--fuel-fill');
    ctx.fill();
    ctx.restore();
    */
}