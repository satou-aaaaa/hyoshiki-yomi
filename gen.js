// 標識よみの問題を作る（ブラウザと node の両方で使う）。
// 標識の名前・番号・意味は「道路標識、区画線及び道路標示に関する命令」（標識令）別表第一、絵は別表第二の様式を簡単にかき直したもの。
//   https://laws.e-gov.go.jp/law/335M50004002003 （2026-11-07 に e-Gov 法令 API で本文と別表第二の図を確かめた）
// 名前と番号は QA が qa/law-names.json（別表第一から写した表）と1つずつ照らし合わせる。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ種なら、どの端末でも同じ問題になる。
(function (root) {
  "use strict";
  const Y = "#f7c600", K = "#1a1a1a", RED = "#d3271d", BLU = "#1f55a8", W = "#ffffff", NUM = "#1f4fa0", EDGE = "#7d8597";
  const f2 = (v) => (Math.round(v * 10) / 10).toString();
  // ---- 絵の部品 ----
  const ln = (d, c = K, w = 8, cap = "butt") => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  const fl = (d, c = K) => `<path d="${d}" fill="${c}"/>`;
  const tx = (x, y, s, t, c = K, extra = "") => `<text x="${x}" y="${y}" font-size="${s}" fill="${c}" text-anchor="middle" font-weight="900" font-family="'Zen Maru Gothic','Hiragino Sans','Yu Gothic',sans-serif"${extra}>${t}</text>`;
  // 矢じり：先が (x,y)、向き a（度。0 が右、-90 が上）
  function head(x, y, a, s = 11, c = K) {
    const r = (a * Math.PI) / 180, bx = x - Math.cos(r) * s, by = y - Math.sin(r) * s, px = Math.cos(r + Math.PI / 2) * s * 0.62, py = Math.sin(r + Math.PI / 2) * s * 0.62;
    return `<path d="M${f2(x)} ${f2(y)}L${f2(bx + px)} ${f2(by + py)}L${f2(bx - px)} ${f2(by - py)}Z" fill="${c}"/>`;
  }
  // 輪の上を回る矢印 n 本（時計回り）
  function ringArrows(cx, cy, r, n, c, w) {
    let o = "";
    for (let i = 0; i < n; i++) {
      const a0 = ((i * 360) / n + 18) * (Math.PI / 180), a1 = (((i + 1) * 360) / n - 22) * (Math.PI / 180);
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      o += `<path d="M${f2(x0)} ${f2(y0)}A${r} ${r} 0 0 1 ${f2(x1)} ${f2(y1)}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
      o += head(cx + r * Math.cos(a1 + 0.3), cy + r * Math.sin(a1 + 0.3), (a1 * 180) / Math.PI + 105, w * 1.9, c);
    }
    return o;
  }
  // 歩く人：(x, y) は足もと、s は背の高さ
  function walker(x, y, s, c, d = 1) {
    const w = s * 0.13;
    return `<circle cx="${f2(x + d * s * 0.04)}" cy="${f2(y - s * 0.89)}" r="${f2(s * 0.11)}" fill="${c}"/>` +
      ln(`M${f2(x)} ${f2(y - s * 0.74)}L${f2(x - d * s * 0.02)} ${f2(y - s * 0.4)}`, c, w * 1.25, "round") +
      ln(`M${f2(x - d * s * 0.02)} ${f2(y - s * 0.4)}L${f2(x - d * s * 0.2)} ${f2(y)}M${f2(x - d * s * 0.02)} ${f2(y - s * 0.4)}L${f2(x + d * s * 0.18)} ${f2(y - s * 0.02)}`, c, w, "round") +
      ln(`M${f2(x)} ${f2(y - s * 0.7)}L${f2(x - d * s * 0.19)} ${f2(y - s * 0.46)}M${f2(x)} ${f2(y - s * 0.7)}L${f2(x + d * s * 0.2)} ${f2(y - s * 0.5)}`, c, w * 0.85, "round");
  }
  // 立っている人（大人と子どもが手をつなぐ絵など）
  function stander(x, y, s, c) {
    const w = s * 0.15;
    return `<circle cx="${f2(x)}" cy="${f2(y - s * 0.89)}" r="${f2(s * 0.11)}" fill="${c}"/>` +
      ln(`M${f2(x)} ${f2(y - s * 0.74)}V${f2(y - s * 0.4)}`, c, w * 1.3, "round") +
      ln(`M${f2(x - s * 0.05)} ${f2(y - s * 0.42)}L${f2(x - s * 0.08)} ${f2(y)}M${f2(x + s * 0.05)} ${f2(y - s * 0.42)}L${f2(x + s * 0.08)} ${f2(y)}`, c, w, "round") +
      ln(`M${f2(x)} ${f2(y - s * 0.7)}L${f2(x - s * 0.14)} ${f2(y - s * 0.4)}M${f2(x)} ${f2(y - s * 0.7)}L${f2(x + s * 0.14)} ${f2(y - s * 0.4)}`, c, w * 0.8, "round");
  }
  function bike(cx, cy, s, c) {
    const r = s * 0.2, a = cx - s * 0.32, b = cx + s * 0.32, w = s * 0.065;
    return `<circle cx="${f2(a)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke="${c}" stroke-width="${f2(w)}"/><circle cx="${f2(b)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke="${c}" stroke-width="${f2(w)}"/>` +
      ln(`M${f2(a)} ${f2(cy)}L${f2(cx - s * 0.08)} ${f2(cy - s * 0.32)}H${f2(cx + s * 0.22)}L${f2(b)} ${f2(cy)}M${f2(cx - s * 0.08)} ${f2(cy - s * 0.32)}L${f2(cx + s * 0.02)} ${f2(cy)}L${f2(a)} ${f2(cy)}M${f2(cx + s * 0.02)} ${f2(cy)}L${f2(cx + s * 0.22)} ${f2(cy - s * 0.32)}L${f2(cx + s * 0.18)} ${f2(cy - s * 0.44)}H${f2(cx + s * 0.3)}M${f2(cx - s * 0.14)} ${f2(cy - s * 0.42)}H${f2(cx - s * 0.02)}M${f2(cx - s * 0.08)} ${f2(cy - s * 0.32)}V${f2(cy - s * 0.42)}`, c, w);
  }
  function carFront(cx, cy, s, c, b) {
    const k = s / 44;
    const p = (x, y) => `${f2(cx + x * k)} ${f2(cy + y * k)}`;
    return fl(`M${p(-16, -10)}L${p(-11, -22)}H${f2(cx + 11 * k)}L${p(16, -10)}H${f2(cx + 20 * k)}V${f2(cy + 8 * k)}H${f2(cx - 20 * k)}V${f2(cy - 10 * k)}Z`, c) +
      `<rect x="${f2(cx - 17 * k)}" y="${f2(cy + 6 * k)}" width="${f2(8 * k)}" height="${f2(8 * k)}" rx="1.5" fill="${c}"/><rect x="${f2(cx + 9 * k)}" y="${f2(cy + 6 * k)}" width="${f2(8 * k)}" height="${f2(8 * k)}" rx="1.5" fill="${c}"/>` +
      fl(`M${p(-12, -11)}L${p(-8, -19)}H${f2(cx + 8 * k)}L${p(12, -11)}Z`, b) +
      `<circle cx="${f2(cx - 13 * k)}" cy="${f2(cy - 1 * k)}" r="${f2(3.2 * k)}" fill="${b}"/><circle cx="${f2(cx + 13 * k)}" cy="${f2(cy - 1 * k)}" r="${f2(3.2 * k)}" fill="${b}"/><rect x="${f2(cx - 6 * k)}" y="${f2(cy - 4 * k)}" width="${f2(12 * k)}" height="${f2(6 * k)}" fill="${b}"/>`;
  }
  const truck = (c, b) => `<rect x="18" y="38" width="40" height="22" fill="${c}"/>` + fl("M60 44H72L80 52V62H60Z", c) + fl("M63 47H70L75 52H63Z", b) + `<circle cx="30" cy="63" r="6" fill="${c}" stroke="${b}" stroke-width="2"/><circle cx="70" cy="63" r="6" fill="${c}" stroke="${b}" stroke-width="2"/>`;
  const bus = (c, b) => `<rect x="17" y="38" width="66" height="24" rx="5" fill="${c}"/>` + [22, 33, 44, 55, 66].map((x) => `<rect x="${x}" y="42" width="8" height="7" fill="${b}"/>`).join("") + `<circle cx="30" cy="63" r="6" fill="${c}" stroke="${b}" stroke-width="2"/><circle cx="70" cy="63" r="6" fill="${c}" stroke="${b}" stroke-width="2"/>`;
  const moto = (c, b) => `<circle cx="31" cy="64" r="8" fill="none" stroke="${c}" stroke-width="4"/><circle cx="69" cy="64" r="8" fill="none" stroke="${c}" stroke-width="4"/>` + fl("M36 60L44 50H60L66 58L58 62H42Z", c) + ln("M60 50L66 42", c, 3.5, "round") + `<circle cx="51" cy="30" r="5" fill="${c}"/>` + ln("M50 36L46 50M48 40L60 44", c, 5, "round");
  const loco = (c, b) => `<rect x="22" y="44" width="34" height="16" rx="4" fill="${c}"/><rect x="56" y="34" width="20" height="26" fill="${c}"/><rect x="60" y="38" width="12" height="8" fill="${b}"/><rect x="28" y="32" width="8" height="12" fill="${c}"/><ellipse cx="32" cy="27" rx="9" ry="5" fill="${c}"/>` + [30, 45, 66].map((x) => `<circle cx="${x}" cy="64" r="6" fill="${c}" stroke="${b}" stroke-width="2"/>`).join("") + ln("M18 60H24", c, 4);
  // ---- 板の形 ----
  const warn = (inner) => `<path d="M50 3L97 50L50 97L3 50Z" fill="${Y}" stroke="${K}" stroke-width="1.6"/><path d="M50 9.5L90.5 50L50 90.5L9.5 50Z" fill="none" stroke="${K}" stroke-width="2.4"/>${inner}`;
  const SL = `<path d="M24 24L76 76" stroke="${RED}" stroke-width="8"/>`;
  const ring = (inner, slash) => `<circle cx="50" cy="50" r="48" fill="${W}" stroke="${EDGE}" stroke-width="1"/><circle cx="50" cy="50" r="41" fill="${W}" stroke="${RED}" stroke-width="9"/>${inner}${slash ? SL : ""}`;
  const disc = (inner) => `<circle cx="50" cy="50" r="48" fill="${BLU}" stroke="${EDGE}" stroke-width="1"/><circle cx="50" cy="50" r="45" fill="none" stroke="${W}" stroke-width="2.5"/>${inner}`;
  const park = (x) => `<circle cx="50" cy="50" r="48" fill="${W}" stroke="${EDGE}" stroke-width="1"/><circle cx="50" cy="50" r="41" fill="${BLU}" stroke="${RED}" stroke-width="9"/>${SL}${x ? `<path d="M76 24L24 76" stroke="${RED}" stroke-width="8"/>` : ""}`;
  const tri = (t1, t2) => `<path d="M6 14H94L50 93Z" fill="${RED}" stroke="${EDGE}" stroke-width="1" stroke-linejoin="round"/><path d="M13 18.5H87L50 85Z" fill="none" stroke="${W}" stroke-width="3" stroke-linejoin="round"/>${tx(50, t2 ? 42 : 47, t2 ? 17 : 19, t1, W)}${t2 ? tx(50, 60, 11, t2, W) : ""}`;
  const sq = (inner) => `<rect x="3" y="3" width="94" height="94" rx="9" fill="${BLU}" stroke="${EDGE}" stroke-width="1"/><rect x="7" y="7" width="86" height="86" rx="6" fill="none" stroke="${W}" stroke-width="2.5"/>${inner}`;
  const redSq = (inner, word) => `<rect x="3" y="3" width="94" height="94" rx="8" fill="${W}" stroke="${EDGE}" stroke-width="1"/><rect x="9" y="9" width="82" height="82" rx="4" fill="${W}" stroke="${RED}" stroke-width="8"/>${inner}<path d="M17 17L83 83" stroke="${RED}" stroke-width="7"/>${tx(50, 84, 11, word)}`;

  // ---- 標識（id は記録の標識帳に残るので、変えない・消さない。足すのは最後に）----
  // c：0 警戒・1 規制・2 指示。lv：0 よく見る・1 ときどき・2 見分けがむずかしい。g：まぎらわしいなかま。m：意味（やさしい言葉）。look：絵の説明（読み上げ用。意味は言わない）
  const SIGNS = [
    { id: "201a", no: "201-A", n: "┼形道路交差点あり", c: 0, lv: 0, g: "x", m: "この先に十字路がある", look: "黄色のひし形に、十字の黒い線", d: warn(ln("M50 24V76M24 50H76", K, 9)) },
    { id: "201b", no: "201-B", n: "├形（又は┤形）道路交差点あり", c: 0, lv: 1, g: "x", m: "この先で、横から道がつながる（├形の交差点）", look: "黄色のひし形に、縦の線と右へ出る線", d: warn(ln("M44 24V76M44 50H74", K, 9)) },
    { id: "201c", no: "201-C", n: "Ｔ形道路交差点あり", c: 0, lv: 0, g: "x", m: "この先にＴ字路がある", look: "黄色のひし形に、Ｔの形の黒い線", d: warn(ln("M26 34H74M50 34V76", K, 9)) },
    { id: "201d", no: "201-D", n: "Ｙ形道路交差点あり", c: 0, lv: 1, g: "x", m: "この先にＹ字路がある", look: "黄色のひし形に、Ｙの形の黒い線", d: warn(ln("M50 78V52L31 30M50 52L69 30", K, 9)) },
    { id: "201-2", no: "201の2", n: "ロータリーあり", c: 0, lv: 1, g: "x", m: "この先にロータリーがある", look: "黄色のひし形に、輪になった3本の矢印", d: warn(ringArrows(50, 50, 17, 3, K, 5.5)) },
    { id: "202", no: "202", n: "右（又は左）方屈曲あり", c: 0, lv: 1, g: "c", m: "この先、道が右（左）へカーブする", look: "黄色のひし形に、右へ曲がる丸い矢印", d: warn(ln("M42 80V60Q42 36 64 36", K, 8) + head(76, 36, 0, 13)) },
    { id: "203", no: "203", n: "右（又は左）方屈折あり", c: 0, lv: 1, g: "c", m: "この先、道が右（左）へ直角に近く折れる", look: "黄色のひし形に、かどばって右へ折れる矢印", d: warn(ln("M42 78V40H62", K, 8) + head(75, 40, 0, 13)) },
    { id: "204", no: "204", n: "右（又は左）背向屈曲あり", c: 0, lv: 2, g: "c", m: "この先、右・左と続けてカーブする", look: "黄色のひし形に、Ｓの字にゆれる矢印", d: warn(ln("M28 70C44 70 44 52 56 50C62 49 64 45 66 41", K, 8) + head(74, 31, -52, 13)) },
    { id: "205", no: "205", n: "右（又は左）背向屈折あり", c: 0, lv: 2, g: "c", m: "この先、右・左と続けて直角に近く折れる", look: "黄色のひし形に、かくかくと2回折れる矢印", d: warn(ln("M28 66H46V46H62V40", K, 8) + head(62, 28, -90, 13)) },
    { id: "206", no: "206", n: "右（又は左）つづら折りあり", c: 0, lv: 2, g: "c", m: "この先、カーブが何度も続く（つづら折り）", look: "黄色のひし形に、上へくねくね続く矢印", d: warn(ln("M50 84C38 76 40 68 50 62C60 56 62 48 50 42C43 38 44 34 47 32", K, 7) + head(49, 20, -82, 12)) },
    { id: "207", no: "207-A", n: "踏切あり", c: 0, lv: 0, g: "wp", m: "この先に踏切がある", look: "黄色のひし形に、汽車の絵", d: warn(loco(K, Y)) },
    { id: "208", no: "208", n: "学校、幼稚園、保育所等あり", c: 0, lv: 0, g: "wp", m: "この先に学校・幼稚園・保育所などがある", look: "黄色のひし形に、歩く大人と子どもの絵", d: warn(walker(40, 74, 40, K) + walker(60, 74, 28, K)) },
    { id: "208-2", no: "208の2", n: "信号機あり", c: 0, lv: 0, g: "wp", m: "この先に信号機がある", look: "黄色のひし形に、横に3つ並んだ灯り（緑・黄・赤）", d: warn(`<rect x="18" y="38" width="64" height="24" rx="12" fill="${K}"/><circle cx="31" cy="50" r="8" fill="#1f9d55"/><circle cx="50" cy="50" r="8" fill="#ffe37a"/><circle cx="69" cy="50" r="8" fill="#e5322b"/>`) },
    { id: "209", no: "209", n: "すべりやすい", c: 0, lv: 0, g: "wm", m: "この先、路面がすべりやすい", look: "黄色のひし形に、ななめの車とくねったタイヤの跡", d: warn(`<g transform="rotate(-24 48 40)">${carFront(48, 42, 28, K, Y)}</g>` + ln("M40 56C34 62 46 66 40 74M56 56C50 62 62 66 56 74", K, 3, "round")) },
    { id: "209-2", no: "209の2", n: "落石のおそれあり", c: 0, lv: 1, g: "wm", m: "この先、落石のおそれがある", look: "黄色のひし形に、がけと落ちてくる石", d: warn(fl("M24 72L44 28L56 72Z") + `<circle cx="59" cy="40" r="4" fill="${K}"/><circle cx="63" cy="52" r="4.5" fill="${K}"/><circle cx="66" cy="64" r="5" fill="${K}"/>` + ln("M20 74H80", K, 3)) },
    { id: "209-3", no: "209の3", n: "路面凹凸あり", c: 0, lv: 2, g: "wm", m: "この先、路面にでこぼこがある", look: "黄色のひし形に、でこぼこした地面の形", d: warn(fl("M22 66V57Q29 47 36 57Q44 43 52 57Q58 50 64 57Q71 45 78 57V66Z")) },
    { id: "210", no: "210", n: "合流交通あり", c: 0, lv: 2, g: "rd", m: "この先で、ほかの道から車が合流してくる", look: "黄色のひし形に、縦の線と左下からななめに合わさる線", d: warn(ln("M58 22V78M58 50L32 66", K, 8)) },
    { id: "211", no: "211", n: "車線数減少", c: 0, lv: 2, g: "rd", m: "この先で車線の数が減る", look: "黄色のひし形に、2本の線（左の線が内側へ寄る）と点線", d: warn(ln("M36 80V58L48 46V22M64 80V22", K, 6) + ln("M50 80V60", K, 2.5) + `<path d="M50 80V60" stroke="${Y}" stroke-width="3" stroke-dasharray="3 4"/>`) },
    { id: "212", no: "212", n: "幅員減少", c: 0, lv: 1, g: "rd", m: "この先で道のはばがせまくなる", look: "黄色のひし形に、両側から内側へ寄る2本の線", d: warn(ln("M38 78V58L45 50V24M62 78V58L55 50V24", K, 6)) },
    { id: "212-2", no: "212の2", n: "二方向交通", c: 0, lv: 1, g: "rd", m: "この先は、対面通行（二方向交通）になる", look: "黄色のひし形に、上向きと下向きの2本の矢印", d: warn(ln("M42 78V36", K, 6) + head(42, 24, -90, 13) + ln("M58 22V64", K, 6) + head(58, 76, 90, 13)) },
    { id: "212-3", no: "212の3", n: "上り急勾配あり", c: 0, lv: 1, g: "sl", m: "この先に急な上り坂がある", look: "黄色のひし形に、右上がりの坂と「10%」、上る向きの白い矢印", d: warn(fl("M20 68H80V42Z") + ln("M44 63L64 54", W, 3.5) + head(72, 50, -24, 9, W) + tx(38, 42, 12, "10%", K, ' transform="rotate(-23 38 42)"')) },
    { id: "212-4", no: "212の4", n: "下り急勾配あり", c: 0, lv: 1, g: "sl", m: "この先に急な下り坂がある", look: "黄色のひし形に、右下がりの坂と「10%」、下る向きの白い矢印", d: warn(fl("M20 42V68H80Z") + ln("M28 52L50 62", W, 3.5) + head(58, 65.5, 24, 9, W) + tx(62, 42, 12, "10%", K, ' transform="rotate(23 62 42)"')) },
    { id: "213", no: "213", n: "道路工事中", c: 0, lv: 0, g: "wm", m: "この先で道路工事をしている", look: "黄色のひし形に、スコップで土をほる人の絵", d: warn(`<circle cx="52" cy="30" r="5" fill="${K}"/>` + ln("M50 37L44 52M44 52L36 68M44 52L54 68M48 42L36 56", K, 5.5, "round") + ln("M30 50L38 60", K, 3) + fl("M33 60L41 58L40 66L32 66Z") + fl("M54 64Q62 60 70 66Z")) },
    { id: "214", no: "214", n: "横風注意", c: 0, lv: 1, g: "wm", m: "この先、強い横風が吹くことがある", look: "黄色のひし形に、ポールと横になびく吹き流し", d: warn(ln("M30 28V78", K, 4) + fl("M31 32L76 40V52L31 52Z") + [42, 56, 70].map((x) => `<path d="M${x} ${f2(33.6 + (x - 31) * 0.178)}V52" stroke="${Y}" stroke-width="4"/>`).join("")) },
    { id: "214-2", no: "214の2", n: "動物が飛び出すおそれあり", c: 0, lv: 1, g: "wm", m: "この先、動物が飛び出すことがある", look: "黄色のひし形に、はねるシカの絵", d: warn(fl("M30 66L38 56L44 48L58 46L66 38L64 32L70 30L72 36L68 46L62 54L66 66L62 66L58 56L48 58L42 66L38 64L44 56Z") + ln("M66 32L62 24M68 31L72 23M62 24L58 22M72 23L76 21", K, 2.5, "round")) },
    { id: "215", no: "215", n: "その他の危険", c: 0, lv: 0, g: "wm", m: "この先にその他の危険がある（注意）", look: "黄色のひし形に、大きな「！」", d: warn(fl("M44.5 26H55.5L53 60H47Z") + `<circle cx="50" cy="70" r="6" fill="${K}"/>`) },
    { id: "301", no: "301", n: "通行止め", c: 1, lv: 0, g: "st", m: "人も車も路面電車も、通ってはいけない", look: "赤い丸の枠に、赤い×と「通行止」の字", d: ring(`<path d="M24 24L76 76M76 24L24 76" stroke="${RED}" stroke-width="7"/><rect x="28" y="62" width="44" height="15" fill="${W}"/>` + tx(50, 74, 12, "通行止"), false) },
    { id: "302", no: "302", n: "車両通行止め", c: 1, lv: 0, g: "st", m: "車両は通ってはいけない（歩く人は通れる）", look: "赤い丸の枠に、赤いななめの線だけ", d: ring("", true) },
    { id: "303", no: "303", n: "車両進入禁止", c: 1, lv: 0, g: "st", m: "この向きから車両が入ってはいけない", look: "赤い丸の中に、白い横の帯", d: `<circle cx="50" cy="50" r="48" fill="${RED}" stroke="${EDGE}" stroke-width="1"/><circle cx="50" cy="50" r="45" fill="none" stroke="${W}" stroke-width="2"/><rect x="20" y="43" width="60" height="14" fill="${W}"/>` },
    { id: "304", no: "304", n: "二輪の自動車以外の自動車通行止め", c: 1, lv: 2, g: "vh", m: "バイク以外の自動車は通ってはいけない", look: "赤い丸の枠に、前から見た車とななめの線", d: ring(carFront(50, 54, 46, K, W), true) },
    { id: "305", no: "305", n: "大型貨物自動車等通行止め", c: 1, lv: 1, g: "vh", m: "大型のトラックなどは通ってはいけない", look: "赤い丸の枠に、トラックとななめの線", d: ring(truck(K, W), true) },
    { id: "306", no: "306", n: "大型乗用自動車等通行止め", c: 1, lv: 2, g: "vh", m: "大型のバスなどは通ってはいけない", look: "赤い丸の枠に、バスとななめの線", d: ring(bus(K, W), true) },
    { id: "307", no: "307", n: "二輪の自動車・一般原動機付自転車通行止め", c: 1, lv: 2, g: "vh", m: "バイクと原付は通ってはいけない", look: "赤い丸の枠に、オートバイに乗る人とななめの線", d: ring(moto(K, W), true) },
    { id: "309", no: "309", n: "特定小型原動機付自転車・自転車通行止め", c: 1, lv: 1, g: "vh", m: "自転車・電動キックボードなどは通ってはいけない", look: "赤い丸の枠に、自転車とななめの線", d: ring(bike(50, 60, 48, K), true) },
    { id: "311", no: "311-C", n: "指定方向外進行禁止", c: 1, lv: 1, g: "dr", m: "矢印の向き以外へ進んではいけない", look: "青い丸に、上向きの白い矢印1本", d: disc(ln("M50 80V38", W, 9) + head(50, 18, -90, 22, W)) },
    { id: "312", no: "312", n: "車両横断禁止", c: 1, lv: 1, g: "dr", m: "車両は道路を横切ってはいけない（右へ曲がって入らない）", look: "赤い丸の枠に、右へ折れる黒い矢印とななめの線", d: ring(ln("M40 74V46H56", K, 8) + head(70, 46, 0, 14), true) },
    { id: "313", no: "313", n: "転回禁止", c: 1, lv: 0, g: "dr", m: "車両はＵターン（転回）してはいけない", look: "赤い丸の枠に、Ｕの字に戻る黒い矢印とななめの線", d: ring(ln("M38 76V44A12 12 0 0 1 62 44V54", K, 7) + head(62, 68, 90, 13), true) },
    { id: "315", no: "315", n: "駐停車禁止", c: 1, lv: 0, g: "pk", m: "車両は駐車も停車もしてはいけない", look: "赤い枠の青い丸に、赤い×", d: park(true) },
    { id: "316", no: "316", n: "駐車禁止", c: 1, lv: 0, g: "pk", m: "車両は駐車してはいけない（停車はよい）", look: "赤い枠の青い丸に、赤いななめの線1本", d: park(false) },
    { id: "319", no: "319", n: "危険物積載車両通行止め", c: 1, lv: 2, g: "vh", m: "危険物を積んだ車両は通ってはいけない", look: "赤い丸の枠に、「危険物」の字とななめの線", d: ring(tx(50, 57, 17, "危険物"), true) },
    { id: "320", no: "320", n: "重量制限", c: 1, lv: 1, g: "nm", m: "表示の重さ（この絵は5.5t）をこえる車両は通れない", look: "赤い丸の枠に、青い字で「5.5t」", d: ring(tx(47, 60, 27, "5.5", NUM) + tx(70, 42, 13, "t", NUM), false) },
    { id: "321", no: "321", n: "高さ制限", c: 1, lv: 1, g: "nm", m: "表示の高さ（この絵は3.3m）をこえる車両は通れない", look: "赤い丸の枠に、上と下の黒い三角と「3.3m」", d: ring(fl("M41 20H59L50 29Z") + fl("M41 80H59L50 71Z") + tx(47, 59, 23, "3.3", NUM) + tx(68, 59, 12, "m", NUM), false) },
    { id: "322", no: "322", n: "最大幅", c: 1, lv: 1, g: "nm", m: "表示の幅（この絵は2.2m）をこえる車両は通れない", look: "赤い丸の枠に、左と右の黒い三角と「2.2m」", d: ring(fl("M19 41V59L28 50Z") + fl("M81 41V59L72 50Z") + tx(48, 59, 23, "2.2", NUM) + tx(64, 45, 11, "m", NUM), false) },
    { id: "323", no: "323", n: "最高速度", c: 1, lv: 0, g: "nm", m: "表示の速さ（この絵は時速40km）より速く走ってはいけない", look: "赤い丸の枠に、青い字で「40」", d: ring(tx(50, 63, 36, "40", NUM, ' letter-spacing="-1"'), false) },
    { id: "324", no: "324", n: "最低速度", c: 1, lv: 1, g: "nm", m: "自動車は表示の速さ（この絵は時速30km）より遅く走ってはいけない", look: "青い丸に、白い字で「30」と下に白い線", d: disc(tx(50, 58, 32, "30", W, ' letter-spacing="-1"') + `<rect x="27" y="66" width="46" height="6" fill="${W}"/>`) },
    { id: "325", no: "325", n: "自動車専用", c: 1, lv: 1, g: "on", m: "高速道路・自動車専用道路である", look: "青い丸に、前から見た白い車", d: disc(carFront(50, 54, 44, W, BLU)) },
    { id: "325-2", no: "325の2", n: "特定小型原動機付自転車・自転車専用", c: 1, lv: 1, g: "on", m: "自転車道である（自転車などだけが通れる）", look: "青い丸に、白い自転車", d: disc(bike(50, 60, 48, W)) },
    { id: "325-3", no: "325の3", n: "普通自転車等及び歩行者等専用", c: 1, lv: 2, g: "on", m: "自転車と歩行者が通る道（ほかの車両は通れない）", look: "青い丸に、上に大人と子ども、下に自転車の白い絵", d: disc(stander(44, 50, 30, W) + stander(56, 50, 20, W) + bike(52, 70, 30, W)) },
    { id: "325-4", no: "325の4", n: "歩行者等専用", c: 1, lv: 0, g: "on", m: "歩行者専用の道（車両は通れない）", look: "青い丸に、手をつなぐ大人と子どもの白い絵", d: disc(stander(43, 80, 56, W) + stander(60, 80, 30, W) + ln("M51 58L57 62", W, 3, "round")) },
    { id: "326", no: "326-A", n: "一方通行", c: 1, lv: 0, g: "dr", m: "矢印の向きにだけ進める（一方通行）", look: "横長の青い四角に、右向きの白い矢印", d: `<rect x="2" y="24" width="96" height="52" rx="6" fill="${BLU}" stroke="${EDGE}" stroke-width="1"/><rect x="6" y="28" width="88" height="44" rx="4" fill="none" stroke="${W}" stroke-width="2.5"/>` + ln("M16 50H62", W, 10) + head(86, 50, 0, 26, W) },
    { id: "327-10", no: "327の10", n: "環状の交差点における右回り通行", c: 1, lv: 2, g: "x", m: "環状交差点では、右回り（時計回り）に通る", look: "青い丸に、輪になった3本の白い矢印", d: disc(ringArrows(50, 50, 22, 3, W, 7)) },
    { id: "328", no: "328", n: "警笛鳴らせ", c: 1, lv: 1, g: "tr", m: "ここでは警笛（クラクション）を鳴らす", look: "青い丸に、白いラッパと音のぎざぎざ", d: disc(fl("M20 44H30L44 34V66L30 56H20Z", W) + ln("M52 36L62 44L56 48L68 56M54 56L64 62L58 66L70 74", W, 4, "round")) },
    { id: "329", no: "329-A", n: "徐行", c: 1, lv: 0, g: "tr", m: "すぐ止まれる速さ（徐行）で進む", look: "赤い逆三角に、白い字で「徐行」", d: tri("徐行", "SLOW") },
    { id: "330", no: "330-A", n: "一時停止", c: 1, lv: 0, g: "tr", m: "止まって、安全を確かめてから進む（一時停止）", look: "赤い逆三角に、白い字で「止まれ」", d: tri("止まれ", "STOP") },
    { id: "331", no: "331", n: "歩行者等通行止め", c: 1, lv: 1, g: "st", m: "歩行者は通ってはいけない", look: "赤い四角の枠に、歩く人とななめの線、「通行止」の字", d: redSq(walker(50, 70, 46, K), "通行止") },
    { id: "332", no: "332", n: "歩行者等横断禁止", c: 1, lv: 1, g: "st", m: "歩行者は道路を横断してはいけない", look: "赤い四角の枠に、歩く人とななめの線、「横断禁止」の字", d: redSq(walker(50, 70, 46, K) + ln("M30 72H70", K, 3), "横断禁止") },
    { id: "401", no: "401", n: "並進可", c: 2, lv: 2, g: "on", m: "普通自転車は2台まで横に並んで走ってよい", look: "青い四角に、横に並んだ2台の自転車に乗る白い人", d: sq([34, 66].map((x) => `<circle cx="${x}" cy="22" r="6" fill="${W}"/>` + fl(`M${x - 9} 52L${x - 7} 31H${x + 7}L${x + 9} 52Z`, W) + ln(`M${x - 8} 36L${x - 13} 48M${x + 8} 36L${x + 13} 48`, W, 3.5, "round") + `<rect x="${x - 3}" y="54" width="6" height="30" rx="3" fill="${W}"/>` + ln(`M${x - 12} 48H${x + 12}`, W, 3)).join("")) },
    { id: "403", no: "403", n: "駐車可", c: 2, lv: 0, g: "pk", m: "車両は駐車してよい", look: "青い四角に、白い「P」", d: sq(tx(50, 76, 64, "P", W, ' font-family="Arial,Helvetica,sans-serif"')) },
    { id: "404", no: "404", n: "停車可", c: 2, lv: 0, g: "pk", m: "車両は停車してよい", look: "青い四角に、白い「停」の字", d: sq(tx(50, 72, 52, "停", W)) },
    { id: "405", no: "405", n: "優先道路", c: 2, lv: 1, g: "tr", m: "この道は優先道路である", look: "青い四角に、横の線をつらぬく白い矢じりの形", d: sq(fl("M50 16L66 34H58V80H42V34H34Z", W) + `<rect x="16" y="44" width="68" height="9" fill="${W}"/>`) },
    { id: "406-2", no: "406の2", n: "停止線", c: 2, lv: 1, g: "mk", m: "車両が止まるときの位置（停止線）である", look: "青い四角に、白い横の帯と「停止線」の字", d: sq(`<rect x="16" y="24" width="68" height="14" fill="${W}"/>` + tx(50, 70, 21, "停止線", W)) },
    { id: "407", no: "407-A", n: "横断歩道", c: 2, lv: 0, g: "mk", m: "ここは横断歩道である", look: "青い四角に、白い三角と、しま模様の上を歩く人", d: sq(`<path d="M50 12L88 84H12Z" fill="none" stroke="${W}" stroke-width="4" stroke-linejoin="round"/>` + walker(50, 70, 36, W) + `<path d="M24 77H76" stroke="${W}" stroke-width="5" stroke-dasharray="7 4"/>`) },
    { id: "407-2", no: "407の2", n: "自転車横断帯", c: 2, lv: 2, g: "mk", m: "ここは自転車横断帯である", look: "青い四角に、白い三角と自転車", d: sq(`<path d="M50 12L88 84H12Z" fill="none" stroke="${W}" stroke-width="4" stroke-linejoin="round"/>` + bike(50, 68, 40, W)) },
    { id: "408", no: "408", n: "安全地帯", c: 2, lv: 1, g: "mk", m: "ここは安全地帯である", look: "青い四角に、白い「V」の形", d: sq(ln("M24 34L50 62L76 34", W, 12)) },
  ];
  const SBY = Object.fromEntries(SIGNS.map((s) => [s.id, s]));
  const CATS = [
    { id: 0, name: "警戒標識", short: "警戒", shape: "黄色のひし形", look: "黄色のひし形は警戒標識。「この先に〇〇がある、気をつけて」という知らせです。" },
    { id: 1, name: "規制標識", short: "規制", shape: "赤い丸・青い丸・赤い逆三角など", look: "赤い枠・赤い逆三角は「〜してはいけない」「止まれ」、青い丸は「〜しなさい・〜専用」という決まり（規制標識）です。" },
    { id: 2, name: "指示標識", short: "指示", shape: "青い四角", look: "青い四角は指示標識。「〜してよい」「ここは〜である」という知らせです。" },
  ];
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const QT = ["標識を見て、意味を選ぶ", "意味を読んで、標識を選ぶ"];

  const pickN = (R, arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const shuffle = (R, arr) => pickN(R, arr, arr.length);
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  // 難しさ lv の問題で答えにしてよい標識（やさしい＝よく見る標識だけ）
  const poolOf = (lv) => SIGNS.filter((s) => (lv === 0 ? s.lv === 0 : lv === 1 ? s.lv <= 1 : true)).map((s) => s.id);

  // まちがいの選び肢を3つ選ぶ
  function wrongs(R, a, lv) {
    const out = [];
    const add = (s) => { if (s && s.id !== a.id && !out.includes(s.id) && out.length < 3) out.push(s.id); };
    if (lv === 0) {
      // やさしい：ほかのなかまの、よく見る標識から（3つの種類をまぜる）
      const far = shuffle(R, SIGNS.filter((s) => s.g !== a.g && s.lv <= 1));
      for (const c of shuffle(R, [0, 1, 2])) add(far.find((s) => s.c === c && !out.includes(s.id)));
      for (const s of far) add(s);
    } else if (lv === 1) {
      // ふつう：同じなかま1つ＋同じ種類（警戒・規制・指示）から
      add(pick(R, SIGNS.filter((s) => s.g === a.g && s.id !== a.id)));
      for (const s of shuffle(R, SIGNS.filter((s) => s.c === a.c && s.g !== a.g))) add(s);
    } else {
      // むずかしい：まぎらわしいなかまを全部先に、足りなければ同じ種類から
      for (const s of shuffle(R, SIGNS.filter((s) => s.g === a.g))) add(s);
      for (const s of shuffle(R, SIGNS.filter((s) => s.c === a.c))) add(s);
    }
    for (const s of shuffle(R, SIGNS)) add(s);
    return out.map((id) => SBY[id]);
  }
  function build(R, lv, t, sid) {
    const pool = poolOf(lv);
    const a = SBY[sid] && pool.includes(sid) ? SBY[sid] : SBY[pick(R, pool)];
    const opts = shuffle(R, [a.id, ...wrongs(R, a, lv).map((s) => s.id)]);
    const why = `「${a.n}」（${a.no}）：${a.m}。${CATS[a.c].name}です。`;
    return { sid: a.id, cat: a.c, opts, ans: a.id, why, look: CATS[a.c].look };
  }

  // 種類：難しさ×問い方（6種類）
  const KINDS = [];
  for (let lv = 0; lv < 3; lv++) for (let t = 0; t < 2; t++) KINDS.push({ id: "enh"[lv] + t, lv, t, name: QT[t] });
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は「種類|種|標識」（標識は省いてよい。例 "e0|2026-11-07:d0|330"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const parts = String(tag).split("|"), k = BY[parts[0]];
    if (!k) return null;
    const p = build(rng(seedOf(tag)), k.lv, k.t, parts[2]);
    return { tag, kind: k.id, lv: k.lv, t: k.t, name: k.name, ...p };
  }

  // 今日の5問（やさしい2・ふつう2・むずかしい1。問い方は交互）。答えの標識は5問で重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), lvs = [0, 0, 1, 1, 2], ts = [0, 1, 0, 1, R() < 0.5 ? 0 : 1], used = [];
    return lvs.map((lv, i) => {
      const left = poolOf(lv).filter((id) => !used.includes(id) && (lv === 0 || SBY[id].lv >= lv - 1));
      const sid = pick(R, left); used.push(sid);
      return `${"enh"[lv]}${ts[i]}|${date}:d${i}|${sid}`;
    });
  }
  // 上級の3問（むずかしいだけ・今日の5問の標識とは別の、見分けがむずかしい標識から）
  function hardTags(date) {
    const day = dailyTags(date).map((t) => t.split("|")[2]), R = rng(seedOf("hard:" + date));
    const sids = pickN(R, SIGNS.filter((s) => s.lv >= 1 && !day.includes(s.id)).map((s) => s.id), 3);
    return sids.map((sid, i) => `h${R() < 0.5 ? 0 : 1}|${date}:h${i}|${sid}`);
  }
  // 絵（svg）。label は読み上げ用の名前（省くと絵の説明）
  const svgOf = (id, cls = "sign", label) => { const s = SBY[id]; if (!s) return ""; return `<svg class="${cls}" viewBox="0 0 100 100" role="img" aria-label="${(label || s.look).replace(/"/g, "&quot;")}" focusable="false">${s.d}</svg>`; };
  const sayOf = (id) => (SBY[id] ? SBY[id].n : id);

  const HYOSHIKI = { SIGNS, SBY, CATS, LV, QT, KINDS, BY, kindsOf, poolOf, seedOf, rng, make, dailyTags, hardTags, svgOf, sayOf, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = HYOSHIKI; else root.HYOSHIKI = HYOSHIKI;
})(typeof self !== "undefined" ? self : this);
