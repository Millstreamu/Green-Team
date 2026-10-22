import { TRAPS, SMOKE, DART, BELL, DISGUISE, VANISH, SCRY, RESCUE, BERRY } from './config.js';
import { LOOT_TYPES, SACK, itemCells } from './loot.js';
import { RECIPES } from './lair.js';
import { knowsRecipe } from './profile.js';

export const GEAR_TYPES = Object.freeze(['bell', 'snare', 'smoke', 'disguise', 'vanish', 'lucky', 'dart', 'orb', 'lunch', 'berries']);
export function gearDetails(type) {
  const entries = {
    berries: { summary: `${BERRY.blindSeconds}s blind / lunch ingredient`, controls: 'E equip → move → Space aim → Space throw. Esc cancels aim.', effect: `A thrown berry up to ${BERRY.range} tiles blinds the first guard hit for ${BERRY.blindSeconds}s and breaks their chase.`, limits: 'Throwing spends one portion, including misses, and breaks disguise. Walls/solid props/locks stop it. No refresh while already blind; sleeping guards stay asleep. Keep berries for workbench lunches instead if needed.' },
    bell: { summary: `${BELL.investigateSeconds}s distraction`, controls: 'E equip → move → Space aim → Space throw. Esc cancels aim.', effect: `Guards within ${BELL.hearingRange} tiles by walking path investigate. Throw range ${BELL.range} tiles; inspect for ${BELL.inspectSeconds}s, ending within ${BELL.investigateSeconds}s of the ring.`, limits: 'Visible goblins take priority. Sleeping, snared, attacking or carrying guards and fixed jailers ignore it. Needs a clear landing. Throwing breaks disguise.' },
    snare: { summary: `${TRAPS.holdTime}s guard hold`, controls: `E equip → release E → WASD aim → hold E ${TRAPS.placeTime}s to place. Esc cancels.`, effect: `Step clear to arm it. The first guard is held for ${TRAPS.holdTime}s.`, limits: 'A goblin can waste an armed snare. Placing breaks disguise; aiming and cancelling do not.' },
    smoke: { summary: `${SMOKE.duration}s sight cover`, controls: 'E equip → move → Space deploys one bomb.', effect: `Smoke blocks guard sight across a ${SMOKE.radius}-tile radius for ${SMOKE.duration}s.`, limits: 'Guards can still follow their existing search; smoke does not stun or revive. Deploying breaks disguise.' },
    lucky: { summary: '+5 percentage points gold-coin chance', controls: 'E equip → move → Space drinks the selected bottle.', effect: 'Your completed searches are 5 percentage points more likely to contain gold coins for the rest of this run.', limits: 'One dose per run; no extra potion stacking. Lucky Goblin adds another 5 percentage points. Bonus coins are shared floor loot and sell normally. Does not boost silver, copper or sale prices. Damage, searching and gear use preserve luck; new runs reset it. Drinking breaks concealment. Brew at the potion station with 1 berries + 1 scrap.' },
    vanish: { summary: `${VANISH.seconds}s invisibility`, controls: 'E equip → move → Space drinks the selected bottle.', effect: `Guards cannot see you for up to ${VANISH.seconds}s, even nearby.`, limits: 'Taking a hit or using gear ends it. Searching ends it unless Quiet Hands is active. Existing guard searches and committed attacks continue. No damage immunity, refresh or stacking with disguise. Brew at the potion station with 2 mushrooms + 1 cloth.' },
    disguise: { summary: `${DISGUISE.seconds}s guard disguise`, controls: 'E equip → move → Space drinks the selected bottle.', effect: `Look like a guard for ${DISGUISE.seconds}s. Guards beyond ${DISGUISE.recognitionRange} tile cannot recognise you by sight.`, limits: 'Brew at the built potion station with mushrooms and berries. Close guards use normal sight checks. Searching or successful gear use breaks it. No damage immunity, stacking or refresh while active.' },
    dart: { summary: `${DART.sleepSeconds}s sleep`, controls: 'E equip → move → Space aim → Space fire. Esc cancels aim.', effect: `A straight shot up to ${DART.range} tiles sleeps the first guard hit for ${DART.sleepSeconds}s.`, limits: 'Walls, solid furniture and locked gates stop it. Misses spend the dart. Sleep cannot be extended by another hit. Firing breaks disguise.' },
    orb: { summary: `${SCRY.seconds}s team map snapshot`, controls: 'E equip → move → Space pings once. Open Map to see marks.', effect: `The ${SCRY.count} nearest guards’ positions appear as purple diamonds on everyone's map for ${SCRY.seconds}s.`, limits: 'Marks stay where the guards were when pinged. Fewer guards give fewer marks. Activation breaks disguise; it does not distract guards.' },
    lunch: { summary: 'Revive a teammate', controls: `Keep it packed; hold E near a downed teammate for ${RESCUE.reviveSeconds}s. No equip needed.`, effect: 'Consumes one lunch to revive a downed teammate with one health. Team play only.', limits: 'Movement or damage interrupts revival without spending it. Spending the lunch breaks disguise. Cage rescue needs no lunch. Known from the start. Craft at the workbench with one meat and one berries, then keep it packed.' }
  };
  if (!entries[type]) return null;
  const recipe = RECIPES[type];
  return { type, name: LOOT_TYPES[type].name, ...entries[type], footprint: '1 sack square · 1 use',
    xp: recipe?.xpCost ?? null, materials: recipe?.materials ?? null,
    cost: type === 'berries' ? 'Found resource · throw one portion or bank it for cooking' : recipe ? `${recipe.xpCost ? `${recipe.xpCost} XP recipe` : 'Recipe known from the start'} · craft ${Object.entries(recipe.materials).map(([item, n]) => `${n} ${item}`).join(' + ')}` : 'No recipe or crafting cost set. Pack an existing lunch.' };
}
export const SUGGESTED_LOADOUTS = Object.freeze({
  distraction: { name: 'Distraction', items: { bell: 2, smoke: 1 }, plan: 'Throw a bell before entering a watched route. Keep smoke for breaking sight if spotted.' },
  sneaking: { name: 'Sneaking', items: { orb: 1, disguise: 1, dart: 1 }, plan: 'Ping first, then drink the disguise and cross. Keep the dart for a guard blocking your route; firing ends the disguise.' },
  rescue: { name: 'Team rescue', items: { lunch: 1, smoke: 1, orb: 1 }, plan: 'Ping to plan the approach, use smoke for cover, then hold E to revive. Craft a Packed Lunch at the workbench first, or pack one from shared stock.' }
});
export function loadoutStatus(id, bag, camp, profile) {
  const kit = SUGGESTED_LOADOUTS[id]; if (!kit) return null;
  const capacity = SACK.width * SACK.height, used = bag.reduce((n, i) => n + itemCells(i).length, 0);
  const rows = Object.entries(kit.items).map(([type, needed]) => ({ type, needed, name: LOOT_TYPES[type].name,
    packed: bag.filter(i => i.type === type).length, stock: camp.counts[type] ?? 0 }));
  const missing = rows.reduce((n, row) => n + Math.max(0, row.needed - row.packed), 0);
  const materials = {}, noRecipe = []; let unlockXp = 0;
  for (const row of rows) {
    const recipe = RECIPES[row.type];
    if (!recipe) { noRecipe.push(row.name); continue; }
    if (!knowsRecipe(profile, row.type)) unlockXp += recipe.xpCost;
    for (const [type, n] of Object.entries(recipe.materials)) materials[type] = (materials[type] ?? 0) + n * row.needed;
  }
  const slots = rows.reduce((n, row) => n + row.needed, 0);
  return { ...kit, rows, slots, lootSpace: capacity - slots, used, missing, fits: used + missing <= capacity,
    freeAfterPacking: Math.max(0, capacity - used - missing), unlockXp, materials, noRecipe };
}
