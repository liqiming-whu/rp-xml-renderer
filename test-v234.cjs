const A=require('node:assert/strict');
const R=require('./dist/runtime'),M=require('./dist/model');
const block=(tag,body)=>'<'+tag+'>\n'+body+'\n</'+tag+'>';
const xml=block('build','fixture body');
const think=text=>'<think>'+text+'</think>';
const warning=text=>'<status type="warning">'+text+'</status>';
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+' '+e.message);}}
const positivePrefixes=[
 ['retry with second thought',think('first')+'\n'+warning('fixture')+think('second')],
 ['retry without second thought',think('first')+warning('fixture')],
 ['warning before non-thinking body',warning('fixture')],
 ['warning then thought',warning('fixture')+think('second')],
 ['multiple warnings',think('first')+warning('one')+warning('two')],
 ['multiple retry cycles',think('one')+warning('one')+think('two')+warning('two')+think('three')],
 ['mixed thought names','<thinking>one</thinking>'+warning('fixture')+think('two')],
 ['second thought has unmatched HTML mention',think('one')+warning('fixture')+think('<html> and <choices>')],
 ['second thought has unfinished fence',think('one')+warning('fixture')+think('```xml\nfixture')],
 ['warning body is opaque',warning('<html><tool>\n```fixture')],
 ['metadata separated by CRLF','\uFEFF \r\n'+think('one')+'\r\n '+warning('fixture')+'\r\n '+think('two')],
 ['single-quoted type',"<status type='warning'>fixture</status>"],
 ['reordered quoted attributes','<status title="fixture" type = "warning" tool="fixture">fixture</status>'],
 ['newline between attributes','<status\ntitle="fixture"\ntype="warning">fixture</status>'],
 ['case-insensitive tag and attribute name','<STATUS TYPE="warning">fixture</STATUS>'],
 ['nested status stays opaque',warning('<status type="info">fixture</status>')],
];
const rejectedPrefixes=[
 ['missing warning close','<status type="warning">fixture\n'],
 ['missing warning close after thought',think('first')+'<status type="warning">fixture\n'],
 ['missing second thought close',think('first')+warning('fixture')+'<think>\n'],
 ['missing first thought close','<think>fixture'+warning('fixture')+'\n'],
 ['mismatched thought close','<think>fixture</thinking>'+warning('fixture')+'\n'],
 ['missing nested warning close','<status type="warning"><status type="info">fixture</status>\n'],
 ['self-closing status is not a complete control','<status type="warning"/>'],
 ['missing type is not warning','<status>fixture</status>'],
 ['unquoted type is not accepted','<status type=warning>fixture</status>'],
 ['data-type does not impersonate type','<status data-type="warning">fixture</status>'],
 ['type text inside quoted title is not an attribute',"<status title='type=\"warning\"'>fixture</status>"],
 ['duplicate type attributes rejected','<status type="warning" type="warning">fixture</status>'],
 ['conflicting duplicate type rejected','<status type="info" type="warning">fixture</status>'],
 ['duplicate other attributes rejected','<status title="one" type="warning" title="two">fixture</status>'],
 ['boolean attributes not accepted','<status type="warning" extra>fixture</status>'],
 ['unterminated attribute quote','<status type="warning title=fixture>fixture</status>'],
 ['greater-than inside unescaped attribute fails conservatively','<status type="warning" title="x>y">fixture</status>'],
 ['similarly named status tag not consumed','<status_extra type="warning">fixture</status_extra>'],
 ['warning control inside a backtick fence','```xml\n'+warning('fixture')+'\n'],
 ['warning control inside a tilde fence','~~~xml\n'+warning('fixture')+'\n'],
 ['warning control inside incomplete thinking','<think>\n'+warning('fixture')+'\n'],
 ['ordinary inline prose is not metadata','ordinary prose '+warning('fixture')],
];
const row=(content,chat='fixture-chat',sender='ai',group='',name='Fixture')=>[chat,name,group,sender,content];
async function withRows(rows,fn){
 const prior=global.Java;let reads=0;
 const db={query:(sql,args)=>{A.match(sql,/^SELECT /);A.match(sql,/UNION ALL/);reads++;let i=-1;const found=rows.filter(x=>x[4].includes(args[0])).slice(0,20);return {moveToNext:()=>++i<found.length,getString:n=>found[i][n],getCount:()=>found.length,close:()=>{}};}};
 global.Java={getApplicationContext:()=>({}),type:name=>{
  if(name.endsWith('AppDatabase'))return {Companion:{getDatabase:()=>({getOpenHelper:()=>({getReadableDatabase:()=>db})})}};
  if(name.endsWith('CharacterCardManager'))return {getInstance:()=>({callSuspend:async()=>[{getId:()=>'fixture-card',getName:()=>'Fixture'}]})};
  throw Error('Unexpected Java API '+name);
 }};
 const original=JSON.stringify(rows);
 try{return await fn(()=>reads);}finally{A.equal(JSON.stringify(rows),original);global.Java=prior;}
}
(async()=>{
 for(const tag of ['build','choices','updatevariable']){
  const current=block(tag,tag==='updatevariable'?'<JSONPatch>\n[]\n</JSONPatch>':'fixture line');
  for(const [name,prefix] of positivePrefixes)await test(tag+' '+name,()=>A.equal(R.isStandalone(prefix+current,current),true));
 }
 for(const [name,prefix] of rejectedPrefixes)await test(name,()=>A.equal(R.isStandalone(prefix+xml,xml),false));
 for(const type of ['info','error','complete','completion','wait_for_user_need','Warning',' warning '])await test('unknown status type '+JSON.stringify(type)+' is not skipped',()=>A.equal(R.isStandalone('<status type="'+type+'">fixture</status>'+xml,xml),false));
 await test('body has no thinking or warning',()=>A.equal(R.isStandalone(xml,xml),true));
 await test('non-thinking leading spaces retained',()=>A.equal(R.isStandalone('  '+xml,xml),true));
 await test('normal paragraph after metadata retains newline boundary',()=>A.equal(R.isStandalone(warning('fixture')+'paragraph\n'+xml,xml),true));
 await test('normal inline prose after metadata still rejected',()=>A.equal(R.isStandalone(warning('fixture')+'paragraph '+xml,xml),false));
 await test('warning after visible prose is not promoted to prefix',()=>A.equal(R.isStandalone('paragraph\n'+warning('fixture')+xml,xml),false));
 await test('balanced non-warning status with real line boundary remains ordinary content',()=>A.equal(R.isStandalone('<status type="info">fixture</status>\n'+xml,xml),true));
 await test('complete warning with only an embedded example is not visible output',()=>A.equal(R.isStandalone(warning('\n'+xml+'\n'),xml),false));
 await test('example in warning does not mask later real block',()=>A.equal(R.isStandalone(warning('\n'+xml+'\n')+think('fixture')+xml,xml),true));
 await test('example in second thought does not mask later real block',()=>A.equal(R.isStandalone(think('first')+warning('fixture')+think('\n'+xml+'\n')+xml,xml),true));
 await test('nested unclosed status later in body remains protected',()=>A.equal(R.isStandalone('paragraph\n<status type="info">\n'+xml,xml),false));
 await test('128 complete controls allowed',()=>A.equal(R.isStandalone(warning('fixture').repeat(128)+xml,xml),true));
 await test('129 controls fail open at work limit',()=>A.equal(R.isStandalone(warning('fixture').repeat(129)+xml,xml),false));
 const retry=think('first')+warning('fixture')+think('<html> <choices>\n```xml');
 const settings=M.defaults();for(const rule of settings.rules)rule.cardIds=['fixture-card'];
 for(const [tag,body,mode] of [['build','fixture','collapse'],['choices','action result','choices'],['updatevariable','<JSONPatch>\n[]\n</JSONPatch>','hide']]){
  const current=block(tag,body);
  await test('retry owner and decision '+tag,()=>withRows([row(retry+current)],async()=>{const who=await R.owner(current);A.equal(who.cardId,'fixture-card');A.equal(M.decide(current,tag,settings,who.cardId).mode,mode);}));
  await test('retry duplicate cross-chat stays unknown '+tag,()=>withRows([row(retry+current),row(current,'other-chat')],async()=>{const who=await R.owner(current);A.equal(who.cardId,'');A.equal(M.decide(current,tag,settings,who.cardId).mode,'fallback');}));
 }
 for(const [name,rows] of [
  ['same-chat main and variant',[row(retry+xml),row(xml)]],
  ['warning between thoughts',[row(think('a')+warning('fixture')+think('b')+xml)]],
 ])await test(name,()=>withRows(rows,async()=>A.equal((await R.owner(xml)).cardId,'fixture-card')));
 for(const [name,rows] of [
  ['cross-variant ambiguity',[row(xml),row(retry+xml,'variant-chat')]],
  ['group rejection',[row(retry+xml,'fixture-chat','ai','fixture-group')]],
  ['non-AI rejection',[row(retry+xml,'fixture-chat','user')]],
  ['query cap',Array.from({length:20},()=>row(retry+xml))],
 ])await test(name,()=>withRows(rows,async()=>A.equal((await R.owner(xml)).cardId,'')));
 await test('complete warning opener with unfinished body never authorizes inner XML',()=>{const open='<status type="warning">fixture';for(let n=open.indexOf('>')+1;n<=open.length;n++)A.equal(R.isStandalone(open.slice(0,n)+'\n'+xml,xml),false);});
 await test('unfinished second thought keeps fallback',()=>{const raw=think('a')+warning('fixture')+'<think>\n'+xml;A.equal(R.isStandalone(raw,xml),false);});
 await test('every incomplete final build keeps fallback',()=>{for(let n=0;n<xml.length;n++)A.notEqual(M.decide(xml.slice(0,n),'build',settings,'fixture-card').mode,'collapse');});
 await test('raw source and warning preserved without writes',()=>withRows([row(retry+xml)],async reads=>{const who=await R.owner(xml);A.ok(who.cardId);A.equal(reads(),1);A.ok((retry+xml).includes(warning('fixture')));}));
 console.log(JSON.stringify({suite:'v2.3.4-retry-controls',passed,failed,total:passed+failed}));if(failed)process.exitCode=1;
})();