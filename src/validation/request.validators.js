function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isUUID(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isBoolean(value) {
  return typeof value === "boolean";
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function asNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}

function parsePagination(query) {
  const limit = asNumber(query?.limit);
  const offset = asNumber(query?.offset);
  return {
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20,
    offset: Number.isInteger(offset) && offset >= 0 ? offset : 0
  };
}

export function validateClipPayload(payload) {
  const errors = [];
  const category = payload?.category;
  const durationSec = asNumber(payload?.duration_sec);
  const bufferSec = asNumber(payload?.buffer_sec);

  if (!isUUID(payload?.user_id)) {
    errors.push("user_id must be a valid UUID.");
  }
  if (!["goal", "amazing", "fail"].includes(category)) {
    errors.push("category must be one of: goal, amazing, fail.");
  }
  if (!isPositiveInt(durationSec)) {
    errors.push("duration_sec must be a positive integer.");
  }
  if (![10, 20, 30, 60].includes(bufferSec)) {
    errors.push("buffer_sec must be one of: 10, 20, 30, 60.");
  }
  if (
    payload?.has_watermark !== undefined &&
    typeof payload.has_watermark !== "boolean"
  ) {
    errors.push("has_watermark must be boolean when provided.");
  }
  if (payload?.session_id !== undefined && payload.session_id !== null && !isUUID(payload.session_id)) {
    errors.push("session_id must be a valid UUID when provided.");
  }
  if (
    payload?.local_filename !== undefined &&
    payload.local_filename !== null &&
    typeof payload.local_filename !== "string"
  ) {
    errors.push("local_filename must be a string when provided.");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      user_id: payload.user_id,
      category,
      duration_sec: durationSec,
      buffer_sec: bufferSec,
      local_filename: payload.local_filename ?? null,
      cloud_url: payload.cloud_url ?? null,
      session_id: payload.session_id ?? null,
      has_watermark:
        payload.has_watermark === undefined ? true : payload.has_watermark
    }
  };
}

export function validateClipPatchPayload(payload) {
  const errors = [];
  const data = {};

  if (payload?.category !== undefined) {
    if (!["goal", "amazing", "fail"].includes(payload.category)) {
      errors.push("category must be one of: goal, amazing, fail.");
    } else {
      data.category = payload.category;
    }
  }
  if (payload?.duration_sec !== undefined) {
    const duration = asNumber(payload.duration_sec);
    if (!isPositiveInt(duration)) errors.push("duration_sec must be a positive integer.");
    else data.duration_sec = duration;
  }
  if (payload?.buffer_sec !== undefined) {
    const buffer = asNumber(payload.buffer_sec);
    if (![10, 20, 30, 60].includes(buffer)) errors.push("buffer_sec must be one of: 10, 20, 30, 60.");
    else data.buffer_sec = buffer;
  }
  if (payload?.local_filename !== undefined) data.local_filename = payload.local_filename;
  if (payload?.cloud_url !== undefined) data.cloud_url = payload.cloud_url;
  if (payload?.has_watermark !== undefined) {
    if (!isBoolean(payload.has_watermark)) errors.push("has_watermark must be boolean.");
    else data.has_watermark = payload.has_watermark;
  }

  if (Object.keys(data).length === 0) {
    errors.push("Provide at least one valid field to update.");
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}

export function validateSponsorPayload(payload) {
  const errors = [];
  const monthlyPrice = payload?.monthly_price_chf === undefined
    ? undefined
    : asNumber(payload.monthly_price_chf);

  if (!isNonEmptyString(payload?.name)) {
    errors.push("name is required.");
  }
  if (monthlyPrice !== undefined && Number.isNaN(monthlyPrice)) {
    errors.push("monthly_price_chf must be numeric when provided.");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name: payload.name.trim(),
      logo_url: payload.logo_url ?? null,
      geo_zone: payload.geo_zone ?? null,
      monthly_price_chf: monthlyPrice ?? null
    }
  };
}

export function validateSponsorPatchPayload(payload) {
  const errors = [];
  const data = {};

  if (payload?.name !== undefined) {
    if (!isNonEmptyString(payload.name)) errors.push("name must be a non-empty string.");
    else data.name = payload.name.trim();
  }
  if (payload?.logo_url !== undefined) data.logo_url = payload.logo_url;
  if (payload?.geo_zone !== undefined) data.geo_zone = payload.geo_zone;
  if (payload?.monthly_price_chf !== undefined) {
    const value = asNumber(payload.monthly_price_chf);
    if (Number.isNaN(value)) errors.push("monthly_price_chf must be numeric.");
    else data.monthly_price_chf = value;
  }

  if (Object.keys(data).length === 0) errors.push("Provide at least one valid field to update.");

  return errors.length ? { ok: false, errors } : { ok: true, data };
}

export function validateClubPayload(payload) {
  const errors = [];
  const monthlyFee = payload?.monthly_fee_chf === undefined
    ? undefined
    : asNumber(payload.monthly_fee_chf);

  if (!isNonEmptyString(payload?.name)) {
    errors.push("name is required.");
  }
  if (monthlyFee !== undefined && Number.isNaN(monthlyFee)) {
    errors.push("monthly_fee_chf must be numeric when provided.");
  }
  if (payload?.sponsor_id !== undefined && payload.sponsor_id !== null && !isUUID(payload.sponsor_id)) {
    errors.push("sponsor_id must be a valid UUID when provided.");
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name: payload.name.trim(),
      city: payload.city ?? null,
      logo_url: payload.logo_url ?? null,
      sponsor_id: payload.sponsor_id ?? null,
      monthly_fee_chf: monthlyFee ?? null
    }
  };
}

export function validateClubPatchPayload(payload) {
  const errors = [];
  const data = {};

  if (payload?.name !== undefined) {
    if (!isNonEmptyString(payload.name)) errors.push("name must be a non-empty string.");
    else data.name = payload.name.trim();
  }
  if (payload?.city !== undefined) data.city = payload.city;
  if (payload?.logo_url !== undefined) data.logo_url = payload.logo_url;
  if (payload?.sponsor_id !== undefined) {
    if (payload.sponsor_id !== null && !isUUID(payload.sponsor_id)) {
      errors.push("sponsor_id must be a valid UUID or null.");
    } else {
      data.sponsor_id = payload.sponsor_id;
    }
  }
  if (payload?.monthly_fee_chf !== undefined) {
    const value = asNumber(payload.monthly_fee_chf);
    if (Number.isNaN(value)) errors.push("monthly_fee_chf must be numeric.");
    else data.monthly_fee_chf = value;
  }

  if (Object.keys(data).length === 0) errors.push("Provide at least one valid field to update.");

  return errors.length ? { ok: false, errors } : { ok: true, data };
}

export function validateIdParam(id) {
  if (!isUUID(id)) {
    return { ok: false, errors: ["id must be a valid UUID."] };
  }
  return { ok: true };
}

export function validatePagination(query) {
  return parsePagination(query);
}
