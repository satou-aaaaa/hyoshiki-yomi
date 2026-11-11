// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、標識の形の見本と遊び方だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
const G = require("../gen.js");
const one = (id) => G.svgOf(id).replace("<svg", '<svg width="170" height="170"');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:64px 80px;background:#eef1f4;color:#18233a;display:flex;align-items:center;gap:40px">
    <div style="flex:1">
      <div style="font-size:32px;color:#a3241b;letter-spacing:.06em">道路標識の決まりで学ぶ・時間制限なし</div>
      <div style="font-size:120px;font-weight:900;margin-top:10px;letter-spacing:.1em;color:#173f80">標識<span style="color:#c62d22">よみ</span></div>
      <div style="font-size:42px;margin-top:10px;line-height:1.5">この標識、なんの意味？<br>1日5問</div>
    </div>
    <div style="display:grid;grid-template-columns:170px 170px;gap:16px">${["215", "316", "212-3", "405"].map(one).join("")}</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
