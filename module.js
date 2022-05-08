
/*
Marslander

Marslander is based on the original Marslander that came on the introductory
cassette – yes, cassette – of software for the Acorn Electron.
https://www.everygamegoing.com/landingMachineType/index/machine_folder/electron/thing_type/games/
*/

import clamp       from '../fn/modules/clamp.js';
import gaussian    from '../fn/modules/gaussian.js';
import overload    from '../fn/modules/overload.js';
import noop        from '../fn/modules/noop.js';
import { remove }  from '../fn/modules/remove.js';
import toCartesian from '../fn/modules/to-cartesian.js';
import toPolar     from '../fn/modules/to-polar.js';
import events      from '../dom/modules/events.js';
import toKey       from '../dom/modules/to-key.js';

import { detectStaticLineMovingPoint, detectLinePoint } from '../colin/modules/detection.js';
import Renderer            from '../colin/modules/dom-renderer.js';
import { add, copy, equal, gradient, multiply, subtract } from '../colin/modules/vector.js';

//import * as Camera     from './modules/camera.js';
import Terrain    from './modules/terrain.js';
import Rocket     from './modules/rocket.js';
import Explosion  from './modules/explosion.js';
import { message, stats } from './modules/message.js';

const pi   = Math.PI;
const turn = 2 * Math.PI;
const pow  = Math.pow;
const abs  = Math.abs;
const min  = Math.min;
const max  = Math.max;
const random = Math.random;

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


/* Detect */

function detectTerrainCollision(lines, p1, p2) {
    let n = lines.length - 2;
    let t = Infinity;
    let collision;

    while((n -= 2) > -2) {
        // xs0, ys0, xe0, ye0, xs1, ys1, xe1, ye1, xp0, yp0, xp1, yp1
        const c  = detectStaticLineMovingPoint(
            lines[n], lines[n + 1], lines[n + 2], lines[n + 3],
            p1[0], p1[1],
            p2[0], p2[1]
        );

        if (c && c[0] < t) {
            collision = c;
        }
    }

    return collision;
}

function detectObjectCollision(shape1, shape2, px, py) {
    let n = shape1.length - 1;
    let t = Infinity;
    let collision;

    while(n--) {
        // xs0, ys0, xe0, ye0, xs1, ys1, xe1, ye1, xp0, yp0, xp1, yp1
        //console.log('TODO detectLinePoint');
        const c = detectLinePoint(
            shape1[n][0], shape1[n][1], shape1[n + 1][0], shape1[n + 1][1],
            shape2[n][0], shape2[n][1], shape2[n + 1][0], shape2[n + 1][1],
            px, py,
            px, py
        );

        if (c && c[0] < t) {
            collision = c;
        }
    }

    return collision;
}

function toTypes(objectA, objectB) {
    return objectA.type + '-' + objectB.type;
}

const detect = overload(toTypes, {
    'terrain-rocket': (terrain, rocket, t1, t2, r1, r2) => {
        // If rocket has not moved
        if (t1[0] === t2[0] && t1[1] === t2[1] && t1[2] === t2[2]) {
            return;
        }

        const polarData = rocket.shapePolar.map(toPolar);

        // Rocket centre is 0, 0
        const shape1 = polarData
            .map((p) => subtract([0, r1[2]], p))
            .map(toCartesian)
            .map((c) => add(r1, c));

        const shape2 = polarData
            .map((p) => subtract([0, r2[2]], p))
            .map(toCartesian)
            .map((c) => add(r2, c));

        const xmin = min(r1[0], r2[0]);
        const ymin = min(r1[1], r2[1]);

        // Grab a bit of terrain just larger than point path
        const points = terrain.view([
            xmin,
            ymin,
            max(r1[0], r2[0]) - xmin,
            max(r1[1], r2[1]) - ymin
        ]);

        let n = shape1.length;
        let t = Infinity;
        let collision;

        while (n--) {
            const c = detectTerrainCollision(points, shape1[n], shape2[n]);
            if (c && c[0] < t) {
                t = c[0];
                collision = c;
            }
        }

        n = points.length - 2;

        while (n >= 0) {
            const c = detectObjectCollision(shape1, shape2, points[n], points[n + 1]);

            if (c && c[0] < t) {
                t = c[0];
                collision = c;
            }

            n -= 2;
        }

        return collision;
    },

    'terrain-vapour': function(terrain, vapour, td1, td2, vd1, vd2) {
        // As a cheap optimisation, only look at vapour travelling down the way
        if (vapour.data[1] <= 0) { return; }

        const xmin = min(vd1[0], vd2[0]);
        const ymin = min(vd1[1], vd2[1]);

        // Grab a bit of terrain just larger than point path
        const lines = terrain.view([
            xmin,
            ymin,
            max(vd1[0], vd2[0]) - xmin,
            max(vd1[1], vd2[1]) - ymin
        ]);

        return detectTerrainCollision(lines, vd1, vd2);
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

const collide = overload(toTypes, {
    'terrain-rocket': function(terrain, rocket, t, x, y, dataA, dataB) {
        //renderer.stop();

        // If velocity is high, or if the craft is not upright or the ground is not level
        const g   = abs(dataA[2] - dataA[0] / dataA[3] - dataA[1]);
        const vel = toPolar(rocket.data)[0];

        // Ooooops TODO if point on terrain hits line on rocket
        if (false) {
            remove(objects, rocket);
            objects.push(new Explosion(t, x, y, 0.4 * rocket.data[3], 0.4 * rocket.data[4]));
            message("<p>Ooops, the craft was punctured by a rock</p>", vel, g, rocket.data[2], rocket.fuel);
        }
        else if (vel > maxTouchdownVelocity) {
            remove(objects, rocket);
            objects.push(new Explosion(t, x, y, 0.4 * rocket.data[3], 0.4 * rocket.data[4]));
            if (vel > 120) {
                message("<p>Smacked right into that, you did</p>", vel, g, rocket.data[2], rocket.fuel);
            }
            else {
                message("<p>Came in a little hot, there</p>", vel, g, rocket.data[2], rocket.fuel);
            }
        }
        else if (rocket.data[2] < minTouchdownRotation && rocket.data[2] > maxTouchdownRotation) {
            remove(objects, rocket);
            objects.push(new Explosion(t, x, y, 0.4 * rocket.data[3], 0.4 * rocket.data[4]));
            if (rocket.data[2] < 0.6 * turn && rocket.data[2] > 0.4 * turn) {
                message("<p>You landed upside down</p>", vel, g, rocket.data[2], rocket.fuel);
            }
            if (rocket.data[2] < 0.8 * turn && rocket.data[2] > 0.2 * turn) {
                message("<p>Your craft can't land on it's side</p>", vel, g, rocket.data[2], rocket.fuel);
            }
            else {
                message("<p>Your craft toppled over</p>", vel, g, rocket.data[2], rocket.fuel);
            }
        }
        else if (g > maxTouchdownGradient) {
            remove(objects, rocket);
            objects.push(new Explosion(t, x, y, 0.4 * rocket.data[3], 0.4 * rocket.data[4]));
            message("<p>You need to find flatter ground</p>", vel, g, rocket.data[2], rocket.fuel);
        }
        else {
            rocket.touches = [x, y];
            rocket.data[3] = 0;
            rocket.data[4] = 0;
            rocket.data[5] = 0;
            rocket.data[6] = 0;
            rocket.data[7] = 0;
            rocket.data[8] = 0;

            message("<p>Nice landing, pilot</p>", vel, g, rocket.data[2], rocket.fuel);
        }
    },

    'terrain-vapour': function(terrain, vapour, t, x, y) {
        const velocity = abs(vapour.data[1]);

        //vapour.data[0] = x;
        vapour.data[1] = y - 1;
        //vapour.data[3] = 0;
        vapour.data[4] = -1;
        //vapour.data[6] = 0;
        //vapour.data[7] = -160;*/


        // Shake the camera
        terrain.shake += 0.002 * velocity;
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




/* renderer */
const canvas   = document.getElementById('marslander-canvas');

const environment = {
    canvas:  canvas,
    ctx:     canvas.getContext('2d'),
    style:   getComputedStyle(canvas),
    viewbox: [0, 0, 0, 0]
};

const terrain = new Terrain(0, 700);
const rocket  = new Rocket(0, 0, 0);
const objects = [terrain, rocket];

// environment, update, detect, collide, objects
const renderer = new Renderer(environment, noop, detect, collide, objects, (env) => {
    const { ctx, viewbox } = env;

    // Calculate camera shake
    const d     = clamp(0, 20, gaussian() * terrain.shake);
    const a     = random() * turn;
    const shake = toCartesian([d, a]);

    // Camera tracks rocket
    const cx   = rocket.data[0];
    const cy   = 0.8 * rocket.data[1];

    viewbox[0] = cx - 0.5 * viewbox[2] + shake[0];
    viewbox[1] = cy - 0.5 * viewbox[3] + shake[1];

    ctx.clearRect(0, 0, viewbox[2], viewbox[3]);
    ctx.save();
    ctx.translate(-1 * viewbox[0], -1 * viewbox[1]);
}, (env) => {
    const { ctx, viewbox } = env;
    ctx.restore()
});

function updateCanvas() {
    const { canvas, viewbox } = environment;

    const cx = viewbox[0] + 0.5 * viewbox[2];
    const cy = viewbox[1] + 0.5 * viewbox[3];

    // Update canvas
    const width   = canvas.clientWidth;
    const height  = canvas.clientHeight;
    canvas.width  = width * 2;
    canvas.height = height * 2;

    // Update viewbox
    viewbox[0] = cx - 1 * width;
    viewbox[1] = cy - 1 * height;
    viewbox[2] = width * 2;
    viewbox[3] = height * 2;
}

events('keydown', document)
.each(overload(toKey, {
    'left': function(e) {
        if (rocket.fuel <= 0) {
            return;
        }

        if (rocket.touchdown) {
            return;
        }

        rocket.data[5] = -0.6 * turn;
        e.preventDefault();
    },

    'right': function(e) {
        if (rocket.fuel <= 0) {
            return;
        }

        if (rocket.touchdown) {
            return;
        }

        rocket.data[5] = 0.6 * turn;
        e.preventDefault();
    },

    'space': function(e) {
        if (rocket.fuel <= 0) {
            return;
        }

        if (rocket.touchdown) {
            return;
        }

        rocket.thrust = 600;
        //rocket.fuel. = -0.06;
        e.preventDefault();
    },

    'q': function() {
        renderer.stop();
    },

    default: noop
}));

events('keyup', document)
.each(overload(toKey, {
    'left': function(e) {
        rocket.data[5] = 0;
    },

    'right': function(e) {
        rocket.data[5] = 0;
    },

    'space': function(e) {
        rocket.data[6] = 0;
        rocket.data[7] = gravity;
        rocket.thrust = 0;
        //rocket.fuel = 0;
    },

    default: noop
}));

events('load resize', window)
.each(() => {
    updateCanvas();
    terrain.resize(environment);
});

events('load', window)
.each(() => renderer.start());


