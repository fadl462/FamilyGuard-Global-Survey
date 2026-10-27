// Authenticated export API. Multi-select questions are expanded into one 1/0 column per option.
const csvCell = value => {
  let text = String(value ?? "");
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};
const csvResponse = (rows, filename) => new Response("\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n"), {
  headers: {"content-type":"text/csv; charset=utf-8", "content-disposition":`attachment; filename="${filename}"`, "cache-control":"no-store"}
});
const readable = value => Array.isArray(value) ? value.join("; ") : value ?? "";
const multi = {
  child_ages: ["Under 6 years","6–9 years","10–12 years","13–15 years","16–17 years"],
  devices: ["Smartphone","Tablet","Laptop or desktop computer","Gaming console","Smart TV","Other","None of these"],
  concerns: ["Cyberbullying or harassment","Contact from strangers or online predators","Scams, fraud or impersonation","Sexual or age-inappropriate content","Harmful challenges or dangerous trends","Excessive screen time or unhealthy habits","Violent or disturbing material","Gaming-related risks","Privacy and personal data exposure","No major concerns","Other"],
  current_methods: ["Talk regularly about online safety","Use built-in parental controls","Use a third-party parental-control app","Review online activity together","Set screen-time or device-use rules","Rely mainly on child","No specific approach","Other"],
  usefulness: ["Not useful","Slightly useful","Moderately useful","Very useful","Extremely useful"],
  approach: ["A standalone app for parents","A family dashboard across devices","Guidance and alerts without monitoring private content","A combination of tools and guidance","Not sure"],
  features: ["Dashboard of potential safety concerns","Alerts about potentially harmful interactions or content","Review authorised or submitted content","Age-appropriate safety recommendations","Guidance for discussing online risks","Screen-time and digital wellbeing tools","Support for multiple children and devices","Privacy-conscious family settings","Clear explanations for flagged content","Other"],
  barriers: ["Child privacy","Data security","False alerts","Cost","Device compatibility","Family trust","Legal or privacy uncertainty","Insufficient useful features","Nothing in particular","Other"],
  purchase_factors: ["Strong privacy and security","Proven usefulness and reliable results","Affordable pricing","Device compatibility","Easy setup and use","Trusted recommendations","Free trial","Positive reviews","Clear evidence it works"]
};
const labels = {
 id:"Response ID",created_at:"Submission timestamp",country:"Country",guardian:"Parent/legal guardian",gender:"Gender",gender_description:"Gender description",child_ages:"Child age groups",devices:"Devices used by children",concern_level:"Concern level",concerns:"Digital safety concerns",current_methods:"Current safety methods",satisfaction:"Satisfaction with current methods",usefulness:"Perceived usefulness",approach:"Preferred product approach",features:"Desired product features",barriers:"Potential adoption barriers",pay_likelihood:"Likelihood of paying",price:"Acceptable monthly price",billing_preference:"Billing preference",purchase_factors:"Factors influencing purchase",open_feedback:"Open feedback",contest_source:"Survey source",freelancer_id:"Freelancer ID",consent:"Consent"};
function slug(s){let x=String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); if(!x)x='option'; return x;}
function shortName(base, used){base=base.replace(/[^A-Za-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'').toLowerCase();if(!/^[a-z]/.test(base))base='v_'+base;let n=base.slice(0,20),i=2;while(used.has(n)){const suffix='_'+i++;n=base.slice(0,20-suffix.length)+suffix;}used.add(n);return n;}
function schema(){const used=new Set(),columns=[],codebook=[];const add=(key,label,kind='Original',option='',sourceKey=key)=>{const variable=shortName(key,used);columns.push({key:variable,get:kind==='Indicator'?(a)=>{const v=a[sourceKey];const arr=Array.isArray(v)?v:String(v??'').split(';').map(x=>x.trim()).filter(Boolean);return arr.includes(option)?1:0;}:a=>readable(a[sourceKey])});codebook.push([variable,label,kind,option,kind==='Indicator'?'1 = selected; 0 = not selected':'']);};
 const base=['id','created_at','country','gender','gender_description','guardian','child_ages','devices','concern_level','concerns','current_methods','satisfaction','usefulness','approach','features','barriers','pay_likelihood','price','billing_preference','purchase_factors','open_feedback','contest_source','freelancer_id'];
 for(const k of base){add(k,labels[k]||k);if(multi[k]) for(const opt of multi[k]) add(k+'_'+slug(opt),`${labels[k]||k}: ${opt}`,'Indicator',opt,k);}
 add('consent',labels.consent);
 return {columns,codebook};
}
export async function onRequestGet({request, env}) {
 const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||new URL(request.url).searchParams.get('token')||'';
 if(!env.ADMIN_TOKEN||token.length<20||token!==env.ADMIN_TOKEN)return new Response('Unauthorized',{status:401,headers:{'cache-control':'no-store'}});
 if(!env.DB)return new Response('Database is not configured',{status:503});
 const url=new URL(request.url),kind=url.searchParams.get('kind')||'survey';
 try{
  if(['report','testers'].includes(kind)){const table=kind==='report'?'report_subscribers':'tester_interest_contacts';const filename=kind==='report'?'familyguard-report-subscribers.csv':'familyguard-testing-interest.csv';const {results=[]}=await env.DB.prepare(`SELECT created_at,email,consent FROM ${table} ORDER BY created_at DESC`).all();return csvResponse([['created_at','email','consent'],...results.map(r=>[r.created_at,r.email,r.consent])],filename);}
  if(kind==='codebook'){const {codebook}=schema();return csvResponse([['variable_name','variable_label','variable_type','answer_option','coding'],...codebook], 'familyguard-variable-codebook.csv');}
  if(kind==='status'){const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM survey_responses').first();let state;try{state=await env.DB.prepare("SELECT last_exported_count,ready_count FROM survey_export_state WHERE id='main'").first();}catch{return new Response(JSON.stringify({error:'Run the export tracker migration in D1 first.'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});}const total=Number(count?.total||0),last=Number(state?.last_exported_count||0);return new Response(JSON.stringify({total_responses:total,last_exported_count:last,new_responses:Math.max(0,total-last),batch_ready:total-last>=20,responses_per_batch:20}),{headers:{'content-type':'application/json','cache-control':'no-store'}});}
  if(kind==='batch')return new Response('Batch export is not supported by this analysis-format endpoint. Download the full workbook from the dashboard.',{status:409,headers:{'cache-control':'no-store'}});
  const {results=[]}=await env.DB.prepare('SELECT id,created_at,country,answers_json,consent FROM survey_responses ORDER BY created_at ASC,id ASC').all();
  const {columns}=schema();const rows=[columns.map(c=>c.key),...results.map(r=>{let a={};try{a=JSON.parse(r.answers_json||'{}')}catch{};a.id=r.id;a.created_at=r.created_at;a.country=r.country;a.consent=r.consent;return columns.map(c=>c.get(a));})];
  return csvResponse(rows,'familyguard-survey-analysis-data.csv');
 }catch{return new Response('Could not export records',{status:500,headers:{'cache-control':'no-store'}});}
}
