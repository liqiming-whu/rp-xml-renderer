import {parseCommand,DEFAULT_CHARSET} from './random-codes';
import {SCRIPT_LIMITS} from './script-engine';
export type Preset='random'|'time'|'custom'|'daily';
export const PRESETS:Preset[]=['random','time','custom','daily'];
export const PRESET_NAMES:Record<Preset,string>={random:'随机码',time:'时间',custom:'自定义',daily:'每日主题＋微事件'};
export function defaultScripts():Record<Preset,string>{return {
 random:'return randomCodes(3, 20, 40).join("\\n");',
 time:'const t = now();\nreturn t.local + " " + t.offset + " " + t.timeZone;',
 custom:'return "";',
 daily:`// 修改主题、事件与概率即可定制；日期来自所选时区。
const themes = ["留意日常细节", "完成一件小事", "倾听与回应", "整理与取舍", "尝试一点新意", "重访熟悉之物", "休息与陪伴"];
const events = ["出现一个无伤大雅的小插曲", "注意到一件先前忽略的小物件", "获得一次表达感谢的机会", "一个小误会有机会被澄清"];
const eventChance = 0.15; // 每次新请求独立抽取；不是每天最多一次。
const t = now();
// 把当地日历日期映射为日序号，不受当天小时或夏令时长度影响。
const day = Math.floor(Date.parse(t.date + "T00:00:00Z") / 86400000);
const theme = themes[((day % themes.length) + themes.length) % themes.length];
const lines = ["今日主题：" + theme + "。仅作为自然叙事倾向，不必每轮点题。"];
if (Math.random() < eventChance) {
  lines.push("可选微事件：" + events[Math.floor(Math.random() * events.length)] + "。若与当前场景不符则忽略，不要重复强行触发。");
}
lines.push("不推翻已经成立的人物状态与剧情因果，不替用户决定行动。");
return lines.join("\\n");`
};}
export interface InjectionConfig {version:2;revision:number;enabled:boolean;scope:'all'|'selected';cardIds:string[];preset:Preset;scripts:Record<Preset,string>;timeZone:string;}
export const INJECTION_OWNER='com.operit.rp_xml_renderer.script.v2';
export const LEGACY_OWNER='com.operit.rp_xml_renderer.randomCodes.v1';
export const INJECTION_META='rpScriptInjectionV2';
export function problem(code:string,message:string):never {throw Object.assign(new Error(message),{code});}
export function defaultInjectionConfig():InjectionConfig {return {version:2,revision:0,enabled:false,scope:'selected',cardIds:[],preset:'random',scripts:defaultScripts(),timeZone:'device'};}
export function migrateInjectionConfig(raw:any):InjectionConfig {
 // Add only the newly introduced slot. Never overwrite saved scripts or repair corrupt old slots silently.
 if(raw?.version===2&&raw.scripts&&typeof raw.scripts==='object'&&!Array.isArray(raw.scripts)&&!Object.prototype.hasOwnProperty.call(raw.scripts,'daily'))return {...raw,scripts:{...raw.scripts,daily:defaultScripts().daily}};
 if(raw?.version!==1)return raw;
 const command=parseCommand(raw.commandJson);const scripts=defaultScripts();
 const args=[String(command.count),String(command.minLength),String(command.maxLength)];
 if(command.charset!==DEFAULT_CHARSET)args.push(JSON.stringify(command.charset));
 scripts.random='return randomCodes('+args.join(', ')+').join("\\n");';
 return {version:2,revision:raw.revision,enabled:raw.enabled,scope:raw.scope,cardIds:raw.cardIds,preset:'random',scripts,timeZone:'device'};
}
export function validateInjectionConfig(c:InjectionConfig){
 if(!c||c.version!==2||!Number.isInteger(c.revision)||c.revision<0||typeof c.enabled!=='boolean'||!['all','selected'].includes(c.scope)||!Array.isArray(c.cardIds)||c.cardIds.length>256||c.cardIds.some(x=>typeof x!=='string'||!x.trim()))problem('INVALID_PARAMS','动态注入配置结构无效');
 if(!PRESETS.includes(c.preset)||!c.scripts||typeof c.scripts!=='object')problem('INVALID_PARAMS','预设配置无效');
 for(const key of PRESETS)if(typeof c.scripts[key]!=='string'||c.scripts[key].length>SCRIPT_LIMITS.source)problem('INVALID_PARAMS','每套预设须为 JS 字符串，最多 32768 字符');
 if(typeof c.timeZone!=='string'||!c.timeZone.trim()||c.timeZone.length>100)problem('TIMEZONE_INVALID','请填写 device、地区时区 ID 或固定 UTC 偏移');
}
export function isOwnedTurn(t:any){return t?.kind==='SYSTEM'&&[INJECTION_OWNER,LEGACY_OWNER].includes(t?.metadata?.rpDynamicOwner);}
export type ScriptExecutor=(source:string,timeZone:string)=>Promise<string>;
export async function planInjection(event:any,config:InjectionConfig,execute:ScriptExecutor){
 const skip=(reason:string)=>({status:'skipped',reason,mutation:null as any,outputLength:0});
 const p=event?.eventPayload||{};
 if(event?.eventName!=='before_send_to_model')return skip('非正式发送阶段');
 if(!config.enabled)return skip('动态注入未开启');
 if(p.functionType!=='CHAT'||p.metadata?.isSubTask===true)return skip('非主对话请求');
 if(!p.chatId||typeof p.chatId!=='string')return skip('缺少明确会话 ID');
 const active=p.metadata?.activePrompt;
 if(active?.type!=='character_card'||typeof active.id!=='string'||!active.id)return skip('角色归属不确定或为群聊');
 validateInjectionConfig(config);
 if(config.scope==='selected'&&!config.cardIds.includes(active.id))return skip('角色不在生效范围');
 if(!Array.isArray(p.preparedHistory)||p.preparedHistory.some((t:any)=>!t||typeof t.kind!=='string'||typeof t.content!=='string'))problem('ENV_UNSUPPORTED','宿主提示词消息结构不受支持');
 const source=config.scripts[config.preset];
 const signature=JSON.stringify([config.preset,source,config.timeZone]);
 const prior=p.metadata?.[INJECTION_META];
 const reusable=prior&&prior.chatId===p.chatId&&prior.cardId===active.id&&prior.signature===signature&&typeof prior.text==='string'&&prior.text.length<=SCRIPT_LIMITS.output;
 const owned=p.preparedHistory.filter(isOwnedTurn);
 if(reusable&&((prior.text===''&&owned.length===0)||(owned.length===1&&owned[0].metadata.rpDynamicOwner===INJECTION_OWNER&&owned[0].content===prior.text)))return {status:'reused',reason:'复用本次请求的脚本结果',mutation:null,outputLength:prior.text.length};
 const text=reusable?prior.text:await execute(source,config.timeZone);
 if(typeof text!=='string')problem('INVALID_RESULT','JS 必须 return 字符串');
 if(text.length>SCRIPT_LIMITS.output)problem('OUTPUT_LIMIT','返回字符串超过 16384 个 UTF-16 码元');
 const history=p.preparedHistory.filter((t:any)=>!isOwnedTurn(t));
 // Preserve every character. No trimming, escaping, XML, labels, numbering or newline insertion.
 if(text!==''){let at=0;while(at<history.length&&history[at].kind==='SYSTEM')at++;history.splice(at,0,{kind:'SYSTEM',content:text,metadata:{rpDynamicOwner:INJECTION_OWNER}});}
 const marker={chatId:p.chatId,cardId:active.id,signature,text};
 return {status:reusable?'reused':text===''?'empty':'injected',reason:reusable?'复用本次请求的脚本结果':text===''?'脚本返回空字符串，本轮不注入':'已原样注入 JS 返回内容',outputLength:text.length,mutation:{preparedHistory:history,metadata:{...(p.metadata||{}),[INJECTION_META]:marker}}};
}