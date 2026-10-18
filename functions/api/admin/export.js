const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
export async function onRequestGet({request, env}) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || new URL(request.url).searchParams.get("token") || "";
  if (!env.ADMIN_TOKEN || token.length < 20 || token !== env.ADMIN_TOKEN) return new Response("Unauthorized", {status:401, headers:{"cache-control":"no-store"}});
  if (!env.DB) return new Response("Database is not configured", {status:503});
  const url = new URL(request.url), kind = url.searchParams.get("kind") || "survey";
  try {
    if (["report", "testers"].includes(kind)) {
      const table = kind === "report" ? "report_subscribers" : "tester_interest_contacts";
      const filename = kind === "report" ? "familyguard-report-subscribers.csv" : "familyguard-testing-interest.csv";
      const {results=[]} = await env.DB.prepare(`SELECT created_at, email, consent FROM ${table} ORDER BY created_at DESC`).all();
      const csv = [["created_at","email","consent"], ...results.map(r=>[r.created_at,r.email,r.consent])].map(row=>row.map(csvCell).join(",")).join("\r\n");
      return new Response(csv,{headers:{"content-type":"text/csv; charset=utf-8", "content-disposition":`attachment; filename="${filename}"`,"cache-control":"no-store"}});
    }
    const {results=[]} = await env.DB.prepare("SELECT id, created_at, country, answers_json, consent FROM survey_responses ORDER BY created_at DESC").all();
    const csv = [["id","created_at","country","answers_json","consent"], ...results.map(r=>[r.id,r.created_at,r.country,r.answers_json,r.consent])].map(row=>row.map(csvCell).join(",")).join("\r\n");
    return new Response(csv,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":'attachment; filename="familyguard-survey-responses.csv"',"cache-control":"no-store"}});
  } catch { return new Response("Could not export records", {status:500}); }
}
