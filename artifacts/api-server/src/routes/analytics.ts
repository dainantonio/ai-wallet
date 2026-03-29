import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.post("/analytics/events", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { event, properties, ts, path } = req.body as {
    event?: string;
    properties?: Record<string, unknown>;
    ts?: number;
    path?: string;
  };

  if (!event) {
    res.status(400).json({ error: "event is required" });
    return;
  }

  req.log.info({ event, properties, ts, path, userId: req.user.id }, "analytics_event");
  res.json({ ok: true });
});

export default router;
