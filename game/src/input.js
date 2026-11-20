// Keyboard and mouse input. Held keys are read every frame; one-shot presses
// (enter car, punch, pause, mute, confirm) are queued as flags and taken once by
// the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  const mouse = { x: 640, y: 360, down: false, clicked: false, screenX: 640, screenY: 360 };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) { keys.add(event.code); return; }
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER.has(event.code)) actions |= ACTION_ENTER;
    else if (PUNCH.has(event.code)) actions |= ACTION_PUNCH;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.screenX = event.clientX - rect.left;
    mouse.screenY = event.clientY - rect.top;
    mouse.x = mouse.screenX; mouse.y = mouse.screenY;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse.down = true; mouse.clicked = true;
    const rect = canvas.getBoundingClientRect();
    mouse.screenX = event.clientX - rect.left;
    mouse.screenY = event.clientY - rect.top;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });

  return {
    keys, mouse,
    up() { return UP.has('ArrowUp') && (keys.has('ArrowUp') || keys.has('KeyW')); },
    down() { return keys.has('ArrowDown') || keys.has('KeyS'); },
    left() { return keys.has('ArrowLeft') || keys.has('KeyA'); },
    right() { return keys.has('ArrowRight') || keys.has('KeyD'); },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    brake() { return keys.has('Space'); },
    /** -1..1 steering, -1..1 throttle from held keys. */
    steer() { return (this.right() ? 1 : 0) - (this.left() ? 1 : 0); },
    throttle() { return (this.up() ? 1 : 0) - (this.down() ? 1 : 0); },
    takeActions() { const taken = actions; actions = 0; return taken; },
    takeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
  };
}
