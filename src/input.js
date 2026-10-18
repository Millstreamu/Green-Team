export function createInput(target, inventoryOpen = () => false) {
  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  target.addEventListener('keydown', e => {
    if (e.target instanceof HTMLElement && e.target.closest('input,textarea,select,button,summary')) return;
    if (movementKeys.has(e.code) && inventoryOpen()) { e.preventDefault(); return; }
    if (movementKeys.has(e.code) || e.code === 'KeyE') { e.preventDefault(); keys.add(e.code); }
  });
  target.addEventListener('keyup', e => keys.delete(e.code));
  const clear = () => keys.clear();
  target.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
  return { clear, clearMovement: () => { for (const code of movementKeys) keys.delete(code); }, held: code => keys.has(code), read: () => ({
    x: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
    y: Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'))
  }) };
}
