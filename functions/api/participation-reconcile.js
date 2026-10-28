import { json, getParticipationHash, isAuthorizedTestRequest } from "./_duplicate-guard.js";

// Owner-only recovery endpoint. Never exposes raw IP addresses or secrets.
// The exact response_id mode is used when an existing valid response already has
// a participation row, but the configured hash secret or network changed after it
// was created. It rebinds that one row to the owner's current connection hash.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Survey service is not configured." }, 503);
  if (!isAuthorizedTestRequest(request, env)) return json({ error: "Not authorized." }, 401);

  const hash = await getParticipationHash(request, env);
  if (!hash) return json({ error: "Duplicate protection is not configured. Check the production DUPLICATE_HASH_SECRET." }, 503);

  let body = {};
  try { body = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  try {
    const existingHash = await env.DB.prepare(
      "SELECT response_id FROM survey_ip_participation WHERE ip_hash = ? LIMIT 1"
    ).bind(hash).first();
    if (existingHash) {
      return json({ ok: true, alreadyLinked: true, responseId: existingHash.response_id,
        message: "This internet connection is already linked to a recorded participation." });
    }

    const responseId = typeof body.response_id === "string" ? body.response_id.trim() : "";
    if (responseId) {
      const existingResponse = await env.DB.prepare(
        "SELECT id, created_at FROM survey_responses WHERE id = ? LIMIT 1"
      ).bind(responseId).first();
      if (!existingResponse) return json({ error: "The specified response ID was not found. No changes were made." }, 404);

      const existingParticipation = await env.DB.prepare(
        "SELECT ip_hash FROM survey_ip_participation WHERE response_id = ? LIMIT 1"
      ).bind(responseId).first();
      if (existingParticipation) {
        // Replace the old hash for this exact response; the unique response_id
        // constraint remains intact and no survey response is added or deleted.
        const updated = await env.DB.prepare(
          "UPDATE survey_ip_participation SET ip_hash = ?, created_at = ?, source = COALESCE(source, 'standard') WHERE response_id = ?"
        ).bind(hash, existingResponse.created_at || new Date().toISOString(), responseId).run();
        if (Number(updated?.meta?.changes || 0) !== 1) {
          return json({ error: "The existing participation could not be rebound. No new response was created." }, 503);
        }
        return json({ ok: true, linked: true, responseId,
          message: "The existing response is now linked to this internet connection. Both survey links will recognise it." });
      }

      await env.DB.prepare(
        "INSERT INTO survey_ip_participation (ip_hash, response_id, created_at, source) VALUES (?, ?, ?, 'standard')"
      ).bind(hash, responseId, existingResponse.created_at || new Date().toISOString()).run();
      return json({ ok: true, linked: true, responseId,
        message: "The existing response is now linked to this internet connection. Both survey links will recognise it." });
    }

    // Legacy mode: only auto-link when exactly one response has no participation row.
    const candidates = await env.DB.prepare(
      "SELECT r.id, r.created_at FROM survey_responses r " +
      "LEFT JOIN survey_ip_participation p ON p.response_id = r.id " +
      "WHERE p.response_id IS NULL ORDER BY r.created_at DESC LIMIT 2"
    ).all();
    const rows = candidates?.results || [];
    if (rows.length !== 1) {
      return json({ error: rows.length === 0
        ? "There is no unclaimed legacy response to reconcile. Supply the exact response_id only after identifying the correct existing response."
        : "More than one unclaimed response exists. No changes were made; an administrator must identify the correct response.",
        candidates: rows.length }, 409);
    }
    const row = rows[0];
    await env.DB.prepare(
      "INSERT INTO survey_ip_participation (ip_hash, response_id, created_at, source) VALUES (?, ?, ?, 'standard')"
    ).bind(hash, row.id, row.created_at || new Date().toISOString()).run();
    return json({ ok: true, linked: true, responseId: row.id,
      message: "The existing response is now linked to this internet connection. Both survey links should block repeat participation." });
  } catch (error) {
    try {
      const current = await env.DB.prepare(
        "SELECT response_id FROM survey_ip_participation WHERE ip_hash = ? LIMIT 1"
      ).bind(hash).first();
      if (current) return json({ ok: true, alreadyLinked: true, responseId: current.response_id,
        message: "This internet connection is already linked to a recorded participation." });
    } catch {}
    return json({ error: "Could not reconcile the existing response. Verify the D1 migration and production secrets." }, 503);
  }
}
