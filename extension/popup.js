// ─── AI Wallet Extension — Popup ─────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

// ── DOM refs ──────────────────────────────────────────────────────────────────
const toggleEl      = $('toggle-enabled');
const sessionSpend  = $('session-spend');
const totalSaved    = $('total-saved');
const lastCost      = $('last-cost');
const lastLabel     = $('last-label');
const resetBtn      = $('reset-btn');
const shell         = document.querySelector('.shell');

// ── Format helpers ────────────────────────────────────────────────────────────
const fmt = (n) => '$' + (n || 0).toFixed(4);

// ── Render state into UI ──────────────────────────────────────────────────────
function render(data) {
  const enabled = data.enabled !== false;
  const mode    = data.mode || 'balanced';
  const spend   = data.sessionSpend  || 0;
  const saved   = data.totalSaved    || 0;
  const lCost   = data.lastActionCost || 0;
  const lLabel  = data.lastActionLabel || '';

  // Toggle
  toggleEl.checked = enabled;
  shell.classList.toggle('disabled', !enabled);

  // Stats
  sessionSpend.textContent = fmt(spend);
  totalSaved.textContent   = '+' + fmt(saved);

  // Last action
  if (lCost > 0 && lLabel && lLabel !== '—') {
    lastCost.textContent  = fmt(lCost);
    lastCost.classList.add('has-value');
    lastLabel.textContent = lLabel;
    lastLabel.classList.add('has-value');
  } else {
    lastCost.textContent  = '—';
    lastCost.classList.remove('has-value');
    lastLabel.textContent = 'No tasks yet this session';
    lastLabel.classList.remove('has-value');
  }

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// ── Load initial state ────────────────────────────────────────────────────────
chrome.storage.local.get(
  ['enabled', 'mode', 'sessionSpend', 'totalSaved', 'lastActionCost', 'lastActionLabel'],
  render,
);

// ── Toggle enabled ────────────────────────────────────────────────────────────
toggleEl.addEventListener('change', () => {
  const enabled = toggleEl.checked;
  chrome.storage.local.set({ enabled });
  shell.classList.toggle('disabled', !enabled);
});

// ── Mode buttons ──────────────────────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    chrome.storage.local.set({ mode });
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Reset session ─────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'RESET_SESSION' }, () => {
    render({
      enabled:         toggleEl.checked,
      mode:            document.querySelector('.mode-btn.active')?.dataset.mode || 'balanced',
      sessionSpend:    0,
      totalSaved:      0,
      lastActionCost:  0,
      lastActionLabel: '—',
    });
  });
});

// ── Live updates from background / content script ─────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  chrome.storage.local.get(
    ['enabled', 'mode', 'sessionSpend', 'totalSaved', 'lastActionCost', 'lastActionLabel'],
    render,
  );
});
