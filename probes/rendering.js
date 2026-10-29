(function(){let engine=null;try{
 const c=Java.getApplicationContext(),id='com.operit.rp_xml_renderer';
 const pm=Java.type('com.ai.assistance.operit.core.tools.packTool.PackageManager').getInstance(c,Java.type('com.ai.assistance.operit.core.tools.AIToolHandler').getInstance(c));
 const pref=c.getSharedPreferences('toolpkg_rp_xml_renderer_v2',0),before=String(pref.getString('settings',''));
 const details=pm.getToolPkgContainerDetails(id,c);
 engine=new (Java.type('com.ai.assistance.operit.core.tools.javascript.JsEngine'))(c);
 let opts={packageName:id,containerPackageName:id,toolPkgId:id,__operit_ui_package_name:id,__operit_script_screen:'dist/settings.js',__operit_toolpkg_runtime_kind:'ui',executionContextKey:'rp-v21-settings-probe'};
 function flat(n){return [n].concat((n.children||[]).flatMap(flat));}
 function parse(raw){const x=JSON.parse(String(raw));if(!x.tree)throw Error(String(raw));return x;}
 let tree=parse(engine.executeComposeDslScript(pm.readToolPkgTextResource(id,'dist/settings.js',true),opts,{}));
 function action(ref,payload){tree=parse(engine.executeComposeDslAction(ref,payload||null,opts,{},null));}
 function clickText(text){const n=flat(tree.tree).find(n=>n.props&&n.props.text===text);if(!n)throw Error('Missing control '+text);action(n.props.onClick.__actionId);}
 action(tree.tree.props.onLoad.__actionId);
 const count=tree.state.data.cards.length;
 clickText('编辑');
 const entry=flat(tree.tree).find(n=>n.props&&String(n.props.text||'').startsWith('正则替换（'));
 action(entry.props.onClick.__actionId);
 clickText('新增正则替换');clickText('填入捕获组示例');clickText('测试当前编辑规则（不保存）');
 if(tree.state.regexResult.text!=='小叶\n小叶'||tree.state.regexResult.error)throw Error('Regex preview mismatch '+JSON.stringify(tree.state.regexResult));
 clickText('应用到替换列表（尚未保存标签）');
 const chainToggle=flat(tree.tree).find(n=>n.type==='Switch');if(!chainToggle)throw Error('Missing toggle');action(chainToggle.props.onCheckedChange.__actionId,true);
 clickText('测试整条替换链（不保存）');
 const chainPreview=tree.state.regexResult.text;
 clickText('返回标签规则（记得保存此规则）');
 clickText('测试规则与样式（不写入聊天）');
 const tagPreviewMode=tree.state.preview.mode;
 engine.destroy();engine=null;
 engine=new (Java.type('com.ai.assistance.operit.core.tools.javascript.JsEngine'))(c);
 opts={...opts,__operit_script_screen:'dist/v21-probe.ui.js',executionContextKey:'rp-v21-view-probe'};
 const script='exports.default=function(ctx){const m=require("./model.js"),v=require("./view.js");const r=m.defaults().rules[1];r.regexEnabled=true;r.replacements=[{id:"probe",name:"test",enabled:true,pattern:"行动",flags:"g",replacement:"选择"}];const body="行动一 结果一\\n行动二 结果二\\n行动三 结果三\\n行动四 结果四";return v.contentView(ctx,{xml:"<choices>\\n"+body+"\\n</choices>",body:body,mode:"choices",rule:r,chatId:"",preview:true});};';
 tree=parse(engine.executeComposeDslScript(script,opts,{}));
 const firstTree=tree.tree;
 if(!flat(firstTree).some(n=>n.props&&n.props.text==='路线一'))throw Error('Classic layout missing');
 if(!flat(firstTree).some(n=>n.props&&n.props.text==='选择一'))throw Error('Display replacement missing');
 if(flat(firstTree).some(n=>n.props&&n.props.text==='查看原文'))throw Error('Tools visible by default');
 const more=flat(firstTree).find(n=>n.type==='Row'&&(n.children||[]).some(x=>x.props&&x.props.name==='moreHoriz'));
 action(more.props.onClick.__actionId);clickText('查看原文');
 const rawPreserved=flat(tree.tree).some(n=>n.props&&String(n.props.text||'').startsWith('<choices>\n行动一'));
 if(!rawPreserved)throw Error('Raw content modified');
 const after=String(pref.getString('settings',''));if(before!==after)throw Error('Probe unexpectedly persisted settings');
 complete({ok:true,version:details.getVersion(),cardCount:count,regexPreview:chainPreview,tagPreviewMode,classicTitle:flat(firstTree).find(n=>n.props&&n.props.text==='剧情走向 · 四选一')?.props.text,outerColor:firstTree.props.containerColor,rawPreserved,settingsUnchanged:before===after});
 }catch(e){complete({ok:false,error:String(e),stack:e.stack});}finally{if(engine)engine.destroy();}})();