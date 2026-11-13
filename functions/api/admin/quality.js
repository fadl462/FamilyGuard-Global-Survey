const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
function authorized(request,env){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";return !!env.ADMIN_TOKEN&&token.length>=20&&token===env.ADMIN_TOKEN;}
export async function onRequestGet({request,env}){
 if(!authorized(request,env))return json({error:"Unauthorized"},401);
 if(!env.DB)return json({error:"Database unavailable"},503);
 try{
  const [responses,reports,testers,reviews]=await Promise.all([
   env.DB.prepare("SELECT id,created_at,country,answers_json FROM survey_responses ORDER BY created_at DESC LIMIT 500").all(),
   env.DB.prepare("SELECT id,created_at,email FROM report_subscribers ORDER BY created_at DESC LIMIT 500").all(),
   env.DB.prepare("SELECT id,created_at,email FROM tester_interest_contacts ORDER BY created_at DESC LIMIT 500").all(),
   env.DB.prepare("SELECT record_type,record_id,status,reason,updated_at FROM data_quality_reviews").all()
  ]);
  return json({responses:responses.results||[],reports:reports.results||[],testers:testers.results||[],reviews:reviews.results||[]});
 }catch(e){return json({error:"Data-quality tables are not installed. Run data-quality-migration.sql in D1.",detail:String(e?.message||e)},503);}
}
export async function onRequestPost({request,env}){
 if(!authorized(request,env))return json({error:"Unauthorized"},401);
 if(!env.DB)return json({error:"Database unavailable"},503);
 let body;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
 const type=String(body?.record_type||""),id=String(body?.record_id||""),status=String(body?.status||""),reason=String(body?.reason||"").trim().slice(0,500);
 if(!["response","report","tester"].includes(type)||!id||id.length>100||!["valid","review","excluded"].includes(status))return json({error:"Invalid review details"},400);
 if(status!=="valid"&&!reason)return json({error:"Please provide a reason for flagging or excluding this record."},400);
 const table=type==="response"?"survey_responses":type==="report"?"report_subscribers":"tester_interest_contacts";
 try{
  const found=await env.DB.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(id).first();
  if(!found)return json({error:"Record not found"},404);
  const now=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare("INSERT INTO data_quality_reviews(record_type,record_id,status,reason,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(record_type,record_id) DO UPDATE SET status=excluded.status,reason=excluded.reason,updated_at=excluded.updated_at").bind(type,id,status,reason,now),
   env.DB.prepare("INSERT INTO data_quality_audit(record_type,record_id,status,reason,changed_at) VALUES(?,?,?,?,?)").bind(type,id,status,reason,now)
  ]);
  return json({ok:true,record_type:type,record_id:id,status,updated_at:now});
 }catch(e){return json({error:"Could not save review. Ensure the data-quality migration has been run.",detail:String(e?.message||e)},500);}
}
