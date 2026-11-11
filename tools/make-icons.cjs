// アプリのアイコン（icon-192.png・icon-512.png・icon-maskable-512.png）を作る。maskable は Android が丸く切るので、絵を中央の半径40％の中に小さく置く。
// 明るい灰色の地に、黄色のひし形（警戒標識の形）と「よ」。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
const art = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="M50 3L97 50L50 97L3 50Z" fill="#f7c600" stroke="#1a1a1a" stroke-width="1.6"/><path d="M50 9.5L90.5 50L50 90.5L9.5 50Z" fill="none" stroke="#1a1a1a" stroke-width="2.4"/><text x="50" y="63" font-size="38" text-anchor="middle" font-weight="900" fill="#1a1a1a" font-family="'Noto Sans CJK JP','IPAPGothic',sans-serif">よ</text></svg>`;
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><div style="width:${s}px;height:${s}px;background:#eef1f4;display:grid;place-items:center">${art(Math.round(s * 0.66))}</div></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  const m = await b.newPage({ viewport: { width: 512, height: 512 } });
  await m.setContent(`<body style="margin:0"><div style="width:512px;height:512px;background:#eef1f4;display:grid;place-items:center">${art(Math.round(512 * 0.56))}</div></body>`);
  await m.screenshot({ path: path.join(__dirname, "..", "icon-maskable-512.png"), clip: { x: 0, y: 0, width: 512, height: 512 } });
  await b.close();
})();
