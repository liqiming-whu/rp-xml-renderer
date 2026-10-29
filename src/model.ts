import {ReplacementRule,validateReplacements} from './replacements';
export type Mode = 'collapse' | 'card' | 'markdown' | 'hide' | 'choices';
export interface Rule {
 id:string; tag:string; title:string; enabled:boolean; mode:Mode;
 scope:'all'|'selected'; cardIds:string[]; validator:'text'|'patch'|'choices';
 expanded:boolean; showLines:boolean; preserveTags:boolean;
 icon:string; color:string; background:string; borderColor:string;
 fontSize:number; radius:number; padding:number;
 layout?:'classic'|'custom'; showTools?:boolean; regexEnabled?:boolean; replacements?:ReplacementRule[];
}
export interface Settings {version:2; revision:number; enabled:boolean; fallback:boolean; stripOuter:boolean; rules:Rule[];}
export const RESERVED = ['think','thinking','search','tool','status','tool_result','html','mood','font','details','detail','meta','plan','plantodo','planask'];
export const LEGACY_TAGS = ['build','choices','updatevariable','analysis','jsonpatch'];
export function classicAppearance(mode:Mode){return {layout:'classic' as const,showTools:false,fontSize:mode==='choices'?13.5:12,radius:10,padding:12,color:mode==='collapse'?'onSurfaceVariant':'onSurface',background:'surfaceVariant',borderColor:'outlineVariant',icon:mode==='choices'?'altRoute':mode==='collapse'?'psychology':'description',showLines:mode!=='choices'};}
export function freshRule(tag='notes'):Rule {return {id:'r-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),tag,title:'内容',enabled:true,mode:'collapse',scope:'selected',cardIds:[],validator:'text',expanded:false,preserveTags:false,...classicAppearance('collapse'),regexEnabled:false,replacements:[]};}
// Migrate only untouched v2 preset appearance. Role bindings and custom styling are retained.
export function normalizeRule(r:Rule):Rule {
 if(r.layout===undefined){
  const untouched=['preset-build','preset-choices'].includes(r.id)&&r.fontSize===13&&r.radius===10&&r.padding===12&&r.color==='onSurface'&&r.background==='surfaceVariant'&&r.borderColor==='outlineVariant'&&r.icon===(r.id==='preset-build'?'description':'altRoute')&&r.showLines===true;
  if(untouched)Object.assign(r,classicAppearance(r.mode));else r.layout='custom';
 }
 if(r.showTools===undefined)r.showTools=false;
 if(r.regexEnabled===undefined)r.regexEnabled=false;
 if(r.replacements===undefined)r.replacements=[];
 return r;
}
export function defaults():Settings {
 return {version:2,revision:0,enabled:true,fallback:true,stripOuter:false,rules:[
 {...freshRule('build'),id:'preset-build',title:'剧情构建过程',cardIds:[]},
 {...freshRule('choices'),...classicAppearance('choices'),id:'preset-choices',title:'剧情走向',mode:'choices',validator:'choices',cardIds:[]},
 {...freshRule('updatevariable'),id:'preset-variables',title:'变量更新',mode:'hide',validator:'patch',cardIds:[]}
 ]};
}
export function validateSettings(s:Settings):void {
 if(s.version!==2 || !Array.isArray(s.rules) || s.rules.length>64) throw Error('配置版本错误或规则超过64条');
 const tags=new Set<string>(); const ids=new Set<string>();
 for(const r of s.rules){
  normalizeRule(r);
  if(!['classic','custom'].includes(r.layout!)||typeof r.showTools!=='boolean'||typeof r.regexEnabled!=='boolean')throw Error('外观或正则开关无效');
  validateReplacements(r.replacements!);
  r.tag=String(r.tag).trim().toLowerCase();
  if(!/^[a-z][a-z0-9_]*$/.test(r.tag)) throw Error('标签名仅支持英文字母开头，后接字母、数字、下划线');
  if(RESERVED.includes(r.tag)) throw Error('宿主/已知插件保留标签不可接管：'+r.tag);
  if(tags.has(r.tag)||ids.has(r.id)) throw Error('标签名或规则ID重复：'+r.tag);
  tags.add(r.tag);ids.add(r.id);
  if(!['collapse','card','markdown','hide','choices'].includes(r.mode)) throw Error('未知处理方式');
  if(!['all','selected'].includes(r.scope)||!Array.isArray(r.cardIds)) throw Error('角色范围无效');
  if(!['text','patch','choices'].includes(r.validator)) throw Error('校验方式无效');
  for(const [key,min,max] of [['fontSize',10,24],['radius',0,32],['padding',0,32]] as const){if(!Number.isFinite(r[key])||r[key]<min||r[key]>max)throw Error(key+' 超出范围');}
  for(const c of [r.color,r.background,r.borderColor])if(!/^(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{8}|primary|onPrimary|primaryContainer|onPrimaryContainer|secondaryContainer|onSecondaryContainer|surface|surfaceVariant|onSurface|onSurfaceVariant|outline|outlineVariant|errorContainer|onErrorContainer)$/.test(c))throw Error('颜色请填写主题色名或 #RRGGBB');
  if(!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(r.icon))throw Error('图标名称无效');
 }
}
export function parseBlock(xml:string,tag:string){
 const open=new RegExp('^\\s*<'+tag+'(?:\\s[^<>]*)?>','i').exec(xml);
 if(!open)return {body:xml,closed:false,block:false};
 const rest=xml.slice(open[0].length);
 const close=new RegExp('</'+tag+'\\s*>\\s*$','i').exec(rest);
 const body=close?rest.slice(0,close.index):rest;
 const block=/^\s*\n/.test(rest) && (!close || /\n\s*$/.test(body));
 return {body:body.trim(),closed:!!close,block};
}
export function validBody(body:string,r:Rule):boolean {
 if(!body.trim())return false;
 if(r.validator==='patch'){
  const m=/^\s*(?:<Analysis>[\s\S]*?<\/Analysis>\s*)?<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>\s*$/i.exec(body);
  if(!m)return false;
  try {const x=JSON.parse(m[1].replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));return Array.isArray(x)&&x.every(o=>o&&typeof o==='object'&&['replace','delta','insert','remove','move'].includes(o.op)&&typeof (o.path||o.to)==='string');}catch{return false;}
 }
 if(r.mode==='choices'||r.validator==='choices'){
  const lines=body.split(/\r?\n/).filter(x=>x.trim());
  return lines.length>0&&lines.length<=12&&lines.every(x=>x.length<=300&&!/[<>`]/.test(x)&&!/^\s*#/.test(x));
 }
 return true;
}
export function decide(xml:string,tag:string,s:Settings,cardId:string){
 const r=s.rules.find(x=>x.tag===tag.toLowerCase()&&x.enabled);
 const p=parseBlock(xml,tag);
 if(!s.enabled)return {mode:'host',reason:'插件处理已关闭',body:xml,rule:r};
 if(r && (r.scope==='all'||(cardId&&r.cardIds.includes(cardId))) && p.block && p.closed && validBody(p.body,r))return {mode:r.mode,reason:'规则命中：'+r.title,body:p.body,rule:r};
 const reason=!r?'未匹配规则':(!cardId&&r.scope==='selected')?'消息归属不确定':!p.closed?'标签尚未完整闭合':!p.block?'非独立标签块':r.scope==='selected'&&!r.cardIds.includes(cardId)?'角色不在规则范围':'结构校验未通过';
 return {mode:s.fallback?'fallback':'host',reason,body:s.stripOuter&&p.closed&&p.block?p.body:xml,rule:r};
}
