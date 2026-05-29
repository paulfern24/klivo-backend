import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import {
  mockCreateSponsor,
  mockDeleteSponsor,
  mockGetSponsorById,
  mockListSponsors,
  mockUpdateSponsor
} from "./mock-db.service.js";

export async function listSponsors({ limit = 20, offset = 0 }) {
  if (env.useMockDb) {
    return mockListSponsors({ limit, offset });
  }

  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

export async function createSponsor(payload) {
  if (env.useMockDb) {
    return mockCreateSponsor(payload);
  }

  const { data, error } = await supabase.from("sponsors").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function getSponsorById(id) {
  if (env.useMockDb) {
    return mockGetSponsorById(id);
  }

  const { data, error } = await supabase.from("sponsors").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSponsor(id, payload) {
  if (env.useMockDb) {
    return mockUpdateSponsor(id, payload);
  }

  const { data, error } = await supabase
    .from("sponsors")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteSponsor(id) {
  if (env.useMockDb) {
    return mockDeleteSponsor(id);
  }

  const { error, count } = await supabase
    .from("sponsors")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
