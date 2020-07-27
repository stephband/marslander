
import { clamp } from '../../fn/module.js';

// Mars planetary boundary layer 0-10km (0-50000px)
// Convection layer heated by planet and dust absorption

// Mars troposphere 0-40km (0-200000px)
// Weather, dust storms

// Mars mesosphere 40-100km (200000-500000px)
// Occasional CO2 clouds when cold

// Mars thermosphere 100-200km (500000-1000000px)
// Driven by UV heating, can get 400K hot

export function renderBackground(ctx, viewbox, style, time, vapour) {
    //ctx.save();
    ctx.beginPath();
    ctx.rect.apply(ctx, viewbox);
    ctx.closePath();

    ctx.fillStyle = style.getPropertyValue('--sky-fill-top');
    ctx.fill();

    const ratio = 1 - clamp(0, 1, viewbox[1] / -50000);
    ctx.fillStyle = style.getPropertyValue('--sky-fill-bottom') + ('0' + Math.floor(ratio * 254).toString(16)).slice(-2);
    ctx.fill();
    //ctx.restore();
}
