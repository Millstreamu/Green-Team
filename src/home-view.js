import { PROGRESSION } from './config.js';
export function createHomeView(send) {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#home-panel');
  let recent = [], owned = [], backTo = null, opener = null, shownId = null;
  const message = text => { $('#home-message').textContent = text; $('#home-panel-message').textContent = text; };
  const closePanel = (restoreFocus = true) => {
    if (dialog.open) dialog.close();
    backTo = null;
    if (restoreFocus) opener?.focus();
    opener = null;
  };
  const openPanel = (name, source = null, parent = null) => {
    if (!dialog.open) opener = source;
    backTo = parent;
    const titles = { join: 'Join friends', create: owned.length ? 'Create another lair' : 'Create your lair', profile: 'Your goblin', options: 'Options' };
    $('#home-panel-title').textContent = titles[name];
    for (const key of Object.keys(titles)) $(`#home-${key}-panel`).hidden = key !== name;
    $('#home-panel-message').textContent = '';
    if (!dialog.open) dialog.showModal();
    const focus = { join: '#join-lair-name', create: '#create-lair-name', profile: '#home-goblin-choice', options: '#home-options-profile' };
    $(focus[name]).focus();
  };
  $('#home-join-entry').addEventListener('click', () => openPanel('join', $('#home-join-entry')));
  $('#home-create-entry').addEventListener('click', () => openPanel('create', $('#home-create-entry')));
  $('#home-profile-entry').addEventListener('click', () => openPanel('profile', $('#home-profile-entry')));
  $('#home-options-entry').addEventListener('click', () => openPanel('options', $('#home-options-entry')));
  $('#home-options-profile').addEventListener('click', () => openPanel('profile', null, 'options'));
  $('#home-create-another').addEventListener('click', () => openPanel('create', null, 'options'));
  $('#home-panel-back').addEventListener('click', () => { if (backTo) openPanel(backTo); else closePanel(); });
  $('#home-panel-close').addEventListener('click', () => closePanel());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
  const ownedName = () => { $('#home-owned-name').textContent = owned.find(l => l.id === $('#owned-lairs').value)?.name ?? 'Your lair'; };
  $('#owned-lairs').addEventListener('change', ownedName);
  $('#enter-owned-lair').addEventListener('click', () => {
    message('Entering your lair…');
    send({ type: 'enter-owned-lair', id: $('#owned-lairs').value });
  });
  $('#join-lair-form').addEventListener('submit', event => {
    event.preventDefault(); message('Joining lair…');
    send({ type: 'join-lair', name: $('#join-lair-name').value, code: $('#join-lair-code').value });
  });
  $('#create-lair-form').addEventListener('submit', event => {
    event.preventDefault(); message('Creating lair…');
    send({ type: 'create-lair', name: $('#create-lair-name').value });
  });
  $('#recent-lairs').addEventListener('change', () => {
    const lair = recent.find(l => l.id === $('#recent-lairs').value);
    if (lair) { $('#join-lair-name').value = lair.name; $('#join-lair-code').value = ''; $('#join-lair-code').focus(); }
  });
  return {
    message,
    show(state, connected) {
      if (shownId && state.selfId && shownId !== state.selfId) closePanel(false);
      shownId = state.selfId ?? shownId;
      $('#home-screen').hidden = false; $('#game-shell').hidden = true;
      $('#home-goblin-name').textContent = state.name;
      $('#home-level').textContent = `Level ${state.level}`;
      $('#home-xp').textContent = `${state.profile.xp} XP available · ${state.profile.earnedXp} lifetime XP`;
      const progress = state.profile.earnedXp % PROGRESSION.levelXp;
      $('#home-level-progress').max = PROGRESSION.levelXp; $('#home-level-progress').value = progress;
      $('#home-level-detail').textContent = `${progress} / ${PROGRESSION.levelXp} XP toward next level`;
      $('#join-lair').disabled = !connected; $('#create-lair').disabled = !connected;
      $('#home-create-entry').disabled = !connected; $('#home-join-entry').disabled = !connected;
      const nextOwned = state.ownedLairs ?? [];
      if (JSON.stringify(owned) !== JSON.stringify(nextOwned)) {
        const previous = $('#owned-lairs').value;
        owned = nextOwned;
        $('#owned-lairs').replaceChildren(...owned.map(l => {
          const option = document.createElement('option'); option.value = l.id; option.textContent = l.name; return option;
        }));
        $('#owned-lairs').value = owned.some(l => l.id === previous) ? previous : owned[0]?.id ?? '';
      }
      $('#owned-lair-section').hidden = !owned.length;
      $('#home-first-lair').hidden = !!owned.length;
      $('#home-create-another').hidden = !owned.length;
      $('#owned-lair-picker').hidden = owned.length < 2;
      $('#enter-owned-lair').disabled = !connected || !owned.length;
      ownedName();
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
    hide() { closePanel(false); $('#home-screen').hidden = true; $('#game-shell').hidden = false; }
  };
}
