
/*
Marslander

Marslander is based on the original Marslander that came on the introductory
cassette – yes, cassette – of software for the Acorn Electron.
https://www.everygamegoing.com/landingMachineType/index/machine_folder/electron/thing_type/games/
*/


import { overload, noop, toCartesian, toPolar } from '../fn/module.js';
import events from '../dom/modules/events.js';
import toKey from '../dom/modules/to-key.js';

import { detectLinePoint } from '../colin/modules/collision.js';
import { Renderer } from '../colin/modules/renderer.js';
import { add, copy, equal, gradient, multiply, subtract } from '../colin/modules/vector.js';

import * as Camera from './modules/camera.js';
import * as Terrain from './modules/terrain.js';
import * as Rocket from './modules/rocket.js';
import * as Vapour from './modules/vapour.js';
import * as Background from './modules/background.js';
import * as Explosion from './modules/explosion.js';
import { message, stats } from './modules/message.js';

const pi  = Math.PI;
const pow = Math.pow;
const abs = Math.abs;
const min = Math.min;
const max = Math.max;

const viewbox = [0, 0, 1440, 810];

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
const maxTouchdownVelocity = 45;

let scale = 1;



/* Update */

function updateViewbox(viewbox, rocket, duration) {
    // This should be updated after rocket updates, and perhaps only just
    // before render, seeing as it is camera related

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

const update = overload((t0, t1, object) => object.type, {
    rocket:    Rocket.update,
    vapour:    Vapour.update,
    explosion: Explosion.update,
    terrain:   Terrain.update,
    default: (function(ignore) {
        return function(t0, t1, object) {
            if (ignore[object.type]) { return; }
            ignore[object.type] = object.type;
            console.log('No update() for "' + object.type + '"');
        }
    })({})
});


/* Detect */

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

function detectObjectTerrainCollision(terrain, terrain1, rocket0, rocket1) {
    const p0 = rocket0.position.value;
    const r0 = rocket0.rotation.value;
    const p1 = rocket1.position.value;
    const r1 = rocket1.rotation.value;

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
    const points = Terrain.view([
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

const detect = overload((a0, a1, b0, b1) => a0.type + '-' + b0.type, {
    'terrain-rocket': detectObjectTerrainCollision,

    'terrain-vapour': function(terrain, terrain1, vapour, vapour1) {
        // As a cheap optimisation, only look at vapour travelling down the way
        if (vapour.position.velocity[1] <= 0) { return; }

        const xmin = min(p0[0], p1[0]);
        const ymin = min(p0[1], p1[1]);

        // Grab a bit of terrain just larger than point path
        const points = viewTerrain([
            xmin,
            ymin,
            max(p0[0], p1[0]) - xmin,
            max(p0[1], p1[1]) - ymin
        ], terrain.data);

        return detectTerrainCollision(points, p0, p1);
    },

    default: (function(ignore) {
        return function(a0, a1, b0, b1) {
            const type = a0.type + '-' + b0.type;
            if (ignore[type]) { return; }
            ignore[type] = true;
            console.log('No detect() for "' + type + '"');
        }
    })({})
});


/* Collide */

const collide = overload((collision) => collision.objects[0] + '-' + collision.objects[1], {
    'rocket-terrain': function(collision) {
        const rocket = collision.objects.find((object) => object.type === 'rocket');
        collision.velocity = copy(rocket.position.velocity);

        // If velocity is high, or if the craft is not upright or the ground is not level
        const g = abs(gradient(collision.st, collision.et));
        const vel = toPolar(collision.velocity)[0];

        if (collision.objects[0] === rocket) {
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
            message("<p>Ooops, the craft was punctured by a rock</p>", vel, g, rocket.rotation.value, rocket.fuel.value);
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
    },

    'terrain-vapour': function(collision) {
        const terrain = collision.objects[0];
        const vapour  = collision.objects[1];

        // Detect collisions
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
    },

    default: (function(ignore) {
        return function(collision) {
            const type = collision.objects[0] + '-' + collision.objects[1];
            if (ignore[type]) { return; }
            ignore[type] = true;
            console.log('No collide() for "' + type + '"');
        }
    })({})
});


/* Render */

const getObjectType = (ctx, viewbox, style, object) => object.type;

const render = overload(getObjectType, {
    'camera':     Camera.render,
    'rocket':     Rocket.render,
    'terrain':    Terrain.render,
    'vapour':     Vapour.render,
    'explosion':  Explosion.render,
    'background': Background.render,

    default: (function(ignore) {
        return function(ctx, viewbox, style, object) {
            const type = object.type;
            if (ignore[type]) { return; }
            ignore[type] = true;
            console.log('No render() for "' + type + '"');
        }
    })({})
});


/* Scene */

const rocket = Rocket.from({});

Renderer(
    document.getElementById('game-canvas'),
    viewbox,
    update,
    detect,
    collide,
    render,
    viewbox, [{
            type: 'camera',
            data: viewbox,
            collide: false
        }, {
            type: 'background',
            collide: false
        },
        rocket,
        Terrain.from({})
    ]
)
.start();


/* Controls */

events('keydown', document)
.each(overload(toKey, {
    'left': function(e) {
        if (rocket.fuel.value <= 0) {
            return;
        }

        if (rocket.touchdown) {
            return;
        }

        rocket.rotation.velocity = -0.6;
        e.preventDefault();
    },

    'right': function(e) {
        if (rocket.fuel.value <= 0) {
            return;
        }

        if (rocket.touchdown) {
            return;
        }

        rocket.rotation.velocity = 0.6;
        e.preventDefault();
    },

    'space': function(e) {
        if (rocket.fuel.value <= 0) {
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
    'left': function(e) {
        rocket.rotation.velocity = 0;
    },

    'right': function(e) {
        rocket.rotation.velocity = 0;
    },

    'space': function(e) {
        rocket.position.acceleration[0] = 0;
        rocket.position.acceleration[1] = gravity;
        rocket.thrust = 0;
        rocket.fuel.velocity = 0;
    },

    default: noop
}));
