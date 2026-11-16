// LUMEN BLOOM — input. Keyboard (WASD or arrows to fly, Space to fire,
// P pause, R restart, M mute) plus mouse aim and click to fire. The
// canvas reports pointer positions in field coordinates.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, inside: false };

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  const GAME_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  ]);

  function onKeyDown(event) {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    keys.add(event.code);
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const p = toField(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
  }
  function onMouseDown(event) {
    const p = toField(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }
  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', () => {
    mouse.inside = false;
  });

  return {
    keys,
    mouse,
    // Held movement, normalised: -1, 0 or 1 per axis.
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    firing() {
      return keys.has('Space') || mouse.down;
    },
    // One-shot edge trigger: true once per physical press.
    pressed(code) {
      if (!keys.has(code)) return false;
      keys.delete(code);
      return true;
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
