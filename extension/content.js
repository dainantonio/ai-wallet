/**
 * AI Wallet — Cost Tracker
 * Content Script: Monitors AI tool usage and tracks costs
 */

// Utility: Detect which AI tool the user is on
function detectAITool() {
  const url = window.location.href;
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    return 'ChatGPT';
  } else if (url.includes('claude.ai')) {
    return 'Claude';
  } else if (url.includes('gemini.google.com')) {
    return 'Gemini';
  }
  return 'Unknown';
}

// Utility: Estimate cost based on message length
// Rough estimates: ChatGPT ~$0.003 per 1000 tokens, Claude ~$0.003 per 1000 tokens, Gemini ~$0.0001 per 1000 tokens
function estimateCost(messageLength, tool) {
  // Estimate tokens (roughly 4 characters = 1 token)
  const estimatedTokens = Math.ceil(messageLength / 4);
  
  let costPerToken = 0;
  switch (tool) {
    case 'ChatGPT':
      costPerToken = 0.000003; // $0.003 per 1000 tokens
      break;
    case 'Claude':
      costPerToken = 0.000003; // $0.003 per 1000 tokens
      break;
    case 'Gemini':
      costPerToken = 0.0000001; // $0.0001 per 1000 tokens
      break;
    default:
      costPerToken = 0.000001;
  }
  
  return estimatedTokens * costPerToken;
}

// Utility: Format cost as currency
function formatCost(cost) {
  return '$' + cost.toFixed(4);
}

// Initialize storage and get today's data
async function initializeDailyStorage() {
  const today = new Date().toDateString();
  const data = await chrome.storage.local.get(['dailyData', 'lastResetDate']);
  
  // Reset if it's a new day
  if (data.lastResetDate !== today) {
    await chrome.storage.local.set({
      dailyData: {
        ChatGPT: 0,
        Claude: 0,
        Gemini: 0,
        total: 0
      },
      lastResetDate: today,
      sessionCost: 0
    });
  }
}

// Update storage with new cost
async function updateCost(tool, cost) {
  const data = await chrome.storage.local.get(['dailyData', 'sessionCost']);
  
  const dailyData = data.dailyData || { ChatGPT: 0, Claude: 0, Gemini: 0, total: 0 };
  const sessionCost = (data.sessionCost || 0) + cost;
  
  dailyData[tool] = (dailyData[tool] || 0) + cost;
  dailyData.total = (dailyData.total || 0) + cost;
  
  await chrome.storage.local.set({
    dailyData,
    sessionCost
  });
  
  // Update the floating widget
  updateFloatingWidget(cost, sessionCost);
}

// Create and manage floating widget
function createFloatingWidget() {
  // Check if widget already exists
  if (document.getElementById('ai-wallet-widget')) {
    return;
  }
  
  const widget = document.createElement('div');
  widget.id = 'ai-wallet-widget';
  widget.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    " id="ai-wallet-widget-content">
      <div style="margin-bottom: 4px;">$0.000 estimated</div>
      <div style="font-size: 12px; opacity: 0.9;">Session: $0.000</div>
    </div>
  `;
  
  widget.addEventListener('mouseenter', (e) => {
    e.target.style.transform = 'scale(1.05)';
    e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });
  
  widget.addEventListener('mouseleave', (e) => {
    e.target.style.transform = 'scale(1)';
    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });
  
  widget.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  document.body.appendChild(widget);
}

// Update floating widget with current costs
async function updateFloatingWidget(newCost, sessionCost) {
  const widget = document.getElementById('ai-wallet-widget-content');
  if (widget) {
    widget.innerHTML = `
      <div style="margin-bottom: 4px;">${formatCost(newCost)} estimated</div>
      <div style="font-size: 12px; opacity: 0.9;">Session: ${formatCost(sessionCost)}</div>
    `;
  }
}

// Watch for new messages being sent
function observeMessageSending() {
  const tool = detectAITool();
  
  // Tool-specific observers
  if (tool === 'ChatGPT') {
    observeChatGPT();
  } else if (tool === 'Claude') {
    observeClaude();
  } else if (tool === 'Gemini') {
    observeGemini();
  }
}

// ChatGPT observer
function observeChatGPT() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Look for new message elements being added
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if this is a message input or send button
            const textarea = node.querySelector?.('textarea') || node.closest?.('textarea');
            if (textarea && textarea.value) {
              // Detect when message is sent
              const sendButton = node.querySelector?.('[data-testid="send-button"]') || 
                                document.querySelector('[data-testid="send-button"]');
              if (sendButton) {
                sendButton.addEventListener('click', () => {
                  const messageLength = textarea.value.length;
                  const cost = estimateCost(messageLength, 'ChatGPT');
                  updateCost('ChatGPT', cost);
                }, { once: true });
              }
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

// Claude observer
function observeClaude() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Look for message input
            const input = node.querySelector?.('[contenteditable="true"]') || 
                         node.closest?.('[contenteditable="true"]');
            if (input) {
              const sendButton = node.querySelector?.('button[aria-label*="Send"]') || 
                                document.querySelector('button[aria-label*="Send"]');
              if (sendButton) {
                sendButton.addEventListener('click', () => {
                  const messageLength = input.textContent.length;
                  const cost = estimateCost(messageLength, 'Claude');
                  updateCost('Claude', cost);
                }, { once: true });
              }
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

// Gemini observer
function observeGemini() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Look for message input
            const input = node.querySelector?.('textarea') || node.closest?.('textarea');
            if (input && input.value) {
              const sendButton = node.querySelector?.('button[aria-label*="Send"]') || 
                                document.querySelector('button[aria-label*="Send"]');
              if (sendButton) {
                sendButton.addEventListener('click', () => {
                  const messageLength = input.value.length;
                  const cost = estimateCost(messageLength, 'Gemini');
                  updateCost('Gemini', cost);
                }, { once: true });
              }
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

// Initialize on page load
async function init() {
  await initializeDailyStorage();
  createFloatingWidget();
  observeMessageSending();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
