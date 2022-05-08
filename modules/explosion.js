
/* Explosion */

import remove from '../../fn/modules/remove.js';
import { drawCircle } from '../../colin/modules/canvas.js';




const assign = Object.assign;


/* Explosion */

export default function Explosion(t, x, y, vx, vy) {
    this.created  = t;
    this.duration = 5;
    this.drag     = 0.06;
    this.data     = Float64Array.of(x, y, vx, vy, 0, -180);
}

assign(Explosion, {
    of: function() {
        return new Explosion(arguments);
    },

    from: function(data) {
        return new Explosion(data);
    }
});

assign(Explosion.prototype, {
    type:    'explosion',
    size:    2,
    collidable: ['rocket'],

    update: function(t1, t2, environment, objects) {
        if (this.created < t2 - this.duration) {
            remove(objects, this);
        }
    },

    render: function(environment, time) {
        const { ctx, viewbox, style } = environment;
        const decay = 1 - ((time - this.created) / this.duration);
        drawCircle(ctx, [this.data[0], this.data[1], 800 * decay * decay]);
        ctx.fillStyle = style.getPropertyValue('--explosion-fill');
        ctx.fill();
    }
});
