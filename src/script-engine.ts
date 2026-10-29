import {DEFAULT_CHARSET} from './random-codes';
export const SCRIPT_LIMITS={source:32768,output:16384,timeoutMs:1500};
export interface TimeSnapshot {epochMs:number;iso:string;local:string;date:string;time:string;offset:string;timeZone:string;}
export interface ScriptResult {ok:boolean;code:string;message?:string;text?:string;stack?:string;durationMs?:number;time?:TimeSnapshot;}
export function buildScriptBootstrap(source:string,time:TimeSnapshot,checkOnly=false):string {
 if(typeof source!=='string'||source.length>SCRIPT_LIMITS.source)throw Error('JS 源码不能超过 32768 字符');
 return `(function(){
 'use strict';
 const hostRandom=globalThis.NativeInterface&&globalThis.NativeInterface.__call;
 if(typeof hostRandom!=='function')throw Error('ENV_UNSUPPORTED: random host interface missing');
 if(!Reflect.deleteProperty(globalThis,'NativeInterface'))throw Error('ENV_UNSUPPORTED: cannot isolate native interface');
 const stringify=JSON.stringify.bind(JSON),create=Object.create.bind(Object),define=Object.defineProperty.bind(Object),freeze=Object.freeze.bind(Object);
 const resolve=Promise.resolve.bind(Promise),then=Promise.prototype.then,AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const asString=String,asNumber=Number,from=Array.from.bind(Array),isInteger=Number.isInteger;
 let result=null;
 function envelope(fields){const out=create(null);for(const k of Object.keys(fields))out[k]=fields[k];return out;}
 function fail(e){let code='JS_RUNTIME';const message=asString(e&&e.message!==undefined?e.message:e).slice(0,2000);if(e&&e.name==='SyntaxError')code='JS_SYNTAX';else if(e&&e.name==='ReferenceError'&&/\\b(require|process|document|window|fetch|Intl|Java|Tools|NativeInterface|setTimeout|setInterval|XMLHttpRequest|WebSocket|module)\\b/.test(message))code='ENV_UNSUPPORTED';else if(e&&['INVALID_PARAMS','OUTPUT_LIMIT','INVALID_RESULT','ENV_UNSUPPORTED'].includes(e.code))code=e.code;result=envelope({ok:false,code,message,stack:asString(e&&e.stack||'').slice(0,4000)});}
 function error(code,message){const e=new Error(message);e.code=code;throw e;}
 const time=freeze(${JSON.stringify(time)}),defaultPool=${JSON.stringify(DEFAULT_CHARSET)};
 function randomCodes(count=3,minLength=20,maxLength=40,charset=defaultPool){
  if(!isInteger(count)||!isInteger(minLength)||!isInteger(maxLength)||count<1||count>10||minLength<1||minLength>maxLength||maxLength>512||count*maxLength>4096)error('INVALID_PARAMS','randomCodes 参数范围：1～10 段，长度 1～512，总上限 4096');
  if(typeof charset!=='string'||!charset||charset.length>8192)error('INVALID_PARAMS','charset 必须是非空字符池字符串');
  const pool=from(new Set(from(charset)));if(pool.length>2048)error('INVALID_PARAMS','字符池最多 2048 个码点');
  if(pool.some(ch=>{const p=ch.codePointAt(0);return p>=0xd800&&p<=0xdfff;}))error('INVALID_PARAMS','字符池包含孤立代理项');
  const draw=n=>{const v=asNumber(hostRandom('randomInt',asString(n)));if(!isInteger(v)||v<0||v>=n)error('ENV_UNSUPPORTED','随机源返回无效结果');return v;};
  const out=[];for(let i=0;i<count;i++){const length=minLength+draw(maxLength-minLength+1);let text='';for(let k=0;k<length;k++)text+=pool[draw(pool.length)];out.push(text);}return out;
 }
 define(globalThis,'randomCodes',{value:randomCodes,writable:false,configurable:false});
 define(globalThis,'now',{value:()=>time,writable:false,configurable:false});
 define(globalThis,'context',{value:freeze({time}),writable:false,configurable:false});
 define(globalThis,'DEFAULT_CHARSET',{value:defaultPool,writable:false,configurable:false});
 define(globalThis,'__rpReadResultV230',{value:()=>result===null?'':stringify(result),writable:false,configurable:false});
 try {
  const fn=new AsyncFunction('"use strict";\\n'+${JSON.stringify(source)});
  if(${checkOnly?'true':'false'}){result=envelope({ok:true,code:'VALID',message:'JS 语法与基础环境检查通过，未执行用户脚本'});return;}
  then.call(resolve(fn()),value=>{
   if(typeof value!=='string')error('INVALID_RESULT','请 return 字符串；return "" 表示本轮不注入');
   if(value.length>${SCRIPT_LIMITS.output})error('OUTPUT_LIMIT','返回字符串超过 16384 个 UTF-16 码元');
   result=envelope({ok:true,code:'SUCCESS',text:value});
  }).catch(fail);
 }catch(e){fail(e);}
})();`;
}