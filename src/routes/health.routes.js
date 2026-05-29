import { Router } from "express";
import { runFfmpeg } from "../services/broadcast-overlay.service.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ ok: true, service: "klivo-api" });
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await runFfmpeg(["-version"]);
    res.json({ ok: true, service: "klivo-api", ffmpeg: true });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: "klivo-api",
      ffmpeg: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
