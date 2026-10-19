// Visibility only: never touches inventory contents or placement rules.
export function createSackPanel() {
  return { open: false, manual: false, peek: 0, revealPending: false, lastTarget: null, suppressed: null, wasMoving: false };
}

export function toggleSackPanel(panel, targetId = null, holding = false) {
  if (holding) { panel.open = true; return; }
  panel.manual = !panel.open; panel.open = panel.manual; panel.peek = 0;
  panel.suppressed = panel.manual ? null : targetId;
}

export function revealSackPanel(panel) { panel.revealPending = true; }

export function stepSackPanel(panel, { moving = false, targetId = null, holding = false, hovering = false, active = true }, dt) {
  if (!active) { panel.open = false; panel.manual = false; panel.peek = 0; panel.revealPending = false; return false; }
  panel.peek = Math.max(0, panel.peek - Math.max(0, dt));
  if (moving) {
    panel.manual = false;
    if (!panel.wasMoving) panel.peek = 0;
  }
  // A newly highlighted loose item gets a short peek, including while walking.
  // The same target cannot reopen the panel every frame after it is dismissed.
  if (targetId !== panel.lastTarget) {
    panel.suppressed = null;
    if (targetId) panel.peek = 1.1;
    panel.lastTarget = targetId;
  }
  if (panel.revealPending) { panel.peek = 1.6; panel.revealPending = false; panel.suppressed = null; }
  panel.open = !!(holding || panel.manual || panel.peek > 0 || !moving && (targetId && targetId !== panel.suppressed || hovering && panel.open));
  panel.wasMoving = moving;
  return panel.open;
}
