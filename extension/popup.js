/**
 * AI Wallet — Cost Tracker
 * Popup Script: Displays dashboard with daily totals and controls
 */

// Format cost as currency
function formatCost(cost) {
  return '$' + (cost || 0).toFixed(4);
}

// Load and display data from storage
async function loadData() {
  const data = await chrome.storage.local.get(['dailyData', 'sessionCost']);
  
  const dailyData = data.dailyData || {
    ChatGPT: 0,
    Claude: 0,
    Gemini: 0,
    total: 0
  };
  
  const sessionCost = data.sessionCost || 0;
  
  // Update UI
  document.getElementById('total-cost').textContent = formatCost(dailyData.total);
  document.getElementById('chatgpt-cost').textContent = formatCost(dailyData.ChatGPT);
  document.getElementById('claude-cost').textContent = formatCost(dailyData.Claude);
  document.getElementById('gemini-cost').textContent = formatCost(dailyData.Gemini);
  document.getElementById('session-cost').textContent = formatCost(sessionCost);
}

// Reset session cost
async function resetSession() {
  await chrome.storage.local.set({ sessionCost: 0 });
  loadData();
}

// Open dashboard in new tab
function openDashboard() {
  chrome.tabs.create({
    url: 'https://ai-wallet--therussellfam20.replit.app'
  });
}

// Event listeners
document.getElementById('reset-session').addEventListener('click', resetSession);
document.getElementById('view-dashboard').addEventListener('click', openDashboard);

// Load data when popup opens
loadData();

// Refresh data every 2 seconds to show real-time updates
setInterval(loadData, 2000);
