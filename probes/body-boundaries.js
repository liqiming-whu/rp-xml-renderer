// Read-only installed-package probe. Synthetic input only; no chat/config writes.
(function(){let engine=null;try{
 const c=Java.getApplicationContext(),id='com.operit.rp_xml_renderer';
 const pm=Java.type('com.ai.assistance.operit.core.tools.packTool.PackageManager').getInstance(c,Java.type('com.ai.assistance.operit.core.tools.AIToolHandler').getInstance(c));
 const names=['toolpkg_rp_xml_renderer_v2','toolpkg_rp_dynamic_injection_v1'];
 function snapshot(){return JSON.stringify(names.map(name=>{const p=c.getSharedPreferences(name,0);return ['settings','previous','knownTags'].map(key=>[name,key,!!p.contains(key),p.contains(key)?String(p.getString(key,'')):null]);}));}
 const before=snapshot();const details=pm.getToolPkgContainerDetails(id,c);
 engine=new (Java.type('com.ai.assistance.operit.core.tools.javascript.JsEngine'))(c);
 const opts={packageName:id,containerPackageName:id,toolPkgId:id,__operit_ui_package_name:id,__operit_script_screen:'dist/body-boundaries-probe.ui.js',__operit_toolpkg_runtime_kind:'ui',executionContextKey:'rp-v233-body-boundaries'};
 const script='exports.default=function(ctx){const pair=ctx.useState("report",null);return ctx.UI.Column({onLoad:function(){const r=require("./runtime.js"),m=require("./model.js");const xml="<build>\\nfixture body\\n</build>";const cases=[[xml,true],["  "+xml,true],["<think>x</think>"+xml,true],["<thinking>x</thinking>"+xml,true],["<think>\\n"+xml,false],["```xml\\n"+xml+"\\n```",false],["~~~xml\\n"+xml+"\\n~~~",false],["inline "+xml,false]];for(const c of cases)if(r.isStandalone(c[0],xml)!==c[1])throw Error("Boundary mismatch");const settings=m.defaults();settings.rules[0].cardIds=["fixture-card"];const mode=m.decide(xml,"build",settings,"fixture-card").mode;if(mode!=="collapse")throw Error("No-thinking block did not collapse");pair[1]({casesPassed:cases.length,noThinkingSupported:true,closedThinkingSupported:true,protectedContextsRetained:true,previewMode:mode});}},[ctx.UI.Text({text:JSON.stringify(pair[0])})]);};';
 function parse(raw){const value=JSON.parse(String(raw));if(!value.tree)throw Error('Compose probe failed');return value;}
 let tree=parse(engine.executeComposeDslScript(script,opts,{}));
 tree=parse(engine.executeComposeDslAction(tree.tree.props.onLoad.__actionId,null,opts,{},null));
 const report=tree.state&&tree.state.report;if(!report)throw Error('No report returned');
 if(snapshot()!==before)throw Error('Probe changed stored preferences');
 complete({ok:true,version:String(details.getVersion()),...report,preferencesUnchanged:true});
 }catch(e){complete({ok:false,error:String(e),stack:String(e.stack||'')});}finally{if(engine)engine.destroy();}})();