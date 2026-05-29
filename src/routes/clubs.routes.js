import { Router } from "express";
import {
  createClub,
  deleteClub,
  getClubById,
  listClubs,
  updateClub
} from "../services/clubs.service.js";
import {
  validateClubPatchPayload,
  validateClubPayload,
  validateIdParam,
  validatePagination
} from "../validation/request.validators.js";

export const clubsRouter = Router();

clubsRouter.get("/", async (req, res) => {
  try {
    const city = req.query.city;
    const { limit, offset } = validatePagination(req.query);
    const clubs = await listClubs({ city, limit, offset });
    res.json({ data: clubs, pagination: { limit, offset } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

clubsRouter.post("/", async (req, res) => {
  const validation = validateClubPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: "Validation failed", details: validation.errors });
  }

  try {
    const club = await createClub(validation.data);
    return res.status(201).json({ data: club });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

clubsRouter.get("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });

  try {
    const club = await getClubById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found." });
    return res.json({ data: club });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

clubsRouter.patch("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });
  const payloadValidation = validateClubPatchPayload(req.body);
  if (!payloadValidation.ok) return res.status(400).json({ error: "Validation failed", details: payloadValidation.errors });

  try {
    const club = await updateClub(req.params.id, payloadValidation.data);
    if (!club) return res.status(404).json({ error: "Club not found." });
    return res.json({ data: club });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

clubsRouter.delete("/:id", async (req, res) => {
  const idValidation = validateIdParam(req.params.id);
  if (!idValidation.ok) return res.status(400).json({ error: "Validation failed", details: idValidation.errors });

  try {
    const deleted = await deleteClub(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Club not found." });
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
