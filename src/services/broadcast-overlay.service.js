import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

function extractFfmpegError(stderr) {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errorLines = lines.filter(
    (l) =>
      /error|invalid|failed|no such|not found|cannot|unable|impossible|parse/i.test(l) &&
      !/libavutil|configuration:|ffmpeg version/i.test(l)
  );
  if (errorLines.length) {
    return errorLines.slice(-4).join(" · ");
  }
  const tail = lines.slice(-6).join(" · ");
  return tail || `FFmpeg falhou (sem detalhe no log)`;
}

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
      else reject(new Error(extractFfmpegError(stderr)));
    });
  });
}

/** Rotação do telemóvel (display matrix). Devolve graus ou 0. */
export function probeVideoRotation(inputPath) {
  return new Promise((resolve) => {
    const child = spawn(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream_side_data=rotation",
        "-of",
        "csv=p=0",
        inputPath
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let stdout = "";
    child.stdout.on("data", (c) => {
      stdout += c.toString();
    });
    child.on("close", () => {
      const raw = stdout.trim().split(/\r?\n/)[0];
      const deg = Number(raw);
      resolve(Number.isFinite(deg) ? deg : 0);
    });
    child.on("error", () => resolve(0));
  });
}

function rotationToTransposeFilter(degrees) {
  const d = ((Math.round(degrees) % 360) + 360) % 360;
  if (d === 90) return "transpose=1";
  if (d === 180) return "transpose=2,transpose=2";
  if (d === 270) return "transpose=2";
  return null;
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
    if (!data?.home?.name) return null;
    const awayName = typeof data.away?.name === "string" ? data.away.name.trim() : "";
    if (!awayName) {
      if (data.brandingMode === "klivo" || data.home?.clubId === "__klivo_branding__") {
        data.away = {
          ...data.away,
          name: "Klivo",
          clubId: data.away?.clubId ?? "__klivo_branding__",
          logoUrl: data.away?.logoUrl ?? null
        };
      } else {
        return null;
      }
    }
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

function teamInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function persistUploadedLogo(uploadedFile, workDir, basename) {
  if (!uploadedFile?.path) return null;
  const ext = path.extname(uploadedFile.originalname || "") || ".png";
  const dest = path.join(workDir, `${basename}${ext}`);
  await fs.copyFile(uploadedFile.path, dest);
  return dest;
}

async function prepareLogoAssets(broadcast, workDir, uploadedLogos = {}) {
  await fs.mkdir(workDir, { recursive: true });
  const images = [];
  const teamLogoSize = "ih/21";
  const sponsorLogoSize = "ih/20";
  const klivoLogoSize = "ih/28";

  const homePath =
    (await persistUploadedLogo(uploadedLogos.home, workDir, "home-logo")) ??
    (await tryDownloadLogo(broadcast.home.logoUrl, path.join(workDir, "home-logo.png")));
  if (homePath) images.push({ role: "home", path: homePath, size: teamLogoSize });

  const awayPath =
    (await persistUploadedLogo(uploadedLogos.away, workDir, "away-logo")) ??
    (await tryDownloadLogo(broadcast.away.logoUrl, path.join(workDir, "away-logo.png")));
  if (awayPath) images.push({ role: "away", path: awayPath, size: teamLogoSize });

  const sponsor = pickActiveSponsor(broadcast);
  const sponsorPath =
    (await persistUploadedLogo(uploadedLogos.sponsor, workDir, "sponsor-active")) ??
    (sponsor?.logoUrl
      ? await tryDownloadLogo(sponsor.logoUrl, path.join(workDir, "sponsor-active.png"))
      : null);
  if (sponsorPath) {
    images.push({ role: "sponsor", path: sponsorPath, size: sponsorLogoSize });
  }

  const klivoPath = await persistUploadedLogo(uploadedLogos.klivo, workDir, "klivo-icon");
  if (klivoPath) images.push({ role: "klivo", path: klivoPath, size: klivoLogoSize });

  return { images, sponsor };
}

/** Opção A: equipas topo-esq. | Klivo topo-dir. | sponsor rodapé-esq. */
export async function applyBroadcastOverlay(
  inputPath,
  outputPath,
  broadcast,
  uploadedLogos = {}
) {
  const workDir = `${inputPath}.overlay-assets`;
  const assets = await prepareLogoAssets(broadcast, workDir, uploadedLogos);

  const font = getFontFile();
  const rotation = await probeVideoRotation(inputPath);
  const transpose = rotationToTransposeFilter(rotation);
  const args = ["-y", "-noautorotate", "-i", inputPath];
  const filterParts = [];
  let inputIndex = 1;

  for (const image of assets.images) {
    args.push("-i", image.path);
    const scaled = `logo${inputIndex}`;
    filterParts.push(
      `[${inputIndex}:v]scale=${image.size}:-2:force_original_aspect_ratio=decrease,format=rgba[${scaled}]`
    );
    image.scaled = scaled;
    inputIndex += 1;
  }

  let stream = "0:v";
  const chains = [];

  if (transpose) {
    filterParts.push(`[0:v]${transpose}[vrot]`);
    stream = "vrot";
  }

  const teamFs = "h/90";
  const vsFs = "h/98";
  const klivoFs = "h/100";
  const pad = "16";
  const showTeams =
    broadcast.brandingMode !== "klivo" &&
    broadcast.home?.clubId !== "__klivo_branding__" &&
    Boolean(
      typeof broadcast.home?.name === "string" &&
        broadcast.home.name.trim() &&
        typeof broadcast.away?.name === "string" &&
        broadcast.away.name.trim()
    );

  if (showTeams) {
    chains.push(
      `[${stream}]drawbox=x=${pad}:y=${pad}:w=iw*0.72:h=ih*0.10:color=black@0.62:t=fill[tbar]`
    );
    stream = "tbar";

    const homeImage = assets.images.find((img) => img.role === "home");
    const homeNameX = homeImage ? Number(pad) + 64 : Number(pad) + 48;
    if (homeImage) {
      chains.push(`[${stream}][${homeImage.scaled}]overlay=x=${Number(pad) + 8}:y=${Number(pad) + 10}[vhlogo]`);
      stream = "vhlogo";
    } else {
      const homeInit = escapeDrawtext(teamInitials(broadcast.home.name));
      chains.push(
        `[${stream}]drawbox=x=${Number(pad) + 8}:y=${Number(pad) + 10}:w=ih/21:h=ih/21:color=white@0.15:t=fill[hcirc]`
      );
      stream = "hcirc";
      chains.push(
        `[${stream}]drawtext=fontfile='${font}':text='${homeInit}':x=${Number(pad) + 14}:y=${Number(pad) + 20}:fontsize=ih/42:fontcolor=white[vhinit]`
      );
      stream = "vhinit";
    }

    const homeText = escapeDrawtext(broadcast.home.name);
    chains.push(
      `[${stream}]drawtext=fontfile='${font}':text='${homeText}':x=${homeNameX}:y=${Number(pad) + 22}:fontsize=${teamFs}:fontcolor=white:borderw=1:bordercolor=black@0.35[tname]`
    );
    stream = "tname";

    chains.push(
      `[${stream}]drawtext=fontfile='${font}':text='VS':x=w*0.30:y=${Number(pad) + 24}:fontsize=${vsFs}:fontcolor=0xFBBF24[tvs]`
    );
    stream = "tvs";

    const awayText = escapeDrawtext(broadcast.away.name);
    chains.push(
      `[${stream}]drawtext=fontfile='${font}':text='${awayText}':x=w*0.38:y=${Number(pad) + 22}:fontsize=${teamFs}:fontcolor=white:borderw=1:bordercolor=black@0.35[taname]`
    );
    stream = "taname";

    const awayImage = assets.images.find((img) => img.role === "away");
    if (awayImage) {
      chains.push(`[${stream}][${awayImage.scaled}]overlay=x=w*0.58:y=${Number(pad) + 8}[vaway]`);
      stream = "vaway";
    } else {
      const awayInit = escapeDrawtext(teamInitials(broadcast.away.name));
      chains.push(
        `[${stream}]drawbox=x=w*0.58:y=${Number(pad) + 8}:w=ih/21:h=ih/21:color=white@0.15:t=fill[acirc]`
      );
      stream = "acirc";
      chains.push(
        `[${stream}]drawtext=fontfile='${font}':text='${awayInit}':x=w*0.58+6:y=${Number(pad) + 18}:fontsize=ih/42:fontcolor=white[vainit]`
      );
      stream = "vainit";
    }
  }

  chains.push(
    `[${stream}]drawbox=x=w*0.80:y=${pad}:w=w*0.18:h=ih*0.09:color=black@0.62:t=fill[kbar]`
  );
  stream = "kbar";

  const klivoImage = assets.images.find((img) => img.role === "klivo");
  if (klivoImage) {
    chains.push(`[${stream}][${klivoImage.scaled}]overlay=x=w*0.805:y=${Number(pad) + 8}[klogo]`);
    stream = "klogo";
    chains.push(
      `[${stream}]drawtext=fontfile='${font}':text='KLIVO':x=w*0.805+ih/24:y=${Number(pad) + 20}:fontsize=${klivoFs}:fontcolor=white[klivo]`
    );
  } else {
    chains.push(
      `[${stream}]drawtext=fontfile='${font}':text='KLIVO':x=w*0.84:y=${Number(pad) + 20}:fontsize=${klivoFs}:fontcolor=white[klivo]`
    );
  }
  stream = "klivo";

  const sponsorImage = assets.images.find((img) => img.role === "sponsor");
  if (sponsorImage || assets.sponsor) {
    chains.push(
      `[${stream}]drawbox=x=${pad}:y=ih*0.84:w=iw*0.32:h=ih*0.11:color=black@0.45:t=fill[spbar]`
    );
    stream = "spbar";
    chains.push(
      `[${stream}]drawbox=x=${Number(pad) + 5}:y=ih*0.84+5:w=ih/20+10:h=ih/20+10:color=white@0.92:t=fill[spwhite]`
    );
    stream = "spwhite";

    if (sponsorImage) {
      chains.push(
        `[${stream}][${sponsorImage.scaled}]overlay=x=${Number(pad) + 10}:y=main_h*0.84+10[splogo]`
      );
      stream = "splogo";
    } else if (assets.sponsor?.name) {
      const sponsorText = escapeDrawtext(assets.sponsor.name.slice(0, 3).toUpperCase());
      chains.push(
        `[${stream}]drawtext=fontfile='${font}':text='${sponsorText}':x=${Number(pad) + 18}:y=h*0.84+22:fontsize=ih/52:fontcolor=0x0f172a[spname]`
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
