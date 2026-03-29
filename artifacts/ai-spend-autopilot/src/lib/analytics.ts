export type AnalyticsEvent =
  | "page_view"
  | "wallet_action"
  | "agent_message"
  | "export_download";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  // Privacy-friendly: no email, no raw prompt text, no API keys.
  const payload = {
    event,
    properties,
    ts: Date.now(),
    path: window.location.pathname,
  };

  void fetch("/api/analytics/events", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // fail silently for analytics
  });
}
