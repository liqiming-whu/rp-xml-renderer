import {commandFailure} from './random-codes';
import {defaultInjectionConfig,InjectionConfig,PRESETS,PRESET_NAMES,defaultScripts} from './injection-model';
import {loadInjectionConfig,saveInjectionConfig,tryInjectionScript,readInjectionStatus,timeSnapshot} from './injection-runtime';
import {cards,copy} from './runtime';
// The host dispatches root onLoad only once per screen instance, not on inline page changes.
export function useInjectionPage(ctx:any){
 const [data,setData]=ctx.useState('dynDataV23',{config:defaultInjectionConfig(),cards:[],ready:false,last:null});
 const [report,setReport]=ctx.useState('dynReportV23',null);
 const [status,setStatus]=ctx.useState('dynStatusV23','');
 const [help,setHelp]=ctx.useState('dynHelpV23',false);
 const read=(cardList:any[])=>{
  setReport(null);
  try{setData({config:loadInjectionConfig(),cards:cardList,ready:true,last:readInjectionStatus()});setStatus('已读取保存配置');}
  catch(e){setData({...data,ready:false});const f=commandFailure(e);setStatus(f.code+'：'+f.message);}
 };
 return {data,setData,report,setReport,status,setStatus,help,setHelp,read};
}
export default function InjectionSettings(ctx:any,onBack:()=>void,page:ReturnType<typeof useInjectionPage>){
 const {data,setData,report,setReport,status,setStatus,help,setHelp,read}=page;
 const U=ctx.UI,c:InjectionConfig=data.config,busy=!!report?.busy;
 const button=(text:string,onClick:any)=>U.OutlinedButton({text,onClick,fillMaxWidth:true,enabled:!busy});
 const change=(patch:Partial<InjectionConfig>)=>{if(busy)return;setData({...data,config:{...c,...patch}});setReport(null);setStatus('有未保存修改');};
 const changeScript=(value:string)=>change({scripts:{...c.scripts,[c.preset]:value}});
 const toggle=(label:string,checked:boolean,onCheckedChange:any)=>U.Row({fillMaxWidth:true,verticalAlignment:'center'},[U.Text({text:label,weight:1}),U.Switch({checked,onCheckedChange,enabled:!busy})]);
 const reload=async()=>{try{read(await cards());}catch(e){const f=commandFailure(e);setStatus(f.code+'：'+f.message);}};
 const trial=async(execute:boolean)=>{if(busy)return;setReport({busy:true});const out=await tryInjectionScript(c.scripts[c.preset],c.timeZone,execute);setReport(out);setStatus(execute?'试运行结束；未保存、未注入。':'检查结束；未执行用户脚本。');};
 const nodes:any[]=[U.Text({text:'动态 JS 注入',style:'headlineSmall'}),U.Text({text:'v2.3.2 · 随机码 / 时间 / 自定义 / 每日主题＋微事件',style:'bodySmall',color:'onSurfaceVariant'}),U.Text({text:'只注入 JS return 的字符串，不添加标签、标题、编号或说明。换行与内容完全由脚本控制；返回空字符串则本轮不注入。',style:'bodySmall'})];
 if(status)nodes.push(U.Text({text:status,color:'primary'}));
 if(!data.ready)nodes.push(U.Text({text:status?'配置读取未完成，请重试。':'正在读取配置…'}),button('重新读取',reload));
 else{
  nodes.push(toggle('启用正式动态注入',c.enabled,v=>change({enabled:v})),toggle('全部角色卡（包括以后新增）',c.scope==='all',v=>change({scope:v?'all':'selected'})));
  if(c.scope==='selected'){
   nodes.push(button('全选当前角色卡',()=>change({cardIds:data.cards.map(x=>x.id)})),button('清空角色选择',()=>change({cardIds:[]})));
   for(const card of data.cards)nodes.push(U.Row({fillMaxWidth:true,verticalAlignment:'center'},[U.Text({text:card.name,weight:1}),U.Checkbox({checked:c.cardIds.includes(card.id),enabled:!busy,onCheckedChange:(v:boolean)=>change({cardIds:v?Array.from(new Set([...c.cardIds,card.id])):c.cardIds.filter(id=>id!==card.id)})})]));
   if(!c.cardIds.length)nodes.push(U.Text({text:'未选择角色：可以试运行，正式请求不注入。',style:'bodySmall',color:'onSurfaceVariant'}));
  }
  nodes.push(U.Text({text:'当前预设（四套脚本分别保存）',style:'titleMedium'}),U.Column({fillMaxWidth:true,spacing:6},PRESETS.map(p=>button((c.preset===p?'✓ ':'')+PRESET_NAMES[p],()=>change({preset:p})))),U.TextField({label:PRESET_NAMES[c.preset]+' JS 脚本',value:c.scripts[c.preset],singleLine:false,minLines:8,enabled:!busy,onValueChange:changeScript}),button('恢复当前预设默认脚本（尚未保存）',()=>changeScript(defaultScripts()[c.preset])));
  if(c.preset==='daily')nodes.push(U.Text({text:'同一时区的同一天主题固定，按日轮换；默认每次新请求有 15% 概率附带可选微事件。无每日次数记忆，事件可能重复。可编辑 themes、events、eventChance；试运行也会抽取事件。',style:'bodySmall'}));
   if(c.preset==='custom')nodes.push(button('填入随机码＋时间示例（尚未保存）',()=>changeScript('const t = now();\nreturn randomCodes(3, 20, 40).join("\\n") + "\\n" + t.local + " " + t.offset + " " + t.timeZone;')));
  nodes.push(U.Text({text:'时间与时区',style:'titleMedium'}),toggle('跟随设备时区',c.timeZone==='device',v=>{if(v)change({timeZone:'device'});else{try{change({timeZone:timeSnapshot('device').timeZone});}catch(e){setReport({ok:false,...commandFailure(e)});}}}));
  if(c.timeZone!=='device')nodes.push(U.TextField({label:'时区 ID 或 UTC 偏移，例如 Asia/Shanghai / America/New_York / +05:30',value:c.timeZone,singleLine:true,enabled:!busy,onValueChange:(v:string)=>change({timeZone:v})}));
  nodes.push(U.Text({text:'时区设置作用于 now()。脚本不返回时间，就不会额外注入时间；地区时区按系统规则处理夏令时。',style:'bodySmall'}),button('检查 JS 语法与环境',()=>trial(false)),button('试运行（不保存、不注入）',()=>trial(true)));
  if(busy)nodes.push(U.Text({text:'正在执行，超时会中断…',color:'primary'}));
  else if(report){
   nodes.push(U.Text({text:report.code+'：'+(report.message|| (report.ok?'运行成功':'')),color:report.ok?'primary':'error'}));
   if(report.time)nodes.push(U.Text({text:'本次时区：'+report.time.timeZone+' · '+report.time.offset,fontSize:12}));
   if(report.ok&&typeof report.text==='string')nodes.push(U.Text({text:'返回内容 / 实际注入内容',style:'titleMedium'}),U.Text({text:report.text===''?'（空字符串，本轮不注入）':report.text,fontSize:13}),U.Text({text:'长度 '+report.text.length+' · '+report.durationMs+' ms',fontSize:12}),button('复制返回内容',()=>{try{copy(report.text);setStatus('已原样复制返回内容');}catch(e){setStatus(commandFailure(e).message);}}));
   if(report.stack)nodes.push(U.Text({text:report.stack,fontSize:11,color:'onSurfaceVariant'}));
  }
  nodes.push(button(help?'收起 JS 帮助':'JS 辅助函数与执行范围',()=>setHelp(!help)));
  if(help)nodes.push(U.Text({text:'randomCodes(段数, 最短, 最长, 可选字符池) 返回字符串数组；默认字符池为原来的 324 个字符。使用 .join("\\n") 自行换行。\nnow() 提供 local、iso、date、time、offset、timeZone、epochMs；同一次执行使用同一时间快照。\n可使用标准 JS、函数、循环、Promise 和 await。未接入 Java、Tools、文件、网络、Node.js、DOM、Intl 或定时器。\n源码上限 32768 字符，输出上限 16384，执行时限 1500ms。独立 JS 上下文不是独立进程；当前没有硬内存配额，请只运行可信脚本。\n每次新请求重新执行，携带本插件请求标记的重复组装复用结果。',style:'bodySmall'}));
  nodes.push(button('保存动态注入配置',async()=>{if(busy)return;setReport({busy:true});try{const next=await saveInjectionConfig(c);setData({...data,config:next});setReport(null);setStatus(next.enabled?'已保存并启用 '+PRESET_NAMES[next.preset]+' 预设；下次匹配请求生效。':'已保存四套预设；正式动态注入关闭。');}catch(e){setReport({ok:false,...commandFailure(e)});setStatus('未保存');}}),button('重新读取配置与最近注入状态',reload));
  if(data.last)nodes.push(U.Text({text:'最近状态：'+data.last.code+' · '+data.last.message+'\n'+new Date(data.last.at).toLocaleString()+(typeof data.last.outputLength==='number'?' · 长度 '+data.last.outputLength:''),fontSize:12}));
 }
 nodes.push(button('返回标签配置（未保存修改将丢弃）',()=>{setData({...data,ready:false});setReport(null);onBack();}));
 return U.LazyColumn({key:'dynamic-js-settings',fillMaxSize:true,padding:16,spacing:12,onLoad:async()=>{if(!data.ready)await reload();}},nodes);
}