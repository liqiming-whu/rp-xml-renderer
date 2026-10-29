// 修改主题、事件与概率即可定制；日期来自所选时区。
const themes = ["留意日常细节", "完成一件小事", "倾听与回应", "整理与取舍", "尝试一点新意", "重访熟悉之物", "休息与陪伴"];
const events = ["出现一个无伤大雅的小插曲", "注意到一件先前忽略的小物件", "获得一次表达感谢的机会", "一个小误会有机会被澄清"];
const eventChance = 0.15; // 每次新请求独立抽取；不是每天最多一次。
const t = now();
// 把当地日历日期映射为日序号，不受当天小时或夏令时长度影响。
const day = Math.floor(Date.parse(t.date + "T00:00:00Z") / 86400000);
const theme = themes[((day % themes.length) + themes.length) % themes.length];
const lines = ["今日主题：" + theme + "。仅作为自然叙事倾向，不必每轮点题。"];
if (Math.random() < eventChance) {
  lines.push("可选微事件：" + events[Math.floor(Math.random() * events.length)] + "。若与当前场景不符则忽略，不要重复强行触发。");
}
lines.push("不推翻已经成立的人物状态与剧情因果，不替用户决定行动。");
return lines.join("\n");
