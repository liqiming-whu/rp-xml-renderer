import {Rule} from './model';
import {freshReplacement,compileReplacement,applyReplacements,ReplacementRule,LIMITS} from './replacements';
// Separate editor page: at most 16 list entries plus one form, no service or WebView required.
export function regexPanel(ctx:any,r:Rule,change:(p:Partial<Rule>)=>void,back:()=>void){
 const U=ctx.UI;
 const [draft,setDraft]=ctx.useState('regexDraft',null);
 const [sample,setSample]=ctx.useState('regexSample','姓名：小叶\n姓名：小叶');
 const [result,setResult]=ctx.useState('regexResult',null);
 const [error,setError]=ctx.useState('regexError','');
 const list=r.replacements||[];
 const button=(text:string,onClick:any)=>U.OutlinedButton({text,onClick,fillMaxWidth:true});
 const update=(next:ReplacementRule[])=>{change({replacements:next});setResult(null);setError('');};
 const edit=(next:any)=>{setDraft({...next});setResult(null);setError('');};
 const move=(i:number,delta:number)=>{const j=i+delta;if(j<0||j>=list.length)return;const next=list.slice();[next[i],next[j]]=[next[j],next[i]];update(next);};
 const nodes:any[]=[U.Text({text:'标签内容正则替换',style:'titleLarge'}),U.Text({text:'仅处理当前标签校验通过后的正文，不处理整条聊天回复，不改历史原文、变量补丁或发送给模型的上下文。点击选项会填入替换后的该行；“复制原文”始终复制原始块。',style:'bodySmall'}),U.Row({verticalAlignment:'center',fillMaxWidth:true},[U.Text({text:'启用当前标签的替换链',weight:1}),U.Switch({checked:!!r.regexEnabled,onCheckedChange:(v:boolean)=>{change({regexEnabled:v});setResult(null);}})])];
 if(error)nodes.push(U.Text({text:error,color:'error'}));
 if(!draft){
  if(!list.length)nodes.push(U.Text({text:'尚未添加规则。多条规则按从上到下的顺序执行。'}));
  list.forEach((rx,i)=>nodes.push(U.Card({fillMaxWidth:true},[U.Column({padding:10,spacing:4},[
   U.Row({verticalAlignment:'center'},[U.Text({text:(i+1)+'. '+rx.name,weight:1}),U.Switch({checked:rx.enabled,onCheckedChange:(v:boolean)=>update(list.map(x=>x.id===rx.id?{...x,enabled:v}:x))})]),
   U.Text({text:rx.pattern+'  ['+rx.flags+']',fontSize:12}),
   U.Row({spacing:4},[U.TextButton({text:'编辑',onClick:()=>edit(rx)}),U.TextButton({text:'上移',onClick:()=>move(i,-1)}),U.TextButton({text:'下移',onClick:()=>move(i,1)}),U.TextButton({text:'删除',onClick:()=>update(list.filter(x=>x.id!==rx.id))})])
  ])])));
  if(list.length<LIMITS.rules)nodes.push(button('新增正则替换',()=>edit(freshReplacement())));
 }else{
  const field=(key:string,label:string,multi=false)=>U.TextField({label,value:draft[key],singleLine:!multi,...(multi?{minLines:2}:{}),onValueChange:(v:string)=>{setDraft({...draft,[key]:v});setResult(null);setError('');}});
  nodes.push(field('name','规则名称'),field('pattern','正则表达式（不含 / 分隔符）',true),field('flags','标志：g 全部 / i 忽略大小写 / m 多行 / s 跨行点号 / u Unicode'),field('replacement','替换内容（支持 $1、$2、$&；留空即删除；可直接输入换行）',true),button('填入捕获组示例',()=>edit({...draft,name:'提取姓名',pattern:'姓名[：:]([^\\n]+)',flags:'g',replacement:'$1'})),button('应用到替换列表（尚未保存标签）',()=>{try{compileReplacement(draft);const next=list.some(x=>x.id===draft.id)?list.map(x=>x.id===draft.id?draft:x):[...list,draft];update(next);setDraft(null);}catch(e){setError(String(e));}}),button('取消本条编辑',()=>{setDraft(null);setResult(null);setError('');}));
 }
 nodes.push(U.TextField({label:'测试原文（仅在本页使用）',value:sample,singleLine:false,minLines:3,onValueChange:(v:string)=>{setSample(v);setResult(null);}}),button(draft?'测试当前编辑规则（不保存）':'测试整条替换链（不保存）',()=>{const out=applyReplacements(sample,draft?true:!!r.regexEnabled,draft?[{...draft,enabled:true}]:list);setResult({...out,before:sample});}),U.Text({text:'执行边界：最多 16 条、表达式 512 字符、输入 32 Ki 字符、单条最多匹配 1000 次；异常整链回退原文。暂不支持重复整个分组、模式反向引用及前后查找。限制不能保证任意表达式不卡顿，请只使用自己理解的规则。',style:'bodySmall'}));
 if(result)nodes.push(U.Text({text:result.error||'匹配次数：'+result.count,color:result.error?'error':'primary'}),U.Text({text:'替换前',style:'titleSmall'}),U.Text({text:result.before||'（空）',fontSize:12}),U.Text({text:'替换后',style:'titleSmall'}),U.Text({text:result.text||'（空）',fontSize:12}));
 nodes.push(button('返回标签规则（记得保存此规则）',()=>{setDraft(null);setResult(null);setError('');back();}));
 return nodes;
}