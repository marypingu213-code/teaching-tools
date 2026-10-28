# 教學設計工具箱

給臺灣特教老師用的靜態小網站。目前有兩個工具：

- **分層學習單產生器**：貼上課文或生字，也可以上傳課本頁面，做出低、中、高三份學習單，再下載成 Word。
- **練字卡修改工具**：開啟練字卡截圖，自動去掉藍色筆順數字、把右邊格子整理成白底置中的注音，再用筆刷、框選或整格清空擦掉筆畫，然後下載或列印。

網站不用安裝、不用編譯。學習單的題目由你自己的 AI 金鑰直接從瀏覽器送出，課文和金鑰不會存到這個 GitHub 倉庫。練字卡只在這台瀏覽器裡改圖，圖片不會上傳。

## 開啟 GitHub Pages

1. 打開這個倉庫的 **Settings**。
2. 左側選 **Pages**。
3. 在 **Build and deployment** 選 **Deploy from a branch**。
4. **Branch** 選 `main`，資料夾選 `/ (root)`。
5. 按 **Save**。
6. 等一兩分鐘，打開：<https://marypingu213-code.github.io/teaching-tools/>

首頁是工具箱。學習單在：<https://marypingu213-code.github.io/teaching-tools/worksheet-generator/>

練字卡在：<https://marypingu213-code.github.io/teaching-tools/practice-card/>

若網址顯示 404，請確認 `main` 分支根目錄已經有 `index.html`，而且 Pages 的來源是 **main / root**。公開倉庫可以直接開 Pages；私有倉庫需要 GitHub 方案支援 Pages。

## 取得 Gemini 金鑰

1. 用 Google 帳號打開 <https://aistudio.google.com/apikey>。
2. 建立一把 API key。
3. 打開學習單產生器，在「AI 設定」貼上金鑰，按「儲存金鑰」。
4. 模型預設是 `gemini-2.5-flash`（有免費額度，額度用完時頁面會提示再試）。

金鑰只寫進這台瀏覽器的 localStorage。它不會進 Git 檔案，也不會送到這個網站。共用電腦用完請按「清除金鑰」。

也可以改選 OpenAI。從網頁直接呼叫 OpenAI 時常被瀏覽器擋住，失敗的話請改回 Gemini。

## 怎麼出學習單

1. 填年級與課題，例如 `四上國語 第1~6課 複習`。下載檔名會是「四上國語 第1~6課 複習學習單（低）」。
2. 選題型。預設是選擇題（三選一），也可以選填空、造詞／造句、簡答。
3. 題數預設 14。低、中、高都會各出這個題數。
4. 貼課文、生字，或上傳課本頁面的圖片。至少要有一項。
5. 按「產生三份學習單」。預覽可以直接改題幹、選項和答案。
6. 分別下載，或按「一次下載三份（壓縮檔）」。壓縮檔裡是三份 `.docx`。

Word 為 A4。字型是標楷體（DFKai-SB），東亞字型設成標楷體。低程度約 17 點、1.5 倍行高；中約 13 點；高約 12.5 點。每一題以（　）開頭，選擇題選項是①②③。最後一頁是答案。

請老師看過再印。題目應只根據你提供的材料，AI 仍可能加料，不對的句子在預覽裡改掉再下載。

不想先用金鑰時，可以按「看示例版面（不呼叫 AI）」，先看 Word 長什麼樣子。那份是網站內建的短例，不是你的課文。

## 怎麼改練字卡

1. 打開練字卡修改工具，把練字卡截圖拖進去，或按「開啟圖片」，也可以 Ctrl+V 貼上。
2. 開圖後會自動去掉藍色筆順數字，右邊格子只留注音（白底、置中）。這兩項可以關掉，或用目前選項重新整理。
3. 用左邊的工具修改：筆畫擦除刪最後一畫，框選擦除去部首或部件，整格清空讓學生自己寫獨體字，修復筆刷把擦過頭的地方畫回來。
4. 可只擦筆畫、保留米字格虛線和框線。改完下載圖片或列印。

圖片只留在這台瀏覽器，不會上傳。

## 新增一個工具

1. 在倉庫根目錄建資料夾，例如 `reading-log/`，裡面放 `index.html`。
2. 打開 `js/tools.js`，在 `TOOLBOX_TOOLS` 陣列加一筆：

```js
{
  id: "reading-log",
  href: "reading-log/",
  title: "閱讀紀錄",
  summary: "一句話說明這個工具做什麼。",
  subject: "國語文",
  status: "ready"
}
```

3. `href` 要用相對路徑，不要用 `/` 開頭，否則在 GitHub Pages 專案網站會跑到帳號首頁。
4. `status` 寫 `"ready"` 才可以點；寫 `"soon"` 會顯示準備中。
5. 把變更推上 `main` 後，首頁會出現新卡片。樣式可沿用 `css/site.css`。

## 檔案

| 路徑 | 用途 |
| --- | --- |
| `index.html` | 工具箱首頁 |
| `js/tools.js` | 工具清單 |
| `css/site.css` | 全站樣式 |
| `worksheet-generator/` | 分層學習單產生器 |
| `practice-card/` | 練字卡修改工具 |
| `vendor/docx.js` | 在瀏覽器產生 Word（docx，MIT） |
| `vendor/jszip.min.js` | 把三份 Word 包成壓縮檔（JSZip，MIT） |

授權全文在 `vendor/DOCX-LICENSE` 與 `vendor/JSZIP-LICENSE`。
