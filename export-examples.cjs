// Run after tsc. Keep runnable snippets synchronized with built-in presets.
const fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'examples');fs.mkdirSync(out,{recursive:true});
const defaults=require('./dist/injection-model').defaultScripts();
const samples={
 'random-codes':defaults.random,
 'time':defaults.time,
 'daily-theme-microevent':defaults.daily,
 'routine':`const hour = Number(now().time.slice(0, 2));
const period = hour < 6 ? "夜间休息" : hour < 12 ? "上午活动" : hour < 18 ? "下午活动" : "晚间放松";
return "现实时间参考：" + period + "。仅在剧情时间一致时参考，不据此强制切换场景或人物状态。";`,
 'daily-theme':`const themes = ["观察细节", "倾听", "完成小目标", "整理", "尝试新意", "重访", "休息"];
const day = Math.floor(Date.parse(now().date + "T00:00:00Z") / 86400000);
return "今日主题：" + themes[((day % themes.length) + themes.length) % themes.length] + "。自然体现，不必反复点题。";`,
 'microevent':`const chance = 0.15;
if (Math.random() >= chance) return "";
const events = ["一个小误会有机会被澄清", "有机会表达感谢", "注意到一件先前忽略的小物件"];
return "可选微事件：" + events[Math.floor(Math.random() * events.length)] + "。不符合场景则忽略，不重复强行触发，不推翻既有事实。";`,
 'd20':`const roll = 1 + Math.floor(Math.random() * 20);
const dc = 12;
return "本轮可选检定：D20=" + roll + "，难度=" + dc + "，结果=" + (roll >= dc ? "成功" : "失败") + "。仅在当前行动需要检定时采用，不替用户选择行动。";`,
 'detail':`const details = ["留意声音中的停顿", "留意手边物品", "注意窗外光线", "注意一句话的语气"];
return "本轮观察角度：" + details[Math.floor(Math.random() * details.length)] + "。只描写场景已存在或合理出现的细节，不改写既有人设。";`,
 'writing-challenge':`const cards = ["用一个具体动作表现情绪", "让一句对话推动信息", "加入一个与情节相关的声音细节", "删掉一句重复解释"];
return "本轮写作挑战：" + cards[Math.floor(Math.random() * cards.length)] + "。服从用户当前写作要求，不要额外输出挑战说明。";`,
 'daily-practice':`const tasks = ["写三句环境观察", "解释一个编程概念", "回顾一处代码可读性", "写一段简短对白", "列出一个问题的两种解法", "整理一个知识点", "总结一周收获"];
const day = Math.floor(Date.parse(now().date + "T00:00:00Z") / 86400000);
return "今日可选练习：" + tasks[((day % tasks.length) + tasks.length) % tasks.length] + "。用户愿意时再展开；不代表已经完成，也不记录连续天数。";`
};
for(const [name,source] of Object.entries(samples))fs.writeFileSync(path.join(out,name+'.js'),source+'\n');
console.log('Exported '+Object.keys(samples).length+' examples');