
import { overload } from '../../fn/module.js';

export const updateValue = overload((data) => typeof data.value, {
    'number': function(data, duration) {
        if (data.acceleration) {
            data.velocity += data.acceleration * duration;
        }

        if (data.velocity) {
            if (data.drag) {
                data.velocity -= data.velocity * data.drag;
            }

            data.value += data.velocity * duration;
        }

        return data;
    },

    'object': function(data, duration) {
        if (data.acceleration) {
            let n = -1;
            while(++n in data.value) {
                data.velocity[n] += data.acceleration[n] * duration;
            }
        }

        if (data.velocity) {
            if (data.drag) {
                let n = -1;
                while(++n in data.value) {
                    data.velocity[n] -= data.velocity[n] * data.drag;
                }
            }

            let n = -1;
            while(++n in data.value) {
                data.value[n] += data.velocity[n] * duration;
            }
        }

        return data;
    }
});