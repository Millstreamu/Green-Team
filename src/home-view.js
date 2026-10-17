import { PROGRESSION } from './config.js';
export function createHomeView(send) {
  const $ = selector => document.querySelector(selector);
  let recent = [];
  $('#join-lair-form').addEventListener('submit', event => {
    event.preventDefault(); $('#home-message').textContent = 'Joining lair…';
    send({ type: 'join-lair', name: $('#join-lair-name').value, code: $('#join-lair-code').value });
  });
  $('#create-lair-form').addEventListener('submit', event => {
    event.preventDefault(); $('#home-message').textContent = 'Creating lair…';
    send({ type: 'create-lair', name: $('#create-lair-name').value });
  });
  $('#recent-lairs').addEventListener('change', () => {
    const lair = recent.find(l => l.id === $('#recent-lairs').value);
    if (lair) { $('#join-lair-name').value = lair.name; $('#join-lair-code').value = ''; $('#join-lair-code').focus(); }
  });
  return {
    message(text) { $('#home-message').textContent = text; },
    show(state, connected) {
      $('#home-screen').hidden = false; $('#game-shell').hidden = true;
      $('#home-goblin-name').textContent = state.name;
      $('#home-level').textContent = `Level ${state.level}`;
      $('#home-xp').textContent = `${state.profile.xp} XP available · ${state.profile.earnedXp} lifetime XP`;
      const progress = state.profile.earnedXp % PROGRESSION.levelXp;
      $('#home-level-progress').max = PROGRESSION.levelXp; $('#home-level-progress').value = progress;
      $('#home-level-detail').textContent = `${progress} / ${PROGRESSION.levelXp} XP toward next level`;
      $('#join-lair').disabled = !connected; $('#create-lair').disabled = !connected;
      const next = state.recentLairs ?? [];
      if (JSON.stringify(recent) !== JSON.stringify(next)) {
        recent = next;
        const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Choose a previous lair…';
        $('#recent-lairs').replaceChildren(placeholder, ...recent.map(l => {
          const option = document.createElement('option'); option.value = l.id; option.textContent = l.name; return option;
        }));
      }
      $('#recent-label').hidden = !recent.length;
    },
    hide() { $('#home-screen').hidden = true; $('#game-shell').hidden = false; }
  };
}
