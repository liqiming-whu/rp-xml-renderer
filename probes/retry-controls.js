// Installed-package synthetic regression. Never writes preferences or chat history.
(function(){let engine=null;try{
 const c=Java.getApplicationContext(),id='com.operit.rp_xml_renderer';
 const pm=Java.type('com.ai.assistance.operit.core.tools.packTool.PackageManager').getInstance(c,Java.type('com.ai.assistance.operit.core.tools.AIToolHandler').getInstance(c));
 function snapshot(){return JSON.stringify(['toolpkg_rp_xml_renderer_v2','toolpkg_rp_dynamic_injection_v1'].map(name=>{const p=c.getSharedPreferences(name,0);return ['settings','previous','knownTags'].map(key=>[key,!!p.contains(key),p.contains(key)?String(p.getString(key,'')):null]);}));}
 const before=snapshot();
 const entry=function(ctx){const pair=ctx.useState('report',null);return ctx.UI.Column({onLoad:function(){
  const r=require('./runtime.js'),m=require('./model.js');
  const xml='<build>\nfixture body\n</build>',t=x=>'<think>'+x+'</think>',w=x=>'<status type="warning">'+x+'</status>';
  const cases=[
   [t('a')+w('fixture')+t('b')+xml,true],
   [t('a')+w('fixture')+xml,true],
   [w('fixture')+xml,true],
   [t('a')+w('one')+t('b')+w('two')+t('c')+xml,true],
   [t('a')+w('fixture')+t('<html> <choices>\n```fixture')+xml,true],
   [xml,true],['  '+xml,true],
   ['<status type="warning">\n'+xml,false],
   [t('a')+w('fixture')+'<think>\n'+xml,false],
   ['```xml\n'+w('fixture')+'\n'+xml,false],
   ['inline '+w('fixture')+xml,false],
   ['<status data-type="warning">fixture</status>'+xml,false],
  ];
  for(let i=0;i<cases.length;i++)if(r.isStandalone(cases[i][0],xml)!==cases[i][1])throw Error('Retry boundary case '+i+' failed');
  const settings=m.defaults();for(const rule of settings.rules)rule.cardIds=['fixture-card'];
  const modes=[['build','fixture body','collapse'],['choices','action result','choices'],['updatevariable','<JSONPatch>\n[]\n</JSONPatch>','hide']].map(([tag,body,expected])=>{const mode=m.decide('<'+tag+'>\n'+body+'\n</'+tag+'>',tag,settings,'fixture-card').mode;if(mode!==expected)throw Error('Mode mismatch');return {tag,mode};});
  pair[1]({casesPassed:cases.length,modes,noThinkingSupported:true,warningRetrySupported:true,protectedContextsRetained:true});
 }},[ctx.UI.Text({text:JSON.stringify(pair[0])})]);};
 engine=new (Java.type('com.ai.assistance.operit.core.tools.javascript.JsEngine'))(c);
 const opts={packageName:id,containerPackageName:id,toolPkgId:id,__operit_ui_package_name:id,__operit_script_screen:'dist/retry-controls-probe.ui.js',__operit_toolpkg_runtime_kind:'ui',executionContextKey:'rp-v234-retry-controls'};
 function parse(raw){const v=JSON.parse(String(raw));if(!v.tree)throw Error('Compose retry probe failed: '+String(raw));return v;}
 let tree=parse(engine.executeComposeDslScript('exports.default='+entry.toString()+';',opts,{}));
 tree=parse(engine.executeComposeDslAction(tree.tree.props.onLoad.__actionId,null,opts,{},null));
 if(!tree.state||!tree.state.report)throw Error('No retry report');
 if(snapshot()!==before)throw Error('Preferences changed during probe');
 complete({ok:true,version:String(pm.getToolPkgContainerDetails(id,c).getVersion()),...tree.state.report,preferencesUnchanged:true});
 }catch(e){complete({ok:false,error:String(e),stack:String(e.stack||'')});}finally{if(engine)engine.destroy();}})();