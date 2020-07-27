
import { overload, noop, remove, toCartesian, toPolar, gaussian, wrap } from '../fn/module.js';
import { events, toKey } from '../dom/module.js';

import { add, copy, gradient, multiply, subtract } from './modules/vector.js';
import { updateValue } from './modules/physics.js';
import { renderTerrain, viewTerrain } from './modules/terrain.js';
import { renderRocket, renderFuel } from './modules/rocket.js';
import { renderBackground } from './modules/background.js';
import { renderGrid } from './modules/grid.js';
import { updateVapour, renderVapour } from './modules/vapour.js';
import { updateExplosion, renderExplosion } from './modules/explosion.js';
import { detectLine } from './modules/collision.js';
import { message, stats } from './modules/message.js';

const random = Math.random;
const pi = Math.PI;
const pow = Math.pow;
const abs = Math.abs;

const canvas  = document.getElementById('game-canvas');
canvas.width  = 1600;
canvas.height = 900;
const ctx     = canvas.getContext('2d');
const style   = getComputedStyle(canvas);

// Actual gravity on mars is 3.7m/s2. We have an arbitrary scale of
// 1m = 5px, so true gravity should be 3.7 * 5 = 18.5. The game is
// more fun with a bit more gravity, though... effectively we can run
// at 4x rate of time 4 * 18.5 =
const gravity = 74;

// The speed of sound on mars is 240m/s, or 1200 px/s
// 4 * 1200 = 4800
const mach = 4800;

const maxTouchdownGradient = 0.18;
const minTouchdownRotation = 0.95;
const maxTouchdownRotation = 0.05;
const maxTouchdownVelocity = 40;

let scale = 1;

function updateViewbox(viewbox, rocket, duration) {
    const speed = toPolar(rocket.position.velocity)[0];
    const targetScale = 1 + speed * 0.0004;

    // Track targetScale smoothly
    scale += 0.75 * duration * (targetScale - scale);

    // Update viewbox
    viewbox[2] = 1600 * scale;
    viewbox[3] = 900 * scale;
    viewbox[0] = rocket.position.value[0] - 0.5 * viewbox[2];
    viewbox[1] = rocket.position.value[1] - 0.5 * viewbox[3];

    return viewbox;
}

const getObjectType = (ctx, viewbox, style, object) => object.type;

function detectTerrainCollision(terrain, p0, p1) {
    const xmin = Math.min(p0[0], p1[0]);
    const ymin = Math.min(p0[1], p1[1]);

    // Grab a bit of terrain just larger than point path
    const points = viewTerrain([
        xmin,
        ymin,
        Math.max(p0[0], p1[0]) - xmin,
        Math.max(p0[1], p1[1]) - ymin
    ], terrain.data);

    let n = points.length - 1;
    let t = Infinity;
    let collision;

    while(n--) {
        const ls = points[n];
        const le = points[n + 1];
        const c = detectLine(ls, le, p0, p1);

        if (c && c.time < t) {
            collision = c;
            collision.body = terrain;
        }
    }

    return collision;
}

function detectObjectTerrainCollision(terrain, rocket, p0, r0) {
    if (rocket.position.value[0] === p0[0] && rocket.position.value[1] === p0[1]) {
        return;
    }

    const polarData = rocket.data.map(toPolar);

    // Rocket centre is 0, 0
    const shape0 = polarData
        .map((p) => subtract([0, r0 * 2 * pi], p))
        .map(toCartesian)
        .map((p) => add(p0, p));
    const shape1 = polarData
        .map((p) => subtract([0, rocket.rotation.value * 2 * pi], p))
        .map(toCartesian)
        .map((p) => add(rocket.position.value, p));

    // For quick check rendering
    //rocket.shape1 = shape1;

    let n = shape0.length;
    let t = Infinity;
    let collision;

    while (n--) {
        const c = detectTerrainCollision(terrain, shape0[n], shape1[n]);
        if (c && c.time < t) {
            t = c.time;
            collision = c;
        }
    }

    return collision;
}


const updateObject = overload((viewbox, object) => object.type, {
    'rocket': function(terrainbox, rocket, t0, t1, objects, terrain, collisions) {
        const p0 = copy(rocket.position.value);
        const r0 = rocket.rotation.value;

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

                objects.push({
                    type: 'vapour',

                    created: t0,

                    duration: 1 + random() * 0.8,

                    position: {
                        value: [
                            rocket.position.value[0] + rotation[0],
                            rocket.position.value[1] - rotation[1]
                        ],

                        velocity: [
                            rocket.position.velocity[0] + (-0.8 - random() * 0.6) * rocket.position.acceleration[0],
                            rocket.position.velocity[1] + (-0.8 - random() * 0.6) * rocket.position.acceleration[1]
                        ],

                        drag: 0.05,

                        acceleration: [
                            0,
                            gravity / 3
                        ]
                    },

                    data: [0, 0, 3]
                });
            }
        }
        else {
            rocket.position.acceleration[0] = 0;
            rocket.position.acceleration[1] = gravity;
        }

        updateValue(rocket.position, t1 - t0);
        updateValue(rocket.rotation, t1 - t0, wrap(0, 1));

        // If the rocket is moving
        if (rocket.position.velocity[0] + rocket.position.velocity[1]) {
            const collision = detectObjectTerrainCollision(terrain, rocket, p0, r0);

            // Detect collisions
            if (collision) {
                collision.object   = rocket;
                collision.velocity = copy(rocket.position.velocity);

                // If velocity is high, or if the craft is not upright or the ground is not level
                const ls = collision.surface[0];
                const le = collision.surface[1];
                const l = subtract(ls, le);
                const g = abs(gradient(l));
                const vel = toPolar(collision.velocity)[0];

                if (toPolar(collision.velocity)[0] > maxTouchdownVelocity) {
                    remove(objects, rocket);
                    objects.push({
                        type: 'explosion',
                        created: t0 + collision.time * (t1 - t0),
                        duration: 5,
                        position: {
                            value: collision.point.slice(0,2),
                            velocity: multiply(0.4, rocket.position.velocity),
                            acceleration: [0, -180],
                            drag: 0.06
                        }
                    });

                    if (vel > 120) {
                        message("<p>Smacked right into that, you did</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                    }
                    else {
                        message("<p>Going a bit too fast, you were</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                    }
                }
                else if (rocket.rotation.value < minTouchdownRotation && rocket.rotation.value > maxTouchdownRotation) {
                    remove(objects, rocket);
                    objects.push({
                        type: 'explosion',
                        created: t0 + collision.time * (t1 - t0),
                        duration: 5,
                        position: {
                            value: collision.point.slice(0,2),
                            velocity: multiply(0.4, rocket.position.velocity),
                            acceleration: [0, -180],
                            drag: 0.06
                        }
                    });

                    if (rocket.rotation.value < 0.6 && rocket.rotation.value > 0.4) {
                        message("<p>You landed upside down</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                    }
                    if (rocket.rotation.value < 0.8 && rocket.rotation.value > 0.2) {
                        message("<p>Your craft can't land on it's side</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                    }
                    else {
                        message("<p>Your craft toppled over</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                    }
                }
                else if (g > maxTouchdownGradient) {
                    remove(objects, rocket);
                    objects.push({
                        type: 'explosion',
                        created: t0 + collision.time * (t1 - t0),
                        duration: 5,
                        position: {
                            value: collision.point.slice(0,2),
                            velocity: multiply(0.4, rocket.position.velocity),
                            acceleration: [0, -180],
                            drag: 0.06
                        }
                    });

                    message("<p>You need to find flatter ground</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                }
                else {
                    rocket.touchdown             = collision;
                    rocket.position.value        = add(p0, multiply(collision.time, subtract(p0, rocket.position.value)));
                    rocket.position.velocity     = [0, 0];
                    rocket.position.acceleration = [0, 0];

                    message("<p>Nice landing, pilot</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                }

                collisions.push(collision);
            }
        }

        updateViewbox(terrainbox, rocket, t1 - t0);
    },

    'vapour': function updateVapour(terrainbox, vapour, t0, t1, objects, terrain, collisions) {
        const p0 = {
            0: vapour.position.value[0],
            1: vapour.position.value[1]
        };

        updateValue(vapour.position, t1 - t0);

        if (vapour.created < t1 - vapour.duration) {
            remove(objects, vapour);
        }
        // As a cheap optimisation, only look at vapour travelling down the way
        else if (vapour.position.velocity[1] > 0) {
            let collision = detectTerrainCollision(terrain, p0, vapour.position.value);

            // Detect collisions
            if (collision) {
                collision.object = vapour;
                collision.velocity = copy(vapour.position.velocity);

                vapour.position.value[0] = collision.point[0];
                vapour.position.value[1] = collision.point[1];
                vapour.position.velocity[0] = 0;
                vapour.position.velocity[1] = 1;
                vapour.position.acceleration[0] = 0;
                vapour.position.acceleration[1] = -160;

                collisions.push(collision);
            }
        }
    },

    'explosion': updateExplosion
});

function update(ctx, viewbox, terrainbox, objects, t0, t1, terrain, collisions) {
    objects.forEach((object) => updateObject(terrainbox, object, t0, t1, objects, terrain, collisions));
}

const renderObject = overload(getObjectType, {
    'rocket': renderRocket,
    'terrain': renderTerrain,
    'grid': renderGrid,
    'vapour': renderVapour,
    'explosion': renderExplosion,
    'background': renderBackground
});

function render(ctx, viewbox, terrainbox, objects, t0, t1) {
    ctx.clearRect.apply(ctx, viewbox);

    const scale = viewbox[2] / terrainbox[2];

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-terrainbox[0], -terrainbox[1]);

    objects.forEach((object) => renderObject(ctx, terrainbox, style, object, t0, t1));

    ctx.restore();
}

function start() {
    const collisions = [];
    const viewbox    = [0, 0, canvas.width, canvas.height];
    const terrainbox = [0, 0, canvas.width, canvas.height];

    const camera = {
        type: 'camera',
        data: terrainbox
    };

    const rocket = {
        type: 'rocket',

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
            [0, -15],
            [10, 10],
            [-10, 10]
        ]
    };

    const background = {
        type: 'background'
    };

    const terrain = {
        type: 'terrain',
        data: []
    };

    const updates = [rocket];
    const renders = [background, terrain];

    let t0 = 0;

    function frame(time) {
        const t1 = time / 1000;

        collisions.length = 0;
        update(ctx, viewbox, terrainbox, updates, t0, t1, terrain, collisions);

        // Shake the camera when collisions hit the ground
        const terrainCollisions = collisions.filter((collision) => collision.body === terrain);

        // Camera shake
        if (terrainCollisions.length) {
            const sumVelocity = terrainCollisions.reduce((total, collision) => {
                return total + collision.velocity[1];
            }, 0);

            const d = gaussian() * sumVelocity * 0.0016;
            const a = random() * 2 * pi;
            const shakeVector = toCartesian([d, a]);

            terrainbox[0] += shakeVector[0];
            terrainbox[1] += shakeVector[1];
        }

        render(ctx, viewbox, terrainbox, renders.concat(updates), t0, t1);
        renderFuel(ctx, [1200, 800, 300, 40], style, rocket);

        // Cue up next frame
        t0 = time / 1000;
        requestAnimationFrame(frame);
    }

    frame(t0);

    events('keydown', document)
    .each(overload(toKey, {
        'left': function() {
            if (rocket.fuel.value <= 0) {
                stats(null, null, null, 0);
                return;
            }

            if (rocket.touchdown) {
                return;
            }

            rocket.rotation.velocity = -0.6;
        },

        'right': function() {
            if (rocket.fuel.value <= 0) {
                stats(null, null, null, 0);
                return;
            }

            if (rocket.touchdown) {
                return;
            }

            rocket.rotation.velocity = 0.6;
        },

        'space': function() {
            if (rocket.fuel.value <= 0) {
                stats(null, null, null, 0);
                return;
            }

            if (rocket.touchdown) {
                return;
            }

            rocket.thrust = 600;
            rocket.fuel.velocity = -0.06;
        },

        default: noop
    }));

    events('keyup', document)
    .each(overload(toKey, {
        'left': function() {
            rocket.rotation.velocity = 0;
        },

        'right': function() {
            rocket.rotation.velocity = 0;
        },

        'space': function() {
            rocket.position.acceleration[0] = 0;
            rocket.position.acceleration[1] = gravity;
            rocket.thrust = 0;
            rocket.fuel.velocity = 0;
        },

        default: noop
    }));
}



start();
