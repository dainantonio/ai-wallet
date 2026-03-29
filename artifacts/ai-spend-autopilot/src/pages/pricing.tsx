import { useMemo, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

type Tier = {
  name: "Free" | "Pro" | "Team";
  monthly: number;
  cta: string;
  features: string[];
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    monthly: 0,
    cta: "Get Started Free",
    features: [
      "1 project",
      "3 providers tracked",
      "30 day history",
      "CSV export (100 rows max)",
      "Community support",
    ],
  },
  {
    name: "Pro",
    monthly: 19,
    cta: "Start 14-day trial",
    popular: true,
    features: [
      "Unlimited projects",
      "All providers",
      "1 year history",
      "Unlimited CSV export",
      "Invoice generator",
      "AI spending agent",
      "Priority support",
    ],
  },
  {
    name: "Team",
    monthly: 49,
    cta: "Contact Sales",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Shared project workspace",
      "Admin budget controls",
      "Per-member spend limits",
      "Slack notifications",
    ],
  },
];

function priceFor(monthly: number, annual: boolean) {
  if (!annual) return monthly;
  return +(monthly * 0.8).toFixed(2);
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const tiers = useMemo(
    () => TIERS.map((tier) => ({ ...tier, price: priceFor(tier.monthly, annual) })),
    [annual],
  );

  return (
    <Shell>
      <div className="space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-display font-black heading-gradient">Pricing</h1>
          <p className="text-muted-foreground text-sm md:text-base">Choose the plan that fits your AI spend workflow.</p>

          <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/50 p-1 mt-2">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                !annual ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                annual ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual (20% off)
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {tiers.map((tier, i) => {
            const isPro = tier.name === "Pro";
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-2xl p-[1px] ${
                  isPro
                    ? "bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 shadow-[0_0_24px_rgba(99,102,241,0.25)]"
                    : "bg-border/60"
                }`}
              >
                <div className="h-full rounded-2xl bg-card/95 border border-white/5 p-6 flex flex-col">
                  <div className="mb-5 min-h-[56px]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-display font-bold">{tier.name}</h2>
                      {tier.popular && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-400/40">
                          <Sparkles className="w-3 h-3" />
                          Most Popular
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-5">
                    <p className="text-4xl font-black font-mono">
                      ${tier.price}
                      <span className="text-base font-medium text-muted-foreground">/month</span>
                    </p>
                    {annual && tier.monthly > 0 && (
                      <p className="text-xs text-emerald-400 mt-1">Billed annually • save 20%</p>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isPro
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-secondary border border-border/60 text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="glass-panel rounded-2xl p-6 md:p-8">
          <h3 className="text-xl font-display font-bold mb-4">FAQ</h3>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-foreground">Do I need my own API keys?</p>
              <p className="text-sm text-muted-foreground mt-1">Yes. AI Wallet tracks spend from your provider keys so usage and costs stay accurate.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Is my data secure?</p>
              <p className="text-sm text-muted-foreground mt-1">Yes. Keys are encrypted and sensitive data is never exposed in client responses.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Can I cancel anytime?</p>
              <p className="text-sm text-muted-foreground mt-1">Yes. You can downgrade or cancel your plan anytime from account settings.</p>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
