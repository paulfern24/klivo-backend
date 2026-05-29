import crypto from "node:crypto";

const clips = [];
const sponsors = [];
const clubs = [];

function nowIso() {
  return new Date().toISOString();
}

function withDefaults(payload) {
  return {
    id: crypto.randomUUID(),
    created_at: nowIso(),
    ...payload
  };
}

function paginate(items, { limit = 20, offset = 0 }) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);
  return items.slice(safeOffset, safeOffset + safeLimit);
}

export function mockListClips({ userId, limit = 20, offset = 0 }) {
  const filtered = userId ? clips.filter((c) => c.user_id === userId) : clips;
  return paginate(filtered, { limit, offset });
}

export function mockCreateClip(payload) {
  const clip = withDefaults(payload);
  clips.unshift(clip);
  return clip;
}

export function mockGetClipById(id) {
  return clips.find((c) => c.id === id) ?? null;
}

export function mockUpdateClip(id, payload) {
  const index = clips.findIndex((c) => c.id === id);
  if (index === -1) return null;
  clips[index] = { ...clips[index], ...payload };
  return clips[index];
}

export function mockDeleteClip(id) {
  const index = clips.findIndex((c) => c.id === id);
  if (index === -1) return false;
  clips.splice(index, 1);
  return true;
}

export function mockListSponsors({ limit = 20, offset = 0 }) {
  return paginate(sponsors, { limit, offset });
}

export function mockCreateSponsor(payload) {
  const sponsor = withDefaults(payload);
  sponsors.unshift(sponsor);
  return sponsor;
}

export function mockGetSponsorById(id) {
  return sponsors.find((s) => s.id === id) ?? null;
}

export function mockUpdateSponsor(id, payload) {
  const index = sponsors.findIndex((s) => s.id === id);
  if (index === -1) return null;
  sponsors[index] = { ...sponsors[index], ...payload };
  return sponsors[index];
}

export function mockDeleteSponsor(id) {
  const index = sponsors.findIndex((s) => s.id === id);
  if (index === -1) return false;
  sponsors.splice(index, 1);
  return true;
}

export function mockListClubs({ city, limit = 20, offset = 0 }) {
  const filtered = city ? clubs.filter((c) => c.city === city) : clubs;
  return paginate(filtered, { limit, offset });
}

export function mockCreateClub(payload) {
  const club = withDefaults(payload);
  clubs.unshift(club);
  return club;
}

export function mockGetClubById(id) {
  return clubs.find((c) => c.id === id) ?? null;
}

export function mockUpdateClub(id, payload) {
  const index = clubs.findIndex((c) => c.id === id);
  if (index === -1) return null;
  clubs[index] = { ...clubs[index], ...payload };
  return clubs[index];
}

export function mockDeleteClub(id) {
  const index = clubs.findIndex((c) => c.id === id);
  if (index === -1) return false;
  clubs.splice(index, 1);
  return true;
}
