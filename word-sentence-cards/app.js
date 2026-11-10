(function () {
  "use strict";

  var STORAGE_KEY = "toolbox.settings.v1";
  var PREF_KEY = "word-sentence-cards.prefs.v1";
  var DRAFT_KEY = "word-sentence-cards.draft.v1";
  var LEVEL_ORDER = ["low", "mid", "high"];

  var state = {
    items: [],
    tab: "low",
    models: {},
    busy: false,
  };
  var seq = 1;
  var draftTimer = 0;
  var previewTimer = 0;

  function $(id) { return document.getElementById(id); }

  function show(id, kind, message) {
    var node = $(id);
    node.hidden = !message;
    node.className = "banner " + (kind || "ok") + (id === "preview-warnings" ? " no-print" : "");
    node.textContent = message || "";
  }

  function uid(prefix) {
    seq += 1;
    return prefix + "-" + seq;
  }

  function readStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (err) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function currentProvider() {
    var picked = document.querySelector('input[name="provider"]:checked');
    return picked ? picked.value : "gemini";
  }

  function settingsFromForm() {
    return {
      provider: currentProvider(),
      geminiModel: $("gemini-model").value.trim() || "gemini-2.5-flash",
      geminiKey: $("gemini-key").value.trim(),
      openaiModel: $("openai-model").value.trim() || "gpt-4o-mini",
      openaiKey: $("openai-key").value.trim(),
    };
  }

  function applySettings(saved) {
    var data = saved || {};
    var provider = data.provider === "openai" ? "openai" : "gemini";
    document.querySelector('input[name="provider"][value="' + provider + '"]').checked = true;
    if (data.geminiModel) $("gemini-model").value = data.geminiModel;
    if (data.geminiKey) $("gemini-key").value = data.geminiKey;
    if (data.openaiModel) $("openai-model").value = data.openaiModel;
    if (data.openaiKey) $("openai-key").value = data.openaiKey;
    syncProviderFields();
    updateSettingsStatus();
  }

  function saveSettings(announce) {
    var prev = readStorage(STORAGE_KEY) || {};
    var data = settingsFromForm();
    var next = {};
    Object.keys(prev).forEach(function (key) { next[key] = prev[key]; });
    Object.keys(data).forEach(function (key) { next[key] = data[key]; });
    var ok = writeStorage(STORAGE_KEY, next);
    updateSettingsStatus();
    if (announce) {
      show("form-status", ok ? "ok" : "error", ok
        ? "已儲存在這台瀏覽器。這個網站看不到你的金鑰。"
        : "這台瀏覽器沒有把金鑰存下來。仍可在這次分頁裡使用，但重新整理後要再貼一次。");
      show("form-error", "error", "");
      if (ok && (data.geminiKey || data.openaiKey)) $("settings").open = false;
    }
    return data;
  }

  function updateSettingsStatus() {
    var data = settingsFromForm();
    var has = data.provider === "openai" ? !!data.openaiKey : !!data.geminiKey;
    var name = data.provider === "openai" ? "OpenAI" : "Gemini";
    $("settings-status").textContent = has ? "已儲存 " + name + " 金鑰" : "尚未儲存金鑰";
  }

  function syncProviderFields() {
    var openai = currentProvider() === "openai";
    $("gemini-fields").hidden = openai;
    $("openai-fields").hidden = !openai;
    updateSettingsStatus();
  }

  function clearSettings() {
    var prev = readStorage(STORAGE_KEY) || {};
    prev.geminiKey = "";
    prev.openaiKey = "";
    $("gemini-key").value = "";
    $("openai-key").value = "";
    writeStorage(STORAGE_KEY, prev);
    updateSettingsStatus();
    show("form-status", "ok", "金鑰已從這台瀏覽器清除。");
    show("form-error", "error", "");
    $("settings").open = true;
  }

  function prefsFromForm() {
    var levels = [];
    if ($("level-low").checked) levels.push("low");
    if ($("level-mid").checked) levels.push("mid");
    if ($("level-high").checked) levels.push("high");
    var layout = document.querySelector('input[name="layout"]:checked');
    var fontSize = $("font-size").value;
    if (!window.CardDocx.FONT_SIZES[fontSize]) fontSize = "lg";
    return {
      levels: levels,
      layout: layout && layout.value === "sheet" ? "sheet" : "card",
      fontSize: fontSize,
      showZhuyin: $("opt-zhuyin").checked,
      includeAnswers: $("opt-answers").checked,
      sameComponentOnly: $("opt-same").checked,
      showHint: $("opt-hint").checked,
    };
  }

  function applyPrefs(saved) {
    var data = saved || {};
    var levels = Array.isArray(data.levels) ? data.levels : ["low", "mid", "high"];
    $("level-low").checked = levels.indexOf("low") !== -1;
    $("level-mid").checked = levels.indexOf("mid") !== -1;
    $("level-high").checked = levels.indexOf("high") !== -1;
    var layout = data.layout === "sheet" ? "sheet" : "card";
    document.querySelector('input[name="layout"][value="' + layout + '"]').checked = true;
    if (data.fontSize && window.CardDocx.FONT_SIZES[data.fontSize]) $("font-size").value = data.fontSize;
    if (typeof data.showZhuyin === "boolean") $("opt-zhuyin").checked = data.showZhuyin;
    if (typeof data.includeAnswers === "boolean") $("opt-answers").checked = data.includeAnswers;
    if (typeof data.sameComponentOnly === "boolean") $("opt-same").checked = data.sameComponentOnly;
    if (typeof data.showHint === "boolean") $("opt-hint").checked = data.showHint;
  }

  function savePrefs() {
    writeStorage(PREF_KEY, prefsFromForm());
  }

  function blankWord(forLow) {
    return { id: uid("w"), text: "", zhuyin: "", sentences: [""], forLow: !!forLow };
  }

  function blankItem(ch) {
    return {
      id: uid("c"),
      char: ch || "",
      zhuyin: "",
      parts: ch ? window.CardDocx.suggestParts(ch) : "",
      hint: "",
      words: [blankWord(true)],
    };
  }

  function findItem(id) {
    var found = null;
    state.items.forEach(function (item) {
      if (item.id === id) found = item;
    });
    return found;
  }

  function findWord(item, id) {
    var found = null;
    item.words.forEach(function (word) {
      if (word.id === id) found = word;
    });
    return found;
  }

  function hasContent() {
    return state.items.some(function (item) {
      if (item.zhuyin || item.hint || item.parts) return true;
      return item.words.some(function (word) {
        return word.text.trim() || word.zhuyin.trim() || word.sentences.some(function (s) { return s.trim(); });
      });
    });
  }

  function updateCharCount() {
    var chars = window.CardDocx.parseChars($("chars").value);
    $("chars-count").textContent = "讀到 " + chars.length + " 個不重複的字";
  }

  function scheduleDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 200);
  }

  function saveDraft() {
    writeStorage(DRAFT_KEY, {
      chars: $("chars").value,
      grade: $("grade").value,
      items: state.items,
    });
  }

  function restoreDraft() {
    var draft = readStorage(DRAFT_KEY);
    if (!draft) return;
    if (draft.chars) $("chars").value = draft.chars;
    if (draft.grade) $("grade").value = draft.grade;
    if (Array.isArray(draft.items) && draft.items.length) {
      state.items = draft.items.map(normalizeDraftItem);
      renderEditor();
    }
  }

  function normalizeDraftItem(raw) {
    var item = {
      id: raw.id || uid("c"),
      char: raw.char || "",
      zhuyin: raw.zhuyin || "",
      parts: raw.parts || "",
      hint: raw.hint || "",
      words: [],
    };
    var words = Array.isArray(raw.words) ? raw.words : [];
    words.forEach(function (word) {
      var sentences = Array.isArray(word.sentences) ? word.sentences.slice(0, 2) : [""];
      if (!sentences.length) sentences = [""];
      item.words.push({
        id: word.id || uid("w"),
        text: word.text || "",
        zhuyin: word.zhuyin || "",
        sentences: sentences,
        forLow: !!word.forLow,
      });
    });
    if (!item.words.length) item.words.push(blankWord(true));
    if (!item.words.some(function (word) { return word.forLow; })) item.words[0].forLow = true;
    return item;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function input(className, value, dataset, placeholder) {
    var node = document.createElement("input");
    node.type = "text";
    node.className = className || "";
    node.value = value || "";
    if (placeholder) node.placeholder = placeholder;
    Object.keys(dataset).forEach(function (key) { node.dataset[key] = dataset[key]; });
    return node;
  }

  function button(label, className, dataset) {
    var node = document.createElement("button");
    node.type = "button";
    node.className = className || "btn secondary small";
    node.textContent = label;
    Object.keys(dataset).forEach(function (key) { node.dataset[key] = dataset[key]; });
    return node;
  }

  function renderEditor() {
    var host = $("editor");
    host.textContent = "";
    $("editor-empty").hidden = state.items.length > 0;
    host.hidden = state.items.length === 0;
    if (!state.items.length) return;

    var table = document.createElement("table");
    table.className = "editor-table";
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["生字", "注音", "部件", "詞語與例句", ""].forEach(function (label) {
      headRow.appendChild(el("th", "", label));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    state.items.forEach(function (item) {
      var row = document.createElement("tr");
      var charCell = document.createElement("td");
      var charInput = input("char-input", item.char, { field: "char", id: item.id }, "字");
      charInput.dataset.prev = item.char;
      charCell.appendChild(charInput);
      charCell.appendChild(el("div", "hint", "一個字"));
      row.appendChild(charCell);

      var zyCell = document.createElement("td");
      zyCell.appendChild(input("zhuyin-input", item.zhuyin, { field: "zhuyin", id: item.id }, "ㄅㄆㄇ"));
      row.appendChild(zyCell);

      var partCell = document.createElement("td");
      partCell.appendChild(input("parts-input", item.parts, { field: "parts", id: item.id }, "例如：度"));
      row.appendChild(partCell);

      var wordCell = document.createElement("td");
      item.words.forEach(function (word) {
        wordCell.appendChild(renderWord(item, word));
      });
      if (item.words.length < 5) {
        wordCell.appendChild(button("加一個詞", "btn secondary small", { action: "add-word", id: item.id }));
      }
      var hintLine = el("div", "hint-line");
      hintLine.appendChild(el("span", "", "高組提示"));
      hintLine.appendChild(input("hint-input", item.hint, { field: "hint", id: item.id }, "用「渡過」說一件週末的事。"));
      wordCell.appendChild(hintLine);
      row.appendChild(wordCell);

      var opCell = document.createElement("td");
      opCell.appendChild(button("刪除此字", "btn secondary small", { action: "delete-char", id: item.id }));
      row.appendChild(opCell);
      table.appendChild(row);
    });
    host.appendChild(table);
  }

  function renderWord(item, word) {
    var block = el("div", "word-block");
    var line = el("div", "word-line");
    var radioLabel = el("label", "choice");
    var radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "low-" + item.id;
    radio.checked = !!word.forLow;
    radio.dataset.field = "for-low";
    radio.dataset.id = item.id;
    radio.dataset.word = word.id;
    radioLabel.appendChild(radio);
    radioLabel.appendChild(document.createTextNode("低組挖空"));
    line.appendChild(radioLabel);
    line.appendChild(input("word-text", word.text, { field: "word", id: item.id, word: word.id }, "詞語"));
    line.appendChild(input("", word.zhuyin, { field: "word-zhuyin", id: item.id, word: word.id }, "詞的注音"));
    if (item.words.length > 1) {
      line.appendChild(button("刪詞", "btn secondary small", { action: "delete-word", id: item.id, word: word.id }));
    }
    block.appendChild(line);
    word.sentences.forEach(function (sentence, index) {
      var sentenceLine = el("div", "sentence-line");
      sentenceLine.appendChild(input("", sentence, {
        field: "sentence",
        id: item.id,
        word: word.id,
        index: String(index),
      }, index === 0 ? "例句" : "再一句"));
      if (word.sentences.length > 1) {
        sentenceLine.appendChild(button("刪句", "btn secondary small", {
          action: "delete-sentence",
          id: item.id,
          word: word.id,
          index: String(index),
        }));
      }
      block.appendChild(sentenceLine);
    });
    if (word.sentences.length < 2) {
      block.appendChild(button("加一句", "btn secondary small", { action: "add-sentence", id: item.id, word: word.id }));
    }
    return block;
  }

  function onEditorInput(event) {
    var node = event.target;
    if (!node.dataset || !node.dataset.field) return;
    var item = findItem(node.dataset.id);
    if (!item) return;
    var field = node.dataset.field;
    if (field === "char") item.char = node.value;
    else if (field === "zhuyin") item.zhuyin = node.value;
    else if (field === "parts") item.parts = node.value;
    else if (field === "hint") item.hint = node.value;
    else if (field === "word" || field === "word-zhuyin") {
      var word = findWord(item, node.dataset.word);
      if (!word) return;
      if (field === "word") word.text = node.value;
      else word.zhuyin = node.value;
    } else if (field === "sentence") {
      var sentenceWord = findWord(item, node.dataset.word);
      var index = Number(node.dataset.index);
      if (sentenceWord && sentenceWord.sentences[index] != null) sentenceWord.sentences[index] = node.value;
    } else if (field === "for-low" && node.checked) {
      item.words.forEach(function (word) { word.forLow = word.id === node.dataset.word; });
    }
    scheduleDraft();
    schedulePreview();
  }

  function onEditorChange(event) {
    var node = event.target;
    if (!node.dataset || node.dataset.field !== "char") {
      onEditorInput(event);
      return;
    }
    var item = findItem(node.dataset.id);
    if (!item) return;
    var ch = (node.value.match(/[\u3400-\u9FFF\uF900-\uFAFF]/) || [""])[0];
    if (!ch) {
      item.char = node.value.trim();
      scheduleDraft();
      return;
    }
    var clash = state.items.some(function (other) { return other !== item && other.char === ch; });
    if (clash) {
      show("form-error", "error", "表格裡已經有「" + ch + "」。");
      item.char = node.dataset.prev || "";
      node.value = item.char;
      return;
    }
    item.char = ch;
    node.value = ch;
    node.dataset.prev = ch;
    if (!item.parts.trim()) {
      item.parts = window.CardDocx.suggestParts(ch);
      var partsInput = node.parentNode && node.parentNode.parentNode
        ? node.parentNode.parentNode.querySelector('[data-field="parts"]')
        : null;
      if (partsInput) partsInput.value = item.parts;
    }
    show("form-error", "error", "");
    scheduleDraft();
  }

  function onEditorClick(event) {
    var btn = event.target.closest ? event.target.closest("button") : null;
    if (!btn || !btn.dataset.action) return;
    var item = findItem(btn.dataset.id);
    if (!item) return;
    var action = btn.dataset.action;
    if (action === "delete-char") {
      state.items = state.items.filter(function (row) { return row !== item; });
    } else if (action === "add-word") {
      if (item.words.length >= 5) return;
      var created = blankWord(item.words.length === 0);
      item.words.push(created);
      renderEditor();
      var focus = document.querySelector('[data-field="word"][data-word="' + created.id + '"]');
      if (focus) focus.focus();
      scheduleDraft();
      schedulePreview();
      return;
    } else if (action === "delete-word") {
      item.words = item.words.filter(function (word) { return word.id !== btn.dataset.word; });
      if (!item.words.length) item.words.push(blankWord(true));
      if (!item.words.some(function (word) { return word.forLow; })) item.words[0].forLow = true;
    } else if (action === "add-sentence") {
      var word = findWord(item, btn.dataset.word);
      if (word && word.sentences.length < 2) word.sentences.push("");
    } else if (action === "delete-sentence") {
      var target = findWord(item, btn.dataset.word);
      var index = Number(btn.dataset.index);
      if (target && target.sentences.length > 1) target.sentences.splice(index, 1);
    }
    renderEditor();
    scheduleDraft();
    schedulePreview();
  }

  function sourceChars() {
    var chars = window.CardDocx.parseChars($("chars").value);
    if (!chars.length) {
      state.items.forEach(function (item) {
        var ch = (String(item.char).match(/[\u3400-\u9FFF\uF900-\uFAFF]/) || [""])[0];
        if (ch && chars.indexOf(ch) === -1) chars.push(ch);
      });
    }
    return chars.slice(0, 40);
  }

  function addFromInput() {
    var all = window.CardDocx.parseChars($("chars").value);
    if (!all.length) {
      show("form-error", "error", "還沒有讀到生字。請貼上漢字，例如：渡、度、鍍。");
      show("form-status", "ok", "");
      return;
    }
    var chars = all.slice(0, 40);
    var added = 0;
    chars.forEach(function (ch) {
      var exists = state.items.some(function (item) { return item.char === ch; });
      if (!exists) {
        state.items.push(blankItem(ch));
        added += 1;
      }
    });
    renderEditor();
    saveDraft();
    show("form-error", "error", "");
    var message = added
      ? "已把 " + added + " 個生字放進表格。可以自己打詞語，或按「請 AI 造詞造句」。"
      : "這些生字已經在表格裡。";
    if (all.length > 40) message += "一次最多 40 個字，多出來的先沒放。";
    show("form-status", "ok", message);
  }

  function addEmptyRow() {
    var item = blankItem("");
    state.items.push(item);
    renderEditor();
    var focus = document.querySelector('[data-field="char"][data-id="' + item.id + '"]');
    if (focus) focus.focus();
    scheduleDraft();
  }

  function fillHints() {
    var count = 0;
    state.items.forEach(function (item) {
      if (item.hint.trim() || !item.char) return;
      var wordText = "";
      item.words.forEach(function (word) {
        if (!wordText && word.text.trim()) wordText = word.text.trim();
      });
      if (!wordText) return;
      item.hint = "用「" + wordText + "」說一句話。";
      count += 1;
    });
    renderEditor();
    saveDraft();
    schedulePreview();
    show("form-error", "error", "");
    show("form-status", "ok", count
      ? "已補上 " + count + " 個提示。不想印出來的話，把提示清掉，或關掉「高組顯示造句提示」。"
      : "沒有可補的提示。每個字都已有提示，或還沒有詞語。");
  }

  function sampleItems() {
    return [
      {
        char: "渡",
        zhuyin: "ㄉㄨˋ",
        parts: "氵、度",
        hint: "用「渡過」說一件週末的事。",
        words: [
          { text: "渡船", zhuyin: "ㄉㄨˋ ㄔㄨㄢˊ", sentences: ["渡船慢慢開過來。"], forLow: true },
          { text: "渡過", zhuyin: "ㄉㄨˋ ㄍㄨㄛˋ", sentences: ["我們渡過這條河。", "小船渡過對岸。"], forLow: false },
          { text: "渡口", zhuyin: "ㄉㄨˋ ㄎㄡˇ", sentences: ["大家在渡口等船。"], forLow: false },
          { text: "渡輪", zhuyin: "ㄉㄨˋ ㄌㄨㄣˊ", sentences: ["渡輪載著很多人。"], forLow: false },
        ],
      },
      {
        char: "度",
        zhuyin: "ㄉㄨˋ",
        parts: "广、廿、又",
        hint: "用「溫度」說今天的天氣。",
        words: [
          { text: "溫度", zhuyin: "ㄨㄣ ㄉㄨˋ", sentences: ["今天的溫度很舒服。"], forLow: true },
          { text: "一度", zhuyin: "ㄧ ㄉㄨˋ", sentences: ["氣溫下降一度。"], forLow: false },
          { text: "度假", zhuyin: "ㄉㄨˋ ㄐㄧㄚˋ", sentences: ["我們去海邊度假。"], forLow: false },
        ],
      },
      {
        char: "鍍",
        zhuyin: "ㄉㄨˋ",
        parts: "金、度",
        hint: "用「鍍金」說一個亮亮的東西。",
        words: [
          { text: "鍍金", zhuyin: "ㄉㄨˋ ㄐㄧㄣ", sentences: ["獎盃鍍了一層金。"], forLow: true },
          { text: "電鍍", zhuyin: "ㄉㄧㄢˋ ㄉㄨˋ", sentences: ["這支湯匙有電鍍。"], forLow: false },
          { text: "鍍銀", zhuyin: "ㄉㄨˋ ㄧㄣˊ", sentences: ["鏡子後面鍍了銀。"], forLow: false },
        ],
      },
    ];
  }

  function loadSample() {
    if (hasContent() && !window.confirm("這會用示例換掉表格裡目前的詞語。要繼續嗎？")) return;
    if (!$("grade").value.trim()) $("grade").value = "二年級";
    $("chars").value = "渡、度、鍍";
    state.items = sampleItems().map(normalizeDraftItem);
    updateCharCount();
    renderEditor();
    saveDraft();
    show("form-error", "error", "");
    show("form-status", "ok", "已填入示例。這是網站內建的短例，不是 AI 寫的。");
    refreshPreview(true);
  }

  function payload(level) {
    var prefs = prefsFromForm();
    return {
      grade: $("grade").value.trim(),
      level: level,
      layout: prefs.layout,
      fontSize: prefs.fontSize,
      showZhuyin: prefs.showZhuyin,
      includeAnswers: prefs.includeAnswers,
      sameComponentOnly: prefs.sameComponentOnly,
      showHint: prefs.showHint,
      items: state.items.map(function (item) {
        return {
          char: item.char,
          zhuyin: item.zhuyin,
          parts: item.parts,
          hint: item.hint,
          words: item.words.map(function (word) {
            return {
              text: word.text,
              zhuyin: word.zhuyin,
              sentences: word.sentences,
              forLow: word.forLow,
            };
          }),
        };
      }),
    };
  }

  function selectedLevels() {
    return prefsFromForm().levels;
  }

  function refreshPreview(scroll) {
    var levels = selectedLevels();
    savePrefs();
    if (!levels.length) {
      show("form-error", "error", "請至少選一個程度。");
      return;
    }
    var usable = state.items.some(function (item) {
      return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(item.char || "");
    });
    if (!usable) {
      show("form-error", "error", "請先把生字放進表格。");
      return;
    }
    show("form-error", "error", "");
    state.models = {};
    var warnings = [];
    levels.forEach(function (level) {
      var model = window.CardDocx.prepare(payload(level));
      state.models[level] = model;
      model.warnings.forEach(function (warning) {
        if (warnings.indexOf(warning) === -1) warnings.push(warning);
      });
    });
    if (levels.indexOf(state.tab) === -1) state.tab = levels[0];
    renderTabs();
    renderVisible();
    renderPrintAll();
    show("preview-warnings", "warn", warnings.join(""));
    $("preview-section").hidden = false;
    if (scroll) $("preview-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function schedulePreview() {
    if ($("preview-section").hidden) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () { refreshPreview(false); }, 250);
  }

  function renderTabs() {
    var host = $("level-tabs");
    host.textContent = "";
    selectedLevels().forEach(function (level) {
      var spec = window.CardDocx.LEVELS[level];
      var btn = button(spec.name, "btn secondary small", {});
      btn.setAttribute("aria-selected", level === state.tab ? "true" : "false");
      btn.addEventListener("click", function () {
        state.tab = level;
        renderTabs();
        renderVisible();
      });
      host.appendChild(btn);
    });
  }

  function renderPage(page, model, answer) {
    var sheet = el("article", "a4-page" + (answer ? " answer-page" : ""));
    sheet.style.fontSize = model.font.pt + "pt";
    if (answer) {
      sheet.appendChild(el("h2", "sheet-title", model.answerPage.title));
      model.answerPage.lines.forEach(function (line) {
        sheet.appendChild(el("p", "line", line));
      });
      return sheet;
    }
    sheet.appendChild(el("h2", "sheet-title", model.title));
    sheet.appendChild(el("p", "sheet-name", "班級：＿＿＿＿　座號：＿＿　姓名：＿＿＿＿＿＿"));
    sheet.appendChild(el("p", "sheet-instruction", model.instruction));
    if (!page.cards.length) sheet.appendChild(el("p", "", "（沒有生字）"));
    page.cards.forEach(function (card) {
      sheet.appendChild(renderCard(card, model));
    });
    return sheet;
  }

  function renderCard(card, model) {
    var box = el("section", "char-card");
    box.style.borderColor = "#" + model.level.color;
    var head = document.createElement("header");
    head.style.background = "#" + model.level.tint;
    head.style.color = "#" + model.level.color;
    head.appendChild(el("div", "big-char", card.char));
    var meta = el("div", "");
    meta.appendChild(el("div", "card-kicker", "第 " + card.n + " 字　" + model.level.name));
    if (card.showZhuyin && card.zhuyin) meta.appendChild(el("div", "card-zhuyin", card.zhuyin));
    head.appendChild(meta);
    box.appendChild(head);
    var body = el("div", "card-body");
    card.lines.forEach(function (line) {
      var row = el("div", "line line-" + line.kind, line.text);
      if (line.kind === "cloze" || line.kind === "lead") row.style.color = "#" + model.level.color;
      body.appendChild(row);
    });
    box.appendChild(body);
    return box;
  }

  function renderVisible() {
    var model = state.models[state.tab];
    var host = $("preview-pages");
    host.textContent = "";
    if (!model) return;
    model.pages.forEach(function (page) {
      host.appendChild(renderPage(page, model, false));
    });
    if (model.answerPage) host.appendChild(renderPage(null, model, true));
    $("preview-key").textContent = model.screenKey.join("\n");
    $("key-note").textContent = model.answerPage
      ? "下面這段和最後一頁相同，方便對答案。列印時以每一頁為準。"
      : "這次不會把答案放進 Word 或列印。需要時再勾選「最後一頁附答案」。";
  }

  function renderPrintAll() {
    var host = $("print-all");
    host.textContent = "";
    selectedLevels().forEach(function (level) {
      var model = state.models[level];
      if (!model) return;
      model.pages.forEach(function (page) {
        host.appendChild(renderPage(page, model, false));
      });
      if (model.answerPage) host.appendChild(renderPage(null, model, true));
    });
  }

  function saveBlob(blob, name) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 2500);
  }

  async function downloadLevels(ids) {
    if (!ids.length) {
      show("form-error", "error", "請至少選一個程度。");
      return;
    }
    if (!state.items.some(function (item) { return /[\u3400-\u9FFF]/.test(item.char || ""); })) {
      show("form-error", "error", "請先把生字放進表格。");
      return;
    }
    try {
      if (ids.length === 1) {
        var one = await window.CardDocx.toBlob(payload(ids[0]));
        saveBlob(one, window.CardDocx.fileName($("grade").value.trim(), ids[0]));
        return;
      }
      if (typeof JSZip === "undefined") {
        show("form-error", "error", "壓縮程式沒有載入。請改按「下載這個程度」。");
        return;
      }
      var zip = new JSZip();
      var i;
      for (i = 0; i < ids.length; i += 1) {
        var blob = await window.CardDocx.toBlob(payload(ids[i]));
        zip.file(window.CardDocx.fileName($("grade").value.trim(), ids[i]), blob);
      }
      var packed = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      saveBlob(packed, window.CardDocx.zipName($("grade").value.trim(), ids));
    } catch (err) {
      show("form-error", "error", "Word 沒有做成。請重新整理後再試。");
    }
  }

  function systemPrompt() {
    return [
      "你是臺灣國小特教老師的國語文備課助手。",
      "使用臺灣繁體中文與教育部用字，例如「裡」「臺」。",
      "詞語要常見，句子要短、具體、適合該年級朗讀。",
      "只輸出 JSON 物件，不要加說明，不要用 markdown。",
    ].join("");
  }

  function userPrompt(chars) {
    var grade = $("grade").value.trim() || "國小";
    return [
      "請為下面每一個生字各寫 3 到 5 個常見詞語，每個詞 1 到 2 句例句。",
      "年級：" + grade + "。句子大約 8 到 16 個字，低年級再短一點。",
      "每個詞語都要包含那個生字。不要用冷僻詞，不要堆成語，不要英文。",
      "注音用臺灣注音符號，含聲調，例如 ㄉㄨˋ。",
      "parts 列出這個字的部件。聲旁若是完整的字要單獨列出。例如「渡」的 parts 要有「度」，不要只寫「氵」。",
      "hint 是給高組的一句造句提示，要具體，例如：用「渡過」說一件週末的事。",
      "生字請全部都寫，順序不要改：" + chars.join("、"),
      "JSON 形狀如下，內容請另寫，不要照抄示例：",
      '{"characters":[{"char":"渡","zhuyin":"ㄉㄨˋ","parts":["氵","度"],"hint":"用「渡過」說一件週末的事。","words":[{"text":"渡船","zhuyin":"ㄉㄨˋ ㄔㄨㄢˊ","sentences":["渡船慢慢開過來。"]}]}]}',
    ].join("\n");
  }

  function responseSchema() {
    var word = {
      type: "OBJECT",
      properties: {
        text: { type: "STRING" },
        zhuyin: { type: "STRING" },
        sentences: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["text", "sentences"],
    };
    return {
      type: "OBJECT",
      properties: {
        characters: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              char: { type: "STRING" },
              zhuyin: { type: "STRING" },
              parts: { type: "ARRAY", items: { type: "STRING" } },
              hint: { type: "STRING" },
              words: { type: "ARRAY", items: word },
            },
            required: ["char", "zhuyin", "words"],
          },
        },
      },
      required: ["characters"],
    };
  }

  function friendlyHttpError(provider, status, message) {
    var text = String(message || "").toLowerCase();
    if (status === 400 && (text.indexOf("api key") !== -1 || text.indexOf("api_key") !== -1)) {
      return "這組金鑰看起來無效。請到 Google AI Studio 重新產生一把，再貼上來。";
    }
    if (status === 401 || status === 403) {
      return provider === "openai"
        ? "OpenAI 沒有接受這組金鑰。請確認金鑰還有效，或改回 Gemini。"
        : "金鑰沒有權限。請確認這是 Gemini API 金鑰，而且已在 AI Studio 啟用。";
    }
    if (status === 429 || text.indexOf("quota") !== -1 || text.indexOf("resource_exhausted") !== -1 || text.indexOf("rate") !== -1) {
      return "目前額度用完了。免費額度有次數限制，請稍等一下再試，或明天再使用。";
    }
    if (text.indexOf("not found") !== -1 || text.indexOf("not_found") !== -1 || text.indexOf("unknown model") !== -1) {
      return "找不到這個模型。請把模型名稱改成 gemini-2.5-flash，或改成服務裡目前看得到的名稱。";
    }
    if (status >= 500) return "AI 服務這時忙不過來。請稍後再按一次。";
    if (message) return "產生沒有成功：" + String(message).slice(0, 280);
    return "產生沒有成功。請檢查網路後再試一次。";
  }

  function shouldRetryWithoutSchema(status, message) {
    if (status !== 400) return false;
    var text = String(message || "").toLowerCase();
    if (text.indexOf("api key") !== -1 || text.indexOf("api_key") !== -1) return false;
    return text.indexOf("schema") !== -1 || text.indexOf("generation") !== -1 || text.indexOf("response_mime") !== -1;
  }

  async function postJson(url, headers, body, provider) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 90000);
    try {
      var response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      var raw = await response.text();
      var data = null;
      try { data = JSON.parse(raw); } catch (err) { data = null; }
      if (!response.ok) {
        var message = data && data.error && (data.error.message || data.error.status) || raw;
        var error = new Error(friendlyHttpError(provider, response.status, message));
        error.status = response.status;
        error.detail = message;
        throw error;
      }
      return data || {};
    } catch (err) {
      if (err.name === "AbortError") throw new Error("這次等太久了。可以少幾個生字再試。");
      if (err instanceof TypeError) {
        throw new Error(provider === "openai"
          ? "連不到 OpenAI。瀏覽器常常會擋住網頁直接呼叫，請改回 Gemini 再試。"
          : "連不到 Gemini。請檢查網路，或稍後再試。");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function parseModelJson(text) {
    var trimmed = String(text || "").trim().replace(/^\uFEFF/, "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    var data = null;
    try {
      data = JSON.parse(trimmed);
    } catch (err) {
      var start = trimmed.indexOf("{");
      var end = trimmed.lastIndexOf("}");
      var arrayStart = trimmed.indexOf("[");
      if (start >= 0 && end > start && (arrayStart < 0 || start < arrayStart)) {
        try { data = JSON.parse(trimmed.slice(start, end + 1)); } catch (inner) { data = null; }
      } else if (arrayStart >= 0) {
        var arrayEnd = trimmed.lastIndexOf("]");
        if (arrayEnd > arrayStart) {
          try { data = JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1)); } catch (inner2) { data = null; }
        }
      }
    }
    if (!data) throw new Error("AI 有回應，但不是我讀得懂的詞語格式。請再按一次。");
    if (Array.isArray(data)) return { characters: data };
    return data;
  }

  function readGemini(data) {
    var feedback = data.promptFeedback && data.promptFeedback.blockReason;
    if (feedback) throw new Error("這次的內容被 AI 服務擋下了。請確認生字是國語課文用字，再試一次。");
    var candidate = (data.candidates || [])[0];
    if (!candidate) throw new Error("AI 沒有回傳詞語。請再按一次。");
    if (candidate.finishReason === "SAFETY") {
      throw new Error("這次的內容被 AI 服務擋下了。請確認生字是國語課文用字，再試一次。");
    }
    var text = ((candidate.content && candidate.content.parts) || []).map(function (part) {
      return part.text || "";
    }).join("");
    if (candidate.finishReason === "MAX_TOKENS") {
      throw new Error("回應被截斷了。請少幾個生字再試一次。");
    }
    return parseModelJson(text);
  }

  async function generateGemini(settings, prompt) {
    var url = "https://generativelanguage.googleapis.com/v1beta/models/"
      + encodeURIComponent(settings.geminiModel) + ":generateContent";
    var headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": settings.geminiKey,
    };
    function body(withSchema) {
      var generationConfig = {
        temperature: 0.4,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      };
      if (withSchema) generationConfig.responseSchema = responseSchema();
      return {
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      };
    }
    try {
      return readGemini(await postJson(url, headers, body(true), "gemini"));
    } catch (err) {
      if (!shouldRetryWithoutSchema(err.status, err.detail)) throw err;
      return readGemini(await postJson(url, headers, body(false), "gemini"));
    }
  }

  async function generateOpenAI(settings, prompt) {
    var data = await postJson("https://api.openai.com/v1/chat/completions", {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.openaiKey,
    }, {
      model: settings.openaiModel,
      temperature: 0.4,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: prompt },
      ],
    }, "openai");
    var choice = data.choices && data.choices[0];
    var text = choice && choice.message && choice.message.content;
    if (!text) throw new Error("AI 沒有回傳詞語。請再按一次。");
    if (choice.finish_reason === "length") throw new Error("回應被截斷了。請少幾個生字再試一次。");
    return parseModelJson(text);
  }

  function clip(value, max) {
    var text = String(value || "").replace(/[\r\n]+/g, " ").trim();
    return text.length > max ? text.slice(0, max) : text;
  }

  function applyAi(chars, raw) {
    var list = raw && (raw.characters || raw.items || raw.cards);
    if (!Array.isArray(list) || !list.length) {
      throw new Error("AI 有回應，但沒有寫出生字的詞語。請再按一次。");
    }
    var byChar = {};
    list.forEach(function (row) {
      var ch = (String(row && (row.char || row.character || row["生字"]) || "").match(/[\u3400-\u9FFF\uF900-\uFAFF]/) || [""])[0];
      if (ch) byChar[ch] = row;
    });
    chars.forEach(function (ch) {
      var row = byChar[ch];
      var item = null;
      state.items.forEach(function (current) {
        if (current.char === ch) item = current;
      });
      if (!item) {
        item = blankItem(ch);
        state.items.push(item);
      }
      if (!row) return;
      item.zhuyin = clip(row.zhuyin || row.bopomofo || "", 24).replace(/[()（）]/g, "");
      var parts = row.parts || row.components || [];
      if (!Array.isArray(parts)) parts = String(parts).split(/[\s、,，]+/);
      item.parts = parts.map(function (part) { return clip(part, 4); }).filter(Boolean).slice(0, 6).join("、");
      if (!item.parts) item.parts = window.CardDocx.suggestParts(ch);
      item.hint = clip(row.hint || row.prompt || "", 80);
      var words = Array.isArray(row.words) ? row.words : [];
      var nextWords = [];
      words.forEach(function (word) {
        if (nextWords.length >= 5) return;
        var text = clip(typeof word === "string" ? word : (word && (word.text || word.word) || ""), 12);
        if (!text) return;
        var sentences = [];
        var rawSentences = typeof word === "string" ? [] : ((word && (word.sentences || word.examples)) || []);
        if (!Array.isArray(rawSentences)) rawSentences = [rawSentences];
        if (word && word.sentence) rawSentences = [word.sentence].concat(rawSentences);
        rawSentences.forEach(function (sentence) {
          var line = clip(sentence, 80);
          if (line && sentences.length < 2) sentences.push(line);
        });
        if (!sentences.length) sentences = [""];
        nextWords.push({
          id: uid("w"),
          text: text,
          zhuyin: clip(word && word.zhuyin || "", 40).replace(/[()（）]/g, ""),
          sentences: sentences,
          forLow: nextWords.length === 0,
        });
      });
      if (nextWords.length) item.words = nextWords;
    });
    var ordered = [];
    var seen = {};
    chars.forEach(function (ch) {
      state.items.forEach(function (item) {
        if (item.char === ch && !seen[item.id]) {
          ordered.push(item);
          seen[item.id] = true;
        }
      });
    });
    state.items.forEach(function (item) {
      if (!seen[item.id]) ordered.push(item);
    });
    state.items = ordered;
    return chars.filter(function (ch) { return !byChar[ch]; });
  }

  async function generate() {
    if (state.busy) return;
    var all = sourceChars();
    if (!all.length) {
      show("form-error", "error", "請先貼上生字，例如：渡、度、鍍。");
      show("form-status", "ok", "");
      return;
    }
    var settings = saveSettings(false);
    var key = settings.provider === "openai" ? settings.openaiKey : settings.geminiKey;
    if (!key) {
      $("settings").open = true;
      show("form-error", "error", settings.provider === "openai"
        ? "還沒有 OpenAI 金鑰。請在上方 AI 設定貼上，或改回 Gemini。不想用 AI 的話，按「放進表格」自己打。"
        : "還沒有 API 金鑰。請打開上方的 AI 設定，貼上你的 Gemini 金鑰。不想用 AI 的話，按「放進表格」自己打。");
      show("form-status", "ok", "");
      return;
    }
    state.busy = true;
    $("generate").disabled = true;
    $("generate").textContent = "產生中…";
    show("form-error", "error", "");
    show("form-status", "ok", "正在造詞造句，請稍等。");
    try {
      var prompt = userPrompt(all);
      var raw = settings.provider === "openai"
        ? await generateOpenAI(settings, prompt)
        : await generateGemini(settings, prompt);
      var missing = applyAi(all, raw);
      if (!$("chars").value.trim()) $("chars").value = all.join("、");
      updateCharCount();
      renderEditor();
      saveDraft();
      var message = "已填入詞語和例句。請看過表格，不對的直接改，再做出卡片。";
      if (missing.length) message += " AI 沒有回這些字，請自己補：" + missing.join("、") + "。";
      if (window.CardDocx.parseChars($("chars").value).length > 40) message += "一次最多送出 40 個字。";
      show("form-status", "ok", message);
    } catch (err) {
      show("form-status", "ok", "");
      show("form-error", "error", err && err.message ? err.message : "產生沒有成功。請再試一次。");
    } finally {
      state.busy = false;
      $("generate").disabled = false;
      $("generate").textContent = "請 AI 造詞造句";
    }
  }

  function init() {
    if (!window.CardDocx || !window.CardDocx.toBlob) {
      show("form-error", "error", "頁面不完整，Word 產生程式沒有載入。請重新整理。");
      $("make-cards").disabled = true;
      return;
    }
    applySettings(readStorage(STORAGE_KEY) || {});
    applyPrefs(readStorage(PREF_KEY) || {});
    if (!settingsFromForm().geminiKey && !settingsFromForm().openaiKey) $("settings").open = true;
    restoreDraft();
    updateCharCount();

    document.querySelectorAll('input[name="provider"]').forEach(function (input) {
      input.addEventListener("change", syncProviderFields);
    });
    $("save-settings").addEventListener("click", function () { saveSettings(true); });
    $("clear-settings").addEventListener("click", clearSettings);
    $("toggle-key").addEventListener("click", function () {
      var field = $(currentProvider() === "openai" ? "openai-key" : "gemini-key");
      var showText = field.type === "password";
      field.type = showText ? "text" : "password";
      $("toggle-key").textContent = showText ? "隱藏金鑰" : "顯示金鑰";
    });
    $("chars").addEventListener("input", function () {
      updateCharCount();
      scheduleDraft();
    });
    $("grade").addEventListener("input", function () {
      scheduleDraft();
      schedulePreview();
    });
    $("add-chars").addEventListener("click", addFromInput);
    $("add-row").addEventListener("click", addEmptyRow);
    $("generate").addEventListener("click", generate);
    $("fill-sample").addEventListener("click", loadSample);
    $("fill-hints").addEventListener("click", fillHints);
    $("editor").addEventListener("input", onEditorInput);
    $("editor").addEventListener("change", onEditorChange);
    $("editor").addEventListener("click", onEditorClick);
    ["level-low", "level-mid", "level-high", "font-size", "opt-zhuyin", "opt-answers", "opt-same", "opt-hint"].forEach(function (id) {
      $(id).addEventListener("change", function () {
        savePrefs();
        schedulePreview();
      });
    });
    document.querySelectorAll('input[name="layout"]').forEach(function (input) {
      input.addEventListener("change", function () {
        savePrefs();
        schedulePreview();
      });
    });
    $("make-cards").addEventListener("click", function () { refreshPreview(true); });
    $("download-selected").addEventListener("click", function () { downloadLevels(selectedLevels()); });
    $("download-one").addEventListener("click", function () { downloadLevels([state.tab]); });
    $("print-preview").addEventListener("click", function () { window.print(); });
  }

  init();
})();
