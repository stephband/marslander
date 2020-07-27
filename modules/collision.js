
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
    if (ypt < Math.min(ys, ye) || ypt > Math.max(ys, ye)) {
        return;
    }

    return [xpt, ypt, t];
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
    if (xpt < Math.min(xs, xe) || xpt > Math.max(xs, xe)) {
        return;
    }

    const ypt = ys;

    return [xpt, ypt, t];
}

export function detectLine(ls, le, p0, p1) {
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
    if (xpt < Math.min(xs, xe) || xpt > Math.max(xs, xe)) {
        return;
    }

    const ypt = t * (yp1 - yp0) + yp0;

    return {
        surface: [le, ls],
        point: [xpt, ypt],
        time: t
    };
}

export function detectMovingLine(ls0, le0, ls1, le1, p0, p1) {
    const xs0 = ls0[0];
    const ys0 = ls0[1];
    const xe0 = le0[0];
    const ye0 = le0[1];
    const xs1 = ls1[0];
    const ys1 = ls1[1];
    const xe1 = le1[0];
    const ye1 = le1[1];

    const xp0 = p0[0];
    const yp0 = p0[1];
    const xp1 = p1[0];
    const yp1 = p1[1];

    const xp = xp1 - xp0;
    const yp = yp1 - xp0;
    const xs = xs1 - xs0;
    const ys = ys1 - xs0;
    const xe = xe1 - xe0;
    const ye = ye1 - xe0;

    const xps = xp - xs;
    const yps = yp - ys;
    const xes = xe - xs;
    const yes = ye - ys;

    const xps0 = xp0 + xs0;
    const yes0 = ye0 + ys0;
    const xes0 = xe0 + xs0;
    const yps0 = yp0 + ys0;

    const a = xps * yes + xes * yps - xes * yes;
    const b = xps * yes0 + yes * xps0 + yps * xes0 + xes * yps0 - yps * yes0 - yes * yps0;
    const c = xps0 * yes0 + xes0 * yps0 - yps0 * yes0;

    const ta = (-b + Math.pow(b * b - 4 * a * c, 0.5)) / (2 * a);
    const tb = (-b - Math.pow(b * b - 4 * a * c, 0.5)) / (2 * a);
    let t, xpt, ypt;
    //console.log(ta, tb);

    const xpta = ta * xp + xp0;
    const ypta = ta * yp + yp0;
    const xsta = ta * xs + xs0;
    const ysta = ta * ys + ys0;
    const xeta = ta * xe + xe0;
    const yeta = ta * ye + ye0;

    if (ta < -1 || ta > 0 || xpta < xsta || xpta > xeta || ypta < ysta || ypta > yeta) {
        //console.log(t, 'Collision not inside line boundary');
        //return;
    }
    else {
        t = ta;
        xpt = xpta;
        ypt = ypta;
    }

    const xptb = tb * xp + xp0;
    const yptb = tb * yp + yp0;
    const xstb = tb * xs + xs0;
    const ystb = tb * ys + ys0;
    const xetb = tb * xe + xe0;
    const yetb = tb * ye + ye0;

    if (tb < -1 || tb > 0 || xptb < xstb || xptb > xetb || yptb < ystb || yptb > yetb) {
        //console.log(t, 'Collision not inside line boundary');
        if (t === undefined) {
            return;
        }
    }
    else if (t === undefined || tb < t) {
        t = tb;
        xpt = xptb;
        ypt = yptb;
    }



    //if (t < -1) {
        //console.log(t, 'Collision before frame');
    //    return;
    //}

    //if (t > 1) {
        //console.log(t, 'Collision after frame');
    //    return;
    //}

    console.log(t, ta, tb, xpt, ypt);

    return t;
}
