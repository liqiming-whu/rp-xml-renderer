const cards = ["用一个具体动作表现情绪", "让一句对话推动信息", "加入一个与情节相关的声音细节", "删掉一句重复解释"];
return "本轮写作挑战：" + cards[Math.floor(Math.random() * cards.length)] + "。服从用户当前写作要求，不要额外输出挑战说明。";
