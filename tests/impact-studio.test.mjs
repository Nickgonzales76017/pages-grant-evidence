import test from "node:test";
import assert from "node:assert/strict";
import {sample,evaluate,transition,proposal,handoff,cents,sourceOkay} from "../site/impact-studio/core.mjs";

test("reference case reconciles 48k award, 24k match, 72k project and three obligations",()=>{
 const w=sample(),x=evaluate(w);
 assert.equal(w.truth,"illustrative_not_a_real_grant");
 assert.equal(x.request,cents(48000));assert.equal(x.matchConfirmed,cents(24000));
 assert.equal(x.grant,cents(48000));assert.equal(x.match,cents(24000));assert.equal(x.total,cents(72000));
 assert.equal(x.allocations,cents(48000));assert.equal(x.claimable,0);
 assert.equal(x.constraints.length,10);assert.equal(x.constraints.filter(q=>q.pass).length,10);
 assert.equal(x.verdict,"needs_human_evidence_review");
 assert.equal(w.evidence.length,2);assert.equal(w.requirements.length,5);
});
test("cost and allowable spend gate fail even when a narrative claims suitability",()=>{
 const w=sample();
 let revised=transition(w,"casey","cost",{id:"field-interviews",total:22000});
 assert.equal(evaluate(revised).constraints.find(x=>x.id==="request-balance").pass,false);
 assert.equal(evaluate(revised).verdict,"needs_budget_revision");
 revised=transition(w,"casey","cost",{id:"field-interviews",kind:"equipment"});
 assert.equal(evaluate(revised).constraints.find(x=>x.id==="equipment-cap").pass,false);
 assert.equal(evaluate(revised).verdict,"needs_budget_revision");
 assert.throws(()=>transition(w,"riley","cost",{id:"travel",total:1000}),/applicant/);
 assert.throws(()=>transition(w,"casey","cost",{id:"unknown",total:1000}),/missing/);
});
test("no applicant can approve their own source or grant notice",()=>{
 const w=sample();
 assert.throws(()=>transition(w,"casey","review-program"),/review/);
 assert.throws(()=>transition(w,"casey","review-evidence",{id:"ev-draft"}),/reviewer/);
 assert.throws(()=>transition(w,"riley","prepare"),/applicant/);
 assert.throws(()=>transition(w,"casey","prepare"),/incomplete/);
});
test("independent applicant/reviewer path prepares a reviewable proposal, not an application",()=>{
 let w=sample();
 w=transition(w,"riley","review-program");
 for(const req of w.requirements)w=transition(w,"riley","review-requirement",{id:req.id});
 for(const e of w.evidence)w=transition(w,"riley","review-evidence",{id:e.id});
 const cut=evaluate(w);assert.equal(cut.verdict,"prepared_for_authorized_submission_review");
 w=transition(w,"casey","prepare");
 assert.equal(w.caseStatus,"prepared_for_review");
 assert.match(proposal(w),/no real funder claims|not a grant award|neither a grant award/i);
 assert.match(handoff(w),/authority local-draft-only/);
 assert.match(handoff(w),/cannot_infer local_source_review/);
 assert.equal(w.revision,1+5+2+1);
});
test("milestones require sequential applicant submission and independent review",()=>{
 let w=sample();
 assert.throws(()=>transition(w,"riley","milestone",{id:"oral-records",status:"reviewed"}),/transition refused/);
 assert.throws(()=>transition(w,"casey","milestone",{id:"oral-records",status:"submitted_for_review"}),/transition refused/);
 w=transition(w,"casey","milestone",{id:"oral-records",status:"in_progress"});
 assert.throws(()=>transition(w,"casey","milestone",{id:"oral-records",status:"submitted_for_review",evidenceRef:"javascript:evil()"}),/Proof reference/);
 w=transition(w,"casey","milestone",{id:"oral-records",status:"submitted_for_review",evidenceRef:"fixture://impact/recordings-60"});
 assert.equal(evaluate(w).claimable,0);
 w=transition(w,"riley","milestone",{id:"oral-records",status:"reviewed"});
 assert.equal(evaluate(w).claimable,cents(18000));
 assert.equal(evaluate(w).unverified,cents(30000));
 assert.throws(()=>transition(w,"casey","milestone",{id:"oral-records",status:"reviewed"}),/transition refused/);
});
test("new sources require exact identities and safe original HTTPS references",()=>{
 const w=sample();
 assert.ok(sourceOkay("https://example.org/official-funding-notice"));
 assert.equal(sourceOkay("https://user:password@example.org/secret"),false);
 assert.equal(sourceOkay("http://example.org/program"),false);
 assert.throws(()=>transition(w,"casey","add-evidence",{id:"ev-draft",title:"duplicate",kind:"report",source:"https://example.org/a"}),/identity/);
 assert.throws(()=>transition(w,"casey","add-evidence",{id:"ev-fake",title:"bad",kind:"report",source:"javascript:evil()"}),/source/);
 const later=transition(w,"casey","add-evidence",{id:"ev-session",title:"Recorded outcome",kind:"report",source:"https://example.org/metrics",linkTo:"org-status"});
 assert.equal(later.evidence.length,3);
 assert.equal(later.evidence.at(-1).state,"source_supplied");
 assert.equal(evaluate(later).unreviewedEvidence.length,3);
});
test("budget mismatch is not corrected by silently altering grant request",()=>{
 const w=sample(),q=transition(w,"casey","set-case",{request:50000});
 const x=evaluate(q);
 assert.equal(q.request,cents(50000));assert.equal(x.grant,cents(48000));
 assert.equal(x.constraints.find(c=>c.id==="request-balance").pass,false);
 assert.equal(w.request,cents(48000));
 assert.throws(()=>cents(-2),/nonnegative/);
});

test("applicant geography and legal status cannot be hidden by a balanced budget",()=>{
 const w=sample();
 const badType=transition(w,"casey","set-case",{applicantType:"individual"});
 assert.equal(evaluate(badType).constraints.find(x=>x.id==="applicant-type").pass,false);
 const wrongState=transition(w,"casey","set-case",{state:"NY"});
 assert.equal(evaluate(wrongState).constraints.find(x=>x.id==="applicant-region").pass,false);
 assert.equal(evaluate(wrongState).verdict,"needs_budget_revision");
});
