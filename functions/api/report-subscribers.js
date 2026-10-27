const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8", "cache-control":"no-store"}});
export async function onRequestPost({request, env}) {
  if (!env.DB) return json({error:"Report subscription service is not configured yet."}, 503);
  let body; try { body = await request.json(); } catch { return json({error:"Invalid request body."}, 400); }
  const email = String(body?.email || "").trim().toLowerCase();
  if (body?.consent !== true) return json({error:"Separate report consent is required."}, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Please enter a valid email address."}, 400);
  try {
    const createdAt = new Date().toISOString();
    await env.DB.prepare("INSERT INTO report_subscribers (id, created_at, email, consent) VALUES (?, ?, ?, 1)").bind(crypto.randomUUID(), createdAt, email).run();
    return json({ok:true}, 201);
  } catch (e) {
    if (String(e?.message || "").toLowerCase().includes("unique")) return json({ok:true, alreadySubscribed:true}, 200);
    return json({error:"We could not save your report preference. Please try again later."}, 500);
  }
}
