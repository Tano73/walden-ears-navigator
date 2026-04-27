'use strict';

/* ── EARS type metadata ─────────────────────────────────────────── */
const EARS_META = {
  'event-driven': { label: '⚡ event-driven', cssClass: 'card--event',      badgeClass: 'badge--event'      },
  'unwanted':     { label: '⚠ unwanted',      cssClass: 'card--unwanted',   badgeClass: 'badge--unwanted'   },
  'state-driven': { label: '🔄 state-driven',  cssClass: 'card--state',      badgeClass: 'badge--state'      },
  'ubiquitous':   { label: '✅ ubiquitous',    cssClass: 'card--ubiquitous', badgeClass: 'badge--ubiquitous' },
};

/* ── EARS keyword highlighting ──────────────────────────────────── */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EARS_KW_RE = /(the system SHALL)|\b(WHEN|WHILE|IF|THEN|WHERE|DURING)\b/g;

function highlightEARS(text) {
  return escapeHtml(text).replace(EARS_KW_RE, '<strong>$&</strong>');
}

/* ── EARS Help data ─────────────────────────────────────────────── */
const EARS_HELP = {
  'event-driven': {
    title:    'Event-Driven',
    template: 'WHEN [trigger event], the system SHALL [response]',
    fields: [
      { name: 'trigger event', desc: "L'evento esterno o utente che attiva il comportamento (es. click, submit, timeout)" },
      { name: 'response',      desc: "La risposta osservabile del sistema all'evento" },
    ],
    example: 'WHEN l\'utente clicca "Salva", the system SHALL persistere i dati e mostrare un messaggio di conferma',
  },
  'unwanted': {
    title:    'Unwanted Behavior',
    template: 'IF [unwanted condition], THEN the system SHALL [response]',
    fields: [
      { name: 'unwanted condition', desc: "La condizione di errore, input non valido o evento indesiderato" },
      { name: 'response',           desc: "La risposta del sistema (THEN è obbligatorio — non omettere THEN dopo IF)" },
    ],
    example: "IF il file caricato supera 10 MB, THEN the system SHALL rifiutare il caricamento e mostrare un errore",
  },
  'state-driven': {
    title:    'State-Driven',
    template: 'WHILE [precondition], the system SHALL [response]',
    fields: [
      { name: 'precondition', desc: "Lo stato o condizione attiva che deve essere vera perché il comportamento si applichi" },
      { name: 'response',     desc: "Il comportamento continuo del sistema mentre la condizione è attiva" },
    ],
    example: "WHILE la sincronizzazione è in corso, the system SHALL mostrare un indicatore di caricamento",
  },
  'ubiquitous': {
    title:    'Ubiquitous',
    template: 'The system SHALL [response]',
    fields: [
      { name: 'response', desc: "Il comportamento invariante, sempre attivo indipendentemente da trigger o stato (es. invarianti, proprietà di sistema)" },
    ],
    example: "The system SHALL garantire che nessun requisito abbia lo stesso ID in un progetto",
  },
};

/* ── State ──────────────────────────────────────────────────────── */
let _lastFocused = null;
let _helpFocused = null;

/* ── Modal ──────────────────────────────────────────────────────── */
function openModal(ac, group) {
  const meta = EARS_META[ac.type] || EARS_META['ubiquitous'];
  document.getElementById('modal-id').textContent    = ac.id;
  const badge = document.getElementById('modal-badge');
  badge.textContent  = meta.label;
  badge.className    = `modal-badge ${meta.badgeClass}`;
  document.getElementById('modal-text').innerHTML          = highlightEARS(ac.text);
  document.getElementById('modal-parent-id').textContent  = group.id;
  document.getElementById('modal-parent-title').textContent = group.title;
  document.getElementById('modal-user-story').textContent = group.userStory;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-close').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  if (_lastFocused) { _lastFocused.focus(); _lastFocused = null; }
}

/* ── Help Popup ─────────────────────────────────────────────────── */
function initHelpOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'help-overlay';
  overlay.className = 'hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'help-title');
  overlay.innerHTML = `
    <div class="help-popup">
      <div class="help-header">
        <span id="help-title" class="help-title"></span>
        <span id="help-type-badge" class="help-type-badge"></span>
        <button class="help-close" aria-label="Chiudi aiuto">✕</button>
      </div>
      <div class="help-body">
        <span class="help-section-label">Template sintattico</span>
        <p class="help-template" id="help-template"></p>
        <span class="help-section-label">Campi obbligatori</span>
        <ul class="help-fields" id="help-fields"></ul>
        <span class="help-section-label">Esempio</span>
        <p class="help-example" id="help-example"></p>
      </div>
    </div>
  `;
  overlay.querySelector('.help-close').addEventListener('click', closeHelpPopup);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeHelpPopup(); });
  document.body.appendChild(overlay);
}

function openHelpPopup(type) {
  const data = EARS_HELP[type];
  if (!data) return;
  const meta = EARS_META[type];

  document.getElementById('help-title').textContent = data.title;

  const badge = document.getElementById('help-type-badge');
  badge.textContent = meta ? meta.label : type;
  badge.className = `help-type-badge ${meta ? meta.badgeClass : ''}`;

  document.getElementById('help-template').textContent = data.template;

  const fieldsList = document.getElementById('help-fields');
  fieldsList.innerHTML = '';
  data.fields.forEach(f => {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'help-field-name';
    nameSpan.textContent = `[${f.name}]`;
    const descSpan = document.createElement('span');
    descSpan.textContent = f.desc;
    li.appendChild(nameSpan);
    li.appendChild(descSpan);
    fieldsList.appendChild(li);
  });

  document.getElementById('help-example').textContent = data.example;

  const overlay = document.getElementById('help-overlay');
  overlay.classList.remove('hidden');
  overlay.querySelector('.help-close').focus();
}

function closeHelpPopup() {
  const overlay = document.getElementById('help-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  if (_helpFocused) { _helpFocused.focus(); _helpFocused = null; }
}

function initStatBadges() {
  const badgeTypes = [
    { selector: '.badge--event',      type: 'event-driven' },
    { selector: '.badge--unwanted',   type: 'unwanted'     },
    { selector: '.badge--state',      type: 'state-driven' },
    { selector: '.badge--ubiquitous', type: 'ubiquitous'   },
  ];
  badgeTypes.forEach(({ selector, type }) => {
    const el = document.querySelector(`aside ${selector}`);
    if (!el) return;
    el.setAttribute('data-help', type);
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Aiuto sul tipo EARS: ${type}`);
    const handler = () => { _helpFocused = el; openHelpPopup(type); };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

/* ── Card ───────────────────────────────────────────────────────── */
function renderCard(ac, group) {
  const meta = EARS_META[ac.type] || EARS_META['ubiquitous'];
  const card = document.createElement('div');
  card.className = `card ${meta.cssClass}`;
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${ac.id}: ${ac.text.substring(0, 60)}`);

  card.innerHTML = `
    <div class="card-top">
      <span class="card-id">${ac.id}</span>
      <span class="card-badge">${meta.label}</span>
    </div>
    <p class="card-text">${highlightEARS(ac.text)}</p>
  `;

  const openHandler = () => { _lastFocused = card; openModal(ac, group); };
  card.addEventListener('click', openHandler);
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHandler(); } });
  return card;
}

/* ── Accordion ──────────────────────────────────────────────────── */
function renderAccordion(groups) {
  const container = document.getElementById('accordion');
  container.innerHTML = '';

  if (!groups || groups.length === 0) {
    container.innerHTML = '<p class="empty">Nessun requisito trovato per questo progetto.</p>';
    return;
  }

  groups.forEach((group, idx) => {
    const section = document.createElement('div');
    section.className = 'accordion-section';

    const header = document.createElement('button');
    header.className = `accordion-header${idx === 0 ? ' open' : ''}`;
    header.setAttribute('aria-expanded', idx === 0 ? 'true' : 'false');
    header.innerHTML = `
      <span class="acc-toggle">▶</span>
      <span class="acc-id">${group.id}</span>
      <span class="acc-title">${group.title}</span>
      <span class="acc-count">${group.criteria.length} AC</span>
    `;

    const body = document.createElement('div');
    body.className = `accordion-body${idx === 0 ? ' open' : ''}`;

    // User Story
    if (group.userStory) {
      const us = document.createElement('p');
      us.className = 'user-story';
      us.textContent = group.userStory;
      body.appendChild(us);
    }

    // Card grid
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    group.criteria.forEach(ac => grid.appendChild(renderCard(ac, group)));
    body.appendChild(grid);

    header.addEventListener('click', () => {
      const isOpen = header.classList.contains('open');
      header.classList.toggle('open', !isOpen);
      header.setAttribute('aria-expanded', String(!isOpen));
      body.classList.toggle('open', !isOpen);
    });

    section.appendChild(header);
    section.appendChild(body);
    container.appendChild(section);
  });
}

/* ── Stats ──────────────────────────────────────────────────────── */
function renderStats(stats) {
  document.getElementById('stat-total').textContent      = stats.total;
  document.getElementById('stat-event').textContent      = stats.byType['event-driven'] || 0;
  document.getElementById('stat-unwanted').textContent   = stats.byType['unwanted']      || 0;
  document.getElementById('stat-state').textContent      = stats.byType['state-driven']  || 0;
  document.getElementById('stat-ubiquitous').textContent = stats.byType['ubiquitous']    || 0;

  const groupsEl = document.getElementById('stat-groups');
  groupsEl.innerHTML = '';
  Object.entries(stats.byGroup).forEach(([id, count]) => {
    const row = document.createElement('div');
    row.className = 'stat-group-row';
    row.innerHTML = `<span class="stat-group-id">${id}</span><span>${count}</span>`;
    groupsEl.appendChild(row);
  });
}

/* ── Load project ───────────────────────────────────────────────── */
async function loadProject(name) {
  try {
    const res  = await fetch(`/api/projects/${name}/requirements`);
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('accordion').innerHTML = `<p class="empty">Errore: ${data.error}</p>`;
      return;
    }
    renderAccordion(data.groups);
    renderStats(data.stats);
  } catch (err) {
    document.getElementById('accordion').innerHTML = `<p class="empty">Errore di rete: ${err.message}</p>`;
  }
}

/* ── Init ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Modal close handlers
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const helpOverlay = document.getElementById('help-overlay');
    if (helpOverlay && !helpOverlay.classList.contains('hidden')) {
      closeHelpPopup();
      e.stopPropagation();
    } else {
      closeModal();
    }
  }, { capture: true });

  // Help popup init
  initHelpOverlay();
  initStatBadges();

  // Load projects
  const select = document.getElementById('project-select');
  try {
    const res  = await fetch('/api/projects');
    const data = await res.json();

    if (!data.projects || data.projects.length === 0) {
      document.getElementById('accordion').innerHTML = '<p class="empty">Nessun progetto disponibile in .walden/specs/</p>';
      return;
    }

    data.projects.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    // Load first project automatically
    await loadProject(data.projects[0]);

    // On change
    select.addEventListener('change', () => loadProject(select.value));

  } catch (err) {
    document.getElementById('accordion').innerHTML = `<p class="empty">Errore caricamento progetti: ${err.message}</p>`;
  }
});
