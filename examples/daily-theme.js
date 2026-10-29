const themes = ["观察细节", "倾听", "完成小目标", "整理", "尝试新意", "重访", "休息"];
const day = Math.floor(Date.parse(now().date + "T00:00:00Z") / 86400000);
return "今日主题：" + themes[((day % themes.length) + themes.length) % themes.length] + "。自然体现，不必反复点题。";
