const A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {buildScriptBootstrap}=require('./dist/script-engine');
const dir=path.join(__dirname,'examples');let passed=0;
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort();A.equal(files.length,10);
for(const file of files){
 const source=fs.readFileSync(path.join(dir,file),'utf8');
 for(const draw of [0,0.149999,0.15,0.999999]){
  const c=vm.createContext({NativeInterface:{__call:()=> '0'}},{microtaskMode:'afterEvaluate'});
  vm.runInContext('Math.random=()=>'+draw,c);
  vm.runInContext(buildScriptBootstrap(source,{epochMs:0,iso:'2026-10-29T08:00:00+08:00',local:'2026-10-29 08:00:00',date:'2026-10-29',time:'08:00:00',offset:'+08:00',timeZone:'Asia/Shanghai'},false),c,{timeout:500});
  const out=JSON.parse(vm.runInContext('__rpReadResultV230()',c));A.equal(out.code,'SUCCESS',file);A.equal(typeof out.text,'string');
  if(file==='microevent.js')A.equal(out.text==='',draw>=0.15);
  if(file==='d20.js')A.ok(out.text.includes('D20='+(1+Math.floor(draw*20))));
 }
 console.log('PASS example '+file);passed++;
}
console.log(JSON.stringify({suite:'examples',passed,total:files.length}));