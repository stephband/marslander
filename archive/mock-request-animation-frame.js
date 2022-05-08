
let time = 0;
let requests = [];

function requestAnimationFrame(fn) {
    requests.push(fn);
}

function frame() {
    const r = requests;
    requests = [];
    time += 1000/60;
    console.group('frame', time);
    r.forEach((fn) => fn(time));
    console.groupEnd();
}

events('keydown', document)
.each(overload(toKey, {
    'space': frame,
    default: noop
}));

// Override native requestAnimationFrame with out triggered version
window.requestAnimationFrame = requestAnimationFrame;
