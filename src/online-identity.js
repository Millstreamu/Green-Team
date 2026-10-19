// Browser-held keys identify goblins only on this local test server. This is
// separate from the standalone game's camp/profile saves, and is not login.
const KEY = 'green-team-online-goblins-v1';
const TAB_KEY = 'green-team-test-token';
export function createOnlineIdentity(storage, tabStorage) {
  let entries = [], selected, remembered = true;
  function refresh() {
    try {
      const saved = JSON.parse(storage?.getItem(KEY) ?? '[]');
      if (Array.isArray(saved)) {
        const valid = saved.filter(p => typeof p?.token === 'string' && p.token.length > 0 && p.token.length <= 64
          && typeof p.name === 'string' && p.name.length <= 128);
        entries = [...new Map([...entries, ...valid].map(p => [p.token, p])).values()];
      }
    } catch { remembered = false; }
  }
  refresh();
  try { selected = tabStorage?.getItem(TAB_KEY); } catch {}
  if (selected == null) selected = entries[0]?.token;
  function persist() {
    try { if (!storage) throw new Error('Unavailable'); storage.setItem(KEY, JSON.stringify(entries)); remembered = true; }
    catch { remembered = false; }
  }
  return {
    token: () => selected || undefined,
    list: () => { refresh(); return entries.map(p => ({ ...p })); },
    remembered: () => remembered,
    select(token) {
      selected = token || '';
      try { tabStorage?.setItem(TAB_KEY, selected); } catch {}
    },
    remember(token, name) {
      refresh();
      // An unknown key means a new server/home; replace that stale browser entry.
      if (selected && selected !== token) entries = entries.filter(p => p.token !== selected);
      selected = token;
      const entry = entries.find(p => p.token === token);
      if (entry?.name !== name) {
        if (entry) entry.name = name; else entries.push({ token, name });
        persist();
      }
      try { tabStorage?.setItem(TAB_KEY, token); } catch {}
    }
  };
}
