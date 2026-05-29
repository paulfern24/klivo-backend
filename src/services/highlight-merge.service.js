import fs from "node:fs/promises";
import path from "node:path";
import { applyBroadcastOverlay, runFfmpeg } from "./broadcast-overlay.service.js";

export async function trimVideoLastSeconds(inputPath, outputPath, seconds, reencode = false) {
  const safeSeconds = Math.max(1, Number(seconds) || 1);
  const args = ["-y", "-sseof", `-${safeSeconds}`, "-i", inputPath];

  if (reencode) {
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      outputPath
    );
  } else {
    args.push("-c", "copy", outputPath);
  }

  try {
    await runFfmpeg(args);
  } catch (error) {
    if (!reencode) {
      await trimVideoLastSeconds(inputPath, outputPath, seconds, true);
      return outputPath;
    }
    throw error;
  }
  return outputPath;
}

export async function buildClipFromBuffer(inputPaths, outputPath, lastSeconds, broadcast = null) {
  if (!inputPaths.length) {
    throw new Error("Sem segmentos de vídeo para extrair o clip.");
  }

  const seconds = Math.max(1, Number(lastSeconds) || 1);
  const trimmedPath = broadcast ? `${outputPath}.trim.mp4` : outputPath;
  let sourcePath = inputPaths[0];

  if (inputPaths.length > 1) {
    sourcePath = `${outputPath}.merged.mp4`;
    await mergeVideosToFile(inputPaths, sourcePath);
  }

  try {
    await trimVideoLastSeconds(sourcePath, trimmedPath, seconds, Boolean(broadcast));

    if (broadcast) {
      await applyBroadcastOverlay(trimmedPath, outputPath, broadcast);
      await fs.unlink(trimmedPath).catch(() => undefined);
    }
  } finally {
    if (inputPaths.length > 1) {
      await fs.unlink(sourcePath).catch(() => undefined);
    }
  }

  return outputPath;
}

export async function mergeVideosToFile(inputPaths, outputPath) {
  if (inputPaths.length < 2) {
    throw new Error("São necessários pelo menos 2 vídeos para criar um highlight.");
  }

  const listPath = `${outputPath}.txt`;
  const listBody = inputPaths
    .map((filePath) => `file '${filePath.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");

  await fs.writeFile(listPath, listBody, "utf8");

  try {
    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      outputPath
    ]);
  } finally {
    await fs.unlink(listPath).catch(() => undefined);
  }

  return outputPath;
}

export async function ensureOutputDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function sanitizeFilename(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
