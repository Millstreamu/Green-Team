import { DEPARTURE } from './config.js';
// Architecture selects layout; difficulty independently sets danger/rewards.
export const JOBS = Object.freeze({ manor: Object.freeze({ name: 'Human Manor', description: 'Varied rooms and branching halls.' }), hold: Object.freeze({ name: 'Dwarf Hold', description: 'Large rectangular halls and wide passages.' }), sanctuary: Object.freeze({ name: 'Elf Sanctuary', description: 'Small connected chambers and winding routes.' }) });
export const DIFFICULTIES = Object.freeze({
  normal: Object.freeze({ name: 'Normal', extraGuards: 0, rareBonus: 0, goldMultiplier: 1 }),
  hard: Object.freeze({ name: 'Hard', extraGuards: 2, rareBonus: .15, goldMultiplier: 1.5 })
});
export function selectJob(jobId, difficultyId) {
  if (!Object.hasOwn(JOBS, jobId) || !Object.hasOwn(DIFFICULTIES, difficultyId)) return null;
  const difficulty = DIFFICULTIES[difficultyId];
  return Object.freeze({ jobId, jobName: JOBS[jobId].name, difficultyId, difficultyName: difficulty.name, extraGuards: difficulty.extraGuards, rareBonus: difficulty.rareBonus, goldMultiplier: difficulty.goldMultiplier });
}

export function jobSummary(job) {
  return job.extraGuards ? `${job.extraGuards} extra guards cover more rooms. Better odds of rare valuables; sale prices +${Math.round((job.goldMultiplier - 1) * 100)}% (rounded per item).` : 'Current guard coverage. Standard treasure odds and sale prices.';
}

export function createDeparture(participants = ['goblin'], destination = {}) {
  return { participants: [...new Set(participants)], aboard: new Set(), countdown: null, launched: false,
    selection: selectJob(destination.jobId, destination.difficultyId) ?? selectJob('manor', 'normal') };
}
export function setDestination(cart, jobId, difficultyId) {
  const selection = selectJob(jobId, difficultyId);
  if (!selection || cart.launched) return false;
  cart.selection = selection; return true; // Ready means ready to go, not destination approval.
}
export function toggleCartSeat(cart, playerId) {
  if (cart.launched || !cart.participants.includes(playerId)) return null;
  if (cart.aboard.has(playerId)) { cart.aboard.delete(playerId); cart.countdown = null; return false; }
  cart.aboard.add(playerId);
  if (cart.participants.length && cart.participants.every(id => cart.aboard.has(id))) cart.countdown = DEPARTURE.countdown;
  return true;
}
export function tickDeparture(cart, dt) {
  if (cart.launched || cart.countdown === null || dt <= 0) return null;
  if (!cart.participants.length || !cart.participants.every(id => cart.aboard.has(id))) { cart.countdown = null; return null; }
  cart.countdown = Math.max(0, cart.countdown - dt);
  if (cart.countdown > .000001) return null;
  cart.launched = true; cart.countdown = 0;
  return Object.freeze({ ...cart.selection });
}
