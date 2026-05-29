import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "FFmpeg não encontrado. Instala FFmpeg no Windows e adiciona-o ao PATH (ffmpeg -version)."
          )
        );
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(stderr.slice(-2000) || `FFmpeg falhou com código ${code}`));
    });
  });
}

function getFontFile() {
  if (process.platform === "win32") {
    return "C\\:/Windows/Fonts/arialbd.ttf";
  }
  if (process.platform === "darwin") {
    return "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
  }
  return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
}

function escapeDrawtext(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

export function parseBroadcastPayload(raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data?.home?.name || !data?.away?.name) return null;
    return data;
  } catch {
    return null;
  }
}

async function downloadImage(url, destPath) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destPath, buffer);
  return destPath;
}

async function tryDownloadLogo(url, destPath) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return null;
  }
  try {
    return await downloadImage(url, destPath);
  } catch {
    return null;
  }
}

function pickActiveSponsor(broadcast) {
  const sponsors = broadcast.sponsors ?? [];
  if (!sponsors.length) return null;
  const index = Number(broadcast.activeSponsorIndex);
  const safeIndex =
    Number.isFinite(index) && index >= 0 ? Math.floor(index) % sponsors.length : 0;
  return sponsors[safeIndex];
}

async function prepareLogoAssets(broadcast, workDir) {
  await fs.mkdir(workDir, { recursive: true });
  const images = [];

  const homePath = await tryDownloadLogo(
    broadcast.home.logoUrl,
    path.join(workDir, "home-logo.png")
  );
  if (homePath) images.push({ role: "home", path: homePath, w: 52, h: 52 });

  const awayPath = await tryDownloadLogo(
    broadcast.away.logoUrl,
    path.join(workDir, "away-logo.png")
  );
  if (awayPath) images.push({ role: "away", path: awayPath, w: 52, h: 52 });

  const sponsor = pickActiveSponsor(broadcast);
  if (sponsor?.logoUrl) {
    const sponsorPath = await tryDownloadLogo(
      sponsor.logoUrl,
      path.join(workDir, "sponsor-active.png")
    );
    if (sponsorPath) {
      images.push({ role: "sponsor", path: sponsorPath, w: 48, h: 48 });
    }
  }

  return { images, sponsor };
}

/** Overlay estilo Capture: equipas em cima à esquerda, 1 sponsor em cima à direita. */
export async function applyBroadcastOverlay(inputPath, outputPath, broadcast) {
  const workDir = `${inputPath}.overlay-assets`;
  const assets = await prepareLogoAssets(broadcast, workDir);

  const font = getFontFile();
  const args = ["-y", "-i", inputPath];
  const filterParts = [];
  let inputIndex = 1;

  for (const image of assets.images) {
    args.push("-i", image.path);
    const scaled = `logo${inputIndex}`;
    filterParts.push(
      `[${inputIndex}:v]scale=${image.w}:${image.h}:force_original_aspect_ratio=decrease[${scaled}]`
    );
    image.scaled = scaled;
    inputIndex += 1;
  }

  let stream = "0:v";
  const chains = [];

  const teamFs = "h/90";
  const vsFs = "h/98";
  const pad = "16";

  chains.push(
    `[${stream}]drawbox=x=${pad}:y=${pad}:w=iw*0.72:h=ih*0.10:color=black@0.62:t=fill[tbar]`
  );
  stream = "tbar";

  const homeImage = assets.images.find((img) => img.role === "home");
  if (homeImage) {
    chains.push(`[${stream}][${homeImage.scaled}]overlay=x=${Number(pad) + 8}:y=${Number(pad) + 10}[vhlogo]`);
    stream = "vhlogo";
  }

  const homeText = escapeDrawtext(broadcast.home.name);
  chains.push(
    `[${stream}]drawtext=fontfile='${font}':text='${homeText}':x=${Number(pad) + 64}:y=${Number(pad) + 22}:fontsize=${teamFs}:fontcolor=white:borderw=1:bordercolor=black@0.35[tname]`
  );
  stream = "tname";

  chains.push(
    `[${stream}]drawtext=fontfile='${font}':text='VS':x=iw*0.30:y=${Number(pad) + 24}:fontsize=${vsFs}:fontcolor=0xFBBF24[tvs]`
  );
  stream = "tvs";

  const awayText = escapeDrawtext(broadcast.away.name);
  chains.push(
    `[${stream}]drawtext=fontfile='${font}':text='${awayText}':x=iw*0.38:y=${Number(pad) + 22}:fontsize=${teamFs}:fontcolor=white:borderw=1:bordercolor=black@0.35[taname]`
  );
  stream = "taname";

  const awayImage = assets.images.find((img) => img.role === "away");
  if (awayImage) {
    chains.push(`[${stream}][${awayImage.scaled}]overlay=x=iw*0.58:y=${Number(pad) + 8}[vaway]`);
    stream = "vaway";
  }

  const sponsorImage = assets.images.find((img) => img.role === "sponsor");
  if (sponsorImage || assets.sponsor) {
    chains.push(
      `[${stream}]drawbox=x=iw*0.84:y=${pad}:w=iw*0.14:h=ih*0.10:color=black@0.45:t=fill[spbar]`
    );
    stream = "spbar";

    if (sponsorImage) {
      chains.push(`[${stream}][${sponsorImage.scaled}]overlay=x=iw*0.855:y=${Number(pad) + 12}[splogo]`);
      stream = "splogo";
    } else if (assets.sponsor?.name) {
      const sponsorText = escapeDrawtext(assets.sponsor.name.slice(0, 12));
      chains.push(
        `[${stream}]drawtext=fontfile='${font}':text='${sponsorText}':x=iw*0.86:y=${Number(pad) + 28}:fontsize=${teamFs}:fontcolor=white[spname]`
      );
      stream = "spname";
    }
  }

  chains.push(`[${stream}]format=yuv420p[vout]`);
  filterParts.push(...chains);

  args.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "[vout]",
    "-map",
    "0:a?",
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
    "-movflags",
    "+faststart",
    outputPath
  );

  try {
    await runFfmpeg(args);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }

  return outputPath;
}
