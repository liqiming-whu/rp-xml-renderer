import {Settings,defaults,validateSettings,LEGACY_TAGS,RESERVED} from './model';
declare const Java:any;
const ID='com.operit.rp_xml_renderer';
const PREF='toolpkg_rp_xml_renderer_v2';
function prefs(){return Java.getApplicationContext().getSharedPreferences(PREF,0);}
export function load():Settings {const raw=String(prefs().getString('settings',''));if(!raw)return defaults();const s=JSON.parse(raw);validateSettings(s);return s;}
export function save(next:Settings){const s=JSON.parse(JSON.stringify(next));validateSettings(s);const old=load();if(s.revision!==old.revision)throw Error('配置已被其他页面更新，请重新打开配置');s.revision++;const p=prefs();const known=Array.from(new Set([...registeredTags(),...s.rules.map(r=>r.tag)]));const e=p.edit().putString('previous',JSON.stringify(old)).putString('settings',JSON.stringify(s)).putString('knownTags',JSON.stringify(known));if(!e.commit())throw Error('保存失败');return s as Settings;}
export function registeredTags():string[]{let known:string[]=[];try{known=JSON.parse(String(prefs().getString('knownTags','[]')));}catch{}return Array.from(new Set([...LEGACY_TAGS,...known,...load().rules.map(r=>r.tag)])).filter(x=>/^[a-z][a-z0-9_]*$/.test(x)&&!RESERVED.includes(x));}
export function requestReload(){
 const bridge=Java.type('com.ai.assistance.operit.plugins.toolpkg.ToolPkgXmlRenderBridgePlugin').INSTANCE;
 const pending=registeredTags().filter(tag=>!bridge.supports(tag));
 Java.type('com.ai.assistance.operit.ui.common.markdown.XmlRenderPluginRegistry').INSTANCE.notifyChanged();
 return pending.length?'已刷新已有规则；新增标签需重启 Operit 后注册：'+pending.join(', '):'已刷新已注册标签的规则；可重新进入对话查看。';
}
export async function cards():Promise<{id:string;name:string}[]>{const m=Java.type('com.ai.assistance.operit.data.preferences.CharacterCardManager').getInstance(Java.getApplicationContext());const xs=await m.callSuspend('getAllCharacterCards');return xs.map((x:any)=>({id:String(x.getId()),name:String(x.getName())}));}
// Matching the complete XML block against source messages is a conservative compatibility
// adapter, not authoritative per-render metadata. Duplicate/unknown ownership fails open.
// A fully closed leading reasoning prefix is not part of the visible body.
// Compute an offset only: never alter stored content or the XML used for lookup.
function leadingThinkingEnd(content:string):number {
 let end=0;
 for(;;){
  const open=/^\s*<(think|thinking)\s*>/i.exec(content.slice(end));
  if(!open)return end;
  const stack=[open[1].toLowerCase()];
  const tokens=/<(\/?)(think|thinking)\s*>/gi;
  tokens.lastIndex=end+open[0].length;
  let token:RegExpExecArray|null;let closed=false;
  while((token=tokens.exec(content))){
   const tag=token[2].toLowerCase();
   if(token[1]){if(stack.pop()!==tag)return end;}
   else stack.push(tag);
   if(!stack.length){end=tokens.lastIndex;closed=true;break;}
  }
  if(!closed)return end;
 }
}
function insideFence(text:string):boolean {
 let marker='';let length=0;
 for(const line of text.split(/\r?\n/)){
  const m=/^[ \t]*(`{3,}|~{3,})(.*)$/.exec(line);
  if(!m)continue;
  if(!marker){marker=m[1][0];length=m[1].length;}
  else if(m[1][0]===marker&&m[1].length>=length&&!m[2].trim()){marker='';length=0;}
 }
 return !!marker;
}
function insideProtectedContainer(text:string):boolean {
 const tokens=/<(\/?)(think|thinking|tool|tool_result|html|details)(?:\s[^<>]*)?>/gi;
 const stack:string[]=[];let token:RegExpExecArray|null;
 while((token=tokens.exec(text))){
  if(/\/\s*>$/.test(token[0]))continue;
  const tag=token[2].toLowerCase();
  if(token[1]){if(stack.pop()!==tag)return true;}
  else stack.push(tag);
 }
 return stack.length>0;
}
export function isStandalone(content:string,xml:string){
 const bodyStart=leadingThinkingEnd(content);
 const at=content.indexOf(xml,bodyStart);if(at<0)return false;
 const before=content.slice(bodyStart,at);const after=content.slice(at+xml.length);
 // No reasoning is required. At body start, indentation/BOM/blank lines are OK;
 // ordinary preceding prose still requires a real line boundary.
 if(before.trim()&&!/\n[ \t]*$/.test(before))return false;
 if(after&&!/^[ \t]*(?:\r?\n|$)/.test(after))return false;
 if(insideFence(before)||insideProtectedContainer(before))return false;
 return true;
}
export async function owner(xml:string){
 const none={chatId:'',cardId:'',reason:'无法唯一确认消息归属'};
 if(xml.length<12)return none;
 const c=Java.getApplicationContext();const db=Java.type('com.ai.assistance.operit.data.db.AppDatabase').Companion.getDatabase(c).getOpenHelper().getReadableDatabase();
 // Read-only queries. Include variants so that matching a historical variant cannot target a different chat.
 const sql="SELECT c.id,c.characterCardName,c.characterGroupId,m.sender,m.content FROM messages m JOIN chats c ON c.id=m.chatId WHERE instr(m.content,?)>0 UNION ALL SELECT c.id,c.characterCardName,c.characterGroupId,m.sender,v.content FROM message_variants v JOIN messages m ON m.chatId=v.chatId AND m.timestamp=v.messageTimestamp JOIN chats c ON c.id=v.chatId WHERE instr(v.content,?)>0 LIMIT 20";
 let cur:any=null;const found:{chatId:string;name:string;group:string;sender:string}[]=[];
 try{cur=db.query(sql,[xml,xml]);while(cur.moveToNext()){const content=String(cur.getString(4)||'');if(isStandalone(content,xml))found.push({chatId:String(cur.getString(0)),name:String(cur.getString(1)||''),group:String(cur.getString(2)||''),sender:String(cur.getString(3)||'')});}if(cur.getCount()>=20)return none;}finally{if(cur)cur.close();}
 const ids=Array.from(new Set(found.map(x=>x.chatId)));
 if(ids.length!==1||found.some(x=>x.group||!['ai','assistant'].includes(x.sender)))return none;
 const all=await cards();const matched=all.filter(x=>x.name===found[0].name);if(matched.length!==1)return none;
 return {chatId:ids[0],cardId:matched[0].id,reason:'完整消息块唯一匹配（只读）'};
}
export function copy(text:string){const c=Java.getApplicationContext();c.getSystemService('clipboard').setPrimaryClip(Java.type('android.content.ClipData').newPlainText('RP selection',text));}
declare const ToolPkg:any;
export async function fill(text:string,chatId:string,force=false){
 copy(text);
 let active='';try{active=String(await ToolPkg.ipc.call('rp_renderer_target',chatId));}catch{}
 const c=Java.getApplicationContext();const holder=Java.type('com.ai.assistance.operit.api.chat.ChatRuntimeHolder').getInstance(c);
 const targets=['MAIN','FLOATING'].filter(slot=>slot.toLowerCase()===active).map(slot=>({slot,core:holder.getCore(slot)})).filter(x=>chatId&&String(x.core.getCurrentChatId().getValue()||'')===chatId);
 if(targets.length!==1)return {ok:false,conflict:false,message:'已复制；无法唯一确定目标窗口，请手动粘贴'};
 const core=targets[0].core;const draft=String(core.getUserMessage().getValue().getText());
 if(draft&&draft!==text&&!force)return {ok:false,conflict:true,message:'已复制；输入框已有草稿，未覆盖'};
 core.updateUserMessage(text);
 if(String(core.getUserMessage().getValue().getText())!==text)throw Error('输入框回读不一致');
 return {ok:true,conflict:false,message:'已填入对应窗口并复制，未发送'};
}
