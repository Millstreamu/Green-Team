// First contract reuses the current room generator; more job layouts can follow.
export const JOBS = Object.freeze({ manor: Object.freeze({ name: 'Human Manor', description: 'Search the rooms, evade the guards and bring the haul home.' }) });
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
