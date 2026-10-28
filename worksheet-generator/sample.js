/* 內建示例，只用來對 Word 版面，不是呼叫 AI 的結果。課文是自寫的短文。 */
window.WORKSHEET_SAMPLE = {
  titleBase: "四上國語 薄荷日記",
  passage: "星期一早晨，教室窗邊的薄荷還掛著水珠。小安端著澆水壺，一盆一盆慢慢澆，嘴裡數：「一、二、三。」\n\n老師蹲下來，指著花盆說：「土乾了才要澆，不是天天灌滿。」小安把臉湊近葉子，聞到淡淡的香味，決定把這盆薄荷畫進今天的日記。\n\n放學前，小安在日記寫：「薄荷的葉子小小的，香味卻留好久。」",
  vocab: "澆、盆、香味、日記",
  byType: {
    choice: {
      low: [
        { stem: "小安在哪裡澆薄荷？", options: ["家裡廚房", "教室窗邊", "學校操場"], answer: 2 },
        { stem: "葉子上掛著什麼？", options: ["水珠", "雪花", "灰塵"], answer: 1 },
        { stem: "老師說什麼時候才要澆？", options: ["天天灌滿", "土乾了", "下雨以後"], answer: 2 },
        { stem: "小安把薄荷畫進哪裡？", options: ["日記", "黑板", "考卷"], answer: 1 },
      ],
      mid: [
        { stem: "「不是天天灌滿」是什麼意思？", options: ["每天都要把水澆滿", "不必每天都澆很多水", "花盆要裝滿泥土"], answer: 2 },
        { stem: "小安把臉湊近葉子，是為了做什麼？", options: ["聞香味", "把葉子摘下來", "躲開老師"], answer: 1 },
        { stem: "老師蹲下來，接著做了什麼？", options: ["幫小安寫日記", "指著花盆說話", "把薄荷拿走"], answer: 2 },
        { stem: "「香味卻留好久」裡的「卻」表示什麼？", options: ["葉子很小，香味卻留很久", "香味一下子不見", "日記很短"], answer: 1 },
      ],
      high: [
        { stem: "這篇最主要在說什麼？", options: ["薄荷要賣多少錢", "小安學習照顧薄荷，並把感覺寫進日記", "星期一的課表"], answer: 2 },
        { stem: "日記那一句沒有寫「我很喜歡」，為什麼還感覺得出來？", options: ["他寫葉子小小的，香味卻留好久", "他寫了考試分數", "老師幫他把答案寫上"], answer: 1 },
        { stem: "老師蹲下來說話，最能看出老師怎麼樣？", options: ["很大聲地罵人", "放低身子，好好教小安", "不想理小安"], answer: 2 },
        { stem: "小安一邊澆水一邊數數字，感覺他當時怎麼樣？", options: ["很生氣", "很專心，一下一下澆", "已經放學了"], answer: 2 },
      ],
    },
    cloze: {
      low: [
        { stem: "小安在＿＿＿＿澆薄荷。", answer: "教室窗邊" },
        { stem: "葉子上掛著＿＿＿＿。", answer: "水珠" },
        { stem: "老師說土＿＿＿＿了才要澆。", answer: "乾" },
        { stem: "小安把薄荷畫進＿＿＿＿。", answer: "日記" },
      ],
      mid: [
        { stem: "小安端著＿＿＿＿，一盆一盆澆。", answer: "澆水壺" },
        { stem: "老師說：「不是天天＿＿＿＿。」", answer: "灌滿" },
        { stem: "小安湊近葉子，聞到淡淡的＿＿＿＿。", answer: "香味" },
        { stem: "日記寫：香味卻留＿＿＿＿。", answer: "好久" },
      ],
      high: [
        { stem: "小安在日記寫，葉子小小的，香味卻＿＿＿＿。", answer: "留好久" },
        { stem: "老師提醒，不是天天＿＿＿＿。", answer: "灌滿" },
        { stem: "放學前，小安把句子寫在＿＿＿＿。", answer: "日記" },
        { stem: "窗邊那盆植物的名字是＿＿＿＿。", answer: "薄荷" },
      ],
    },
    word: {
      low: [
        { word: "香", sampleWord: "香味", sampleSentence: "薄荷有淡淡的香味。" },
        { word: "葉", sampleWord: "葉子", sampleSentence: "窗邊的葉子掛著水珠。" },
        { word: "花", sampleWord: "花盆", sampleSentence: "老師指著花盆說話。" },
        { word: "日", sampleWord: "日記", sampleSentence: "小安把薄荷畫進日記。" },
      ],
      mid: [
        { word: "澆", sampleWord: "澆水", sampleSentence: "小安在教室窗邊澆水。" },
        { word: "盆", sampleWord: "花盆", sampleSentence: "老師指著花盆，說土乾了才要澆。" },
        { word: "味", sampleWord: "香味", sampleSentence: "小安聞到薄荷的香味。" },
        { word: "記", sampleWord: "日記", sampleSentence: "小安在日記寫下薄荷的香味。" },
      ],
      high: [
        { word: "香", sampleWord: "香味", sampleSentence: "小安記得薄荷的香味留了好久。" },
        { word: "澆", sampleWord: "澆水", sampleSentence: "土乾了，小安才去澆水。" },
        { word: "記", sampleWord: "日記", sampleSentence: "小安把看到的薄荷寫進日記。" },
        { word: "葉", sampleWord: "葉子", sampleSentence: "小小的葉子，讓小安想畫進日記。" },
      ],
    },
    short: {
      low: [
        { stem: "小安在哪裡澆薄荷？", answer: "教室窗邊" },
        { stem: "葉子上有什麼？", answer: "水珠" },
        { stem: "老師說土怎麼樣才要澆？", answer: "土乾了" },
        { stem: "小安把薄荷畫進哪裡？", answer: "日記" },
      ],
      mid: [
        { stem: "「不是天天灌滿」是什麼意思？", answer: "不必每天都把水澆滿。" },
        { stem: "小安為什麼把臉湊近葉子？", answer: "他想聞香味。" },
        { stem: "老師蹲下來做什麼？", answer: "指著花盆說話。" },
        { stem: "日記裡的「卻」讓你知道什麼？", answer: "葉子很小，香味卻留很久。" },
      ],
      high: [
        { stem: "這篇主要在說什麼？", answer: "小安學習照顧薄荷，也把感覺寫進日記。" },
        { stem: "為什麼讀日記那一句，會覺得小安喜歡薄荷？", answer: "因為他寫葉子小小的，香味卻留好久。" },
        { stem: "老師蹲下來，可以看出什麼？", answer: "老師放低身子，好好教他。" },
        { stem: "小安一邊澆水一邊數數字，感覺他當時怎麼樣？", answer: "他很專心。" },
      ],
    },
  },
};
