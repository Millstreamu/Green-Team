import { TRAPS, SMOKE, DART, BELL, DISGUISE, VANISH, SCRY, RESCUE, BERRY, LUCKY, PROGRESSION } from './config.js';
import { AWARENESS } from './passive-effects.js';

// Menu wording for gear and abilities. {placeholders} are filled from the live effect
// values below, so reworded text still states the numbers the game actually uses.
const percent = value => Math.round(value * 100);
export const MENU_WORD_VALUES = Object.freeze({
  berries: () => ({ blindSeconds: BERRY.blindSeconds, range: BERRY.range }),
  bell: () => ({ investigateSeconds: BELL.investigateSeconds, hearingRange: BELL.hearingRange, range: BELL.range, inspectSeconds: BELL.inspectSeconds }),
  snare: () => ({ holdTime: TRAPS.holdTime }),
  smoke: () => ({ duration: SMOKE.duration, radius: SMOKE.radius }),
  lucky: () => ({ bonus: percent(LUCKY.goldChanceBonus), passiveBonus: percent(LUCKY.passiveGoldChanceBonus) }),
  vanish: () => ({ seconds: VANISH.seconds }),
  disguise: () => ({ seconds: DISGUISE.seconds, recognitionRange: DISGUISE.recognitionRange }),
  dart: () => ({ sleepSeconds: DART.sleepSeconds, range: DART.range }),
  orb: () => ({ seconds: SCRY.seconds, count: SCRY.count }),
  lunch: () => ({ reviveSeconds: RESCUE.reviveSeconds }),
  quickSearch: () => ({ bonus: percent(PROGRESSION.quickSearchBonus) }),
  quietHands: () => ({}),
  luckyGoblin: () => ({ bonus: percent(LUCKY.passiveGoldChanceBonus), withPotion: percent(LUCKY.passiveGoldChanceBonus + LUCKY.goldChanceBonus) }),
  panicSprint: () => ({ bonus: percent(AWARENESS.sprintBonus), seconds: AWARENESS.sprintSeconds, cooldown: AWARENESS.sprintCooldown }),
  hideSense: () => ({}),
  searchVeil: () => ({ seconds: AWARENESS.veilSeconds })
});
export const GEAR_WORDS = Object.freeze({
  berries: { summary: '{blindSeconds}s blind / lunch ingredient', effect: 'A thrown berry up to {range} tiles blinds the first guard hit for {blindSeconds}s and breaks their chase.', limits: 'Throwing spends one portion, including misses, and breaks disguise. Walls/solid props/locks stop it. No refresh while already blind; sleeping guards stay asleep. Keep berries for workbench lunches instead if needed.' },
  bell: { summary: '{investigateSeconds}s distraction', effect: 'Guards within {hearingRange} tiles by walking path investigate. Throw range {range} tiles; inspect for {inspectSeconds}s, ending within {investigateSeconds}s of the ring.', limits: 'Visible goblins take priority. Sleeping, snared, attacking or carrying guards and fixed jailers ignore it. Needs a clear landing. Throwing breaks disguise.' },
  snare: { summary: '{holdTime}s guard hold', effect: 'Step clear to arm it. The first guard is held for {holdTime}s.', limits: 'A goblin can waste an armed snare. Placing breaks disguise; aiming and cancelling do not.' },
  smoke: { summary: '{duration}s sight cover', effect: 'Smoke blocks guard sight across a {radius}-tile radius for {duration}s.', limits: 'Guards can still follow their existing search; smoke does not stun or revive. Deploying breaks disguise.' },
  lucky: { summary: '+{bonus} percentage points gold-coin chance', effect: 'Your completed searches are {bonus} percentage points more likely to contain gold coins for the rest of this run.', limits: 'One dose per run; no extra potion stacking. Lucky Goblin adds another {passiveBonus} percentage points. Bonus coins are shared floor loot and sell normally. Does not boost silver, copper or sale prices. Damage, searching and gear use preserve luck; new runs reset it. Drinking breaks concealment. Brew at the potion station with 1 berries + 1 scrap.' },
  vanish: { summary: '{seconds}s invisibility', effect: 'Guards cannot see you for up to {seconds}s, even nearby.', limits: 'Taking a hit or using gear ends it. Searching ends it unless Quiet Hands is active. Existing guard searches and committed attacks continue. No damage immunity, refresh or stacking with disguise. Brew at the potion station with 2 mushrooms + 1 cloth.' },
  disguise: { summary: '{seconds}s guard disguise', effect: 'Look like a guard for {seconds}s. Guards beyond {recognitionRange} tile cannot recognise you by sight.', limits: 'Brew at the built potion station with mushrooms and berries. Close guards use normal sight checks. Searching or successful gear use breaks it. No damage immunity, stacking or refresh while active.' },
  dart: { summary: '{sleepSeconds}s sleep', effect: 'A straight shot up to {range} tiles sleeps the first guard hit for {sleepSeconds}s.', limits: 'Walls, solid furniture and locked gates stop it. Misses spend the dart. Sleep cannot be extended by another hit. Firing breaks disguise.' },
  orb: { summary: '{seconds}s team map snapshot', effect: 'The {count} nearest guards’ positions appear as purple diamonds on everyone\'s map for {seconds}s.', limits: 'Marks stay where the guards were when pinged. Fewer guards give fewer marks. Activation breaks disguise; it does not distract guards.' },
  lunch: { summary: 'Revive a teammate', effect: 'Consumes one lunch to revive a downed teammate with one health. Team play only.', limits: 'Movement or damage interrupts revival without spending it. Spending the lunch breaks disguise. Cage rescue needs no lunch. Known from the start. Craft at the workbench with one meat and one berries, then keep it packed.' }
});
export const ABILITY_WORDS = Object.freeze({
  quickSearch: { effect: 'Search containers {bonus}% faster.', limits: 'Only while active. Applies to your searches.' },
  quietHands: { effect: 'Searching containers preserves your invisibility.', limits: 'Vanish keeps its timer. Hits and gear still break it; disguises still break on search.' },
  luckyGoblin: { effect: '+{bonus} percentage points to finding gold coins.', limits: 'Your searches only. With Lucky potion: +{withPotion} points. No effect on sale prices.' },
  panicSprint: { effect: 'Move {bonus}% faster for {seconds} seconds when a guard spots you.', limits: '{cooldown}-second cooldown. Further guards do not stack or refresh it.' },
  hideSense: { effect: 'While hiding, see the nearest guard on your map.', limits: 'Amber square · your map only. Ends when you leave hiding.' },
  searchVeil: { effect: 'After searching, guards take twice as long to notice you for {seconds} seconds.', limits: 'Completed searches only, including empty containers. Existing chases continue.' }
});
export function fillMenuWords(text, id) {
  const values = MENU_WORD_VALUES[id]?.() ?? {};
  return text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
