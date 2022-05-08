
/* Terrain */

import gaussian from '../../fn/modules/gaussian.js';
import last     from '../../fn/modules/last.js';
import { drawPolygon } from '../../colin/modules/canvas.js';



const assign = Object.assign;


/* Terrain */

export default function Terrain(x = 0, y = 0) {
    this.data  = [0, 0, 0, 0, 0, 0];
    this.shape = [x, y];
    this.shake = 0;
}

assign(Terrain, {
    of: function() {
        return new Terrain(arguments);
    },

    from: function(data) {
        return new Terrain(data);
    }
});

assign(Terrain.prototype, {
    type: 'terrain',
    size: 2,
    collide: ['rocket', 'vapour', 'clouds'],

    resize: function(environment) {
        const { ctx, viewbox, style } = environment;

        this.gradient = ctx.createLinearGradient(0, viewbox[1], 0, viewbox[1] + viewbox[3]);
        const color0 = style.getPropertyValue('--terrain-fill-0');
        const color1 = style.getPropertyValue('--terrain-fill-1');

        // Add three color stops
        this.gradient.addColorStop(0, color0);
        this.gradient.addColorStop(1, color1);
    },

    update: function(t1, t2) {
        // Decay shake to 0
        this.shake = this.shake * 0.0003 * (t2 - t1);
    },

    render: function(environment) {
        const { ctx, viewbox, style } = environment;
        const visibleTerrain = view(viewbox, this.shape);

        // Complete the terrain polygon along the bottom edge of the viewbox
        visibleTerrain.push(
            viewbox[0] + viewbox[2],
            viewbox[1] + viewbox[3],
            viewbox[0],
            viewbox[1] + viewbox[3]
        );

        drawPolygon(ctx, visibleTerrain);

        // Set the fill style and draw a rectangle
        ctx.fillStyle = this.gradient;
        ctx.fill();
    },

    view: function(viewbox) {
        return view(viewbox, this.shape);
    }
});




function generateTerrain(viewbox, shape) {
    while(shape[0] >= viewbox[0]) {
        const fx = shape[0];
        const fy = shape[1];

        // Add more onto beginning of terrain
        shape.unshift(
            fx - (gaussian() * 25 + 30),
            fy + (gaussian() * 100)
        );
    }

    while(shape[shape.length - 2] <= viewbox[0] + viewbox[2]) {
        const lx = shape[shape.length - 2];
        const ly = shape[shape.length - 1];

        // Add more onto end of terrain
        shape.push(
            lx + (gaussian() * 25 + 30),
            ly + (gaussian() * 100)
        );
    }
}


/**
view(viewbox, terrain)
Takes a viewbox and some terrain data (as an array of [x,y] shape), and
generates new shape and filters unused shape to return just the shape inside
the viewbox plus their immediate neighbours outside.
**/

function view(viewbox, shape) {
    generateTerrain(viewbox, shape);

    let i = -2, i0, i1;
    while (shape[(i += 2)] < viewbox[0]);
    i0 = i - 2;
    while (shape[(i += 2)] < viewbox[0] + viewbox[2]);
    i1 = i + 2;

    return shape.slice(i0, i1);
}

