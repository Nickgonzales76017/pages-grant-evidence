/* Aurekai Funding & Impact Studio.
 * Typed private preview for eligibility, funding restrictions, deliverables,
 * evidence and reviewer gates. No real funder, disbursement or grant submission.
 */
export const KINDS=["personnel","services","travel","equipment","accessibility","administration","materials"];
export const EVIDENCE=["proposal","letter","budget","partnership","outcome","receipt","report","consent"];
export const STAGES=["planned","in_progress","submitted_for_review","reviewed"];
export const sourceOkay=s=>{
 if(/^fixture:[a-z0-9:\/.-]{2,160}$/i.test(s))return true;
 try{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password&&!u.hash&&u.href.length<=600;}catch{return false;}
};
export const cents=n=>{
 const value=Number(n);if(!Number.isFinite(value)||value<0||value>50_000_000)throw Error("Enter a nonnegative cost.");
 return Math.round((value+Number.EPSILON)*100);
};
export const money=n=>(n/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
const idOkay=s=>typeof s==="string"&&/^[a-z][a-z0-9-]{2,70}$/.test(s);
const line=(id,label,kind,total,funding,source)=>({id,label,kind,total:cents(total),funding,source,review:"pending"});
const milestone=(id,label,due,allocation,target)=>({id,label,due,allocation:cents(allocation),target,
 status:"planned",evidenceRef:"",reviewedBy:"",completedAt:""});
export function sample(){
 return {
  id:"neighborhood-stories-case",truth:"illustrative_not_a_real_grant",
  initiative:"Neighborhood Stories / Oral History & Access",
  agency:"Example Neighborhood Arts Fund (fictional)",
  applicant:"North District Culture Lab (fictional)",
  applicantType:"nonprofit",state:"TX",reviewer:"riley",preparer:"casey",
  actor:"casey",deadline:"Unconfirmed in this fictional example",
  terms:{source:"fixture://funding/neighborhood-arts",minRequest:cents(15000),maxRequest:cents(60000),
   minMatchPercent:20,maxIndirectPercent:10,maxEquipmentPercent:15,
   allowed:["personnel","services","travel","equipment","accessibility","materials","administration"],
   allowedApplicants:["nonprofit","municipality"],allowedStates:["TX"],
   approval:"unreviewed"},
  title:"Preserve neighborhood oral histories, create accessible public exhibits",
  impactNarrative:"Collect and preserve 60 participant-approved oral histories, produce eight accessible community exhibits, and host four inclusive listening workshops.",
  request:cents(48000),matchConfirmed:cents(24000),projectPeriodMonths:12,
  revision:0,caseStatus:"draft",
  requirements:[
   {id:"org-status",label:"Legal applicant type and fiscal authority",source:"fixture://applicant/governance",state:"source_missing"},
   {id:"program-rules",label:"Funder eligibility and allowable expense confirmation",source:"fixture://funding/neighborhood-arts",state:"source_missing"},
   {id:"consent",label:"Participant permissions and records plan",source:"fixture://project/consent",state:"source_missing"},
   {id:"budget-basis",label:"Price basis for staffing and access",source:"fixture://project/budget",state:"source_missing"},
   {id:"partner",label:"Signed partner/matching funds commitment",source:"fixture://partnership/unconfirmed",state:"source_missing"}
  ],
  budget:[
   line("field-interviews","Oral history collection and interviews","personnel",20000,"grant","fixture://cost/staffing"),
   line("archive","Transcription, accessibility, archival production","services",14000,"grant","fixture://cost/services"),
   line("exhibits","Eight accessible exhibit packages","materials",10000,"grant","fixture://cost/exhibits"),
   line("travel","Local participation and transport","travel",4000,"grant","fixture://cost/travel"),
   line("operations","Project coordination and administration","administration",4000,"match","fixture://cost/admin"),
   line("partners","Community partners and venue contribution","services",12000,"match","fixture://cost/partners"),
   line("donor-hours","Donated venue / volunteer service valuation","services",8000,"match","fixture://cost/donor-hours")
  ],
  milestones:[
   milestone("oral-records","60 consent-reviewed oral history recordings","month-5",18000,60),
   milestone("exhibit-release","Eight accessible exhibit packages","month-9",18000,8),
   milestone("public-workshops","Four inclusive community workshops","month-12",12000,4)
  ],
  evidence:[
   {id:"ev-draft","kind":"proposal",title:"Draft oral-history narrative",source:"fixture://project/narrative",linkTo:"org-status",state:"source_supplied",reviewedBy:""},
   {id:"ev-cost","kind":"budget",title:"Preliminary staffing estimate",source:"fixture://cost/staffing",linkTo:"budget-basis",state:"source_supplied",reviewedBy:""}
  ],
  audit:[]
 };
}
function validate(w){
 if(!w||!idOkay(w.id)||!["illustrative_not_a_real_grant","local_proposal"].includes(w.truth)||
    !Number.isSafeInteger(w.request)||w.request<0||
    !Number.isSafeInteger(w.matchConfirmed)||w.matchConfirmed<0||
    !["nonprofit","municipality","individual","business","other"].includes(w.applicantType)||
    !/^[A-Z]{2}$/.test(w.state)||w.reviewer===w.preparer||
    !Array.isArray(w.budget)||w.budget.length>80||!Array.isArray(w.evidence)||w.evidence.length>120||
    !Array.isArray(w.milestones)||w.milestones.length>50||!Array.isArray(w.requirements)||w.requirements.length>30)
    throw Error("Funding program exceeds typed boundaries.");
 if(!sourceOkay(w.terms?.source)||!Array.isArray(w.terms?.allowed))throw Error("Program terms lack source provenance.");
 const IDs=new Set();
 for(const b of w.budget){
  if(!idOkay(b.id)||IDs.has(b.id)||!KINDS.includes(b.kind)||
     !["grant","match"].includes(b.funding)||!Number.isSafeInteger(b.total)||
     b.total<0||!sourceOkay(b.source))throw Error("Budget identity, amount or source invalid.");
  IDs.add(b.id);
 }
 IDs.clear();
 for(const m of w.milestones){
  if(!idOkay(m.id)||IDs.has(m.id)||!Number.isSafeInteger(m.allocation)||m.allocation<0||
     !STAGES.includes(m.status)||typeof m.label!=="string"||m.label.length>170||
     !Number.isSafeInteger(m.target)||m.target<1)throw Error("Milestone constraints invalid.");
  IDs.add(m.id);
 }
 IDs.clear();
 for(const e of w.evidence){
  if(!idOkay(e.id)||IDs.has(e.id)||!EVIDENCE.includes(e.kind)||!sourceOkay(e.source)||
     !["source_supplied","reviewed"].includes(e.state)||typeof e.title!=="string"||e.title.length>180)
     throw Error("Evidence identity or source invalid.");
  IDs.add(e.id);
 }
 return w;
}
const copy=w=>structuredClone(validate(w));
const sum=(array,key)=>array.reduce((n,r)=>n+r[key],0);
export function evaluate(w){
 validate(w);
 const grant=sum(w.budget.filter(b=>b.funding==="grant"),"total");
 const match=sum(w.budget.filter(b=>b.funding==="match"),"total");
 const project=grant+match,allocations=sum(w.milestones,"allocation");
 const indirect=sum(w.budget.filter(b=>b.kind==="administration"),"total");
 const equipment=sum(w.budget.filter(b=>b.kind==="equipment"),"total");
 const totalFunding=w.request+w.matchConfirmed;
 const constraints=[
  {id:"applicant-type",label:"Applicant type allowed by this program",pass:w.terms.allowedApplicants.includes(w.applicantType)},
  {id:"applicant-region",label:"Project is in an allowed jurisdiction",pass:w.terms.allowedStates.includes(w.state)},
  {id:"request-range",label:"Award request within published limits",pass:w.request>=w.terms.minRequest&&w.request<=w.terms.maxRequest},
  {id:"request-balance",label:"Grant expenses equal requested award",pass:grant===w.request},
  {id:"match-coverage",label:"Match expenses equal confirmed contribution",pass:match===w.matchConfirmed},
  {id:"match-percent",label:"Matching amount meets published minimum",pass:totalFunding>0&&w.matchConfirmed*100>=totalFunding*w.terms.minMatchPercent},
  {id:"indirect-cap",label:"Administration meets funder's cap",pass:project>0&&indirect*100<=project*w.terms.maxIndirectPercent},
  {id:"equipment-cap",label:"Equipment meets funder's cap",pass:project>0&&equipment*100<=project*w.terms.maxEquipmentPercent},
  {id:"allowable-kinds",label:"Every expense category is potentially allowed",pass:w.budget.every(b=>w.terms.allowed.includes(b.kind))},
  {id:"milestone-allocation",label:"Milestone claims do not exceed proposed award",pass:allocations<=w.request}
 ];
 const missing=w.requirements.filter(r=>r.state!=="reviewed");
 const evidenceReview=w.evidence.filter(e=>e.state!=="reviewed");
 const verifiedMilestones=w.milestones.filter(m=>m.status==="reviewed");
 const claimable=sum(verifiedMilestones,"allocation");
 return {grant,match,total:project,request:w.request,matchConfirmed:w.matchConfirmed,
   allocations,unallocated:Math.max(0,w.request-allocations),claimable,unverified:w.request-claimable,
   constraints,passing:constraints.every(x=>x.pass),missing,unreviewedEvidence:evidenceReview,
   verifiedMilestones:verifiedMilestones.length,
   verdict:!constraints.every(x=>x.pass)?"needs_budget_revision":
    w.terms.approval!=="reviewed"||missing.length||evidenceReview.length?"needs_human_evidence_review":"prepared_for_authorized_submission_review"
 };
}
function record(w,actor,action,subject,details=""){
 w.revision++;w.audit.push({rev:w.revision,actor,action,subject,details:String(details).slice(0,230),
  at:new Date().toISOString()});if(w.audit.length>400)w.audit.shift();
 return w;
}
export function transition(world,actor,command,data={}){
 const w=copy(world);
 if(![w.preparer,w.reviewer].includes(actor))throw Error("Actor not in this review context.");
 if(w.caseStatus==="closed")throw Error("Closed applications cannot be changed.");
 if(command==="set-case"){
  if(actor!==w.preparer)throw Error("Only the applicant can revise narrative and request.");
  for(const [key,max] of [["title",180],["impactNarrative",3000],["applicant",160],["initiative",150]]){
   if(data[key]!==undefined)w[key]=String(data[key]).trim().slice(0,max);
  }
  if(data.request!==undefined)w.request=cents(data.request);
  if(data.matchConfirmed!==undefined)w.matchConfirmed=cents(data.matchConfirmed);
  if(data.applicantType)w.applicantType=data.applicantType;
  if(data.state)w.state=String(data.state).trim().toUpperCase();
  w.caseStatus="draft";return record(w,actor,command,w.id);
 }
 if(command==="cost"){
  if(actor!==w.preparer)throw Error("Only the applicant can modify budget costs.");
  const id=String(data.id||"");const current=w.budget.find(b=>b.id===id);
  if(!current)throw Error("Exact cost line missing.");
  if(data.total!==undefined)current.total=cents(data.total);
  if(data.funding!==undefined)current.funding=data.funding;
  if(data.kind!==undefined)current.kind=data.kind;
  if(data.source!==undefined)current.source=String(data.source).slice(0,600);
  validate(w);w.caseStatus="draft";return record(w,actor,command,id);
 }
 if(command==="add-cost"){
  if(actor!==w.preparer||w.budget.length>=80)throw Error("Cannot extend budget.");
  const id=String(data.id||"");
  if(!idOkay(id)||w.budget.some(b=>b.id===id))throw Error("New cost needs a unique identity.");
  w.budget.push(line(id,String(data.label||"").slice(0,160),data.kind,data.total,
    data.funding,data.source));validate(w);w.caseStatus="draft";return record(w,actor,command,id);
 }
 if(command==="review-requirement"){
  if(actor!==w.reviewer)throw Error("Reviewer must independently review a requirement.");
  const r=w.requirements.find(x=>x.id===data.id);if(!r)throw Error("Requirement missing.");
  if(!sourceOkay(String(data.source||r.source)))throw Error("Original source is required.");
  r.source=data.source||r.source;r.state="reviewed";
  return record(w,actor,command,r.id,"Evidence reviewed locally; not an official funder finding.");
 }
 if(command==="review-program"){
  if(actor!==w.reviewer||!sourceOkay(String(data.source||w.terms.source)))
    throw Error("Funder terms require independent source review.");
  w.terms.source=data.source||w.terms.source;w.terms.approval="reviewed";
  return record(w,actor,command,w.id,"Program requirements reviewed in this local draft.");
 }
 if(command==="add-evidence"){
  if(actor!==w.preparer||w.evidence.length>=120)throw Error("Evidence register is full or actor lacks role.");
  const id=String(data.id||"");
  if(!idOkay(id)||w.evidence.some(e=>e.id===id)||!EVIDENCE.includes(data.kind)||!sourceOkay(data.source))
    throw Error("Provide distinct identity, type and a source link.");
  w.evidence.push({id,kind:data.kind,title:String(data.title||"").slice(0,180),
    source:data.source,linkTo:String(data.linkTo||"").slice(0,85),state:"source_supplied",reviewedBy:""});
  return record(w,actor,command,id);
 }
 if(command==="review-evidence"){
  if(actor!==w.reviewer)throw Error("Only the reviewer can record review.");
  const e=w.evidence.find(x=>x.id===data.id);if(!e)throw Error("Evidence not found.");
  e.state="reviewed";e.reviewedBy=actor;return record(w,actor,command,e.id,"Source examined locally, not independently admitted by a funder.");
 }
 if(command==="milestone"){
  const m=w.milestones.find(x=>x.id===data.id);if(!m)throw Error("Milestone does not exist.");
  if(data.status==="in_progress"&&actor===w.preparer&&m.status==="planned"){
    m.status="in_progress";return record(w,actor,command,m.id,"Applicant started illustrative work.");
  }
  if(data.status==="submitted_for_review"&&actor===w.preparer&&m.status==="in_progress"){
    if(!sourceOkay(data.evidenceRef))throw Error("Proof reference required before review.");
    m.status="submitted_for_review";m.evidenceRef=data.evidenceRef;
    return record(w,actor,command,m.id,"Applicant supplied evidence for review.");
  }
  if(data.status==="reviewed"&&actor===w.reviewer&&m.status==="submitted_for_review"&&sourceOkay(m.evidenceRef)){
    m.status="reviewed";m.reviewedBy=actor;m.completedAt=new Date().toISOString();
    return record(w,actor,command,m.id,"Locally reviewed, no actual grant payment disbursed.");
  }
  throw Error("Milestone transition refused: wrong actor, missing source or incorrect prior stage.");
 }
 if(command==="prepare"){
  if(actor!==w.preparer)throw Error("Only applicant can prepare the proposal.");
  const score=evaluate(w);
  if(score.verdict!=="prepared_for_authorized_submission_review")
    throw Error("Budget or evidence review incomplete; submission not prepared.");
  w.caseStatus="prepared_for_review";
  return record(w,actor,command,w.id,"Prepared only; no funder application submitted.");
 }
 throw Error("Unsupported institutional action.");
}
const text=s=>String(s??"").replace(/[\r\n\t]/g," ").slice(0,3000);
const atom=s=>'"'+text(s).replaceAll('"',"'")+'"';
export function proposal(w){
 const score=evaluate(w);
 const lines=["# "+text(w.title),"",
  "Applicant: "+text(w.applicant),"Program: "+text(w.agency),
  "Source: "+text(w.terms.source),"Truth: "+w.truth,
  "Requested: "+money(w.request),"Declared match (not independently verified): "+money(w.matchConfirmed),
  "Budget total: "+money(score.total),"","## Project purpose",w.impactNarrative,"",
  "## Funding restrictions and gaps"];
 for(const c of score.constraints)lines.push("- "+(c.pass?"PASS":"REVIEW")+" — "+c.label);
 for(const r of score.missing)lines.push("- Missing reviewed evidence: "+r.label+" · "+r.source);
 lines.push("","## Budget");
 for(const b of w.budget)lines.push("- "+b.label+" — "+money(b.total)+" ("+b.kind+" / "+b.funding+") · Source: "+b.source);
 lines.push("","## Milestone commitments");
 for(const m of w.milestones)lines.push("- "+m.label+" — "+money(m.allocation)+"; "+m.status+"; source "+(m.evidenceRef||"not supplied"));
 lines.push("","## Review decision",score.verdict,
  "Claimable projection from locally reviewed milestones: "+money(score.claimable),
  "This is neither a grant award, funder eligibility opinion, cash collection nor an authorized claim.");
 return lines.join("\n");
}
export function handoff(w){
 const result=evaluate(w),rows=[
  "program impact-funding-proposal","application "+w.id,
  "applicant "+atom(w.applicant),"program_ref "+atom(w.terms.source),
  "request_cents "+w.request,"match_cents "+w.matchConfirmed,"revision "+w.revision,
  "review_state "+result.verdict];
 for(const b of w.budget)rows.push("cost "+b.id+" "+b.kind+" "+b.funding+" "+b.total+" "+atom(b.source));
 for(const m of w.milestones)rows.push("milestone "+m.id+" "+m.allocation+" "+m.status+" "+atom(m.evidenceRef||"unbound"));
 rows.push("authority local-draft-only","cannot_infer local_source_review_is_not_funder_approval_or_paid_grant_claim");
 return rows.join("\n")+"\n";
}
