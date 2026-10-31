import {Settings,Rule,defaults,freshRule,decide,validateSettings,classicAppearance} from './model';
import {regexPanel} from './regex-panel';
import InjectionSettings,{useInjectionPage} from './injection-settings';
import {load,save,cards,requestReload} from './runtime';
import {contentView} from './view';
const modes=[['collapse','折叠面板'],['card','普通卡片'],['markdown','Markdown'],['hide','隐藏'],['choices','选项列表']];
export default function SettingsScreen(ctx:any){
 const [data,setData]=ctx.useState('data',{settings:defaults(),cards:[],ready:false});
 const [edit,setEdit]=ctx.useState('editor',null);
 const [status,setStatus]=ctx.useState('status','');
 const [sample,setSample]=ctx.useState('sample','');
 const [preview,setPreview]=ctx.useState('preview',null);
 const [regexPage,setRegexPage]=ctx.useState('regexPage',false);
 const [dynamicPage,setDynamicPage]=ctx.useState('dynamicPage',false);
 const injectionPage=useInjectionPage(ctx);
 if(dynamicPage)return InjectionSettings(ctx,()=>setDynamicPage(false),injectionPage);
 const U=ctx.UI;const s:Settings=data.settings;
 const patch=(p:any)=>setData({...data,settings:{...s,...p}});
 const change=(key:string,value:any)=>{setEdit({...edit,[key]:value});setPreview(null);};
 const toggle=(label:string,on:boolean,fn:any)=>U.Row({fillMaxWidth:true,verticalAlignment:'center'},[U.Text({text:label,weight:1}),U.Switch({checked:on,onCheckedChange:fn})]);
 const field=(key:string,label:string,numeric=false)=>U.TextField({label,value:String(edit[key]??''),singleLine:true,onValueChange:(v:string)=>change(key,numeric?Number(v):v)});
 const button=(text:string,onClick:any)=>U.OutlinedButton({text,onClick,fillMaxWidth:true});
 const start=(r:Rule)=>{setEdit(JSON.parse(JSON.stringify(r)));setPreview(null);setSample('<'+r.tag+'>\n'+(r.validator==='patch'?'<JSONPatch>\n[]\n</JSONPatch>':r.mode==='choices'?'行动一 结果一\n行动二 结果二':'**示例内容**\n正文段落')+'\n</'+r.tag+'>');};
 const persist=()=>{try{const next=save(s);setData({...data,settings:next});setStatus('已保存。请点“应用设置”，新增标签需重启 Operit；已有消息请重新进入对话刷新。');}catch(e){setStatus(String(e));}};
 const nodes:any[]=[U.Text({text:edit?'编辑标签规则':'RP 标签渲染配置',style:'headlineSmall'}),U.Text({text:'v2.3.3 · 标签渲染 / 正则替换 / 动态 JS',style:'bodySmall',color:'onSurfaceVariant'})];
 if(status)nodes.push(U.Text({text:status,color:'primary'}));
 if(!data.ready)nodes.push(U.Text({text:'正在读取配置…'}));
 else if(!edit){
 nodes.push(button('动态 JS 注入 · 四套预设',()=>{injectionPage.read(data.cards);setDynamicPage(true);}));
 nodes.push(toggle('启用标签处理',s.enabled,v=>patch({enabled:v})),toggle('未匹配标签使用安全 Markdown',s.fallback,v=>patch({fallback:v})),toggle('默认回退移除完整外层标签',s.stripOuter,v=>patch({stripOuter:v})),U.Text({text:'默认处理仅覆盖本插件已登记的标签，不拦截任意未知标签或宿主内置功能。含标签的行用原生文字保留，其余内容按 Markdown 显示，避免再次误解析。',style:'bodySmall'}));
 for(const r of s.rules)nodes.push(U.Card({fillMaxWidth:true,shape:{cornerRadius:10}},[U.Column({padding:12,spacing:6},[U.Text({text:r.tag+' · '+r.title,style:'titleSmall'}),U.Text({text:(r.enabled?'开启':'关闭')+' / '+modes.find(x=>x[0]===r.mode)?.[1]+' / '+(r.scope==='all'?'全部角色（含未来新增）':r.cardIds.length+' 张指定角色'),style:'bodySmall'}),button('编辑',()=>start(r))]) ]));
 nodes.push(button('新增自定义标签',()=>start(freshRule('notes'+(s.rules.length+1)))),button('保存配置',persist),button("应用设置 / 检查标签注册",()=>{try{setStatus(requestReload());}catch(e){setStatus(String(e));}}),button('重新读取已保存配置',async()=>{try{setData({settings:load(),cards:await cards(),ready:true});setStatus('已重新读取');}catch(e){setStatus(String(e));}}),U.Text({text:'角色绑定采用完整消息块的唯一归属校验。流式未完成、归属不明、跨对话重复或角色重名时保留原文；完成后可重新进入对话。每个标签限一条规则。',style:'bodySmall'}));
 }else if(regexPage){
 nodes.push(...regexPanel(ctx,edit,p=>{setEdit({...edit,...p});setPreview(null);},()=>setRegexPage(false)));
 }else{
 nodes.push(field('tag','标签名（不带尖括号）'),field('title','面板标题'),toggle('启用本规则',edit.enabled,v=>change('enabled',v)));
 for(const [value,label] of modes)nodes.push(button((edit.mode===value?'✓ ':'')+label,()=>{setEdit({...edit,...(edit.layout==='classic'?classicAppearance(value as any):{}),mode:value,validator:value==='choices'?'choices':edit.validator});setPreview(null);}));
 nodes.push(U.Text({text:'结构校验',style:'titleMedium'}));
 for(const [value,label] of [['text','通用独立文本块'],['patch','MVU 变量补丁'],['choices','选项行格式']])nodes.push(button((edit.validator===value?'✓ ':'')+label,()=>change('validator',value)));
 nodes.push(U.Text({text:'所有规则要求完整闭合且标签独占行。隐藏通用文本风险较高；变量块建议选择 MVU 校验。',style:'bodySmall'}),toggle('全部角色（包括以后新增）',edit.scope==='all',v=>change('scope',v?'all':'selected')));
 if(edit.scope==='selected'){
  nodes.push(button('全选当前角色列表',()=>change('cardIds',data.cards.map(c=>c.id))),button('清空选择（不对任何角色生效）',()=>change('cardIds',[])));
  for(const c of data.cards)nodes.push(U.Row({fillMaxWidth:true,verticalAlignment:'center'},[U.Text({text:c.name,weight:1}),U.Checkbox({checked:edit.cardIds.includes(c.id),onCheckedChange:(v:boolean)=>change('cardIds',v?Array.from(new Set([...edit.cardIds,c.id])):edit.cardIds.filter(id=>id!==c.id))})]));
 }
 nodes.push(button('正则替换（'+(edit.regexEnabled?'开启':'关闭')+' · '+(edit.replacements||[]).length+' 条）',()=>{setRegexPage(true);setPreview(null);}),U.Text({text:'外观',style:'titleMedium'}),button('恢复本规则的经典默认外观',()=>{setEdit({...edit,...classicAppearance(edit.mode)});setPreview(null);}),toggle('经典紧凑布局（关闭为自定义平底样式）',edit.layout==='classic',v=>change('layout',v?'classic':'custom')),toggle('始终显示原文工具栏',!!edit.showTools,v=>change('showTools',v)),field('icon','图标名称，例如 description / psychology'),field('fontSize','字号（10–24）',true),field('radius','圆角（0–32）',true),field('padding','基础内边距（0–32；经典布局垂直更紧凑）',true),field('color','文字色：主题色名或 #RRGGBB'),field('background','背景色'),field('borderColor','边框色'),toggle('默认展开',edit.expanded,v=>change('expanded',v)),toggle('标题显示行数（经典选项固定显示数量）',edit.showLines,v=>change('showLines',v)),toggle('正文保留外层标签',edit.preserveTags,v=>change('preserveTags',v)),U.TextField({label:'预览测试内容',value:sample,onValueChange:(v:string)=>{setSample(v);setPreview(null);},singleLine:false,minLines:3}),button('测试规则与样式（不写入聊天）',()=>{try{const tmp={...s,rules:[edit]};validateSettings(tmp);const id=edit.scope==='selected'?(edit.cardIds[0]||''):'';setPreview(decide(sample,edit.tag,tmp,id));setStatus('预览按所选首张角色模拟，不代表真实消息归属验证。');}catch(e){setStatus(String(e));}}));
 if(preview)nodes.push(U.Text({text:preview.reason}),contentView(ctx,{xml:sample,body:preview.body,mode:preview.mode,rule:preview.rule,chatId:'',preview:true}));
 nodes.push(button('保存此规则',()=>{try{const rules=s.rules.filter(r=>r.id!==edit.id);rules.push(edit);const next=save({...s,rules});setData({...data,settings:next});setEdit(null);setStatus('规则已保存；请应用设置。新增标签需重启 Operit。');}catch(e){setStatus(String(e));}}),button('删除此规则（保留安全回退）',()=>{try{const next=save({...s,rules:s.rules.filter(r=>r.id!==edit.id)});setData({...data,settings:next});setEdit(null);setStatus('已删除自定义处理，标签仍登记供默认回退。');}catch(e){setStatus(String(e));}}),button('取消编辑',()=>{setEdit(null);setPreview(null);}));
 }
 return U.LazyColumn({fillMaxSize:true,padding:16,spacing:12,onLoad:async()=>{if(data.ready)return;try{setData({settings:load(),cards:await cards(),ready:true});}catch(e){setStatus('配置读取失败：'+String(e));}}},nodes);
}