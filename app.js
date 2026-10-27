const steps=[...document.querySelectorAll(".survey-step")], indicators=[...document.querySelectorAll(".step")];
const titleList=["About you","Your concerns","Current tools","Product concept","Pricing","Final thoughts"];
const subtitles=["Let’s start with a few questions about you and your family.","Help us understand the online safety issues that matter to you.","Tell us what you currently use and how well it works.","Explore a possible approach to family digital safety.","Help us understand what feels fair and valuable.","One final thought before you submit."];
const STATE_KEY="familyguard-survey-session-v2";
let current=0; const form=document.getElementById("surveyForm"), notice=document.getElementById("notice");
const $=id=>document.getElementById(id);
function readSession(){try{return JSON.parse(sessionStorage.getItem(STATE_KEY)||"null")}catch{return null}}
function writeSession(extra={}){try{const prior=readSession()||{};sessionStorage.setItem(STATE_KEY,JSON.stringify({...prior,step:current,answers:collectFormState(),scrollY:window.scrollY,...extra}))}catch{/* Continue even when browser storage is unavailable. */}}
function collectFormState(){const state={};form.querySelectorAll("[name]").forEach(el=>{if(el.type==="checkbox"||el.type==="radio"){if(el.checked)(state[el.name]??=[]).push(el.value)}else state[el.name]=el.value});return state}
function restoreFormState(state){if(!state?.answers)return;form.querySelectorAll("[name]").forEach(el=>{const value=state.answers[el.name];if(el.type==="checkbox"||el.type==="radio")el.checked=Array.isArray(value)&&value.includes(el.value);else if(value!==undefined)el.value=value});[...new Set([...form.querySelectorAll('input[type="checkbox"][name]')].map(el=>el.name))].forEach(normalizeExclusiveAnswers);$("reportFields").classList.toggle("hidden",!$("wantReport").checked);$("testingFields").classList.toggle("hidden",!$("wantTesting").checked);const no=selected("guardian")[0]==="no";document.querySelectorAll(".conditional").forEach(el=>el.classList.toggle("hidden",no));syncOtherFields();syncSatisfactionQuestion()}
function restoreTerminal(state){if(state?.terminal==="ineligible"){showEligibilityClosing();return true}if(state?.terminal==="submitted"){form.classList.add("hidden");document.querySelector(".card-heading").classList.add("hidden");document.querySelector(".progress-wrap").classList.add("hidden");$("successPanel").classList.remove("hidden");$("successPanel").querySelector(".step-kicker").textContent="RESPONSE RECEIVED";$("successPanel").querySelector("h2").textContent="Thank you for sharing your perspective.";$("successPanel").querySelector("p").textContent="Your contribution will help us better understand families’ online safety concerns and inform the development of FamilyGuard Intelligence.";$("successPanel").querySelector(".success-stats").classList.remove("hidden");$("contactResult").classList.remove("hidden");$("contactResult").textContent=state.contactMessage||"Your response was submitted successfully.";return true}return false}
function setStep(n,shouldScroll=true){current=Math.max(0,Math.min(steps.length-1,n));steps.forEach((s,i)=>s.classList.toggle("active",i===current));indicators.forEach((s,i)=>{s.classList.toggle("active",i===current);s.classList.toggle("done",i<current)});$("progressFill").style.width=(current/(steps.length-1)*100)+"%";$("stepKicker").textContent=`STEP ${current+1} OF ${steps.length}`;$("sectionTitle").textContent=titleList[current];$("sectionSubtitle").textContent=subtitles[current];$("prevBtn").classList.toggle("hidden",current===0);$("nextBtn").classList.toggle("hidden",current===steps.length-1);$("submitBtn").classList.toggle("hidden",current!==steps.length-1);notice.classList.add("hidden");clearQuestionErrors();if(shouldScroll)document.querySelector(".survey-area").scrollIntoView({behavior:"smooth",block:"start"});writeSession();}
function selected(name){return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(x=>x.value)}
function clearQuestionErrors(){form.querySelectorAll(".question-notice").forEach(el=>el.remove())}
function showQuestionError(name,message){notice.classList.add("hidden");const field=form.querySelector(`[name="${name}"]`)||$(name);const container=field?.closest(".question")||field?.closest(".privacy-note")||field?.closest(".contact-option");if(!container){showError(message);return}let inline=container.querySelector(":scope .question-notice");if(!inline){inline=document.createElement("div");inline.className="question-notice";inline.setAttribute("role","alert");const body=container.querySelector(".q-body")||container;const fieldset=body.querySelector("fieldset");const anchor=(field?.id&&body.querySelector(`label[for="${field.id}"]`))||((field?.id==="consent"||field?.id==="reportConsent"||field?.id==="testingConsent")?field.closest("label"):null)||fieldset?.querySelector(".hint")||fieldset?.querySelector("legend")||body.querySelector("label")||body.firstElementChild;if(anchor&&anchor.parentNode)anchor.insertAdjacentElement("afterend",inline);else body.prepend(inline)}inline.textContent=message;inline.scrollIntoView({behavior:"smooth",block:"nearest"})}
function checkLimit(name,max,label){const boxes=form.querySelectorAll(`[name="${name}"]:checked`);if(boxes.length>max){showQuestionError(name,`Please select no more than ${max} ${label}.`);return false}return true}
function showEligibilityClosing(){
  writeSession({terminal:"ineligible"});
  form.classList.add("hidden");
  document.querySelector(".card-heading").classList.add("hidden");
  document.querySelector(".progress-wrap").classList.add("hidden");
  notice.classList.add("hidden");
  $("successPanel").classList.remove("hidden");
  $("successPanel").querySelector(".step-kicker").textContent="THANK YOU FOR YOUR INTEREST";
  $("successPanel").querySelector("h2").textContent="Thank you for stopping by.";
  $("successPanel").querySelector("p").textContent="This survey is intended for parents and legal guardians of children under 18. No survey response has been submitted.";
  $("successPanel").querySelector(".success-stats").classList.add("hidden");
  $("contactResult").classList.add("hidden");
  $("finishNote").textContent="You may now close this tab.";
}
function setupOtherFields(){
  form.querySelectorAll('input[type="checkbox"][value="Other"][name]').forEach(box=>{
    const groupName=box.name;
    const fieldName=`other_${groupName}`;
    let wrapper=form.querySelector(`[data-other-for="${groupName}"]`);
    if(!wrapper){
      wrapper=document.createElement("div");
      wrapper.className="other-specify hidden";
      wrapper.dataset.otherFor=groupName;
      const label=document.createElement("label");
      label.className="other-specify-label";
      label.htmlFor=fieldName;
      label.textContent="Please specify:";
      const input=document.createElement("input");
      input.type="text";
      input.id=fieldName;
      input.name=fieldName;
      input.placeholder="Tell us what you mean by Other";
      input.maxLength=300;
      input.autocomplete="off";
      input.setAttribute("aria-label",`Please specify other ${groupName.replaceAll("_"," ")}`);
      wrapper.append(label,input);
      box.closest(".check-option").insertAdjacentElement("afterend",wrapper);
      input.addEventListener("input",writeSession);
    }
    const sync=()=>wrapper.classList.toggle("hidden",!box.checked);
    box.addEventListener("change",sync);
    sync();
  });
}
function syncOtherFields(){
  form.querySelectorAll('[data-other-for]').forEach(wrapper=>{
    const group=wrapper.dataset.otherFor;
    const checked=form.querySelector(`input[type="checkbox"][name="${group}"][value="Other"]`)?.checked;
    wrapper.classList.toggle("hidden",!checked);
  });
}
function syncSatisfactionQuestion(){
  const skip=selected("current_methods").includes("No specific approach");
  const question=$("satisfactionQuestion");
  if(!question)return;
  question.classList.toggle("hidden",skip);
  if(skip){
    form.querySelectorAll('input[name="satisfaction"]').forEach(input=>{input.checked=false;input.required=false;});
    question.querySelectorAll(".question-notice").forEach(el=>el.remove());
  }else{
    const first=question.querySelector('input[name="satisfaction"]');
    if(first)first.required=true;
  }
}
function validateStep(){notice.classList.add("hidden");
const step=steps[current];
const selectedOther=[...step.querySelectorAll('input[type="checkbox"][value="Other"][name]:checked')];
for(const box of selectedOther){const field=form.querySelector(`[name="other_${box.name}"]`);if(field&&!field.value.trim()){showQuestionError(box.name,"Please specify what you mean by “Other” before continuing.");field.focus({preventScroll:true});return false}}
if(current===0){if(!$("country").value){showQuestionError("country","Please select your country.");return false}if(!selected("guardian").length){showQuestionError("guardian","Please tell us whether you are a parent or legal guardian.");return false}}
if(current===1){if(!selected("concern_level").length){showQuestionError("concern_level","Please rate your level of concern.");return false}if(!selected("concerns").length){showQuestionError("concerns","Please select at least one concern, or choose “No major concerns”.");return false}if(selected("concerns").length>3){showQuestionError("concerns","Please select up to three concerns.");return false}}
if(current===2&&!selected("current_methods").includes("No specific approach")&&!selected("satisfaction").length){showQuestionError("satisfaction","Please rate your satisfaction with your current tools or approaches.");return false}
if(current===3){if(!selected("usefulness").length||!selected("approach").length){showQuestionError(!selected("usefulness").length?"usefulness":"approach","Please answer this required question.");return false}if(!selected("features").length||selected("features").length>3){showQuestionError("features","Please select between one and three features.");return false}if(!selected("barriers").length||selected("barriers").length>2){showQuestionError("barriers","Please select one or two concerns about using the product.");return false}}
if(current===4){if(!selected("pay_likelihood").length||!selected("price").length){showQuestionError(!selected("pay_likelihood").length?"pay_likelihood":"price","Please answer this required pricing question.");return false}if(!selected("purchase_factors").length||selected("purchase_factors").length>2){showQuestionError("purchase_factors","Please select one or two factors that would influence your decision.");return false}}
if(current===5){if($("wantReport").checked){if(!$("reportEmail").value.trim()||!$("reportEmail").checkValidity()||!$("reportConsent").checked){showQuestionError("reportEmail","For the survey report, enter a valid email and confirm the separate report consent, or untick that option.");return false}}if($("wantTesting").checked){if(!$("testingEmail").value.trim()||!$("testingEmail").checkValidity()||!$("testingConsent").checked){showQuestionError("testingEmail","For product testing interest, enter a valid email and confirm the separate testing consent, or untick that option.");return false}}}
return true}
function showError(t){notice.textContent=t;notice.classList.remove("hidden");notice.scrollIntoView({behavior:"smooth",block:"center"})}
$("nextBtn").addEventListener("click",()=>{if(current===0&&selected("guardian")[0]==="no"){showEligibilityClosing();return}if(validateStep())setStep(current+1)});$("prevBtn").addEventListener("click",()=>setStep(current-1));
form.addEventListener("change",e=>{const related=e.target.closest(".question, .privacy-note, .contact-option");related?.querySelectorAll(".question-notice").forEach(el=>el.remove());if(e.target.name==="guardian"){const no=e.target.value==="no";document.querySelectorAll(".conditional").forEach(el=>el.classList.toggle("hidden",no));}if(e.target.name==="current_methods"){syncSatisfactionQuestion();}writeSession();},true);
form.addEventListener("input",()=>writeSession());
$("wantReport").addEventListener("change",()=>$("reportFields").classList.toggle("hidden",!$("wantReport").checked));
$("wantTesting").addEventListener("change",()=>$("testingFields").classList.toggle("hidden",!$("wantTesting").checked));
// Exclusive checkbox answers cannot be combined with other answers in the same group.
// The warning always uses the exact visible wording of the exclusive option.
const exclusiveAnswer = value => /^(none of these|none of the above|none|no major concerns|few or no major concerns|no concerns|no specific approach|nothing in particular)$/i.test(String(value||'').trim());
function exclusiveLabel(box){
  const visible=box.closest('label')?.querySelector('span')?.textContent?.trim();
  return visible || box.value;
}
function normalizeExclusiveAnswers(groupName){
  const boxes=[...form.querySelectorAll(`input[type="checkbox"][name="${groupName}"]`)];
  const exclusive=boxes.find(box=>exclusiveAnswer(box.value));
  if(!exclusive)return;
  if(exclusive.checked)boxes.forEach(box=>{if(box!==exclusive)box.checked=false;});
}
form.querySelectorAll('input[type="checkbox"][name]').forEach(input=>input.addEventListener("change",()=>{
  const group=[...form.querySelectorAll(`input[type="checkbox"][name="${input.name}"]`)];
  const exclusive=group.find(box=>exclusiveAnswer(box.value));
  if(exclusive){
    const label=exclusiveLabel(exclusive);
    if(input===exclusive&&exclusive.checked){
      group.forEach(box=>{if(box!==exclusive)box.checked=false;});
      showQuestionError(input.name,`“${label}” cannot be selected with other options. Your other selections have been cleared.`);
    }else if(input!==exclusive&&input.checked&&exclusive.checked){
      exclusive.checked=false;
      showQuestionError(input.name,`“${label}” cannot be selected with other options. It has been unselected so you can choose this answer.`);
    }
  }
  const limits={concerns:3,features:3,barriers:2,purchase_factors:2};
  if(limits[input.name]){
    const checked=form.querySelectorAll(`[name="${input.name}"]:checked`);
    if(checked.length>limits[input.name]){
      input.checked=false;
      showQuestionError(input.name,`You can select up to ${limits[input.name]} options. Your last selection was not added.`);
    }
  }
  normalizeExclusiveAnswers(input.name);
  syncOtherFields();
  if(input.name==="current_methods")syncSatisfactionQuestion();
  writeSession();
}));
function payload(){const data={};const names=new Set([...form.querySelectorAll("[name]")].map(x=>x.name));for(const name of names){const fields=[...form.querySelectorAll(`[name="${name}"]`)];if(fields[0]?.type==="checkbox")data[name]=selected(name);else if(fields[0]?.type==="radio")data[name]=selected(name)[0]||"";else data[name]=fields[0]?.value||""}return data}
$("surveyForm").addEventListener("submit",async e=>{e.preventDefault();if(!validateStep())return;if(!$("consent").checked){showQuestionError("consent","Please confirm your consent before submitting.");return}const btn=$("submitBtn");btn.disabled=true;btn.innerHTML="<span>Submitting…</span>";try{const res=await fetch("/api/responses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:payload(),consent:true})});const result=await res.json().catch(()=>({}));if(!res.ok)throw new Error(result.error||"We couldn’t submit your response. Please try again.");
  const contactTasks=[];
  if($("wantReport").checked)contactTasks.push(fetch("/api/report-subscribers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("reportEmail").value.trim(),consent:$("reportConsent").checked})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Report email could not be saved.");return "report"}));
  if($("wantTesting").checked)contactTasks.push(fetch("/api/tester-interest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("testingEmail").value.trim(),consent:$("testingConsent").checked})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Testing interest could not be saved.");return "testing"}));
  const contactResults=await Promise.allSettled(contactTasks);const failures=contactResults.filter(x=>x.status==="rejected");
  form.classList.add("hidden");document.querySelector(".card-heading").classList.add("hidden");document.querySelector(".progress-wrap").classList.add("hidden");$("successPanel").classList.remove("hidden");
  const resultMsg=$("contactResult");if(!contactTasks.length){resultMsg.textContent="No follow-up email was requested. Your survey response was submitted without an email address.";}else if(failures.length){resultMsg.textContent="Your survey response was saved, but one or more follow-up email preferences could not be saved. Please contact the research team if you still want to receive those follow-ups.";resultMsg.classList.add("error");}else{resultMsg.textContent="Your selected follow-up preference(s) were saved separately from your survey answers.";}writeSession({terminal:"submitted",contactMessage:resultMsg.textContent});
}catch(err){showError(err.message==="Failed to fetch"?"The survey service is not connected yet. Please try again later.":err.message)}finally{btn.disabled=false;btn.innerHTML="<span>Submit survey</span> <b>↗</b>"}});

setupOtherFields();
syncSatisfactionQuestion();

// Restore the respondent's current step and answers after a refresh or a new deployment reload.
// sessionStorage keeps this draft scoped to the current browser tab.
const savedState=readSession();
if(!restoreTerminal(savedState)){
  restoreFormState(savedState);
  setStep(Number.isInteger(savedState?.step)?savedState.step:0,false);
  if(savedState&&Number.isFinite(savedState.scrollY))requestAnimationFrame(()=>window.scrollTo({top:savedState.scrollY,behavior:"auto"}));
}

window.addEventListener("pagehide",()=>writeSession());
