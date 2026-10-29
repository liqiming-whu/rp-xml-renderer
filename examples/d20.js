const roll = 1 + Math.floor(Math.random() * 20);
const dc = 12;
return "本轮可选检定：D20=" + roll + "，难度=" + dc + "，结果=" + (roll >= dc ? "成功" : "失败") + "。仅在当前行动需要检定时采用，不替用户选择行动。";
