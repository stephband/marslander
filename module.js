
import { overload, noop, remove, toCartesian, toPolar, gaussian, wrap } from '../fn/module.js';
import { events, toKey } from '../dom/module.js';

import { add, copy, equal, gradient, multiply, subtract } from './modules/vector.js';
import { updateValue } from './modules/physics.js';
import { renderTerrain, viewTerrain } from './modules/terrain.js';
import { renderRocket, renderFuel } from './modules/rocket.js';
import { renderBackground } from './modules/background.js';
import { renderGrid } from './modules/grid.js';
import { updateVapour, renderVapour } from './modules/vapour.js';
import { updateExplosion, renderExplosion } from './modules/explosion.js';
import { detectLinePoint } from './modules/collision.js';
import { message, stats } from './modules/message.js';

const random = Math.random;
const pi = Math.PI;
const pow = Math.pow;
const abs = Math.abs;
const min = Math.min;
const max = Math.max;

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

function detectTerrainCollision(points, p0, p1) {
    let n = points.length - 1;
    let t = Infinity;
    let collision;

    while(n--) {
        const ls = points[n];
        const le = points[n + 1];
        const c  = detectLinePoint(ls, le, ls, le, p0, p1);

        if (c && c.t < t) {
            collision = c;
            collision.st = ls;
            collision.et = le;
            collision.s0 = ls;
            collision.e0 = le;
            collision.s1 = ls;
            collision.e1 = le;
            collision.p0 = p0;
            collision.p1 = p1;
        }
    }

    return collision;
}

function detectObjectCollision(shape0, shape1, point) {
    let n = shape0.length - 1;
    let t = Infinity;
    let collision;

    while(n--) {
        const c = detectLinePoint(shape0[n], shape0[n + 1], shape1[n], shape1[n + 1], point, point);

        if (c && c.t < t) {
            collision = c;
            collision.s0 = shape0[n];
            collision.e0 = shape0[n + 1];
            collision.s1 = shape1[n];
            collision.e1 = shape1[n + 1];
            collision.p0 = point;
            collision.p1 = point;
        }
    }

    return collision;
}

function detectObjectTerrainCollision(terrain, rocket, p0, r0) {
    const p1 = rocket.position.value;
    const r1 = rocket.rotation.value;

    if (equal(p1, p0)) {
        return;
    }

    const polarData = rocket.data.map(toPolar);

    // Rocket centre is 0, 0
    const shape0 = polarData
        .map((p) => subtract([0, r0 * 2 * pi], p))
        .map(toCartesian)
        .map((p) => add(p0, p));
    const shape1 = polarData
        .map((p) => subtract([0, r1 * 2 * pi], p))
        .map(toCartesian)
        .map((p) => add(p1, p));

    const xmin = min(p0[0], p1[0]);
    const ymin = min(p0[1], p1[1]);

    // Grab a bit of terrain just larger than point path
    const points = viewTerrain([
        xmin,
        ymin,
        max(p0[0], p1[0]) - xmin,
        max(p0[1], p1[1]) - ymin
    ], terrain.data);

    let n = shape0.length;
    let t = Infinity;
    let collision;

    while (n--) {
        const c = detectTerrainCollision(points, shape0[n], shape1[n]);
        if (c && c.t < t) {
            t = c.t;
            collision = c;
            collision.object1 = terrain;
            collision.object2 = rocket;
        }
    }

    n = points.length;

    while (n--) {
        const c = detectObjectCollision(shape0, shape1, points[n]);

        if (c && c.t < t) {
            t = c.t;
            collision = c;
            collision.object1 = rocket;
            collision.object2 = terrain;
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

            // Detect collision
            if (collision) {
                collision.t0 = t0;
                collision.t1 = t1;
                collision.time = collision.t * (t1 - t0) + t0;
                collision.velocity = copy(rocket.position.velocity);

                // If velocity is high, or if the craft is not upright or the ground is not level
                const g = abs(gradient(collision.st, collision.et));
                const vel = toPolar(collision.velocity)[0];

                console.log('Collision', collision);

                if (collision.object1 === rocket) {
                    remove(objects, rocket);
                    objects.push({
                        type: 'explosion',
                        created: collision.time,
                        duration: 5,
                        position: {
                            value: collision.point.slice(0,2),
                            velocity: multiply(0.4, rocket.position.velocity),
                            acceleration: [0, -180],
                            drag: 0.06
                        }
                    });
                    message("<p>Ooops, the craft was punctured</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                }
                else if (toPolar(collision.velocity)[0] > maxTouchdownVelocity) {
                    remove(objects, rocket);
                    objects.push({
                        type: 'explosion',
                        created: collision.time,
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
                        message("<p>Came in a little hot, there</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
                    }
                }
                else if (rocket.rotation.value < minTouchdownRotation && rocket.rotation.value > maxTouchdownRotation) {
                    remove(objects, rocket);
                    objects.push({
                        type: 'explosion',
                        created: collision.time,
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
                        created: collision.time,
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
                    rocket.position.value        = add(p0, multiply(collision.t, subtract(p0, rocket.position.value)));
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
        const p0 = copy(vapour.position.value);

        updateValue(vapour.position, t1 - t0);
        const p1 = copy(vapour.position.value);

        if (vapour.created < t1 - vapour.duration) {
            remove(objects, vapour);
        }
        // As a cheap optimisation, only look at vapour travelling down the way
        else if (vapour.position.velocity[1] > 0) {
            const xmin = min(p0[0], p1[0]);
            const ymin = min(p0[1], p1[1]);

            // Grab a bit of terrain just larger than point path
            const points = viewTerrain([
                xmin,
                ymin,
                max(p0[0], p1[0]) - xmin,
                max(p0[1], p1[1]) - ymin
            ], terrain.data);

            const collision = detectTerrainCollision(points, p0, p1);

            // Detect collisions
            if (collision) {
                collision.velocity = copy(vapour.position.velocity);
                collision.object1 = terrain;
                collision.object2 = vapour;
                collision.t0      = t0;
                collision.t1      = t1;
                collision.time    = collision.t * (t1 - t0) + t0;

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
            [0, -25],
            [11, -12],
            [12, -2],
            [10, 10],
            [7, 10],
            [6, 4],
            [2, 4],
            [3, 6],
            [-3, 6],
            [-2, 4],
            [-6, 4],
            [-7, 10],
            [-10, 10],
            [-12, -2],
            [-11, -12]
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

        'space': function(e) {
            if (rocket.fuel.value <= 0) {
                stats(null, null, null, 0);
                return;
            }

            if (rocket.touchdown) {
                return;
            }

            rocket.thrust = 600;
            rocket.fuel.velocity = -0.06;

            e.preventDefault();
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

