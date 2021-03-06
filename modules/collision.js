
import { equal, gradient } from './vector.js';

const pow = Math.pow;
const min = Math.min;
const max = Math.max;

function min0To1(a, b) {
    // And are they at times between 0 - 1?
    return a >= 0 && a < 1 ?
        b >= 0 && b < 1 ?
            min(a, b) :
            a :
        b >= 0 && b < 1 ?
            b :
            undefined ;
}


function isPointInLine(s, e, p) {
    const g = gradient(s, e);

    // Return true where point is inside line bounds and p is
    // the same gradient from s as e is...
    return ((g > -1 && g < 1) ?
        p[0] >= min(s[0], e[0]) && p[0] <= max(s[0], e[0]) :
        p[1] >= min(s[1], e[1]) && p[1] <= max(s[1], e[1]))
    && g === gradient(s, p) ;
}

function timeAtOverlap(ys, ye, yp0, yp1) {
    // Is it starting off intersecting?
    if (yp0 > min(ys, ye) && yp0 < max(ys, ye)) {
        return 0;
    }

    // Check if it hits the start or the end of the line
    // yp1 = yp0 should have alrready been checked in a parent fn
    const ts = (ys - yp0) / (yp1 - yp0);
    const te = (ye - yp0) / (yp1 - yp0);

    // t is the min of ts and te within 0 - 1
    return min0To1(ts, te);
}

function timeAtMovingOverlap(xs0, ys0, xe0, ye0, xs1, ys1, xe1, ye1, xp0, yp0, xp1, yp1) {
    // Is it starting off intersecting?
    const xmin = min(xs0, xe0);
    const ymin = min(ys0, ye0);
    const xmax = max(xs0, xe0);
    const ymax = max(ys0, ye0);

    if (xmax - xmin > ymax - ymin ?
        xp0 > xmin && xp0 < xmax :
        yp0 > ymin && yp0 < ymax) {
        return 0;
    }

    // So when does it hit the start and end?
    const g = (yp1 - yp0) / (xp1 - xp0) ;

    const ts = (g > -1 && g < 1) ?
        (xs0 - xp0) / (xp1 - xp0 - xs1 + xs0) :
        (ys0 - yp0) / (yp1 - yp0 - ys1 + ys0) ;

    const te = (g > -1 && g < 1) ?
        (xe0 - xp0) / (xp1 - xp0 - xe1 + xe0) :
        (ye0 - yp0) / (yp1 - yp0 - ye1 + ye0) ;

    // And are they at times between 0 - 1?
    return min0To1(ts, te);
}

function detectMovingLineOverlap(xs0, ys0, xe0, ye0, xs1, ys1, xe1, ye1, xp0, yp0, xp1, yp1) {
    // Is it starting off intersecting?
    const t = timeAtMovingOverlap(xs0, ys0, xe0, ye0, xs1, ys1, xe1, ye1, xp0, yp0, xp1, yp1);

    // No intersect?
    if (t === undefined) { return; }

    return {
        t: t,
        point: Float64Array.of(
            t * (xp1 - xp0) + xp0,
            t * (yp1 - yp0) + yp0
        )
    };
}

function detectLineOverlap(xs, ys, xe, ye, xp0, yp0, xp1, yp1, g) {
    const t = (g > -1 && g < 1) ?
        timeAtOverlap(xs, xe, xp0, xp1) :
        timeAtOverlap(ys, ye, yp0, yp1) ;

    // No intersect?
    if (t === undefined) { return; }

    return {
        //fn: detectLineOverlap,
        //args: arguments,
        t: t,
        point: Float64Array.of(t * (xp1 - xp0) + xp0, t * (yp1 - yp0) + yp0)
    };
}

function detectXLine(x, ys, ye, xp0, yp0, xp1, yp1) {
    // It has at least some horizontal movement
    const t = (x - xp0) / (xp1 - xp0) ;

    // Intersect outside time window?
    if (t < 0 || t >= 1) {
        return;
    }

    const xpt = x;
    const ypt = t * (yp1 - yp0) + yp0;

    // Intersect outside line ends?
    return (ypt >= min(ys, ye) && ypt <= max(ys, ye)) ? {
            //fn: detectXLine,
            //args: arguments,
            t: t,
            point: Float64Array.of(xpt, ypt)
        } :
    undefined ;
}

function detectYLine(y, xs, xe, xp0, yp0, xp1, yp1) {
    // It has at least some vertical movement
    const t = (y - yp0) / (yp1 - yp0) ;

    // Intersect outside time window?
    if (t < 0 || t >= 1) {
        return;
    }

    const xpt = t * (xp1 - xp0) + xp0;
    const ypt = y;

    // Intersect outside line ends?
    return (xpt >= min(xs, xe) && xpt <= max(xs, xe)) ? {
            //fn: detectXLine,
            //args: arguments,
            t: t,
            point: Float64Array.of(xpt, ypt)
        } :
    undefined ;
}

function detectLine(xs, ys, xe, ye, xp0, yp0, xp1, yp1, g) {
    const t = (ys - yp0 + g * (xp0 - xs)) / (yp1 - yp0 + g * (xp0 - xp1));

    // Intersect outside time window?
    if (t < 0 || t >= 1) {
        return;
    }

    const xpt = t * (xp1 - xp0) + xp0;
    const ypt = t * (yp1 - yp0) + yp0;

    // Intersect outside line ends?
    if((g > -1 && g < 1) ?
        (xpt < min(xs, xe) || xpt > max(xs, xe)) :
        (ypt < min(ys, ye) || ypt > max(ys, ye))) {
        return;
    }

    return {
        //fn:    detectLine,
        //args:  arguments,
        t:  t,
        point: Float64Array.of(xpt, ypt)
    };
}

export function detectStaticLineMovingPoint(s, e, p0, p1) {
    const g  = gradient(s, e);
    const gp = gradient(p0, p1);
    const xs  = s[0];
    const ys  = s[1];
    const xe  = e[0];
    const ye  = e[1];
    const xp0 = p0[0];
    const yp0 = p0[1];
    const xp1 = p1[0];
    const yp1 = p1[1];

    // Are line and trajectory parallel?
    return g === gp ?
        // Are line and trajectory overlapping?
        g === gradient(s, p1) ?
            detectLineOverlap(xs, ys, xe, ye, xp0, yp0, xp1, yp1, g) :
        undefined :
    // Line is vertical
    g === Infinity ? detectXLine(xs, ys, ye, xp0, yp0, xp1, yp1) :
    // Line is horizontal
    g === 0 ? detectYLine(ys, xs, xe, xp0, yp0, xp1, yp1) :
    // Line is angled
    detectLine(xs, ys, xe, ye, xp0, yp0, xp1, yp1, g) ;
}

export function detectMovingLineMovingPoint(s0, e0, s1, e1, p0, p1) {
    const xs0 = s0[0];
    const ys0 = s0[1];
    const xe0 = e0[0];
    const ye0 = e0[1];
    const xs1 = s1[0];
    const ys1 = s1[1];
    const xe1 = e1[0];
    const ye1 = e1[1];
    const xp0 = p0[0];
    const yp0 = p0[1];
    const xp1 = p1[0];
    const yp1 = p1[1];

    const xa = xp1 - xp0 - xs1 + xs0;
    const ya = yp1 - yp0 - ys1 + ys0;
    const xb = xe1 - xe0 - xs1 + xs0;
    const yb = ye1 - ye0 - ys1 + ys0;

    const xps = xp0 - xs0;
    const yps = yp0 - ys0;
    const xes = xe0 - xs0;
    const yes = ye0 - ys0;

    // Quadratic around time at2 + bt + c = 0
    const a = ya * xb - yb * xa;
    const b = ya * xes + xb * yps - xa * yes - yb * xps;
    const c = yps * xes - xps * yes;

    //console.log('detectMovingLineMovingPoint', a, b, c);

    let t;

    // If a is 0 this is not a quadratic, it's just t = -c / b
    if (a === 0) {
        // If b is also 0 we have a problem. I think this means that p
        // is travelling parallel to the line.
        if (b === 0) {
            // And if c is 0 it is on the line
            if (c === 0) {
                return detectMovingLineOverlap(xs0, ys0, xe0, ye0, xs1, ys1, xe1, ye1, xp0, yp0, xp1, yp1);
            }

            undefined;
            //throw new Error('Fix this');
        }
        else {
            const ta = -c / b;
            t = ta >= 0 && ta < 1 ?
                ta :
                undefined;
        }
    }
    else {
        const root = pow(b * b - 4 * a * c, 0.5);
        const ta = (-b + root) / (2 * a);
        const tb = (-b - root) / (2 * a);

        t = (ta >= 0 && ta < 1) ?
            (tb >= 0 && tb < 1) ? min(ta, tb) :
            ta :
        (tb >= 0 && tb < 1) ? tb :
        undefined ;

        if (t === undefined) {
            return;
        }
    }

    const xpt = t * (xp1 - xp0) + xp0;
    const ypt = t * (yp1 - yp0) + yp0;
    const xst = t * (xs1 - xs0) + xs0;
    const yst = t * (ys1 - ys0) + ys0;
    const xet = t * (xe1 - xe0) + xe0;
    const yet = t * (ye1 - ye0) + ye0;

    // Intersect outside line ends?
    if (xpt < min(xst, xet) || xpt > max(xst, xet) || ypt < min(yst, yet) || ypt > max(yst, yet)) {
        return;
    }

    return {
        //fn: detectMovingLineMovingPoint,
        //args: arguments,
        t: t,
        point: Float64Array.of(xpt, ypt),
        st: Float64Array.of(xst, yst),
        et: Float64Array.of(xet, yet)
    };
}

export function detectLinePoint(s0, e0, s1, e1, p0, p1) {
    // Is line stationary?
    return equal(s0, s1) && equal(e0, e1) ?
        // Is point stationary too?
        equal(p0, p1) ?
            // Is line a single point?
            equal(s0, e0) ?
                // Does it coincide with point?
                equal(s0, p0) ? { t: 0, point: p0 } :
                undefined :
            // Is point in line?
            isPointInLine(s0, e0, p0) ?
                { t: 0, point: p0 } :
            undefined :
        // Does moving point cross static line?
        detectStaticLineMovingPoint(s0, e0, p0, p1) :
    // Does moving point cross moving line?
    detectMovingLineMovingPoint(s0, e0, s1, e1, p0, p1) ;
}

function detectObjectPoint(shape0, shape1, p0, p1) {
    if (shape0.length !== shape1.length) {
        throw new Error('shape0 and shape1 must have equal length');
    }

    let n = shape0.length - 1;
    let t = Infinity;
    let collision;

    while(n--) {
        const c = detectLinePoint(shape0[n], shape0[n + 1], shape1[n], shape1[n + 1], p0, p1);

        if (c && c.t < t) {
            t = c.t;
            collision = c;
            collision.s0 = shape0[n];
            collision.e0 = shape0[n + 1];
            collision.s1 = shape1[n];
            collision.e1 = shape1[n + 1];
            collision.p0 = p0;
            collision.p1 = p1;
        }
    }
}

function detectObjectObject(shapeA0, shapeA1, shapeB0, shapeB1) {
    if (shapeB0.length !== shapeB1.length) {
        throw new Error('shape0 and shape1 must have equal length');
    }

    let n = shapeB0.length;
    let t = Infinity;
    let collision;

    while(n--) {
        const c = detectObjectPoint(shapeA0, shapeA1, shapeB0[n], shapeB1[n]);

        if (c && c.t < t) {
            t = c.t;
            collision = c;
        }
    }

    n = shapeA0.length;

    while(n--) {
        const c = detectObjectPoint(shapeB0, shapeB1, shapeA0[n], shapeA1[n]);

        if (c && c.t < t) {
            t = c.t;
            collision = c;
        }
    }

    return collision;
}


window.d = detectLinePoint;

console.group('Test collision.js');

console.log('Vertical static line');

console.log(0.5,   detectLinePoint([1,0],[1,2],[1,0],[1,2],[0,1],[2,1]), 'Horizontal motion point');
console.log(0.5,   detectLinePoint([1,0],[1,2],[1,0],[1,2],[2,1],[0,1]), 'Horizontal inverse motion point');
console.log('und', detectLinePoint([1,0],[1,2],[1,0],[1,2],[0,3],[2,3]), 'Horizontal motion point out of bounds');
console.log(0,     detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,1],[1,3]), 'Vertical line moving point (same trajectory)');
console.log(0.5,   detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,3],[1,1]), 'Vertical inverse motion point (same trajectory)');
console.log('und', detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,3],[1,5]), 'Vertical motion point out of bounds');
console.log(0,     detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,1],[1,1]), 'Motionless point');
console.log('und', detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,3],[1,3]), 'Motionless point out of bounds');

console.log('Horizontal static line');
console.log(0,     detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,1],[3,1]), 'Horizontal line moving point (same trajectory)');
console.log(0.5,   detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,1],[1,1]), 'Horizontal line moving point (same trajectory)');
console.log('und', detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,1],[4,1]), 'Horizontal line point out of bounds');
console.log('und', detectLinePoint([0,1],[2,1],[0,1],[2,1],[0,2],[2,2]), 'Horizontal line point out of bounds');
console.log(0.5,   detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,0],[1,2]), 'Vertical motion point');
console.log(0.5,   detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,2],[1,0]), 'Vertical inverse motion point');
console.log('und', detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,0],[3,2]), 'Vertical motion point out of bounds');
console.log(0,     detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,1],[1,1]), 'Motionless point');
console.log('und', detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,1],[3,1]), 'Motionless point out of bounds');

console.log('Angled static line');
console.log(0,     detectLinePoint([-2,-4],[2,4],[-2,-4],[2,4],[1,2],[3,6]), 'Angled line moving point (same trajectory)');
console.log(0.5,   detectLinePoint([-2,4],[2,-4],[-2,4],[2,-4],[3,-6],[1,-2]), 'Angled line moving point (same trajectory)');

console.log('Vertical travelling line');
console.log(0, detectLinePoint([0,0],[0,2],[2,0],[2,2],[0,1],[2,1]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[1,0],[1,2]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[1,1],[1,1]), 'Motionless point');
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[2,1],[0,1]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[1,2],[1,0]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[1,1],[1,1]), 'Motionless point');

console.log('Horizontal travelling line');
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[0,1],[2,1]));
console.log(0,     detectLinePoint([0,0],[2,0],[0,2],[2,2],[1,0],[1,2]));
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[1,1],[1,1]), 'Motionless point');
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[2,1],[0,1]));
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[1,2],[1,0]));
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[1,1],[1,1]), 'Motionless point');

console.log('/ to \\ travelling line');
console.log(0.5,   detectLinePoint([0,0],[2,2],[0,2],[2,0],[0,1],[2,1]));
console.log(0.5,   detectLinePoint([0,0],[2,2],[0,2],[2,0],[1,0],[1,2]));
console.log(0.5,   detectLinePoint([0,0],[2,2],[0,2],[2,0],[2,1],[2,1]), 'Motionless point');
console.log(0.5,   detectLinePoint([0,0],[2,2],[0,2],[2,0],[2,1],[0,1]));
console.log(0.5,   detectLinePoint([0,0],[2,2],[0,2],[2,0],[1,2],[1,0]));
console.log(0.5,   detectLinePoint([0,0],[2,2],[0,2],[2,0],[2,1],[2,1]), 'Motionless point');

console.log('\\ to / travelling line');
console.log(0.5,   detectLinePoint([0,2],[2,0],[0,0],[2,2],[0,1],[2,1]));
console.log(0.5,   detectLinePoint([0,2],[2,0],[0,0],[2,2],[1,0],[1,2]));
console.log(0.5,   detectLinePoint([0,2],[2,0],[0,0],[2,2],[2,1],[2,1]), 'Motionless point');
console.log(0.5,   detectLinePoint([0,2],[2,0],[0,0],[2,2],[2,1],[0,1]));
console.log(0.5,   detectLinePoint([0,2],[2,0],[0,0],[2,2],[1,2],[1,0]));
console.log(0.5,   detectLinePoint([0,2],[2,0],[0,0],[2,2],[2,1],[2,1]), 'Motionless point');

console.log('Point outside the line');
console.log('und',   detectLinePoint([0,2],[2,0],[0,0],[2,2],[0,3],[2,3]));
console.log('und',   detectLinePoint([0,2],[2,0],[0,0],[2,2],[3,0],[3,2]));
console.log('und',   detectLinePoint([0,2],[2,0],[0,0],[2,2],[2,3],[0,3]));
console.log('und',   detectLinePoint([0,2],[2,0],[0,0],[2,2],[3,2],[3,0]));

console.groupEnd();