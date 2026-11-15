/* 課文朗讀的台灣國語語音。
   十二課共用這支檔。老師選過的語音存在 localStorage，
   鍵名 teaching-tools-zh-tw-voice，換課不用重選。
   瀏覽器的語音清單是非同步才到的；若在清單空的時候就朗讀，
   會落到預設聲音（常常是大陸普通話）。這裡等 voiceschanged
   把清單存起來，再挑台灣國語。
*/
(function (root) {
  'use strict';

  var STORE_KEY = 'teaching-tools-zh-tw-voice';
  var HINT = '這台裝置沒有台灣國語語音，建議用 Edge 或 Chrome，或在系統語言設定加入『中文（台灣）』語音';

  /* 分數高的優先。順序對應教室裡比較順耳的台灣國語：
     自然語音 HsiaoChen / HsiaoYu / YunJhe，其次 Hanhan / Yating / Zhiwei，
     再來 Google 國語（台灣）、Apple Meijia，最後才是其他 zh-TW。 */
  var NAME_RANKS = [
    [/hsiao\s*-?\s*chen|曉臻/i, 100],
    [/hsiao\s*-?\s*yu|曉雨/i, 96],
    [/yun\s*-?\s*jhe|yun\s*-?\s*zhe|雲哲/i, 92],
    [/han\s*-?\s*han|涵涵/i, 80],
    [/ya\s*-?\s*ting|雅婷/i, 78],
    [/zhi\s*-?\s*wei|志威/i, 76],
    [/國語\s*[（(]?\s*[臺台]灣|[臺台]灣\s*[）)]?\s*國語|中文\s*[（(]?\s*[臺台]灣/i, 70],
    [/mei\s*-?\s*jia|美佳/i, 66],
    [/google[^\n]{0,40}taiwan|chinese\s*\(\s*taiwan\s*\)/i, 64]
  ];

  function normLang(lang) {
    return String(lang || '').trim().toLowerCase().replace(/_/g, '-');
  }

  function isTaiwanMandarinLang(lang) {
    var l = normLang(lang);
    if (!l) return false;
    return l === 'zh-tw' || l === 'zh-hant-tw' || l === 'cmn-hant-tw' || l === 'cmn-tw' ||
      /^zh-tw(-|$)/.test(l) || /^zh-hant-tw(-|$)/.test(l) || /^cmn-hant-tw(-|$)/.test(l);
  }

  function voiceBlob(v) {
    return (v && v.name ? v.name : '') + ' ' + (v && v.voiceURI ? v.voiceURI : '');
  }

  function nameRank(v) {
    var blob = voiceBlob(v);
    var best = 0;
    for (var i = 0; i < NAME_RANKS.length; i++) {
      if (NAME_RANKS[i][0].test(blob)) best = Math.max(best, NAME_RANKS[i][1]);
    }
    return best;
  }

  /* 閩南語、客語、粵語即使標了台灣，也不是國語課要的聲音。 */
  function isNonMandarin(v) {
    var l = normLang(v && v.lang);
    var blob = voiceBlob(v);
    if (/^(nan|hak|yue|wuu)/.test(l)) return true;
    if (/閩南|台語|臺語|客家|hakka|hokkien|cantonese|粵語|粤語/i.test(blob)) return true;
    return false;
  }

  function isTaiwanVoice(v) {
    if (!v || isNonMandarin(v)) return false;
    if (isTaiwanMandarinLang(v.lang)) return true;
    return nameRank(v) > 0;
  }

  function isChineseVoice(v) {
    if (!v) return false;
    if (isTaiwanVoice(v)) return true;
    var l = normLang(v.lang);
    if (/^(zh|cmn|yue|nan|hak|wuu)/.test(l)) return true;
    return /中文|國語|普通話|普通话|粵語|粤語|chinese/i.test(voiceBlob(v));
  }

  function scoreVoice(v) {
    if (!isTaiwanVoice(v)) return -1;
    var s = Math.max(nameRank(v), isTaiwanMandarinLang(v.lang) ? 40 : 0);
    if (/natural|自然/i.test(voiceBlob(v))) s += 5;
    return s;
  }

  function byScore(a, b) {
    var d = scoreVoice(b) - scoreVoice(a);
    if (d) return d;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant');
  }

  function byOther(a, b) {
    var d = normLang(a.lang).localeCompare(normLang(b.lang));
    if (d) return d;
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant');
  }

  function findSaved(list, saved) {
    if (!saved) return null;
    var i, v;
    if (saved.uri) {
      for (i = 0; i < list.length; i++) {
        v = list[i];
        if (v.voiceURI && v.voiceURI === saved.uri) return v;
      }
    }
    if (saved.name) {
      for (i = 0; i < list.length; i++) {
        v = list[i];
        if (v.name === saved.name && normLang(v.lang) === normLang(saved.lang)) return v;
      }
      for (i = 0; i < list.length; i++) {
        if (list[i].name === saved.name) return list[i];
      }
    }
    return null;
  }

  /* saved 有值時尊重老師的選擇（含其他中文）。
     沒有選擇時只回傳台灣國語；沒有 zh-TW 就回傳 null，不要改配 zh-CN / zh-HK。 */
  function pickVoice(list, saved) {
    var voices = list || [];
    if (saved) {
      var chosen = findSaved(voices, saved);
      if (chosen && isChineseVoice(chosen)) return chosen;
    }
    var tw = [];
    for (var i = 0; i < voices.length; i++) if (isTaiwanVoice(voices[i])) tw.push(voices[i]);
    if (!tw.length) return null;
    tw.sort(byScore);
    return tw[0];
  }

  function groupVoices(list) {
    var tw = [], other = [];
    for (var i = 0; i < (list || []).length; i++) {
      var v = list[i];
      if (!isChineseVoice(v)) continue;
      if (isTaiwanVoice(v)) tw.push(v);
      else other.push(v);
    }
    tw.sort(byScore);
    other.sort(byOther);
    return { taiwan: tw, other: other };
  }

  var api = {
    STORE_KEY: STORE_KEY,
    HINT: HINT,
    normLang: normLang,
    isTaiwanMandarinLang: isTaiwanMandarinLang,
    isTaiwanVoice: isTaiwanVoice,
    isChineseVoice: isChineseVoice,
    scoreVoice: scoreVoice,
    pickVoice: pickVoice,
    groupVoices: groupVoices,
    findSaved: findSaved
  };

  function loadChoice() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      return { uri: data.uri || '', name: data.name || '', lang: data.lang || '' };
    } catch (e) {
      return null;
    }
  }

  function saveChoice(v) {
    try {
      if (!root.localStorage) return;
      if (!v) root.localStorage.removeItem(STORE_KEY);
      else root.localStorage.setItem(STORE_KEY, JSON.stringify({
        uri: v.voiceURI || '',
        name: v.name || '',
        lang: v.lang || ''
      }));
    } catch (e) {}
  }

  function install() {
    var synth = root.speechSynthesis;
    if (!synth || typeof root.SpeechSynthesisUtterance !== 'function') {
      root.zhTwSpeak = function () { throw new Error('no-tts'); };
      ready(function () { mount(null); });
      return;
    }

    var voices = [];
    var lastSig = '';
    var settled = false;
    var token = 0;
    var kept = null;
    var held = [];
    var upgradeToken = 0;
    var select = null;
    var hint = null;

    /* 不要改寫 speak 會呼叫到的 cancel。
       只在頁面自己按下停止時把排隊中的朗讀作廢，並呼叫原型上原本的 cancel。 */
    var protoCancel = null;
    try { protoCancel = Object.getPrototypeOf(synth).cancel; } catch (e) {}
    if (protoCancel) {
      try {
        synth.cancel = function () {
          token += 1;
          upgradeToken = 0;
          try { protoCancel.call(synth); } catch (err) {}
        };
      } catch (e) {}
    }

    function freshVoices() {
      var list = [];
      try { list = synth.getVoices() || []; } catch (e) { list = []; }
      if (list.length) adopt(list);
      return list;
    }

    function retain(u) {
      /* Edge／Chrome 若沒人留著這段 utterance，會在念出來之前把它回收，聲音就沒了。 */
      kept = u;
      held.push(u);
      var prevEnd = u.onend;
      var prevErr = u.onerror;
      u.onend = function (ev) {
        root.setTimeout(function () {
          held = held.filter(function (x) { return x !== u; });
          if (kept === u) kept = null;
        }, 1000);
        if (typeof prevEnd === 'function') prevEnd.call(this, ev);
      };
      u.onerror = function (ev) {
        if (typeof prevErr === 'function') prevErr.call(this, ev);
      };
    }

    function resume() {
      try { synth.resume(); } catch (e) {}
    }

    /* 聲音物件必須來自「這一次」getVoices()。用舊清單裡的物件，Edge 會把朗讀吃掉。 */
    function speakNow(u, list) {
      var voice = list && list.length ? pickVoice(list, loadChoice()) : null;
      u.lang = 'zh-TW';
      if (voice) {
        try { u.voice = voice; } catch (e) {}
      }
      kept = u;
      resume();
      synth.speak(u);
      resume();
      try { if (synth.paused) resume(); } catch (e) {}
      return !!(voice && u.voice);
    }

    function signature(list) {
      var parts = [];
      for (var i = 0; i < list.length; i++) {
        var v = list[i];
        parts.push((v.voiceURI || '') + '\t' + (v.name || '') + '\t' + (v.lang || ''));
      }
      return parts.join('\n');
    }

    function render() {
      if (!select) return;
      var groups = groupVoices(voices);
      var saved = loadChoice();
      var chosen = saved ? findSaved(voices, saved) : null;
      var focus = root.document.activeElement === select;
      select.textContent = '';
      var auto = root.document.createElement('option');
      auto.value = '';
      auto.textContent = '自動';
      auto.title = '自動（台灣國語）';
      select.appendChild(auto);
      appendGroup('台灣國語', groups.taiwan);
      appendGroup('其他中文', groups.other);
      if (chosen && isChineseVoice(chosen)) {
        for (var i = 0; i < voices.length; i++) if (voices[i] === chosen) select.value = String(i);
      } else select.value = '';
      if (focus) select.focus();
      var showHint = settled && !groups.taiwan.length;
      if (hint) {
        hint.hidden = !showHint;
        hint.textContent = showHint ? HINT : '';
      }
      var current = select.options[select.selectedIndex];
      select.title = select.value ? (current ? current.textContent : '朗讀語音') : '自動（台灣國語）';
    }

    function appendGroup(label, list) {
      if (!list.length) return;
      var group = root.document.createElement('optgroup');
      group.label = label;
      for (var i = 0; i < list.length; i++) {
        var v = list[i];
        var idx = voices.indexOf(v);
        var opt = root.document.createElement('option');
        opt.value = String(idx);
        opt.textContent = optionLabel(v);
        opt.title = ((v.name || '') + ' ' + (v.lang || '')).trim();
        group.appendChild(opt);
      }
      select.appendChild(group);
    }

    function optionLabel(v) {
      var name = (v.name || '').trim() || '未命名語音';
      var lang = (v.lang || '').trim();
      if (!lang) return name;
      if (name.toLowerCase().indexOf(lang.toLowerCase()) !== -1) return name;
      if (/[臺台]灣|taiwan/i.test(name)) return name;
      return name + '（' + lang + '）';
    }

    function adopt(list) {
      if (!list || !list.length) return false;
      var sig = signature(list);
      var changed = sig !== lastSig;
      voices = list;
      if (changed) {
        lastSig = sig;
        render();
      }
      return true;
    }

    function upgradeKept() {
      if (!kept || !upgradeToken || upgradeToken !== token) return;
      var list = freshVoices();
      var voice = list.length ? pickVoice(list, loadChoice()) : null;
      if (!voice || !isTaiwanVoice(voice)) return;
      var u = kept;
      var my = token;
      upgradeToken = 0;
      /* 先前只能先念、還沒配到台灣國語。清單到了就改用正確的聲音再念一次。 */
      root.setTimeout(function () {
        if (my !== token) return;
        var now = freshVoices();
        try { if (protoCancel) protoCancel.call(synth); } catch (e) {}
        speakNow(u, now);
      }, 80);
    }

    function markSettled() {
      if (settled) return;
      settled = true;
      render();
    }

    function onVoices() {
      freshVoices();
      upgradeKept();
    }

    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', onVoices);
    else synth.onvoiceschanged = onVoices;

    try { freshVoices(); } catch (e) {}

    var polls = 0;
    var pollTimer = root.setInterval(function () {
      polls += 1;
      var list = freshVoices();
      var hasTw = false;
      for (var i = 0; i < list.length; i++) if (isTaiwanVoice(list[i])) hasTw = true;
      if (hasTw) upgradeKept();
      /* 清單可能分批出現。有台灣國語就停；否則最多再等大約三秒。 */
      if (hasTw || polls >= 25) {
        root.clearInterval(pollTimer);
        markSettled();
      }
    }, 120);
    root.setTimeout(markSettled, 1800);

    root.zhTwSpeak = function (u) {
      if (!u) return;
      var my = ++token;
      retain(u);
      u.lang = 'zh-TW';
      var list = freshVoices();
      var voice = list.length ? pickVoice(list, loadChoice()) : null;
      if (!voice) {
        /* 清單還沒到：先在點擊當下念出來，避免 Edge 把延後的朗讀擋掉。 */
        upgradeToken = my;
        try { speakNow(u, []); } catch (e) {}
        return;
      }
      /* 課文會先 cancel() 再念。Edge 若在同一個回合又指定聲音，這次朗讀會被清掉，
         所以等取消做完再念。聲音物件只用這時候重新查到的那一份。 */
      root.setTimeout(function () {
        if (my !== token) return;
        try { speakNow(u, freshVoices()); } catch (e) {}
      }, 80);
    };

    ready(function () { mount(synthControl); });

    function synthControl(barSelect, barHint) {
      select = barSelect;
      hint = barHint;
      /* 方向鍵和空白鍵留給選單，不要同時翻到下一頁。 */
      select.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageUp' || e.key === 'PageDown') {
          e.stopPropagation();
        }
      });
      select.addEventListener('change', function () {
        if (!select.value) {
          saveChoice(null);
          select.title = '自動（台灣國語）';
          return;
        }
        var v = voices[Number(select.value)];
        if (v) saveChoice(v);
        var current = select.options[select.selectedIndex];
        select.title = current ? current.textContent : '朗讀語音';
      });
      render();
    }
  }

  function mount(done) {
    if (root.document.getElementById('zh-voice-dock')) {
      if (done) done(root.document.getElementById('zh-voice-select'), root.document.getElementById('zh-voice-hint'));
      return;
    }
    var style = root.document.createElement('style');
    style.textContent = [
      /* 浮在角落，不進文件流，課文格子維持原來的高度。 */
      '#zh-voice-dock{position:fixed;z-index:45;top:0;right:0;display:flex;flex-direction:column;align-items:flex-end;width:max-content;max-width:min(42vw,15rem);pointer-events:none}',
      '#zh-voice-dock .zh-voice-bar,#zh-voice-dock .zh-voice-hint{pointer-events:auto}',
      '#zh-voice-dock .zh-voice-bar{display:inline-flex;align-items:center;gap:.3em;font-family:inherit;font-size:13px;line-height:1.2;padding:3px 8px;background:var(--panel,#fff);color:var(--soft,#5f6e58);border:1px solid var(--soft,#5f6e58);border-top:0;border-bottom-left-radius:10px;border-bottom-right-radius:10px;white-space:nowrap}',
      '#zh-voice-dock .zh-voice-bar select{font:inherit;font-size:13px;color:var(--ink,#24301f);background:transparent;border:0;width:4.5rem;max-width:16vw;cursor:pointer}',
      '#zh-voice-dock .zh-voice-bar select:focus-visible{outline:3px solid var(--gold,#E8A33A);outline-offset:2px}',
      '#zh-voice-dock .zh-voice-hint{margin:4px 0 0;padding:6px 8px;background:var(--panel,#fff);color:var(--ink,#24301f);border:1px solid var(--gold,#E8A33A);border-radius:10px;font-family:inherit;font-size:13px;line-height:1.45;width:min(88vw,22rem);box-shadow:0 4px 14px rgba(0,0,0,.12)}'
    ].join('');
    root.document.head.appendChild(style);

    var dock = root.document.createElement('div');
    dock.id = 'zh-voice-dock';
    var bar = root.document.createElement('label');
    bar.className = 'zh-voice-bar';
    var cap = root.document.createElement('span');
    cap.textContent = '🔊 語音';
    var sel = root.document.createElement('select');
    sel.id = 'zh-voice-select';
    sel.setAttribute('aria-label', '朗讀語音');
    sel.autocomplete = 'off';
    bar.appendChild(cap);
    bar.appendChild(sel);
    var hint = root.document.createElement('p');
    hint.id = 'zh-voice-hint';
    hint.className = 'zh-voice-hint';
    hint.hidden = true;
    hint.setAttribute('role', 'status');
    dock.appendChild(bar);
    dock.appendChild(hint);
    root.document.body.appendChild(dock);

    function place() {
      var back = root.document.querySelector('a.hall-back');
      var gap = 0;
      if (back) gap = Math.ceil(back.getBoundingClientRect().width);
      dock.style.right = gap + 'px';
      dock.style.top = '0px';
    }
    place();
    root.addEventListener('resize', place);
    if (root.document.fonts && root.document.fonts.ready) root.document.fonts.ready.then(place).catch(function () {});
    if (root.ResizeObserver) {
      var back = root.document.querySelector('a.hall-back');
      if (back) new root.ResizeObserver(place).observe(back);
    }
    if (done) done(sel, hint);
  }

  function ready(fn) {
    if (!root.document) return;
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  root.zhTwVoice = api;

  if (root.document) {
    try { install(); }
    catch (e) {
      if (typeof root.zhTwSpeak !== 'function') {
        root.zhTwSpeak = function (u) {
          if (!u) return;
          u.lang = 'zh-TW';
          if (root.speechSynthesis) root.speechSynthesis.speak(u);
        };
      }
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
