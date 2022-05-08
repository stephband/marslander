
import { clamp }       from '../../fn/modules/clamp.js';
import gaussian        from '../../fn/modules/gaussian.js';
import toCartesian     from '../../fn/modules/to-cartesian.js';
import wrap            from '../../fn/modules/wrap.js';
import { drawPolygon } from '../../colin/modules/canvas.js';
import Vapour          from './vapour.js';

const turn   = 2 * Math.PI;
const random = Math.random;

// Todo get this from game settings somehow
const gravity = 74;

const assign = Object.assign;

// SpaceX Starship 2nd stage

const shapeLander = [
    0, -25,
    6.5, -21,
    11, -12,
    12, -2,
    10, 10,
    7, 10,
    6, 4,
    2, 4,
    3, 7,
    -3, 7,
    -2, 4,
    -6, 4,
    -7, 10,
    -10, 10,
    -12, -2,
    -11, -12,
    -6.5, -21
];

const shapeStarship = [
    0, -250,
    12, -240,
    18, -230,
    25, -210,
    29, -190,
    30, -170,
    25, -170,
    25, 0,
    28, 40,
    30, 80,
    30, 100,
    26, 100,
    26, 98,
    -26, 98,
    -26, 100,
    -30, 100,
    -30, 80,
    -28, 40,
    -25, 0,
    -25, -170,
    -30, -170,
    -29, -190,
    -25, -210,
    -18, -230,
    -12, -240,
];

function toChunks(n) {
    if (window.DEBUG && n < 1) {
        throw new Error('Chunk must be length greater than 0');
    }

    return (chunks, value) => {
        let chunk = chunks[chunks.length - 1];

        if (chunk.length === n) {
            chunks.push([value]);
        }
        else {
            chunk.push(value);
        }

        return chunks;
    };
}

/* Rocket */

export default function Rocket(x = 0, y = 0, r = 0, fuel = 40) {
    this.data  = Float64Array.of(x, y, r, 0, 0, 0, 0, 0, 0);
    this.shape = shapeLander;
    this.shapePolar = this.shape.reduce(toChunks(2), [[]]);
    this.fuel  = fuel;
}

assign(Rocket, {
    of: function() {
        return new Rocket();
    },

    from: function(data) {
        return new Rocket(data);
    }
});

assign(Rocket.prototype, {
    type: 'rocket',
    size: 3,
    collide: ['rocket'],

    update: function(t1, t2, environment, objects) {
        const data = this.data;

        if (this.touches) {
            // Do nothing
            //console.log('TOUCHDOWN')
        }
        else if (this.fuel > 0 && this.thrust) {
            this.fuel = clamp(0, Infinity, this.fuel - (t2 - t1));
            const acceleration = toCartesian([this.thrust, 0.04 * gaussian() + data[2]]);
            data[6] = acceleration[0];
            data[7] = -acceleration[1];

            let n = 2;//Math.floor(-8000 * rocket.fuel * (t2 - t1));

            while (n--) {
                var rotation = toCartesian([-8, data[2]]);
                objects.push(new Vapour(
                    // time
                    t2,
                    // x, y, r
                    data[0] + rotation[0],
                    data[1] - rotation[1],
                    14,
                    // vx, vy, vr
                    data[3] + (-0.8 - random() * 0.6) * data[6],
                    data[4] + (-0.8 - random() * 0.6) * data[7]
                ));
            }
        }
        else {
            data[6] = 0;
            data[7] = gravity;
        }
    },

    render: function render(environment) {
        const rocket  = this;
        const { ctx, style } = environment;

        ctx.save();
        ctx.translate(rocket.data[0], rocket.data[1]);
        ctx.rotate(rocket.data[2]);

        drawPolygon(ctx, rocket.shape);

        ctx.fillStyle = style.getPropertyValue('--rocket-fill');
        ctx.fill();
        ctx.restore();

        //controls.style.setProperty('--fuel', rocket.fuel.value);

        // ----------------
        /*if (rocket.shape1) {
            drawPath(ctx, rocket.shape1);
            ctx.fillStyle = 'red';
            ctx.fill();
        }*/
    }
});
