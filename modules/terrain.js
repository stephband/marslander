
/* Terrain */

import { last } from '../../fn/module.js';
import { drawPath } from './canvas.js';

function generateTerrain(viewbox, points) {
    if (!points.length) {
        // Seed the terrain
        points.push({
            0: 0,
            1: Math.random() * 400 - 400
        });
    }

    while(points[0][0] >= viewbox[0]) {
        // Add more onto beginning of terrain
        points.unshift({
            0: points[0][0] - Math.random() * 40 - 10,
            1: Math.random() * 400 - 400
        });
    }

    while(last(points)[0] <= viewbox[0] + viewbox[2]) {
        // Add more onto end of terrain
        points.push({
            0: last(points)[0] + Math.random() * 40 + 10,
            1: Math.random() * 400 - 400
        });
    }
}

/**
viewTerrain(viewbox, terrain)
Takes a viewbox and some terrain data (as an array of [x,y] points), and
generates new points and filters unused points to return just the points inside
the viewbox plus their immediate neighbours outside.
**/

export function viewTerrain(viewbox, points) {
    generateTerrain(viewbox, points);

    let i = -1, i0, i1;
    while (points[++i][0] < viewbox[0]);
    i0 = i - 1;
    while (points[++i][0] < viewbox[0] + viewbox[2]);
    i1 = i + 1;

    return points.slice(i0, i1);
}

/**
renderTerrain(ctx, viewbox, style, terrain)
Renders terrain data within the viewbox to canvas.
**/

export function renderTerrain(ctx, viewbox, style, terrain) {
    const visibleTerrain = viewTerrain(viewbox, terrain.data);

    // Complete the terrain polygon along the bottom edge of the viewbox
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
