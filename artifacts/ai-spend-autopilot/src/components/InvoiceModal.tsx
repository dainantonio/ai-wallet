import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Printer, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModelCost {
  model: string;
  provider: string;
  request_count: number;
  total_cost: number;
}

interface InvoiceModalProps {
  projectId: string;
  projectName: string;
  clientName: string | null;
  onClose: () => void;
}

// ─── Invoice HTML generator ───────────────────────────────────────────────────
function buildInvoiceHtml(opts: {
  yourName: string;
  clientName: string;
  invoiceDate: string;
  invoiceNumber: string;
  lineItems: { description: string; qty: number; unitCost: number; total: number }[];
  subtotal: number;
  markupPct: number;
  markupAmt: number;
  totalDue: number;
}): string {
  const rows = opts.lineItems.map(item => `
    <tr>
      <td class="desc">${item.description}</td>
      <td class="num">${item.qty}</td>
      <td class="num">$${item.unitCost.toFixed(4)}</td>
      <td class="num total">$${item.total.toFixed(4)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${opts.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #0f172a;
    background: #fff;
    padding: 48px 56px;
    font-size: 14px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 48px;
    padding-bottom: 24px;
    border-bottom: 2px solid #6366f1;
  }
  .brand { font-size: 22px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .invoice-meta { text-align: right; }
  .invoice-meta h1 { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -1px; }
  .invoice-meta .num { font-size: 12px; color: #64748b; margin-top: 4px; }
  .invoice-meta .date { font-size: 13px; color: #334155; margin-top: 2px; }

  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
  }
  .party-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .party-name { font-size: 16px; font-weight: 700; color: #0f172a; }
  .party-sub { font-size: 12px; color: #64748b; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #f8fafc; }
  th {
    padding: 10px 14px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
  }
  th.num, td.num { text-align: right; }
  td {
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
    color: #334155;
  }
  td.desc { font-weight: 500; color: #0f172a; }
  td.total { font-weight: 700; font-family: "SF Mono", "Fira Code", monospace; }

  .totals { margin-left: auto; width: 280px; }
  .totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    font-size: 13px;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
  }
  .totals-row.subtotal { color: #64748b; }
  .totals-row.markup { color: #f59e0b; }
  .totals-row.due {
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
    border-bottom: none;
    padding-top: 12px;
    border-top: 2px solid #6366f1;
    margin-top: 4px;
  }
  .totals-val { font-family: "SF Mono", "Fira Code", monospace; font-weight: 600; }
  .due .totals-val { color: #6366f1; }

  .footer {
    margin-top: 56px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #94a3b8;
  }
  .footer .powered { color: #c7d2fe; font-weight: 600; }

  @media print {
    body { padding: 24px 32px; }
    @page { margin: 0.5in; size: letter portrait; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">AI Wallet</div>
      <div class="brand-sub">AI Cost Tracking</div>
    </div>
    <div class="invoice-meta">
      <h1>INVOICE</h1>
      <div class="num">${opts.invoiceNumber}</div>
      <div class="date">${opts.invoiceDate}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Bill From</div>
      <div class="party-name">${opts.yourName || "—"}</div>
      <div class="party-sub">AI Services</div>
    </div>
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${opts.clientName || "—"}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Requests</th>
        <th class="num">Avg Unit Cost</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row subtotal">
      <span>Subtotal (AI costs)</span>
      <span class="totals-val">$${opts.subtotal.toFixed(4)}</span>
    </div>
    ${opts.markupPct > 0 ? `
    <div class="totals-row markup">
      <span>Service markup (${opts.markupPct}%)</span>
      <span class="totals-val">+$${opts.markupAmt.toFixed(4)}</span>
    </div>` : ""}
    <div class="totals-row due">
      <span>Total Due (USD)</span>
      <span class="totals-val">$${opts.totalDue.toFixed(4)}</span>
    </div>
  </div>

  <div class="footer">
    <span>Thank you for your business.</span>
    <span class="powered">Generated by AI Wallet</span>
  </div>
</body>
</html>`;
}

// ─── Invoice Modal ─────────────────────────────────────────────────────────────
export function InvoiceModal({ projectId, projectName, clientName, onClose }: InvoiceModalProps) {
  const [yourName, setYourName]     = useState(() => localStorage.getItem("invoice_your_name") ?? "");
  const [invoiceDate, setDate]      = useState(() => new Date().toISOString().slice(0, 10));
  const [markupPct, setMarkup]      = useState(15);
  const [loading, setLoading]       = useState(true);
  const [models, setModels]         = useState<ModelCost[]>([]);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/costs`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { totals: unknown; byModel: ModelCost[] }) => setModels(data.byModel))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const subtotal = models.reduce((s, m) => s + m.total_cost, 0);
  const markupAmt = +(subtotal * (markupPct / 100)).toFixed(6);
  const totalDue = +(subtotal + markupAmt).toFixed(6);

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const lineItems = models.map(m => ({
    description: `${m.provider} — ${m.model}`,
    qty: m.request_count,
    unitCost: m.request_count > 0 ? m.total_cost / m.request_count : 0,
    total: m.total_cost,
  }));

  const handlePrint = () => {
    localStorage.setItem("invoice_your_name", yourName);
    const html = buildInvoiceHtml({
      yourName,
      clientName: clientName ?? projectName,
      invoiceDate: new Date(invoiceDate + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      invoiceNumber,
      lineItems,
      subtotal,
      markupPct,
      markupAmt,
      totalDue,
    });

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Pop-up blocked — please allow pop-ups for this site and try again."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Small delay so the browser finishes rendering before printing
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-foreground">Generate Invoice</h2>
              <p className="text-xs text-muted-foreground">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Your name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Your Name / Company</label>
              <input
                value={yourName} onChange={e => setYourName(e.target.value)}
                placeholder="Acme Freelancing"
                className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/60 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Client</label>
              <input
                value={clientName ?? projectName} readOnly
                className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/40 text-muted-foreground text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Invoice date */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Invoice Date</label>
            <input
              type="date" value={invoiceDate} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-secondary border border-border/60 text-foreground text-sm focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Cost Line Items</label>
              {!loading && <span className="text-xs text-muted-foreground">{models.length} provider{models.length !== 1 ? "s" : ""}</span>}
            </div>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading costs…</span>
                </div>
              ) : error ? (
                <p className="text-xs text-destructive p-4">{error}</p>
              ) : models.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No cost data for this project yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/60">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Description</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Req</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="px-3 py-2.5 text-foreground font-medium text-xs">{item.description}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground text-xs tabular-nums">{item.qty}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-xs tabular-nums">${item.total.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Markup slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Markup</label>
              <span className="text-sm font-bold text-amber-400 tabular-nums font-mono">{markupPct}%</span>
            </div>
            <input
              type="range" min={0} max={50} value={markupPct} onChange={e => setMarkup(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0% (pass-through)</span>
              <span>50% margin</span>
            </div>
          </div>

          {/* Totals summary */}
          {!loading && models.length > 0 && (
            <div className="rounded-xl bg-secondary/40 border border-border/40 p-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>AI costs subtotal</span>
                <span className="font-mono tabular-nums">${subtotal.toFixed(4)}</span>
              </div>
              {markupPct > 0 && (
                <div className="flex justify-between text-sm text-amber-400">
                  <span>Markup ({markupPct}%)</span>
                  <span className="font-mono tabular-nums">+${markupAmt.toFixed(4)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-foreground border-t border-border/50 pt-2 mt-1">
                <span>Total Due</span>
                <span className="font-mono tabular-nums text-primary">${totalDue.toFixed(4)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handlePrint}
            disabled={loading || models.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Download PDF
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
