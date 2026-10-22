import { bagItemAt } from './loot.js';

// Pointer capture changes event targets on phones: use release coordinates, not event.target.
export function setupTouchSack({ canvas, sack, getLoot, enabled, onBegin, move, place, onBlocked = () => {} }) {
  let gesture = null;
  const point = event => ({ x: event.clientX, y: event.clientY });
  const clear = () => { gesture = null; sack.setTouchDrag(null); };
  canvas.addEventListener('pointerdown', event => {
    if (!['touch', 'pen'].includes(event.pointerType) || !enabled()) return;
    event.preventDefault(); event.stopPropagation();
    if (gesture || event.button !== 0) return;
    const at = sack.cellAt(point(event));
    if (!at) return;
    onBegin(); sack.holdOpen(); sack.selectAt(point(event));
    const loot = getLoot(), item = !loot.held && bagItemAt(loot.bag, at.x, at.y);
    if (item) sack.selectItem(item);
    gesture = { pointerId: event.pointerId, start: point(event), id: item?.id, held: !!loot.held,
      grabX: item ? at.x - item.x : 0, grabY: item ? at.y - item.y : 0, dragging: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    if (!enabled()) { clear(); return; }
    if (gesture.id && Math.hypot(event.clientX - gesture.start.x, event.clientY - gesture.start.y) >= 8) gesture.dragging = true;
    if (gesture.dragging) sack.setTouchDrag({ ...gesture, point: point(event) });
  });
  canvas.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    const current = gesture, at = sack.cellAt(point(event)); clear();
    if (!enabled()) return;
    if (!at) { if (current.held || current.dragging || Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) >= 8) onBlocked(); return; }
    if (current.held) { place(at.x, at.y); return; }
    // Small taps only select. Invalid/outside drops leave the packed item untouched.
    const dragged = current.dragging || Math.hypot(event.clientX - current.start.x, event.clientY - current.start.y) >= 8;
    if (dragged && getLoot().bag.some(p => p.id === current.id)) move(current.id, at.x - current.grabX, at.y - current.grabY);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => {
    if (gesture && event.pointerId === gesture.pointerId) { event.stopPropagation(); clear(); }
  });
  for (const type of ['blur', 'gamecontrolsreset']) window.addEventListener(type, clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
}
