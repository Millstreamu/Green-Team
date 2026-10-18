// Native Help disclosure stays inside the game screen and scrolls independently.
export function setupGameScreen(canvas) {
  const help = document.querySelector('#game-help');
  if (!help) return;
  help.addEventListener('toggle', () => { if (!help.open) canvas.focus(); });
  help.addEventListener('keydown', event => {
    if (event.code !== 'Escape' || !help.open) return;
    event.preventDefault(); event.stopPropagation(); help.open = false; canvas.focus();
  });
}
