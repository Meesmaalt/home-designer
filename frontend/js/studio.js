/** Presentation only: keep the original controls and their event handlers. */
function menu(label, id, nodes) {
  const details = document.createElement('details');
  details.className = 'studio-menu';
  details.id = id;
  const summary = document.createElement('summary');
  summary.textContent = label;
  const content = document.createElement('div');
  content.className = 'studio-menu-content';
  content.setAttribute('aria-label', label);
  nodes.filter(Boolean).forEach(node => content.append(node));
  details.append(summary, content);
  details.addEventListener('toggle', () => {
    summary.setAttribute('aria-expanded', String(details.open));
    if (details.open) document.querySelectorAll('.studio-menu').forEach(other => { if (other !== details) other.open = false; });
  });
  content.addEventListener('click', e => { if (e.target.closest('button')) details.open = false; });
  return details;
}
const byId = id => document.getElementById(id);
const actions = document.querySelector('.top-actions');
const projectMenu = menu('Projekt', 'project-menu', [
  byId('btn-new'), byId('btn-open'), byId('btn-save'), document.querySelector('.template-selector-wrap'),
  byId('btn-my-projects'), document.querySelector('.auth-chip'),
]);
const toolsMenu = menu('Tööriistad', 'tools-menu', [
  byId('btn-open-blueprint'), byId('btn-open-3d-export'), byId('btn-open-energy'), byId('btn-open-sun-study'),
  byId('btn-toggle-wall-layers'), byId('btn-toggle-framing'), byId('btn-toggle-zen'),
  document.querySelector('.shading-modes'), byId('mode-walk'), byId('btn-photo-mode'),
]);
actions.querySelectorAll('.top-divider').forEach(el => el.remove());
actions.prepend(projectMenu);
actions.insertBefore(toolsMenu, byId('btn-cloud-save'));
const redo = document.createElement('button');
redo.id = 'btn-redo'; redo.className = 'icon-button'; redo.textContent = '↷';
redo.title = 'Tee uuesti (Ctrl+Shift+Z)'; redo.setAttribute('aria-label', 'Tee uuesti');
byId('btn-undo').after(redo);
const hud = byId('hud');
const keep = new Set(['btn-reset-view', 'btn-zoom-out', 'btn-zoom-in', 'btn-roof', 'btn-grid', 'btn-dims']);
const extra = Array.from(hud.children).filter(el => !keep.has(el.id) && !el.classList.contains('hud-divider'));
hud.querySelectorAll('.hud-divider').forEach(el => el.remove());
hud.append(menu('Kuva', 'display-menu', extra));

const labels = {
  'btn-save': 'Laadi fail alla', 'btn-my-projects': 'Minu projektid', 'btn-toggle-zen': 'Keskendumisvaade',
  'btn-open-blueprint': 'Plaani eksport', 'btn-open-3d-export': '3D-mudeli eksport',
  'btn-open-energy': 'Energia', 'btn-open-sun-study': 'Päikese analüüs',
  'btn-toggle-wall-layers': 'Seinakihtide vaade', 'btn-toggle-framing': 'Karkassi vaade',
  'btn-photo-mode': 'Fotorežiim', 'mode-walk': 'Jalutuskäik',
  'tab-rooms': 'Ruumid', 'tab-style': 'Stiilid',
};
Object.entries(labels).forEach(([id, text]) => { if (byId(id)) byId(id).textContent = text; });
byId('btn-toggle-framing').title = 'Karkassi vaade (K)';
document.querySelector('.brand-copy small').textContent = 'Sinu ruum. Sinu plaan.';
document.querySelector('.project-kicker').textContent = 'Töölaud';
document.querySelector('.save-state').textContent = 'Kohalik töölaud';
document.querySelector('.save-state').setAttribute('role', 'status');
byId('status-text').setAttribute('role', 'status');
document.querySelector('#catalog .eyebrow').textContent = 'Kujunda oma kodu';
document.querySelector('#catalog h2').textContent = 'Alusta ruumist';
document.querySelector('#props-panel .eyebrow').textContent = 'Ülevaade';
document.querySelector('#props-panel h2').textContent = 'Omadused';
document.querySelector('.shortcut-help').textContent = 'V Vali · W Sein · G Liiguta · R Pööra · Ctrl+Z Võta tagasi';
document.querySelectorAll('.studio-menu-content button').forEach(button => button.classList.remove('icon-button'));
document.addEventListener('click', e => {
  document.querySelectorAll('.studio-menu[open]').forEach(el => { if (!el.contains(e.target)) el.open = false; });
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.studio-menu[open]').forEach(el => { el.open = false; el.querySelector('summary').focus(); });
});

// Dialogs remain usable with a keyboard, including dialogs opened by the editor.
let lastDialog = null;
let returnFocus = null;
document.querySelectorAll('.modal').forEach(modal => {
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  const title = modal.querySelector('h2, h3, [id$="title"]');
  if (title) { if (!title.id) title.id = modal.id + '-title'; modal.setAttribute('aria-labelledby', title.id); }
  const observer = new MutationObserver(() => {
    if (!modal.classList.contains('hidden')) {
      if (lastDialog !== modal) { returnFocus = document.activeElement; lastDialog = modal; }
      modal.querySelector('input, button, select, textarea')?.focus();
    } else if (lastDialog === modal) { lastDialog = null; returnFocus?.focus(); }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
});
document.addEventListener('keydown', e => {
  if (!lastDialog) return;
  if (e.key === 'Escape') { lastDialog.classList.add('hidden'); e.stopImmediatePropagation(); }
  if (e.key === 'Tab') {
    const focusable = [...lastDialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
      .filter(el => !el.disabled && el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}, true);
