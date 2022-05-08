
import { toCartesian, wrap } from '../../fn/module.js';
import { drawPath } from '../../colin/modules/canvas.js';
import { updateValue } from './physics.js';


// Todo get this from game settings somehow
const gravity = 74;


/* Rocket */

export function from(object) {
    return {
        type: 'rocket',

        collide: ['rocket'],

        position: {
            value: [0, -1200],
            velocity: [20, 200],
            drag: 0.0016,
            acceleration: [0, gravity]
        },

        rotation: {
            value: 0,
            velocity: 0,
            acceleration: 0
        },

        fuel: {
            min: 0,
            value: 1,
            velocity: 0
        },

        data: [
            [0, -25],
            [6.5, -21],
            [11, -12],
            [12, -2],
            [10, 10],
            [7, 10],
            [6, 4],
            [2, 4],
            [3, 7],
            [-3, 7],
            [-2, 4],
            [-6, 4],
            [-7, 10],
            [-10, 10],
            [-12, -2],
            [-11, -12],
            [-6.5, -21]
        ],

        /*
        // SpaceX Starship 2nd stage
        data: [
            [0, -250],
            [12, -240],
            [18, -230],
            [25, -210],
            [29, -190],
            [30, -170],
            [25, -170],
            [25, 0],
            [28, 40],
            [30, 80],
            [30, 100],
            [26, 100],
            [26, 98],
            [-26, 98],
            [-26, 100],
            [-30, 100],
            [-30, 80],
            [-28, 40],
            [-25, 0],
            [-25, -170],
            [-30, -170],
            [-29, -190],
            [-25, -210],
            [-18, -230],
            [-12, -240]
        ]
        */
    };
}

export function update(t0, t1, rocket, objects, terrain) {
    if (rocket.touchdown) {
        // Do nothing
        //console.log('TOUCHDOWN')
    }
    else if (rocket.fuel.value > 0 && rocket.thrust) {
        updateValue(rocket.fuel, t1 - t0);

        const acceleration = toCartesian([
            rocket.thrust,
            rocket.rotation.value * 2 * pi
        ]);

        rocket.position.acceleration[0] = acceleration[0];
        rocket.position.acceleration[1] = -acceleration[1];

        let n = Math.floor(-8000 * rocket.fuel.velocity * (t1 - t0));

        while (n--) {
            var rotation = toCartesian([-8, rocket.rotation.value * 2 * pi]);

            objects.push(Vapour.from({
                type: 'vapour',

                created: t0,

                duration: 1 + random() * 0.8,

                position: {
                    value: Float64Array.of(
                        rocket.position.value[0] + rotation[0],
                        rocket.position.value[1] - rotation[1]
                    ),

                    velocity: Float64Array.of(
                        rocket.position.velocity[0] + (-0.8 - random() * 0.6) * rocket.position.acceleration[0],
                        rocket.position.velocity[1] + (-0.8 - random() * 0.6) * rocket.position.acceleration[1]
                    ),

                    drag: 0.05,

                    acceleration: Float64Array.of(
                        0,
                        gravity / 3
                    )
                },

                data: [0, 0, 3]
            }));
        }
    }
    else {
        rocket.position.acceleration[0] = 0;
        rocket.position.acceleration[1] = gravity;
    }

    updateValue(rocket.position, t1 - t0);
    updateValue(rocket.rotation, t1 - t0, wrap(0, 1));

    return rocket;
}


/* Render */

const controls = document.getElementById('controls');

export function render(ctx, viewbox, style, rocket) {
    ctx.save();
    ctx.translate(rocket.position.value[0], rocket.position.value[1]);
    ctx.rotate(rocket.rotation.value * 2 * Math.PI);

    drawPath(ctx, rocket.data);

    ctx.fillStyle = style.getPropertyValue('--rocket-fill');
    ctx.fill();
    ctx.restore();

    controls.style.setProperty('--fuel', rocket.fuel.value);

    // ----------------
    /*if (rocket.shape1) {
        drawPath(ctx, rocket.shape1);
        ctx.fillStyle = 'red';
        ctx.fill();
    }*/
}





/* OLD ------------------- */

export function renderRocket(ctx, viewbox, style, rocket) {
    ctx.save();
    ctx.translate(rocket.position.value[0], rocket.position.value[1]);
    ctx.rotate(rocket.rotation.value * 2 * Math.PI);

    drawPath(ctx, rocket.data);

    ctx.fillStyle = style.getPropertyValue('--rocket-fill');
    ctx.fill();
    ctx.restore();

    controls.style.setProperty('--fuel', rocket.fuel.value);

    // ----------------
    /*if (rocket.shape1) {
        drawPath(ctx, rocket.shape1);
        ctx.fillStyle = 'red';
        ctx.fill();
    }*/
}

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