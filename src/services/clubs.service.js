import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import {
  mockCreateClub,
  mockDeleteClub,
  mockGetClubById,
  mockListClubs,
  mockUpdateClub
} from "./mock-db.service.js";

export async function listClubs({ city, limit = 20, offset = 0 }) {
  if (env.useMockDb) {
    return mockListClubs({ city, limit, offset });
  }

  let query = supabase
    .from("clubs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (city) {
    query = query.eq("city", city);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createClub(payload) {
  if (env.useMockDb) {
    return mockCreateClub(payload);
  }

  const { data, error } = await supabase.from("clubs").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function getClubById(id) {
  if (env.useMockDb) {
    return mockGetClubById(id);
  }

  const { data, error } = await supabase.from("clubs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateClub(id, payload) {
  if (env.useMockDb) {
    return mockUpdateClub(id, payload);
  }

  const { data, error } = await supabase
    .from("clubs")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteClub(id) {
  if (env.useMockDb) {
    return mockDeleteClub(id);
  }

  const { error, count } = await supabase
    .from("clubs")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
