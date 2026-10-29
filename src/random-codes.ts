// JSON command interpreter: data only. No eval, Function constructor or macro expansion.
export const DEFAULT_CHARSET =
 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'+
 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя'+
 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρσςτυφχψω'+
 'ÄÖÜäöüßÀÁÂÃÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕØÙÚÛÝÞ'+
 'ĀāĂăĄąĆćČčĎďĐđĒēĖėĘęĚěĞğĠġĢģĤĥĦħĨĩĪīĮįİıĲĳĴĵĶķĹĺĻļĽľŁłŃńŅņŇňŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽž';
export const DEFAULT_COMMAND_JSON=JSON.stringify({command:'randomCodes',count:3,minLength:20,maxLength:40},null,2);
export const RANDOM_LIMITS={json:16384,count:10,length:512,total:4096,charset:2048};
export type CommandErrorCode='JSON_SYNTAX'|'UNSUPPORTED_COMMAND'|'INVALID_PARAMS'|'ENV_UNSUPPORTED'|'EXECUTION_FAILED'|'CONFIG_CONFLICT';
export class CommandError extends Error {code:CommandErrorCode;constructor(code:CommandErrorCode,message:string){super(message);this.name='CommandError';this.code=code;}}
export function commandFailure(e:any){return {code:String(e?.code||'EXECUTION_FAILED'),message:String(e?.message||e)};}
export interface RandomCodesCommand {command:'randomCodes';count:number;minLength:number;maxLength:number;charset:string;}
export type RandomInt=(exclusiveMax:number)=>number;
function invalid(message:string):never {throw new CommandError('INVALID_PARAMS',message);}
export function parseCommand(source:string):RandomCodesCommand {
 if(typeof source!=='string'||source.length>RANDOM_LIMITS.json)invalid('JSON 输入最多 16384 字符');
 let value:any;try{value=JSON.parse(source);}catch(e){throw new CommandError('JSON_SYNTAX','JSON 语法错误：'+String((e as any)?.message||e)+'。只接受 JSON 对象，不支持 JS 源码、宏、注释或尾随逗号。');}
 if(!value||Array.isArray(value)||typeof value!=='object')invalid('顶层必须是 JSON 对象');
 if(typeof value.command!=='string')invalid('缺少字符串字段 command');
 if(value.command!=='randomCodes')throw new CommandError('UNSUPPORTED_COMMAND','不支持指令 '+value.command+'；当前仅支持 randomCodes');
 const allowed=['command','count','minLength','maxLength','charset'];
 const extra=Object.keys(value).filter(k=>!allowed.includes(k));if(extra.length)invalid('不支持的字段：'+extra.join(', '));
 for(const key of ['count','minLength','maxLength'])if(value[key]!==undefined&&(!Number.isInteger(value[key])||value[key]<1))invalid(key+' 必须是正整数，不能使用数字字符串');
 const count=value.count===undefined?3:value.count,minLength=value.minLength===undefined?20:value.minLength,maxLength=value.maxLength===undefined?40:value.maxLength;
 if(count>RANDOM_LIMITS.count)invalid('count 不能超过 10');
 if(minLength>maxLength)invalid('minLength 不能大于 maxLength');
 if(maxLength>RANDOM_LIMITS.length||count*maxLength>RANDOM_LIMITS.total)invalid('每段最多 512 个字符，count × maxLength 最多 4096');
 const raw=value.charset===undefined?DEFAULT_CHARSET:value.charset;
 if(typeof raw!=='string'||!raw)invalid('charset 必须是非空字符池字符串；省略时使用默认多语言字符池');
 const chars=Array.from(raw);
 if(chars.length>RANDOM_LIMITS.charset)invalid('字符池最多 2048 个 Unicode 码点');
 if(chars.some(ch=>{const cp=ch.codePointAt(0)!;return /\s/.test(ch)||cp<32||(cp>=127&&cp<=159)||(cp>=0xd800&&cp<=0xdfff)||cp===0x200b||cp===0x200c||cp===0x200d||(cp>=0x202a&&cp<=0x202e)||(cp>=0x2066&&cp<=0x2069);}))invalid('字符池不能包含空白、控制字符、方向控制符或孤立代理项');
 return {command:'randomCodes',count,minLength,maxLength,charset:Array.from(new Set(chars)).join('')};
}
export function generateRandomCodes(command:RandomCodesCommand,randomInt:RandomInt){
 const c=parseCommand(JSON.stringify(command));const pool=Array.from(c.charset);
 const choose=(bound:number)=>{const n=randomInt(bound);if(!Number.isInteger(n)||n<0||n>=bound)throw new CommandError('EXECUTION_FAILED','随机源返回越界或非整数值');return n;};
 const codes:string[]=[];const lengths:number[]=[];
 for(let i=0;i<c.count;i++){const length=c.minLength+choose(c.maxLength-c.minLength+1);let text='';for(let j=0;j<length;j++)text+=pool[choose(pool.length)];codes.push(text);lengths.push(length);}
 return {codes,lengths,text:codes.join('\n'),charsetSize:pool.length};
}
// JSON parsing above is retained only for migration of v2.2 settings. No XML output wrapper.
