// ─── AI Wallet Extension — Background Service Worker ─────────────────────────

const DEFAULTS = {
  enabled:         true,
  mode:            'balanced',
  sessionSpend:    0,
  totalSaved:      0,
  lastActionCost:  0,
  lastActionLabel: '—',
  taskCount:       0,
};

// Initialise storage on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set(DEFAULTS);
  }
});

// Listen for cost recording from content scripts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'RECORD_COST') {
    chrome.storage.local.get(
      ['sessionSpend', 'totalSaved', 'taskCount'],
      (data) => {
        chrome.storage.local.set({
          sessionSpend:    +((data.sessionSpend  || 0) + msg.cost).toFixed(6),
          totalSaved:      +((data.totalSaved    || 0) + (msg.saved || 0)).toFixed(6),
          lastActionCost:  msg.cost,
          lastActionLabel: msg.label,
          taskCount:       (data.taskCount || 0) + 1,
        });
        sendResponse({ ok: true });
      }
    );
    return true; // keep message channel open for async response
  }

  if (msg.type === 'RESET_SESSION') {
    chrome.storage.local.set({
      sessionSpend:    0,
      totalSaved:      0,
      lastActionCost:  0,
      lastActionLabel: '—',
      taskCount:       0,
    });
    sendResponse({ ok: true });
  }
});
