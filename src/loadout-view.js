import { selectJob, jobSummary } from './jobs.js';
import { itemCells } from './loot.js';

// The map station confirms a destination; boarding/departure happens elsewhere.
export function createMapPlanningView(dialog, onConfirm, getCurrent, getBag = () => [], onCancel = () => {}) {
  const jobChoice = document.querySelector('#job-choice'), difficulty = document.querySelector('#difficulty-choice');
  const summary = document.querySelector('#planning-sack'), start = document.querySelector('#confirm-job');
  const refresh = () => {
    const job = selectJob(jobChoice.value, difficulty.value), bag = getBag();
    start.disabled = !job;
    document.querySelector('#job-preview').textContent = job ? `${job.jobName} · ${job.difficultyName}. ${jobSummary(job)}` : 'Choose a valid job and difficulty.';
    const used = bag.reduce((n, item) => n + itemCells(item).length, 0);
    summary.textContent = `Packed sack: ${used} / 9 squares · ${9 - used} free for loot. Return to the stash or workbench to change supplies.`;
  };
  const cancel = () => { dialog.close(); onCancel(); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  document.querySelector('#close-map').addEventListener('click', cancel);
  jobChoice.addEventListener('change', refresh); difficulty.addEventListener('change', refresh);
  start.addEventListener('click', () => {
    const job = selectJob(jobChoice.value, difficulty.value);
    if (!job || onConfirm(job) === false) { refresh(); return; }
    dialog.close();
  });
  return { open() { const selected = getCurrent(); jobChoice.value = selected.jobId; difficulty.value = selected.difficultyId; refresh(); dialog.showModal(); difficulty.focus(); } };
}
