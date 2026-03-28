import app from "./app";
import { logger } from "./lib/logger";

// ─── API key presence check (never log the actual values) ─────────────────────
console.log("ANTHROPIC_API_KEY set:", !!process.env.ANTHROPIC_API_KEY);
console.log("OPENAI_API_KEY set:",    !!process.env.OPENAI_API_KEY);
console.log("GEMINI_API_KEY set:",    !!process.env.GEMINI_API_KEY);

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
