import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layout/Shell";
import { useAuthContext } from "@/App";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, Plus, Trash2, X, ChevronRight, BarChart3, Loader2, Download, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { exportCostsCsv } from "@/lib/export";
import { InvoiceModal } from "@/components/InvoiceModal";
import { Skeleton } from "@/components/ui/skeleton";
import { notifyApiError, friendlyErrorMessage } from "@/lib/user-feedback";
import { trackEvent } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
  clientName: string | null;
  color: string;
  createdAt: string;
}

interface ProjectCosts {
  totals: { total_cost: number; total_saved: number; request_count: number };
  byModel: { model: string; provider: string; request_count: number; total_cost: number; total_saved: number }[];
}

// ─── Preset colors ────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
];

// ─── New Project Modal ────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const [name, setName]           = useState("");
  const [clientName, setClient]   = useState("");
  const [color, setColor]         = useState(COLOR_PRESETS[0]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), clientName: clientName.trim() || null, color }),
      });
      const json = await res.json() as Project & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create project");
      onCreated(json);
      onClose();
    } catch (err) {
      setError(friendlyErrorMessage());
      notifyApiError("Could not create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-foreground">New Project</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Project Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Client Website Redesign"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/60 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Client Name</label>
            <input
              value={clientName} onChange={e => setClient(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/60 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button key={c} type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"}`}
                  style={{ background: c, ringColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create Project
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Project Detail Panel ─────────────────────────────────────────────────────
function ProjectDetail({ project, onClose, onDeleted }: {
  project: Project;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [costs, setCosts]       = useState<ProjectCosts | null>(null);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/costs`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCosts(data as ProjectCosts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [project.id]);

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? Costs will be unlinked but not deleted.`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE", credentials: "include" });
    onDeleted(project.id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${project.color}20`, border: `1px solid ${project.color}40` }}>
              <FolderKanban className="w-5 h-5" style={{ color: project.color }} />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">{project.name}</h2>
              {project.clientName && <p className="text-sm text-muted-foreground">{project.clientName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition-colors">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : costs ? (
          <div className="space-y-4">
            {/* Totals row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Spend", value: formatCurrency(costs.totals.total_cost) },
                { label: "Saved", value: formatCurrency(costs.totals.total_saved) },
                { label: "Requests", value: String(costs.totals.request_count) },
              ].map(s => (
                <div key={s.label} className="stat-card-premium rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-sm font-bold font-mono text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* By model */}
            {costs.byModel.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Model</p>
                <div className="space-y-2">
                  {costs.byModel.map(m => (
                    <div key={`${m.model}-${m.provider}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/50 border border-border/40">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.model}</p>
                        <p className="text-xs text-muted-foreground">{m.provider} · {m.request_count} req</p>
                      </div>
                      <p className="text-sm font-mono font-bold text-foreground">{formatCurrency(m.total_cost)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {costs.byModel.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No costs logged yet</p>
                <p className="text-xs mt-1">Select this project in the wallet and start using the AI assistant</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Unable to load project costs.</p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Projects Page ────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { isDemo } = useAuthContext();
  const [projects, setProjects]             = useState<Project[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showNew, setShowNew]               = useState(false);
  const [selected, setSelected]             = useState<Project | null>(null);
  const [invoiceProject, setInvoiceProject] = useState<Project | null>(null);
  const [exportingId, setExportingId]       = useState<string | null>(null);
  const [exportError, setExportError]       = useState<string | null>(null);
  const [loadFailed, setLoadFailed]         = useState(false);

  const loadProjects = useCallback(() => {
    if (isDemo) { setLoading(false); return; }
    setLoadFailed(false);
    fetch("/api/projects", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: Project[]) => setProjects(data))
      .catch(() => {
        setLoadFailed(true);
        notifyApiError("Could not load projects");
      })
      .finally(() => setLoading(false));
  }, [isDemo]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleExport = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingId(project.id);
    setExportError(null);
    try {
      await exportCostsCsv({
        projectId: project.id,
        filename: `ai-wallet-${project.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      trackEvent("export_download", { source: "projects", project_id: project.id });
    } catch (err) {
      setExportError(friendlyErrorMessage());
      notifyApiError("Export failed");
      setTimeout(() => setExportError(null), 4000);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold heading-gradient">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track AI costs per client project</p>
          </div>
          <motion.button
            onClick={() => setShowNew(true)}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </motion.button>
        </div>

        {/* Export error toast */}
        <AnimatePresence>
          {exportError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive font-medium"
            >
              {exportError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo notice */}
        {isDemo && (
          <div className="stat-card-premium rounded-xl p-4 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground">Projects require a real account. Sign in to create and track projects.</p>
          </div>
        )}

        {/* Loading */}
        {loading && !isDemo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="stat-card-premium rounded-2xl p-5 border border-white/10 space-y-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <Skeleton className="h-8 rounded-xl" />
                  <Skeleton className="h-8 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && loadFailed && (
          <div className="stat-card-premium rounded-xl p-4 border border-destructive/30">
            <p className="text-sm text-muted-foreground mb-3">We couldn’t load projects right now.</p>
            <button onClick={loadProjects} className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !isDemo && projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="stat-card-premium rounded-2xl p-12 text-center border border-dashed border-white/10"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg text-foreground mb-2">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Create a project for each client to track how much you're spending on AI for their work.
            </p>
            <motion.button
              onClick={() => setShowNew(true)}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </motion.button>
          </motion.div>
        )}

        {/* Project grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="stat-card-premium rounded-2xl p-5 group hover:border-primary/30 transition-all flex flex-col"
              >
                {/* Card top — clickable for detail */}
                <button className="text-left flex-1" onClick={() => setSelected(project)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${project.color}20`, border: `1px solid ${project.color}40` }}>
                      <FolderKanban className="w-5 h-5" style={{ color: project.color }} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity mt-1" />
                  </div>
                  <h3 className="font-display font-bold text-foreground text-base leading-tight mb-0.5">{project.name}</h3>
                  {project.clientName && (
                    <p className="text-xs text-muted-foreground">{project.clientName}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </button>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={e => handleExport(project, e)}
                    disabled={exportingId === project.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/70 border border-border/40 text-muted-foreground text-xs font-semibold hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    {exportingId === project.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    Export CSV
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={e => { e.stopPropagation(); setInvoiceProject(project); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/18 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Invoice
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNew && (
          <NewProjectModal
            onClose={() => setShowNew(false)}
            onCreated={p => setProjects(prev => [...prev, p])}
          />
        )}
        {selected && (
          <ProjectDetail
            project={selected}
            onClose={() => setSelected(null)}
            onDeleted={id => setProjects(prev => prev.filter(p => p.id !== id))}
          />
        )}
        {invoiceProject && (
          <InvoiceModal
            projectId={invoiceProject.id}
            projectName={invoiceProject.name}
            clientName={invoiceProject.clientName}
            onClose={() => setInvoiceProject(null)}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}
