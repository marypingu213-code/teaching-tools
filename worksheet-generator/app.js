(function () {
  "use strict";

  var STORAGE_KEY = "toolbox.settings.v1";
  var DRAFT_KEY = "worksheet-generator.draft.v1";
  var LEVEL_ORDER = ["low", "mid", "high"];
  var TYPE_HINTS = {
    choice: "三個選項，學生把①②③寫在（　）裡。",
    cloze: "句子裡留空。學生把答案寫在（　）裡，參考答案只出現在最後一頁。",
    word: "給一個詞，請學生造詞、造句。參考答案只出現在答案頁。",
    short: "一個問題，下面留橫線。低、中程度留兩行，高程度留三行。",
  };
  var CIRCLED = ["①", "②", "③"];

  var state = {
    images: [],
    worksheet: null,
    busy: false,
  };

  function $(id) { return document.getElementById(id); }

  function show(id, kind, message) {
    var node = $(id);
    node.hidden = !message;
    node.className = "banner " + (kind || "ok");
    node.textContent = message || "";
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

  function currentType() {
    var picked = document.querySelector('input[name="qtype"]:checked');
    return picked ? picked.value : "choice";
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
    var data = settingsFromForm();
    var ok = writeStorage(STORAGE_KEY, data);
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
    $("gemini-key").value = "";
    $("openai-key").value = "";
    saveSettings(false);
    show("form-status", "ok", "金鑰已從這台瀏覽器清除。");
    show("form-error", "error", "");
    $("settings").open = true;
  }

  function saveDraft() {
    var draft = {
      title: $("title").value,
      qtype: currentType(),
      count: $("count").value,
      passage: $("passage").value,
      vocab: $("vocab").value,
    };
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (err) { /* 草稿存不下也不影響出題 */ }
  }

  function restoreDraft() {
    var draft = null;
    try { draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch (err) { draft = null; }
    if (!draft) return;
    if (draft.title) $("title").value = draft.title;
    if (draft.count) $("count").value = draft.count;
    if (draft.passage) $("passage").value = draft.passage;
    if (draft.vocab) $("vocab").value = draft.vocab;
    if (draft.qtype && document.querySelector('input[name="qtype"][value="' + draft.qtype + '"]')) {
      document.querySelector('input[name="qtype"][value="' + draft.qtype + '"]').checked = true;
    }
  }

  function updatePassageCount() {
    $("passage-count").textContent = "已貼 " + $("passage").value.trim().length + " 字";
  }

  function updateTypeHint() {
    $("type-hint").textContent = TYPE_HINTS[currentType()] || "";
    var onlyVocab = !$("passage").value.trim() && !state.images.length && !!$("vocab").value.trim();
    $("vocab-warn").hidden = !(onlyVocab && currentType() === "choice");
  }

  function uid() {
    return "img-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      if (file.size > 8 * 1024 * 1024) {
        reject(new Error("「" + file.name + "」超過 8MB，請先縮小再上傳。"));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var maxSide = 1600;
        var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        var width = Math.max(1, Math.round(img.width * scale));
        var height = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        var dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        URL.revokeObjectURL(url);
        resolve({
          id: uid(),
          name: file.name || "課本頁面",
          dataUrl: dataUrl,
          base64: dataUrl.split(",")[1],
          mimeType: "image/jpeg",
        });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("「" + (file.name || "圖片") + "」讀取失敗。請改存成 JPG 或 PNG 再上傳。"));
      };
      img.src = url;
    });
  }

  function renderThumbs() {
    var box = $("thumbs");
    box.replaceChildren();
    state.images.forEach(function (image) {
      var card = document.createElement("figure");
      card.className = "thumb";
      var img = document.createElement("img");
      img.src = image.dataUrl;
      img.alt = image.name;
      var caption = document.createElement("figcaption");
      caption.textContent = image.name;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn secondary small";
      button.textContent = "移除";
      button.setAttribute("aria-label", "移除 " + image.name);
      button.addEventListener("click", function () {
        state.images = state.images.filter(function (item) { return item.id !== image.id; });
        renderThumbs();
        updateTypeHint();
      });
      card.append(img, caption, button);
      box.appendChild(card);
    });
  }

  async function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var room = 6 - state.images.length;
    if (room <= 0) {
      show("form-error", "error", "一次最多 6 張圖片。請先拿掉幾張。");
      return;
    }
    if (files.length > room) {
      show("form-error", "error", "一次最多 6 張圖片，多出來的這次沒有加入。");
      files = files.slice(0, room);
    }
    show("form-status", "ok", "正在讀取圖片…");
    var errors = [];
    for (var i = 0; i < files.length; i += 1) {
      try {
        state.images.push(await fileToImage(files[i]));
      } catch (err) {
        errors.push(err.message || "有一張圖片沒有讀成。");
      }
    }
    renderThumbs();
    updateTypeHint();
    show("form-status", "ok", "");
    if (errors.length) show("form-error", "error", errors.join(""));
    else show("form-error", "error", "");
  }

  function parseCount() {
    var raw = String($("count").value || "").trim();
    if (!raw) return 14;
    if (!/^\d+$/.test(raw)) return null;
    var n = Number(raw);
    if (n < 1 || n > 30) return null;
    return n;
  }

  function validateForm(settings) {
    if (!$("title").value.trim()) {
      return "請填年級與課題，例如：四上國語 第1~6課 複習。下載的檔名會用這一行。";
    }
    if (parseCount() == null) return "題數請填 1 到 30 的整數。";
    if (!$("passage").value.trim() && !$("vocab").value.trim() && !state.images.length) {
      return "請貼上課文、生字，或上傳課本頁面。沒有材料的話，我不能出題。";
    }
    var key = settings.provider === "openai" ? settings.openaiKey : settings.geminiKey;
    if (!key) {
      $("settings").open = true;
      return settings.provider === "openai"
        ? "還沒有 OpenAI 金鑰。請在上方 AI 設定貼上，或改回 Gemini。"
        : "還沒有 API 金鑰。請打開上方的 AI 設定，貼上你的 Gemini 金鑰。金鑰只會存在這台瀏覽器。";
    }
    return "";
  }

  function systemPrompt() {
    return [
      "你是臺灣國小特教老師的國語文出題助手。",
      "只使用使用者提供的課文、生字與圖片。材料沒寫的人、事、數字、修辭都不要編。",
      "使用臺灣繁體中文與教育部常用字，例如「裡」「臺」。",
      "只輸出 JSON 物件，不要加說明，不要用 markdown。",
      "低、中、高都要出題，問法不要重複。每一題都要能在材料裡找到依據。",
    ].join("");
  }

  function userPrompt(count, questionType) {
    var title = $("title").value.trim();
    var passage = $("passage").value.trim();
    var vocab = $("vocab").value.trim();
    var shape = {
      choice: '{"low":[{"stem":"問題","options":["甲","乙","丙"],"answer":2}],"mid":[同樣格式],"high":[同樣格式]}',
      cloze: '{"low":[{"stem":"句子裡有＿＿＿＿。","answer":"應填的詞"}],"mid":[同樣格式],"high":[同樣格式]}',
      word: '{"low":[{"word":"香","sampleWord":"香味","sampleSentence":"一句完整的話。"}],"mid":[同樣格式],"high":[同樣格式]}',
      short: '{"low":[{"stem":"問題","answer":"依材料可接受的短答"}],"mid":[同樣格式],"high":[同樣格式]}',
    }[questionType];
    var typeRule = {
      choice: "題型是選擇題，每題正好 3 個選項。answer 是 1、2 或 3，表示正確選項。選項不要加①②③，題幹不要加題號或（　）。正確答案的位置要分散。干擾項和答案同一類（都是地點、數字或顏色這一類），但材料裡只有一個是對的。不要用「以上皆是」。",
      cloze: "題型是填空。stem 裡用「＿＿＿＿」當空格，answer 是應填的詞或短語，必須出自材料。不要加題號。",
      word: "題型是造詞、造句。word 必須是材料裡的生字或詞。sampleWord 是適合該年級的二字或三字詞。sampleSentence 是一句用字簡單的完整句子；若課文有相關句子，意思要貼著課文，不要另編故事。低程度的句子更短。",
      short: "題型是簡答。stem 是一個問題，answer 是依材料可接受的簡短答案。低程度的答案盡量是原文短語。不要加題號。",
    }[questionType];
    return [
      "請為 low、mid、high 三個程度各出正好 " + count + " 題。",
      typeRule,
      "程度要求：",
      "low 低：題幹短，問原文就看得到的事實。選擇題的干擾項要明顯錯誤。",
      "mid 中：問詞義、句意、做法或細節，要讀懂句子才答得出來。",
      "high 高：問推論、主旨、作者感受，或材料裡真的有用到的修辭（如擬人、譬喻）。若材料沒有修辭，就改問主旨、感受或原因，不要硬編。",
      "若只有生字、沒有課文或解釋，不要用字典知識問字義，也不要捏造情節。",
      "年級與課題：" + title,
      "課文：",
      passage || "（沒有貼課文）",
      "生字：",
      vocab || "（沒有另列生字）",
      state.images.length ? "請一併閱讀所附課本圖片。圖片裡看得到的文字也算材料。" : "",
      "JSON 形狀如下，內容請自行依材料撰寫，不要照抄示例文字：",
      shape,
    ].join("\n");
  }

  function schemaFor(questionType) {
    var question = {
      choice: {
        type: "OBJECT",
        properties: {
          stem: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
          answer: { type: "INTEGER" },
        },
        required: ["stem", "options", "answer"],
      },
      cloze: {
        type: "OBJECT",
        properties: { stem: { type: "STRING" }, answer: { type: "STRING" } },
        required: ["stem", "answer"],
      },
      short: {
        type: "OBJECT",
        properties: { stem: { type: "STRING" }, answer: { type: "STRING" } },
        required: ["stem", "answer"],
      },
      word: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          sampleWord: { type: "STRING" },
          sampleSentence: { type: "STRING" },
        },
        required: ["word", "sampleWord", "sampleSentence"],
      },
    }[questionType];
    return {
      type: "OBJECT",
      properties: {
        low: { type: "ARRAY", items: question },
        mid: { type: "ARRAY", items: question },
        high: { type: "ARRAY", items: question },
      },
      required: ["low", "mid", "high"],
    };
  }

  function friendlyHttpError(provider, status, message) {
    var m = String(message || "").toLowerCase();
    if (status === 400 && (m.indexOf("api key") !== -1 || m.indexOf("api_key") !== -1)) {
      return "這組金鑰看起來無效。請到 Google AI Studio 重新產生一把，再貼上來。";
    }
    if (status === 401 || status === 403) {
      return provider === "openai"
        ? "OpenAI 沒有接受這組金鑰。請確認金鑰還有效，或改回 Gemini。"
        : "金鑰沒有權限。請確認這是 Gemini API 金鑰，而且已在 AI Studio 啟用。";
    }
    if (status === 429 || m.indexOf("quota") !== -1 || m.indexOf("resource_exhausted") !== -1 || m.indexOf("rate") !== -1) {
      return "目前額度用完了。免費額度有次數限制，請稍等一下再試，或明天再使用。";
    }
    if (m.indexOf("not found") !== -1 || m.indexOf("not_found") !== -1 || m.indexOf("unknown model") !== -1) {
      return "找不到這個模型。請把模型名稱改成 gemini-2.5-flash，或改成服務裡目前看得到的名稱。";
    }
    if (m.indexOf("location") !== -1 || m.indexOf("not available") !== -1 || m.indexOf("unsupported") !== -1 && m.indexOf("region") !== -1) {
      return "這個地區目前無法使用這項 AI 服務。可以改用其他模型，或稍後再試。";
    }
    if (status >= 500) return "AI 服務這時忙不過來。請稍後再按一次產生。";
    if (message) return "產生沒有成功：" + String(message).slice(0, 280);
    return "產生沒有成功。請檢查網路後再試一次。";
  }

  function shouldRetryWithoutSchema(status, message) {
    if (status !== 400) return false;
    var m = String(message || "").toLowerCase();
    if (m.indexOf("api key") !== -1 || m.indexOf("api_key") !== -1) return false;
    return m.indexOf("schema") !== -1 || m.indexOf("generation") !== -1 || m.indexOf("response_mime") !== -1;
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
      if (err.name === "AbortError") {
        throw new Error("這次等太久了。可以少上傳幾張圖片，或把題數改小再試。");
      }
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

  async function generateGemini(settings, prompt, questionType) {
    var parts = [{ text: prompt }];
    state.images.forEach(function (image) {
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
    });
    var url = "https://generativelanguage.googleapis.com/v1beta/models/"
      + encodeURIComponent(settings.geminiModel) + ":generateContent";
    var count = parseCount();
    function body(withSchema) {
      var generationConfig = {
        temperature: 0.4,
        maxOutputTokens: Math.min(32768, 1200 + count * 450),
        responseMimeType: "application/json",
      };
      if (withSchema) generationConfig.responseSchema = schemaFor(questionType);
      return {
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents: [{ role: "user", parts: parts }],
        generationConfig: generationConfig,
      };
    }
    var headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": settings.geminiKey,
    };
    try {
      return await readGemini(await postJson(url, headers, body(true), "gemini"));
    } catch (err) {
      if (!shouldRetryWithoutSchema(err.status, err.detail)) throw err;
      return await readGemini(await postJson(url, headers, body(false), "gemini"));
    }
  }

  function readGemini(data) {
    var feedback = data.promptFeedback && data.promptFeedback.blockReason;
    if (feedback) throw new Error("這次的內容被 AI 服務擋下了。請確認上傳的是課文或課本頁面，再試一次。");
    var candidate = (data.candidates || [])[0];
    if (!candidate) throw new Error("AI 沒有回傳題目。請再按一次產生。");
    if (candidate.finishReason === "SAFETY") {
      throw new Error("這次的內容被 AI 服務擋下了。請確認上傳的是課文或課本頁面，再試一次。");
    }
    var text = ((candidate.content && candidate.content.parts) || []).map(function (part) {
      return part.text || "";
    }).join("");
    if (candidate.finishReason === "MAX_TOKENS") {
      throw new Error("回應被截斷了，題目不完整。請把題數改小再試一次。");
    }
    return parseModelJson(text);
  }

  async function generateOpenAI(settings, prompt) {
    var content = [{ type: "text", text: prompt }];
    state.images.forEach(function (image) {
      content.push({ type: "image_url", image_url: { url: image.dataUrl } });
    });
    var data = await postJson("https://api.openai.com/v1/chat/completions", {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.openaiKey,
    }, {
      model: settings.openaiModel,
      temperature: 0.4,
      max_tokens: Math.min(16384, 1200 + parseCount() * 450),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: content },
      ],
    }, "openai");
    var choice = data.choices && data.choices[0];
    var text = choice && choice.message && choice.message.content;
    if (!text) throw new Error("AI 沒有回傳題目。請再按一次產生。");
    if (choice.finish_reason === "length") {
      throw new Error("回應被截斷了，題目不完整。請把題數改小再試一次。");
    }
    return parseModelJson(text);
  }

  function parseModelJson(text) {
    var trimmed = String(text || "").trim().replace(/^\uFEFF/, "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try {
      return JSON.parse(trimmed);
    } catch (err) {
      var start = trimmed.indexOf("{");
      var end = trimmed.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try { return JSON.parse(trimmed.slice(start, end + 1)); } catch (inner) { /* 下面統一報錯 */ }
      }
    }
    throw new Error("AI 有回應，但不是我讀得懂的題目格式。請再按一次產生。");
  }

  function pick(obj, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (obj[keys[i]] != null && String(obj[keys[i]]).trim()) return String(obj[keys[i]]).trim();
    }
    return "";
  }

  function cleanStem(stem) {
    return String(stem || "")
      .replace(/^\s*[（(]\s*[）)]\s*/, "")
      .replace(/^\s*[0-9０-９]+[.．、]\s*/, "")
      .replace(/[\r\n]+/g, "")
      .trim();
  }

  function cleanOption(value) {
    return String(value || "")
      .replace(/^\s*[①②③④⑤]\s*/, "")
      .replace(/^\s*[1-3１-３A-Ca-c][.．、]\s*/, "")
      .replace(/[\r\n]+/g, "")
      .trim();
  }

  function toOptions(raw) {
    var list = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw && typeof raw === "object") list = [raw["1"] || raw.A || raw.a || raw["①"], raw["2"] || raw.B || raw.b, raw["3"] || raw.C || raw.c];
    else if (typeof raw === "string") list = raw.split(/[　\n|]/);
    var options = list.map(cleanOption).filter(function (item) { return item; }).slice(0, 3);
    while (options.length < 3) options.push("");
    return options;
  }

  function normalizeAnswer(value, options) {
    if (typeof value === "number" && value >= 1 && value <= 3) return value;
    var text = String(value == null ? "" : value).trim();
    var circledAt = "①②③".indexOf(text);
    if (circledAt !== -1) return circledAt + 1;
    var digit = { "1": 1, "2": 2, "3": 3, "１": 1, "２": 2, "３": 3 }[text.charAt(0)];
    if (digit && (text.length === 1 || /^[1-3１-３][.．、]/.test(text))) return digit;
    var found = options.findIndex(function (option) { return option && option === text; });
    return found >= 0 ? found + 1 : 1;
  }

  function normalizeQuestion(raw, questionType) {
    if (!raw || typeof raw !== "object") return null;
    if (questionType === "choice") {
      var stem = cleanStem(pick(raw, ["stem", "question", "題幹", "題目"]));
      var options = toOptions(raw.options || raw.choices || raw["選項"]);
      if (!stem && options.every(function (option) { return !option; })) return null;
      return { stem: stem, options: options, answer: normalizeAnswer(raw.answer != null ? raw.answer : raw["答案"], options) };
    }
    if (questionType === "word") {
      var word = cleanStem(pick(raw, ["word", "生字", "詞", "stem"]));
      var sampleWord = cleanStem(pick(raw, ["sampleWord", "造詞", "wordAnswer"]));
      var sampleSentence = cleanStem(pick(raw, ["sampleSentence", "造句", "sentence"]));
      if (!word && !sampleWord && !sampleSentence) return null;
      return { word: word, sampleWord: sampleWord, sampleSentence: sampleSentence };
    }
    var stemText = cleanStem(pick(raw, ["stem", "question", "題幹", "題目"]));
    var answer = cleanStem(pick(raw, ["answer", "答案"]));
    if (!stemText && !answer) return null;
    return { stem: stemText, answer: answer };
  }

  function normalizeResult(raw, questionType, count) {
    var obj = raw && raw.levels && typeof raw.levels === "object" ? raw.levels : raw;
    if (!obj || typeof obj !== "object") throw new Error("AI 有回應，但不是我讀得懂的題目格式。請再按一次產生。");
    var levels = {};
    LEVEL_ORDER.forEach(function (level) {
      var list = obj[level] || obj[level === "mid" ? "middle" : level] || [];
      if (!Array.isArray(list)) list = [];
      levels[level] = list.map(function (item) {
        return normalizeQuestion(item, questionType);
      }).filter(Boolean).slice(0, count);
    });
    return levels;
  }

  function blankQuestion(questionType) {
    if (questionType === "choice") return { stem: "", options: ["", "", ""], answer: 1 };
    if (questionType === "word") return { word: "", sampleWord: "", sampleSentence: "" };
    return { stem: "", answer: "" };
  }

  function setBusy(busy) {
    state.busy = busy;
    $("generate").disabled = busy;
    $("fill-sample").disabled = busy;
    $("generate").textContent = busy ? "正在出題…" : "產生三份學習單";
  }

  async function generate() {
    if (state.busy) return;
    show("form-error", "error", "");
    show("form-status", "ok", "");
    var settings = saveSettings(false);
    var problem = validateForm(settings);
    if (problem) {
      show("form-error", "error", problem);
      return;
    }
    setBusy(true);
    var waiting = state.images.length
      ? "正在把課文和圖片送給 AI，請稍候。題數較多時可能要等半分鐘，請不要關閉頁面。"
      : "正在出題，請稍候。題數較多時可能要等半分鐘，請不要關閉頁面。";
    show("form-status", "ok", waiting);
    try {
      var count = parseCount();
      var questionType = currentType();
      var prompt = userPrompt(count, questionType);
      var raw = settings.provider === "openai"
        ? await generateOpenAI(settings, prompt)
        : await generateGemini(settings, prompt, questionType);
      var levels = normalizeResult(raw, questionType, count);
      var total = LEVEL_ORDER.reduce(function (sum, level) { return sum + levels[level].length; }, 0);
      if (!total) throw new Error("這次沒有產出可以用的題目。請把課文再貼清楚一點，或減少題數後重試。");
      state.worksheet = {
        titleBase: $("title").value.trim(),
        questionType: questionType,
        source: "ai",
        levels: levels,
      };
      renderPreview();
      var short = LEVEL_ORDER.some(function (level) { return levels[level].length < count; });
      show("form-status", "ok", "三份都好了。請先看過、改過，再下載。");
      if (short) {
        show("preview-note", "warn", "你要每個程度 " + count + " 題，這次低 "
          + levels.low.length + " 題、中 " + levels.mid.length + " 題、高 "
          + levels.high.length + " 題。可以再產生一次，或直接改這份。");
      }
      focusPreview();
    } catch (err) {
      show("form-status", "ok", "");
      show("form-error", "error", err.message || "產生沒有成功。請再試一次。");
    } finally {
      setBusy(false);
    }
  }

  function focusPreview() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("preview-section").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    $("preview-heading").tabIndex = -1;
    $("preview-heading").focus();
  }

  function field(tag, value, label, onInput) {
    var node = document.createElement(tag);
    node.value = value || "";
    if (tag === "textarea") node.rows = 2;
    else node.type = "text";
    node.setAttribute("aria-label", label);
    node.spellcheck = false;
    node.addEventListener("input", function () { onInput(node.value); });
    return node;
  }

  function renderPreview() {
    var worksheet = state.worksheet;
    var section = $("preview-section");
    var papers = $("papers");
    if (!worksheet) {
      section.hidden = true;
      papers.replaceChildren();
      return;
    }
    section.hidden = false;
    papers.replaceChildren();
    if (worksheet.source === "sample") {
      show("preview-note", "warn", "這是內建示例，用來對 Word 版面，不是根據你的課文產生的。正式出題請按「產生三份學習單」。");
    }
    LEVEL_ORDER.forEach(function (levelId) {
      papers.appendChild(renderColumn(worksheet, levelId));
    });
  }

  function renderColumn(worksheet, levelId) {
    var spec = window.WorksheetDocx.LEVELS[levelId];
    var questions = worksheet.levels[levelId];
    var col = document.createElement("section");
    col.className = "paper-col level-" + levelId;

    var head = document.createElement("div");
    head.className = "col-head";
    var titles = document.createElement("div");
    var heading = document.createElement("h3");
    heading.textContent = spec.label;
    var meta = document.createElement("p");
    meta.textContent = spec.pt + " 點・行距 " + spec.lineHeight;
    titles.append(heading, meta);
    var download = document.createElement("button");
    download.type = "button";
    download.className = "btn small";
    download.textContent = "下載這份";
    download.setAttribute("aria-label", "下載" + spec.label + "程度");
    download.addEventListener("click", function () { downloadLevel(levelId); });
    head.append(titles, download);

    var sheet = document.createElement("article");
    sheet.className = "sheet";
    sheet.style.fontSize = spec.pt + "pt";
    sheet.style.lineHeight = String(spec.lineHeight);

    var title = document.createElement("h3");
    title.className = "sheet-title";
    title.dataset.sheetTitle = levelId;
    title.style.fontSize = (spec.titleHalfPoints / 2) + "pt";
    title.textContent = window.WorksheetDocx.sheetTitle(worksheet.titleBase, spec.label);

    var nameLine = document.createElement("p");
    nameLine.className = "sheet-name";
    nameLine.textContent = "班級：＿＿＿＿　座號：＿＿＿　姓名：＿＿＿＿＿＿";

    var instruction = document.createElement("p");
    instruction.className = "sheet-instruction";
    instruction.textContent = window.WorksheetDocx.INSTRUCTIONS[worksheet.questionType];

    sheet.append(title, nameLine, instruction);
    questions.forEach(function (question, index) {
      sheet.appendChild(renderQuestion(worksheet, levelId, question, index));
    });

    var add = document.createElement("button");
    add.type = "button";
    add.className = "btn secondary small";
    add.textContent = "加一題";
    add.addEventListener("click", function () {
      questions.push(blankQuestion(worksheet.questionType));
      renderPreview();
    });

    var key = document.createElement("p");
    key.className = "key-preview";
    key.dataset.key = levelId;
    key.textContent = keyBlock(worksheet, levelId);

    col.append(head, sheet, add, key);
    return col;
  }

  function keyBlock(worksheet, levelId) {
    var lines = window.WorksheetDocx.formatKeyLines(worksheet.questionType, worksheet.levels[levelId]);
    return "答案（" + window.WorksheetDocx.LEVELS[levelId].label + "）\n" + lines.join("\n");
  }

  function refreshKey(levelId) {
    var node = document.querySelector('[data-key="' + levelId + '"]');
    if (node && state.worksheet) node.textContent = keyBlock(state.worksheet, levelId);
  }

  function renderQuestion(worksheet, levelId, question, index) {
    var block = document.createElement("div");
    block.className = "q-block";
    var n = index + 1;
    if (worksheet.questionType === "choice") block.appendChild(renderChoice(worksheet, levelId, question, index, n));
    else if (worksheet.questionType === "word") block.appendChild(renderWord(worksheet, levelId, question, index, n));
    else block.appendChild(renderOpen(worksheet, levelId, question, index, n));
    return block;
  }

  function stemRow(n, value, label, onInput) {
    var row = document.createElement("div");
    row.className = "q-stem";
    var no = document.createElement("span");
    no.className = "q-no";
    no.textContent = "（　）" + n + ".";
    row.append(no, field("textarea", value, label, onInput));
    return row;
  }

  function deleteButton(levelId, index) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn secondary small";
    button.textContent = "刪除此題";
    button.addEventListener("click", function () {
      state.worksheet.levels[levelId].splice(index, 1);
      renderPreview();
    });
    return button;
  }

  function renderChoice(worksheet, levelId, question, index, n) {
    var wrap = document.createDocumentFragment();
    wrap.appendChild(stemRow(n, question.stem, "第 " + n + " 題題幹", function (value) {
      question.stem = value;
    }));
    var opts = document.createElement("div");
    opts.className = "opts";
    question.options.forEach(function (option, optionIndex) {
      var item = document.createElement("label");
      item.className = "opt";
      var mark = document.createElement("span");
      mark.textContent = CIRCLED[optionIndex];
      item.append(mark, field("input", option, "第 " + n + " 題選項 " + CIRCLED[optionIndex], function (value) {
        question.options[optionIndex] = value;
      }));
      opts.appendChild(item);
    });
    var key = document.createElement("div");
    key.className = "key-edit";
    var label = document.createElement("span");
    label.textContent = "答案頁・正確選項";
    key.appendChild(label);
    var groupName = "answer-" + levelId + "-" + index;
    CIRCLED.forEach(function (mark, optionIndex) {
      var choice = document.createElement("label");
      choice.className = "choice";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = groupName;
      radio.value = String(optionIndex + 1);
      radio.checked = Number(question.answer) === optionIndex + 1;
      radio.addEventListener("change", function () {
        question.answer = optionIndex + 1;
        refreshKey(levelId);
      });
      choice.append(radio, document.createTextNode(mark));
      key.appendChild(choice);
    });
    key.appendChild(deleteButton(levelId, index));
    wrap.append(opts, key);
    return wrap;
  }

  function renderOpen(worksheet, levelId, question, index, n) {
    var wrap = document.createDocumentFragment();
    wrap.appendChild(stemRow(n, question.stem, "第 " + n + " 題題幹", function (value) {
      question.stem = value;
    }));
    if (worksheet.questionType === "short") {
      var lines = levelId === "high" ? 3 : 2;
      var count = levelId === "low" ? 16 : levelId === "mid" ? 20 : 22;
      for (var i = 0; i < lines; i += 1) {
        var line = document.createElement("p");
        line.className = "write-line";
        line.textContent = "＿".repeat(count);
        wrap.appendChild(line);
      }
    }
    var key = document.createElement("div");
    key.className = "key-edit";
    var label = document.createElement("span");
    label.textContent = "答案頁";
    key.append(label, field("input", question.answer, "第 " + n + " 題參考答案", function (value) {
      question.answer = value;
      refreshKey(levelId);
    }), deleteButton(levelId, index));
    wrap.appendChild(key);
    return wrap;
  }

  function renderWord(worksheet, levelId, question, index, n) {
    var wrap = document.createDocumentFragment();
    var row = document.createElement("div");
    row.className = "q-stem";
    var no = document.createElement("span");
    no.className = "q-no";
    no.textContent = "（　）" + n + ".";
    row.append(no, field("input", question.word, "第 " + n + " 題的詞", function (value) {
      question.word = value;
    }));
    var wordLine = document.createElement("p");
    wordLine.className = "write-line";
    wordLine.textContent = "造詞：＿＿＿＿＿＿＿＿";
    var sentence = document.createElement("p");
    sentence.className = "write-line";
    var count = levelId === "low" ? 16 : levelId === "mid" ? 20 : 22;
    sentence.textContent = "造句：" + "＿".repeat(count);
    var key = document.createElement("div");
    key.className = "key-edit";
    key.append(
      field("input", question.sampleWord, "第 " + n + " 題參考造詞", function (value) {
        question.sampleWord = value;
        refreshKey(levelId);
      }),
      field("textarea", question.sampleSentence, "第 " + n + " 題參考造句", function (value) {
        question.sampleSentence = value;
        refreshKey(levelId);
      }),
      deleteButton(levelId, index)
    );
    var caption = document.createElement("span");
    caption.textContent = "答案頁・造詞／造句";
    key.prepend(caption);
    wrap.append(row, wordLine, sentence, key);
    return wrap;
  }

  function payload(levelId) {
    return {
      titleBase: state.worksheet.titleBase,
      level: levelId,
      questionType: state.worksheet.questionType,
      questions: state.worksheet.levels[levelId],
    };
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

  async function downloadLevel(levelId) {
    if (!state.worksheet || !window.WorksheetDocx) return;
    try {
      var blob = await window.WorksheetDocx.toBlob(payload(levelId));
      saveBlob(blob, window.WorksheetDocx.fileName(state.worksheet.titleBase, levelId));
    } catch (err) {
      show("form-error", "error", "這份 Word 沒有做成。請重新整理後再試。");
    }
  }

  async function downloadAll() {
    if (!state.worksheet) return;
    if (typeof JSZip === "undefined") {
      show("form-error", "error", "壓縮程式沒有載入。請改按每一份的「下載這份」，或重新整理。");
      return;
    }
    try {
      var zip = new JSZip();
      for (var i = 0; i < LEVEL_ORDER.length; i += 1) {
        var levelId = LEVEL_ORDER[i];
        var blob = await window.WorksheetDocx.toBlob(payload(levelId));
        zip.file(window.WorksheetDocx.fileName(state.worksheet.titleBase, levelId), blob);
      }
      var packed = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      saveBlob(packed, window.WorksheetDocx.zipName(state.worksheet.titleBase));
    } catch (err) {
      show("form-error", "error", "三份沒有一起下載成功。請改按每一份的「下載這份」。");
    }
  }

  function loadSample() {
    if (state.worksheet && !window.confirm("這會用示例題目換掉目前的預覽，方便先看 Word 版面。要繼續嗎？")) return;
    var sample = window.WORKSHEET_SAMPLE;
    if (!$("title").value.trim()) $("title").value = sample.titleBase;
    if (!$("passage").value.trim()) $("passage").value = sample.passage;
    if (!$("vocab").value.trim()) $("vocab").value = sample.vocab;
    var questionType = currentType();
    state.worksheet = {
      titleBase: $("title").value.trim() || sample.titleBase,
      questionType: questionType,
      source: "sample",
      levels: JSON.parse(JSON.stringify(sample.byType[questionType])),
    };
    updatePassageCount();
    updateTypeHint();
    saveDraft();
    show("form-error", "error", "");
    show("form-status", "ok", "");
    renderPreview();
    focusPreview();
  }

  function refreshTitles() {
    if (!state.worksheet) return;
    state.worksheet.titleBase = $("title").value.trim();
    document.querySelectorAll("[data-sheet-title]").forEach(function (node) {
      var levelId = node.dataset.sheetTitle;
      node.textContent = window.WorksheetDocx.sheetTitle(state.worksheet.titleBase, window.WorksheetDocx.LEVELS[levelId].label);
    });
  }

  function init() {
    if (!window.WorksheetDocx || !window.WorksheetDocx.toBlob) {
      show("form-error", "error", "頁面不完整，Word 產生程式沒有載入。請重新整理。");
      $("generate").disabled = true;
      $("fill-sample").disabled = true;
      return;
    }
    applySettings(readStorage(STORAGE_KEY) || {});
    if (!settingsFromForm().geminiKey && !settingsFromForm().openaiKey) $("settings").open = true;
    restoreDraft();
    updatePassageCount();
    updateTypeHint();

    document.querySelectorAll('input[name="provider"]').forEach(function (input) {
      input.addEventListener("change", syncProviderFields);
    });
    document.querySelectorAll('input[name="qtype"]').forEach(function (input) {
      input.addEventListener("change", function () {
        updateTypeHint();
        saveDraft();
      });
    });
    ["title", "count", "passage", "vocab", "gemini-model", "openai-model"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        if (id === "passage") updatePassageCount();
        if (id === "title") refreshTitles();
        if (id === "passage" || id === "vocab") updateTypeHint();
        if (id === "title" || id === "count" || id === "passage" || id === "vocab") saveDraft();
      });
    });
    $("save-settings").addEventListener("click", function () { saveSettings(true); });
    $("clear-settings").addEventListener("click", clearSettings);
    $("toggle-key").addEventListener("click", function () {
      var provider = currentProvider();
      var input = $(provider === "openai" ? "openai-key" : "gemini-key");
      var showText = input.type === "password";
      input.type = showText ? "text" : "password";
      $("toggle-key").textContent = showText ? "隱藏金鑰" : "顯示金鑰";
    });
    $("generate").addEventListener("click", generate);
    $("fill-sample").addEventListener("click", loadSample);
    $("download-all").addEventListener("click", downloadAll);
    $("pick-images").addEventListener("click", function () { $("images").click(); });
    $("images").addEventListener("change", function (event) {
      addFiles(event.target.files);
      event.target.value = "";
    });
    var drop = $("drop");
    ["dragenter", "dragover"].forEach(function (name) {
      drop.addEventListener(name, function (event) {
        event.preventDefault();
        drop.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (name) {
      drop.addEventListener(name, function (event) {
        event.preventDefault();
        drop.classList.remove("dragover");
      });
    });
    drop.addEventListener("drop", function (event) {
      addFiles(event.dataTransfer && event.dataTransfer.files);
    });
  }

  init();
})();
