import { selectJob, jobSummary } from './jobs.js';
import { itemCells } from './loot.js';

// Departure only chooses a job; supplies were already packed at home.
export function createLoadoutView(dialog, onStart, getBag = () => [], onCancel = () => {}) {
  const jobChoice = document.querySelector('#job-choice'), difficulty = document.querySelector('#difficulty-choice');
  const summary = document.querySelector('#loadout-total'), start = document.querySelector('#start-run');
  const refresh = () => {
    const job = selectJob(jobChoice.value, difficulty.value), bag = getBag();
    start.disabled = !job;
    document.querySelector('#job-preview').textContent = job ? `${job.jobName} · ${job.difficultyName}. ${jobSummary(job)}` : 'Choose a valid job and difficulty.';
    const used = bag.reduce((n, item) => n + itemCells(item).length, 0);
    summary.textContent = `Packed sack: ${used} / 9 squares · ${9 - used} free for loot. Return to the stash or workbench to change supplies.`;
  };
  const cancel = () => { dialog.close(); onCancel(); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  document.querySelector('#cancel-loadout').addEventListener('click', cancel);
  jobChoice.addEventListener('change', refresh); difficulty.addEventListener('change', refresh);
  start.addEventListener('click', () => {
    const job = selectJob(jobChoice.value, difficulty.value);
    if (!job || onStart(job) === false) { refresh(); return; }
    dialog.close();
  });
  return { open() { refresh(); dialog.showModal(); difficulty.focus(); } };
}
