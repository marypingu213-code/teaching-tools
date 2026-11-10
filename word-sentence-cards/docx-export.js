/* 造詞造句分層卡的題目與 Word。
   A4、標楷體／DFKai-SB。低組圈選、中組填空仿寫、高組造詞造句。
   答案在最後一頁。部件比對用老師填的部件，再加上一份常見聲旁。 */
(function (root, factory) {
  var lib = root.docx && root.docx.Document ? root.docx : null;
  if (!lib && typeof module === "object" && module.exports && typeof require === "function") {
    lib = require("../vendor/docx.js");
  }
  var api = factory(lib);
  root.CardDocx = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (docx) {
  "use strict";

  if (!docx) throw new Error("docx 尚未載入");

  var Document = docx.Document;
  var Paragraph = docx.Paragraph;
  var TextRun = docx.TextRun;
  var PageBreak = docx.PageBreak;
  var Table = docx.Table;
  var TableRow = docx.TableRow;
  var TableCell = docx.TableCell;
  var AlignmentType = docx.AlignmentType;
  var LineRuleType = docx.LineRuleType;
  var BorderStyle = docx.BorderStyle;
  var WidthType = docx.WidthType;
  var ShadingType = docx.ShadingType;
  var VerticalAlignTable = docx.VerticalAlignTable;
  var TableLayoutType = docx.TableLayoutType;
  var Packer = docx.Packer;

  var FONT = {
    ascii: "DFKai-SB",
    hAnsi: "DFKai-SB",
    eastAsia: "標楷體",
    hint: "eastAsia",
  };

  var PAGE = { width: 11906, height: 16838, margin: 900 };
  var CONTENT_W = PAGE.width - PAGE.margin * 2;
  var CIRCLED = ["①", "②", "③"];

  var FONT_SIZES = {
    sm: { id: "sm", label: "小", pt: 12, line: 276 },
    md: { id: "md", label: "中", pt: 14, line: 320 },
    lg: { id: "lg", label: "大", pt: 18, line: 360 },
    xl: { id: "xl", label: "特大", pt: 22, line: 360 },
  };

  var LEVELS = {
    low: {
      id: "low",
      label: "低",
      name: "低組",
      color: "246B45",
      tint: "E7F3EC",
      instruction: "看生字，把詞補完，再圈出正確的字。",
    },
    mid: {
      id: "mid",
      label: "中",
      name: "中組",
      color: "8A5A12",
      tint: "FBF3E4",
      instruction: "選一個詞語填進句子，再看例句仿寫一句。",
    },
    high: {
      id: "high",
      label: "高",
      name: "高組",
      color: "8D2F3B",
      tint: "F8E8EB",
      instruction: "用生字造兩個詞，再造一個句子。",
    },
  };

  /* 聲旁 → 含這個聲旁的常見字。通用部首（氵、扌、口）不放這裡。 */
  var COMPONENT_OF = {
    "度": "渡鍍踱",
    "青": "清請情晴精睛靖靜",
    "包": "跑泡抱飽炮袍",
    "兆": "桃挑跳逃姚眺",
    "巴": "把爸吧爬芭疤",
    "皮": "波破披被坡玻",
    "交": "校較郊效咬跤",
    "肖": "消悄稍哨銷宵",
    "每": "海梅莓霉",
    "寺": "持待特詩等",
    "分": "份粉芬紛盼",
    "方": "放房訪防紡芳",
    "馬": "媽嗎罵碼",
    "門": "問聞悶們",
    "果": "課棵顆",
    "直": "植值置",
    "者": "都著諸豬煮",
    "主": "住注柱註駐",
    "古": "故姑苦估固胡",
    "胡": "湖糊蝴",
    "可": "河何哥呵",
    "哥": "歌",
    "奇": "寄騎椅崎",
    "己": "記起紀",
    "令": "冷領鈴零齡",
    "工": "紅江空功虹",
    "共": "洪哄供恭",
    "良": "浪狼娘",
    "長": "張帳漲",
    "昌": "唱倡",
    "尚": "常堂賞掌當",
    "當": "檔擋",
    "相": "想箱湘",
    "且": "姐祖助",
    "召": "招照超紹",
    "少": "沙吵炒",
    "丁": "打訂頂",
    "成": "城誠",
    "元": "玩完",
    "袁": "園遠",
    "非": "啡排悲",
    "夬": "快決",
    "夾": "俠狹",
    "兼": "嫌謙",
    "舀": "蹈稻",
    "台": "抬始治",
    "司": "詞飼",
    "及": "吸級",
    "反": "返飯板",
    "半": "伴胖",
    "番": "翻播",
    "幾": "機譏饑",
    "段": "鍛",
    "舌": "話活括",
    "采": "菜彩",
    "辡": "辯辨辦瓣",
    "央": "英映秧",
    "敖": "熬傲",
    "堯": "燒繞曉",
    "曹": "槽遭",
    "翟": "耀躍",
    "昜": "陽揚湯場",
    "也": "他地池她",
    "勺": "的約釣",
    "句": "狗夠",
    "莫": "摸模漠",
    "昔": "惜錯",
    "乍": "作昨炸",
    "中": "仲忠沖",
    "生": "星姓性",
    "亡": "忙忘",
    "余": "除徐",
    "真": "鎮填",
    "量": "糧",
  };

  /* 形近字。只在沒有勾「只出部件相同的字」時，用來把較像的字排到選項前面。 */
  var LOOKALIKE = ["己已巳", "戊戍戌", "未末", "土士", "日曰", "人入", "鳴嗚", "候侯", "折拆", "競竟", "柬東", "貝見", "天夭", "午牛", "烏鳥", "今令", "刀力", "買賣"];

  var GENERIC = "氵扌口木艹言訁金釒女亻忄心月日目虫糹糸足辶頁石土火灬雨竹宀广食飠魚車貝王礻示耳米田山刂刀力犭犬疒阝尸戶户皿彳彡攵夂又寸弓戈斤欠止瓦缶矢衣見角豆豕酉冫丶亠冖穴爪父";

  function cleanLine(value) {
    return String(value == null ? "" : value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function firstHan(text) {
    var found = String(text || "").match(/[\u3400-\u9FFF\uF900-\uFAFF]/);
    return found ? found[0] : "";
  }

  function parseChars(text) {
    var found = String(text || "").match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) || [];
    var seen = {};
    var out = [];
    found.forEach(function (ch) {
      if (!seen[ch]) {
        seen[ch] = true;
        out.push(ch);
      }
    });
    return out;
  }

  function parseParts(value) {
    if (Array.isArray(value)) {
      return value.map(cleanLine).filter(Boolean);
    }
    return String(value || "")
      .split(/[\s、,，;；/／|｜]+/)
      .map(cleanLine)
      .filter(Boolean);
  }

  function suggestParts(ch) {
    var list = [];
    Object.keys(COMPONENT_OF).forEach(function (part) {
      if (COMPONENT_OF[part].indexOf(ch) !== -1 && list.indexOf(part) === -1) list.push(part);
    });
    return list.join("、");
  }

  function isGeneric(part) {
    return part.length === 1 && GENERIC.indexOf(part) !== -1;
  }

  function collectParts(item) {
    var own = item && item.char;
    var explicit = parseParts(item && item.parts).filter(function (part) {
      return part && part !== own;
    });
    var all = explicit.slice();
    function add(part) {
      if (part && part !== own && all.indexOf(part) === -1) all.push(part);
    }
    if (own) {
      Object.keys(COMPONENT_OF).forEach(function (part) {
        if (COMPONENT_OF[part].indexOf(own) !== -1) add(part);
      });
    }
    all.slice().forEach(function (part) {
      Object.keys(COMPONENT_OF).forEach(function (key) {
        if (COMPONENT_OF[key].indexOf(part) !== -1) add(key);
      });
    });
    return { explicit: explicit, all: all };
  }

  function sharesComponent(a, b) {
    if (!a || !b || !a.char || !b.char || a.char === b.char) return false;
    var pa = collectParts(a);
    var pb = collectParts(b);
    if (pa.all.indexOf(b.char) !== -1 || pb.all.indexOf(a.char) !== -1) return true;
    var i;
    for (i = 0; i < pa.all.length; i += 1) {
      if (pb.all.indexOf(pa.all[i]) !== -1 && !isGeneric(pa.all[i])) return true;
    }
    for (i = 0; i < pa.explicit.length; i += 1) {
      if (!isGeneric(pa.explicit[i]) && pb.explicit.indexOf(pa.explicit[i]) !== -1) return true;
    }
    return false;
  }

  function looksAlike(a, b) {
    if (!a || !b || a === b) return false;
    var i;
    for (i = 0; i < LOOKALIKE.length; i += 1) {
      if (LOOKALIKE[i].indexOf(a) !== -1 && LOOKALIKE[i].indexOf(b) !== -1) return true;
    }
    return false;
  }

  function repeat(ch, count) {
    var text = "";
    var i;
    for (i = 0; i < count; i += 1) text += ch;
    return text;
  }

  function longBlank(pt) {
    return repeat("＿", pt >= 20 ? 12 : pt >= 16 ? 16 : 20);
  }

  function safeFile(name) {
    var cleaned = String(name || "")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || "造詞造句卡";
  }

  function sheetTitle(grade, label) {
    var base = String(grade || "").trim();
    var name = base ? base + "造詞造句卡" : "造詞造句卡";
    return name + "（" + label + "）";
  }

  function fileName(grade, levelId) {
    var spec = LEVELS[levelId] || LEVELS.low;
    return safeFile(sheetTitle(grade, spec.label)) + ".docx";
  }

  function zipName(grade, levelIds) {
    var base = String(grade || "").trim();
    var name = base ? base + "造詞造句卡" : "造詞造句卡";
    var labels = (levelIds || []).map(function (id) {
      return (LEVELS[id] || {}).label || "";
    }).join("");
    return safeFile(name + "_" + (labels || "分層")) + ".zip";
  }

  function fontSpec(fontSize) {
    var picked = FONT_SIZES[fontSize] || FONT_SIZES.lg;
    return {
      id: picked.id,
      label: picked.label,
      pt: picked.pt,
      line: picked.line,
      bodyHalf: picked.pt * 2,
      titleHalf: (picked.pt + 4) * 2,
      bigHalf: (picked.pt + 14) * 2,
    };
  }

  function cardsPerPage(layout, fontId) {
    if (layout !== "sheet") return 1;
    if (fontId === "sm") return 3;
    if (fontId === "md") return 3;
    return 2;
  }

  function cleanWords(char, words) {
    var list = Array.isArray(words) ? words : [];
    var out = [];
    list.forEach(function (word) {
      if (out.length >= 5) return;
      var text = cleanLine(word && (word.text || word.word));
      if (!text) return;
      var sentences = [];
      var raw = word && (word.sentences || word.examples) || [];
      if (!Array.isArray(raw)) raw = [raw];
      if (word && word.sentence) raw = [word.sentence].concat(raw);
      raw.forEach(function (sentence) {
        var line = cleanLine(sentence);
        if (line && sentences.length < 2) sentences.push(line);
      });
      out.push({
        text: text,
        zhuyin: cleanLine(word.zhuyin).replace(/[()（）]/g, ""),
        sentences: sentences,
        forLow: !!word.forLow,
      });
    });
    var picked = false;
    out.forEach(function (word) {
      if (word.forLow && !picked) picked = true;
      else word.forLow = false;
    });
    if (!picked && out.length) {
      var i;
      for (i = 0; i < out.length; i += 1) {
        if (char && out[i].text.indexOf(char) !== -1) {
          out[i].forLow = true;
          picked = true;
          break;
        }
      }
      if (!picked) out[0].forLow = true;
    }
    return out;
  }

  function cleanItems(items, warnings) {
    var list = Array.isArray(items) ? items : [];
    var seen = {};
    var out = [];
    var dup = [];
    list.forEach(function (item) {
      var ch = firstHan(item && item.char);
      if (!ch) return;
      if (seen[ch]) {
        dup.push(ch);
        return;
      }
      seen[ch] = true;
      out.push({
        char: ch,
        zhuyin: cleanLine(item.zhuyin).replace(/[()（）]/g, ""),
        parts: item.parts,
        hint: cleanLine(item.hint),
        words: cleanWords(ch, item.words),
      });
    });
    if (dup.length) warnings.push("生字重複，只保留先出現的：" + dup.join("、") + "。");
    return out;
  }

  function lowWordOf(words) {
    var i;
    for (i = 0; i < words.length; i += 1) {
      if (words[i].forLow) return words[i];
    }
    return words[0] || null;
  }

  function clozeWord(word, ch) {
    if (!word || word.indexOf(ch) === -1) return "□";
    return word.split(ch).join("□");
  }

  function endPunct(sentence) {
    return /[。！？!?]$/.test(sentence) ? sentence.slice(-1) : "。";
  }

  function blankWord(sentence, word) {
    var idx = sentence.indexOf(word);
    if (idx < 0) return sentence + "＿＿＿＿";
    return sentence.slice(0, idx) + "＿＿＿＿" + sentence.slice(idx + word.length);
  }

  function blankEnding(sentence, word) {
    var idx = sentence.indexOf(word);
    if (idx < 0) return "＿＿＿＿＿＿＿＿";
    var core = sentence.slice(idx + word.length).replace(/[。！？!?\s]/g, "");
    if (core.length >= 2) return sentence.slice(0, idx) + word + "＿＿＿＿" + endPunct(sentence);
    return blankWord(sentence, word);
  }

  function sentenceEntries(words) {
    var list = [];
    words.forEach(function (word) {
      word.sentences.forEach(function (sentence) {
        list.push({ word: word.text, sentence: sentence });
      });
    });
    return list;
  }

  function pickFill(entries, preferWord) {
    var i;
    for (i = 0; i < entries.length; i += 1) {
      if (entries[i].word === preferWord && entries[i].sentence.indexOf(preferWord) !== -1) return entries[i];
    }
    for (i = 0; i < entries.length; i += 1) {
      if (entries[i].sentence.indexOf(entries[i].word) !== -1) return entries[i];
    }
    return entries[0] || null;
  }

  function labeledChar(item, showZhuyin) {
    if (showZhuyin && item.zhuyin) return item.char + "（" + item.zhuyin + "）";
    return item.char;
  }

  function chooseDistractors(item, items, sameOnly) {
    var pool = [];
    items.forEach(function (other) {
      if (!other.char || other.char === item.char) return;
      var same = sharesComponent(item, other);
      if (sameOnly && !same) return;
      pool.push({
        item: other,
        rank: same ? 0 : looksAlike(item.char, other.char) ? 1 : 2,
      });
    });
    pool.sort(function (a, b) { return a.rank - b.rank; });
    return pool.slice(0, 2).map(function (row) { return row.item; });
  }

  function placeAnswer(answer, distractors, index) {
    var list = distractors.slice();
    var at = list.length ? index % (list.length + 1) : 0;
    list.splice(at, 0, answer);
    return list;
  }

  function buildLow(item, items, index, opts, warnings) {
    var word = lowWordOf(item.words);
    var missing = [];
    var distractors = chooseDistractors(item, items, opts.sameComponentOnly);
    if (opts.sameComponentOnly && !distractors.length) missing.push(item.char);
    var choices = placeAnswer(item, distractors, index);
    var answerAt = 0;
    choices.forEach(function (choice, choiceIndex) {
      if (choice.char === item.char) answerAt = choiceIndex;
    });
    var lines = [{ kind: "lead", text: "把詞補完，圈出正確的字。" }];
    var cloze = "□";
    var wordText = "";
    if (!word) {
      lines.push({ kind: "note", text: "（這個字還沒有詞語，先圈出上面的生字。）" });
      warnings.push("「" + item.char + "」還沒有詞語，低組只出圈選。");
    } else if (word.text.indexOf(item.char) === -1) {
      lines.push({ kind: "note", text: "（低組要挖空的詞裡沒有這個字，請改詞或改選「低組挖空」。）" });
      warnings.push("「" + item.char + "」的低組詞語沒有這個字，挖空只顯示□。");
    } else {
      cloze = clozeWord(word.text, item.char);
      wordText = word.text;
      if (opts.showZhuyin && word.zhuyin) lines.push({ kind: "ruby", text: word.zhuyin });
    }
    lines.push({ kind: "cloze", text: cloze });
    choices.forEach(function (choice, choiceIndex) {
      lines.push({ kind: "choice", text: CIRCLED[choiceIndex] + "　" + labeledChar(choice, opts.showZhuyin) });
    });
    var answer = (index + 1) + ". " + item.char + "　" + cloze + "　答案：" + CIRCLED[answerAt] + " " + item.char;
    if (wordText) answer += "　詞語：" + wordText;
    return { lines: lines, answer: answer, missing: missing };
  }

  function buildMid(item, index, opts, warnings) {
    var words = item.words;
    var lines = [];
    var answer = (index + 1) + ". " + item.char;
    if (!words.length) {
      lines.push({ kind: "note", text: "（這個字還沒有詞語，請先在表格補上。）" });
      lines.push({ kind: "lead", text: "一、寫一個詞語。" });
      lines.push({ kind: "write", text: "＿＿＿＿" });
      lines.push({ kind: "lead", text: "二、造一個句子。" });
      lines.push({ kind: "write", text: longBlank(opts.pt) });
      warnings.push("「" + item.char + "」還沒有詞語，中組只留空白。");
      return { lines: lines, answer: answer + "　（未填詞語）" };
    }
    var bank = "詞語：" + words.map(function (word) {
      return labeledChar({ char: word.text, zhuyin: word.zhuyin }, opts.showZhuyin);
    }).join("　");
    lines.push({ kind: "bank", text: bank });
    var prefer = lowWordOf(words);
    var entries = sentenceEntries(words);
    var fill = pickFill(entries, prefer ? prefer.text : "");
    lines.push({ kind: "lead", text: "一、選一個詞語，填進句子。" });
    if (fill) {
      lines.push({ kind: "write", text: blankWord(fill.sentence, fill.word) });
      answer += "　填空：" + fill.word;
    } else {
      lines.push({ kind: "write", text: "＿＿＿＿＿＿＿＿。" });
      answer += "　填空：（未填例句）";
      warnings.push("「" + item.char + "」還沒有例句，中組填空沒有句子。");
    }
    var imitate = null;
    var i;
    for (i = 0; i < entries.length; i += 1) {
      if (entries[i] !== fill) {
        imitate = entries[i];
        break;
      }
    }
    if (!imitate) imitate = fill;
    lines.push({ kind: "lead", text: "二、看例句，仿寫一句。" });
    if (imitate) {
      lines.push({ kind: "example", text: "例句：" + imitate.sentence });
      lines.push({ kind: "write", text: blankEnding(imitate.sentence, imitate.word) });
      answer += "　仿寫參考：" + imitate.sentence;
    } else {
      lines.push({ kind: "write", text: longBlank(opts.pt) });
    }
    return { lines: lines, answer: answer };
  }

  function buildHigh(item, index, opts) {
    var lines = [
      { kind: "lead", text: "一、用「" + item.char + "」造兩個詞。" },
      { kind: "write", text: "＿＿＿＿　　＿＿＿＿" },
      { kind: "lead", text: "二、再造一個句子。" },
    ];
    if (opts.showHint && item.hint) lines.push({ kind: "hint", text: "提示：" + item.hint });
    lines.push({ kind: "write", text: longBlank(opts.pt) });
    lines.push({ kind: "write", text: longBlank(opts.pt) });
    var words = item.words.map(function (word) { return word.text; });
    var sample = "";
    item.words.forEach(function (word) {
      if (!sample && word.sentences.length) sample = word.sentences[0];
    });
    var answer = (index + 1) + ". " + item.char;
    answer += "　參考詞語：" + (words.length ? words.join("、") : "（未填）");
    if (sample) answer += "　參考句：" + sample;
    return { lines: lines, answer: answer };
  }

  function prepare(input) {
    var src = input || {};
    var level = LEVELS[src.level] || LEVELS.low;
    var font = fontSpec(src.fontSize);
    var opts = {
      showZhuyin: !!src.showZhuyin,
      sameComponentOnly: !!src.sameComponentOnly,
      showHint: src.showHint !== false,
      pt: font.pt,
    };
    var warnings = [];
    var items = cleanItems(src.items, warnings);
    var cards = [];
    var answers = [];
    var missing = [];
    items.forEach(function (item, index) {
      var built = level.id === "mid"
        ? buildMid(item, index, opts, warnings)
        : level.id === "high"
          ? buildHigh(item, index, opts)
          : buildLow(item, items, index, opts, warnings);
      if (built.missing && built.missing.length) missing = missing.concat(built.missing);
      cards.push({
        n: index + 1,
        char: item.char,
        zhuyin: item.zhuyin,
        showZhuyin: opts.showZhuyin,
        lines: built.lines,
      });
      answers.push(built.answer);
    });
    if (level.id === "low" && missing.length) {
      warnings.unshift("這些字找不到部件相同的選項，低組只列出正確字：" + missing.join("、") + "。可以在「部件」欄填上一樣的部件，或取消「只出部件相同的字」。");
    }
    var per = cardsPerPage(src.layout, font.id);
    var pages = [];
    cards.forEach(function (card, index) {
      if (index % per === 0) pages.push({ cards: [] });
      pages[pages.length - 1].cards.push(card);
    });
    if (!pages.length) pages.push({ cards: [] });
    var title = sheetTitle(src.grade, level.label);
    var answerPage = src.includeAnswers === false ? null : {
      title: "答案（" + level.label + "）",
      lines: answers.length ? answers : ["（沒有生字）"],
    };
    return {
      level: level,
      font: font,
      title: title,
      instruction: level.instruction,
      grade: cleanLine(src.grade),
      layout: src.layout === "sheet" ? "sheet" : "card",
      pages: pages,
      answerPage: answerPage,
      screenKey: answers.length ? answers : ["（沒有生字）"],
      warnings: warnings,
    };
  }

  function run(text, spec, extra) {
    var opts = extra || {};
    var config = {
      text: text,
      font: FONT,
      size: opts.size || spec.bodyHalf,
      bold: !!opts.bold,
    };
    if (opts.color) config.color = opts.color;
    return new TextRun(config);
  }

  function para(spec, runs, extra) {
    var opts = extra || {};
    return new Paragraph({
      alignment: opts.align,
      spacing: {
        before: opts.before || 0,
        after: opts.after == null ? 40 : opts.after,
        line: spec.line,
        lineRule: LineRuleType.AUTO,
      },
      children: runs,
    });
  }

  function side(color) {
    return { style: BorderStyle.SINGLE, size: 12, color: color };
  }

  function borders(color) {
    var edge = side(color);
    return { top: edge, bottom: edge, left: edge, right: edge };
  }

  function cardTable(card, model) {
    var spec = model.font;
    var level = model.level;
    var headParas = [
      para(spec, [run("第 " + card.n + " 字　" + level.name, spec, { bold: true, color: level.color })], { after: 40 }),
      para(spec, [run("生字", spec, { color: "5E534A", size: Math.max(20, spec.bodyHalf - 4) })], { after: 0 }),
    ];
    var leftChildren = [
      para(spec, [run(card.char, spec, { size: spec.bigHalf, bold: true, color: level.color })], {
        align: AlignmentType.CENTER,
        after: 0,
      }),
    ];
    if (card.showZhuyin && card.zhuyin) {
      leftChildren.push(para(spec, [run(card.zhuyin, spec, { size: Math.max(18, spec.bodyHalf - 6), color: level.color })], {
        align: AlignmentType.CENTER,
        after: 0,
      }));
    }
    var body = card.lines.map(function (line) {
      if (line.kind === "cloze") {
        return para(spec, [run(line.text, spec, { size: spec.bigHalf, bold: true, color: level.color })], { after: 80 });
      }
      if (line.kind === "ruby") {
        return para(spec, [run(line.text, spec, { size: Math.max(18, spec.bodyHalf - 6) })], { after: 20 });
      }
      if (line.kind === "choice") {
        return para(spec, [run("　　" + line.text, spec)], { after: 60 });
      }
      if (line.kind === "hint" || line.kind === "note") {
        return para(spec, [run(line.text, spec, { color: "5E534A" })], { after: 40 });
      }
      if (line.kind === "bank" || line.kind === "lead") {
        return para(spec, [run(line.text, spec, { bold: true })], { after: 40 });
      }
      return para(spec, [run(line.text, spec)], { after: line.kind === "write" ? 80 : 40 });
    });
    if (!body.length) body.push(para(spec, [run("（沒有題目）", spec)]));
    return new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [1500, CONTENT_W - 1500],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 1500, type: WidthType.DXA },
              verticalAlign: VerticalAlignTable.CENTER,
              shading: { type: ShadingType.CLEAR, fill: level.tint },
              borders: borders(level.color),
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: leftChildren,
            }),
            new TableCell({
              width: { size: CONTENT_W - 1500, type: WidthType.DXA },
              verticalAlign: VerticalAlignTable.CENTER,
              shading: { type: ShadingType.CLEAR, fill: level.tint },
              borders: borders(level.color),
              margins: { top: 80, bottom: 80, left: 140, right: 120 },
              children: headParas,
            }),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 2,
              width: { size: CONTENT_W, type: WidthType.DXA },
              borders: borders(level.color),
              margins: { top: 80, bottom: 100, left: 160, right: 140 },
              children: body,
            }),
          ],
        }),
      ],
    });
  }

  function buildDocument(model) {
    var spec = model.font;
    var children = [];
    model.pages.forEach(function (page, pageIndex) {
      if (pageIndex > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(para(spec, [run(model.title, spec, { size: spec.titleHalf, bold: true })], {
        align: AlignmentType.CENTER,
        after: 60,
      }));
      children.push(para(spec, [run("班級：＿＿＿＿　座號：＿＿　姓名：＿＿＿＿＿＿", spec)], {
        align: AlignmentType.CENTER,
        after: 80,
      }));
      children.push(para(spec, [run(model.instruction, spec)], { after: 120 }));
      if (!page.cards.length) {
        children.push(para(spec, [run("（沒有生字）", spec)]));
      }
      page.cards.forEach(function (card, cardIndex) {
        children.push(cardTable(card, model));
        if (cardIndex < page.cards.length - 1) {
          children.push(para(spec, [run(" ", spec, { size: 16 })], { after: 160 }));
        }
      });
    });
    if (model.answerPage) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(para(spec, [run(model.answerPage.title, spec, { size: spec.titleHalf, bold: true })], {
        after: 80,
      }));
      model.answerPage.lines.forEach(function (line) {
        children.push(para(spec, [run(line, spec)], { after: 60 }));
      });
    }
    return new Document({
      title: model.title,
      creator: "教學設計工具箱",
      description: "造詞造句分層卡",
      styles: {
        default: {
          document: {
            run: {
              font: FONT,
              size: spec.bodyHalf,
              language: { value: "zh-TW", eastAsia: "zh-TW" },
            },
            paragraph: {
              spacing: { after: 40, line: spec.line, lineRule: LineRuleType.AUTO },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: PAGE.width, height: PAGE.height },
              margin: {
                top: PAGE.margin,
                right: PAGE.margin,
                bottom: PAGE.margin,
                left: PAGE.margin,
                header: 720,
                footer: 720,
                gutter: 0,
              },
            },
          },
          children: children,
        },
      ],
    });
  }

  function toBlob(input) {
    return Packer.toBlob(buildDocument(prepare(input)));
  }

  function toBuffer(input) {
    return Packer.toBuffer(buildDocument(prepare(input)));
  }

  return {
    LEVELS: LEVELS,
    FONT_SIZES: FONT_SIZES,
    parseChars: parseChars,
    suggestParts: suggestParts,
    sharesComponent: sharesComponent,
    looksAlike: looksAlike,
    prepare: prepare,
    sheetTitle: sheetTitle,
    fileName: fileName,
    zipName: zipName,
    toBlob: toBlob,
    toBuffer: toBuffer,
  };
});
