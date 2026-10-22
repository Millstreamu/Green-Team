// Shared viewport controls for solo and multiplayer.
export function setupGameScreen(canvas) {
  setupGameDisplay(canvas);
  setupTouchInteract(canvas);
  setupTouchMovement(canvas);
  for (const [id, code] of [['touch-use', 'Space'], ['touch-sack', 'Tab'], ['touch-cancel', 'Escape']]) {
    bindTouchButton(canvas, id, type => emitTouchKey(canvas, type, code));
  }
  bindTouchButton(canvas, 'touch-rotate', type => { if (type === 'keydown') canvas.dispatchEvent(new Event('touchrotate')); });
  bindTouchButton(canvas, 'touch-lift', type => {
    if (type === 'keydown') canvas.dispatchEvent(new Event('touchlift'));
  });
  const help = document.querySelector('#game-help');
  if (!help) return;
  help.addEventListener('toggle', () => { if (!help.open) canvas.focus(); });
  help.addEventListener('keydown', event => {
    if (event.code !== 'Escape' || !help.open) return;
    event.preventDefault(); event.stopPropagation(); help.open = false; canvas.focus();
  });
}

function emitTouchKey(canvas, type, code) {
  canvas.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'KeyE' ? 'e' : code, bubbles: true, cancelable: true, repeat: false }));
}

// Reuse the keyboard action path, including held-E timed interactions.
export function setupTouchInteract(canvas) {
  bindTouchButton(canvas, 'touch-interact', type => emitTouchKey(canvas, type, 'KeyE'));
}

function bindTouchButton(canvas, id, emit) {
  const button = document.querySelector(`#${id}`);
  if (!button) return;
  let pointerId = null;
  const release = event => {
    event?.stopPropagation();
    if (pointerId === null || event?.pointerId != null && event.pointerId !== pointerId) return;
    pointerId = null;
    button.classList.remove('pressed');
    button.setAttribute('aria-pressed', 'false');
    emit('keyup');
  };
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); event.stopPropagation();
    if (pointerId !== null || event.button !== 0) return;
    window.getSelection?.()?.removeAllRanges();
    pointerId = event.pointerId;
    button.setPointerCapture(pointerId);
    button.classList.add('pressed');
    button.setAttribute('aria-pressed', 'true');
    canvas.focus({ preventScroll: true });
    emit('keydown');
  });
  button.addEventListener('pointermove', event => { event.preventDefault(); event.stopPropagation(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
  for (const type of ['contextmenu', 'selectstart']) button.addEventListener(type, event => event.preventDefault());
  window.addEventListener('gamecontrolsreset', () => release());
  window.addEventListener('blur', () => release());
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
}

export function setupTouchMovement(canvas) {
  const zone = document.querySelector('#touch-move-zone');
  const stick = document.querySelector('#touch-stick');
  if (!zone || !stick) return;
  let pointerId = null, origin = { x: 0, y: 0 };
  const radius = 56;
  const send = (x, y) => canvas.dispatchEvent(new CustomEvent('touchmovement', { bubbles: true, detail: { x, y } }));
  const move = event => {
    if (event.pointerId !== pointerId) return;
    event.stopPropagation();
    event.preventDefault();
    const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
    const distance = Math.hypot(dx, dy), scale = distance ? Math.min(1, radius * .6 / distance) : 0;
    stick.style.setProperty('--stick-x', `${dx * scale}px`);
    stick.style.setProperty('--stick-y', `${dy * scale}px`);
    send(Math.abs(dx) > radius * .24 ? Math.sign(dx) : 0, Math.abs(dy) > radius * .24 ? Math.sign(dy) : 0);
  };
  const release = event => {
    if (pointerId === null || event?.pointerId != null && event.pointerId !== pointerId) return;
    event?.stopPropagation();
    pointerId = null; zone.dataset.active = 'false';
    stick.style.setProperty('--stick-x', '0px'); stick.style.setProperty('--stick-y', '0px');
    send(0, 0);
  };
  canvas.addEventListener('pointerdown', event => {
    if (pointerId !== null || event.button !== 0 || !['touch', 'pen'].includes(event.pointerType) || document.querySelector('#game-menu')?.open) return;
    const area = zone.getBoundingClientRect();
    if (event.clientX < area.left || event.clientX >= area.left + area.width || event.clientY < area.top || event.clientY >= area.top + area.height) return;
    event.preventDefault(); event.stopPropagation();
    pointerId = event.pointerId; origin = { x: event.clientX, y: event.clientY };
    const bounds = zone.getBoundingClientRect();
    stick.style.left = `${origin.x - bounds.left - radius}px`;
    stick.style.top = `${origin.y - bounds.top - radius}px`;
    zone.dataset.active = 'true'; canvas.setPointerCapture(pointerId);
    canvas.focus({ preventScroll: true }); move(event);
  });
  canvas.addEventListener('pointermove', move);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, release);
  for (const type of ['contextmenu', 'selectstart']) canvas.addEventListener(type, event => event.preventDefault());
  window.addEventListener('gamecontrolsreset', () => release());
  window.addEventListener('blur', () => release());
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
}

// Fullscreen the document so station/result dialogs and the home screen stay visible.
export function setupGameDisplay(canvas) {
  const menu = document.querySelector('#game-menu');
  const fullscreen = document.querySelector('#fullscreen');
  const mapButton = document.querySelector('#toggle-map');
  const mapPanel = document.querySelector('#dungeon-map');
  const feedback = document.querySelector('#screen-message');
  let feedbackTimeout;
  const say = text => {
    if (!feedback) return;
    feedback.textContent = text;
    window.clearTimeout?.(feedbackTimeout);
    feedbackTimeout = window.setTimeout?.(() => { feedback.textContent = ''; }, 6000);
  };
  const reset = () => canvas.dispatchEvent(new Event('gamecontrolsreset', { bubbles: true }));
  // A changed viewport invalidates captured thumb origins and drag coordinates.
  for (const type of ['resize', 'orientationchange']) window.addEventListener(type, reset);
  if (menu) {
    const close = () => { if (menu.open) { menu.open = false; canvas.focus({ preventScroll: true }); } };
    menu.addEventListener('toggle', () => {
      reset();
      canvas.dispatchEvent(new CustomEvent('game-menu-state', { bubbles: true, detail: { open: menu.open } }));
      if (!menu.open) canvas.focus({ preventScroll: true });
    });
    document.addEventListener('pointerdown', event => {
      if (menu.open && !menu.contains(event.target)) {
        event.preventDefault(); event.stopImmediatePropagation(); close();
      }
    });
    menu.addEventListener('click', event => { if (event.target.closest?.('#regenerate,#leave-lair')) close(); });
    menu.addEventListener('change', event => { if (event.target.id === 'goblin-choice') close(); });
    window.addEventListener('keydown', event => {
      if (!menu.open || event.code !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation(); close();
    });
  }
  if (mapButton && mapPanel) mapButton.addEventListener('click', () => {
    mapPanel.hidden = !mapPanel.hidden;
    mapButton.setAttribute('aria-pressed', String(!mapPanel.hidden));
    canvas.focus({ preventScroll: true });
  });
  if (fullscreen) {
    const root = document.documentElement;
    const current = () => document.fullscreenElement || document.webkitFullscreenElement;
    const available = () => root?.requestFullscreen ? document.fullscreenEnabled !== false
      : !!root?.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false;
    const sync = () => {
      const active = !!current();
      fullscreen.setAttribute('aria-pressed', String(active));
      fullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
      fullscreen.title = active ? 'Exit fullscreen' : available() ? 'Enter fullscreen' : 'Fullscreen unavailable in this browser';
      const label = document.querySelector('#fullscreen-label');
      if (label) label.textContent = active ? 'Windowed' : 'Fullscreen';
      reset();
    };
    fullscreen.addEventListener('click', async () => {
      if (feedback) feedback.textContent = '';
      reset();
      try {
        if (current()) await (document.exitFullscreen ?? document.webkitExitFullscreen).call(document);
        else if (available()) await (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root);
        else { say('Fullscreen is unavailable here. The game still fills your browser window.'); return; }
        sync(); canvas.focus({ preventScroll: true });
      } catch {
        say('Fullscreen could not open. You can keep playing in this window.');
      }
    });
    for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, sync);
    sync();
  }
  const status = document.querySelector('#status');
  if (status && typeof MutationObserver !== 'undefined' && typeof window.setTimeout === 'function') {
    let timeout;
    const show = () => {
      window.clearTimeout(timeout);
      status.dataset.visible = String(!!status.textContent);
      if (status.textContent) timeout = window.setTimeout(() => { status.dataset.visible = 'false'; }, 5000);
    };
    new MutationObserver(show).observe(status, { childList: true, characterData: true, subtree: true });
    show();
  }
}

export function updateGameHud({ lair, placing, health, maxHealth }) {
  const shell = document.querySelector('#game-shell');
  if (!shell) return;
  shell.dataset.scene = lair ? 'lair' : 'dungeon';
  shell.dataset.placing = String(!!placing);
  shell.dataset.hurt = String(!lair && health > 0 && health <= maxHealth / 3);
  // Health pips sit on the portrait; the text label only shows for special states such as DOWN.
  const pips = document.querySelector('#health-pips');
  if (pips && pips.dataset.value !== `${health}/${maxHealth}`) {
    pips.dataset.value = `${health}/${maxHealth}`;
    pips.replaceChildren(...Array.from({ length: maxHealth }, (_, i) => { const pip = document.createElement('i'); if (i >= health) pip.className = 'empty'; return pip; }));
  }
  const label = document.querySelector('#health-label');
  if (label) label.dataset.message = String(!!label.textContent && !label.textContent.startsWith('Health'));
}

export function controlHint(text) {
  if (!window.matchMedia?.('(any-pointer:coarse)').matches) return text;
  return text.replace(/\bWASD\b/g, 'Stick').replace(/\bTab\b/g, 'Sack')
    .replace(/\bSpace\b/gi, 'Use').replace(/\bEsc(?:ape)?\b/g, 'Cancel')
    .replace(/\bR rotate\b/gi, 'Rotate').replace(/\bclick\b/gi, 'tap');
}
