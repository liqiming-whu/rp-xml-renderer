import {Rule} from './model';
import {applyReplacements} from './replacements';
import {copy,fill} from './runtime';
// Never feed tag-bearing lines back to the host XML parser, including replacement output.
export function safeNodes(ctx:any,text:string,color='onSurface',fontSize=13){
 const nodes:any[]=[];let buffer:string[]=[];let fenced=false;
 const flush=()=>{if(buffer.length){nodes.push(ctx.UI.Markdown({text:buffer.join('\n'),color,fontSize,fillMaxWidth:true}));buffer=[];}};
 for(const line of String(text).split('\n')){
  const fence=/^\s*(`{3,}|~{3,})/.test(line);
  if(fence||fenced||line.includes('<')){flush();nodes.push(ctx.UI.Text({text:line||' ',color,fontSize,fillMaxWidth:true}));if(fence)fenced=!fenced;}else buffer.push(line);
 }flush();return nodes;
}
export function displayContent(body:string,mode:string,r?:Rule){
 if(!r||!['collapse','card','markdown','choices'].includes(mode))return {text:body,count:0,error:''};
 return applyReplacements(body,!!r.regexEnabled,r.replacements||[]);
}
export function contentView(ctx:any,args:{xml:string;body:string;mode:string;rule?:Rule;chatId:string;preview?:boolean;reason?:string}){
 const {xml,body,mode,rule:r,chatId,preview}=args;
 const [expanded,setExpanded]=ctx.useState('expanded',r?.expanded||false);
 const [selected,setSelected]=ctx.useState('selected','');
 const [feedback,setFeedback]=ctx.useState('feedback','');
 const [pending,setPending]=ctx.useState('pending','');
 const [raw,setRaw]=ctx.useState('raw',false);
 const [tools,setTools]=ctx.useState('tools',false);
 const U=ctx.UI;
 const run=async(line:string,force=false)=>{if(preview){setFeedback('预览模式：不会写入草稿或剪贴板');return;}try{const result=await fill(line,chatId,force);setFeedback(result.message);setSelected(result.ok?line:'');setPending(result.conflict?line:'');}catch(e){setFeedback(String(e));}};
 if(mode==='hide')return preview?U.Text({text:'预览：该块将隐藏；原文与变量数据不变',color:'onSurfaceVariant'}):U.Spacer({width:0,height:0});
 if(mode==='fallback'||mode==='host'||!r)return U.Column({fillMaxWidth:true},safeNodes(ctx,body));
 const classic=r.layout==='classic';
 const tone=(name:string,alpha:number)=>{const c=ctx.MaterialTheme?.colorScheme?.[name];return c&&typeof c.copy==='function'?c.copy({alpha}):name;};
 const replaced=displayContent(body,mode,r);
 const shown=replaced.text;
 const text=r.preserveTags?(()=>{const open=/^\s*<[^>]+>/.exec(xml);const at=xml.indexOf(body,open?open[0].length:0);return at>=0?xml.slice(0,at)+shown+xml.slice(at+body.length):shown;})():shown;
 const controls=(tools||r.showTools)?[U.Row({fillMaxWidth:true,spacing:8},[
  U.TextButton({text:raw?'返回渲染':'查看原文',onClick:()=>setRaw(!raw)}),
  U.TextButton({text:'复制原文',onClick:()=>{if(!preview)copy(xml);setFeedback(preview?'预览模式未复制':'已复制原文（未经替换）');}})
 ])]:[];
 const more=()=>U.Row({padding:4,verticalAlignment:'center',onClick:()=>{setTools(!tools);if(tools&&!r.showTools)setRaw(false);}},[U.Icon({name:'moreHoriz',size:16,tint:'onSurfaceVariant'})]);
 const notices:any[]=[...(replaced.error?[U.Text({text:replaced.error,fontSize:11,color:'error'})]:[]),...(feedback?[U.Text({text:feedback,fontSize:11,color:'primary'})]:[]),...(pending?[U.TextButton({text:'确认覆盖现有草稿',onClick:()=>run(pending,true)})]:[])];
 let children:any[]=[];
 const lines=shown.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(mode==='choices'){
  children=lines.map((line,i)=>{
   const cleaned=line.replace(/^\s*(?:[1-9]\s*[.、)）:：]|[-*•])\s*/,'');
   const match=/^(\S+)\s+([\s\S]+)$/.exec(cleaned);const active=selected===line;
   const subColor=active?'onPrimaryContainer':classic?'onSurfaceVariant':r.color;
   const badge=classic?(['路线一','路线二','路线三','路线四'][i]||'选项 '+(i+1)):'选项 '+(i+1);
   return U.Card({key:'choice-'+i,fillMaxWidth:true,containerColor:active?tone('primaryContainer',0.72):classic?tone(r.background,0.35):r.background,shape:{cornerRadius:r.radius},elevation:0,border:{width:active?1.2:0.8,color:active?'primary':r.borderColor,alpha:active?0.85:0.55}},[
    U.Row({fillMaxWidth:true,verticalAlignment:'center',spacing:10,padding:classic?{horizontal:r.padding,vertical:Math.max(0,r.padding-2)}:r.padding,onClick:()=>run(line)},[
     U.Column({weight:1,spacing:4},[
      U.Text({text:badge+(active?' · 已填入输入框':''),style:'labelSmall',fontSize:10,fontWeight:'bold',color:active?'primary':subColor}),
      U.Text({text:match?match[1]:cleaned,fontSize:r.fontSize,fontWeight:'semibold',color:active?'onPrimaryContainer':r.color}),
      ...(match?[U.Text({text:'→ '+match[2],fontSize:Math.max(10,r.fontSize-(classic?1.5:1)),color:subColor})]:[])
     ]),U.Icon({name:active?'check':'chevronRight',size:18,tint:active?'primary':'onSurfaceVariant'})
    ])
   ]);
  });
 }else children=safeNodes(ctx,text,r.color,r.fontSize);
 if(!shown.trim())children=[U.Text({text:'替换后内容为空，可从更多菜单查看原文',fontSize:11,color:'onSurfaceVariant'})];
 if(raw)children=[U.Text({text:xml,fontSize:r.fontSize,color:r.color})];
 const lineCount=body.split('\n').filter(x=>x.trim()).length;
 let title=r.title;
 if(mode==='choices')title+=classic?(lines.length===4?' · 四选一':' · '+lines.length+' 个选项'):(r.showLines?' · '+lines.length+' 个选项':'');
 else if(r.showLines)title+=classic?'（共 '+lineCount+' 行）':' · '+lineCount+' 行';
 const header=U.Row({fillMaxWidth:true,verticalAlignment:'center',horizontalArrangement:'spaceBetween',...(mode==='collapse'?{padding:classic?{horizontal:r.padding,vertical:Math.max(0,r.padding-4)}:r.padding,onClick:()=>setExpanded(!expanded)}:{} )},[
  U.Row({weight:1,verticalAlignment:'center',spacing:8},[U.Icon({name:r.icon,tint:'primary',size:classic&&mode==='collapse'?16:18}),U.Text({text:title,weight:1,style:classic&&mode==='collapse'?'labelMedium':'titleSmall',...(mode==='choices'?{fontSize:13}:{}),fontWeight:mode==='choices'?'bold':'medium',maxLines:1,overflow:'ellipsis',color:r.color})]),
  ...(mode==='collapse'?[U.Row({verticalAlignment:'center',spacing:4},[U.Text({text:expanded?'收起':'展开',style:'labelSmall',fontWeight:'medium',color:'primary'}),U.Icon({name:expanded?'expandLess':'expandMore',size:18,tint:'primary'})])]:[U.Text({text:mode==='choices'?'点击填入回复框':'',fontSize:11,color:'onSurfaceVariant'}),more()])
 ]);
 if(mode==='markdown')return U.Column({fillMaxWidth:true,spacing:4},[...children,more(),...controls,...notices]);
 if(mode==='collapse')return U.Card({fillMaxWidth:true,paddingVertical:2,containerColor:classic?tone(r.background,0.28):r.background,shape:{cornerRadius:r.radius},...(classic?{}:{border:{width:1,color:r.borderColor}}),elevation:0},[
  U.Column({fillMaxWidth:true},[header,...(expanded?[
   U.HorizontalDivider({thickness:0.5,color:tone(r.borderColor,0.5)}),
   U.Column({fillMaxWidth:true,padding:{horizontal:r.padding,vertical:Math.max(0,r.padding-2)},spacing:4},[...children,more(),...controls,...notices])
  ]:[])])
 ]);
 return U.Card({fillMaxWidth:true,paddingVertical:3,containerColor:classic?tone('surface',0.96):r.background,shape:{cornerRadius:classic?r.radius+2:r.radius},border:{width:1,color:r.borderColor,alpha:classic?0.5:1},elevation:classic?1:0},[
  U.Column({fillMaxWidth:true,padding:r.padding,spacing:8},[header,...children,...controls,...notices])
 ]);
}
export default function Screen(ctx:any){
 const [xml]=ctx.useState('xmlContent','');const [body]=ctx.useState('body','');const [mode]=ctx.useState('mode','fallback');const [rule]=ctx.useState('rule',null);const [chatId]=ctx.useState('chatId','');
 return contentView(ctx,{xml,body,mode,rule,chatId});
}