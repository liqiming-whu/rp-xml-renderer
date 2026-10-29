const chance = 0.15;
if (Math.random() >= chance) return "";
const events = ["一个小误会有机会被澄清", "有机会表达感谢", "注意到一件先前忽略的小物件"];
return "可选微事件：" + events[Math.floor(Math.random() * events.length)] + "。不符合场景则忽略，不重复强行触发，不推翻既有事实。";
