
import clamp  from '../../fn/modules/clamp.js';
import remove from '../../fn/modules/remove.js';
import { drawCircle } from '../../colin/modules/canvas.js';

const assign = Object.assign;
const random = Math.random;


/* Vapour */

export default function Vapour(time, x = 0, y = 0, r = 12, vx = 0, vy = 0, vr = 0) {
    this.created  = time;
    this.data     = Float64Array.of(x, y, r, vx, vy, vr, 0, 0, 0);
    this.duration = 1 + random() * 0.8;
    this.drag     = 0.05;
}

assign(Vapour.prototype, {
    type: 'vapour',
    size: 3,

    update: function update(t1, t2, environment, objects) {
        if (this.created < t1 - this.duration) {
            remove(objects, this);
        }
    },

    render: function(environment, time) {
        const { ctx, style } = environment;
        const decay = clamp(0, 1, (time - this.created) / this.duration);

        ctx.save();
if (this.data[2] > 0) {
        drawCircle(ctx, [this.data[0], this.data[1], this.data[2] * (1 + 16 * Math.pow(decay, 2))]);
}
else {
    // TODO: find out why radius is ending up negative!!
    //console.log('ooops', this.data[2])   ;
}
        ctx.fillStyle = style.getPropertyValue('--vapour-fill') + ('0' + Math.floor(100 - 100 * Math.pow(decay, 0.1)).toString(16)).slice(-2);
        ctx.fill();
        ctx.restore();
    }
});
