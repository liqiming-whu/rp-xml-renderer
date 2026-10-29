const hour = Number(now().time.slice(0, 2));
const period = hour < 6 ? "夜间休息" : hour < 12 ? "上午活动" : hour < 18 ? "下午活动" : "晚间放松";
return "现实时间参考：" + period + "。仅在剧情时间一致时参考，不据此强制切换场景或人物状态。";
