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
