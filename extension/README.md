# AI Wallet — Cost Tracker

A Chrome browser extension that monitors your AI tool usage and tracks spending in real-time across ChatGPT, Claude, and Google Gemini.

## Features

- **Real-time Cost Tracking**: Automatically estimates costs as you use AI tools
- **Floating Widget**: Displays current session cost in a non-intrusive bottom-right widget
- **Daily Dashboard**: View today's total spending and breakdown by tool
- **Session Management**: Reset session costs with one click
- **Multi-Platform Support**: Works with ChatGPT, Claude, and Google Gemini
- **Persistent Storage**: Daily totals automatically reset at midnight

## Installation

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Navigate to the `extension/` folder and select it
5. The extension will appear in your extensions list

### Verifying Installation

- You should see the AI Wallet icon (💰) in your Chrome toolbar
- Visit any supported AI tool (ChatGPT, Claude, or Gemini)
- A floating cost widget should appear in the bottom-right corner

## Usage

### Floating Widget

The floating widget displays in the bottom-right corner of supported AI tool pages:

- **Top line**: Estimated cost of the last message sent
- **Bottom line**: Total session cost since the page was loaded
- **Click to open**: Click the widget to open the full dashboard

### Popup Dashboard

Click the extension icon in your toolbar to open the dashboard:

- **Today's Total**: Aggregate spending across all AI tools
- **Breakdown by Tool**: Individual costs for ChatGPT, Claude, and Gemini
- **Session Cost**: Total spent in the current browser session
- **Reset Session**: Clear the session cost counter
- **View Full Report**: Opens the complete AI Wallet dashboard

### Dashboard Link

The extension includes a link to the full AI Wallet dashboard:
https://ai-wallet--therussellfam20.replit.app

## Supported AI Tools

- **ChatGPT** (chat.openai.com, chatgpt.com)
- **Claude** (claude.ai)
- **Google Gemini** (gemini.google.com)

## Cost Estimation

The extension estimates costs based on:

- **Message length**: Converted to approximate token count (1 token ≈ 4 characters)
- **Tool pricing**: Uses current API pricing for each platform
  - ChatGPT: ~$0.003 per 1,000 tokens
  - Claude: ~$0.003 per 1,000 tokens
  - Gemini: ~$0.0001 per 1,000 tokens

**Note**: These are estimates based on visible message length. Actual costs may vary based on model selection and API usage.

## Storage

- **Daily Data**: Stored in Chrome's local storage, automatically reset at midnight
- **Session Cost**: Tracked for the current browser session
- **No Cloud Sync**: All data remains local to your browser

## Troubleshooting

### Widget Not Appearing

- Ensure the extension is loaded in Developer mode
- Verify you're on a supported AI tool website
- Refresh the page (Ctrl+R or Cmd+R)
- Check that the extension has permission to run on the current site

### Costs Not Updating

- Ensure the content script is enabled for the current domain
- Try refreshing the page
- Check the browser console for any error messages (F12 → Console tab)

### Reset Daily Costs

Daily costs automatically reset at midnight. To manually reset:

1. Open the extension popup
2. Click **Reset Session** (this resets the current session only)
3. For daily totals, wait until midnight or clear browser storage

## Development

### Project Structure

```
extension/
├── manifest.json      # Extension configuration
├── content.js         # DOM monitoring and cost tracking
├── popup.html         # Dashboard UI
├── popup.js           # Dashboard logic
├── icon.png           # Extension icon
└── README.md          # This file
```

### Modifying Cost Estimates

Edit the `estimateCost()` function in `content.js` to adjust pricing:

```javascript
function estimateCost(messageLength, tool) {
  const estimatedTokens = Math.ceil(messageLength / 4);
  // Adjust costPerToken values for each tool
}
```

## Privacy

- All cost tracking happens locally in your browser
- No data is sent to external servers (except when you click "View Full Report")
- Extension storage is private to your browser profile

## License

MIT License — Feel free to modify and distribute

## Support

For issues or feature requests, visit the AI Wallet dashboard:
https://ai-wallet--therussellfam20.replit.app
