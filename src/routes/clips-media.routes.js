import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import {
  applyBroadcastOverlay,
  parseBroadcastPayload
} from "../services/broadcast-overlay.service.js";
import {
  buildClipFromBuffer,
  ensureOutputDir,
  sanitizeFilename
} from "../services/highlight-merge.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsTmpDir = path.join(__dirname, "../../uploads/tmp");
const uploadsOutDir = path.join(__dirname, "../../uploads/out");

const upload = multer({
  dest: uploadsTmpDir,
  limits: {
    fileSize: 120 * 1024 * 1024,
    files: 24
  }
});

export const clipsMediaRouter = Router();

clipsMediaRouter.post("/apply-overlay", upload.single("video"), async (req, res) => {
  const file = req.file;
  const broadcast = parseBroadcastPayload(req.body?.broadcast);

  if (!file) {
    return res.status(400).json({ error: "Envia o ficheiro de vídeo." });
  }
  if (!broadcast) {
    return res.status(400).json({ error: "broadcast inválido (equipas casa/fora obrigatórias)." });
  }

  const outputFilename = `clip-overlay-${Date.now()}.mp4`;
  const outputPath = path.join(uploadsOutDir, outputFilename);

  try {
    await ensureOutputDir(uploadsOutDir);
    await applyBroadcastOverlay(file.path, outputPath, broadcast);

    return res.status(201).json({
      data: {
        filename: outputFilename,
        downloadUrl: `/highlights/files/${encodeURIComponent(outputFilename)}`,
        overlayApplied: true
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    await fs.unlink(file.path).catch(() => undefined);
  }
});

clipsMediaRouter.post("/extract-last", upload.array("videos", 24), async (req, res) => {
  const files = req.files ?? [];
  const lastSeconds = Number(req.body?.lastSeconds);
  const broadcast = parseBroadcastPayload(req.body?.broadcast);

  if (!files.length) {
    return res.status(400).json({ error: "Envia pelo menos um segmento de vídeo." });
  }
  if (!Number.isFinite(lastSeconds) || lastSeconds <= 0 || lastSeconds > 120) {
    return res.status(400).json({ error: "lastSeconds deve ser entre 1 e 120." });
  }

  const outputFilename = `clip-${sanitizeFilename(String(lastSeconds))}s-${Date.now()}.mp4`;
  const outputPath = path.join(uploadsOutDir, outputFilename);

  try {
    await ensureOutputDir(uploadsTmpDir);
    await ensureOutputDir(uploadsOutDir);

    const inputPaths = files.map((file) => file.path);
    await buildClipFromBuffer(inputPaths, outputPath, lastSeconds, broadcast);

    return res.status(201).json({
      data: {
        filename: outputFilename,
        downloadUrl: `/highlights/files/${encodeURIComponent(outputFilename)}`,
        lastSeconds,
        overlayApplied: Boolean(broadcast)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
  }
});
