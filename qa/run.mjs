// 標識よみの検査。標識の名前と番号が標識令 別表第一どおりか（qa/law-names.json と1枚ずつ）・問題の作り方（6種類×2000問）・
// 今日の5問と上級の組み方（3年分）・とことんの並び（300回）・通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん・標識帳・
// 実績・カレンダー・あとから・文字の大きさ・言い方・スマホ幅・PWA・引き継ぎコード・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const G = createRequire(import.meta.url)(path.join(root, "gen.js"));
const LAW = JSON.parse(readFileSync(path.join(root, "qa", "law-names.json"), "utf8")).signs;
const S = G.SBY, ALL = G.SIGNS.length;

// ---- 1. 標識のデータと問題の作り方（ブラウザを使わない）----
{
  // 名前と番号：標識令 別表第一から写した表（qa/law-names.json）と1枚ずつ比べる。番号が「201-A」のように枝のあるものは同じ番号、無ければ枝の前（207-A・B など）
  const keyOf = (no) => (no in LAW ? no : Object.keys(LAW).find((k) => k.split("-")[0] === no.replace(/-[A-F]$/, "")));
  const bad = G.SIGNS.filter((s) => { const k = keyOf(s.no); return !k || LAW[k] !== s.n; }).map((s) => `${s.no}:${s.n}`);
  check(`標識の名前と番号は標識令 別表第一と同じ（${ALL}枚を1枚ずつ）`, bad.length === 0 && ALL >= 60, bad.join(","));
  const ids = G.SIGNS.map((s) => s.id), ms = G.SIGNS.map((s) => s.m), looks = G.SIGNS.map((s) => s.look), nos = G.SIGNS.map((s) => s.no);
  check("標識の id・番号・意味・絵の説明は全部ちがう（同じ意味の選び肢が2つにならない）", new Set(ids).size === ALL && new Set(nos).size === ALL && new Set(ms).size === ALL && new Set(looks).size === ALL);
  check("種類は警戒・規制・指示の3つで、どれにも標識がある・難しさは0〜2", [0, 1, 2].every((c) => G.SIGNS.filter((s) => s.c === c).length >= 6) && G.SIGNS.every((s) => [0, 1, 2].includes(s.c) && [0, 1, 2].includes(s.lv)));
  check("警戒標識は黄色のひし形・指示標識は青い四角で描く（形でも種類がわかる）", G.SIGNS.every((s) => (s.c === 0 ? s.d.startsWith('<path d="M50 3L97 50L50 97L3 50Z" fill="#f7c600"') && s.look.startsWith("黄色のひし形") : s.c === 2 ? s.d.includes('fill="#1f55a8"') && s.look.startsWith("青い四角") : !s.look.startsWith("黄色"))));
  const leak = G.SIGNS.filter((s) => s.look.includes(s.m) || /いけない|ある$|てよい/.test(s.look)).map((s) => s.no);
  check("絵の説明（読み上げの名前）は形と色だけで、意味を言わない", leak.length === 0, leak.join(","));
  const longM = G.SIGNS.filter((s) => [...s.m].length > 34 || [...s.look].length > 40).map((s) => s.no);
  check("意味は34字以内・絵の説明は40字以内（やさしい日本語。一文を短く）", longM.length === 0, longM.join(","));
  const small = G.SIGNS.filter((s) => G.SIGNS.filter((x) => x.g === s.g).length < 2).map((s) => s.no);
  check("どの標識にも、まぎらわしいなかまが1枚以上ある（むずかしいの選び肢が作れる）", small.length === 0, small.join(","));
  check("やさしいで答えに出る、よく見る標識が15枚以上", G.poolOf(0).length >= 15, G.poolOf(0).length);

  const bad2 = {}, seen = {}, N = 2000;
  for (const k of G.KINDS) {
    for (let s = 0; s < N; s++) {
      const tag = `${k.id}|qa${s}`, P = G.make(tag), why = [];
      if (P.opts.length !== 4 || new Set(P.opts).size !== 4 || !P.opts.includes(P.ans) || P.opts.some((o) => !S[o])) why.push("選び肢が4つちがう・答えを含む");
      if (!G.poolOf(k.lv).includes(P.ans)) why.push("この難しさで出さない標識が答え");
      const wr = P.opts.filter((o) => o !== P.ans).map((o) => S[o]), A = S[P.ans];
      if (k.lv === 0 && wr.some((x) => x.g === A.g)) why.push("やさしいに同じなかまの選び肢");
      if (k.lv === 2 && !wr.some((x) => x.g === A.g)) why.push("むずかしいにまぎらわしい選び肢が無い");
      if (!P.why.includes(A.n) || !P.why.includes(A.no) || !P.why.includes(A.m)) why.push("説明に名前・番号・意味が無い");
      if (P.t !== k.t || P.look !== G.CATS[A.c].look) why.push("問い方・ヒントがおかしい");
      if (JSON.stringify(G.make(tag)) !== JSON.stringify(P)) why.push("同じ種で同じ問題にならない");
      seen[k.id] = seen[k.id] || new Set(); seen[k.id].add(P.opts.join(" "));
      if (why.length && !bad2[k.id]) bad2[k.id] = why.join("・") + "：" + P.opts.join(" ");
    }
  }
  check(`問題：${G.KINDS.length}種類×${N}問で、選び肢4つ・答え1つ・難しさどおりの選び肢・説明に名前と番号と意味`, Object.keys(bad2).length === 0, JSON.stringify(bad2));
  const few = G.KINDS.filter((k) => seen[k.id].size < 300).map((k) => `${k.id}:${seen[k.id].size}`);
  check("問題：どの種類も300通り以上の選び肢の組が出る（同じ問題ばかりにならない）", few.length === 0, few.join(","));
  check("問題：種類は6（やさしい・ふつう・むずかしい×2つの問い方）", G.KINDS.length === 6 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "2,2,2");
  // 答えの標識を tag で決めたときはその標識になる（今日の5問・とことん・練習で使う）。この難しさで出さない標識なら種から選び直す
  const fixed = G.SIGNS.every((s) => G.make(`h${s.id.length % 2}|fx|${s.id}`).ans === s.id) && G.make("e0|fx|204").ans !== "204" && G.poolOf(0).includes(G.make("e0|fx|204").ans);
  check("答えの標識を決めた問題はその標識になる（やさしいで出さない標識なら選び直す）", fixed);
  const ansSeen = new Set(); for (const k of G.KINDS) for (let s = 0; s < 400; s++) ansSeen.add(G.make(`${k.id}|qa${s}`).ans);
  const never = G.SIGNS.filter((s) => !ansSeen.has(s.id)).map((s) => s.no);
  check("標識帳：どの標識も答えに出る（全部集められる）", never.length === 0, never.join(","));
  // 絵は形として正しい SVG（タグが閉じている・外の画像を読まない）
  const broken = G.SIGNS.filter((s) => { const o = (s.d.match(/<(path|circle|rect|text|g|ellipse)\b/g) || []).length, c = (s.d.match(/\/>|<\/(text|g)>/g) || []).length; return o === 0 || o !== c || /href|https?:/.test(s.d) || /NaN|undefined/.test(s.d); }).map((s) => s.no);
  check("標識の絵は SVG の部品だけで、外の画像を読まず、数の誤り（NaN）が無い", broken.length === 0, broken.join(","));
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  const d0 = Date.parse("2026-11-07");
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const dk = dl.map((t) => t.split("|")[0]), ds = dl.map((t) => t.split("|")[2]), hk = hl.map((t) => t.split("|")[0]), hs = hl.map((t) => t.split("|")[2]);
    if (dl.length !== 5 || dk.map((k) => G.BY[k].lv).join() !== "0,0,1,1,2" || dk.slice(0, 4).map((k) => G.BY[k].t).join() !== "0,1,0,1" || new Set(ds).size !== 5 || dl.some((t, j) => G.make(t).ans !== ds[j])) bad.push(d + " 今日");
    if (hl.length !== 3 || hk.some((k) => G.BY[k].lv !== 2) || new Set(hs).size !== 3 || hs.some((x) => ds.includes(x) || S[x].lv < 1) || hl.some((t, j) => G.make(t).ans !== hs[j])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d)) || JSON.stringify(hl) !== JSON.stringify(G.hardTags(d))) bad.push(d + " 同じにならない");
    if (ds.join() === prev) sameAsPrev++; prev = ds.join();
    if (i < 60) [...ds, ...hs].forEach((x) => cover.add(x));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、標識は全部ちがう、問い方は交互）と上級（むずかしい3・今日の標識と別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("2か月のうちに標識の8割以上が出る・前の日と同じ組の日が無い", cover.size >= ALL * 0.8 && sameAsPrev === 0, `${cover.size}/${ALL}枚・前の日と同じ ${sameAsPrev}日`);
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "gen.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$|^https:\/\/laws\.e-gov\.go\.jp\//.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの種と並びだけ（今日の5問・上級は日付の乱数。gen.js には無い）", (html.match(/Math\.random/g) || []).length === 4 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test(gen.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")));
check("言い方：「このゲームについて」に、絵は簡単にかき直したもの・補助標識・運転免許の勉強の代わりではないこと・出典（e-Gov の標識令）がある", /簡単にかき直した/.test(html) && /補助標識/.test(html) && /運転免許の勉強/.test(html) && html.includes("https://laws.e-gov.go.jp/law/335M50004002003"));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html + gen));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキーだけで読む", /<script src="transfer\.js" data-game="hyoshiki-yomi" data-keys="hyoshiki-v1,hyoshiki-fs"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="gen.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/hyoshiki-yomi/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js も）、外へ何も送らない", ["./index.html", "./gen.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "標識よみ" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const ansIdx = (p) => p.evaluate(() => { const c = __kk.cur(); return c.P.opts.indexOf(c.P.ans); });
const wrongIdx = (p) => p.evaluate(() => { const c = __kk.cur(); return c.P.opts.findIndex((o) => o !== c.P.ans && !c.wrong.includes(o)); });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("hyoshiki-v1") || "{}"));
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  await p.click(`.ch[data-j="${await ansIdx(p)}"]`);
  await p.waitForSelector(".verdict");
}

try {
  // はじめて：遊び方が出る・文字の大きさ
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  { let ok = 0; for (let k = 0; k < 10; k++) { const p0 = await newPage(); const shown = await p0.locator("#howto[open]").count() === 1; await p0.keyboard.press("Escape"); const tut = await p0.evaluate(() => { try { return !!JSON.parse(localStorage.getItem("hyoshiki-v1")).tut; } catch { return false; } }); await p0.reload(); await p0.waitForTimeout(150); if (shown && tut && await p0.locator("#howto[open]").count() === 0) ok++; await p0.close(); } check("遊び方を Esc で閉じたその場で記録が残り、すぐ開き直しても遊び方が出ない（10回）", ok === 10, `${ok}/10`); }
  await p.click("#howto-ok");
  check("文字の大きさ：はじめは「ふつう」（18px）", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "18px");
  await p.click('.fsrow button[data-fs="3"]');
  await p.reload(); await p.waitForTimeout(150);
  check("文字の大きさ：「とても大きい」にすると開き直しても残る", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "25px" && await p.locator('.fsrow button[data-fs="3"][aria-pressed="true"]').count() === 1);
  await p.click('.fsrow button[data-fs="2"]');
  check("ホームに今日の見分け方が出る", (await p.textContent("#tip")).includes("今日の見分け方"));

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __kk.load().runs.d.list);
  check("今日の5問は日付から決まる（gen.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面（問い方0）：大きな標識・意味の選び肢4つ（高さ72px以上）・標識に読み上げ用の名前（形と色）", await p.locator("#q svg.sign").count() === 1 && (await p.getAttribute("#q svg", "aria-label")).startsWith("問題の標識：") && (await p.$$eval(".ch", (b) => b.map((x) => x.getBoundingClientRect().height))).every((h) => h >= 72) && await p.locator(".ch").count() === 4);
  check("やさしい：今日の1問目は、よく見る標識", G.poolOf(0).includes(await p.evaluate(() => __kk.cur().P.ans)));
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("まちがえると ✕ の印と「ちがう」の文字（色だけで分けない）・選んだ標識が何かを教える・知らせは role=status", await p.locator(".ch.ng").count() === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ng"), "::after").content)).includes("ちがう") && /✕ それは「.+」（.+）の意味です/.test(await p.textContent("#msg")) && await p.getAttribute("#msg", "role") === "status");
  // 開き直しても、まちがえた選び肢は残る
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・まちがえた印のまま）", await p.locator(".ch.ng").count() === 1 && await p.evaluate(() => __kk.cur().i) === 0);
  await solve(p);
  check("正解すると ✓ の印・名前と番号と意味の説明・★2（まちがい1回）", await p.locator(".ch.ok").count() === 1 && /「.+」（\d{3}/.test(await p.textContent(".verdict .why")) && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ");
  await p.click("#next");
  await p.click("#hint");
  check("問い方1（2問目）：意味の文と標識の絵4つ。絵の選び肢の名前は形と色だけで、意味を言わない", await p.locator("#q.board").count() === 1 && await p.locator(".pics .ch svg").count() === 4 && (await p.$$eval(".pics .ch", (b) => b.map((x) => x.getAttribute("aria-label") || ""))).every((l) => l.length > 4 && !G.SIGNS.some((x) => l.includes(x.m))) && (await p.$$eval(".pics .ch svg", (v) => v.every((x) => x.getAttribute("aria-hidden") === "true"))));
  check("ヒント1は標識の種類（形と色のきまり）を言い、答えは言わない", (await p.textContent("#hintbox")).includes("💡") && /標識/.test(await p.textContent("#hintbox")) && await p.locator(".ch.ng").count() === 0);
  await p.click("#hint");
  check("ヒント2はまちがいの選び肢を消し、2つにしぼる・ヒントは2回まで", await p.locator(".ch.ng").count() === 2 && await p.locator("#hint:disabled").count() === 1);
  await solve(p);
  check("ヒント2回は★1", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  check("ふつう（3問目）：問い方0で、答えはよく見る・ときどき見る標識", await p.locator("#q svg.sign").count() === 1 && G.poolOf(1).includes(await p.evaluate(() => __kk.cur().P.ans)));
  for (let i = 2; i < 5; i++) { if (i === 4) check("むずかしい（5問目）：まぎらわしいなかまの選び肢がある", await p.evaluate(() => { const P = __kk.cur().P, S = __kk.G.SBY; return P.opts.some((o) => o !== P.ans && S[o].g === S[P.ans].g); })); await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい（1・2・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]");
  const share = await p.textContent(".share");
  check("シェアの文に答え・問題を出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !G.SIGNS.some((x) => share.includes(x.n) || share.includes(x.m)) && !/標識令|警戒|規制|指示/.test(share), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("標識帳に当てた標識が載る", Object.keys(s1.dex).length >= 3 && Object.values(s1.sg).reduce((a, b) => a + b, 0) === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」と上級", (await p.textContent("#go-d")).includes("結果") && await p.locator("#go-h").count() === 1);
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __kk.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（標識帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  // 種類を決めて練習
  await p.click("#back"); await p.click("#go-p"); await p.click('[data-c="0"]');
  { const l = await p.evaluate(() => __kk.load().runs.p.list); check("種類を決めて練習できる（警戒標識だけ・5枚とも別の標識）", l.length === 5 && l.every((t) => G.make(t).cat === 0) && new Set(l.map((t) => G.make(t).ans)).size === 5); }
  // とことん：まちがえてもヒントを使っても続き、「ここで降りる」で終わる。自己ベストは一発で解いた数
  await p.click("#back"); await p.click("#go-e");
  { const r = await p.evaluate(() => { let dup = 0, bad = 0; for (let n = 0; n < 300; n++) { const l = __kk.endlessList(), ids = l.map((t) => __kk.G.make(t)); if (ids.some((P) => !P)) { bad++; continue; } const a = ids.map((P) => P.ans); if (new Set(a.slice(0, __kk.G.SIGNS.length)).size !== __kk.G.SIGNS.length) dup++; } return [dup, bad]; });
    check("とことんの並びを300回作っても、全部の標識を出し切るまで同じ標識が出ない", r[0] === 0 && r[1] === 0, r.join(",")); }
  check("とことんは100問の並びで始まり、チケット・ライフが無い", (await p.evaluate(() => __kk.load().runs.e.list.length)) === 100 && !(await p.textContent("body")).match(/🎫|🌸|のこり\d/));
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 2 }); await p.click("#next");
  await p.click("#hint"); await p.click("#hint"); await solve(p); await p.click("#next");
  check("まちがえてもヒントを使っても続く", await p.evaluate(() => __kk.cur().i) === 4 && await p.locator("#quit").count() === 1);
  await p.reload(); await p.waitForTimeout(200); await p.click("#go-e");
  check("とことんは開き直しても続きから", await p.evaluate(() => __kk.cur().i) === 4);
  await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、一発で解いた数（2問）が自己ベストに残る", (await mem(p)).ebest === 2 && (await p.textContent("#eres")).includes("4問") && (await p.textContent("#ebest")).includes("一発で読めた標識 2問") && !(await mem(p)).runs.e);
  {
    // とことんの並びを使い切りそうになったら、次の並びを足して続ける（好きなだけ遊べる）
    await p.evaluate(() => { __kk.save((s) => { s.runs.e = { mode: "e", id: "zz", date: __kk.todayKey(), list: __kk.endlessList().slice(0, 6), res: [{ m: 0 }, { m: 0 }], cur: null, clean: 2, miss: 0 }; }); });
    await p.goto(url); await p.waitForTimeout(150); await p.click("#go-e");
    check("とことんの並びの残りが少ないと、次の100問を足して続ける", (await p.evaluate(() => __kk.load().runs.e.list.length)) === 106);
    await p.click("#quit"); await p.waitForTimeout(100);
  }
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("hyoshiki-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { e1: '"><b id="xss2">', zz: 3 }; s.sg = { "330": '"><i id="xss4">', nope: 2, constructor: 3 }; s.runs = { e: { mode: "e", id: "x", date: "2026-11-07", list: ["e1|1"], res: [], clean: '"><i id="xss3">' }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-07", list: ["constructor|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["e1|1"], res: [] }, a1: { mode: "a", id: "a1", date: "2026-11-04", list: ["e1|1"], res: [null] }, a2: { mode: "a", id: "a2", date: "2026-11-03", list: "bad", res: [] }, a4: { mode: "zz", id: "a4", date: "2026-11-02", list: ["e1|1"], res: [] }, a3: { mode: "a", id: "a3", date: "2026-11-02", list: ["e1|1", "e1|2"], res: [{ m: 0 }], cur: { i: 1, tag: "e1|2", wrong: "x", hints: 0 } } }; s.days = { "2026-11-07": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] } }; localStorage.setItem("hyoshiki-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __kk.load());
    check("記録の形を直す：数の所の文字は0に・知らない標識や種類（constructor のような名前も）は捨てる・形のちがう途中経過と日ごとの記録は捨てる", st.ebest === 0 && st.dex.e1 === 0 && !("zz" in st.dex) && st.sg["330"] === 0 && !("nope" in st.sg) && !Object.prototype.hasOwnProperty.call(st.sg, "constructor") && st.runs.e.clean === 0 && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && !("a1" in st.runs) && !("a2" in st.runs) && !("a4" in st.runs) && st.runs.a3 && st.runs.a3.cur === null && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    await q.goto(url); await q.waitForTimeout(100); await q.click("#go-dex").catch(() => {});
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3, #xss4").count() === 0);
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#back"); await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator('.ach.got[data-id="first"]').count() === 1 && await p.locator('.ach.got[data-id="hard1"]').count() === 1);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：絵は簡単にかき直したもの・補助標識・出典", (await p.textContent("#about")).includes("簡単にかき直した") && (await p.textContent("#about")).includes("補助標識") && await p.locator("#about a").count() >= 2);
  await p.click("#back"); await p.click("#go-dex");
  check("標識帳：警戒・規制・指示に分けて全部の標識が見られる・当てた標識は ✓ の文字と名前", await p.locator(".sgrid > div").count() === ALL && await p.locator(".agrp").count() === 3 && (await p.textContent(".sgrid")).includes("✓"));
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る
  {
    // 第1回の日（EPOCH）のすぐあとでも取りこぼした日を試せるよう、ページの時計を10日先に進める
    const FUT = TODAY > "2026-11-17" ? TODAY : "2026-11-17", db = (n) => new Date(Date.parse(FUT) - n * 864e5).toISOString().slice(0, 10);
    const cctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    await cctx.clock.setFixedTime(new Date(FUT + "T03:00:00Z"));
    const q = await newPage(390, cctx);
    await q.evaluate(([d2, d3]) => { localStorage.setItem("hyoshiki-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [db(2), db(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __kk.lateDays(__kk.load()));
    const exp = [1, 4, 5, 6, 7].map(db).filter((d) => d >= "2026-11-07");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    check("カレンダー：遊んだ日は★の数の文字も付く", (await q.locator(".cal .c.p3").count()) + (await q.locator(".cal .c.p2").count()) + (await q.locator(".cal .c.p1").count()) >= (db(3).slice(0, 7) === FUT.slice(0, 7) ? 2 : 0));
    if (lateList.length) {
      const d = lateList[0];
      await q.evaluate((d) => { const b = document.querySelector(`.cal .miss[data-k="${d}"]`); if (b) b.click(); else { const m = document.querySelector(".calnav #prev"); m && m.click(); } }, d);
      if (!(await q.locator(".ch").count())) await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __kk.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：遊べる日がある", false, "第1回の日から日がたっていない");
    await q.context().close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    // ヒントの数は、別のタブで使った分も減らさない
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    await ctx.close();
  }

  // スマホ幅・とても大きい文字でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const [w, fs] of [[320, 3], [390, 2], [320, 1]]) {
      const q = await newPage(w); await closeHow(q);
      await q.evaluate((fs) => localStorage.setItem("hyoshiki-fs", String(fs)), fs); await q.reload(); await q.waitForTimeout(150);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px 文字${fs} ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => b.getBoundingClientRect().height < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${fs}/${go}:${x}`));
      }
      await q.context().close();
    }
    check("幅320px・とても大きい文字でも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }

  // 見やすさの設定を全部入れても、ページの一番下まで動ける（読み上げの class が html に当たって固まった。2026-11-05）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const j = await ansIdx(q);
    await q.focus(`.ch[data-j="${j}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    check("キーボードだけで選んで答えられる", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "hyoshiki-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-07": { m: [0, 1, 0, 0, 2], k: ["e0", "e1", "n0", "n1", "h0"] } }, hdays: {}, adays: {}, dex: { e0: 1, e1: 1, n0: 1, n1: 1, h0: 1 }, sg: { "330": 1, "316": 1, "201c": 1, "405": 1, "204": 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, t: 1 }), "hyoshiki-fs": "3" };
  await checkTransfer({ browser, url, game: "hyoshiki-yomi", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 標識よみ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
