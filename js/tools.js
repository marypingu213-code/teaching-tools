/* 工具箱清單。
   新增工具：建一個資料夾（裡面要有 index.html），再在這個陣列加一筆。
   href 用相對路徑，不要用 / 開頭，GitHub Pages 專案網站才找得到。
   status 用 "ready"（可以點）或 "soon"（準備中）。

   例如：
   {
     id: "reading-log",
     href: "reading-log/",
     title: "閱讀紀錄",
     summary: "一句話說明這個工具做什麼。",
     subject: "國語文",
     status: "ready"
   }
*/
window.TOOLBOX_TOOLS = [
  {
    id: "worksheet-generator",
    href: "worksheet-generator/",
    title: "分層學習單產生器",
    summary: "貼上課文或生字，也可以上傳課本頁面。一次做出低、中、高三份學習單，改完再下載 Word。",
    subject: "國語文",
    status: "ready",
  },
  {
    id: "practice-card",
    href: "practice-card/",
    title: "練字卡修改工具",
    summary: "開啟練字卡截圖，自動去掉藍色筆順數字、把右邊格子整理成白底置中的注音。再用筆刷、框選或整格清空擦掉筆畫，下載或列印。",
    subject: "國語文",
    status: "ready",
  },
];
