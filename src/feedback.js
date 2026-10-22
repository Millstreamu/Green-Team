// Stable sound slots: future editor uploads can replace a slot's src without
// changing gameplay callers. Synthesized tones are temporary fallbacks.
export const FEEDBACK_SOUNDS = Object.freeze({
  berryThrow: { src: null, notes: [560, 380], duration: .04, wave: 'sine' },
  berryHit: { src: null, notes: [220, 165], duration: .07, wave: 'triangle' },
  orbPing: { src: null, notes: [523, 784, 1046], duration: .13, wave: 'sine' },
  potionDrink: { src: null, notes: [330, 440, 660], duration: .08, wave: 'sine' },
  bellThrow: { src: null, notes: [420, 310], duration: .04, wave: 'sine' },
  bellRing: { src: null, notes: [1046, 1568, 2093], duration: .15, wave: 'sine' },
  dartFire: { src: null, notes: [740, 460], duration: .045, wave: 'sine' },
  dartHit: { src: null, notes: [310, 230], duration: .06, wave: 'sine' },
  pickup: { src: null, notes: [660, 990], duration: .07, wave: 'sine' },
  blocked: { src: null, notes: [155, 110], duration: .06, wave: 'triangle' },
  lair: { src: null, notes: [440, 554, 660], duration: .065, wave: 'sine' }
});

export function createFeedback({ sounds = FEEDBACK_SOUNDS } = {}) {
  let context, unlocked = false, muted = false, serial = 0;
  const pending = new Map(), lastPlayed = new Map();
  const unlock = () => {
    unlocked = true;
    if (muted) return;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!context && AudioContext) context = new AudioContext();
      context?.resume?.()?.catch?.(() => {});
    } catch { /* Audio is optional; visual confirmation always works. */ }
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  const toggle = document.querySelector('#toggle-sound');
  const sync = () => {
    if (!toggle) return;
    toggle.textContent = muted ? 'Sound off' : 'Sound on';
    toggle.setAttribute('aria-pressed', String(!muted));
  };
  toggle?.addEventListener('click', () => { muted = !muted; if (muted) context?.suspend?.()?.catch?.(() => {}); else unlock(); sync(); });
  sync();
  const sound = cue => {
    if (muted || !unlocked) return;
    const now = performance.now();
    if (now - (lastPlayed.get(cue) ?? -Infinity) < 90) return;
    lastPlayed.set(cue, now);
    const slot = sounds[cue];
    if (!slot) return;
    try {
      if (slot.src) { const audio = new Audio(slot.src); audio.volume = .18; audio.play()?.catch?.(() => {}); return; }
      if (!context || context.state !== 'running') return;
      slot.notes.forEach((frequency, i) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const at = context.currentTime + i * slot.duration;
        oscillator.type = slot.wave; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.035, at + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, at + slot.duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(at); oscillator.stop(at + slot.duration + .01);
      });
    } catch { /* Unsupported/denied audio must never interrupt an action. */ }
  };
  const iconAnimations = new WeakMap();
  const flash = (selector, cue) => {
    const stationIcon = selector === '#lair-station-shell' || selector === '#raid-cart-action-icon';
    if (selector === '#lair-station-shell') selector = document.querySelector('#lair-panel')?.dataset.mode === 'campfire' ? '#passive-sprite' : document.querySelector('#lair-panel')?.dataset.mode === 'stash' ? '#stash-action-icon' : '#book-sprite';
    const element = document.querySelector(selector);
    if (!element) return;
    const color = cue === 'blocked' ? '#ed806e' : cue === 'pickup' ? '#edcf73' : '#b8df89';
    element.dataset.feedback = cue;
    const reduced = window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
    if (stationIcon) {
      if (element.dataset.itemType === '' && element.feedbackSnapshot) element.getContext('2d').drawImage(element.feedbackSnapshot, 0, 0);
      iconAnimations.get(element)?.cancel?.();
      const frames = reduced ? [
        { filter: 'brightness(1.18)' }, { filter: 'brightness(1)' }
      ] : [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(1.1)', filter: 'brightness(1.18)', offset: .35 },
        { transform: 'scale(.98)', filter: 'brightness(1.04)', offset: .7 },
        { transform: 'scale(1)', filter: 'brightness(1)' }
      ];
      const animation = element.animate?.(frames, { duration: reduced ? 180 : 300, easing: 'ease-out' });
      if (animation) iconAnimations.set(element, animation);
    } else element.animate?.([
      { boxShadow: `0 0 0 3px ${color}, 0 0 18px ${color}99`, filter: 'brightness(1.25)' },
      { boxShadow: `0 0 0 0px ${color}00`, filter: 'brightness(1)' }
    ], { duration: reduced ? 240 : 520, easing: 'ease-out' });
    const marker = {}; element.feedbackMarker = marker;
    window.setTimeout?.(() => {
      if (element.feedbackMarker !== marker) return;
      delete element.dataset.feedback;
      if (stationIcon && element.dataset.itemType === '' && element.feedbackSnapshot) element.getContext('2d').clearRect(0,0,element.width,element.height);
    }, stationIcon ? (reduced ? 190 : 310) : 550);
  };
  const play = (cue, selector = '#sack-grid') => { if (!cue.startsWith('dart') && !cue.startsWith('bell') && cue !== 'potionDrink' && cue !== 'orbPing' && !cue.startsWith('berry')) flash(selector, cue); sound(cue); };
  const result = (ok, cue = 'pickup', selector = '#sack-grid') => { if (!ok || cue) play(ok ? cue : 'blocked', selector); return ok; };
  const action = message => {
    if (message.type === 'throw-berry') return ['berryThrow', '#game'];
    if (message.type === 'use-orb') return ['orbPing', '#game'];
    if (['drink-disguise', 'drink-potion'].includes(message.type)) return ['potionDrink', '#game'];
    if (message.type === 'throw-bell') return ['bellThrow', '#game'];
    if (message.type === 'fire-dart') return ['dartFire', '#game'];
    if (message.type === 'pickup' || message.type === 'lift' && message.source === 'ground') return ['pickup', '#sack-panel'];
    if (message.type === 'place') return ['pickup', '#sack-grid'];
    if (['move-packed', 'rotate-packed', 'rotate'].includes(message.type)) return [null, '#sack-grid'];
    if (['take', 'return', 'stack', 'craft', 'buy', 'set-passive', 'build-potion-station', 'debug-pack'].includes(message.type)) return ['lair', '#lair-station-shell'];
    return null;
  };
  return { play, result,
    request(message) {
      const cue = action(message);
      if (!cue) return message;
      const now = performance.now();
      for (const [id, entry] of pending) if (now - entry.at > 10000) pending.delete(id);
      if (pending.size >= 96) pending.delete(pending.keys().next().value);
      const feedbackId = String(++serial);
      pending.set(feedbackId, { cue, action: message.type, at: now });
      return { ...message, feedbackId };
    },
    receive(message) {
      const entry = pending.get(message.feedbackId);
      if (!entry || message.action !== entry.action) return;
      pending.delete(message.feedbackId);
      if (performance.now() - entry.at > 10000 || typeof message.ok !== 'boolean') return;
      result(message.ok, ...entry.cue);
    },
    reset() { pending.clear(); }
  };
}
