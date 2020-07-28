
export function copy(vector) {
    return {
        0: vector[0],
        1: vector[1]
    };
}

export function multiply(n, vector) {
    return {
        0: vector[0] * n,
        1: vector[1] * n
    };
}

export function subtract(n, vector) {
    return typeof n == 'number' ? {
        0: vector[0] + n,
        1: vector[1] + n
    } : {
        0: vector[0] - n[0],
        1: vector[1] - n[1]
    };
}

export function add(n, vector) {
    return typeof n == 'number' ? {
        0: vector[0] + n,
        1: vector[1] + n
    } : {
        0: vector[0] + n[0],
        1: vector[1] + n[1]
    };
}

export function gradient(v0, v1) {
    return (v1[1] - v0[1]) / (v1[0] - v0[0]);
}

export function equal(v0, v1) {
    return v0[0] === v1[0] && v0[1] === v1[1];
}
