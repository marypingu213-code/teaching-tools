/* 分層學習單的 Word 版面。
   對齊既有範例：A4、四邊 1.8 公分、標楷體／DFKai-SB。
   低：內文 17pt、行距 1.5。中：13pt、行距 1.25。高：12.5pt、行距 1.2。
   字級單位是半點（17pt = 34）。答案在最後一頁。 */
(function (root, factory) {
  var lib = root.docx && root.docx.Document ? root.docx : null;
  if (!lib && typeof module === "object" && module.exports && typeof require === "function") {
    lib = require("../vendor/docx.js");
  }
  var api = factory(lib);
  root.WorksheetDocx = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (docx) {
  "use strict";

  if (!docx) throw new Error("docx 尚未載入");

  var Document = docx.Document;
  var Paragraph = docx.Paragraph;
  var TextRun = docx.TextRun;
  var PageBreak = docx.PageBreak;
  var AlignmentType = docx.AlignmentType;
  var LineRuleType = docx.LineRuleType;
  var Packer = docx.Packer;

  var FONT = {
    ascii: "DFKai-SB",
    hAnsi: "DFKai-SB",
    eastAsia: "標楷體",
    hint: "eastAsia",
  };

  var CIRCLED = ["①", "②", "③"];

  var LEVELS = {
    low: {
      id: "low",
      label: "低",
      bodyHalfPoints: 34,
      titleHalfPoints: 42,
      answerTitleHalfPoints: 38,
      line: 360,
      lineHeight: 1.5,
      pt: 17,
    },
    mid: {
      id: "mid",
      label: "中",
      bodyHalfPoints: 26,
      titleHalfPoints: 34,
      answerTitleHalfPoints: 30,
      line: 300,
      lineHeight: 1.25,
      pt: 13,
    },
    high: {
      id: "high",
      label: "高",
      bodyHalfPoints: 25,
      titleHalfPoints: 33,
      answerTitleHalfPoints: 29,
      line: 288,
      lineHeight: 1.2,
      pt: 12.5,
    },
  };

  var INSTRUCTIONS = {
    choice: "請選出正確的答案，把號碼寫在（　）裡。",
    cloze: "請把答案寫在（　）裡。",
    word: "請造詞、造句，寫在橫線上。",
    short: "請把答案寫在橫線上。",
  };

  function sheetTitle(titleBase, label) {
    var base = String(titleBase || "").trim() || "學習單";
    if (/學習單$/.test(base)) return base + "（" + label + "）";
    return base + "學習單（" + label + "）";
  }

  function safeFile(name) {
    var cleaned = String(name || "")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || "學習單";
  }

  function fileName(titleBase, levelId) {
    var spec = LEVELS[levelId];
    return safeFile(sheetTitle(titleBase, spec.label)) + ".docx";
  }

  function zipName(titleBase) {
    var base = sheetTitle(titleBase, "低").replace(/（低）$/, "");
    return safeFile(base + "_低中高") + ".zip";
  }

  function run(text, spec, extra) {
    var opts = extra || {};
    return new TextRun({
      text: text,
      font: FONT,
      size: opts.size || spec.bodyHalfPoints,
      bold: !!opts.bold,
    });
  }

  function para(spec, runs, extra) {
    var opts = extra || {};
    var children = runs.slice();
    if (opts.pageBreakAfter) children.push(new PageBreak());
    return new Paragraph({
      alignment: opts.align,
      spacing: {
        before: 0,
        after: opts.after == null ? 40 : opts.after,
        line: spec.line,
        lineRule: LineRuleType.AUTO,
      },
      children: children,
    });
  }

  function cleanLine(value) {
    return String(value == null ? "" : value).replace(/[\r\n]+/g, "").trim();
  }

  function circled(answer) {
    var n = Number(answer);
    return CIRCLED[n - 1] || "①";
  }

  function optionsOf(question) {
    var raw = question && question.options;
    var list = Array.isArray(raw) ? raw : [];
    var out = [0, 1, 2].map(function (i) {
      return cleanLine(list[i]);
    });
    return out;
  }

  function optionLine(options) {
    return "　　" + options.map(function (text, i) {
      return CIRCLED[i] + text;
    }).join("　");
  }

  function ensureBlank(stem) {
    if (stem.indexOf("＿") !== -1) return stem;
    return stem + "＿＿＿＿";
  }

  function blankRunCount(levelId) {
    if (levelId === "high") return 22;
    if (levelId === "mid") return 20;
    return 16;
  }

  function answerPhrase(questionType, question) {
    if (questionType === "choice") return circled(question.answer);
    if (questionType === "word") {
      var word = cleanLine(question.sampleWord) || "（未填）";
      var sentence = cleanLine(question.sampleSentence) || "（未填）";
      return "造詞：" + word + "　造句：" + sentence;
    }
    return cleanLine(question.answer) || "（未填）";
  }

  function formatKeyLines(questionType, questions) {
    var list = questions || [];
    if (!list.length) return ["（沒有題目）"];
    if (questionType === "choice") {
      return [
        list.map(function (q, i) {
          return (i + 1) + "." + circled(q.answer);
        }).join("　"),
      ];
    }
    return list.map(function (q, i) {
      return (i + 1) + ". " + answerPhrase(questionType, q);
    });
  }

  function questionBlocks(questionType, spec, question, n) {
    var stem = cleanLine(question.stem);
    if (questionType === "choice") {
      return [
        { runs: [run("（　）" + n + ". " + stem, spec)], after: 40 },
        { runs: [run(optionLine(optionsOf(question)), spec)], after: 120 },
      ];
    }
    if (questionType === "cloze") {
      return [
        { runs: [run("（　）" + n + ". " + ensureBlank(stem), spec)], after: 120 },
      ];
    }
    if (questionType === "word") {
      var word = cleanLine(question.word) || stem;
      var underscores = "＿".repeat(blankRunCount(spec.id));
      return [
        { runs: [run("（　）" + n + ". " + word, spec)], after: 40 },
        { runs: [run("　　造詞：" + "＿".repeat(8), spec)], after: 40 },
        { runs: [run("　　造句：" + underscores, spec)], after: 120 },
      ];
    }
    var lines = spec.id === "high" ? 3 : 2;
    var blocks = [
      { runs: [run("（　）" + n + ". " + stem, spec)], after: 40 },
    ];
    var i;
    for (i = 0; i < lines; i += 1) {
      blocks.push({
        runs: [run("　　" + "＿".repeat(blankRunCount(spec.id)), spec)],
        after: i === lines - 1 ? 120 : 40,
      });
    }
    return blocks;
  }

  function buildWorksheet(input) {
    var spec = LEVELS[input.level];
    if (!spec) throw new Error("未知的程度");
    var questions = Array.isArray(input.questions) ? input.questions : [];
    var questionType = input.questionType || "choice";
    var title = sheetTitle(input.titleBase, spec.label);
    var children = [];

    children.push(para(spec, [run(title, spec, { size: spec.titleHalfPoints, bold: true })], {
      align: AlignmentType.CENTER,
    }));
    children.push(para(spec, [run("班級：＿＿＿＿　座號：＿＿＿　姓名：＿＿＿＿＿＿", spec)], {
      align: AlignmentType.CENTER,
    }));
    children.push(para(spec, [run(INSTRUCTIONS[questionType] || INSTRUCTIONS.choice, spec)]));

    if (!questions.length) {
      children.push(para(spec, [run("（沒有題目）", spec)], { pageBreakAfter: true }));
    } else {
      questions.forEach(function (question, index) {
        var blocks = questionBlocks(questionType, spec, question || {}, index + 1);
        blocks.forEach(function (block, blockIndex) {
          var last = index === questions.length - 1 && blockIndex === blocks.length - 1;
          children.push(para(spec, block.runs, {
            after: block.after,
            pageBreakAfter: last,
          }));
        });
      });
    }

    children.push(para(spec, [run("答案（" + spec.label + "）", spec, {
      size: spec.answerTitleHalfPoints,
      bold: true,
    })]));
    formatKeyLines(questionType, questions).forEach(function (line) {
      children.push(para(spec, [run(line, spec)]));
    });

    return new Document({
      title: title,
      creator: "教學設計工具箱",
      description: "分層學習單",
      styles: {
        default: {
          document: {
            run: {
              font: FONT,
              size: spec.bodyHalfPoints,
              language: { value: "zh-TW", eastAsia: "zh-TW" },
            },
            paragraph: {
              spacing: {
                after: 40,
                line: spec.line,
                lineRule: LineRuleType.AUTO,
              },
            },
          },
        },
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            quickFormat: true,
            run: {
              font: FONT,
              size: spec.bodyHalfPoints,
            },
            paragraph: {
              spacing: {
                after: 40,
                line: spec.line,
                lineRule: LineRuleType.AUTO,
              },
            },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: {
                top: 1020,
                right: 1020,
                bottom: 1020,
                left: 1020,
                header: 720,
                footer: 720,
                gutter: 0,
              },
            },
            grid: { linePitch: 360 },
          },
          children: children,
        },
      ],
    });
  }

  function toBlob(input) {
    return Packer.toBlob(buildWorksheet(input));
  }

  function toBuffer(input) {
    return Packer.toBuffer(buildWorksheet(input));
  }

  return {
    LEVELS: LEVELS,
    INSTRUCTIONS: INSTRUCTIONS,
    sheetTitle: sheetTitle,
    fileName: fileName,
    zipName: zipName,
    formatKeyLines: formatKeyLines,
    buildWorksheet: buildWorksheet,
    toBlob: toBlob,
    toBuffer: toBuffer,
  };
});
