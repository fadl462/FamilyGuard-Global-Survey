const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8", "cache-control":"no-store"}});
const allowed = new Set(["country","gender","gender_description","guardian","child_ages","devices","concern_level","concerns","current_methods","satisfaction","usefulness","features","approach","barriers","pay_likelihood","price","purchase_factors","open_feedback"]);
export async function onRequestPost({request, env}) {
  if (!env.DB) return json({error:"Survey database is not configured yet."}, 503);
  let body; try { body = await request.json(); } catch { return json({error:"Invalid request body."}, 400); }
  if (!body || body.consent !== true || !body.answers || typeof body.answers !== "object") return json({error:"Please complete the consent step and required answers."}, 400);
  const a = body.answers;
  if (typeof a.country !== "string" || !a.country.trim() || a.guardian !== "yes") return json({error:"This survey is for parents and legal guardians of children under 18."}, 400);
  const clean = {};
  for (const [key, value] of Object.entries(a)) {
    if (!allowed.has(key)) continue;
    if (Array.isArray(value)) clean[key] = value.slice(0, 20).map(v => String(v).slice(0, 160));
    else if (typeof value === "string") clean[key] = value.slice(0, key === "open_feedback" ? 1500 : 200);
  }
  const id = crypto.randomUUID(), createdAt = new Date().toISOString();
  try {
    await env.DB.prepare("INSERT INTO survey_responses (id, created_at, country, answers_json, consent) VALUES (?, ?, ?, ?, 1)")
      .bind(id, createdAt, clean.country, JSON.stringify(clean)).run();

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

    return json({ok:true, id}, 201);
  } catch (e) { return json({error:"We could not save your response. Please try again later."}, 500); }
}
