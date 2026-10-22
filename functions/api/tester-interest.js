const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8", "cache-control":"no-store"}});
const isValidEmail = (email) => { if (!email || email.length > 254 || /\s/.test(email)) return false; const parts = email.split("@"); if (parts.length !== 2) return false; const [local, domain] = parts; const label = /^[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?$/i; return !!local && local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..") && /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) && domain.length <= 253 && domain.split(".").length >= 2 && domain.split(".").every(part => label.test(part)); };
export async function onRequestPost({request, env}) {
  if (!env.DB) return json({error:"Testing-interest service is not configured yet."}, 503);
  let body; try { body = await request.json(); } catch { return json({error:"Invalid request body."}, 400); }
  const email = String(body?.email || "").trim().toLowerCase();
  if (body?.consent !== true) return json({error:"Separate testing-contact consent is required."}, 400);
  if (!isValidEmail(email)) return json({error:"Please enter a valid email address."}, 400);
  try {
    await env.DB.prepare("INSERT INTO tester_interest_contacts (id, created_at, email, consent) VALUES (?, ?, ?, 1)").bind(crypto.randomUUID(), new Date().toISOString(), email).run();
    return json({ok:true}, 201);
  } catch (e) {
    if (String(e?.message || "").toLowerCase().includes("unique")) return json({ok:true, alreadyInterested:true}, 200);
    return json({error:"We could not save your testing interest. Please try again later."}, 500);
  }
}
