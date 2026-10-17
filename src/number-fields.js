// Reused numeric controls for both builder sections.
export function createNumberFields(container, prefix, fields, onEdit) {
  const nodes = new Map();
  for (const f of fields) {
    const scale = f.scale ?? 1;
    const label = document.createElement('label'), title = document.createElement('span'), input = document.createElement('input');
    title.textContent = `${f.label}${f.unit ? ' · ' + f.unit : ''} (${f.min * scale}–${f.max * scale})`;
    Object.assign(input, { type: 'number', min: f.min * scale, max: f.max * scale, step: (f.step ?? 1) * scale, required: true, id: prefix + f.id });
    input.addEventListener('input', onEdit); label.replaceChildren(title, input); container.appendChild(label); nodes.set(f.id, input);
  }
  return {
    read() { return Object.fromEntries(fields.map(f => [f.id, nodes.get(f.id).value === '' ? null : Number(nodes.get(f.id).value) / (f.scale ?? 1)])); },
    write(values) { for (const f of fields) nodes.get(f.id).value = Math.round(values[f.id] * (f.scale ?? 1) * 10000) / 10000; },
    disable(locked) { for (const node of nodes.values()) node.disabled = locked; }
  };
}
