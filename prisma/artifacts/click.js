(() => {
  const c = document.querySelector('canvas');
  if (!c) return { error: 'no-canvas' };
  const r = c.getBoundingClientRect();
  const clickAt = (nx, ny) => {
    const x = r.left + r.width * nx;
    const y = r.top + r.height * ny;
    const opts = { bubbles: true, clientX: x, clientY: y, button: 0, pointerId: 1 };
    c.dispatchEvent(new PointerEvent('pointermove', opts));
    c.dispatchEvent(new PointerEvent('pointerdown', opts));
    c.dispatchEvent(new PointerEvent('pointerup', opts));
  };
  clickAt(0.5, 0.46);
  clickAt(0.42, 0.5);
  clickAt(0.58, 0.52);
  return window.__THREE_GAME_DIAGNOSTICS__;
})()
