import { Shell } from "@/components/layout/Shell";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Eye, EyeOff, Trash2, Save,
  Lock, ShieldCheck, Info,
} from "lucide-react";
import { useAuthContext } from "@/App";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyStatus {
  provider: string;
  hasKey: boolean;
  count: number;
  keys: {
    id: string;
    keyName: string;
    projectId: string | null;
    projectName: string | null;
  }[];
}
interface ProjectLite { id: string; name: string }

// ─── Provider metadata ────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id:          "openai",
    name:        "OpenAI",
    model:       "GPT-4o, GPT-4o mini",
    placeholder: "sk-proj-…",
    accentColor: "text-blue-400",
    borderColor: "border-blue-500/25",
    bgColor:     "bg-blue-500/6",
    badgeColor:  "bg-blue-500/15 text-blue-400",
    docsUrl:     "https://platform.openai.com/api-keys",
    iconBg:      "bg-blue-500/15",
    iconText:    "text-blue-400",
  },
  {
    id:          "anthropic",
    name:        "Anthropic",
    model:       "Claude 3.5 Sonnet, Claude Haiku",
    placeholder: "sk-ant-api03-…",
    accentColor: "text-orange-400",
    borderColor: "border-orange-500/25",
    bgColor:     "bg-orange-500/6",
    badgeColor:  "bg-orange-500/15 text-orange-400",
    docsUrl:     "https://console.anthropic.com/settings/keys",
    iconBg:      "bg-orange-500/15",
    iconText:    "text-orange-400",
  },
  {
    id:          "google",
    name:        "Google Gemini",
    model:       "Gemini 1.5 Pro, Gemini Flash",
    placeholder: "AIzaSy…",
    accentColor: "text-green-400",
    borderColor: "border-green-500/25",
    bgColor:     "bg-green-500/6",
    badgeColor:  "bg-green-500/15 text-green-400",
    docsUrl:     "https://aistudio.google.com/app/apikey",
    iconBg:      "bg-green-500/15",
    iconText:    "text-green-400",
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchKeyStatus(): Promise<KeyStatus[]> {
  const res = await fetch("/api/settings/keys", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load key status");
  return res.json() as Promise<KeyStatus[]>;
}

async function saveKey(provider: string, apiKey: string, keyName: string, projectId: string | null): Promise<void> {
  const res = await fetch("/api/settings/keys", {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json" },
    body:        JSON.stringify({ provider, apiKey, keyName, projectId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Failed to save key");
  }
}

async function deleteKey(keyId: string): Promise<void> {
  const res = await fetch(`/api/settings/keys/${keyId}`, {
    method:      "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Failed to remove key");
  }
}

async function fetchProjects(): Promise<ProjectLite[]> {
  const res = await fetch("/api/projects", { credentials: "include" });
  if (!res.ok) return [];
  return res.json() as Promise<ProjectLite[]>;
}

// ─── ProviderCard ─────────────────────────────────────────────────────────────

function ProviderCard({
  meta,
  status,
  projects,
  delay,
}: {
  meta: (typeof PROVIDERS)[number];
  status: KeyStatus;
  projects: ProjectLite[];
  delay: number;
}) {
  const qc = useQueryClient();

  const [value,    setValue]    = useState("");
  const [keyName,  setKeyName]  = useState("default");
  const [projectId, setProjectId] = useState<string>("");
  const [visible,  setVisible]  = useState(false);
  const [savedOk,  setSavedOk]  = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => saveKey(meta.id, value, keyName, projectId || null),
    onSuccess: () => {
      setValue("");
      setKeyName("default");
      setProjectId("");
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      qc.invalidateQueries({ queryKey: ["/api/settings/keys"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings/keys"] });
    },
  });

  const isBusy = saveMutation.isPending || deleteMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={`glass-panel rounded-2xl p-6 border stat-card-premium ${meta.borderColor} ${meta.bgColor}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base ${meta.iconBg} ${meta.iconText}`}>
            {meta.name[0]}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base leading-none">{meta.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.model}</p>
          </div>
        </div>

        {/* Status badge */}
        {status.hasKey ? (
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badgeColor}`}>
            <CheckCircle2 className="w-3 h-3" />
            {status.count} key{status.count === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground">
            <XCircle className="w-3 h-3" />
            Not set
          </span>
        )}
      </div>

      {/* Key input */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          API Key
        </label>

        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={status.hasKey ? "Add another key…" : meta.placeholder}
            disabled={isBusy}
            className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 transition-colors"
          />
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            tabIndex={-1}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            placeholder="Key name (default)"
            disabled={isBusy}
            className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground"
          />
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={isBusy}
            className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground"
          >
            <option value="">All projects (default)</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {status.keys.length > 0 && (
          <div className="space-y-2 pt-1">
            {status.keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/30 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{k.keyName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{k.projectName ?? "All projects"}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(k.id)}
                  disabled={isBusy}
                  className="p-1 rounded text-destructive hover:bg-destructive/10"
                  title="Remove key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {(saveMutation.isError || deleteMutation.isError) && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive flex items-center gap-1.5"
          >
            <XCircle className="w-3 h-3" />
            {(saveMutation.error as Error)?.message ?? (deleteMutation.error as Error)?.message}
          </motion.p>
        )}

        {/* Success */}
        {savedOk && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-success flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3 h-3" />
            Key saved and encrypted successfully
          </motion.p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!value.trim() || isBusy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saveMutation.isPending ? "Saving…" : "Save Key"}
          </button>

          {deleteMutation.isPending && <span className="text-xs text-muted-foreground">Removing…</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  useAuthContext();

  const { data: keyStatus = [], isLoading } = useQuery<KeyStatus[]>({
    queryKey: ["/api/settings/keys"],
    queryFn:  fetchKeyStatus,
    staleTime: 60_000,
  });
  const { data: projects = [] } = useQuery<ProjectLite[]>({
    queryKey: ["/api/projects"],
    queryFn: fetchProjects,
    staleTime: 60_000,
  });

  const configuredCount = keyStatus.filter(k => k.hasKey).length;

  function getStatus(providerId: string): KeyStatus {
    return keyStatus.find(k => k.provider === providerId) ?? { provider: providerId, hasKey: false, count: 0, keys: [] };
  }

  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight heading-gradient">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Store your API keys securely. Keys are encrypted with AES-256-GCM before being saved.
        </p>
      </header>

      {/* Security notice */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-4 border border-primary/20 bg-primary/5 flex items-start gap-3 mb-8"
      >
        <div className="p-2 bg-primary/15 rounded-lg flex-shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Your keys are encrypted at rest</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Keys are encrypted with AES-256-GCM using a server-side key before storage. Raw keys are never logged or returned to the client. When you call any provider through AI Wallet, your stored key takes priority over the server's default key.
          </p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            configuredCount === 3 ? "bg-success/15 text-success" :
            configuredCount > 0  ? "bg-yellow-500/15 text-yellow-400" :
            "bg-secondary text-muted-foreground"
          }`}>
            {isLoading ? "…" : `${configuredCount}/3 configured`}
          </span>
        </div>
      </motion.div>

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {PROVIDERS.map((meta, i) => (
          <ProviderCard
            key={meta.id}
            meta={meta}
            status={getStatus(meta.id)}
            projects={projects}
            delay={i * 0.08}
          />
        ))}
      </div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-panel rounded-2xl p-6 border border-border/40"
      >
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold text-base">How API keys are used</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "You add a key",
              body:  "Enter your API key above. It is encrypted immediately in the browser before being sent to the server.",
            },
            {
              step: "2",
              title: "Encrypted storage",
              body:  "The server encrypts the key with AES-256-GCM and stores the ciphertext in Supabase against your user ID.",
            },
            {
              step: "3",
              title: "Used on every call",
              body:  "When you run a task, the server decrypts your key in-memory and passes it directly to the provider — it is never logged.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </Shell>
  );
}
