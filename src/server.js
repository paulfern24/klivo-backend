import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { requireApiKey } from "./middleware/api-key.middleware.js";
import { clipsRouter } from "./routes/clips.routes.js";
import { clipsMediaRouter } from "./routes/clips-media.routes.js";
import { clubsRouter } from "./routes/clubs.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { highlightsRouter } from "./routes/highlights.routes.js";
import { sponsorsRouter } from "./routes/sponsors.routes.js";
import { seedMockDataIfEmpty } from "./services/mock-seed.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsOutDir = path.join(__dirname, "../uploads/out");

const app = express();

app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, "../public");
app.use("/public", express.static(publicDir, { maxAge: 0, etag: true }));

app.use("/health", healthRouter);
app.use("/highlights/files", express.static(uploadsOutDir));
app.use(requireApiKey);
app.use("/clips", clipsMediaRouter);
app.use("/clips", clipsRouter);
app.use("/highlights", highlightsRouter);
app.use("/sponsors", sponsorsRouter);
app.use("/clubs", clubsRouter);

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Klivo API running on port ${env.port}`);
  if (env.useMockDb) {
    seedMockDataIfEmpty();
    console.log("Running in MOCK mode (no Supabase credentials configured).");
  }
});
