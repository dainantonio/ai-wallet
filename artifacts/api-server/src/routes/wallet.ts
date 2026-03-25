import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WalletTx {
  id: string;
  label: string;
  amount: number;        // positive = savings, negative = spend
  timestamp: number;
  type: "optimization" | "usage" | "mode_switch";
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

function makeId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultWallet(): WalletState {
  return {
    balance: 158.50,
    totalSaved: 34.20,
    spendMode: "balanced",
    transactions: [
      { id: "init-1", label: "Semantic cache hit",            amount:  12.40, timestamp: Date.now() - 2 * 60000,   type: "optimization" },
      { id: "init-2", label: "GPT-4o API request batch",     amount: -0.032, timestamp: Date.now() - 5 * 60000,   type: "usage" },
      { id: "init-3", label: "Smart routing: GPT-4o → mini", amount:   9.60, timestamp: Date.now() - 10 * 60000,  type: "optimization" },
      { id: "init-4", label: "Document summarization",       amount: -0.018, timestamp: Date.now() - 20 * 60000,  type: "usage" },
      { id: "init-5", label: "Token budget optimization",    amount:   6.20, timestamp: Date.now() - 40 * 60000,  type: "optimization" },
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

// ─── POST /api/wallet/optimize ────────────────────────────────────────────────
router.post("/wallet/optimize", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const wallet = getWallet(req.user.id);
  const newTxs: WalletTx[] = [];

  const saveAmt = rand(2.5, 9.0);
  newTxs.push({ id: makeId(), label: pick(SAVE_LABELS), amount: saveAmt, timestamp: Date.now(), type: "optimization" });

  const numCosts = Math.random() > 0.45 ? 2 : 1;
  for (let i = 0; i < numCosts; i++) {
    newTxs.push({ id: makeId(), label: pick(COST_LABELS), amount: -rand(0.4, 2.8), timestamp: Date.now() - (i + 1) * 800, type: "usage" });
  }

  const net = newTxs.reduce((s, t) => s + t.amount, 0);
  wallet.balance      = +Math.max(0, wallet.balance + net).toFixed(2);
  wallet.totalSaved   = +(wallet.totalSaved + saveAmt).toFixed(2);
  wallet.transactions = [...newTxs, ...wallet.transactions].slice(0, 10);

  res.json({ wallet, newTransactions: newTxs });
});

// ─── POST /api/wallet/mode ────────────────────────────────────────────────────
router.post("/wallet/mode", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { mode } = req.body as { mode: string };
  const valid: SpendMode[] = ["saver", "balanced", "performance"];
  if (!valid.includes(mode as SpendMode)) {
    res.status(400).json({ error: "Invalid mode" });
    return;
  }

  const wallet = getWallet(req.user.id);
  const modeLabels: Record<SpendMode, string> = {
    saver: "saving more",
    balanced: "balanced approach",
    performance: "max performance",
  };

  const modeTx: WalletTx = {
    id: makeId(),
    label: `Switched to ${(mode as string).charAt(0).toUpperCase() + (mode as string).slice(1)} Mode → ${modeLabels[mode as SpendMode]}`,
    amount: 0,
    timestamp: Date.now(),
    type: "mode_switch",
  };

  wallet.spendMode    = mode as SpendMode;
  wallet.transactions = [modeTx, ...wallet.transactions].slice(0, 10);

  res.json({ wallet });
});

export default router;
