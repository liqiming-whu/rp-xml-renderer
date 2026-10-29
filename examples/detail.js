const details = ["留意声音中的停顿", "留意手边物品", "注意窗外光线", "注意一句话的语气"];
return "本轮观察角度：" + details[Math.floor(Math.random() * details.length)] + "。只描写场景已存在或合理出现的细节，不改写既有人设。";
