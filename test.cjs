const assert=require('node:assert/strict');
const M=require('./dist/model.js');const V=require('./dist/view.js');const R=require('./dist/runtime.js');
let passed=0;function t(name,fn){fn();passed++;console.log('PASS '+name);}
const settings=M.defaults(), card='fixture-card';
for(const rule of settings.rules)rule.cardIds=[card];
const block=(tag,body)=>`<${tag}>\n${body}\n</${tag}>`;
t('build preset matches selected card',()=>assert.equal(M.decide(block('build','内容'),'build',settings,card).mode,'collapse'));
t('other card falls back',()=>assert.equal(M.decide(block('build','内容'),'build',settings,'eve').mode,'fallback'));
t('unknown ownership preserves content',()=>assert.equal(M.decide(block('updatevariable','<JSONPatch>\n[]\n</JSONPatch>'),'updatevariable',settings,'').mode,'fallback'));
t('valid patch hides',()=>assert.equal(M.decide(block('updatevariable','<JSONPatch>\n[]\n</JSONPatch>'),'updatevariable',settings,card).mode,'hide'));
t('invalid JSON does not hide',()=>assert.equal(M.decide(block('updatevariable','<JSONPatch>INVALID</JSONPatch>'),'updatevariable',settings,card).mode,'fallback'));
t('technical mention preserves tail',()=>{const s='<UpdateVariable> 是标签\n## 下半段\n必须保留';assert.equal(M.decide(s,'updatevariable',settings,card).body,s);});
t('every unclosed prefix preserves content',()=>{const x=block('updatevariable','<JSONPatch>\n[]\n</JSONPatch>');for(let i=0;i<x.length;i++)assert.notEqual(M.decide(x.slice(0,i),'updatevariable',settings,card).mode,'hide');});
t('fallback disabled delegates to host',()=>assert.equal(M.decide('<build>说明','build',{...settings,fallback:false},card).mode,'host'));
t('master disabled delegates',()=>assert.equal(M.decide(block('build','x'),'build',{...settings,enabled:false},card).mode,'host'));
t('custom tag mode and all cards',()=>{const s={...settings,rules:[{...M.freshRule('notes'),scope:'all',mode:'card'}]};assert.equal(M.decide(block('notes','**内容**'),'notes',s,'eve').mode,'card');});
t('empty selection means none',()=>{const s={...settings,rules:[M.freshRule('notes')]};assert.equal(M.decide(block('notes','x'),'notes',s,card).mode,'fallback');});
t('reserved tags rejected',()=>assert.throws(()=>M.validateSettings({...settings,rules:[M.freshRule('html')]})));
t('duplicates rejected',()=>assert.throws(()=>M.validateSettings({...settings,rules:[M.freshRule('notes'),M.freshRule('notes')]})));
t('bad color rejected',()=>assert.throws(()=>M.validateSettings({...settings,rules:[{...M.freshRule('notes'),color:'notAColor'}]})));
t('inline block excluded for ownership',()=>assert.equal(R.isStandalone('示例 '+block('build','x'),block('build','x')),false));
t('fenced sample excluded for ownership',()=>assert.equal(R.isStandalone('```xml\n'+block('build','x')+'\n```',block('build','x')),false));
function context(seed={}){const state={...seed};return {state,useState:(k,v)=>[k in state?state[k]:(state[k]=v),n=>state[k]=n],UI:new Proxy({},{get:(_,type)=>(props={},children=[])=>({type,props,children})})};}
function walk(n,fn){fn(n);for(const c of n.children||[])walk(c,fn);}
t('safe Markdown never receives angle brackets',()=>{const ctx=context();const text='<UpdateVariable>\n## title\ntext\n<JSONPatch>\n[]\nend';const tree={children:V.safeNodes(ctx,text)};walk(tree,n=>{if(n.type==='Markdown')assert.ok(!n.props.text.includes('<'));});assert.ok(JSON.stringify(tree).includes('end'));});
t('collapse toggles',()=>{const ctx=context();const args={xml:block('build','正文'),body:'正文',mode:'collapse',rule:settings.rules[0],chatId:''};let tree=V.contentView(ctx,args);assert.ok(!JSON.stringify(tree).includes('"text":"正文"'));tree.children[0].children[0].props.onClick();tree=V.contentView(ctx,args);assert.ok(JSON.stringify(tree).includes('"text":"正文"'));});
t('hidden returns zero Spacer',()=>{const ctx=context();const tree=V.contentView(ctx,{xml:'',body:'secret',mode:'hide',rule:settings.rules[2],chatId:'id'});assert.equal(tree.type,'Spacer');assert.equal(tree.props.height,0);assert.ok(!JSON.stringify(tree).includes('secret'));});
t('choices preserve full line',()=>{const ctx=context();const tree=V.contentView(ctx,{xml:'',body:'行动 结果\n另一行动 另一结果',mode:'choices',rule:settings.rules[1],chatId:''});let count=0;walk(tree,n=>{if(n.type==='Card'&&String(n.props.key||'').startsWith('choice-')){assert.equal(typeof n.children[0].props.onClick,'function');count++;}});assert.equal(count,2);});
console.log(JSON.stringify({passed,total:passed}));
