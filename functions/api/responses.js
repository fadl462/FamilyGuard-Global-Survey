import { json, getParticipationHash, isAuthorizedTestRequest } from "./_duplicate-guard.js";
const allowed = new Set(["country","gender","gender_description","guardian","child_ages","devices","concern_level","concerns","current_methods","satisfaction","usefulness","features","approach","barriers","pay_likelihood","price","purchase_factors","open_feedback","contest_source","freelancer_id"]);
export async function onRequestPost({request, env}) {
  if (!env.DB) return json({error:"Survey database is not configured yet."}, 503);
  let body; try { body = await request.json(); } catch { return json({error:"Invalid request body."}, 400); }
  if (!body || body.consent !== true || !body.answers || typeof body.answers !== "object") return json({error:"Please complete the consent step and required answers."}, 400);
  const a = body.answers;
  if (typeof a.country !== "string" || !a.country.trim() || a.guardian !== "yes") return json({error:"This survey is for parents and legal guardians of children under 18."}, 400);
  const source = body.source === "freelancer-contest" ? "freelancer-contest" : "standard";
  const freelancerId = typeof body.freelancer_id === "string" ? body.freelancer_id.trim().slice(0,80) : "";
  if (source === "freelancer-contest" && (!freelancerId || body.contest_consent !== true)) return json({error:"Contest entries require a Freelancer.com user ID and consent to use it for contest administration."}, 400);
  const clean = {};
  for (const [key, value] of Object.entries(a)) {
    if (!allowed.has(key)) continue;
    if (Array.isArray(value)) clean[key] = value.slice(0, 20).map(v => String(v).slice(0, 160));
    else if (typeof value === "string") clean[key] = value.slice(0, key === "open_feedback" ? 1500 : 200);
  }
  if (source === "freelancer-contest") { clean.contest_source = source; clean.freelancer_id = freelancerId; }
  const testMode = isAuthorizedTestRequest(request, env);
  const participationHash = testMode ? null : await getParticipationHash(request, env);
  if (!testMode && !participationHash) return json({error:"The survey is temporarily unavailable while duplicate-prevention is configured."}, 503);
  const id = crypto.randomUUID(), createdAt = new Date().toISOString();
  try {
    if (testMode) {
      // Test submissions are saved for review but never claim the tester's IP.
      await env.DB.prepare("INSERT INTO survey_responses (id, created_at, country, answers_json, consent) VALUES (?, ?, ?, ?, 1)")
        .bind(id, createdAt, clean.country, JSON.stringify(clean)).run();
    } else {
      // D1 batch keeps the unique IP claim and response atomic for public visitors.
      await env.DB.batch([
        env.DB.prepare("INSERT INTO survey_ip_participation (ip_hash, response_id, created_at, source) VALUES (?, ?, ?, ?)")
          .bind(participationHash, id, createdAt, source),
        env.DB.prepare("INSERT INTO survey_responses (id, created_at, country, answers_json, consent) VALUES (?, ?, ?, ?, 1)")
          .bind(id, createdAt, clean.country, JSON.stringify(clean))
      ]);
    }

    // If the optional export tracker has been installed, mark the next 20-response
    // batch as ready. Survey submissions still succeed if the tracker is not yet migrated.
    try {
      const countRow = await env.DB.prepare("SELECT COUNT(*) AS total FROM survey_responses").first();
      const state = await env.DB.prepare("SELECT last_exported_count FROM survey_export_state WHERE id = 'main'").first();
      if (state && Number(countRow?.total || 0) - Number(state.last_exported_count || 0) >= 20) {
        const readyCount = Number(state.last_exported_count || 0) + 20;
        await env.DB.prepare("UPDATE survey_export_state SET ready_count = MAX(ready_count, ?) WHERE id = 'main'").bind(readyCount).run();
      }
    } catch (_) { /* Tracker migration is optional; never block a valid survey submission. */ }

    return json({ok:true, id, testMode}, 201);
  } catch (e) {
    try {
      const existing = !testMode && await env.DB.prepare("SELECT 1 AS found FROM survey_ip_participation WHERE ip_hash = ? LIMIT 1").bind(participationHash).first();
      if (existing) return json({error:"A survey response has already been submitted from this internet connection. Each participant may submit only once across both survey links.", alreadyParticipated:true}, 409);
    } catch (_) { /* The setup guide explains the required one-time D1 migration. */ }
    return json({error:"We could not save your response. Please check that the duplicate-prevention migration and secret are configured, then try again."}, 503);
  }
}
