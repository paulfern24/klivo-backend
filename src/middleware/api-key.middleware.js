import { env } from "../config/env.js";

export function requireApiKey(req, res, next) {
  if (!env.apiKey) return next();

  const provided = req.header("x-api-key");
  if (provided !== env.apiKey) {
    return res.status(401).json({ error: "Unauthorized: invalid API key." });
  }

  return next();
}
