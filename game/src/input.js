// Keyboard and mouse, read once per frame: held directions, and the presses
// that happened since the last read (smoke, EMP, confirm, pause).
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;
export const ACTION_EMP = 8;

const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  smoke: ['KeyQ'],
  emp: ['KeyE'],
  confirm: ['Space', 'Enter'],
  pause: ['KeyP', 'Escape'],
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (KEYS.confirm.includes(codeOf(event)) || KEYS.pause.includes(codeOf(event))) event.preventDefault();
    if (event.repeat) return;
    held.add(codeOf(event));
    if (KEYS.confirm.includes(codeOf(event))) queued |= ACTION_CONFIRM;
    if (KEYS.pause.includes(codeOf(event))) queued |= ACTION_PAUSE;
    if (KEYS.smoke.includes(codeOf(event))) queued |= ACTION_SMOKE;
    if (KEYS.emp.includes(codeOf(event))) queued |= ACTION_EMP;
  });
  window.addEventListener('keyup', (event) => held.delete(codeOf(event)));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousedown', () => {
    queued |= ACTION_CONFIRM;
  });

  function isHeld(names) {
    return names.some((name) => held.has(name));
  }

  return {
    direction() {
      const mx = (isHeld(KEYS.right) ? 1 : 0) - (isHeld(KEYS.left) ? 1 : 0);
      const my = (isHeld(KEYS.down) ? 1 : 0) - (isHeld(KEYS.up) ? 1 : 0);
      if (mx === 0 && my === 0) return { mx: 0, my: 0 };
      const length = Math.hypot(mx, my);
      return { mx: mx / length, my: my / length };
    },
    sprinting() {
      return isHeld(KEYS.sprint);
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
