import Screen from './view';
import SettingsScreen from './settings';
import {onDynamicPromptFinalize} from './injection-runtime';
import {load,registeredTags,owner} from './runtime';
import {decide,parseBlock} from './model';
declare const ToolPkg:any;
const views:Record<string,{chatId:string;runtime:string}>={};
ToolPkg.ipc.on('rp_renderer_target', (chatId:string)=>{
 const candidates=Object.values(views).filter(x=>x.chatId===chatId);
 const slots=Array.from(new Set(candidates.map(x=>x.runtime)));
 return slots.length===1?slots[0]:'';
});
export function onChatView(event:any){const p=event.eventPayload||{};if(!p.viewId)return;
 if(event.eventName==='view_closed'){delete views[p.viewId];return;}
 if(['main','floating'].includes(p.runtime)&&p.chatId)views[p.viewId]={chatId:p.chatId,runtime:p.runtime};
}
export async function onXml(event:any){
 const p=event.eventPayload||{};const tag=String(p.tagName||'').toLowerCase();const xml=String(p.xmlContent||'');
 try{
  const s=load();if(!s.enabled)return {handled:false};
  const rule=s.rules.find(r=>r.tag===tag&&r.enabled);
  // Do not query storage for unclosed streams or for plain fallback-only tags.
  const who=rule&&parseBlock(xml,tag).closed?await owner(xml):{chatId:'',cardId:''};
  let d=decide(xml,tag,s,who.cardId);
  if(d.mode==='hide'&&!who.chatId)d={...d,mode:'fallback',body:xml,reason:'无法确认归属，不隐藏'};
  if(d.mode==='host')return {handled:false};
  return {handled:true,composeDsl:{screen:Screen,state:{xmlContent:xml,body:d.body,mode:d.mode,rule:d.rule||null,chatId:who.chatId,reason:d.reason},memo:{}}};
 }catch(e){console.log('RP renderer fail-open: '+String(e));return {handled:true,composeDsl:{screen:Screen,state:{xmlContent:xml,body:xml,mode:'fallback',rule:null,chatId:''},memo:{}}};}
}
export function onDynamicInjection(event:any){return onDynamicPromptFinalize(event);}
export function registerToolPkg(){
 if(typeof ToolPkg.registerPromptFinalizeHook==='function')ToolPkg.registerPromptFinalizeHook({id:'rp_random_codes_injection',function:onDynamicInjection});
 else console.log('RP dynamic injection ENV_UNSUPPORTED: prompt finalize registration unavailable');
 ToolPkg.registerToolboxUiModule({id:'rp_renderer_settings',runtime:'compose_dsl',screen:SettingsScreen,title:'标签渲染配置'});
 ToolPkg.registerChatViewHook({id:'rp_renderer_view_tracking',function:onChatView});
 for(const tag of registeredTags())ToolPkg.registerXmlRenderPlugin({id:'rp_renderer_'+tag,tag,function:onXml});
 return true;
}