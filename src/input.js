export function createInput(target, inventoryOpen = () => false) {
  const keys = new Set();
  let menuOpen = false;
  let touch = { x: 0, y: 0 };
  target.addEventListener('touchmovement', event => {
    touch = inventoryOpen() ? { x: 0, y: 0 } : { x: Math.sign(event.detail.x) || 0, y: Math.sign(event.detail.y) || 0 };
  });
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  target.addEventListener('keydown', e => {
    if (menuOpen) return;
    if (e.target instanceof HTMLElement && e.target.closest('input,textarea,select,button,summary')) return;
    if (movementKeys.has(e.code) && inventoryOpen()) { e.preventDefault(); return; }
    // Space is tracked for held actions such as Sack Sacrifice.
    if (movementKeys.has(e.code) || e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); keys.add(e.code); }
  });
  target.addEventListener('keyup', e => keys.delete(e.code));
  const clear = () => { keys.clear(); touch = { x: 0, y: 0 }; };
  target.addEventListener('gamecontrolsreset', clear);
  target.addEventListener('game-menu-state', event => { menuOpen = !!event.detail.open; clear(); });
  target.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
  return { clear, clearMovement: () => { touch = { x: 0, y: 0 }; for (const code of movementKeys) keys.delete(code); }, held: code => !menuOpen && keys.has(code), read: () => menuOpen ? { x: 0, y: 0 } : ({
    x: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) || (inventoryOpen() ? 0 : touch.x),
    y: Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) || (inventoryOpen() ? 0 : touch.y)
  }) };
}
