const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8", "cache-control":"no-store"}});
const allowed = new Set(["country","guardian","child_ages","devices","concern_level","concerns","current_methods","satisfaction","usefulness","features","approach","barriers","pay_likelihood","price","purchase_factors","open_feedback"]);
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
    return json({ok:true, id}, 201);
  } catch (e) { return json({error:"We could not save your response. Please try again later."}, 500); }
}
