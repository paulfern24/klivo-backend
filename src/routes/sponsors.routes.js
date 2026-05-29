import { Router } from "express";
import {
  createSponsor,
  deleteSponsor,
  getSponsorById,
  listSponsors,
  updateSponsor
} from "../services/sponsors.service.js";
import {
  validateIdParam,
  validatePagination,
  validateSponsorPatchPayload,
  validateSponsorPayload
} from "../validation/request.validators.js";

export const sponsorsRouter = Router();

sponsorsRouter.get("/", async (req, res) => {
  try {
    const { limit, offset } = validatePagination(req.query);
    const sponsors = await listSponsors({ limit, offset });
    res.json({ data: sponsors, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

sponsorsRouter.post("/", async (req, res) => {
  const validation = validateSponsorPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: "Validation failed", details: validation.errors });
  }

  try {
    const sponsor = await createSponsor(validation.data);
    return res.status(201).json({ data: sponsor });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

sponsorsRouter.get("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });

  try {
    const sponsor = await getSponsorById(req.params.id);
    if (!sponsor) return res.status(404).json({ error: "Sponsor not found." });
    return res.json({ data: sponsor });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

sponsorsRouter.patch("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });
  const payloadValidation = validateSponsorPatchPayload(req.body);
  if (!payloadValidation.ok) return res.status(400).json({ error: "Validation failed", details: payloadValidation.errors });

  try {
    const sponsor = await updateSponsor(req.params.id, payloadValidation.data);
    if (!sponsor) return res.status(404).json({ error: "Sponsor not found." });
    return res.json({ data: sponsor });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

sponsorsRouter.delete("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });

  try {
    const deleted = await deleteSponsor(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Sponsor not found." });
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
