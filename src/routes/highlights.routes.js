import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import {
  ensureOutputDir,
  mergeVideosToFile,
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
    files: 20
  }
});

export const highlightsRouter = Router();

highlightsRouter.post("/merge", upload.array("videos", 20), async (req, res) => {
  const files = req.files ?? [];
  if (files.length < 2) {
    return res.status(400).json({ error: "Envia pelo menos 2 vídeos para criar o highlight." });
  }

  const title = sanitizeFilename(req.body?.title?.trim() || "highlight");
  const stamp = Date.now();
  const outputFilename = `${title}-${stamp}.mp4`;
  const outputPath = path.join(uploadsOutDir, outputFilename);

  try {
    await ensureOutputDir(uploadsTmpDir);
    await ensureOutputDir(uploadsOutDir);

    const inputPaths = files.map((file) => file.path);
    await mergeVideosToFile(inputPaths, outputPath);

    return res.status(201).json({
      data: {
        filename: outputFilename,
        downloadUrl: `/highlights/files/${encodeURIComponent(outputFilename)}`,
        clipCount: files.length
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    await Promise.all(
      files.map((file) => fs.unlink(file.path).catch(() => undefined))
    );
  }
});
