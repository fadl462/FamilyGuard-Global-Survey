import { json, getParticipationHash, isAuthorizedTestRequest } from "./_duplicate-guard.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Survey service is not configured." }, 503);
  // Authorized test devices can reopen the survey without claiming an IP.
  if (isAuthorizedTestRequest(request, env)) return json({ participated: false, testMode: true });
  const hash = await getParticipationHash(request, env);
  if (!hash) return json({ error: "The survey is temporarily unavailable while duplicate-prevention is configured." }, 503);
  try {
    const row = await env.DB.prepare("SELECT 1 AS found FROM survey_ip_participation WHERE ip_hash = ? LIMIT 1").bind(hash).first();
    return json({ participated: !!row, testMode: false });
  } catch (_) {
    return json({ error: "The survey is temporarily unavailable while duplicate-prevention is configured." }, 503);
  }
}
