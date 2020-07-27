
const messageNode = document.getElementById('game-message');

export function message(text, vel, gradient, rotation, fuel) {
    messageNode.innerHTML = text;
    messageNode.hidden = false;
    setTimeout(function() {
        messageNode.classList.add('visible');
    }, 1500);

    stats(vel, gradient, rotation, fuel);
}

const statsNode = document.getElementById('game-stats');

export function stats(vel, gradient, rotation, fuel) {
    statsNode.innerHTML =
        '<pre>' +
        (typeof vel === 'number' ?      'Impact velocity:  ' + Math.round(vel / 5) + 'ms<sup>-1</sup>\n' : '') +
        (typeof rotation === 'number' ? 'Craft rotation:   ' + Math.round((rotation > 0.5 ? rotation - 1 : rotation) * 180) + '°\n' : '') +
        (typeof gradient === 'number' ? 'Terrain gradient: ' + gradient.toFixed(3) + '\n' : '')  +
        (typeof fuel === 'number' ?     'Fuel:             ' + fuel.toFixed(2) + '' : '') +
        '</pre>';

    statsNode.hidden = false;
    setTimeout(function() {
        statsNode.classList.add('visible');
    }, 1500);
}
