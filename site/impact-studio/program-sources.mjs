/* Official public funding references, deliberately NOT imported as award terms.
 * Discovery dates are independently checked; future changes require new observations.
 * A source link is not an eligibility or application receipt.
 */
export const PROGRAMS=Object.freeze([
 {id:"nea-gap-fy27",name:"NEA Grants for Arts Projects · FY 2027",
  authority:"National Endowment for the Arts",
  source:"https://www.arts.gov/grants/grants-for-arts-projects",
  deadline:"2026-07-09",awardMin:10000,awardMax:100000,
  matchRatio:1,types:["nonprofit","municipality"],
  known:[
   "FY 2027 GAP Part 1 final deadline was July 9, 2026.",
   "The standard category requests $10,000–$100,000 with 1:1 cost share.",
   "501(c)(3), government or recognized tribal eligibility requires original documentation.",
   "Organization arts-programming duration and historic operating expenses are additional requirements."],
  unknown:["Institution's actual 501(c)(3) and operating history","Eligible cost categories for the exact discipline","Current next-cycle rules and deadline"]},
 {id:"dallas-cop-fy27",name:"Dallas Cultural Organizations Program · FY 2026–27",
  authority:"City of Dallas Office of Arts and Culture",
  source:"https://dallasculture.org/cultural-funding-programs/cultural-organizations-program/",
  deadline:"2026-04-10",awardMin:null,awardMax:null,
  matchRatio:null,types:["nonprofit"],
  known:[
   "FY 2026–27 application deadline was April 10, 2026.",
   "Dallas-based nonprofit arts organizations apply for cultural-services contracts.",
   "Operating revenues above $100,000, at least one employee, and a three-year 501(c)(3)/operating history were listed prerequisites.",
   "Returning funded organizations and new organizations have distinct application paths."],
  unknown:["Applicant's actual financial and organizational history","Award amount and current next-cycle funding rules","Dallas-based operations and local program percentage"]},
 {id:"dallas-artsactivate-2027",name:"Dallas ArtsActivate 2027",
  authority:"City of Dallas Office of Arts and Culture",
  source:"https://dallasculture.org/cultural-funding-programs/artsactivate/",
  deadline:null,awardMin:null,awardMax:null,
  matchRatio:null,types:["nonprofit","individual","other"],
  known:[
   "The program lists three application rounds during the 2026–27 fiscal year.",
   "Its applicant categories include arts nonprofits, social-service organizations, individual artists and collectives.",
   "The funding period described on the official site spans June 16, 2026 through March 1, 2027.",
   "Current round eligibility, limits and deadlines must be read from the full guidelines."],
  unknown:["Current application round, deadline and applicant group","Award range and applicable restrictions","Whether this project is already in a City-funded scope"]}
]);
const dayUTC=iso=>Date.parse(iso+"T23:59:59Z");
export function compareProgram(proposal,id,{now=Date.now()}={}){
 const program=PROGRAMS.find(x=>x.id===id);if(!program)throw Error("Unknown official source program.");
 const blockers=[],unknown=[...program.unknown];
 if(program.deadline && now>dayUTC(program.deadline))blockers.push("The cited application deadline has passed; a new call must be observed.");
 if(program.types.length && !program.types.includes(proposal.applicantType))
   blockers.push("The proposed applicant type is not in the abbreviated published categories.");
 if(Number.isFinite(program.awardMin)&&proposal.request<program.awardMin*100)
   blockers.push("Proposed award is below the published request minimum.");
 if(Number.isFinite(program.awardMax)&&proposal.request>program.awardMax*100)
   blockers.push("Proposed award exceeds the published request maximum.");
 if(program.matchRatio!==null&&proposal.matchConfirmed<proposal.request*program.matchRatio)
   blockers.push("Declared match is below the published cost-share ratio.");
 return {program,blockers,unknown,
  state:blockers.length?"do_not_submit":unknown.length?"source_review_required":"conditions_may_fit",
  sourceState:"public_program_reference_not_applicant_admission"};
}
