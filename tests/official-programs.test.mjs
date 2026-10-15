import test from "node:test";
import assert from "node:assert/strict";
import {sample,cents} from "../site/impact-studio/core.mjs";
import {PROGRAMS,compareProgram} from "../site/impact-studio/program-sources.mjs";
const october=Date.UTC(2026,9,14);
test("official funding records preserve exact public sources and never assert eligibility",()=>{
 assert.equal(PROGRAMS.length,3);
 assert.ok(PROGRAMS.every(p=>p.source.startsWith("https://")));
 assert.equal(PROGRAMS[0].source,"https://www.arts.gov/grants/grants-for-arts-projects");
 assert.equal(PROGRAMS[0].deadline,"2026-07-09");
 assert.equal(PROGRAMS[1].deadline,"2026-04-10");
 assert.equal(PROGRAMS[2].deadline,null);
});
test("NEA cost share refuses fictional proposal and expired 2026 deadline",()=>{
 const p=sample(),result=compareProgram(p,"nea-gap-fy27",{now:october});
 assert.equal(result.state,"do_not_submit");
 assert.ok(result.blockers.some(t=>t.includes("deadline")));
 assert.ok(result.blockers.some(t=>t.includes("cost-share ratio")));
 assert.ok(result.unknown.length>=3);
 assert.equal(result.sourceState,"public_program_reference_not_applicant_admission");
});
test("Dallas COP eligibility remains unproven, even if the math balances",()=>{
 const p=sample(),result=compareProgram(p,"dallas-cop-fy27",{now:october});
 assert.ok(result.blockers.some(t=>t.includes("deadline")));
 assert.ok(result.unknown.some(t=>t.includes("organizational history")));
});
test("ArtsActivate records three fiscal-year rounds without inventing current open-now status",()=>{
 const p=sample(),result=compareProgram(p,"dallas-artsactivate-2027",{now:october});
 assert.equal(result.state,"source_review_required");
 assert.equal(result.blockers.length,0);
 assert.ok(result.unknown.some(t=>t.includes("Current application round")));
 assert.throws(()=>compareProgram(p,"invented",{now:october}),/Unknown/);
});
test("known NEA amount limits do not become the private fictional funder's terms",()=>{
 const p=sample();
 const altered=structuredClone(p);altered.request=cents(150000);
 const NEA=compareProgram(altered,"nea-gap-fy27",{now:Date.UTC(2026,2,1)});
 assert.ok(NEA.blockers.some(t=>t.includes("request maximum")));
 assert.equal(p.terms.maxRequest,cents(60000));
});
