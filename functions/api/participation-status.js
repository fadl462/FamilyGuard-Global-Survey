import { json, getParticipationHash } from "./_duplicate-guard.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Survey service is not configured." }, 503);
  const hash = await getParticipationHash(request, env);
  if (!hash) return json({ error: "The survey is temporarily unavailable while duplicate-prevention is configured." }, 503);
  try {
    const row = await env.DB.prepare("SELECT 1 AS found FROM survey_ip_participation WHERE ip_hash = ? LIMIT 1").bind(hash).first();
    return json({ participated: !!row });
  } catch (_) {
    return json({ error: "The survey is temporarily unavailable while duplicate-prevention is configured." }, 503);
  }
}
