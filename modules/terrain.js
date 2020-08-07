
/* Terrain */

import { gaussian, last } from '../../fn/module.js';
import { drawPath } from './canvas.js';

export function from() {
    return {
        type: 'terrain',
        collide: ['rocket', 'vapour', 'clouds'],
        data: []
    };
}


function generateTerrain(viewbox, points) {
    if (!points.length) {
        // Seed the terrain
        points.push(Float64Array.of(0, 0));
    }

    while(points[0][0] >= viewbox[0]) {
        // Add more onto beginning of terrain
        points.unshift(Float64Array.of(
            points[0][0] - (gaussian() * 25 + 30),
            points[0][1] + (gaussian() * 100)
        ));
    }

    while(last(points)[0] <= viewbox[0] + viewbox[2]) {
        const l = last(points);

        // Add more onto end of terrain
        points.push(Float64Array.of(
            l[0] + (gaussian() * 25 + 30),
            l[1] + (gaussian() * 100)
        ));
    }
}


/**
view(viewbox, terrain)
Takes a viewbox and some terrain data (as an array of [x,y] points), and
generates new points and filters unused points to return just the points inside
the viewbox plus their immediate neighbours outside.
**/

export function view(viewbox, points) {
    generateTerrain(viewbox, points);

    let i = -1, i0, i1;
    while (points[++i][0] < viewbox[0]);
    i0 = i - 1;
    while (points[++i][0] < viewbox[0] + viewbox[2]);
    i1 = i + 1;

    return points.slice(i0, i1);
}


/**
render(ctx, viewbox, style, terrain)
Renders terrain data within the viewbox to canvas.
**/

export function render(ctx, viewbox, style, terrain) {
    const visibleTerrain = viewTerrain(viewbox, terrain.data);

    // Complete the terrain polygon along the bottom edge of the viewbox
    visibleTerrain.push(Float64Array.of(
        viewbox[0] + viewbox[2],
        viewbox[1] + viewbox[3]
    ), Float64Array.of(
        viewbox[0],
        viewbox[1] + viewbox[3]
    ));

    drawPath(ctx, visibleTerrain);

    const gradient = ctx.createLinearGradient(0, -400, 0, 500);
    const color0 = style.getPropertyValue('--terrain-fill-0');
    const color1 = style.getPropertyValue('--terrain-fill-1');

    // Add three color stops
    gradient.addColorStop(0, color0);
    gradient.addColorStop(1, color1);

    // Set the fill style and draw a rectangle
    ctx.fillStyle = gradient;
    ctx.fill();
}







/* OLD  */

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
    visibleTerrain.push(Float64Array.of(
        viewbox[0] + viewbox[2],
        viewbox[1] + viewbox[3]
    ), Float64Array.of(
        viewbox[0],
        viewbox[1] + viewbox[3]
    ));

    drawPath(ctx, visibleTerrain);

    const gradient = ctx.createLinearGradient(0,-400,0,500);
    const color0 = style.getPropertyValue('--terrain-fill-0');
    const color1 = style.getPropertyValue('--terrain-fill-1');

    // Add three color stops
    gradient.addColorStop(0, color0);
    gradient.addColorStop(1, color1);

    // Set the fill style and draw a rectangle
    ctx.fillStyle = gradient;
    ctx.fill();
}
