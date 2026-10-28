(function () {
  "use strict";

  var list = document.getElementById("tool-list");
  var count = document.getElementById("tool-count");
  var tools = Array.isArray(window.TOOLBOX_TOOLS) ? window.TOOLBOX_TOOLS : [];

  function text(tag, value, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  var ready = 0;
  var soon = 0;

  tools.forEach(function (tool, index) {
    var isSoon = tool.status === "soon";
    if (isSoon) soon += 1;
    else ready += 1;

    var card = document.createElement(isSoon ? "article" : "a");
    card.className = "tool-card" + (isSoon ? " soon" : "");
    if (!isSoon) {
      var href = String(tool.href || "");
      card.href = /^(javascript|data):/i.test(href) ? "#" : href;
    }

    card.appendChild(text("div", String(index + 1).padStart(2, "0"), "tool-index"));

    var body = document.createElement("div");
    body.appendChild(text("h3", tool.title || "未命名工具"));
    body.appendChild(text("p", tool.summary || ""));
    var meta = document.createElement("div");
    meta.className = "tool-meta";
    if (tool.subject) meta.appendChild(text("span", tool.subject, "tag"));
    meta.appendChild(text("span", isSoon ? "準備中" : "可以用", "tag " + (isSoon ? "soon" : "ready")));
    body.appendChild(meta);
    card.appendChild(body);

    card.appendChild(text("div", isSoon ? "稍後開放" : "進入工具", "tool-go"));
    list.appendChild(card);
  });

  if (!tools.length) {
    list.appendChild(text("p", "還沒有工具。請在 js/tools.js 加入第一個。", "muted"));
  }

  var bits = [];
  if (ready) bits.push(ready + " 個可以用");
  if (soon) bits.push(soon + " 個準備中");
  count.textContent = bits.join("，") || "目前沒有工具";
})();
