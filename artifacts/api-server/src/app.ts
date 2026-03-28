import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

// ─── Serve built frontend (SPA) ───────────────────────────────────────────────
const frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../ai-spend-autopilot/dist/public",
);

if (fs.existsSync(frontendDist)) {
  // Static assets with long cache (hashed filenames from Vite)
  app.use(express.static(frontendDist, { maxAge: "1y", immutable: true }));
  // SPA fallback — all non-API routes serve index.html
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
  logger.info({ frontendDist }, "Serving frontend static files");
} else {
  logger.warn({ frontendDist }, "Frontend dist not found — skipping static serving");
}

export default app;
