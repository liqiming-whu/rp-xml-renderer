const A=require('node:assert/strict'),vm=require('node:vm');
const M=require('./dist/injection-model'),E=require('./dist/script-engine'),R=require('./dist/injection-runtime'),RT=require('./dist/runtime');
const Screen=require('./dist/settings').default;
const tests=[];const t=(name,fn)=>tests.push([name,fn]);
const snapshot={epochMs:0,iso:'2026-10-29T12:00:00+08:00',local:'2026-10-29 12:00:00',date:'2026-10-29',time:'12:00:00',offset:'+08:00',timeZone:'Asia/Shanghai'};
function daily(date='2026-10-29',draw=0.9,extra={}){
 const c=vm.createContext({NativeInterface:{__call:()=> '0'}},{microtaskMode:'afterEvaluate'});
 vm.runInContext('Math.random=()=>'+draw,c);
 vm.runInContext(E.buildScriptBootstrap(M.defaultScripts().daily,{...snapshot,...extra,date},false),c,{timeout:500});
 const out=JSON.parse(vm.runInContext('__rpReadResultV230()',c));A.equal(out.code,'SUCCESS');return out.text;
}
t('four preset slots validate',()=>{A.equal(M.PRESETS.length,4);M.validateInjectionConfig(M.defaultInjectionConfig());});
t('v230 migration keeps scripts revision scope timezone and selection',()=>{const old={...M.defaultInjectionConfig(),revision:12,enabled:true,scope:'all',cardIds:['sentinel'],timeZone:'UTC',preset:'custom',scripts:{random:'return "r";',time:'return "t";',custom:'return "c";'}};const before=JSON.stringify(old),n=M.migrateInjectionConfig(old);M.validateInjectionConfig(n);A.equal(JSON.stringify(old),before);A.deepEqual({...n,scripts:old.scripts},old);A.equal(n.scripts.daily,M.defaultScripts().daily);});
t('migrated v230 is idempotent',()=>{const c=M.defaultInjectionConfig();delete c.scripts.daily;const n=M.migrateInjectionConfig(c);A.equal(M.migrateInjectionConfig(n),n);});
t('saved daily draft never overwritten',()=>{const c=M.defaultInjectionConfig();c.scripts.daily='return "mine";';A.equal(M.migrateInjectionConfig(c).scripts.daily,c.scripts.daily);});
t('empty daily script is preserved',()=>{const c=M.defaultInjectionConfig();c.scripts.daily='';A.equal(M.migrateInjectionConfig(c).scripts.daily,'');});
t('corrupt daily is rejected not repaired',()=>{const c=M.defaultInjectionConfig();c.scripts.daily=null;A.throws(()=>M.validateInjectionConfig(M.migrateInjectionConfig(c)));});
t('missing old slots are rejected',()=>{const c=M.defaultInjectionConfig();delete c.scripts.daily;delete c.scripts.time;A.throws(()=>M.validateInjectionConfig(M.migrateInjectionConfig(c)));});
t('v1 migration includes fourth preset',()=>{const c=M.migrateInjectionConfig({version:1,revision:3,enabled:false,scope:'selected',cardIds:[],commandJson:JSON.stringify({command:'randomCodes',count:3,minLength:20,maxLength:40})});M.validateInjectionConfig(c);A.equal(c.scripts.daily,M.defaultScripts().daily);});
t('daily output has real line breaks and no wrapper',()=>{const s=daily();A.equal(s.split('\n').length,2);A.ok(s.startsWith('今日主题：'));A.ok(!s.includes('\\n'));A.ok(s.endsWith('不替用户决定行动。'));});
t('same calendar day ignores hour and epoch changes',()=>A.equal(daily(),daily('2026-10-29',0.9,{time:'23:59:59',epochMs:12345678})));
t('adjacent days rotate theme',()=>A.notEqual(daily('2026-10-29').split('\n')[0],daily('2026-10-30').split('\n')[0]));
t('weekly theme cycle is stable',()=>A.equal(daily('2026-10-29'),daily('2026-11-05')));
t('timezone-selected calendar date is used',()=>A.notEqual(daily('2026-10-29',0.9,{timeZone:'Asia/Shanghai'}),daily('2026-10-28',0.9,{timeZone:'America/New_York'})));
t('event occurs at zero and below probability boundary',()=>{for(const n of [0,0.149999])A.ok(daily('2026-10-29',n).includes('可选微事件：'));});
t('event absent at or above probability boundary',()=>{for(const n of [0.15,0.999999])A.ok(!daily('2026-10-29',n).includes('可选微事件：'));});
t('calendar year leap and pre-epoch dates produce valid theme',()=>{for(const date of ['2024-02-29','2026-12-31','2027-01-01','1969-12-31'])A.ok(!daily(date).includes('undefined'));});
function harness(fail=false){
 let saved=M.defaultInjectionConfig();const state={};let tree;
 R.loadInjectionConfig=()=>{if(fail)throw Object.assign(new Error('fixture failure'),{code:'INVALID_PARAMS'});return JSON.parse(JSON.stringify(saved));};
 R.readInjectionStatus=()=>null;RT.load=()=>require('./dist/model').defaults();RT.cards=async()=>[{id:'card-test',name:'Test'}];
 const ctx={useState:(k,v)=>{if(!(k in state))state[k]=v;return [state[k],x=>{state[k]=x;}];},UI:new Proxy({},{get:(_,type)=>(props,children=[])=>({type,props,children})})};
 const render=()=>{tree=Screen(ctx);};const flat=n=>[n,...n.children.flatMap(flat)];
 const click=async(text)=>{const n=flat(tree).find(x=>x.props.text===text);A.ok(n,'Missing '+text);await n.props.onClick();render();};
 render();return {state,click,render,flat:()=>flat(tree),load:async()=>{await tree.props.onLoad();render();},recover:()=>{fail=false;},save:c=>{saved=c;}};
}
t('navigation loads without second onLoad or reread',async()=>{const h=harness();await h.load();await h.click('动态 JS 注入 · 四套预设');A.equal(h.state.dynDataV23.ready,true);A.equal(h.state.dynDataV23.cards[0].id,'card-test');A.ok(!h.flat().some(n=>n.props.text==='正在读取配置…'));});
t('daily preset reachable and independent',async()=>{const h=harness();await h.load();await h.click('动态 JS 注入 · 四套预设');await h.click('每日主题＋微事件');A.equal(h.state.dynDataV23.config.preset,'daily');A.equal(h.state.dynDataV23.config.scripts.custom,'return "";');});
t('back and reentry reload persisted config not unsaved draft',async()=>{const h=harness();await h.load();await h.click('动态 JS 注入 · 四套预设');await h.click('每日主题＋微事件');await h.click('返回标签配置（未保存修改将丢弃）');await h.click('动态 JS 注入 · 四套预设');A.equal(h.state.dynDataV23.ready,true);A.equal(h.state.dynDataV23.config.preset,'random');});
t('read error is visible and manual retry recovers',async()=>{const h=harness(true);await h.load();await h.click('动态 JS 注入 · 四套预设');A.equal(h.state.dynDataV23.ready,false);A.ok(h.state.dynStatusV23.includes('fixture failure'));A.ok(!h.flat().some(n=>n.props.text==='正在读取配置…'));h.recover();await h.click('重新读取');A.equal(h.state.dynDataV23.ready,true);});
t('navigation reads latest persisted revision each entry',async()=>{const h=harness();await h.load();await h.click('动态 JS 注入 · 四套预设');await h.click('返回标签配置（未保存修改将丢弃）');h.save({...M.defaultInjectionConfig(),revision:9,preset:'daily'});await h.click('动态 JS 注入 · 四套预设');A.equal(h.state.dynDataV23.config.revision,9);A.equal(h.state.dynDataV23.config.preset,'daily');});
(async()=>{let passed=0;for(const [name,fn] of tests){try{await fn();console.log('PASS '+name);passed++;}catch(e){console.error('FAIL '+name,e);process.exitCode=1;}}console.log(JSON.stringify({passed,total:tests.length}));})();