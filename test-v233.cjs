const A=require('node:assert/strict');
const R=require('./dist/runtime'),M=require('./dist/model');
const xml='<build>\nfixture body\n</build>';
const cases=[
 ['non-thinking body begins with block',xml,true],
 ['non-thinking leading spaces','   '+xml,true],
 ['non-thinking leading tab','\t'+xml,true],
 ['non-thinking BOM and spaces','\uFEFF '+xml,true],
 ['non-thinking leading LF','\n'+xml,true],
 ['non-thinking leading CRLF','\r\n  '+xml,true],
 ['non-thinking paragraph then newline','paragraph\n'+xml,true],
 ['non-thinking inline mention rejected','paragraph '+xml,false],
 ['non-thinking same-line suffix rejected',xml+' suffix',false],
 ['non-thinking suffix newline accepted',xml+'\nparagraph',true],
 ['closed think directly adjacent','<think>fixture</think>'+xml,true],
 ['closed thinking directly adjacent','<thinking>fixture</thinking>'+xml,true],
 ['case-insensitive thinking prefix','<THINK>fixture</THINK>'+xml,true],
 ['leading whitespace before thought',' \r\n<think>fixture</think>'+xml,true],
 ['thought then leading spaces','<think>fixture</think>  '+xml,true],
 ['thought then LF','<think>fixture</think>\n'+xml,true],
 ['thought then CRLF','<think>fixture</think>\r\n'+xml,true],
 ['multiple closed thought prefixes','<think>a</think> <thinking>b</thinking>'+xml,true],
 ['nested balanced thought prefix','<think>a<thinking>b</thinking>c</think>'+xml,true],
 ['opaque thought fence does not leak','<think>```fixture\ntext</think>'+xml,true],
 ['opaque thought container does not leak','<think><html>fixture</think>'+xml,true],
 ['thought XML mention does not mask visible block','<think>\n'+xml+'\n</think>'+xml,true],
 ['thought-only XML has no visible block','<think>\n'+xml+'\n</think>',false],
 ['unclosed think rejected','<think>\n'+xml,false],
 ['unclosed thinking rejected','<thinking>\n'+xml,false],
 ['spaced unclosed think rejected','<think >\n'+xml,false],
 ['nested unclosed thought rejected','<think><think>x</think>\n'+xml,false],
 ['mismatched thought close rejected','<think>x</thinking>\n'+xml,false],
 ['second unclosed thought rejected','<think>x</think><thinking>\n'+xml,false],
 ['ordinary prose after thinking still needs newline','<think>x</think>prose '+xml,false],
 ['ordinary paragraph after thinking accepted','<think>x</think>prose\n'+xml,true],
 ['backtick fence rejected','```xml\n'+xml+'\n```',false],
 ['tilde fence rejected','~~~xml\n'+xml+'\n~~~',false],
 ['closed fence then visible block accepted','```text\nfixture\n```\n'+xml,true],
 ['long fence not closed by short fence','````xml\nfixture\n```\n'+xml,false],
 ['different fence type does not close','```xml\nfixture\n~~~\n'+xml,false],
 ['closed thought then fenced block rejected','<think>x</think>```xml\n'+xml+'\n```',false],
 ['unclosed tool rejected','<tool>\n'+xml,false],
 ['unclosed tool result rejected','<tool_result>\n'+xml,false],
 ['unclosed html rejected','<html>\n'+xml,false],
 ['unclosed details rejected','<details>\n'+xml,false],
 ['nested unclosed details rejected','<details><details>x</details>\n'+xml,false],
 ['non-leading thought not treated as body prefix','explanation <think>x</think>'+xml,false],
 ['missing block rejected','plain text',false],
];
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+' '+e.message);}}
const row=(content,chat='fixture-chat',sender='ai',group='',name='Fixture')=>[chat,name,group,sender,content];
async function mockOwner(rows,fn,names=[{id:'fixture-card',name:'Fixture'}]){
 const old=global.Java;let reads=0;
 const db={query:(sql,args)=>{A.match(sql,/^SELECT /);A.match(sql,/UNION ALL/);reads++;let index=-1;const found=rows.filter(r=>r[4].includes(args[0])).slice(0,20);return {moveToNext:()=>++index<found.length,getString:i=>found[index][i],getCount:()=>found.length,close:()=>{}};}};
 global.Java={getApplicationContext:()=>({}),type:name=>{
  if(name.endsWith('AppDatabase'))return {Companion:{getDatabase:()=>({getOpenHelper:()=>({getReadableDatabase:()=>db})})}};
  if(name.endsWith('CharacterCardManager'))return {getInstance:()=>({callSuspend:async()=>names.map(c=>({getId:()=>c.id,getName:()=>c.name}))})};
  throw Error('Unexpected Java API '+name);
 }};
 try{return await fn(()=>reads);}finally{global.Java=old;}
}
(async()=>{
 for(const [name,content,expected] of cases)await test(name,()=>A.equal(R.isStandalone(content,xml),expected));
 for(const [name,rows,expected] of [
  ['owner non-thinking first block',[row(xml)],true],
  ['owner non-thinking whitespace',[row(' '+xml)],true],
  ['owner closed thinking adjacency',[row('<think>x</think>'+xml)],true],
  ['owner unknown cross-chat duplicate',[row(xml),row(xml,'other-chat')],false],
  ['owner main and variant same chat',[row(xml),row(xml)],true],
  ['owner variant another chat',[row(xml),row('<think>x</think>'+xml,'variant-chat')],false],
  ['owner group rejected',[row(xml,'fixture-chat','ai','fixture-group')],false],
  ['owner user message rejected',[row(xml,'fixture-chat','user')],false],
  ['owner mixed senders rejected',[row(xml),row(xml,'fixture-chat','user')],false],
  ['owner thought-only rejected',[row('<think>\n'+xml+'\n</think>')],false],
  ['owner inline sample rejected',[row('example '+xml)],false],
  ['owner lookup cap remains conservative',Array.from({length:20},()=>row(xml)),false],
 ])await test(name,()=>mockOwner(rows,async()=>{const who=await R.owner(xml);A.equal(!!who.cardId,expected);if(expected){const s=M.defaults();s.rules[0].cardIds=['fixture-card'];A.equal(M.decide(xml,'build',s,who.cardId).mode,'collapse');}}));
 await test('owner duplicate character names remain unknown',()=>mockOwner([row(xml)],async()=>A.equal((await R.owner(xml)).cardId,''),[{id:'a',name:'Fixture'},{id:'b',name:'Fixture'}]));
 await test('owner unknown character remains unknown',()=>mockOwner([row(xml)],async()=>A.equal((await R.owner(xml)).cardId,''),[]));
 await test('all incomplete non-thinking streams remain non-destructive',()=>{const s=M.defaults();s.rules[0].cardIds=['fixture-card'];for(let i=0;i<xml.length;i++)A.notEqual(M.decide(xml.slice(0,i),'build',s,'fixture-card').mode,'collapse');});
 await test('ownership check never mutates source or queries writes',()=>mockOwner([row('<think>x</think>'+xml)],async reads=>{const raw='<think>x</think>'+xml;const who=await R.owner(xml);A.ok(who.cardId);A.equal(raw,'<think>x</think>'+xml);A.equal(reads(),1);}));
 console.log(JSON.stringify({suite:'v2.3.3-body-boundaries',passed,failed,total:passed+failed}));
 if(failed)process.exitCode=1;
})();