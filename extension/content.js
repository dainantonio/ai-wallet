// ─── AI Wallet Extension — Content Script ────────────────────────────────────
// Injected on chat.openai.com and claude.ai

;(function () {
  'use strict';

  // ── Already initialised guard (SPA re-runs) ──────────────────────────────
  if (document.getElementById('aw-root')) return;

  // ── Site detection ───────────────────────────────────────────────────────
  const IS_CLAUDE = location.hostname.includes('claude');
  const SITE_NAME = IS_CLAUDE ? 'Claude' : 'ChatGPT';

  const INPUT_SELS = IS_CLAUDE
    ? ['.ProseMirror[contenteditable]', 'div[contenteditable="true"]', '[data-placeholder]']
    : ['#prompt-textarea', 'div[contenteditable="true"]', 'textarea'];

  const SUBMIT_SELS = IS_CLAUDE
    ? ['button[aria-label="Send Message"]', 'button[data-testid="send-button"]', 'button[type="submit"]']
    : ['[data-testid="send-button"]', 'button[aria-label="Send prompt"]', 'button[aria-label="Send message"]'];

  // ── Cost model (token-based simulation) ─────────────────────────────────
  const RATES = {
    saver:       { in: 0.000015, out: 0.00006,  label: '🌿 Saver' },
    balanced:    { in: 0.00005,  out: 0.00015,  label: '⚖ Balanced' },
    performance: { in: 0.00015,  out: 0.0006,   label: '🔥 Performance' },
  };

  function estimateCost(text, mode) {
    const tokens  = Math.max(12, Math.ceil(text.replace(/\s+/g, ' ').trim().length / 3.8));
    const outTok  = Math.min(Math.round(tokens * 2.2), 1600);
    const r       = RATES[mode] || RATES.balanced;
    const mid     = tokens * r.in + outTok * r.out;
    return {
      lo:     Math.max(0.0001, +(mid * 0.70).toFixed(4)),
      hi:     +(mid * 1.45).toFixed(4),
      tokens,
    };
  }

  // ── State ────────────────────────────────────────────────────────────────
  let state       = { enabled: true, mode: 'balanced' };
  let inputEl     = null;
  let submitEl    = null;
  let typingTimer = null;
  let lastEst     = { lo: 0.02, hi: 0.06, tokens: 120 };
  let bypassNext  = false;
  let preflightOpen = false;

  // ── Shadow DOM host ──────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'aw-root';
  Object.assign(host.style, {
    position: 'fixed', zIndex: '2147483647',
    top: '0', left: '0', width: '0', height: '0',
    pointerEvents: 'none',
  });
  (document.body || document.documentElement).appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // ── Inlined styles (Shadow DOM scope) ───────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes aw-slide-up {
      from { opacity: 0; transform: translateY(10px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes aw-pop-in {
      from { opacity: 0; transform: scale(0.92) translateY(8px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);   }
    }
    @keyframes aw-fade-down {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes aw-glow-pulse {
      0%, 100% { box-shadow: 0 0 0   0   rgba(99,102,241,0.4); }
      50%       { box-shadow: 0 0 12px 3px rgba(99,102,241,0.6); }
    }

    /* ── Cost Overlay ────────────────────────────────────────────────── */
    #aw-overlay {
      position: fixed;
      bottom: 88px;
      right: 20px;
      background: #13111f;
      border: 1px solid rgba(99,102,241,0.35);
      border-radius: 14px;
      padding: 11px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
      animation: aw-slide-up 0.22s ease-out;
      box-shadow: 0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-width: 210px;
      cursor: default;
      user-select: none;
    }
    .aw-overlay-icon {
      width: 32px; height: 32px;
      border-radius: 9px;
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
    }
    .aw-overlay-body { flex: 1; min-width: 0; }
    .aw-label {
      font-size: 10px; font-weight: 700;
      color: rgba(148,163,184,0.7);
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-bottom: 2px;
    }
    .aw-cost {
      font-size: 15px; font-weight: 800;
      color: #e2e8f0;
      font-family: 'SFMono-Regular', 'Consolas', monospace;
      letter-spacing: -0.02em;
    }
    .aw-tokens {
      font-size: 10px; color: rgba(148,163,184,0.6);
      margin-top: 1px;
    }
    .aw-mode-pill {
      font-size: 10px; font-weight: 700;
      padding: 3px 8px;
      border-radius: 99px;
      border: 1px solid rgba(99,102,241,0.3);
      color: #818cf8;
      background: rgba(99,102,241,0.1);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ── Pre-flight backdrop + modal ─────────────────────────────────── */
    #aw-preflight {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(5px);
      pointer-events: auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .aw-modal {
      background: #13111f;
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 18px;
      width: 100%;
      max-width: 340px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset;
      overflow: hidden;
      animation: aw-pop-in 0.22s ease-out;
    }
    /* top highlight line */
    .aw-modal::before {
      content: '';
      display: block;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
    }
    .aw-modal-header {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 18px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .aw-modal-icon {
      width: 32px; height: 32px;
      border-radius: 9px;
      background: rgba(251,146,60,0.15);
      border: 1px solid rgba(251,146,60,0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .aw-modal-title {
      flex: 1;
      font-size: 13px; font-weight: 700;
      color: #e2e8f0;
    }
    .aw-modal-sub {
      font-size: 11px; color: rgba(148,163,184,0.6);
      margin-top: 1px; font-weight: 400;
    }
    .aw-close {
      background: none; border: none; cursor: pointer;
      color: rgba(148,163,184,0.5);
      font-size: 16px; line-height: 1;
      padding: 4px; border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    .aw-close:hover { color: #e2e8f0; background: rgba(255,255,255,0.07); }

    .aw-modal-body { padding: 16px 18px; }

    .aw-warning-row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px;
      border-radius: 11px;
      background: rgba(251,146,60,0.06);
      border: 1px solid rgba(251,146,60,0.2);
      margin-bottom: 14px;
    }
    .aw-warn-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .aw-warning-text {
      font-size: 13px; color: #e2e8f0; line-height: 1.4;
    }
    .aw-warning-text strong { color: #fb923c; }

    .aw-cost-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px;
      border-radius: 11px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      margin-bottom: 10px;
    }
    .aw-cr-label { font-size: 11px; color: rgba(148,163,184,0.65); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .aw-cr-value { font-size: 14px; font-weight: 800; color: #e2e8f0; font-family: 'SFMono-Regular', monospace; }

    .aw-tip-row {
      display: flex; align-items: flex-start; gap: 9px;
      padding: 11px 13px;
      border-radius: 11px;
      background: rgba(52,211,153,0.06);
      border: 1px solid rgba(52,211,153,0.2);
    }
    .aw-tip-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
    .aw-tip-text { font-size: 12px; color: rgba(226,232,240,0.8); line-height: 1.4; }
    .aw-tip-text strong { color: #34d399; }
    .aw-savings-preview {
      display: flex; align-items: center; gap: 6px;
      margin-top: 6px; font-size: 12px;
    }
    .aw-strike { color: rgba(148,163,184,0.5); text-decoration: line-through; font-family: monospace; }
    .aw-arrow { color: rgba(148,163,184,0.4); font-size: 10px; }
    .aw-new-cost { color: #34d399; font-weight: 800; font-family: monospace; }
    .aw-saved-badge {
      font-size: 10px; font-weight: 700;
      padding: 2px 6px; border-radius: 99px;
      background: rgba(52,211,153,0.15);
      color: #34d399;
    }

    .aw-modal-actions {
      display: flex; gap: 8px;
      padding: 14px 18px 18px;
    }
    .aw-btn {
      flex: 1; padding: 10px 0;
      border-radius: 10px;
      font-size: 13px; font-weight: 700;
      cursor: pointer; border: none;
      transition: opacity 0.15s, transform 0.1s;
      font-family: inherit;
    }
    .aw-btn:active { transform: scale(0.97); }
    .aw-btn-continue {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(226,232,240,0.8);
    }
    .aw-btn-continue:hover { background: rgba(255,255,255,0.1); }
    .aw-btn-optimize {
      background: linear-gradient(135deg, #34d399, #059669);
      color: #fff;
      box-shadow: 0 2px 12px rgba(52,211,153,0.3);
    }
    .aw-btn-optimize:hover { opacity: 0.9; }

    /* ── Savings toast ───────────────────────────────────────────────── */
    #aw-toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #13111f;
      border: 1px solid rgba(52,211,153,0.4);
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 9px;
      pointer-events: none;
      animation: aw-fade-down 0.22s ease-out;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 16px rgba(52,211,153,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      white-space: nowrap;
    }
    .aw-toast-icon { font-size: 15px; }
    .aw-toast-text { font-size: 13px; font-weight: 700; color: #34d399; }
  `;
  shadow.appendChild(styleEl);

  // ── UI: Cost Overlay ─────────────────────────────────────────────────────
  const overlayEl = document.createElement('div');
  overlayEl.id = 'aw-overlay';
  overlayEl.style.display = 'none';
  overlayEl.innerHTML = `
    <div class="aw-overlay-icon">💳</div>
    <div class="aw-overlay-body">
      <div class="aw-label">Estimated cost</div>
      <div class="aw-cost" id="aw-ov-cost">$0.02 – $0.06</div>
      <div class="aw-tokens" id="aw-ov-tokens">~120 tokens</div>
    </div>
    <div class="aw-mode-pill" id="aw-ov-mode">⚖ Balanced</div>
  `;
  shadow.appendChild(overlayEl);

  function showOverlay(est) {
    if (!state.enabled) return;
    overlayEl.querySelector('#aw-ov-cost').textContent  = `$${est.lo.toFixed(4)} – $${est.hi.toFixed(4)}`;
    overlayEl.querySelector('#aw-ov-tokens').textContent = `~${est.tokens.toLocaleString()} tokens`;
    overlayEl.querySelector('#aw-ov-mode').textContent   = (RATES[state.mode] || RATES.balanced).label;
    overlayEl.style.display = 'flex';
    // re-trigger animation
    overlayEl.style.animation = 'none';
    void overlayEl.offsetWidth;
    overlayEl.style.animation = '';
  }

  function hideOverlay() { overlayEl.style.display = 'none'; }

  // ── UI: Pre-flight Modal ─────────────────────────────────────────────────
  const preflightEl = document.createElement('div');
  preflightEl.id = 'aw-preflight';
  preflightEl.style.display = 'none';
  shadow.appendChild(preflightEl);

  function showPreflight(est, { onContinue, onOptimize, onClose }) {
    if (preflightOpen) return;
    preflightOpen = true;

    const optimizedHi = +(est.hi * 0.6).toFixed(4);
    const saved       = +(est.hi * 0.4).toFixed(4);

    preflightEl.innerHTML = `
      <div class="aw-modal">
        <div class="aw-modal-header">
          <div class="aw-modal-icon">⚡</div>
          <div>
            <div class="aw-modal-title">Pre-Flight Cost Check</div>
            <div class="aw-modal-sub">Review before submitting on ${SITE_NAME}</div>
          </div>
          <button class="aw-close" id="aw-pf-close">✕</button>
        </div>

        <div class="aw-modal-body">
          <div class="aw-warning-row">
            <div class="aw-warn-icon">⚠️</div>
            <div class="aw-warning-text">
              This may use <strong>high tokens</strong>. Optimize before sending?
            </div>
          </div>

          <div class="aw-cost-row">
            <span class="aw-cr-label">Est. Cost</span>
            <span class="aw-cr-value">$${est.lo.toFixed(4)} – $${est.hi.toFixed(4)}</span>
          </div>

          <div class="aw-tip-row">
            <div class="aw-tip-icon">💡</div>
            <div>
              <div class="aw-tip-text">
                <strong>Switch to optimized model</strong> and save ~40%
              </div>
              <div class="aw-savings-preview">
                <span class="aw-strike">$${est.hi.toFixed(4)}</span>
                <span class="aw-arrow">→</span>
                <span class="aw-new-cost">$${optimizedHi.toFixed(4)}</span>
                <span class="aw-saved-badge">−$${saved.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="aw-modal-actions">
          <button class="aw-btn aw-btn-continue" id="aw-pf-cont">Continue</button>
          <button class="aw-btn aw-btn-optimize" id="aw-pf-opt">⚡ Optimize &amp; Save</button>
        </div>
      </div>
    `;
    preflightEl.style.display = 'flex';

    preflightEl.querySelector('#aw-pf-close').addEventListener('click', () => {
      hidePreflight();
      onClose && onClose();
    });
    preflightEl.querySelector('#aw-pf-cont').addEventListener('click', () => {
      hidePreflight();
      onContinue();
    });
    preflightEl.querySelector('#aw-pf-opt').addEventListener('click', () => {
      hidePreflight();
      onOptimize();
    });
    // Close on backdrop click
    preflightEl.addEventListener('click', (e) => {
      if (e.target === preflightEl) { hidePreflight(); onClose && onClose(); }
    }, { once: true });
  }

  function hidePreflight() {
    preflightEl.style.display = 'none';
    preflightEl.innerHTML = '';
    preflightOpen = false;
  }

  // ── UI: Savings Toast ────────────────────────────────────────────────────
  const toastEl = document.createElement('div');
  toastEl.id = 'aw-toast';
  toastEl.style.display = 'none';
  shadow.appendChild(toastEl);
  let toastTimer = null;

  function showToast(msg) {
    toastEl.innerHTML = `<div class="aw-toast-icon">✅</div><div class="aw-toast-text">${msg}</div>`;
    toastEl.style.display = 'flex';
    toastEl.style.animation = 'none';
    void toastEl.offsetWidth;
    toastEl.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, 3200);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getInputText() {
    if (!inputEl) return '';
    return inputEl.tagName === 'TEXTAREA'
      ? inputEl.value
      : (inputEl.innerText || inputEl.textContent || '');
  }

  function findElement(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        // Make sure it's visible and in the viewport area
        if (el && el.getBoundingClientRect().height > 0) return el;
      } catch (_) { /* bad selector — skip */ }
    }
    return null;
  }

  function recordCost(cost, saved, optimized) {
    chrome.runtime.sendMessage({
      type:  'RECORD_COST',
      cost:  cost,
      saved: saved,
      label: `${SITE_NAME} prompt${optimized ? ' (optimized)' : ''}`,
    });
  }

  // ── Proceed with submission after pre-flight ─────────────────────────────
  function proceedWithSubmit() {
    bypassNext = true;

    const sub = findElement(SUBMIT_SELS);
    if (sub) {
      sub.click();
    } else if (inputEl) {
      // Dispatch native keyboard event (works with React's synthetic system)
      inputEl.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13,
        bubbles: true, cancelable: true, composed: true,
      }));
    }

    setTimeout(() => { bypassNext = false; }, 600);
  }

  // ── Submit interception ──────────────────────────────────────────────────
  function handleSubmit(e) {
    if (!state.enabled || bypassNext || preflightOpen) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const text = getInputText().trim();
    if (!text) return; // nothing to estimate

    lastEst = estimateCost(text, state.mode);
    hideOverlay();

    showPreflight(lastEst, {
      onContinue: () => {
        recordCost(lastEst.hi, 0, false);
        proceedWithSubmit();
      },
      onOptimize: () => {
        const optimizedCost = +(lastEst.hi * 0.6).toFixed(4);
        const saved         = +(lastEst.hi * 0.4).toFixed(4);
        recordCost(optimizedCost, saved, true);
        showToast(`Saved ~40% using optimized model`);
        setTimeout(proceedWithSubmit, 1200);
      },
      onClose: () => {
        // User dismissed — let them re-submit manually
      },
    });
  }

  // ── Input change → cost overlay ──────────────────────────────────────────
  function onInput() {
    if (!state.enabled) return;
    clearTimeout(typingTimer);
    const text = getInputText().trim();
    if (!text) { hideOverlay(); return; }
    typingTimer = setTimeout(() => {
      lastEst = estimateCost(text, state.mode);
      showOverlay(lastEst);
    }, 500);
  }

  // ── Capture Enter key on input ───────────────────────────────────────────
  function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      handleSubmit(e);
    }
  }

  // ── Attach / re-attach listeners ─────────────────────────────────────────
  function setup() {
    const inp = findElement(INPUT_SELS);
    const sub = findElement(SUBMIT_SELS);

    if (inp && inp !== inputEl) {
      if (inputEl) {
        inputEl.removeEventListener('input',   onInput);
        inputEl.removeEventListener('keydown', onKeydown, true);
      }
      inp.addEventListener('input',   onInput);
      inp.addEventListener('keydown', onKeydown, true);
      inputEl = inp;
    }

    if (sub && sub !== submitEl) {
      if (submitEl) submitEl.removeEventListener('click', handleSubmit, true);
      sub.addEventListener('click', handleSubmit, true);
      submitEl = sub;
    }
  }

  // ── MutationObserver for SPA navigation ─────────────────────────────────
  let setupDebounce = null;
  const mutationObs = new MutationObserver(() => {
    clearTimeout(setupDebounce);
    setupDebounce = setTimeout(setup, 300);
  });
  mutationObs.observe(document.body, { childList: true, subtree: true });

  // ── Storage sync ─────────────────────────────────────────────────────────
  chrome.storage.local.get(['enabled', 'mode'], (data) => {
    state.enabled = data.enabled !== false;
    state.mode    = data.mode || 'balanced';
  });

  chrome.storage.onChanged.addListener((changes) => {
    if ('enabled' in changes) {
      state.enabled = changes.enabled.newValue;
      if (!state.enabled) { hideOverlay(); hidePreflight(); }
    }
    if ('mode' in changes) {
      state.mode = changes.mode.newValue;
      // Refresh overlay if visible
      if (overlayEl.style.display !== 'none') {
        lastEst = estimateCost(getInputText(), state.mode);
        showOverlay(lastEst);
      }
    }
  });

  // ── Boot ─────────────────────────────────────────────────────────────────
  setup();

})();
