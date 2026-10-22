const csvCell = value => {
  // Prevent spreadsheet formula injection while keeping the CSV readable in Excel.
  let text = String(value ?? "");
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};
const csvResponse = (rows, filename) => new Response("\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n"), {
  headers: {"content-type":"text/csv; charset=utf-8", "content-disposition":`attachment; filename="${filename}"`, "cache-control":"no-store"}
});
const answerColumns = ["guardian","child_ages","devices","concern_level","concerns","current_methods","satisfaction","usefulness","features","approach","barriers","pay_likelihood","price","purchase_factors","open_feedback","gender","gender_description","description","contest_source","freelancer_id"];
// These fields allow multiple selections. Keep the readable combined response and
// add a separate 1/0 indicator column for every option seen in the export.
const multiSelectFields = ["child_ages","devices","concerns","current_methods","features","barriers","purchase_factors"];
const readable = value => Array.isArray(value) ? value.join("; ") : value ?? "";
const safeColumnPart = value => String(value ?? "").trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "other";
function buildSurveyRows(results) {
  const parsed = results.map(r => { let answers = {}; try { answers = JSON.parse(r.answers_json || "{}"); } catch {} return {record:r, answers}; });
  const optionMap = Object.fromEntries(multiSelectFields.map(field => [field, [...new Set(parsed.flatMap(x => Array.isArray(x.answers[field]) ? x.answers[field] : [] ).map(v => String(v)))].sort((a,b)=>a.localeCompare(b))]));
  const indicatorColumns = multiSelectFields.flatMap(field => optionMap[field].map(option => ({field, option, name:`${field}_${safeColumnPart(option)}`})));
  const headers = ["id","created_at","country",...answerColumns,...indicatorColumns.map(c=>c.name),"consent"];
  const rows = parsed.map(({record:r,answers}) => {
    const values = [r.id,r.created_at,r.country,...answerColumns.map(k=>readable(answers[k]))];
    for (const col of indicatorColumns) values.push(Array.isArray(answers[col.field]) && answers[col.field].map(String).includes(col.option) ? 1 : 0);
    values.push(r.consent);
    return values;
  });
  return [headers,...rows];
}
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
      return csvResponse([["created_at","email","consent"], ...results.map(r=>[r.created_at,r.email,r.consent])], filename);
    }

    if (kind === "status") {
      const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM survey_responses").first();
      let state;
      try { state = await env.DB.prepare("SELECT last_exported_count, ready_count FROM survey_export_state WHERE id = 'main'").first(); }
      catch { return new Response(JSON.stringify({error:"Run the export tracker migration in D1 first."}), {status:503,headers:{"content-type":"application/json","cache-control":"no-store"}}); }
      const total = Number(count?.total || 0), last = Number(state?.last_exported_count || 0);
      return new Response(JSON.stringify({total_responses:total, last_exported_count:last, new_responses:Math.max(0,total-last), batch_ready:total-last>=20, responses_per_batch:20}), {headers:{"content-type":"application/json","cache-control":"no-store"}});
    }

    if (kind === "batch") {
      const state = await env.DB.prepare("SELECT last_exported_count FROM survey_export_state WHERE id = 'main'").first();
      if (!state) return new Response("Export tracker is not initialized. Run the migration SQL first.", {status:503});
      const offset = Number(state.last_exported_count || 0);
      const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM survey_responses").first();
      if (Number(count?.total || 0) - offset < 20) return new Response("No new batch is ready yet. A batch is prepared after 20 new survey responses.", {status:409, headers:{"cache-control":"no-store"}});
      const {results=[]} = await env.DB.prepare("SELECT id, created_at, country, answers_json, consent FROM survey_responses ORDER BY created_at ASC, id ASC LIMIT 20 OFFSET ?").bind(offset).all();
      const rows = buildSurveyRows(results);
      // Advance the cursor only after a complete batch has been prepared for download.
      await env.DB.prepare("UPDATE survey_export_state SET last_exported_count = ?, ready_count = MAX(ready_count, ?) WHERE id = 'main'").bind(offset + results.length, offset + results.length).run();
      return csvResponse(rows, `familyguard-survey-batch-${offset+1}-${offset+results.length}.csv`);
    }

    const {results=[]} = await env.DB.prepare("SELECT id, created_at, country, answers_json, consent FROM survey_responses ORDER BY created_at DESC").all();
    const rows = buildSurveyRows(results);
    return csvResponse(rows, "familyguard-survey-responses.csv");
  } catch { return new Response("Could not export records", {status:500, headers:{"cache-control":"no-store"}}); }
}
