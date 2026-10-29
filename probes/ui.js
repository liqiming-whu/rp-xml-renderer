(function(){let engine=null;try{
 const c=Java.getApplicationContext(),id='com.operit.rp_xml_renderer';
 const pm=Java.type('com.ai.assistance.operit.core.tools.packTool.PackageManager').getInstance(c,Java.type('com.ai.assistance.operit.core.tools.AIToolHandler').getInstance(c));
 const pref=c.getSharedPreferences('toolpkg_rp_dynamic_injection_v1',0);const snapshot=()=>['settings','previous','lastStatus'].map(k=>String(pref.getString(k,''))).join('|');const before=snapshot();
 engine=new (Java.type('com.ai.assistance.operit.core.tools.javascript.JsEngine'))(c);
 const opts={packageName:id,containerPackageName:id,toolPkgId:id,__operit_ui_package_name:id,__operit_script_screen:'dist/settings.js',__operit_toolpkg_runtime_kind:'ui',executionContextKey:'rp-v23-ui-probe'};
 function flat(n){return [n].concat((n.children||[]).flatMap(flat));}
 function parse(raw){const x=JSON.parse(String(raw));if(!x.tree)throw Error(String(raw));return x;}
 let tree=parse(engine.executeComposeDslScript(pm.readToolPkgTextResource(id,'dist/settings.js',true),opts,{}));
 function action(ref,payload){tree=parse(engine.executeComposeDslAction(ref,payload===undefined?null:payload,opts,{},null));}
 function click(text){const n=flat(tree.tree).find(n=>n.props&&n.props.text===text);if(!n)throw Error('Missing '+text);action(n.props.onClick.__actionId);}
 function preset(name){const n=flat(tree.tree).find(n=>n.type==='OutlinedButton'&&n.props.text.replace(/^✓ /,'')===name);if(!n)throw Error('Missing preset '+name);action(n.props.onClick.__actionId);}
 function source(value){const n=flat(tree.tree).find(n=>n.type==='TextField'&&String(n.props.label).endsWith('JS 脚本'));action(n.props.onValueChange.__actionId,value);}
 function result(code){const r=tree.state.dynReportV23;if(!r||r.code!==code)throw Error('Expected '+code+' got '+JSON.stringify(r));return r;}
 action(tree.tree.props.onLoad.__actionId);click('动态 JS 注入 · 四套预设');if(!tree.state.dynDataV23.ready)throw Error('Navigation did not load config without onLoad');
 if(JSON.stringify(tree.tree).includes('不是创建世界书条目，也不会改写历史原文。'))throw Error('Old wording remains');
 const cards=tree.state.dynDataV23.cards.length;const initialConfig=JSON.stringify(tree.state.dynDataV23.config);
 preset('随机码');click('恢复当前预设默认脚本（尚未保存）');click('检查 JS 语法与环境');result('VALID');click('试运行（不保存、不注入）');const random=result('SUCCESS');const lengths=random.text.split('\n').map(x=>Array.from(x).length);if(lengths.length!==3||lengths.some(n=>n<20||n>40))throw Error('Random result wrong');
 preset('时间');click('恢复当前预设默认脚本（尚未保存）');
 if(tree.state.dynDataV23.config.timeZone==='device'){const row=flat(tree.tree).find(n=>n.type==='Row'&&(n.children||[]).some(x=>x.props&&x.props.text==='跟随设备时区'));action(row.children.find(n=>n.type==='Switch').props.onCheckedChange.__actionId,false);}
 let zoneField=flat(tree.tree).find(n=>n.type==='TextField'&&String(n.props.label).startsWith('时区 ID'));action(zoneField.props.onValueChange.__actionId,'UTC');click('试运行（不保存、不注入）');const time=result('SUCCESS');if(time.text!==time.time.local+' '+time.time.offset+' '+time.time.timeZone||time.time.timeZone!=='UTC')throw Error('Time output decorated');
 zoneField=flat(tree.tree).find(n=>n.type==='TextField'&&String(n.props.label).startsWith('时区 ID'));action(zoneField.props.onValueChange.__actionId,'Invalid/Zone');click('检查 JS 语法与环境');result('TIMEZONE_INVALID');zoneField=flat(tree.tree).find(n=>n.type==='TextField'&&String(n.props.label).startsWith('时区 ID'));action(zoneField.props.onValueChange.__actionId,'Asia/Shanghai');
 preset('每日主题＋微事件');click('恢复当前预设默认脚本（尚未保存）');click('试运行（不保存、不注入）');const daily=result('SUCCESS');if(!daily.text.startsWith('今日主题：')||!daily.text.includes('不推翻已经成立'))throw Error('Daily output invalid');
 preset('自定义');const custom='return "  \\nSENTINEL<&>\\n  ";';source(custom);click('试运行（不保存、不注入）');if(result('SUCCESS').text!=='  \nSENTINEL<&>\n  ')throw Error('Raw output changed');
 preset('时间');preset('自定义');if(tree.state.dynDataV23.config.scripts.custom!==custom)throw Error('Preset draft lost');
 source('const = 1;');click('试运行（不保存、不注入）');result('JS_SYNTAX');
 source('return require("fs");');click('试运行（不保存、不注入）');result('ENV_UNSUPPORTED');
 source('while(true){}');click('试运行（不保存、不注入）');const timeout=result('JS_TIMEOUT');
 source('await Promise.resolve(); return "recovered";');click('试运行（不保存、不注入）');if(result('SUCCESS').text!=='recovered')throw Error('Recovery failed');
 click('返回标签配置（未保存修改将丢弃）');click('动态 JS 注入 · 四套预设');if(!tree.state.dynDataV23.ready)throw Error('Reentry did not load');if(JSON.stringify(tree.state.dynDataV23.config)!==initialConfig)throw Error('Reentry did not restore saved config');click('返回标签配置（未保存修改将丢弃）');if(before!==snapshot())throw Error('Probe changed stored preferences');
 complete({ok:true,version:pm.getToolPkgContainerDetails(id,c).getVersion(),cards,randomLengths:lengths,timeOutput:time.text,rawOutputPreserved:true,presetDraftPreserved:true,syntaxError:true,unsupportedApi:true,invalidTimeZone:true,timeoutCode:timeout.code,timeoutMs:timeout.durationMs,recovered:true,preferencesUnchanged:true,oldWordingRemoved:true,navigationWithoutOnLoad:true,reentryWithoutOnLoad:true,dailyPreset:true,dailyOutput:daily.text});
 }catch(e){complete({ok:false,error:String(e),stack:e.stack});}finally{if(engine)engine.destroy();}})();