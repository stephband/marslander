
/*
Marslander

Marslander is based on the original Marslander that came on the introductory
cassette – yes, cassette – of software for the Acorn Electron.
https://www.everygamegoing.com/landingMachineType/index/machine_folder/electron/thing_type/games/
*/

import { get, overload, deep, noop, toPolar } from '../fn/module.js';
import * as Grid from './modules/grid.js';
import { detectLinePoint, detectCircleCircle, detectBoxCircle } from './modules/collision.js';
import * as Box from './modules/box.js';
import * as Ball from './modules/ball.js';

const DEBUG = true;
const A = Array.prototype;
const canvas  = document.getElementById('game-canvas');
canvas.width  = 720;
canvas.height = 405;
const ctx     = canvas.getContext('2d');
const style   = getComputedStyle(canvas);

const getObjectType = (ctx, viewbox, style, object) => object.type;

function toTypes(objectA0, objectA1, objectB0, objectB1) {
    return objectA0.type + ' ' + objectB0.type;
}

const detectCollision = overload(toTypes, {
    'ball ball': function(objectA0, objectA1, objectB0, objectB1) {
        // Transform objects
        const a0 = Float64Array.of(
            objectA0.data[0] + objectA0.position.value[0],
            objectA0.data[1] + objectA0.position.value[1],
            objectA0.data[2]
        );

        const a1 = Float64Array.of(
            objectA0.data[0] + objectA1.position.value[0],
            objectA0.data[1] + objectA1.position.value[1],
            objectA0.data[2]
        );

        const b0 = Float64Array.of(
            objectB0.data[0] + objectB0.position.value[0],
            objectB0.data[1] + objectB0.position.value[1],
            objectB0.data[2]
        );

        const b1 = Float64Array.of(
            objectB0.data[0] + objectB1.position.value[0],
            objectB0.data[1] + objectB1.position.value[1],
            objectB0.data[2]
        );

        return detectCircleCircle(a0, a0[2], a1, a1[2], b0, b0[2], b1, b1[2]);
    },

    'box ball': function(objectA0, objectA1, objectB0, objectB1) {
        const a0 = objectA0.data;

        const b0 = Float64Array.of(
            objectB0.data[0] + objectB0.position.value[0],
            objectB0.data[1] + objectB0.position.value[1],
            objectB0.data[2]
        );

        const b1 = Float64Array.of(
            objectB0.data[0] + objectB1.position.value[0],
            objectB0.data[1] + objectB1.position.value[1],
            objectB0.data[2]
        );

        return detectBoxCircle(a0, b0, b0[2], b1, b1[2]);
    },

    'ball box': function(objectA0, objectA1, objectB0, objectB1) {
        const b0 = objectB0.data;

        const a0 = Float64Array.of(
            objectA0.data[0] + objectA0.position.value[0],
            objectA0.data[1] + objectA0.position.value[1],
            objectA0.data[2]
        );

        const a1 = Float64Array.of(
            objectA0.data[0] + objectA1.position.value[0],
            objectA0.data[1] + objectA1.position.value[1],
            objectA0.data[2]
        );

        return detectBoxCircle(b0, a0, a0[2], a1, a1[2]);
    }
});

function collideBoxBall(collision, box, ball) {
    console.log('Colin: box - ball collision');

    const point = collision.point;
    const data = box.data;

    // A perfectly elastic collision, for now
    if (point[0] === data[0] || point[0] === data[0] + data[2]) {
        ball.position.velocity[0] *= -1;
    }
    else {
        ball.position.velocity[1] *= -1;
    }
}

const collide = overload((collision) => collision.objects.map(get('type')).join(' '), {
    'ball ball': function(collision) {
        console.log('Colin: ball - ball collision');
    },

    'box ball': (collision) => collideBoxBall(collision, collision.objects[0], collision.objects[1]),
    'ball box': (collision) => collideBoxBall(collision, collision.objects[1], collision.objects[0])
});

const updateObject = overload((t0, t1, object) => object.type, {
    'ball': Ball.update,
    'box': Box.update,
    default: noop
});

function update(ctx, viewbox, camera, objects, collisions, t0, t1) {
    let t = t0;

    const objects1 = [];

    function copy(object, i) {
        objects1[i] = deep(objects1[i] || {}, updateObject(t, t1, object));
    }

    function update(object) {
        deep(object, updateObject(t0, t, object));
    }

    while (t < t1) {
        objects.forEach(copy);

        let collision;
        let i = objects.length;

        while (--i) {
            const objectA0 = objects[i];
            const objectA1 = objects1[i];

            let j = i;

            while (j--) {
                const objectB0 = objects[j];
                const objectB1 = objects1[j];

                if (objectA0.collisions && objectA0.collisions.find(function(collision) {
                    const objects = collision.objects;
                    let n = -1;
                    while (objects[++n]) {
                        if (objects[n] === objectA0) {
                            return true;
                        }
                    }
                })) {
                    continue;
                }

                const c = detectCollision(objectA0, objectA1, objectB0, objectB1);

                if (c) {
                    c.objects = [objectA0, objectB0];
                }

                collision = collision ?
                    c && c.t < collision.t ? c :
                    collision :
                c ;
            }
        }

        if (collision) {
            t0 = t;
            t = collision.time = collision.t * (t1 - t) + t;
            let n = -1;
            while (collision.objects[++n]) {
                const object = collision.objects[n];
                object.collisions = object.collisions || [];
                object.collisions.push(collision);
            }

            collisions.push(collision);
            objects.forEach(update);
            collide(collision);
        }
        else {
            t = t1;
            deep(objects, objects1);
        }
    }

    return objects;
}

const renderObject = overload(getObjectType, {
    'ball': Ball.render,
    'box':  Box.render,
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
    const viewbox = [0, 0, canvas.width, canvas.height];

    const camera = {
        type: 'camera',
        data: viewbox
    };

    const updates = [
        Box.create(viewbox[0] + 20, viewbox[1] + 20, viewbox[2] - 40, viewbox[3] - 40),
        Ball.create(10, 80, 80, Math.random() * 200, Math.random() * 200),
        Ball.create(30, 40, 40, Math.random() * 200, Math.random() * 200),
        Ball.create(20, 130, 130, Math.random() * 200, Math.random() * 200),
        Ball.create(70, 180, 180, Math.random() * 200, Math.random() * 200),
        Ball.create(40, 130, 130, Math.random() * 200, Math.random() * 200),
        Ball.create(70, 180, 180, Math.random() * 200, Math.random() * 200),
        Ball.create(20, 130, 130, Math.random() * 200, Math.random() * 200),
        Ball.create(30, 180, 180, Math.random() * 200, Math.random() * 200),
        Ball.create(80, 130, 130, Math.random() * 200, Math.random() * 200),
        Ball.create(40, 180, 180, Math.random() * 200, Math.random() * 200),
        Ball.create(50, 130, 130, Math.random() * 200, Math.random() * 200),
        Ball.create(60, 180, 180, Math.random() * 200, Math.random() * 200)
    ];

    const collisions = [];
    const renders = [].concat(updates);

    let t0 = 0;

    function frame(time) {
        const t1 = time / 1000;
        collisions.length = 0;

        //if (DEBUG) { console.group('frame', t1); }
        update(ctx, viewbox, camera, updates, collisions, t0, t1);
        render(ctx, viewbox, camera, renders, t0, t1);
        //if (DEBUG) { console.groupEnd(); }

        // Because we are only clearing collisions at the end of the frame we
        // are preventing multiple collisions between the same bodies within
        // the frame... todo: we need a better way of ignoring duplicate
        // collisions... or not producing duplicates in the first place
        updates.forEach(function(object) {
            if (object.collisions) {
                object.collisions.length = 0;
            }
        });

        // Cue up next frame
        t0 = time / 1000;
        requestAnimationFrame(frame);
    }

    frame(t0);
}


start();

