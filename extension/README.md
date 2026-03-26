# AI Wallet — Chrome Extension

Real-time AI cost awareness inside ChatGPT and Claude.

## Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The AI Wallet icon appears in your toolbar

## How it works

| Site | Supported |
|------|-----------|
| chat.openai.com | ✅ |
| claude.ai | ✅ |

### While you type
A small overlay appears in the bottom-right corner showing:
- Estimated cost range (`$0.02 – $0.06`)
- Approximate token count
- Current spend mode

### Before you submit
A pre-flight modal intercepts the prompt:
- Shows estimated cost
- Offers a cheaper model recommendation with savings preview
- **Continue** — submits as-is and records cost
- **Optimize & Save** — routes to optimized model, saves ~40%, then submits

### After optimizing
A toast notification confirms: `✅ Saved ~40% using optimized model`

## Popup

Click the extension icon to see:
- **Session Spend** — total cost this browser session
- **Total Saved** — cumulative savings from optimization
- **Last Action** — most recent task label and cost
- **Spend Mode** — switch between Saver / Balanced / Performance
- **ON/OFF toggle** — disable all overlays without uninstalling
- **Reset session** — clears session stats
- **Open Dashboard** — links to the full AI Wallet web app

## Spend Modes

| Mode | Input rate | Effect |
|------|-----------|--------|
| 🌿 Saver | Lowest | Max savings, lighter models |
| ⚖ Balanced | Medium | Smart cost/quality mix |
| 🔥 Performance | Highest | Best models, full speed |

Changing the mode in the popup updates cost estimates in real time.

## Files

```
extension/
├── manifest.json      — Manifest V3 config
├── background.js      — Service worker (storage, message handling)
├── content.js         — Injected on ChatGPT + Claude (overlay, pre-flight)
├── popup.html         — Popup structure
├── popup.css          — Popup styles (dark theme)
├── popup.js           — Popup logic
└── icons/
    └── icon.svg       — Extension icon
```

## Notes

- **No real API calls** — all cost estimates are simulated based on token count
- Content script uses Shadow DOM so styles never conflict with the host page
- MutationObserver handles SPA navigation (new chats, page changes)
- All state persists in `chrome.storage.local` across sessions
