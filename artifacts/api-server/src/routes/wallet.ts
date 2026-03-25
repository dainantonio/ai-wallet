import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WalletTx {
  id: string;
  label: string;
  amount: number;
  timestamp: number;
  type: "optimization" | "usage" | "mode_switch" | "deposit";
}

export type SpendMode = "saver" | "balanced" | "performance";

export interface WalletState {
  balance: number;
  totalSaved: number;
  spendMode: SpendMode;
  transactions: WalletTx[];
}

// ─── In-memory wallet store (keyed by userId) ─────────────────────────────────
const walletStore = new Map<string, WalletState>();

const SAVE_LABELS = [
  "Smart routing: GPT-4o → mini",
  "Semantic cache hit",
  "Batch compression savings",
  "Model downgrade applied",
  "Duplicate request merged",
  "Token budget optimization",
];

const COST_LABELS = [
  "GPT-4o API request batch",
  "Image generation call",
  "Embedding computation",
  "Chat completion request",
  "Code analysis run",
  "Document summarization",
  "Agent pipeline execution",
];

const TASK_LABELS = [
  "Ran: Code explanation task",
  "Ran: Email draft generation",
  "Ran: Data extraction pipeline",
  "Ran: Sentiment analysis batch",
  "Ran: Image captioning task",
  "Ran: Chat completion request",
  "Ran: Document Q&A session",
  "Ran: Translation pipeline",
  "Ran: Summarization task",
];

const SAVINGS_TIPS = [
  "Switch 60% of GPT-4o calls to GPT-4o mini — same quality, 80% cheaper.",
  "Enable semantic caching — similar prompts share responses automatically.",
  "Batch your embedding calls — up to 10× cheaper than individual requests.",
  "Set a max_tokens limit on all completions to prevent runaway costs.",
  "Route summarization tasks to a lighter model — 3× cheaper than full GPT-4o.",
  "Deduplicate identical requests within 60 s — free cache hits, zero spend.",
  "Compress images before sending to vision models — cuts token usage by 40%.",
  "Use streaming for long completions — reduces timeouts and wasted tokens.",
  "Pre-process prompts to strip boilerplate — fewer input tokens = lower cost.",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number, d = 3): number { return +(Math.random() * (max - min) + min).toFixed(d); }
function makeId(): string { return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function defaultWallet(): WalletState {
  return {
    balance: 158.50,
    totalSaved: 34.20,
    spendMode: "balanced",
    transactions: [
      { id: "init-1", label: "Semantic cache hit",            amount:  12.40, timestamp: Date.now() - 2 * 60000,  type: "optimization" },
      { id: "init-2", label: "GPT-4o API request batch",     amount: -0.032, timestamp: Date.now() - 5 * 60000,  type: "usage" },
      { id: "init-3", label: "Smart routing: GPT-4o → mini", amount:   9.60, timestamp: Date.now() - 10 * 60000, type: "optimization" },
      { id: "init-4", label: "Document summarization",       amount: -0.018, timestamp: Date.now() - 20 * 60000, type: "usage" },
      { id: "init-5", label: "Token budget optimization",    amount:   6.20, timestamp: Date.now() - 40 * 60000, type: "optimization" },
    ],
  };
}

function getWallet(userId: string): WalletState {
  if (!walletStore.has(userId)) walletStore.set(userId, defaultWallet());
  return walletStore.get(userId)!;
}

// ─── GET /api/wallet ─────────────────────────────────────────────────────────
router.get("/wallet", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json(getWallet(req.user.id));
});

// ─── POST /api/wallet/task — deduct $0.02–$0.10 per AI task ─────────────────
router.post("/wallet/task", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const wallet = getWallet(req.user.id);
  const cost = rand(0.02, 0.10, 3);
  const tx: WalletTx = {
    id: makeId(),
    label: pick(TASK_LABELS),
    amount: -cost,
    timestamp: Date.now(),
    type: "usage",
  };

  wallet.balance      = +Math.max(0, wallet.balance + tx.amount).toFixed(2);
  wallet.transactions = [tx, ...wallet.transactions].slice(0, 10);

  res.json({ wallet, newTransaction: tx });
});

// ─── POST /api/wallet/funds — add funds ──────────────────────────────────────
router.post("/wallet/funds", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const raw = (req.body as { amount?: unknown }).amount;
  const VALID = [10, 25, 50, 100];
  const amount = VALID.includes(Number(raw)) ? Number(raw) : 25;

  const wallet = getWallet(req.user.id);
  const tx: WalletTx = {
    id: makeId(),
    label: `Funds added — $${amount.toFixed(2)} top-up`,
    amount,
    timestamp: Date.now(),
    type: "deposit",
  };

  wallet.balance      = +(wallet.balance + amount).toFixed(2);
  wallet.transactions = [tx, ...wallet.transactions].slice(0, 10);

  res.json({ wallet, newTransaction: tx });
});

// ─── POST /api/wallet/optimize — generate savings + return a tip ──────────────
router.post("/wallet/optimize", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const wallet = getWallet(req.user.id);
  const newTxs: WalletTx[] = [];

  const saveAmt = rand(2.5, 9.0, 2);
  newTxs.push({ id: makeId(), label: pick(SAVE_LABELS), amount: saveAmt,        timestamp: Date.now(),       type: "optimization" });

  const numCosts = Math.random() > 0.45 ? 2 : 1;
  for (let i = 0; i < numCosts; i++) {
    newTxs.push({ id: makeId(), label: pick(COST_LABELS), amount: -rand(0.4, 2.8, 2), timestamp: Date.now() - (i + 1) * 800, type: "usage" });
  }

  const net = newTxs.reduce((s, t) => s + t.amount, 0);
  wallet.balance      = +Math.max(0, wallet.balance + net).toFixed(2);
  wallet.totalSaved   = +(wallet.totalSaved + saveAmt).toFixed(2);
  wallet.transactions = [...newTxs, ...wallet.transactions].slice(0, 10);

  res.json({ wallet, newTransactions: newTxs, tip: pick(SAVINGS_TIPS) });
});

// ─── POST /api/wallet/mode ────────────────────────────────────────────────────
router.post("/wallet/mode", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { mode } = req.body as { mode: string };
  const valid: SpendMode[] = ["saver", "balanced", "performance"];
  if (!valid.includes(mode as SpendMode)) { res.status(400).json({ error: "Invalid mode" }); return; }

  const wallet = getWallet(req.user.id);
  const modeLabels: Record<SpendMode, string> = { saver: "saving more", balanced: "balanced approach", performance: "max performance" };

  const modeTx: WalletTx = {
    id: makeId(),
    label: `Switched to ${(mode as string)[0].toUpperCase() + (mode as string).slice(1)} Mode → ${modeLabels[mode as SpendMode]}`,
    amount: 0, timestamp: Date.now(), type: "mode_switch",
  };

  wallet.spendMode    = mode as SpendMode;
  wallet.transactions = [modeTx, ...wallet.transactions].slice(0, 10);

  res.json({ wallet });
});

export default router;
