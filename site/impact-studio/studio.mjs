import {sample,evaluate,transition,proposal,handoff,cents,money,KINDS,EVIDENCE} from "./core.mjs";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let w=sample(),db=null,storedRev=0,dirty=false;
const notice=(message,error=false)=>{
 const t=$("toast");t.textContent=message;t.style.background=error?"#f3c9be":"#d4e2c6";
 t.classList.add("show");clearTimeout(notice.timer);notice.timer=setTimeout(()=>t.classList.remove("show"),4100);
};
const safe=fn=>Promise.resolve().then(fn).catch(e=>notice(e.message||String(e),true));
function openDB(){
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open("aurekai-funding-impact-drafts-v1",1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("drafts"))r.result.createObjectStore("drafts");};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error("Local draft store unavailable."));
 });
}
const readDraft=()=>new Promise((resolve,reject)=>{
 const t=db.transaction("drafts","readonly"),r=t.objectStore("drafts").get("example");
 r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
});
function saveDraft(){
 return new Promise((resolve,reject)=>{
  const t=db.transaction("drafts","readwrite"),store=t.objectStore("drafts");let next=0;
  store.get("example").onsuccess=e=>{
   const prev=e.target.result;
   if((prev?.storageRevision||0)!==storedRev){t.abort();return;}
   next=storedRev+1;store.put({storageRevision:next,world:structuredClone(w)},"example");
  };
  t.oncomplete=()=>resolve(next);
  t.onabort=()=>reject(Error("A different tab changed this draft; reload before overwriting."));
  t.onerror=()=>reject(t.error||Error("Local save failed."));
 });
}
async function save(){
 if(!db)throw Error("Local storage unavailable; export the proposal instead.");
 storedRev=await saveDraft();dirty=false;$("save").textContent="Saved ✓";
 notice("Budget, source reviews and milestone state saved in this browser.");
}
function mutate(action,payload={}){
 w=transition(w,w.actor,action,payload);dirty=true;$("save").textContent="Save draft •";
 render();return w;
}
function renderHeader(){
 const x=evaluate(w);
 $("organization").textContent=w.applicant;$("funder").textContent=w.agency;
 $("actor").value=w.actor;$("caseStatus").textContent=w.caseStatus.replaceAll("_"," ");
 $("requestMetric").textContent=money(w.request);$("matchMetric").textContent=money(w.matchConfirmed);
 $("projectMetric").textContent=money(x.total);
 $("rulesMetric").textContent=x.constraints.filter(c=>c.pass).length+"/"+x.constraints.length;
 $("milestoneMetric").textContent=x.verifiedMilestones+"/"+w.milestones.length;
 $("programName").textContent=w.agency;$("programSource").textContent="Original source: "+w.terms.source;
 for(const [id,value] of [["applicant",w.applicant],["applicantType",w.applicantType],
  ["title",w.title],["narrative",w.impactNarrative],["request",(w.request/100).toFixed(2)],
  ["match",(w.matchConfirmed/100).toFixed(2)]])$(id).value=value;
}
function budgetTable(){
 const root=$("budgetRows");root.replaceChildren();
 for(const b of w.budget){
  const tr=document.createElement("tr");
  const name=document.createElement("td");name.textContent=b.label;name.title=b.id;
  const kind=document.createElement("td"),type=document.createElement("select");
  type.setAttribute("aria-label",b.label+" spending category");
  KINDS.forEach(k=>type.add(new Option(k,k,false,k===b.kind)));
  type.addEventListener("change",()=>safe(()=>mutate("cost",{id:b.id,kind:type.value})));kind.append(type);
  const stream=document.createElement("td"),which=document.createElement("select");
  for(const k of ["grant","match"])which.add(new Option(k==="grant"?"Grant":"Match",k,false,k===b.funding));
  which.setAttribute("aria-label",b.label+" funding stream");
  which.addEventListener("change",()=>safe(()=>mutate("cost",{id:b.id,funding:which.value})));stream.append(which);
  const amount=document.createElement("td"),edit=document.createElement("input");
  edit.type="number";edit.min="0";edit.step=".01";edit.value=(b.total/100).toFixed(2);
  edit.setAttribute("aria-label",b.label+" expense in USD");
  edit.addEventListener("change",()=>safe(()=>mutate("cost",{id:b.id,total:edit.value})));amount.append(edit);
  const source=document.createElement("td"),original=document.createElement("span");
  original.className="source";original.textContent=b.source;source.append(original);
  tr.append(name,kind,stream,amount,source);root.append(tr);
 }
}
function constraints(){
 const root=$("constraintBoard");root.replaceChildren();
 for(const c of evaluate(w).constraints){
  const div=document.createElement("div");div.className="constraint "+(c.pass?"ok":"fail");
  const sign=document.createElement("i");sign.textContent=c.pass?"✓":"!";
  const label=document.createElement("span");label.textContent=c.label;div.append(sign,label);root.append(div);
 }
}
function sources(){
 const requirements=$("requirements");requirements.replaceChildren();
 const reviewer=w.actor===w.reviewer;
 for(const r of w.requirements){
  const row=document.createElement("div");row.className="requirement";
  const main=document.createElement("div"),title=document.createElement("strong"),metadata=document.createElement("small");
  title.textContent=r.label;metadata.textContent=r.id+" · "+r.source;main.append(title,metadata);
  const action=document.createElement("button");action.type="button";
  action.textContent=r.state==="reviewed"?"Reviewed locally ✓":"Review source";
  action.disabled=!reviewer||r.state==="reviewed";
  action.addEventListener("click",()=>safe(()=>mutate("review-requirement",{id:r.id})));
  row.append(main,action);requirements.append(row);
 }
 const evidence=$("evidenceList");evidence.replaceChildren();
 for(const e of w.evidence){
  const row=document.createElement("div");row.className="evidence";
  const main=document.createElement("div"),name=document.createElement("strong"),meta=document.createElement("small");
  name.textContent=e.title;meta.textContent=e.kind+" · "+e.source+" · supports "+(e.linkTo||"not mapped");
  main.append(name,meta);
  const action=document.createElement("button");action.type="button";
  action.textContent=e.state==="reviewed"?"Reviewed locally ✓":"Review source";
  action.disabled=!reviewer||e.state==="reviewed";
  action.addEventListener("click",()=>safe(()=>mutate("review-evidence",{id:e.id})));
  row.append(main,action);evidence.append(row);
 }
 const metrics=evaluate(w);
 $("missingCount").textContent=metrics.missing.length+" requirement reviews · "+metrics.unreviewedEvidence.length+" evidence reviews";
 $("reviewTerms").textContent=w.terms.approval==="reviewed"?"Program locally reviewed ✓":"Review program terms";
 $("reviewTerms").disabled=!reviewer||w.terms.approval==="reviewed";
}
function milestones(){
 const root=$("milestones");root.replaceChildren();
 for(const m of w.milestones){
  const row=document.createElement("div");row.className="milestone",main=document.createElement("div");
  const title=document.createElement("strong"),meta=document.createElement("small");
  title.textContent=m.label;
  meta.textContent="Target "+m.target+" · "+m.due+" · "+money(m.allocation)+" · "+m.status.replaceAll("_"," ");
  main.append(title,meta);
  if(m.evidenceRef){const src=document.createElement("small");src.textContent="Source: "+m.evidenceRef;main.append(src);}
  const next=document.createElement("button");next.type="button";
  if(m.status==="planned"){
   next.textContent="Start work";next.disabled=w.actor!==w.preparer;
   next.addEventListener("click",()=>safe(()=>mutate("milestone",{id:m.id,status:"in_progress"})));
  } else if(m.status==="in_progress"){
   next.textContent="Submit source for review";next.disabled=w.actor!==w.preparer;
   next.addEventListener("click",()=>safe(()=>{
    const ref=prompt("Enter the original source URL or illustrative fixture for "+m.label);
    if(ref===null)return;mutate("milestone",{id:m.id,status:"submitted_for_review",evidenceRef:ref.trim()});
   }));
  } else if(m.status==="submitted_for_review"){
   next.textContent="Review evidence";next.disabled=w.actor!==w.reviewer;
   next.addEventListener("click",()=>safe(()=>mutate("milestone",{id:m.id,status:"reviewed"})));
  }else{next.textContent="Locally reviewed ✓";next.disabled=true;}
  row.append(main,next);root.append(row);
 }
}
function preview(){
 const score=evaluate(w),root=$("paperContent");
 $("paperTitle").textContent=w.title;
 const sections=[
  ["Intended outcomes","<p>"+esc(w.impactNarrative)+"</p>"],
  ["Proposal economics",
    '<div class="row"><span>Requested grant</span><strong>'+money(w.request)+'</strong></div>'+
    '<div class="row"><span>Declared match</span><strong>'+money(w.matchConfirmed)+'</strong></div>'+
    '<div class="row"><span>Project budget</span><strong>'+money(score.total)+'</strong></div>'+
    '<div class="row"><span>Award milestone plan</span><strong>'+money(score.allocations)+'</strong></div>'],
  ["Budget and eligibility",
   "<p>"+score.constraints.filter(c=>c.pass).length+" of "+score.constraints.length+
   " numerical/allowability checks pass. "+score.missing.length+" source requirements need independent local review.</p>"+
   (score.constraints.some(c=>!c.pass)?"<ul>"+score.constraints.filter(c=>!c.pass).map(c=>"<li>"+esc(c.label)+"</li>").join("")+"</ul>":
   "<p>Arithmetic conditions pass. A real funder decision is still required.</p>")],
  ["Milestone consequences",
   '<div class="row"><span>Locally reviewed allocations</span><strong>'+money(score.claimable)+'</strong></div>'+
   '<div class="row"><span>Awaiting review</span><strong>'+money(score.unverified)+'</strong></div>'+
   "<p>These are not real funder claims or received payments.</p>"],
  ["Current review state",'<p><strong>'+esc(score.verdict.replaceAll("_"," "))+'</strong></p>'+
   "<p>Local evidence review cannot confer funder eligibility or award authority.</p>"]
 ];
 root.innerHTML=sections.map(([title,body])=>"<section><h3>"+title+"</h3>"+body+"</section>").join("");
 $("paperFooter").textContent="Illustrative proposal · no external submission, grant award or payment";
 $("prepare").disabled=w.actor!==w.preparer||score.verdict!=="prepared_for_authorized_submission_review"||
  w.caseStatus==="prepared_for_review";
 $("prepare").textContent=w.caseStatus==="prepared_for_review"?"Prepared for review ✓":"Prepare for authorized review";
}
function audit(){
 const list=$("audit");list.replaceChildren();
 for(const event of [...w.audit].reverse().slice(0,25)){
  const item=document.createElement("div");item.className="entry";
  const title=document.createElement("strong");title.textContent=event.action.replaceAll("-"," ")+" · "+event.actor;
  const meta=document.createElement("small");meta.textContent=event.subject+" · revision "+event.rev+" · "+event.at;
  item.append(title,meta);list.append(item);
 }
 if(!list.childElementCount)list.textContent="No local review events yet; source documents remain unreviewed.";
}
function render(){renderHeader();budgetTable();constraints();sources();milestones();preview();audit();}
function download(name,content,type="text/markdown"){
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
}
$("actor").addEventListener("change",e=>{w.actor=e.target.value;render();notice("Simulated role switch; this is not authenticated funder identity.");});
for(const [id,key] of [["applicant","applicant"],["applicantType","applicantType"],
 ["title","title"],["narrative","impactNarrative"],["request","request"],["match","matchConfirmed"]]){
 $(id).addEventListener("change",e=>safe(()=>mutate("set-case",{[key]:e.target.value})));
}
for(const kind of KINDS)$("budgetKind").add(new Option(kind,kind));
for(const kind of EVIDENCE)$("evidenceKind").add(new Option(kind,kind));
$("budgetForm").addEventListener("submit",e=>{e.preventDefault();safe(()=>{
 mutate("add-cost",Object.fromEntries(new FormData(e.target)));
 e.target.reset();e.target.closest("details").open=false;notice("Sourced expense added.");
});});
$("evidenceForm").addEventListener("submit",e=>{e.preventDefault();safe(()=>{
 mutate("add-evidence",Object.fromEntries(new FormData(e.target)));
 e.target.reset();e.target.closest("details").open=false;notice("Original evidence source registered, not verified.");
});});
$("reviewTerms").addEventListener("click",()=>safe(()=>mutate("review-program")));
$("prepare").addEventListener("click",()=>safe(()=>{mutate("prepare");notice("Internal proposal prepared. Nothing sent to a funder.");}));
$("download").addEventListener("click",()=>safe(()=>{download("funding-impact-review.md",proposal(w));notice("Reviewer-ready brief exported.");}));
$("yaff").addEventListener("click",()=>safe(()=>{download("funding-impact-proposal.yaff",handoff(w),"text/plain");notice("Typed review candidate exported; no grant application created.");}));
$("save").addEventListener("click",()=>safe(save));
$("reset").addEventListener("click",()=>safe(async()=>{
 if(!confirm("Replace this browser's example funding case with its initial state?"))return;
 w=sample();if(db)storedRev=await saveDraft();dirty=false;render();notice("Funding reference case restored.");
}));
Object.defineProperty(window,"aurekaiFundingWitness",{get:()=>({
 revision:w.revision,actor:w.actor,verdict:evaluate(w).verdict,
 request:w.request,match:w.matchConfirmed,cost:evaluate(w).total,
 constraints:evaluate(w).constraints.filter(x=>x.pass).length,
 missing:evaluate(w).missing.length,reviewedMilestones:evaluate(w).verifiedMilestones,
 journal:w.audit.length
})});
(async()=>{try{db=await openDB();const saved=await readDraft();
 if(saved){w=saved.world;storedRev=saved.storageRevision;}
 render();}catch(error){w=sample();render();notice("Local draft persistence unavailable; exports still work.",true);}})();
