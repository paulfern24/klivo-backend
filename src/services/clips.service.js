import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import {
  mockCreateClip,
  mockDeleteClip,
  mockGetClipById,
  mockListClips,
  mockUpdateClip
} from "./mock-db.service.js";

export async function listClips({ userId, limit = 20, offset = 0 }) {
  if (env.useMockDb) {
    return mockListClips({ userId, limit, offset });
  }

  let query = supabase
    .from("clips")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createClip(payload) {
  if (env.useMockDb) {
    return mockCreateClip(payload);
  }

  const { data, error } = await supabase.from("clips").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function getClipById(id) {
  if (env.useMockDb) {
    return mockGetClipById(id);
  }

  const { data, error } = await supabase.from("clips").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateClip(id, payload) {
  if (env.useMockDb) {
    return mockUpdateClip(id, payload);
  }

  const { data, error } = await supabase
    .from("clips")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteClip(id) {
  if (env.useMockDb) {
    return mockDeleteClip(id);
  }

  const { error, count } = await supabase
    .from("clips")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
