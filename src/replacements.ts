// Display-only replacements. Never execute replacement text as code.
export interface ReplacementRule {id:string; name:string; enabled:boolean; pattern:string; flags:string; replacement:string;}
export const LIMITS={rules:16,pattern:512,input:32768,output:131072,matches:1000};
export function freshReplacement():ReplacementRule {return {id:'rx-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),name:'文本替换',enabled:true,pattern:'',flags:'g',replacement:''};}
export function compileReplacement(r:ReplacementRule):RegExp {
 if(typeof r.pattern!=='string'||!r.pattern||r.pattern.length>LIMITS.pattern)throw Error('正则表达式不能为空，且不能超过 512 字符');
 if(typeof r.flags!=='string'||!/^[gimsu]*$/.test(r.flags)||new Set(r.flags).size!==r.flags.length)throw Error('标志仅支持 g i m s u，且不能重复');
 if(typeof r.replacement!=='string'||r.replacement.length>8192)throw Error('替换内容不能超过 8192 字符');
 // Conservative guard, not a proof of linear-time execution. Do not use untrusted patterns.
 let inClass=false,clean='';
 for(let i=0;i<r.pattern.length;i++){
  const c=r.pattern[i];
  if(c==='\\'){const next=r.pattern[++i]||'';if(!inClass&&/[1-9k]/.test(next))throw Error('暂不支持模式中的反向引用；替换内容可用 $1 等捕获组');clean+='x';continue;}
  if(c==='['&&!inClass){inClass=true;clean+='x';continue;}if(c===']'&&inClass){inClass=false;continue;}if(!inClass)clean+=c;
 }
 if(/\)(?:\*|\+|\{)/.test(clean))throw Error('为降低卡顿风险，暂不支持重复整个分组；请改写为字符类重复');
 if(/\(\?(?:[=!]|<[=!])/.test(clean))throw Error('暂不支持前后查找断言');
 return new RegExp(r.pattern,r.flags);
}
export function validateReplacements(rules:ReplacementRule[]):void {
 if(!Array.isArray(rules)||rules.length>LIMITS.rules)throw Error('每个标签最多 16 条正则替换');
 const ids=new Set<string>();
 for(const r of rules){if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.enabled!=='boolean'||typeof r.name!=='string')throw Error('正则规则字段无效或 ID 重复');ids.add(r.id);compileReplacement(r);}
}
function substitute(template:string,m:RegExpExecArray,input:string):string {
 return template.replace(/\$(\$|&|`|'|\d{1,2}|<[^>]+>)/g,(token,key:string)=>{
  if(key==='$')return '$';if(key==='&')return m[0];if(key==='`')return input.slice(0,m.index);if(key==="'")return input.slice(m.index+m[0].length);
  if(key[0]==='<'){const groups=(m as any).groups;return groups?String(groups[key.slice(1,-1)]??''):token;}
  const n=Number(key);if(n>0&&n<m.length)return m[n]??'';
  if(key.length===2&&Number(key[0])>0&&Number(key[0])<m.length)return (m[Number(key[0])]??'')+key[1];
  return token;
 });
}
function replaceOne(input:string,r:ReplacementRule){
 const re=compileReplacement(r);let out='',last=0,count=0,m:RegExpExecArray|null;
 while((m=re.exec(input))!==null){
  if(++count>LIMITS.matches)throw Error('单条规则匹配次数超过 1000');
  const insertion=substitute(r.replacement,m,input);const piece=input.slice(last,m.index)+insertion;
  if(out.length+piece.length>LIMITS.output)throw Error('替换结果超过 128 Ki 字符');out+=piece;last=m.index+m[0].length;
  if(!re.global)break;
  if(m[0]===''){const at=re.lastIndex;const cp=input.codePointAt(at);re.lastIndex=at+(re.unicode&&cp!==undefined&&cp>65535?2:1);}
 }
 if(out.length+input.length-last>LIMITS.output)throw Error('替换结果超过 128 Ki 字符');
 return {text:out+input.slice(last),count};
}
export function applyReplacements(input:string,enabled:boolean,rules:ReplacementRule[]=[]){
 if(!enabled||!rules.some(r=>r.enabled))return {text:input,count:0,error:''};
 try{
  if(input.length>LIMITS.input)throw Error('原文超过 32 Ki 字符，跳过替换');
  validateReplacements(rules);let text=input,count=0;
  for(const r of rules){if(!r.enabled)continue;if(text.length>LIMITS.input)throw Error('中间结果超过 32 Ki 字符');const next=replaceOne(text,r);text=next.text;count+=next.count;}
  return {text,count,error:''};
 }catch(e){return {text:input,count:0,error:'正则替换未应用，已保留原文：'+String(e)};}
}
