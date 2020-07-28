
import { equal, gradient } from './vector.js';

const pow = Math.pow;
const min = Math.min;
const max = Math.max;

function isPointInLine(s, e, p) {
    // If point is outside line bounds
    if (p[0] < min(s[0], e[0]) || p[1] > max(s[1], e[1])) {
        return false;
    }

    // Return true where p is the same gradient freom s as e is
    // Todo: do we need to account for floating point errors?
    return gradient(s, p) === gradient(s, e);
}

export function detectXLine(ls, le, p0, p1) {
    if (ls[0] !== le[0]) {
        throw new Error('Line is not vertical (' + ls + ' to ' + le + ')');
    }

    const xs  = ls[0];
    const ys  = ls[1];
    const ye  = le[1];
    const xp0 = p0[0];
    const yp0 = p0[1];
    const xp1 = p1[0];
    const yp1 = p1[1];

    // Where xp0 is the same as line start, collision is immediate
    const t = (xs - xp0) / (xp1 - xp0);

    // Intersect outside time window?
    if (t < 0 || t >= 1) {
        return;
    }

    const xpt = xs;
    const ypt = t * (yp1 - yp0) + yp0;

    // Intersect outside line ends?
    if (ypt < min(ys, ye) || ypt > max(ys, ye)) {
        return;
    }

    return {
        time: t,
        point: [xpt, ypt]
    };
}

export function detectYLine(ls, le, p0, p1) {
    if (ls[1] !== le[1]) {
        throw new Error('Line is not horizontal (' + ls + ' to ' + le + ')');
    }

    const ys  = ls[1];
    const xs  = ls[0];
    const xe  = le[0];
    const xp0 = p0[0];
    const yp0 = p0[1];
    const xp1 = p1[0];
    const yp1 = p1[1];

    const t = (ys - yp0) / (yp1 - yp0);

    // Intersect outside time window?
    if (t < 0 || t >= 1) {
        return;
    }

    const xpt = t * (xp1 - xp0) + xp0;

    // Intersect outside line ends?
    if (xpt < min(xs, xe) || xpt > max(xs, xe)) {
        return;
    }

    const ypt = ys;

    return {
        time: t,
        point: [xpt, ypt]
    };
}

export function detectStaticLineMovingPoint(ls, le, p0, p1) {
    if (ls[0] === le[0]) {
        if (ls[1] === le[1]) {
            throw new Error('Line has no dimension (' + ls + ' to ' + le + ')');
        }

        // Line is a vertical
        return detectXLine(ls, le, p0, p1);
    }

    if (ls[1] === le[1]) {
        // Line is a horizontal
        return detectYLine(ls, le, p0, p1);
    }

    const xs = ls[0];
    const ys = ls[1];
    const xe = le[0];
    const ye = le[1];

    const g = (ye - ys) / (xe - xs);

    const xp0 = p0[0];
    const yp0 = p0[1];
    const xp1 = p1[0];
    const yp1 = p1[1];

    const t = (ys - yp0 + g * (xp0 - xs)) / (yp1 - yp0 + g * (xp0 - xp1));

    // Intersect outside time window?
    if (t < 0 || t >= 1) {
        return;
    }

    const xpt = t * (xp1 - xp0) + xp0;

    // Intersect outside line ends?
    if (xpt < min(xs, xe) || xpt > max(xs, xe)) {
        return;
    }

    const ypt = t * (yp1 - yp0) + yp0;

    return {
        point: [xpt, ypt],
        time: t
    };
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

    let t;

    // If a is 0 this is not a quadratic, it's just t = -c / b
    if (a === 0) {
        // If b is also 0 we have a problem. I think this means that p
        // is travelling with the line. And I think we can only know if it hits
        // the start or the end, not whether it is currently in between the
        // start and end... todo...
        if (b === 0) {
            throw new Error('Fix this');
            return;
        }
        else {
            t = -c / b;
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
        time: t,
        point: [xpt, ypt]
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
                equal(s0, p0) ? { time: 0, point: p0 } :
                undefined :
            // Is point in line?
            isPointInLine(s0, e0, p0) ? { time: 0, point: p0 } :
            undefined :
        // Does moving point cross static line?
        detectStaticLineMovingPoint(s0, e0, p0, p1) :
    // Does moving point cross moving line?
    detectMovingLineMovingPoint(s0, e0, s1, e1, p0, p1) ;
}


window.d = detectLinePoint;

console.log('Vertical static line');
console.log(0.5,   detectLinePoint([1,0],[1,2],[1,0],[1,2],[0,1],[2,1]), 'Horizontal motion point');
console.log(0.5,   detectLinePoint([1,0],[1,2],[1,0],[1,2],[2,1],[0,1]), 'Horizontal inverse motion point');
console.log('und', detectLinePoint([1,0],[1,2],[1,0],[1,2],[0,3],[2,3]), 'Horizontal motion point out of bounds');
console.log(0,     detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,1],[1,3]), 'Vertical motion point (along same line)');
console.log(0.5,   detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,3],[1,1]), 'Vertical inverse motion point (along same line)');
console.log('und', detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,3],[1,5]), 'Vertical motion point out of bounds');
console.log(0,     detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,1],[1,1]), 'Motionless point');
console.log('und', detectLinePoint([1,0],[1,2],[1,0],[1,2],[1,3],[1,3]), 'Motionless point out of bounds');

console.log('Horizontal static line');
console.log(0,     detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,1],[3,1]), 'Horizontal motion point');
console.log(0.5,   detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,1],[1,1]), 'Horizontal inverse motion point');
console.log('und', detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,1],[4,1]), 'Horizontal motion point out of bounds');
console.log(0.5,   detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,0],[1,2]), 'Vertical motion point');
console.log(0.5,   detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,2],[1,0]), 'Vertical inverse motion point');
console.log('und', detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,0],[3,2]), 'Vertical motion point out of bounds');
console.log(0,     detectLinePoint([0,1],[2,1],[0,1],[2,1],[1,1],[1,1]), 'Motionless point');
console.log('und', detectLinePoint([0,1],[2,1],[0,1],[2,1],[3,1],[3,1]), 'Motionless point out of bounds');

console.log('Vertical travelling line');
//console.log('und', detectLinePoint([0,0],[0,2],[2,0],[2,2],[0,1],[2,1]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[1,0],[1,2]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[2,1],[2,1]), 'Motionless point');
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[2,1],[0,1]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[1,2],[1,0]));
console.log(0.5,   detectLinePoint([0,0],[0,2],[2,0],[2,2],[2,1],[2,1]), 'Motionless point');

console.log('Horizontal travelling line');
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[0,1],[2,1]));
//console.log('und', detectLinePoint([0,0],[2,0],[0,2],[2,2],[1,0],[1,2]));
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[2,1],[2,1]), 'Motionless point');
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[2,1],[0,1]));
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[1,2],[1,0]));
console.log(0.5,   detectLinePoint([0,0],[2,0],[0,2],[2,2],[2,1],[2,1]), 'Motionless point');

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
