# AI Wallet — Never Run Out of Tokens Again

AI Wallet is a full-stack dashboard that gives you real-time visibility into your AI API spending across OpenAI, Anthropic, and Google Gemini. It tracks every request as a wallet transaction, lets you set budget alerts, and routes prompts through a unified proxy endpoint that automatically logs cost and token usage to a Supabase database.

---

## Features

- **Wallet dashboard** — live balance, transaction feed, spend modes (Saver / Balanced / Performance)
- **Usage analytics** — spend by model, monthly summary, month-over-month trends
- **Budget alerts** — configurable threshold checks against real month-to-date spend
- **AI proxy** — `POST /api/proxy/chat` forwards to OpenAI / Anthropic / Gemini and logs cost automatically
- **Replit Auth** — OIDC sign-in, per-user data isolation

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. On Replit, set these in the **Secrets** tab instead of a file.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase recommended) |
| `PORT` | Yes (API) | Port for the Express API server (default `8080` on Replit) |
| `OPENAI_API_KEY` | Optional | Enables `provider: "openai"` on the proxy endpoint |
| `ANTHROPIC_API_KEY` | Optional | Enables `provider: "anthropic"` on the proxy endpoint |
| `GEMINI_API_KEY` | Optional | Enables `provider: "gemini"` on the proxy endpoint |
| `NODE_ENV` | Auto | Set to `production` by the build; `development` locally |
| `REPL_ID` | Auto | Set automatically by Replit for OIDC auth |
| `ISSUER_URL` | Auto | Set automatically by Replit for OIDC auth |

---

## Running Locally

### Prerequisites

- Node.js 20+
- pnpm 9+
- A PostgreSQL database (Supabase free tier works)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in DATABASE_URL
cp .env.example .env

# 3. Push the database schema
pnpm --filter @workspace/db run push

# 4. Start both services
PORT=22561 BASE_PATH=/ pnpm --filter @workspace/ai-spend-autopilot run dev &
PORT=8080  pnpm --filter @workspace/api-server run dev
```

The frontend is available at `http://localhost:22561` and proxies `/api` requests to the Express server on port `8080`.

### Project Structure

```
artifacts/
  ai-spend-autopilot/   # React + Vite frontend
  api-server/           # Express 5 API server
lib/
  db/                   # Drizzle ORM schema + Supabase client
  api-spec/             # OpenAPI spec + Orval codegen config
  api-client-react/     # Generated React Query hooks
  api-zod/              # Generated Zod schemas
```

---

## Deploying on Replit

1. **Fork or import** this repo into Replit.
2. Open the **Secrets** tab and add `DATABASE_URL` (and any provider API keys you want).
3. Run the database migration once:
   ```bash
   pnpm --filter @workspace/db run push
   ```
4. Click **Deploy** — Replit builds and hosts both services automatically using the configuration in each artifact's `artifact.toml`.

The API server will be available at `https://your-app.replit.app/api` and the frontend at `https://your-app.replit.app/`.

---

## Running Codegen

If you change `lib/api-spec/openapi.yaml`, regenerate the client and Zod schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```
