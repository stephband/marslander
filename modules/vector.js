
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

export function gradient(vector) {
    return vector[1] / vector[0];
}
