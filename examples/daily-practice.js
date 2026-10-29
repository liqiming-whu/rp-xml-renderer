const tasks = ["写三句环境观察", "解释一个编程概念", "回顾一处代码可读性", "写一段简短对白", "列出一个问题的两种解法", "整理一个知识点", "总结一周收获"];
const day = Math.floor(Date.parse(now().date + "T00:00:00Z") / 86400000);
return "今日可选练习：" + tasks[((day % tasks.length) + tasks.length) % tasks.length] + "。用户愿意时再展开；不代表已经完成，也不记录连续天数。";
