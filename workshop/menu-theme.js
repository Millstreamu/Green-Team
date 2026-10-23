// One shared look for the lair menus: station panels, stash, map table and departure.
// A workshop stylesheet layered over the game's own; layout, text and controls are unchanged.
export const MENU_COLOR_DEFAULTS = Object.freeze({ paper: '#e0d1ab', ink: '#35412b', faded: '#626a47', frame: '#51452e', accent: '#52673b' });
export const MENU_COLOR_NAMES = Object.freeze({ paper: 'Paper', ink: 'Ink · text', faded: 'Faded text', frame: 'Frame & lines', accent: 'Accent · buttons and active' });
// The frame is a 9-slice: 16 px corners stay fixed, edges and middle repeat to fit any window.
// Slot and lock squares stretch to the slot size (64, 48 or 44 px depending on screen).
export const MENU_ART_SLOTS = Object.freeze({
  frame: { name: 'Window frame · 9-slice', width: 48, height: 48 },
  slot: { name: 'Slot square', width: 32, height: 32 },
  slotSelected: { name: 'Slot square · selected', width: 32, height: 32 },
  slotEmpty: { name: 'Slot square · empty placeholder', width: 32, height: 32 },
  lock: { name: 'Lock overlay', width: 32, height: 32 }
});
export const GAME_MENU_SELECTORS = Object.freeze({
  shell: '#lair-panel .station-shell,.route-shell',
  slot: '#lair-panel .book-choice,#lair-panel #passive-grid button',
  selected: '#lair-panel .book-choice[aria-pressed=true],#lair-panel #passive-grid button[data-highlighted=true]',
  empty: '#lair-panel .book-placeholder,#lair-panel .passive-placeholder',
  lock: '#lair-panel .recipe-lock',
  accent: '#lair-panel #book-action,#lair-panel #stash-action,.route-shell button[aria-pressed=true],.route-shell button.route-primary',
  active: '#lair-panel #passive-grid button[data-active=true]',
  line: '.route-shell button',
  inkText: '#lair-panel .passive-workspace,#lair-panel .gear-guide th,#lair-panel .book-ingredient',
  fadedText: '#lair-panel #passive-limits,#lair-panel #passive-price,#lair-panel .passive-detail small,#map-planning #route-risk',
  accentText: '#lair-panel .passive-tick,#departure-status,#map-planning .route-cards small',
  // Light key-cap badges keep dark text on any paper.
  chip: '#lair-panel #passive-key,#lair-panel #personal-xp,#lair-panel #personal-xp *,#lair-panel #book-action::before,#lair-panel #stash-action::before'
});
// Self-contained: it is also copied into the playtest page.
export function menuThemeCss(menu, s) {
  const c = menu?.colors ?? {}, art = menu?.art ?? {}, rules = [];
  const rule = (selector, body) => rules.push(`${selector}{${body}}`);
  const each = (selector, suffix) => selector.split(',').map(x => x + suffix).join(',');
  const paper = c.paper ? c.paper : 'var(--paper,#e0d1ab)';
  if (c.paper) { rule(s.shell, `background:${c.paper}!important;--paper:${c.paper}`); rule(s.selected, `background:color-mix(in srgb,${c.paper} 80%,white)!important`); rule(s.empty, `background:color-mix(in srgb,${c.paper} 88%,black)!important`); rule(s.lock, `background:color-mix(in srgb,${c.paper} 73%,transparent)!important`); }
  if (c.ink) { rule(s.shell, `color:${c.ink}!important;--ink:${c.ink}`); rule(`${s.slot},${s.inkText}`, `color:${c.ink}!important`); rule(s.chip, 'color:#35412b!important;--ink:#35412b'); }
  if (c.faded) { rule(s.shell, `--faded:${c.faded}`); rule(`${s.fadedText},${s.empty}`, `color:${c.faded}!important`); }
  if (c.frame) { const line = `color-mix(in srgb,${c.frame} 40%,${paper})`; rule(s.shell, `border-color:${c.frame}!important;--rule:${line}`); rule(`${s.slot},${s.empty},${s.line}`, `border-color:${line}!important`); }
  if (c.accent) { rule(s.shell, `--green:${c.accent}`); rule(s.accentText, `color:${c.accent}!important`); rule(s.accent, `background:${c.accent}!important;border-color:${c.accent}!important`); rule(s.active, `border-color:${c.accent}!important;background:color-mix(in srgb,${c.accent} 10%,transparent)!important`); }
  const square = src => `background:url("${src}") 0 0/100% 100% no-repeat!important;border-color:transparent!important;image-rendering:pixelated`;
  if (art.frame) rule(s.shell, `border:16px solid transparent!important;border-image:url("${art.frame}") 16 fill/16px round!important;border-radius:0!important;image-rendering:pixelated`);
  if (art.slot) rule(s.slot, square(art.slot));
  if (art.slotSelected) rule(s.selected, square(art.slotSelected) + ';outline:none!important');
  if (art.slotEmpty) rule(s.empty, square(art.slotEmpty) + ';color:transparent!important');
  if (art.lock) { rule(s.lock, `background:url("${art.lock}") 0 0/100% 100% no-repeat!important;image-rendering:pixelated`); rule(`${each(s.lock, '::before')},${each(s.lock, '::after')}`, 'display:none!important'); }
  return rules.join('\n');
}
