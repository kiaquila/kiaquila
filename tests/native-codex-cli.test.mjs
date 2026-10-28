import assert from "node:assert/strict";
import test from "node:test";
import {mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {spawnSync} from "node:child_process";
const root=fileURLToPath(new URL("../",import.meta.url));
function run(mode){
 const dir=mkdtempSync(join(tmpdir(),"native-gate-"));
 try{
  const mock=join(dir,"mock.mjs");
  writeFileSync(mock, `
  const head="1234567890abcdef1234567890abcdef12345678";
  const mode=${JSON.stringify(mode)};
  let reads=0;
  globalThis.fetch=async(url,options)=>{
   if(url!=="https://api.github.com/graphql" || options.method!=="POST") throw new Error("Gate must only read GraphQL evidence");
   const {query,variables}=JSON.parse(options.body);
   let result;
   if(query.includes("connection: reviews")) result={connection:{nodes:[],pageInfo:{hasNextPage:false}}};
   else if(query.includes("connection: comments")) result={connection:{nodes:[
    {databaseId:1,author:{login:"owner",__typename:"User"},authorAssociation:"OWNER",body:"@codex review "+head,createdAt:"2026-10-20T12:00:00Z"},
    {databaseId:2,author:{login:"chatgpt-codex-connector",__typename:"Bot"},body:"Codex Review: Didn't find any major issues.\\n**Reviewed commit:** "+String.fromCharCode(96)+head+String.fromCharCode(96),createdAt:"2026-10-20T12:01:00Z"}
   ],pageInfo:{hasNextPage:false}}};
   else if(query.includes("connection: reviewThreads")) {
    const late=variables.after!==null || (mode==="race" && reads>0);
    result={connection:{nodes:late?[{isResolved:false,comments:{nodes:[{author:{login:"chatgpt-codex-connector",__typename:"Bot"},body:"P3: unresolved finding",path:"test.mjs"}],pageInfo:{hasNextPage:false}}}]:[],pageInfo:{hasNextPage:mode==="pagination" && !variables.after,endCursor:"page2"}}};
   } else {reads++;result={headRefOid:mode==="moved" && reads>1?"a".repeat(40):head};}
   return {ok:true,json:async()=>({data:{repository:{pullRequest:result}}})};
  };
  `);
  return spawnSync(process.execPath,["--import",pathToFileURL(mock).href,resolve(root,"scripts/check-codex-review.mjs")],{
   env:{...process.env,GITHUB_TOKEN:"mock-only",GITHUB_REPOSITORY:"owner/repository",CODEX_REVIEW_PR_NUMBER:"1",CODEX_REVIEW_HEAD_SHA:"1234567890abcdef1234567890abcdef12345678",CODEX_REVIEW_WAIT_MS:"1",CODEX_REVIEW_POLL_MS:"1"},encoding:"utf8",timeout:10000});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test("native gate accepts clean evidence and rechecks races before success",()=>{
 const clean=run("clean");assert.equal(clean.status,0,clean.stdout+clean.stderr);
 for(const mode of ["pagination","race","moved"]){
  const result=run(mode);assert.equal(result.status,1,mode+result.stdout+result.stderr);
  assert.match(result.stdout+result.stderr,mode==="moved"?/head moved/:/unresolved finding/i);
 }
});
