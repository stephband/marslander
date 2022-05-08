
import gaussian    from '../../fn/modules/gaussian.js';
import toCartesian from '../../fn/modules/to-cartesian.js'

const random = Math.random;

//ctx, camera, style, object, t0, t1
export function render(ctx, camera, style, object, collisions) {
/*    // Shake the camera when collisions hit the ground
    const terrainCollisions = collisions.filter((collision) => collision.objects.includes(terrain));

    // Camera shake
    if (terrainCollisions.length) {
        const sumVelocity = terrainCollisions.reduce((total, collision) => {
            return total + collision.velocity[1];
        }, 0);

        const d = gaussian() * sumVelocity * 0.0016;
        const a = random() * 2 * pi;
        const shakeVector = toCartesian([d, a]);

        terrainbox[0] += shakeVector[0];
        terrainbox[1] += shakeVector[1];
    }
*/
}
