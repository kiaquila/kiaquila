import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {evaluateNativeEvidence, isNativeCleanComment} from "../scripts/native-codex-policy.mjs";
import {cleanStateBody} from "./fixtures/codex-state.mjs";
const head="1234567890abcdef1234567890abcdef12345678";
const owner={id:1,user:{login:"owner",type:"User"},author_association:"OWNER",body:"@codex review "+head,created_at:"2026-10-20T12:00:00Z"};
const bot={login:"chatgpt-codex-connector[bot]",type:"Bot"};
const record=(body,overrides={})=>({id:2,user:bot,body,created_at:"2026-10-20T12:02:00Z",updated_at:"2026-10-20T12:02:00Z",...overrides});
const receipt=`<!-- codex-review-receipt:v1 -->\nCodex Review: Didn't find any major issues.\n**Reviewed commit:** \`${head}\``;
const evaluate=(comments=[record(receipt)],extra={})=>evaluateNativeEvidence({head,comments:[owner,...comments],...extra});
const corpus=JSON.parse(readFileSync(new URL("./fixtures/native-codex-clean-replies.json",import.meta.url)));
for (const row of corpus) test(`complete native corpus: ${row.closing || "plain"}`,()=>{
 assert.equal(evaluate([record(row.body)]).reviewed,true);
 for(const body of [row.body+"\nAuthentication leaks credentials.",row.body.replace(/1234567890/g,"fffffffff0"),row.body+"\n**Reviewed commit:** `"+head+"`",row.body.replace("</details>","Credentials leak.</details>")].filter(body=>body!==row.body)) assert.equal(evaluate([record(body)]).reviewed,false,body);
});
test("a SHA annotation or formal review presence alone never grants approval",()=>{
 assert.equal(evaluate([record(`**Reviewed commit:** \`${head}\``)]).reviewed,false);
 assert.equal(evaluate([], {reviews:[{user:bot,commit_id:head,state:"COMMENTED",submitted_at:"2026-10-20T12:02:00Z"}]}).reviewed,false);
 assert.equal(evaluate([], {reviews:[{user:bot,commit_id:head,state:"DISMISSED",submitted_at:"2026-10-20T12:02:00Z"}]}).reviewed,false);
});
test("requests, bot identity, immutable receipts and exact heads stay authoritative",()=>{
 assert.equal(evaluate([record(receipt,{user:{...bot,type:"User"}})]).reviewed,false);
 assert.equal(evaluate([record(receipt,{created_at:"2026-10-20T11:59:00Z"})]).reviewed,false);
 assert.equal(evaluate([record(receipt)],{head:"a".repeat(40)}).reviewed,false);
 assert.equal(evaluate([record(receipt)],{comments:[{...owner,author_association:"NONE"},record(receipt)]}).reviewed,false);
});
test("every unresolved native thread blocks, including untagged and advisory findings",()=>{
 for(const body of ["P1: credentials leak","P3: advisory","Untyped native finding"]){
  const thread={isResolved:false,comments:{nodes:[{user:bot,path:"example.mjs",body}],pageInfo:{hasNextPage:false}}};
  assert.equal(evaluate(undefined,{threads:[thread]}).reviewed,false);
  assert.equal(evaluate(undefined,{threads:[{...thread,isResolved:true}]}).reviewed,true);
 }
 assert.equal(evaluate(undefined,{threads:[{isResolved:true,comments:{nodes:[],pageInfo:{hasNextPage:true}}}]}).reviewed,false);
});
test("structured completion, pending state and independent security findings remain distinct",()=>{
 const state=cleanStateBody(head);
 assert.equal(evaluate([record(state)]).reviewed,true);
 assert.equal(evaluate([record(state.replace('"has_any_findings":false','"has_any_findings":null'))]).reviewed,false);
 assert.equal(evaluate([record(state.replace('"completed"','"running"'))]).reviewed,false);
 assert.equal(evaluate([record(receipt),record(state+"\nAuthentication leaks credentials.",{id:3,updated_at:"2026-10-20T12:03:00Z"})]).reviewed,false);
 const security=cleanStateBody(head,state=>({...state,security_review:{commit_sha:head,has_any_findings:true,has_unresolved_findings:true,status:"completed"}}));
 assert.equal(evaluate([record(security),record(receipt,{id:3,created_at:"2026-10-20T12:03:00Z",updated_at:"2026-10-20T12:03:00Z"})]).reviewed,false);
});

test("reply order never replaces reviewed commit identity",()=>{
 assert.equal(evaluate([record("Codex Review: Didn't find any major issues.")]).reviewed,false);
 assert.equal(evaluate([record("Codex Review: Didn't find any major issues. Nice work!")]).reviewed,false);
});
test("formal approval needs a complete current-head verdict",()=>{
 const review={user:bot,commit_id:head,state:"APPROVED",submitted_at:"2026-10-20T12:03:00Z"};
 assert.equal(evaluate([],{reviews:[{...review,body:""}]}).reviewed,false);
 assert.equal(evaluate([],{reviews:[{...review,body:receipt}]}).reviewed,true);
 assert.equal(evaluate([],{reviews:[{...review,body:receipt+"\nCredentials leak."}]}).reviewed,false);
});
test("all completed code and security clocks fit the observed comment",()=>{
 const state=cleanStateBody(head,s=>({...s,security_review:{...s.code_review}}));
 const row=time=>`\n| 🔒 **Security Review** | ✅ **Completed** <relative-time datetime="${time}">${time}</relative-time> | \`${head.slice(0,7)}\` | Manual request |`;
 assert.equal(evaluate([record(state+row("2026-10-20T12:02:00Z"))]).reviewed,true);
 assert.equal(evaluate([record(state+row("2099-10-20T12:02:00Z"))]).reviewed,false);
});

test("a newer code receipt cannot finish running or failed security review",()=>{
 const row=(status,time)=>`\n| 🔒 **Security Review** | ${status} <relative-time datetime="${time}">${time}</relative-time> | \`${head.slice(0,7)}\` | Manual request |`;
 const running=cleanStateBody(head,s=>({...s,security_review:{commit_sha:head,has_any_findings:null,has_unresolved_findings:null,status:"running"}}))+row("🔄 **Running** since","2026-10-20T12:02:00Z");
 const later=record(receipt,{id:3,created_at:"2026-10-20T12:03:00Z",updated_at:"2026-10-20T12:03:00Z"});
 assert.equal(evaluate([record(running),later]).reviewed,false);
 const completed=cleanStateBody(head,s=>({...s,security_review:{...s.code_review}}))+row("✅ **Completed**","2026-10-20T12:04:00Z");
 assert.equal(evaluate([record(running),later,record(completed,{id:4,updated_at:"2026-10-20T12:04:00Z"})]).reviewed,true);
 assert.equal(evaluate([record(running),later,record(completed.replaceAll("2026-10-20T12:04:00Z","2099-10-20T12:04:00Z"),{id:4,updated_at:"2026-10-20T12:04:00Z"})]).reviewed,false);
});
