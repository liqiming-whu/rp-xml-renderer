import {commandFailure} from './random-codes';
import {InjectionConfig,defaultInjectionConfig,migrateInjectionConfig,validateInjectionConfig,planInjection,problem} from './injection-model';
import {buildScriptBootstrap,SCRIPT_LIMITS,ScriptResult,TimeSnapshot} from './script-engine';
declare const Java:any;declare const ToolPkg:any;
export const INJECTION_PREF='toolpkg_rp_dynamic_injection_v1';
const RUNNER='com.operit.rpxml.sandbox.ScriptRunnerV230';
let runnerPromise:Promise<any>|null=null;
function prefs(){if(typeof Java==='undefined')problem('ENV_UNSUPPORTED','当前环境没有 Android Java 桥接');return Java.getApplicationContext().getSharedPreferences(INJECTION_PREF,0);}
export function loadInjectionConfig():InjectionConfig {
 const raw=String(prefs().getString('settings',''));if(!raw)return defaultInjectionConfig();
 let c;try{c=JSON.parse(raw);}catch(e){problem('INVALID_PARAMS','已保存的动态注入配置损坏：'+String(e));}
 c=migrateInjectionConfig(c);validateInjectionConfig(c);return c;
}
export function timeSnapshot(timeZone:string,epochMs=Date.now()):TimeSnapshot {
 if(typeof Java==='undefined')problem('ENV_UNSUPPORTED','当前环境没有时区接口');
 let ZoneId:any,Instant:any,Zoned:any,Formatter:any;
 try{ZoneId=Java.type('java.time.ZoneId');Instant=Java.type('java.time.Instant');Zoned=Java.type('java.time.ZonedDateTime');Formatter=Java.type('java.time.format.DateTimeFormatter');if(!ZoneId.exists()||!Instant.exists())throw Error('java.time unavailable');}catch(e){problem('ENV_UNSUPPORTED','当前环境不支持 java.time：'+String(e));}
 let zone:any;try{const value=String(timeZone).trim();zone=value==='device'?ZoneId.systemDefault():ZoneId.of(value);}catch(e){problem('TIMEZONE_INVALID','无效时区 '+timeZone+'：'+String(e));}
 const z=Zoned.ofInstant(Instant.ofEpochMilli(epochMs),zone);
 const format=(pattern:string)=>String(z.format(Formatter.ofPattern(pattern)));
 return {epochMs,iso:String(z.format(Formatter.ISO_OFFSET_DATE_TIME)),local:format('yyyy-MM-dd HH:mm:ss'),date:format('yyyy-MM-dd'),time:format('HH:mm:ss'),offset:String(z.getOffset().getId()),timeZone:String(zone.getId())};
}
async function loadRunner(){
 if(runnerPromise)return runnerPromise;
 runnerPromise=(async()=>{
  if(typeof Java==='undefined'||typeof Java.loadDex!=='function'||typeof ToolPkg==='undefined'||typeof ToolPkg.readResource!=='function')problem('ENV_UNSUPPORTED','当前环境不支持独立 JS 执行器资源加载');
  const file=await ToolPkg.readResource('rp_js_runner_v230','rp-js-runner-v230.dex',true);
  Java.loadDex(String(file));const runner=Java.type(RUNNER);
  if(!runner.exists())problem('ENV_UNSUPPORTED','独立 JS 执行器加载失败');
  return runner;
 })();
 try{return await runnerPromise;}catch(e){runnerPromise=null;problem('ENV_UNSUPPORTED','无法加载独立 JS 执行器：'+String((e as any)?.message||e));}
}
export async function tryInjectionScript(source:string,timeZone:string,execute:boolean):Promise<ScriptResult> {
 const started=Date.now();
 try{
  if(typeof source!=='string'||source.length>SCRIPT_LIMITS.source)problem('INVALID_PARAMS','JS 源码不能超过 32768 字符');
  if(typeof ToolPkg==='undefined'||typeof ToolPkg.registerPromptFinalizeHook!=='function')problem('ENV_UNSUPPORTED','当前环境缺少提示词注入注册 API');
  const time=timeSnapshot(timeZone);
  const runner=await loadRunner();
  const raw=String(runner.run(buildScriptBootstrap(source,time,!execute),SCRIPT_LIMITS.timeoutMs));
  let result:ScriptResult;try{result=JSON.parse(raw);}catch(e){problem('EXECUTION_FAILED','执行器返回格式无效');}
  if(typeof result!.ok!=='boolean'||typeof result!.code!=='string')problem('EXECUTION_FAILED','执行器返回字段无效');
  if(execute&&result!.ok&&typeof result!.text!=='string')problem('INVALID_RESULT','JS 必须 return 字符串');
  return {...result!,durationMs:Date.now()-started,time};
 }catch(e){return {ok:false,...commandFailure(e),durationMs:Date.now()-started};}
}
export async function saveInjectionConfig(next:InjectionConfig){
 const c=JSON.parse(JSON.stringify(next));validateInjectionConfig(c);c.timeZone=c.timeZone.trim();timeSnapshot(c.timeZone);
 const old=loadInjectionConfig();if(c.revision!==old.revision)problem('CONFIG_CONFLICT','配置已被其他页面更新，请重新读取后再保存');
 if(c.enabled){const check=await tryInjectionScript(c.scripts[c.preset],c.timeZone,false);if(!check.ok)problem(check.code,check.message||'脚本检查失败');}
 if(loadInjectionConfig().revision!==c.revision)problem('CONFIG_CONFLICT','检查期间配置已被更新，请重新读取');
 const previous=String(prefs().getString('settings',''))||JSON.stringify(old);
 c.cardIds=Array.from(new Set(c.cardIds));c.revision++;
 if(!prefs().edit().putString('previous',previous).putString('settings',JSON.stringify(c)).commit())problem('EXECUTION_FAILED','动态注入配置保存失败');
 return c as InjectionConfig;
}
export function readInjectionStatus(){const raw=String(prefs().getString('lastStatus',''));if(!raw)return null;try{return JSON.parse(raw);}catch{return null;}}
function recordStatus(report:any){try{prefs().edit().putString('lastStatus',JSON.stringify({at:Date.now(),...report})).apply();}catch(e){console.log('RP dynamic status failed: '+String(e));}}
export async function onDynamicPromptFinalize(event:any){
 if(event?.eventName!=='before_send_to_model')return null;
 try{
  const config=loadInjectionConfig();if(!config.enabled)return null;
  const result=await planInjection(event,config,async(source,zone)=>{
   const report=await tryInjectionScript(source,zone,true);if(!report.ok)problem(report.code,report.message||'JS 执行失败');return report.text!;
  });
  recordStatus({status:result.status,code:result.status==='skipped'?'SKIPPED':'OK',message:result.reason,outputLength:result.outputLength,preset:config.preset});
  return result.mutation;
 }catch(e){const failure=commandFailure(e);recordStatus({status:'error',...failure});console.log('RP dynamic injection skipped ['+failure.code+']: '+failure.message);return null;}
}