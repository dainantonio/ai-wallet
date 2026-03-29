// ─── CSV export helpers ───────────────────────────────────────────────────────

export interface ExportRow {
  created_at: string;
  provider: string;
  model: string;
  label: string | null;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  saved: number;
  project_name: string | null;
}

/** Escape a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines */
function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convert rows from /api/costs/export into a CSV string */
export function rowsToCsv(rows: ExportRow[]): string {
  const header = [
    "Date", "Provider", "Model", "Task",
    "Input Tokens", "Output Tokens", "Cost (USD)", "Project", "Saved (USD)",
  ].join(",");

  const body = rows.map(r => [
    csvCell(new Date(r.created_at).toLocaleString("en-US", { timeZone: "UTC" })),
    csvCell(r.provider),
    csvCell(r.model),
    csvCell(r.label ?? ""),
    csvCell(r.input_tokens),
    csvCell(r.output_tokens),
    csvCell(r.cost.toFixed(6)),
    csvCell(r.project_name ?? ""),
    csvCell(r.saved.toFixed(6)),
  ].join(",")).join("\n");

  return `${header}\n${body}`;
}

/** Trigger a browser file download for a CSV string */
export function downloadCsv(csv: string, filename: string): void {
  const blob  = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement("a");
  a.href      = url;
  a.download  = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Fetch rows from the API and download as CSV */
export async function exportCostsCsv(opts: {
  projectId?: string;
  startDate?: string;
  endDate?: string;
  filename?: string;
}): Promise<void> {
  const params = new URLSearchParams();
  if (opts.projectId) params.set("projectId", opts.projectId);
  if (opts.startDate) params.set("startDate", opts.startDate);
  if (opts.endDate)   params.set("endDate", opts.endDate);

  const res = await fetch(`/api/costs/export?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Export failed: HTTP ${res.status}`);
  const rows = await res.json() as ExportRow[];
  if (rows.length === 0) throw new Error("No data to export for the selected filters");

  const filename = opts.filename ?? `ai-wallet-export-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(rowsToCsv(rows), filename);
}
