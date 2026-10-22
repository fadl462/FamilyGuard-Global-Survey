export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export async function getParticipationHash(request, env) {
  const secret = env.DUPLICATE_HASH_SECRET;
  const ip = request.headers.get("CF-Connecting-IP");
  if (!secret || secret.length < 32 || !ip) return null;
  const bytes = new TextEncoder().encode(`${secret}:${ip.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Temporary owner-only test mode. The token is stored only in a Cloudflare secret
// and supplied by the browser in a request header, never in a request URL.
export function isAuthorizedTestRequest(request, env) {
  // Cloudflare secrets are sometimes pasted with a trailing newline or spaces.
  // Normalize surrounding whitespace without weakening the minimum-length check.
  const expected = typeof env.SURVEY_TESTING_TOKEN === "string" ? env.SURVEY_TESTING_TOKEN.trim() : "";
  const suppliedHeader = request.headers.get("X-Survey-Test-Token");
  const supplied = typeof suppliedHeader === "string" ? suppliedHeader.trim() : "";
  return expected.length >= 32 && supplied.length >= 32 && supplied === expected;
}
