import { Router } from "express";
import {
  createClip,
  deleteClip,
  getClipById,
  listClips,
  updateClip
} from "../services/clips.service.js";
import {
  validateClipPatchPayload,
  validateClipPayload,
  validateIdParam,
  validatePagination
} from "../validation/request.validators.js";

export const clipsRouter = Router();

clipsRouter.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    const { limit, offset } = validatePagination(req.query);
    const clips = await listClips({ userId, limit, offset });
    res.json({ data: clips, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

clipsRouter.post("/", async (req, res) => {
  const validation = validateClipPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: "Validation failed", details: validation.errors });
  }

  try {
    const clip = await createClip(validation.data);
    return res.status(201).json({ data: clip });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

clipsRouter.get("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });

  try {
    const clip = await getClipById(req.params.id);
    if (!clip) return res.status(404).json({ error: "Clip not found." });
    return res.json({ data: clip });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

clipsRouter.patch("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });
  const payloadValidation = validateClipPatchPayload(req.body);
  if (!payloadValidation.ok) {
    return res.status(400).json({ error: "Validation failed", details: payloadValidation.errors });
  }

  try {
    const clip = await updateClip(req.params.id, payloadValidation.data);
    if (!clip) return res.status(404).json({ error: "Clip not found." });
    return res.json({ data: clip });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

clipsRouter.delete("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });

  try {
    const deleted = await deleteClip(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Clip not found." });
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
