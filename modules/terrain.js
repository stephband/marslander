
/* Terrain */

import { get, last } from '../../fn/module.js';
import { drawPath } from './canvas.js';

function generateTerrain(viewbox, terrain) {
    if (!terrain.length) {
        // Seed the terrain
        terrain.push({
            0: 0,
            1: Math.random() * 400 - 400
        });
    }

    while(terrain[0][0] >= viewbox[0]) {
        // Add more onto beginning of terrain
        terrain.unshift({
            0: terrain[0][0] - Math.random() * 40 - 10,
            1: Math.random() * 400 - 400
        });
    }

    while(last(terrain)[0] <= viewbox[0] + viewbox[2]) {
        // Add more onto end of terrain
        terrain.push({
            0: last(terrain)[0] + Math.random() * 40 + 10,
            1: Math.random() * 400 - 400
        });
    }
}

export function viewTerrain(viewbox, terrain) {
    generateTerrain(viewbox, terrain);

    let i = -1, i0, i1;
    while (terrain[++i][0] < viewbox[0]);
    i0 = i - 1;
    while (terrain[++i][0] < viewbox[0] + viewbox[2]);
    i1 = i + 1;

    return terrain.slice(i0, i1);
}

export function renderTerrain(ctx, viewbox, style, terrain) {
    const visibleTerrain = viewTerrain(viewbox, terrain.data);

    // Complete the polygon
    visibleTerrain.push({
        0: viewbox[0] + viewbox[2],
        1: viewbox[1] + viewbox[3]
    }, {
        0: viewbox[0],
        1: viewbox[1] + viewbox[3]
    });

    drawPath(ctx, visibleTerrain);
    ctx.fillStyle = style.getPropertyValue('--terrain-fill');
    ctx.fill();
}
