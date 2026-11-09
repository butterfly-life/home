(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pad = n => String(n).padStart(2, '0');
  const mouse = { x: -999, y: -999 };                 // 視窗座標，粒子用
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  /* ---------- 中／EN 切換 ----------
     HTML 裡的英文寫在 data-en（純文字）、data-en-html（含標籤）、data-en-label（aria-label）；
     中文原文第一次載入時存到 data-zh*（之後複製出來的元素，例如跑馬燈、條帶轉場，也會一起帶著）。
     切換後發出 langchange，fx.js 重新切行、重排跑馬燈 */
  let lang = 'zh';
  try { if (localStorage.getItem('lang') === 'en') lang = 'en'; } catch (e) {}
  const L = (zh, en) => lang === 'en' ? en : zh;
  let txReady = false;                                  // 文字動畫初始化（逐字切開、遮罩）之後，換字要照各自的方式處理
  const splitChars = (el, txt) => {                     // 逐字切開；英文的空白留在外面，才能正常換行
    el.setAttribute('aria-label', txt);
    let i = 0;
    const chs = w => [...w].map(c => `<span class="ch" aria-hidden="true" style="--i:${i++}">${c}</span>`).join('');
    el.innerHTML = txt.includes(' ')
      ? txt.split(' ').map(w => `<span class="w">${chs(w)}</span>`).join(' ')     // 每個英文單字包起來，不會從字中間斷行
      : chs(txt);
  };
  const setTxt = (el, v, html) => {
    if (txReady && el.hasAttribute('data-split')) return splitChars(el, v);
    if (txReady && el.dataset.tx === 'type') {
      el.dataset.full = v; el.setAttribute('aria-label', v);
      if (reduce) el.textContent = v;
      else if (el.classList.contains('in')) { el.dataset.tok = Math.random().toString(36); typeOut(el, el.dataset.tok); }
      return;
    }
    if (el.dataset.raw !== undefined) { el.dataset.raw = v; return; }   // 逐行揭露的段落：fx.js 收到 langchange 會重新切行
    const box = (txReady && el.dataset.tx === 'mask' && el.querySelector('.mk')) || el;
    if (html) box.innerHTML = v; else box.textContent = v;
  };
  const applyLang = () => {
    document.documentElement.lang = L('zh-Hant-TW', 'en');
    document.body.classList.toggle('lang-en', lang === 'en');
    $$('[data-en]').forEach(el => {
      if (el.dataset.zh === undefined) el.dataset.zh = el.textContent.trim();
      setTxt(el, L(el.dataset.zh, el.dataset.en), false);
    });
    $$('[data-en-html]').forEach(el => {
      if (el.dataset.zhHtml === undefined) el.dataset.zhHtml = el.innerHTML;
      setTxt(el, L(el.dataset.zhHtml, el.dataset.enHtml), true);
    });
    $$('[data-en-label]').forEach(el => {
      if (el.dataset.zhLabel === undefined) el.dataset.zhLabel = el.getAttribute('aria-label') || '';
      el.setAttribute('aria-label', L(el.dataset.zhLabel, el.dataset.enLabel));
    });
    $$('[data-en-alt]').forEach(el => {
      if (el.dataset.zhAlt === undefined) el.dataset.zhAlt = el.getAttribute('alt') || '';
      el.setAttribute('alt', L(el.dataset.zhAlt, el.dataset.enAlt));
    });
    const btn = $('#lang');
    if (btn) btn.setAttribute('aria-pressed', lang === 'en');
  };
  // 逐行揭露的段落裡的 <br> 先換成記號字元，fx.js 切行時再還原成強制換行
  $$('[data-tx="lines"] br').forEach(b => b.replaceWith(''));
  applyLang();
  $('#lang').addEventListener('click', () => {
    lang = L('en', 'zh');
    try { localStorage.setItem('lang', lang); } catch (e) {}
    applyLang();
    document.dispatchEvent(new Event('langchange'));
    dispatchEvent(new Event('resize'));                 // 字變長變短：選單圓點、跑馬燈、各區版面重新量
  });
  /* ---------- 物種資料（依「蝴蝶百科資料」） ---------- */
  const species = [
    { id: 'idea', name: '大白斑蝶', latin: 'Idea leuconoe clara', fam: '蛺蝶科 · 斑蝶亞科', alias: '黑點大白斑蝶、大胡麻斑蝶、大帛斑蝶',
      color: ['白', '黑'], mark: '斑點、線條', tail: false, wing: '58–71', alt: '0–1000', host: '爬森藤', food: '花蜜', author: 'Butler, 1867', glow: '#FFF6DE',
      en: { name: 'Paper Kite', fam: 'Nymphalidae · Danainae', alias: 'Rice Paper Butterfly, Large Tree Nymph', color: ['white', 'black'], mark: 'spots and stripes', host: 'Parsonsia laevigata', food: 'nectar' } },
    { id: 'euploea', name: '小紫斑蝶', latin: 'Euploea tulliolus koxinga', fam: '蛺蝶科 · 斑蝶亞科', alias: '妒麗紫斑蝶、埔里紫斑蝶',
      color: ['黑褐', '紫'], mark: '斑點', tail: false, wing: '36–41', alt: '0–1000', host: '盤龍木', food: '花蜜', author: 'Fruhstorfer, 1908', glow: '#EEDDF7',
      en: { name: 'Dwarf Crow', fam: 'Nymphalidae · Danainae', alias: 'Small Brown Crow', color: ['dark brown', 'purple'], mark: 'spots', host: 'Malaisia scandens', food: 'nectar' } },
    { id: 'tirumala', name: '淡紋青斑蝶', latin: 'Tirumala limniace limniace', fam: '蛺蝶科 · 斑蝶亞科', alias: '淡色小紋青斑蝶、叉斑蝶',
      color: ['黑褐', '白'], mark: '斑點、線條', tail: false, wing: '35–51', alt: '0–1000', host: '華他卡藤、夜香花', food: '花蜜', author: '(Cramer), 1775', glow: '#DDF0F7',
      en: { name: 'Blue Tiger', fam: 'Nymphalidae · Danainae', alias: '', color: ['dark brown', 'white'], mark: 'spots and stripes', host: 'Dregea volubilis, Telosma cordata', food: 'nectar' } },
    { id: 'kallima', name: '枯葉蝶', latin: 'Kallima inachus formosana', fam: '蛺蝶科 · 蛺蝶亞科', alias: '枯葉蛺蝶、木葉蝶',
      color: ['褐', '橙'], mark: '斑點、線條', tail: true, wing: '44–52', alt: '0–2000', host: '臺灣馬藍、腺萼馬藍、曲莖馬藍', food: '花蜜、腐果、樹液', author: 'Fruhstorfer, 1912', glow: '#FBE6D2',
      en: { name: 'Orange Oakleaf', fam: 'Nymphalidae · Nymphalinae', alias: 'Dead Leaf Butterfly, Indian Leafwing', color: ['brown', 'orange'], mark: 'spots and stripes', host: 'Strobilanthes formosanus, S. penstemonoides, S. flexicaulis', food: 'nectar, rotting fruit, sap' } },
    { id: 'demoleus', name: '花鳳蝶', latin: 'Papilio demoleus', fam: '鳳蝶科 · 鳳蝶亞科', alias: '無尾鳳蝶、達摩鳳蝶、黃斑鳳蝶',
      color: ['花', '花'], mark: '斑點', tail: false, wing: '42–46', alt: '0–1000', host: '柑橘、來母、柚、佛手柑、過山香、烏柑仔、金柑、石苓舅', food: '花蜜', author: 'Linnaeus, 1758', glow: '#F7F0D2',
      en: { name: 'Lime Swallowtail', fam: 'Papilionidae · Papilioninae', alias: 'Lime Butterfly, Chequered Swallowtail', color: ['mixed', 'mixed'], mark: 'spots', host: 'citrus, lime, pomelo, Buddha’s hand, Clausena, Atalantia, kumquat, Glycosmis', food: 'nectar' } },
    { id: 'polytes', name: '玉帶鳳蝶', latin: 'Papilio polytes polytes', fam: '鳳蝶科 · 鳳蝶亞科', alias: '白帶鳳蝶、縞鳳蝶、白帶蝶',
      color: ['黑', '白'], mark: '斑點、線條', tail: true, wing: '39–54', alt: '0–2000', host: '柑橘、黎檬、柚、甜橙、飛龍掌血、食茱萸、烏柑仔、過山香', food: '花蜜', author: 'Linnaeus, 1758', glow: '#F1EFE8',
      en: { name: 'Common Mormon', fam: 'Papilionidae · Papilioninae', alias: '', color: ['black', 'white'], mark: 'spots and stripes', host: 'citrus, lemon, pomelo, sweet orange, Toddalia asiatica, Zanthoxylum ailanthoides, Atalantia, Clausena', food: 'nectar' } }
  ];
  const KINDS = species.map(s => s.id);               // 網站上出現的蝴蝶只用這六種

  /* ---------- 蝴蝶圖樣：翅膀畫在共用的 <defs>，每隻蝴蝶用 <use> 引用 ---------- */
  // 左側翅膀（身體在 x = 0），右側用鏡像
  const WING = {
    F: 'M0 -5C-6 -22 -30 -38 -46 -33C-52 -26 -47 -10 -34 -2C-22 4 -9 3 0 2Z',
    FK: 'M0 -5C-8 -24 -32 -40 -52 -39C-48 -30 -46 -14 -34 -2C-22 4 -9 3 0 2Z',          // 枯葉蝶：前翅尖端突出
    H: 'M0 1C-12 1 -33 5 -37 17C-39 29 -24 36 -12 30C-5 25 -1 13 0 4Z',
    HT: 'M0 1C-12 1 -33 5 -37 17C-38 25 -31 30 -25 31C-24 36 -23 41 -20 45C-18 40 -18 34 -16 31C-10 29 -4 23 -1 13 0 4Z'  // 有尾突
  };
  const VEIN_F = [[-14, -24], [-26, -32], [-38, -34], [-47, -28], [-48, -18], [-41, -7], [-28, 0]];
  const VEIN_H = [[-20, 4], [-31, 9], [-37, 18], [-33, 28], [-22, 33], [-12, 30]];
  const veins = (pts, c, w) => `<g fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity=".85">` +
    pts.map(([x, y]) => `<path d="M-1 0Q${(x * .5).toFixed(1)} ${(y * .5 + 2).toFixed(1)} ${x} ${y}"/>`).join('') + '</g>';
  const dots = (r, n, box, rr, c) => Array.from({ length: n }, () =>
    `<circle cx="${(box[0] + r() * (box[2] - box[0])).toFixed(1)}" cy="${(box[1] + r() * (box[3] - box[1])).toFixed(1)}" r="${(rr[0] + r() * (rr[1] - rr[0])).toFixed(1)}" fill="${c}"/>`).join('');
  const marginDots = c => [[-44, -28], [-46, -20], [-43, -12], [-37, -6], [-34, 15], [-34, 22], [-29, 28], [-21, 31], [-14, 28]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${c}"/>`).join('');
  const streaks = list => list.map(([x, y, a, b, t]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="#E4F1F4" transform="rotate(${t} ${x} ${y})" opacity=".92"/>`).join('');

  // 每種蝴蝶：主色／次色、斑紋都對照百科資料
  const BF_KINDS = {
    idea: r => ({ g: ['#FFFDF6', '#E8E0C8'], edge: '#26221E', ew: 2.4,
      fore: veins(VEIN_F, '#26221E', 1.3) + dots(r, 10, [-44, -32, -10, 0], [1.5, 3.6], '#26221E'),
      hind: veins(VEIN_H, '#26221E', 1.2) + dots(r, 8, [-36, 4, -6, 32], [1.5, 3.4], '#26221E'), extra: marginDots('#fff') }),
    euploea: r => ({ g: ['#4A2E4F', '#21141F'], edge: '#140C12', ew: 1.6,
      fore: `<ellipse cx="-24" cy="-16" rx="18" ry="11" fill="url(#bfSheen)" transform="rotate(-25 -24 -16)"/>` + dots(r, 6, [-44, -30, -30, -8], [.8, 1.6], '#F3EEF8'),
      hind: dots(r, 5, [-34, 10, -14, 30], [.7, 1.3], '#E8E0F0'), extra: marginDots('#F3EEF8') }),
    tirumala: () => ({ g: ['#3A322B', '#1C1814'], edge: '#16120F', ew: 1.6,
      fore: streaks([[-14, -16, 9, 3, -50], [-26, -22, 10, 3, -30], [-36, -24, 8, 3, -15], [-38, -12, 7, 3, 10], [-28, -6, 8, 3, 25], [-18, -4, 6, 3, 10]]),
      hind: streaks([[-14, 8, 9, 3, 15], [-22, 14, 9, 3, 30], [-26, 22, 8, 3, 55], [-18, 24, 7, 2.6, 75]]), extra: marginDots('#F1F6F6') }),
    hypolimnas: () => ({ g: ['#2A2420', '#120F0D'], edge: '#0E0C0A', ew: 1.4,
      fore: `<ellipse cx="-30" cy="-18" rx="9" ry="6" fill="url(#bfHalo)"/><ellipse cx="-30" cy="-18" rx="5" ry="3.4" fill="#FBFAF6"/>`,
      hind: `<ellipse cx="-20" cy="15" rx="10" ry="8" fill="url(#bfHalo)"/><ellipse cx="-20" cy="15" rx="5.5" ry="4.4" fill="#FBFAF6"/>`, extra: marginDots('#fff') }),
    kallima: () => ({ g: ['#6B4A32', '#2E2A3A'], edge: '#1E1812', ew: 1.4, f: 'FK', h: 'HT',
      fore: `<path d="M-12 -14C-20 -26 -30 -31 -42 -28L-37 -14C-28 -16 -20 -10 -16 -4Z" fill="url(#bfOrange)"/><circle cx="-42" cy="-22" r="1.8" fill="#fff"/>`,
      hind: `<path d="M-6 6C-14 10 -26 14 -34 22" stroke="#4B5E8A" stroke-width="3" fill="none" opacity=".55"/>`, extra: '' }),
    hebomoia: () => ({ g: ['#FFFDF8', '#ECE6D6'], edge: '#3A3128', ew: 1.2,
      fore: `<path d="M-26 -36C-34 -30 -40 -18 -36 -6L-50 -10L-50 -40Z" fill="url(#bfOrange)"/><path d="M-26 -36C-34 -30 -40 -18 -36 -6" stroke="#3A3128" stroke-width="1.8" fill="none"/>` + veins(VEIN_F, 'rgba(60,50,40,.35)', .8),
      hind: veins(VEIN_H, 'rgba(60,50,40,.25)', .8), extra: '' }),
    demoleus: r => ({ g: ['#2B2622', '#141210'], edge: '#0F0D0B', ew: 1.4,
      fore: dots(r, 16, [-46, -32, -6, 0], [1.2, 3], '#F2D36B'),
      hind: `<path d="M-6 8C-14 12 -22 16 -30 18" stroke="#F2D36B" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-12" cy="26" r="3" fill="#D9542F"/><circle cx="-12" cy="26" r="1.4" fill="#3F6CC8"/>`,
      extra: marginDots('#F2D36B') }),
    polytes: () => ({ g: ['#26221F', '#100E0C'], edge: '#0B0A09', ew: 1.4, h: 'HT',
      fore: veins(VEIN_F, 'rgba(255,255,255,.12)', .8),
      hind: [[-10, 10], [-17, 12], [-24, 15], [-30, 19]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="4.4" fill="#F4EEDC"/>`).join('') + `<circle cx="-16" cy="28" r="1.6" fill="#D24A3A"/>`,
      extra: '' })
  };

  const buildDefs = () => {
    let s = Object.entries(WING).map(([k, d]) => `<clipPath id="c${k}"><path d="${d}"/></clipPath>`).join('') +
      `<radialGradient id="bfShade" cx="0" cy="0" r="46" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1A140F" stop-opacity=".55"/><stop offset=".35" stop-color="#1A140F" stop-opacity=".1"/><stop offset="1" stop-color="#1A140F" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="bfGloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>` +
      `<radialGradient id="bfSheen"><stop offset="0" stop-color="#8FA0FF" stop-opacity=".95"/><stop offset=".6" stop-color="#6A4FD0" stop-opacity=".6"/><stop offset="1" stop-color="#6A4FD0" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="bfHalo"><stop offset=".4" stop-color="#9E8CFF"/><stop offset="1" stop-color="#3B2F8F" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="bfOrange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB25B"/><stop offset="1" stop-color="#E2601D"/></linearGradient>` +
      `<filter id="bfGrain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="m"/><feBlend in="SourceGraphic" in2="m" mode="multiply"/></filter>` +
      `<linearGradient id="bfBody" x1="0" x2="1"><stop offset="0" stop-color="#55493E"/><stop offset=".45" stop-color="#2A2420"/><stop offset="1" stop-color="#0E0C0A"/></linearGradient>`;
    Object.entries(BF_KINDS).forEach(([k, make], i) => {
      const p = make(rng(i * 131 + 7)), F = p.f || 'F', H = p.h || 'H';
      s += `<linearGradient id="g-${k}" x1="1" y1="0" x2="0" y2=".6"><stop offset="0" stop-color="${p.g[0]}"/><stop offset="1" stop-color="${p.g[1]}"/></linearGradient>` +
        `<g id="w-${k}"><g filter="url(#bfGrain)">` +
        `<g clip-path="url(#c${H})"><path d="${WING[H]}" fill="url(#g-${k})"/>${p.hind}<path d="${WING[H]}" fill="url(#bfShade)"/></g>` +
        `<path d="${WING[H]}" fill="none" stroke="${p.edge}" stroke-width="${p.ew}"/>` +
        `<g clip-path="url(#c${F})"><path d="${WING[F]}" fill="url(#g-${k})"/>${p.fore}<path d="${WING[F]}" fill="url(#bfShade)"/><path d="${WING[F]}" fill="url(#bfGloss)"/></g>` +
        `<path d="${WING[F]}" fill="none" stroke="${p.edge}" stroke-width="${p.ew}"/>${p.extra}</g></g>`;
    });
    s += `<g id="bf-body"><path d="M-1 -10L-6 -30M1 -10L6 -30" stroke="#2A2420" stroke-width=".9" fill="none"/><circle cx="-6" cy="-30.5" r="1.4" fill="#2A2420"/><circle cx="6" cy="-30.5" r="1.4" fill="#2A2420"/>` +
      `<ellipse cy="-9" rx="2.8" ry="2.6" fill="url(#bfBody)"/><ellipse cy="-2" rx="3.6" ry="6" fill="url(#bfBody)"/><ellipse cy="12" rx="2.6" ry="11" fill="url(#bfBody)"/>` +
      `<g stroke="rgba(255,255,255,.18)" stroke-width=".6"><path d="M-2.3 6H2.3M-2.4 10H2.4M-2.3 14H2.3M-2 18H2"/></g><ellipse cx="-1" cy="-3" rx="1" ry="3" fill="rgba(255,255,255,.25)"/></g>`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', 0); svg.setAttribute('height', 0);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `<defs>${s}</defs>`;
    document.body.prepend(svg);
  };
  buildDefs();
  const bfHTML = k => `<div class="bf"><div class="bf-3d">` +
    `<svg class="wl" viewBox="-52 -40 52 80"><use href="#w-${k}"/></svg>` +
    `<svg class="wr" viewBox="0 -40 52 80"><use href="#w-${k}" transform="scale(-1 1)"/></svg>` +
    `<svg class="bd" viewBox="-52 -40 104 80"><use href="#bf-body"/></svg></div></div>`;
  // 首頁飛舞的蝴蝶：手繪插畫（assets/<id>-fly.png，已轉正、身體在正中線），左右兩半各自拍動，身體不動
  const FLY_KINDS = ['idea', 'euploea', 'tirumala', 'kallima', 'demoleus', 'polytes'];
  const flyHTML = k => {
    const bg = `style="background-image:url(assets/${k}-fly.png)"`;
    return `<div class="bf bf-img"><div class="bf-3d"><i class="wl" ${bg}></i><i class="wr" ${bg}></i><i class="bd" ${bg}></i></div></div>`;
  };

  /* ---------- 0. 開場前奏：背景 → 霧 → LOGO 入場（CSS 動畫），前奏播完且素材載完才出現 START ---------- */
  const intro = $('#intro'), nav = $('#nav'), startBtn = $('#start');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  document.body.classList.add('locked');               // 按 START 前不能捲動
  const P_ASSETS = ['p-blossom', 'p-oak', 'p-fern', 'p-ivy', 'p-beech', 'p-poppy', 'p-frond', 'p-sprig'];
  const PRELOAD = ['assets/logo.png', ...KINDS.map(k => `assets/${k}-700.webp`), ...FLY_KINDS.map(k => `assets/${k}-fly.png`),...P_ASSETS.map(f => `assets/${f}.png`)];
  let loaded = 0, introPlayed = false;
  const total = PRELOAD.length + 1;
  const showStart = () => {};                           // 不再出現 START 按鈕：讀條跑完就自動進入（見下方「讀條」）
  const bump = () => { loaded++; showStart(); };
  PRELOAD.forEach(src => { const im = new Image(); im.onload = im.onerror = bump; im.src = src; });
  (document.fonts ? document.fonts.load(`900 100px "Noto Serif TC"`, '一生') : Promise.resolve()).then(bump, bump);
  setTimeout(() => { loaded = total; showStart(); }, 12000);   // 網路太慢時不要一直卡住
  setTimeout(() => { introPlayed = true; showStart(); }, reduce ? 0 : 4800);   // LOGO 入場播完（見 CSS .intro-logo）

  // 開場的霧：一層會飄動的霧，游標經過的地方散開一小圈，離開後慢慢聚回來
  // makeFog(canvas, 範圍元素)：開場與「從利用，轉為保育」共用；只在範圍元素出現在畫面上時才畫
  const makeFog = (cv, host) => {
    const ctx = cv.getContext('2d');
    const hole = document.createElement('canvas'), hctx = hole.getContext('2d');   // 霧被吹散的範圍（越白 = 越清楚）
    const SC = .5;                                     // 半解析度畫，省效能，霧本來就是糊的
    const HR = 120;                                    // 散開的半徑（px）
    let W = 0, H = 0, raf = 0, ptr = null, last = null, seen = true;
    const puffs = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), r: .18 + Math.random() * .22, vx: (Math.random() - .5) * .012, a: .25 + Math.random() * .25 }));
    const resize = () => {
      W = Math.ceil(host.clientWidth * SC); H = Math.ceil(host.clientHeight * SC);
      cv.width = hole.width = W; cv.height = hole.height = H;
    };
    const clear = (x, y) => {                          // 在 hole 上畫一個柔邊的圓
      const r = HR * SC, g = hctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      hctx.fillStyle = g;
      hctx.beginPath(); hctx.arc(x, y, r, 0, 6.2832); hctx.fill();
    };
    const draw = now => {
      raf = requestAnimationFrame(draw);
      if (!seen) return;
      if (Math.ceil(host.clientWidth * SC) !== W || Math.ceil(host.clientHeight * SC) !== H) resize();
      const t = now / 1000;
      // 霧慢慢聚回來
      hctx.globalCompositeOperation = 'destination-out';
      hctx.fillStyle = `rgba(0,0,0,${reduce ? .2 : .025})`;
      hctx.fillRect(0, 0, W, H);
      hctx.globalCompositeOperation = 'source-over';
      if (ptr) {                                       // 沿著移動路徑補點，快速移動也是一條連續的通道
        const hr = host.getBoundingClientRect();       // 存的是視窗座標，每格換算，捲動時游標沒動也對得上
        const x = (ptr.x - hr.left) * SC, y = (ptr.y - hr.top) * SC;
        if (last) {
          const n = Math.ceil(Math.hypot(x - last.x, y - last.y) / (HR * SC * .25));
          for (let k = 1; k <= n; k++) clear(last.x + (x - last.x) * k / n, last.y + (y - last.y) * k / n);
        } else clear(x, y);
        last = { x, y };
      }
      // 霧本體：一層淡白，加上飄動的霧團
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(244,246,240,.72)';
      ctx.fillRect(0, 0, W, H);
      const M = Math.max(W, H);
      puffs.forEach((p, i) => {
        const x = ((p.x + (reduce ? 0 : t * p.vx)) % 1.4 + 1.4) % 1.4 - .2, y = p.y + (reduce ? 0 : Math.sin(t * .15 + i) * .04);
        const r = p.r * M, g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
        g.addColorStop(0, `rgba(255,255,253,${p.a})`); g.addColorStop(1, 'rgba(255,255,253,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x * W - r, y * H - r, r * 2, r * 2);
      });
      // 挖掉被吹散的地方
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(hole, 0, 0);
    };
    const move = e => { ptr = { x: e.clientX, y: e.clientY }; };
    resize();
    addEventListener('resize', resize);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerdown', move);
    host.addEventListener('pointerleave', () => { ptr = last = null; });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(host);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  };
  const fogStop = makeFog($('#introFog'), intro);
  // 「從利用，轉為保育」：森林底圖上蓋一層同樣會被游標吹散的霧
  { const sec = $('#k-conserve'), cv = sec && sec.querySelector('.kq-fog'); if (cv) makeFog(cv, sec); }

  // START：像水面被點了一下的漣漪，一圈圈擴散到整個畫面，最後一圈實心的淺底蓋滿，開場才消失
  // 依物理漣漪的規律：
  //  1. 同一次擾動會發出一串波紋（波包）；外圈波長較長、跑得最快，最先出現也走得最遠，
  //     內圈較慢、停在較小的半徑 → 每條速度不一，圈與圈的間距越往外越開
  //  2. 能量攤在越來越大的圓周上，振幅約與 1/√r 成正比，再加上水的阻尼 → 線條越外越細、越淡
  //  3. 擴散速度隨時間遞減（先快後慢）
  //  4. 中心的水面回彈，稍晚再發出一串較弱、較小的第二波
  const ringOut = () => {
    const from = $('#ldLogo') || startBtn;               // 漣漪從讀條終點（左上角的 LOGO）擴散出去
    const b = from.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const D = 2 * Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 40;   // 蓋滿整個視窗的直徑
    const d0 = b.height, J = () => Math.random();
    const ring = (cls, frames, delay, dur, easing) => {
      const el = document.createElement('i');
      el.className = 'intro-ring' + cls;
      el.style.left = cx + 'px'; el.style.top = cy + 'px';
      intro.appendChild(el);
      return el.animate(frames, { duration: dur, delay, easing, fill: 'both' }).finished;
    };
    /* 物理漣漪（逐格模擬，畫在 canvas 上）：
       1. 波紋一道一道「陸續」發出，間隔越來越長（擾動慢慢平息）→ 漸進性
       2. 色散：先發出的外圈波長較長、跑得最快；後發的內圈越來越慢 → 每道速率不同，圈距越往外越開
       3. 每道都先快後慢（水的阻力）：r(t) = v·τ·(1 − e^(−t/τ))
       4. 振幅：能量攤在越來越大的圓周上 ∝ 1/√r，再乘上隨時間的衰減 → 越外越細、越淡
       5. 每道波紋畫成「波峰（深）＋內側波谷（淺）」，看起來像水面的起伏 */
    const cv = document.createElement('canvas'), DPR = Math.min(2, devicePixelRatio || 1);
    cv.className = 'intro-ripples';
    cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR);
    intro.appendChild(cv);
    const g = cv.getContext('2d');
    const N = 10, TAU = .75, R0 = d0 / 2;   // 整體加快
    const V0 = (D * .56) / (.78 * TAU);                    // 第一道約 1.7 秒擴散到畫面外
    const waves = [];
    let emit = 0;
    for (let i = 0; i < N; i++) {
      waves.push({ t0: emit, v: V0 * (1 - i * .075) * (.94 + J() * .12), a0: 1 - i * .07, lam: 22 - i * 1.3 });
      emit += 42 * Math.pow(1.2, i) + J() * 20;          // 發出的間隔越來越長
    }
    const t00 = performance.now();
    const drawRip = now => {
      const t = (now - t00) / 1000;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, innerWidth, innerHeight);
      let alive = false;
      for (const w of waves) {
        const tt = t - w.t0 / 1000;
        if (tt <= 0) { alive = true; continue; }
        const r = R0 + w.v * TAU * (1 - Math.exp(-tt / TAU));
        const a = w.a0 * Math.min(1, tt * 10) / Math.sqrt(1 + (r - R0) / 45) * Math.exp(-tt / 1.0);
        if (a < .01) continue;
        alive = true;
        g.beginPath(); g.arc(cx, cy, r, 0, 6.2832);
        g.strokeStyle = `rgba(62,95,59,${Math.min(1, a * 1.1).toFixed(3)})`; g.lineWidth = .5 + a * 3.2; g.stroke();
        if (r - w.lam * .5 > R0) {                         // 內側的波谷：較淡、較寬
          g.beginPath(); g.arc(cx, cy, r - w.lam * .5, 0, 6.2832);
          g.strokeStyle = `rgba(62,95,59,${(a * .28).toFixed(3)})`; g.lineWidth = .5 + a * 6; g.stroke();
        }
      }
      if (alive && t < 2.2) requestAnimationFrame(drawRip); else cv.remove();
    };
    requestAnimationFrame(drawRip);
    // 最後實心的淺底從中心擴散蓋滿畫面
    return ring(' fill', [{ width: d0 + 'px', height: d0 + 'px' }, { width: D + 'px', height: D + 'px' }], 600, 750, 'cubic-bezier(.45,.05,.3,1)');
  };
  let introStarted = false;
  const startSite = () => {
    if (introStarted) return;
    introStarted = true;
    startBtn.disabled = true;
    // 選單直接就定位（不從上方滑下來），讀條的 LOGO 停在它的 LOGO 上，開場淡出時無縫接上
    nav.style.transition = 'none';
    nav.classList.add('visible');
    void nav.offsetWidth;
    nav.style.transition = '';
    document.body.classList.add('started');
    document.body.classList.remove('locked');
    document.dispatchEvent(new Event('introdone'));
    const done = () => { intro.classList.add('out'); setTimeout(() => { fogStop(); intro.remove(); }, 700); };
    if (reduce) done(); else ringOut().then(done, done);
  };
  startBtn.addEventListener('click', startSite);

  /* ---------- 讀條：一隻蝴蝶沿著不規則、會繞圈的曲線飛過畫面 ----------
     - 路線：從右上角出發，經過幾個隨機的點（中間還會繞一兩個小圈），最後停在左上角＝首頁選單常駐 LOGO 的位置
       用平滑曲線（Catmull-Rom）串起來，再依進度沿曲線前進；蝴蝶頭朝前進方向，轉彎時身體微微傾斜
     - 尾跡：最近 0.3～0.8 秒飛過的位置畫成一條越來越淡、越來越細的線
     - 翅膀：飛行時一直拍動，進度前進得越快拍得越快
     - 到 100%：蝴蝶停在左上角、淡出並縮小，原地浮現 LOGO，接著自動進入首頁
     - 進度 = 「最短播放時間」和「素材實際載入比例」取較慢的那個；百分比與生命週期小圖示（卵→幼蟲→蛹→剛羽化→展翅）在畫面中央偏下 */
  {
    const ld = $('#ld'), fly = $('#ldFly'), logoEl = $('#ldLogo'), pctEl = $('#ldPct'), ico = $('#ldIco'), cv = $('#ldTrail');
    const brandImg = $('.brand img');
    const STAGES = [
      '<svg viewBox="0 0 24 30" class="ld-egg"><ellipse cx="12" cy="16" rx="8.5" ry="11.5" fill="#F3EEDD" stroke="#B9A57E" stroke-width="1.4"/><path d="M7.5 10.5q4.5-3.6 9 0" stroke="#D8CBAA" stroke-width="1.2" fill="none"/></svg>',
      '<img src="assets/kc-larva.png" alt="" class="ld-larva">',
      '<img src="assets/cur-pupa.png" alt="" class="ld-pupa">',
      '<img src="assets/cur-bf.png" alt="" class="ld-bf closed">',
      '<img src="assets/cur-bf.png" alt="" class="ld-bf open">'
    ];
    if (ld && fly && cv) {
      const ctx = cv.getContext('2d'), DPR = Math.min(2, devicePixelRatio || 1);
      const R = (a, b) => a + Math.random() * (b - a);
      // 終點：選單 LOGO 的位置（選單還沒出現時被往上推了一個選單高，要加回來）
      const logoBox = () => {
        const b = brandImg ? brandImg.getBoundingClientRect() : { left: 24, top: 21, width: 104, height: 26 };
        return { x: b.left, y: b.top + (nav.classList.contains('visible') ? 0 : nav.offsetHeight), w: b.width || 104, h: b.height || 26 };
      };
      // 路線：以畫面比例記錄（0～1），換算時再乘上視窗大小，視窗縮放也跟著變
      // 固定路線（依手繪草圖）：右上角起飛 → 往左再往下勾一個彎 → 沿右側往下 → 在右下繞一個圈 →
      // 沿底部往左畫一道大弧 → 沿左側往上 → 停在左上角 LOGO 的位置
      const way = [
        [.891, .076], [.823, .062], [.759, .084], [.744, .179], [.795, .218], [.880, .280], [.909, .414],
        [.880, .560], [.823, .633], [.752, .650], [.684, .588], [.691, .515], [.759, .465], [.823, .476],
        [.848, .582], [.823, .694], [.716, .806], [.573, .862], [.458, .862], [.344, .784], [.258, .672],
        [.215, .493], [.215, .280], [.186, .168],
        [-1, -1]                                          // 最後一點：LOGO 中心（每格重新算）
      ];
      void R;
      const SUB = 24;
      const build = () => {
        const lb = logoBox(), W = innerWidth, H = innerHeight;
        const P = way.map(([x, y]) => x < 0 ? [lb.x + lb.w / 2, lb.y + lb.h / 2] : [x * W, y * H]);
        const pts = [], cum = [0];
        const g = k => P[Math.max(0, Math.min(P.length - 1, k))];
        for (let k = 0; k < P.length - 1; k++) for (let j = 0; j < SUB; j++) {
          const t = j / SUB, p0 = g(k - 1), p1 = g(k), p2 = g(k + 1), p3 = g(k + 2), t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
        pts.push(P[P.length - 1]);
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        return { pts, cum, len: cum[cum.length - 1], lb };
      };
      let path = build(), pw = innerWidth, ph = innerHeight;
      const at = d => {
        const { pts, cum } = path;
        let lo = 0, hi = cum.length - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
        const f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
        return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
      };
      const sizeCv = () => { cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); };
      sizeCv();
      const tail = [];                                    // 尾跡：最近飛過的點與時間
      const TAIL = .65;                                   // 尾跡保留的秒數（最舊的在 0.3 秒後開始淡、0.65 秒消失）
      const t0 = performance.now(), MIN = reduce ? 600 : 3200;
      let shown = 0, stage = -1, ang = 0, phase = 0, lastT = t0, last = null, finished = 0;
      const tick = now => {
        const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
        if (innerWidth !== pw || innerHeight !== ph) { pw = innerWidth; ph = innerHeight; path = build(); sizeCv(); }
        const target = Math.min(1, (now - t0) / MIN, loaded / total);
        const prev = shown;
        shown += (target - shown) * .05;
        if (target >= 1 && shown > .997) shown = 1;
        // 速度有快有慢：進度換成路線距離時加上起伏（一下衝、一下放慢滑翔），仍保證一路往前、終點不變
        const warp = p => p + .55 * Math.sin(p * Math.PI * 6) / (Math.PI * 6);
        const dist = warp(shown) * path.len;
        const [x, y] = at(dist);
        const [nx, ny] = at(Math.min(path.len, dist + 8));
        // 方向：頭朝路線前進的方向。圖裡的蝴蝶頭朝左上（約 -145°）；往右飛時左右翻轉（頭變成朝右上，約 -35°）
        const dx = nx - x, dy = ny - y;
        if (Math.hypot(dx, dy) > .3) {
          if (Math.abs(dx) > .8) fly.classList.toggle('right', dx > 0);
          const right = fly.classList.contains('right');
          const head = Math.atan2(dy, dx), want = head - (right ? -35 : -145) * Math.PI / 180;
          let d = want - ang; d = Math.atan2(Math.sin(d), Math.cos(d));   // 走最短的方向轉過去
          ang += d * .18;
        }
        const speed = Math.abs(warp(shown) - warp(prev)) * path.len / Math.max(dt, .001);
        phase += dt * (9 + Math.min(14, speed / 40));
        const flap = shown >= 1 ? 1 : .55 + .45 * Math.abs(Math.cos(phase));
        fly.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${ang.toFixed(3)}rad)`;
        fly.style.setProperty('--flap', flap.toFixed(3));
        // 尾跡
        const ts = now / 1000;
        if (!last || Math.hypot(x - last[0], y - last[1]) > 1.5) { tail.push([x, y, ts]); last = [x, y]; }
        while (tail.length && ts - tail[0][2] > TAIL) tail.shift();
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        ctx.lineCap = 'round';
        for (let i = 1; i < tail.length; i++) {
          const age = ts - tail[i][2], k = 1 - age / TAIL;
          if (k <= 0) continue;
          ctx.strokeStyle = `rgba(62,95,59,${(k * k * .55).toFixed(3)})`;
          ctx.lineWidth = .6 + k * 2.4;
          ctx.beginPath(); ctx.moveTo(tail[i - 1][0], tail[i - 1][1]); ctx.lineTo(tail[i][0], tail[i][1]); ctx.stroke();
        }
        // 百分比＋小圖示
        const pc = Math.floor(shown * 100);
        pctEl.textContent = pc + '%';
        ld.setAttribute('aria-valuenow', pc);
        const s = pc >= 100 ? 4 : pc >= 75 ? 3 : pc >= 50 ? 2 : pc >= 25 ? 1 : 0;
        if (s !== stage) {
          stage = s; ico.innerHTML = STAGES[s];
          ico.classList.remove('pop'); void ico.offsetWidth; ico.classList.add('pop');
        }
        // 到終點：蝴蝶淡出縮小、原地浮現 LOGO（位置與選單 LOGO 完全一樣），尾跡收完後自動進入首頁
        if (shown >= 1) {
          if (!finished) {
            finished = now;
            const lb = logoBox();
            logoEl.style.cssText = `left:${lb.x}px;top:${lb.y}px;height:${lb.h}px`;
            ld.classList.add('done');
            setTimeout(startSite, 550);
          }
          if (now - finished > 900) return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---------- 選取文字：綠底黑字；原本就是黑字的地方改成綠底白字 ---------- */
  document.addEventListener('selectionchange', () => {
    const n = getSelection().anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement);
    if (!el) return;
    const [r, g, b] = (getComputedStyle(el).color.match(/[\d.]+/g) || [255, 255, 255]).map(Number);
    document.documentElement.classList.toggle('sel-black', (.2126 * r + .7152 * g + .0722 * b) / 255 < .25);
  });

  /* ---------- 選單＋小圓點 ---------- */
  // 小圓點：滑到哪個連結就移到它下面，移動中沿方向拉長＋模糊
  const makeDot = (box, links, yOff = () => 0, active = () => null, streak = true) => {   // streak = 移動時拉長＋動態模糊
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.innerHTML = '<i></i>';
    box.appendChild(dot);
    let px = null, py = null, t = 0;
    const move = (a, instant) => {
      if (!a) { dot.classList.remove('show'); return; }
      const b = box.getBoundingClientRect(), r = a.getBoundingClientRect();
      const x = r.left - b.left + r.width / 2, y = r.bottom - b.top + yOff();
      const dist = px === null || instant ? 0 : Math.hypot(x - px, y - py);
      const ang = px === null ? 0 : Math.atan2(y - py, x - px) * 180 / Math.PI;
      dot.style.transition = instant || !dot.classList.contains('show') ? 'none' : '';
      dot.style.transform = `translate(${x}px, ${y}px)`;
      void dot.offsetWidth;
      dot.style.transition = '';
      dot.classList.add('show');
      const i = dot.firstChild;
      if (streak && dist > 4) {
        i.style.transform = `rotate(${ang}deg) scaleX(${Math.min(7, 1 + dist / 18).toFixed(2)})`;
        i.style.filter = `blur(${Math.min(3, dist / 50).toFixed(1)}px)`;
        clearTimeout(t);
        t = setTimeout(() => { i.style.transform = `rotate(${ang}deg) scaleX(1)`; i.style.filter = 'blur(0)'; }, 420);
      }
      px = x; py = y;
    };
    links.forEach(a => { a.addEventListener('pointerenter', () => move(a)); a.addEventListener('focus', () => move(a)); });
    box.addEventListener('pointerleave', () => move(active()));
    return move;
  };

  const menu = $('#menu'), links = $$('.menu a'), burger = $('#burger');
  const activeLink = () => links.find(a => a.classList.contains('on'));
  const moveDot = makeDot(menu, links, () => (nav.classList.contains('compact') || innerWidth <= 860 ? -4 : 0), activeLink, false);   // 頂部選單：不要動態模糊
  const setMenu = open => {
    if (nav.classList.contains('open') === open) return;
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? L('關閉選單', 'Close menu') : L('開啟選單', 'Open menu'));
    if (open) requestAnimationFrame(() => moveDot(activeLink(), true));
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));   // 打開後變成叉叉
  links.forEach(a => a.addEventListener('click', () => setMenu(false)));
  $('#menuScrim').addEventListener('click', () => setMenu(false));                   // 點左邊留白區關閉
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  /* ---------- 背景：懸浮粒子（會被游標推開）＋首頁 → 摘要的漣漪 ---------- */
  const dust = $('#dust'), dg = dust.getContext('2d');
  const diag = () => Math.hypot(innerWidth, innerHeight);
  const rip = { on: false, x: 0, y: 0, p: 0 };          // 首頁 → 摘要的漣漪，進度由捲動決定
  let motes = [];
  const sizeDust = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    dust.width = innerWidth * dpr; dust.height = innerHeight * dpr;
    dg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(innerWidth * innerHeight / 7000);
    const r = rng(42);
    motes = Array.from({ length: n }, () => ({ x: r() * innerWidth, y: r() * innerHeight, s: .5 + r() * 1.8, a: .12 + r() * .32,
      vx: (r() - .5) * 6, vy: -3 - r() * 8, ph: r() * 6.28, warm: r() < .35, px: 0, py: 0 }));
  };
  const drawRipples = now => {
    if (!rip.on) return;
    const s = Math.sin(rip.p * Math.PI), maxR = diag() * .75;
    for (let k = 0; k < 6; k++) {
      const ph = (rip.p * 1.2 + now / 6000 + k / 6) % 1, rad = ph * maxR;
      const a = s * (1 - ph) * Math.min(1, ph * 8) * .55;
      if (a < .01) continue;
      dg.beginPath();
      for (let j = 0; j <= 96; j++) {
        const th = j / 96 * Math.PI * 2;
        const rr = rad * (1 + .045 * Math.sin(th * 3 + now / 1100 + k) + .02 * Math.sin(th * 7 - now / 700));
        const tw = th + rad * .0012;                      // 越外圈轉得越多 → 渦線
        const x = rip.x + Math.cos(tw) * rr, y = rip.y + Math.sin(tw) * rr * .62;
        j ? dg.lineTo(x, y) : dg.moveTo(x, y);
      }
      dg.strokeStyle = `rgba(60,52,44,${a.toFixed(3)})`;
      dg.lineWidth = 1.2;
      dg.stroke();
    }
  };
  const drawDust = now => {
    dg.clearRect(0, 0, innerWidth, innerHeight);
    drawRipples(now);
    const R = 140;
    motes.forEach(m => {
      // 被游標推開：越近推力越大，之後慢慢減速
      const dx = m.x - mouse.x, dy = m.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < R && d > .1) { const f = (1 - d / R) * 1.6; m.px += dx / d * f; m.py += dy / d * f; }
      m.px *= .92; m.py *= .92;
      m.x += m.vx / 60 + Math.sin(now / 1800 + m.ph) * .15 + m.px;
      m.y += m.vy / 60 + m.py;
      if (m.y < -10) m.y = innerHeight + 10; if (m.y > innerHeight + 10) m.y = -10;
      if (m.x < -10) m.x = innerWidth + 10; if (m.x > innerWidth + 10) m.x = -10;
      dg.beginPath();
      dg.fillStyle = m.warm ? `rgba(201,150,80,${m.a})` : `rgba(60,52,44,${m.a * .8})`;
      dg.arc(m.x, m.y, m.s, 0, 6.283);
      dg.fill();
    });
    if (!reduce) requestAnimationFrame(drawDust);
  };
  sizeDust();
  addEventListener('resize', sizeDust);
  requestAnimationFrame(drawDust);

  /* ---------- 文字動畫：進入畫面播放，離開後重置（往回捲會再播一次） ---------- */
  // 逐字錯開、淡入淡出、位移、遮罩揭露、打字機、縮放
  const typeOut = async (el, token) => {
    const full = el.dataset.full;
    el.classList.add('typing');
    for (let c = 1; c <= full.length; c++) {
      if (el.dataset.tok !== token) return;
      el.textContent = full.slice(0, c);
      await new Promise(r => setTimeout(r, 40));
    }
    el.classList.remove('typing');
  };
  const TX = '[data-tx],[data-split],.big-no,.rv';
  const txOn = el => {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el.dataset.tx === 'type' && !reduce) { el.dataset.tok = Math.random().toString(36); typeOut(el, el.dataset.tok); }
  };
  const txOff = el => {
    if (reduce) return;
    el.classList.remove('in');
    if (el.dataset.tx === 'type') { el.dataset.tok = ''; el.textContent = ' '; el.classList.remove('typing'); }
  };
  $$('[data-split]').forEach(el => splitChars(el, el.textContent.trim()));
  $$('[data-tx]').forEach(el => {
    if (el.dataset.tx === 'type') { el.dataset.full = el.textContent; el.setAttribute('aria-label', el.textContent); if (!reduce) el.textContent = ' '; }
    if (el.dataset.tx === 'mask') el.innerHTML = `<span class="mk">${el.innerHTML}</span>`;
  });
  txReady = true;
  const story = $('#story');
  const txIO = new IntersectionObserver(es => es.forEach(e => {
    if (story.contains(e.target)) return;              // 摘要的文字跟著漣漪播放
    if (e.isIntersecting) txOn(e.target);
    else if (e.boundingClientRect.top > 0 || e.boundingClientRect.bottom < 0) txOff(e.target);
  }), { threshold: .2 });
  if (reduce) $$(TX).forEach(el => el.classList.add('in'));
  else $$(TX).forEach(el => txIO.observe(el));

  /* ---------- 一頁式捲動：首頁 → 摘要是漣漪轉場（摘要固定在畫面上、從游標處以圓形擴散出來），之後一般捲動 ---------- */
  const pages = $$('[data-sec]'), NP = pages.length, garden = $('#garden'), foot = $('#foot');
  const hero = $('#hero'), ripTrack = $('#ripTrack');
  // 選單收合：LOGO 和選單項目一起淡出 → 在看不到時換位置 → LOGO 在新位置淡入（不從左邊滑到中間）
  let compactOn = null, foldT = 0;
  const setCompact = on => {
    if (on === compactOn) return;
    const first = compactOn === null;
    compactOn = on;
    clearTimeout(foldT);
    if (first || reduce) { nav.classList.toggle('compact', on); return; }
    nav.classList.add('fold');
    foldT = setTimeout(() => {
      nav.classList.add('snap');                        // 切換的這一刻不要動畫，免得選單面板從左邊滑過畫面
      nav.classList.toggle('compact', on);
      void nav.offsetWidth;
      if (!on) nav.classList.remove('open');
      setMenu(false);
      foldT = setTimeout(() => {
        nav.classList.remove('fold', 'snap');
        if (!on) requestAnimationFrame(() => moveDot(activeLink(), true));
      }, 60);
    }, 380);
  };
  let TZ = 1;
  const layout = () => {
    TZ = Math.round(innerHeight * 1.1);
    ripTrack.style.height = (story.offsetHeight + TZ) + 'px';
  };

  // 各區塊的事件：pagevisible／pagehidden（在畫面內，動畫迴圈用）、pageenter／pageleave（目前在看的區塊）
  const visIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.target !== hero) e.target.dispatchEvent(new Event(e.isIntersecting ? 'pagevisible' : 'pagehidden'));
  }));
  pages.forEach(p => visIO.observe(p));

  // 漣漪：進度 = 捲動距離 / TZ
  let ripP = -1, heroShown = true, storyOn = false;
  // 延遲效果：捲動只決定「目標進度」，畫面上的漣漪用自己的迴圈慢慢追上（停止捲動後還會繼續擴散一下）
  let ripGoal = 0, ripCur = -1, ripRaf = 0;
  const ripple = () => {
    ripGoal = reduce ? (scrollY > 2 ? 1 : 0) : clamp01(scrollY / TZ);
    if (true) { ripCur = ripGoal; ripApply(ripCur); return; }   // 延遲效果已取消：漣漪直接跟著捲動位置
    if (!ripRaf) ripRaf = requestAnimationFrame(ripTick);
  };
  const ripTick = () => {
    ripRaf = 0;
    ripCur += (ripGoal - ripCur) * .09;
    if (Math.abs(ripGoal - ripCur) < .002) ripCur = ripGoal;
    ripApply(ripCur);
    if (ripCur !== ripGoal) ripRaf = requestAnimationFrame(ripTick);
    else queue();                                       // 追上後再更新一次選單狀態（透明底、目前頁面）
  };
  const ripApply = p => {
    if (p === ripP) return;
    if (ripP <= 0 && p > 0) {                          // 開始時記下游標位置當作漣漪中心
      const inView = mouse.x > 0 && mouse.x < innerWidth && mouse.y > 0 && mouse.y < innerHeight;
      rip.x = inView ? mouse.x : innerWidth / 2; rip.y = inView ? mouse.y : innerHeight / 2;
    }
    ripP = p;
    rip.on = p > 0 && p < 1; rip.p = p;
    story.style.clipPath = p >= 1 ? '' : `circle(${(p * diag() * 1.05).toFixed(1)}px at ${rip.x}px ${rip.y}px)`;
    hero.style.transform = p > 0 && p < 1 ? `scale(${(1 - p * .06).toFixed(4)})` : '';
    hero.style.filter = p > 0 && p < 1 ? `blur(${(p * 4).toFixed(2)}px)` : '';
    const show = p < 1;
    if (show !== heroShown) {
      heroShown = show;
      hero.style.visibility = show ? '' : 'hidden';
      hero.dispatchEvent(new Event(show ? 'pagevisible' : 'pagehidden'));
    }
    if (p >= .5 && !storyOn) { storyOn = true; story.querySelectorAll(TX).forEach(txOn); }
    else if (p < .1 && storyOn) { storyOn = false; story.querySelectorAll(TX).forEach(txOff); }
  };

  let curP = -1;
  const chrome = () => {
    const p = pages[curP];
    links.forEach(a => a.classList.toggle('on', a.hash === '#' + p.id));
    if (!menu.matches(':hover')) moveDot(activeLink());
    setCompact(innerWidth <= 860 || garden.getBoundingClientRect().bottom < 68);   // 過了「介紹」→ 收合
    if (!compactOn) setMenu(false);
    nav.classList.toggle('clear', ripP >= .5);                           // 從「摘要」開始背景透明
  };
  const current = () => {
    if (ripP < .5) return 0;
    const mid = innerHeight / 2;
    for (let i = 1; i < NP; i++) {
      const r = pages[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) return i;
    }
    return curP < 1 ? 1 : curP;
  };
  const update = () => {
    ripple();
    const c = current();
    if (c !== curP) {
      const old = pages[curP];
      curP = c;
      if (old) old.dispatchEvent(new Event('pageleave'));
      pages[c].dispatchEvent(new Event('pageenter'));
    }
    chrome();
    document.dispatchEvent(new Event('scrolltick'));
  };
  let raf = 0;
  const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };

  // 漣漪轉場停在一半時，依捲動方向自動完成或退回
  let snapT = 0, lastY = scrollY, dirY = 1;
  const snap = () => {
    if (scrollY <= 0 || scrollY >= TZ) return;
    const p = scrollY / TZ, y = (dirY > 0 ? p > .1 : p > .9) ? TZ : 0;
    scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };
  addEventListener('scroll', () => {
    if (scrollY !== lastY) dirY = scrollY > lastY ? 1 : -1;
    lastY = scrollY;
    queue();
    clearTimeout(snapT);
    snapT = setTimeout(snap, 160);
  }, { passive: true });
  addEventListener('resize', () => { layout(); update(); });

  // 選單、頁尾的站內連結：平滑捲到該區塊
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    setMenu(false);
    const el = a.hash.length > 1 && document.querySelector(a.hash);
    if (!el) return;
    const y = el === hero ? 0 : el === story ? TZ : el.getBoundingClientRect().top + scrollY;
    scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- 1. 首頁：LOGO 先伸出枝條 → 長出葉片、開花 → 蝴蝶飛出 ---------- */
  const logo = $('#logo'), fliesBox = $('#flies');
  const hRand = rng(20240611);
  const between = (a, b) => a + hRand() * (b - a);
  const pick = arr => arr[Math.floor(hRand() * arr.length)];
  const NS = 'http://www.w3.org/2000/svg';
  const STEMS = ['p-oak', 'p-fern', 'p-ivy', 'p-beech', 'p-poppy', 'p-frond', 'p-sprig'];
  const BLOOMS = ['p-blossom'];
  const pops = [];
  // 素材：anchor = 'base'（從根部長）或 'mid'（以中心綻放）
  const plant = (parent, src, x, y, rot, size, delay, mid) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
    g.innerHTML = `<g class="pop"><g class="sway" style="--sw:${between(4, 8).toFixed(1)}s;--swd:${(-between(0, 6)).toFixed(1)}s">` +
      `<image href="assets/${src}.png" x="${-size / 2}" y="${mid ? -size / 2 : -size}" width="${size}" height="${size}" preserveAspectRatio="${mid ? 'xMidYMid' : 'xMidYMax'} meet"/></g></g>`;
    parent.appendChild(g);
    pops.push({ el: g.firstChild, delay });
  };

  // LOGO（assets/logo.png）墨線邊緣的取樣點，事先算好（SVG 座標 ÷8；y 從 130 起算）
  // 本機開檔時瀏覽器不允許讀取圖片像素，所以不在執行時取樣
  const LOGO_EDGE = [83,0,76,1,77,1,78,1,79,1,80,1,81,1,82,1,45,2,64,2,74,2,75,2,81,2,46,3,63,3,72,3,73,3,80,3,46,4,47,4,63,4,71,4,79,4,80,4,169,4,170,4,171,4,24,5,25,5,26,5,27,5,28,5,39,5,40,5,41,5,42,5,43,5,47,5,48,5,63,5,70,5,78,5,168,5,172,5,181,5,182,5,183,5,184,5,185,5,3,6,4,6,5,6,6,6,23,6,28,6,39,6,44,6,47,6,49,6,63,6,64,6,69,6,79,6,154,6,155,6,156,6,157,6,158,6,159,6,160,6,167,6,172,6,181,6,185,6,2,7,7,7,8,7,23,7,28,7,38,7,43,7,47,7,49,7,64,7,65,7,66,7,67,7,68,7,69,7,80,7,81,7,82,7,83,7,103,7,104,7,105,7,106,7,107,7,145,7,146,7,147,7,148,7,149,7,150,7,151,7,152,7,153,7,157,7,158,7,159,7,160,7,167,7,171,7,181,7,184,7,1,8,9,8,23,8,28,8,38,8,43,8,47,8,50,8,52,8,70,8,76,8,77,8,78,8,84,8,85,8,102,8,107,8,137,8,138,8,139,8,140,8,141,8,142,8,143,8,144,8,149,8,150,8,151,8,152,8,153,8,154,8,155,8,156,8,166,8,171,8,180,8,184,8,0,9,10,9,11,9,22,9,27,9,38,9,43,9,47,9,50,9,52,9,53,9,71,9,75,9,79,9,80,9,86,9,87,9,101,9,107,9,117,9,118,9,119,9,120,9,121,9,122,9,132,9,133,9,134,9,135,9,136,9,140,9,141,9,142,9,143,9,144,9,145,9,146,9,147,9,148,9,166,9,170,9,180,9,184,9,0,10,9,10,11,10,22,10,27,10,37,10,42,10,46,10,50,10,53,10,54,10,71,10,75,10,81,10,82,10,88,10,99,10,100,10,105,10,106,10,116,10,123,10,132,10,133,10,134,10,135,10,136,10,137,10,138,10,139,10,165,10,170,10,180,10,184,10,1,11,8,11,10,11,11,11,12,11,22,11,27,11,37,11,42,11,46,11,50,11,53,11,55,11,71,11,75,11,83,11,89,11,98,11,104,11,115,11,124,11,165,11,169,11,180,11,184,11,1,12,7,12,12,12,13,12,21,12,26,12,36,12,42,12,45,12,51,12,52,12,56,12,70,12,75,12,84,12,89,12,97,12,103,12,115,12,124,12,164,12,169,12,180,12,184,12,2,13,6,13,13,13,14,13,21,13,26,13,33,13,34,13,35,13,42,13,43,13,44,13,57,13,58,13,59,13,60,13,61,13,62,13,70,13,75,13,84,13,89,13,95,13,96,13,101,13,102,13,114,13,125,13,164,13,168,13,179,13,183,13,3,14,4,14,5,14,14,14,15,14,16,14,17,14,18,14,19,14,20,14,26,14,36,14,41,14,45,14,52,14,57,14,70,14,75,14,84,14,89,14,94,14,100,14,114,14,125,14,131,14,132,14,133,14,134,14,135,14,141,14,142,14,143,14,144,14,145,14,163,14,168,14,179,14,183,14,13,15,19,15,27,15,28,15,36,15,41,15,45,15,51,15,53,15,56,15,70,15,75,15,84,15,89,15,93,15,99,15,114,15,125,15,131,15,136,15,140,15,145,15,163,15,167,15,179,15,183,15,13,16,18,16,20,16,29,16,36,16,40,16,45,16,52,16,56,16,70,16,75,16,83,16,88,16,91,16,92,16,97,16,98,16,115,16,124,16,131,16,136,16,140,16,146,16,162,16,167,16,168,16,169,16,170,16,171,16,172,16,173,16,174,16,175,16,176,16,177,16,178,16,184,16,185,16,186,16,187,16,188,16,189,16,190,16,191,16,192,16,193,16,194,16,195,16,196,16,197,16,198,16,13,17,18,17,20,17,30,17,35,17,40,17,44,17,56,17,70,17,74,17,82,17,88,17,90,17,96,17,115,17,124,17,131,17,137,17,140,17,146,17,162,17,166,17,178,17,183,17,12,18,17,18,20,18,31,18,35,18,40,18,44,18,56,18,70,18,74,18,81,18,87,18,89,18,95,18,116,18,123,18,131,18,137,18,141,18,146,18,161,18,166,18,179,18,183,18,12,19,17,19,19,19,31,19,35,19,39,19,44,19,56,19,70,19,74,19,80,19,85,19,86,19,88,19,89,19,90,19,91,19,92,19,93,19,94,19,117,19,118,19,121,19,122,19,132,19,137,19,141,19,146,19,161,19,165,19,178,19,182,19,12,20,17,20,19,20,24,20,25,20,31,20,34,20,39,20,45,20,56,20,69,20,74,20,78,20,79,20,83,20,84,20,119,20,120,20,132,20,137,20,141,20,147,20,160,20,165,20,178,20,182,20,11,21,17,21,19,21,23,21,26,21,31,21,34,21,39,21,45,21,55,21,69,21,74,21,76,21,77,21,81,21,82,21,103,21,104,21,105,21,106,21,107,21,108,21,132,21,138,21,141,21,147,21,160,21,164,21,178,21,182,21,11,22,18,22,23,22,26,22,31,22,34,22,38,22,46,22,55,22,69,22,70,22,71,22,72,22,73,22,74,22,75,22,80,22,102,22,108,22,132,22,138,22,142,22,147,22,159,22,164,22,178,22,182,22,11,23,16,23,23,23,26,23,30,23,33,23,38,23,46,23,55,23,75,23,80,23,100,23,101,23,107,23,133,23,138,23,142,23,143,23,144,23,145,23,146,23,159,23,163,23,178,23,182,23,11,24,15,24,17,24,22,24,25,24,30,24,33,24,38,24,47,24,48,24,54,24,75,24,80,24,99,24,105,24,106,24,133,24,134,24,135,24,136,24,137,24,138,24,159,24,160,24,161,24,162,24,163,24,177,24,182,24,10,25,15,25,17,25,22,25,25,25,30,25,33,25,38,25,49,25,50,25,51,25,55,25,75,25,81,25,97,25,98,25,104,25,113,25,114,25,115,25,116,25,117,25,118,25,177,25,181,25,10,26,15,26,17,26,22,26,24,26,29,26,33,26,39,26,52,26,53,26,54,26,55,26,64,26,65,26,66,26,67,26,68,26,69,26,70,26,71,26,72,26,73,26,74,26,82,26,83,26,84,26,85,26,86,26,87,26,88,26,89,26,96,26,102,26,103,26,113,26,119,26,130,26,131,26,132,26,133,26,134,26,135,26,136,26,137,26,138,26,139,26,140,26,141,26,142,26,143,26,144,26,145,26,146,26,147,26,148,26,149,26,177,26,181,26,10,27,14,27,17,27,23,27,28,27,33,27,40,27,41,27,42,27,65,27,66,27,67,27,68,27,69,27,70,27,71,27,72,27,73,27,74,27,75,27,76,27,77,27,78,27,79,27,80,27,81,27,82,27,83,27,84,27,85,27,86,27,87,27,88,27,89,27,95,27,101,27,113,27,119,27,123,27,124,27,125,27,126,27,127,27,128,27,130,27,131,27,132,27,133,27,134,27,135,27,136,27,137,27,138,27,139,27,140,27,141,27,142,27,143,27,144,27,150,27,177,27,181,27,186,27,187,27,188,27,9,28,14,28,16,28,27,28,34,28,35,28,36,28,37,28,38,28,43,28,44,28,45,28,46,28,47,28,48,28,49,28,50,28,51,28,52,28,53,28,54,28,55,28,56,28,93,28,94,28,100,28,114,28,119,28,123,28,128,28,145,28,150,28,177,28,181,28,183,28,184,28,185,28,189,28,190,28,191,28,9,29,14,29,16,29,25,29,26,29,39,29,40,29,41,29,47,29,48,29,49,29,50,29,51,29,52,29,53,29,54,29,55,29,69,29,70,29,71,29,72,29,73,29,74,29,75,29,76,29,77,29,92,29,98,29,99,29,114,29,120,29,122,29,127,29,144,29,150,29,176,29,182,29,192,29,193,29,9,30,15,30,22,30,23,30,24,30,42,30,46,30,68,30,78,30,79,30,80,30,81,30,82,30,83,30,90,30,91,30,97,30,114,30,121,30,126,30,141,30,142,30,143,30,148,30,149,30,169,30,170,30,171,30,172,30,173,30,174,30,175,30,194,30,195,30,9,31,21,31,41,31,46,31,68,31,74,31,75,31,76,31,77,31,78,31,84,31,85,31,86,31,89,31,95,31,96,31,115,31,125,31,139,31,140,31,146,31,147,31,168,31,169,31,170,31,171,31,172,31,173,31,174,31,175,31,196,31,10,32,11,32,12,32,13,32,20,32,41,32,46,32,68,32,73,32,79,32,80,32,87,32,88,32,94,32,115,32,125,32,137,32,138,32,143,32,144,32,145,32,176,32,181,32,182,32,197,32,198,32,14,33,20,33,41,33,45,33,68,33,73,33,81,33,88,33,89,33,90,33,91,33,92,33,93,33,115,33,124,33,136,33,142,33,176,33,180,33,183,33,184,33,199,33,14,34,19,34,29,34,30,34,31,34,32,34,33,34,34,34,35,34,36,34,37,34,38,34,39,34,40,34,46,34,47,34,48,34,49,34,50,34,51,34,52,34,53,34,54,34,68,34,73,34,82,34,87,34,115,34,123,34,136,34,141,34,176,34,180,34,185,34,186,34,197,34,198,34,14,35,19,35,29,35,30,35,31,35,32,35,33,35,34,35,45,35,46,35,47,35,48,35,49,35,50,35,51,35,52,35,53,35,54,35,68,35,73,35,80,35,81,35,87,35,115,35,122,35,136,35,142,35,175,35,180,35,187,35,188,35,189,35,195,35,196,35,14,36,19,36,21,36,22,36,23,36,24,36,25,36,35,36,44,36,68,36,73,36,76,36,77,36,78,36,79,36,86,36,101,36,102,36,103,36,104,36,105,36,106,36,107,36,114,36,122,36,137,36,143,36,175,36,180,36,190,36,191,36,192,36,193,36,194,36,13,37,18,37,20,37,25,37,34,37,44,37,67,37,74,37,75,37,85,37,100,37,106,37,114,37,121,37,138,37,144,37,175,37,179,37,13,38,18,38,20,38,25,38,34,38,44,38,46,38,65,38,66,38,71,38,72,38,73,38,80,38,86,38,99,38,105,38,114,38,120,38,138,38,145,38,175,38,179,38,13,39,18,39,20,39,25,39,33,39,43,39,46,39,47,39,65,39,70,39,74,39,79,39,81,39,86,39,97,39,98,39,104,39,113,39,119,39,124,39,125,39,126,39,127,39,128,39,129,39,130,39,131,39,132,39,133,39,134,39,135,39,136,39,137,39,138,39,146,39,147,39,148,39,149,39,150,39,151,39,152,39,175,39,179,39,13,40,17,40,19,40,24,40,32,40,43,40,46,40,48,40,49,40,65,40,70,40,74,40,79,40,81,40,86,40,96,40,103,40,113,40,119,40,139,40,145,40,174,40,179,40,12,41,17,41,19,41,24,41,32,41,37,41,43,41,47,41,50,41,51,41,65,41,69,41,74,41,79,41,81,41,86,41,95,41,101,41,102,41,113,41,118,41,139,41,144,41,174,41,179,41,8,42,9,42,10,42,11,42,18,42,24,42,31,42,36,42,38,42,42,42,47,42,52,42,64,42,69,42,74,42,78,42,81,42,86,42,93,42,94,42,100,42,112,42,117,42,139,42,144,42,174,42,179,42,4,43,5,43,6,43,7,43,10,43,11,43,12,43,13,43,14,43,15,43,16,43,17,43,18,43,24,43,30,43,34,43,35,43,37,43,42,43,47,43,53,43,64,43,69,43,73,43,78,43,81,43,86,43,92,43,98,43,99,43,111,43,117,43,139,43,144,43,174,43,178,43,5,44,6,44,7,44,8,44,9,44,19,44,24,44,29,44,33,44,37,44,42,44,48,44,54,44,64,44,69,44,73,44,78,44,81,44,86,44,90,44,91,44,97,44,111,44,116,44,139,44,144,44,174,44,178,44,18,45,23,45,28,45,31,45,32,45,37,45,42,45,48,45,55,45,64,45,69,45,73,45,78,45,81,45,86,45,89,45,96,45,110,45,115,45,138,45,143,45,173,45,178,45,18,46,23,46,27,46,29,46,30,46,36,46,41,46,49,46,55,46,64,46,69,46,72,46,78,46,82,46,83,46,84,46,85,46,87,46,88,46,94,46,95,46,109,46,115,46,136,46,137,46,142,46,173,46,178,46,18,47,19,47,20,47,21,47,22,47,25,47,26,47,27,47,28,47,36,47,41,47,50,47,56,47,64,47,65,47,66,47,67,47,68,47,71,47,77,47,86,47,92,47,93,47,109,47,114,47,134,47,135,47,141,47,173,47,178,47,24,48,25,48,26,48,36,48,37,48,38,48,39,48,40,48,41,48,51,48,52,48,57,48,69,48,70,48,76,48,84,48,85,48,91,48,109,48,110,48,111,48,112,48,113,48,128,48,129,48,130,48,131,48,132,48,133,48,138,48,139,48,140,48,153,48,154,48,155,48,156,48,157,48,158,48,159,48,160,48,161,48,162,48,163,48,164,48,165,48,166,48,167,48,168,48,169,48,170,48,171,48,172,48,179,48,180,48,181,48,182,48,183,48,184,48,185,48,186,48,187,48,188,48,189,48,190,48,191,48,192,48,193,48,194,48,195,48,21,49,22,49,23,49,53,49,54,49,55,49,56,49,57,49,58,49,59,49,68,49,69,49,70,49,71,49,72,49,73,49,74,49,75,49,84,49,85,49,86,49,87,49,88,49,89,49,90,49,125,49,126,49,127,49,128,49,129,49,130,49,131,49,132,49,133,49,134,49,135,49,136,49,137,49,152,49,153,49,154,49,155,49,156,49,157,49,158,49,159,49,160,49,161,49,162,49,163,49,164,49,165,49,166,49,167,49,168,49,169,49,170,49,171,49,172,49,173,49,174,49,175,49,176,49,177,49,178,49,179,49,180,49,181,49,182,49,183,49,184,49,185,49,186,49,187,49,188,49,189,49,190,49,191,49,192,49,193,49,194,49,195,49,196,49];
  const sampleGlyph = () => {
    const edge = [];
    for (let i = 0; i < LOGO_EDGE.length; i += 2) edge.push([LOGO_EDGE[i] * 8, LOGO_EDGE[i + 1] * 8 + 130]);
    return edge;
  };
  // 從點集挑出 k 個彼此盡量分散的點（每次挑離已選點最遠的那個；記住每點的最近距離，不用每輪重算）
  const spread = (pts, k) => {
    const out = [pick(pts)], near = pts.map(() => Infinity);
    while (out.length < Math.min(k, pts.length)) {
      const q = out[out.length - 1];
      let best = 0, bd = -1;
      pts.forEach((p, i) => {
        near[i] = Math.min(near[i], (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
        if (near[i] > bd) { bd = near[i]; best = i; }
      });
      out.push(pts[best]);
    }
    return out;
  };

  // LOGO 外輪廓：每一欄最上／最下、每一列最左／最右的邊緣點，附上往外的方向（rot：0 = 朝上，順時針為正）
  const outline = () => {
    const top = new Map(), bot = new Map(), lef = new Map(), rig = new Map();
    for (let i = 0; i < LOGO_EDGE.length; i += 2) {
      const x = LOGO_EDGE[i], y = LOGO_EDGE[i + 1];
      if (!top.has(x) || y < top.get(x)) top.set(x, y);
      if (!bot.has(x) || y > bot.get(x)) bot.set(x, y);
      if (!lef.has(y) || x < lef.get(y)) lef.set(y, x);
      if (!rig.has(y) || x > rig.get(y)) rig.set(y, x);
    }
    const slope = (m, k) => (m.has(k + 2) && m.has(k - 2)) ? (m.get(k + 2) - m.get(k - 2)) / 4 : 0;
    const deg = (nx, ny) => Math.atan2(nx, -ny) * 180 / Math.PI;
    const cl = a => Math.max(-55, Math.min(55, a));
    const pts = [];
    top.forEach((y, x) => pts.push([x, y, cl(deg(slope(top, x), -1))]));
    bot.forEach((y, x) => pts.push([x, y, 180 - cl(deg(slope(bot, x), -1))]));
    lef.forEach((x, y) => pts.push([x, y, -90 - cl(deg(slope(lef, y), -1))]));
    rig.forEach((x, y) => pts.push([x, y, 90 + cl(deg(slope(rig, y), -1))]));
    return pts.map(([x, y, r]) => [x * 8, y * 8 + 130, r]);
  };

  const flowerSpots = [];                             // 蝴蝶從這些花飛出來，也會停在這裡（SVG 座標）
  const buildLogo = () => {
    const edge = outline();
    if (!edge.length) return;
    const back = $('#logoBack'), front = $('#logoFront');
    // 沿著字的外輪廓長出 120 叢：每叢 2–3 株枝葉順著輪廓往外伸（七種素材輪流），隔一叢開一朵白花
    const K = 120;
    let s = 0;
    spread(edge, K).sort((a, b) => a[0] - b[0]).forEach(([px, py, out], i) => {
      const base = .3 + i * (4.5 / K);
      const tx = Math.cos(out * Math.PI / 180), ty = Math.sin(out * Math.PI / 180);   // 沿輪廓的切線方向
      for (let k = 0, n = 2 + (hRand() < .3); k < n; k++) {
        const t = between(-10, 10);
        plant(k % 2 ? front : back, STEMS[s++ % STEMS.length], px + tx * t, py + ty * t, out + between(-28, 28), between(46, 86), base + k * .18);
      }
      if (i % 2 === 0) {
        plant(front, pick(BLOOMS), px, py, between(-30, 30), between(34, 54), base + .5, true);
        if (i % 4 === 0) flowerSpots.push([px, py]);   // 蝴蝶只用其中一部分當停歇點
      }
    });
  };

  // ---- 蝴蝶：飛舞、被滑鼠吸引；沒人理時會停在花上不再振翅 ----
  const flies = [];
  let logoBox = { x: 0, y: 0, r: 300 }, heroMouse = null, mouseT = 0, flyRaf = 0, lastT = 0, heroInView = true;
  const measure = () => {
    const h = hero.getBoundingClientRect(), l = logo.getBoundingClientRect();
    logoBox = { x: l.left - h.left + l.width / 2, y: l.top - h.top + l.height * .5, rx: l.width * .48, ry: l.height * .5 };
  };
  const toHero = ([x, y]) => {
    const m = logo.getScreenCTM(), h = hero.getBoundingClientRect();
    const p = new DOMPoint(x, y).matrixTransform(m);
    return [p.x - h.left, p.y - h.top];
  };
  const spawnFly = from => {
    const k = FLY_KINDS[flies.length % FLY_KINDS.length];   // 六種輪流出現
    const el = document.createElement('div');
    el.className = 'fly flap';
    el.style.setProperty('--flap', between(.14, .22).toFixed(2) + 's');
    el.innerHTML = `<div class="fsh">${flyHTML(k)}</div><div class="fbd">${flyHTML(k)}</div>`;
    fliesBox.appendChild(el);
    const [x, y] = from;
    const f = { el, sh: el.firstChild, bd: el.lastChild, x, y, vx: between(-30, 30), vy: between(-90, -40), rot: 0, ang: between(0, 6.28),
      orbit: between(80, 260), spd: between(.45, 1.65), size: between(.8, 1.3), phase: between(0, 6.28), tx: x, ty: y, next: 0,
      // 跟隨游標時每隻各有不同：繞的圈大小、方向、圓扁、偏離游標的位置，以及反應快慢
      dir: hRand() < .5 ? 1 : -1, flat: between(.45, .9), ox: between(-140, 140), oy: between(-100, 100), react: between(.9, 3.8),
      state: 'fly', alt: 1, shAlt: -1, until: 0 };
    flies.push(f);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    f.bd.style.transform = `scale(${f.size.toFixed(2)})`;
    requestAnimationFrame(() => el.classList.add('on'));
    return f;
  };
  const takeOff = (f, now) => {
    if (f.state === 'fly') return;
    f.state = 'fly'; f.next = now + between(300, 900);
    f.el.classList.remove('bask'); f.el.classList.add('flap');
    f.vy = -80;
  };
  // 影子：俯視、光從左上方來，飛得越高影子離得越遠、越淡、越糊
  const placeShadow = f => {
    const ox = 4 + f.alt * 22, oy = 6 + f.alt * 30;
    f.sh.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${f.rot.toFixed(1)}deg) scale(${(f.size * (1 - f.alt * .1)).toFixed(2)})`;
    if (Math.abs(f.alt - f.shAlt) > .05) {
      f.shAlt = f.alt;
      f.sh.style.setProperty('--sb', (1.2 + f.alt * 4).toFixed(1) + 'px');
      f.sh.style.setProperty('--so', (.3 - f.alt * .15).toFixed(2));
    }
  };

  const flyStep = now => {
    const dt = Math.min(.05, (now - lastT) / 1000 || .016);
    lastT = now;
    const chasing = heroMouse && now - mouseT < 4000;
    const landed = flies.filter(f => f.state !== 'fly').length;
    flies.forEach(f => {
      let tx, ty, maxV, arrive = false;
      if (chasing) {                                  // 被滑鼠吸引：各自繞著游標附近的一點飛，圈大小、方向、速度都不同
        takeOff(f, now);
        f.ang += dt * (.7 + f.spd * 1.3) * f.dir;
        tx = heroMouse.x + f.ox + Math.cos(f.ang) * f.orbit;
        ty = heroMouse.y + f.oy + Math.sin(f.ang) * f.orbit * f.flat;
        maxV = 300;
      } else if (f.state === 'land') {                // 停著：不振翅，偶爾慢慢開合
        if (now > f.until) takeOff(f, now);
        f.alt = Math.max(0, f.alt - dt * 3);
        placeShadow(f);
        return;
      } else if (f.state === 'toLand') {
        [tx, ty] = f.spot; maxV = 110; arrive = true;
      } else {                                        // 在 LOGO 周圍隨意飛；偶爾挑一朵花停下來
        if (now > f.next) {
          if (hRand() < .4 && landed < flies.length * .45 && flowerSpots.length) {
            const [sx, sy] = toHero(pick(flowerSpots));
            f.spot = [sx + between(-10, 10), sy + between(-10, 10)];
            f.state = 'toLand';
          } else {
            const a = between(0, 6.28);
            f.tx = logoBox.x + Math.cos(a) * logoBox.rx * between(.3, 1.1);
            f.ty = logoBox.y + Math.sin(a) * logoBox.ry * between(.4, 1.3);
            f.next = now + between(1200, 3200);
          }
        }
        tx = f.tx; ty = f.ty; maxV = 130;
      }
      const dx = tx - f.x, dy = ty - f.y, dist = Math.hypot(dx, dy) || 1;
      if (f.state === 'toLand') {
        f.alt = clamp01(dist / 140);
        if (dist < 5) {
          f.state = 'land'; f.until = now + between(3500, 9000);
          f.x = tx; f.y = ty;
          f.el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
          f.el.classList.remove('flap');
          setTimeout(() => { if (f.state === 'land') f.el.classList.add('bask'); }, 700);
          f.vx = f.vy = 0;
          return;
        }
      } else f.alt = Math.min(1, f.alt + dt * 1.5);
      const sp = Math.min(maxV * f.spd, dist * (arrive ? 1.6 : 2.4));
      const k = Math.min(1, dt * (chasing ? f.react : 1.8));   // 跟隨游標時，有的很快跟上、有的慢吞吞
      f.vx += (dx / dist * sp - f.vx) * k;
      f.vy += (dy / dist * sp - f.vy) * k;
      if (chasing) flies.forEach(g => {               // 彼此靠太近就互相推開，散開一點
        if (g === f || g.state !== 'fly') return;
        const ex = f.x - g.x, ey = f.y - g.y, ed = Math.hypot(ex, ey);
        if (ed > 0 && ed < 110) { const push = (110 - ed) * 6 * dt; f.vx += ex / ed * push; f.vy += ey / ed * push; }
      });
      f.phase += dt * (7 + f.spd * 5);
      const wob = f.alt;                              // 快降落時晃動變小
      f.x += (f.vx + Math.cos(f.phase * .7) * 22 * wob) * dt;
      f.y += (f.vy + Math.sin(f.phase) * 46 * wob) * dt;
      const head = Math.atan2(f.vy, f.vx) * 180 / Math.PI + 90;
      const diff = ((head - f.rot + 540) % 360) - 180;
      f.rot += diff * Math.min(1, dt * 5);
      f.el.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px)`;
      f.bd.style.transform = `rotate(${f.rot.toFixed(1)}deg) scale(${f.size.toFixed(2)})`;
      placeShadow(f);
    });
    flyRaf = heroInView ? requestAnimationFrame(flyStep) : 0;
  };
  const runFlies = () => { if (!flyRaf && !reduce) { lastT = performance.now(); flyRaf = requestAnimationFrame(flyStep); } };
  const heroPoint = e => {
    const h = hero.getBoundingClientRect();
    heroMouse = { x: e.clientX - h.left, y: e.clientY - h.top };
    mouseT = performance.now();
  };
  // 聽整個視窗：摘要的漣漪層蓋在首頁上方，首頁本身收不到滑鼠
  addEventListener('pointermove', e => { if (heroInView) heroPoint(e); }, { passive: true });
  addEventListener('pointerdown', e => { if (heroInView) heroPoint(e); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { heroMouse = null; });
  hero.addEventListener('pagevisible', () => { heroInView = true; if (flies.length) runFlies(); });
  hero.addEventListener('pagehidden', () => { heroInView = false; });
  addEventListener('resize', measure);

  let introDone = false, logoBuilt = false, grown = false;
  const startHero = () => {
    if (grown || !introDone || !logoBuilt) return;
    grown = true;
    hero.classList.add('grow');
    measure();
    if (reduce) {
      pops.forEach(p => { p.el.style.transform = 'none'; });
      for (let i = 0; i < 6; i++) {
        const f = spawnFly(toHero(flowerSpots[i % flowerSpots.length]));
        f.el.classList.remove('flap'); f.alt = 0;
        f.el.style.transform = `translate(${f.x}px, ${f.y}px)`;
        f.bd.style.transform = `rotate(${between(-30, 30)}deg) scale(${f.size})`;
        placeShadow(f);
      }
      return;
    }
    // 植物從根部長出來
    pops.forEach(p => p.el.animate([
      { transform: 'scale(0) rotate(-12deg)' }, { transform: 'scale(1.06) rotate(2deg)', offset: .7 }, { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 1600, delay: p.delay * 1000, easing: 'cubic-bezier(.25,1,.45,1)', fill: 'both' }));
    const count = innerWidth < 768 ? 9 : 16;
    for (let i = 0; i < count; i++)
      setTimeout(() => { spawnFly(toHero(flowerSpots[i % flowerSpots.length])); runFlies(); }, 4600 + i * 240);
  };
  document.addEventListener('introdone', () => { introDone = true; startHero(); });
  buildLogo(); logoBuilt = true; startHero();

  /* ---------- 3. 介紹：旋轉地球 ---------- */
  const N = species.length;
  const STEP = 30 * Math.PI / 180;                    // 相鄰兩隻在地球上相隔 30°，背面看不到的會繞回來接上
  const mod = (a, n) => ((a % n) + n) % n;
  const wrap = d => { d = mod(d, N); return d > N / 2 ? d - N : d; };


  const stage = $('#gStage'), ring = $('#gRing'), text = $('#gText'), dotsBox = $('#gDots');
  const globe = $('#gGlobe'), tex = $('#gTex'), spot = $('#gSpot'), far = $('#gFar'), near = $('#gNear');
  // 有新插畫的蝴蝶：背景花草（assets/<id>-bg.png）＋停在上面的蝴蝶（<id>-fly.png）
  // a = 背景寬高比；x, y = 蝴蝶中心在背景上的位置（比例）；w = 蝴蝶寬／背景寬；r = 停著時的角度（對照原圖量出來的）
  const PERCH = {
    idea: { a: 1.0512, x: .6876, y: .2439, w: .6564, r: -29 },
    euploea: { a: 1.2104, x: .3098, y: .3626, w: .6764, r: -52.8 },
    polytes: { a: 1.0264, x: .5191, y: .6959, w: .8011, r: -1.9 },
    tirumala: { a: .875, x: .5763, y: .5378, w: .9307, r: -26.8 },
    kallima: { a: 1.4292, x: .6618, y: .3169, w: .5971, r: 21.3 },
    demoleus: { a: 1.1526, x: .6699, y: .3255, w: .7241, r: 28.7 }
  };
  const groups = species.map((s, i) => {
    const el = document.createElement('div');
    el.className = 'g-group';
    const p = PERCH[s.id], delay = `--delay:${(-i * .7).toFixed(1)}s`;
    el.innerHTML = '<div class="g-shadow"></div>' + (p
      ? `<div class="g-scene" style="${delay}"><img src="assets/${s.id}-bg.png" alt="" draggable="false">` +
        `<button type="button" class="g-perch bask" aria-label="${L(`讓${s.name}飛一圈`, `Let the ${s.en.name} fly a loop`)}" style="left:${p.x * 100}%;top:${p.y * 100}%;width:${p.w * 100}%;--r:${p.r}deg">${flyHTML(s.id)}</button></div>`
      : `<img src="assets/${s.id}-700.webp" alt="" draggable="false" style="${delay}">`);
    return ring.appendChild(el);
  });
  const scenes = groups.map((g, i) => PERCH[species[i].id] && { el: g.querySelector('.g-scene'), perch: g.querySelector('.g-perch'), a: PERCH[species[i].id].a });
  const DECO = ['p-oak', 'p-frond', 'p-fern', 'p-ivy', 'p-sprig', 'p-beech', 'p-poppy', 'p-blossom'];
  const decos = DECO.flatMap((src, i) => [i + .5, i + .28].map((at, j) => {
    const el = document.createElement('div');
    el.className = 'g-deco';
    el.innerHTML = `<img src="assets/${j ? DECO[(i + 3) % DECO.length] : src}.png" alt="" draggable="false">`;
    ring.appendChild(el);
    return { el, at, k: j ? .55 : .8 };
  }));
  const FAR = [['p-blossom', 6, 8, 16], ['p-fern', 70, 4, 12], ['p-poppy', 84, 30, 10], ['p-sprig', 30, 2, 10]].map(([s, x, y, w]) => {
    const img = document.createElement('img');
    img.src = `assets/${s}.png`; img.alt = '';
    img.style.cssText = `left:${x}%;top:${y}%;width:${w}vw`;
    return far.appendChild(img);
  });
  const NEAR = [['p-frond', -6, 16, 1], ['p-oak', 88, 14, -1]].map(([s, x, w, dir]) => {
    const img = document.createElement('img');
    img.src = `assets/${s}.png`; img.alt = '';
    img.style.cssText = `left:${x}%;width:${w}vw;transform-origin:50% 100%`;
    img.dataset.dir = dir;
    return near.appendChild(img);
  });
  const dotBtns = species.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', L(`第 ${i + 1} 隻：${s.name}`, `Butterfly ${i + 1}: ${s.en.name}`));
    b.addEventListener('click', () => goTo(target + wrap(i - target)));
    return dotsBox.appendChild(b);
  });

  let pos = 0, target = 0, from = 0, t0 = 0, anim = 0, shown = -1, dir = 1;
  let entry = reduce ? 1 : 0;
  const DUR = reduce ? 0 : 1500;

  const render = () => {
    const W = garden.clientWidth, H = garden.clientHeight, mobile = W < 768;
    const R = Math.max(W * (mobile ? 1.1 : .66), 520);
    const top = H * (mobile ? .8 : .78);
    let gh = Math.min(top - 90, W * (mobile ? .9 : .5));
    // 文字不壓主體：桌機把主體放在文字右側，手機放在文字下方
    const textR = text.offsetLeft + text.offsetWidth + 28;
    let cxG = W / 2;
    if (mobile) gh = Math.max(160, Math.min(gh, top - (text.offsetTop + text.offsetHeight) - 16));
    else {
      gh = Math.min(gh, (W - 24 - textR) / 1.12);
      cxG = Math.max(W / 2, textR + gh * 1.12 / 2);
    }
    const gw = gh * 1.12;
    const rise = ease(clamp01(entry / .7));
    const cy = top + R + (1 - rise) * H * .6;
    const spin = -140 * Math.pow(1 - entry, 2);
    const turn = spin - pos * STEP * 180 / Math.PI;
    globe.style.width = globe.style.height = 2 * R + 'px';
    globe.style.transform = `translate(${cxG - R}px, ${cy - R}px)`;
    tex.style.transform = `rotate(${turn}deg)`;
    const show = clamp01((entry - .6) / .4);
    const place = (el, d, h, w) => {
      const th = d * STEP, x = cxG + R * Math.sin(th), y = cy - R * Math.cos(th);
      const vis = Math.abs(th) < 1.25, off = Math.min(1, Math.abs(d));
      const under = !mobile && x < textR && y - h * .5 < text.offsetTop + text.offsetHeight;   // 經過文字底下時淡掉
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.style.transform = `translate3d(${x - w / 2}px, ${y - h + (1 - show) * 60}px, 0) rotate(${th * 180 / Math.PI}deg) rotateY(${th * 180 / Math.PI * .4}deg) scale(${1 - off * .38})`;
      el.style.opacity = vis ? show * (under ? .22 : 1) : 0;
      el.style.visibility = vis ? '' : 'hidden';            // 不設 visible，換頁隱藏時才會一起藏起來
      el.style.filter = `brightness(${1 - .25 * off}) saturate(${1 - .3 * off}) blur(${(off * 1.2).toFixed(2)}px)`;
    };
    groups.forEach((g, i) => {
      const d = wrap(i - pos);
      place(g, d, gh, gw);
      g.style.zIndex = 50 - Math.round(Math.abs(d) * 10);
      const sc = scenes[i];
      if (sc) {                                        // 背景照比例放進框裡（底部置中），蝴蝶的位置才對得上
        const sw = Math.min(gw, gh * sc.a), sh = sw / sc.a;
        sc.el.style.width = sw.toFixed(1) + 'px'; sc.el.style.height = sh.toFixed(1) + 'px';
        sc.el.style.left = ((gw - sw) / 2).toFixed(1) + 'px';
      }
    });
    decos.forEach(o => {
      const d = wrap(o.at - pos), h = gh * .42 * o.k;
      place(o.el, d, h, h);
      o.el.style.zIndex = 20 - Math.round(Math.abs(d) * 4) + (o.k > .7 ? 0 : -5);
    });
    const swish = Math.sin((pos - Math.floor(pos)) * Math.PI) * dir;
    FAR.forEach((img, i) => { img.style.transform = `translateX(${(-swish * W * .02 * (1 + i * .3)).toFixed(1)}px)`; });
    NEAR.forEach(img => { img.style.transform = `translateX(${(-swish * W * .12).toFixed(1)}px) rotate(${img.dataset.dir * 4}deg)`; });
    const sr = gh * .85;
    spot.style.width = spot.style.height = sr * 2 + 'px';
    spot.style.transform = `translate(${cxG - sr}px, ${top - gh * .55 - sr}px)`;
    spot.style.opacity = show;
  };

  // 文字：先由右往左淡出，換內容，再由左下往右上淡入
  let textT = 0;
  const fillText = s => {
    $('#gNo').textContent = `NO.${pad(species.indexOf(s) + 1)} / ${pad(N)}`;
    const e = s.en;
    // 名稱逐字包起來：每個字從一團煙裡浮現（同「知蝶百識」）
    const nm = L(s.name, e.name), chars = [...nm];
    $('#gName').innerHTML = `<span class="sr-only">${nm}</span>` +
      chars.map((c, i) => `<span class="sc" aria-hidden="true" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('') +
      chars.map((c, i) => `<i class="sw" aria-hidden="true" style="--i:${i};--x:${((i + .5) / chars.length * 100).toFixed(1)}%;--dx:${((Math.random() - .5) * 2.4).toFixed(2)}em"></i>`).join('');
    $('#gLatin').textContent = s.latin;
    $('#gFam').textContent = L(s.fam, e.fam);
    $('#gDesc').textContent = L(
      `別名${s.alias}。主色為${s.color[0]}、次色為${s.color[1]}，斑紋呈${s.mark}${s.tail ? '，後翅有尾突' : ''}。全年皆可見到成蝶。`,
      `${e.alias ? `Also known as the ${e.alias}. ` : ''}${e.color[0] === e.color[1] ? `Patterned in ${e.color[0]} colours` : `Mainly ${e.color[0]} with ${e.color[1]}`}, marked with ${e.mark}${s.tail ? ', and tails on the hindwings' : ''}. Adults can be seen all year round.`);
    $('#gMeta').innerHTML = (lang === 'en'
      ? [['Wing length', `approx. ${s.wing} mm`], ['Altitude', `approx. ${s.alt} m`], ['Host plants', e.host], ['Adult food', e.food], ['Described by', s.author]]
      : [['翅長', `約 ${s.wing} 公厘`], ['海拔', `約 ${s.alt} 公尺`], ['寄主植物', s.host], ['成蝶食物', s.food], ['命名', s.author]])
      .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  };
  const showText = i => {
    if (i === shown) return;
    const first = shown < 0;
    shown = i;
    const s = species[i];
    dotBtns.forEach((b, k) => b.setAttribute('aria-current', k === i));
    spot.style.background = `radial-gradient(circle,${s.glow} 0,${s.glow}99 40%,transparent 70%)`;
    if (first || reduce) return fillText(s);
    clearTimeout(textT);
    text.classList.remove('t-in');
    void text.offsetWidth;
    text.classList.add('t-out');
    textT = setTimeout(() => {
      fillText(s);
      text.classList.remove('t-out');
      void text.offsetWidth;
      text.classList.add('t-in');
    }, 450);
  };

  const HOLD = 5000;
  const playBtn = $('#gPlay');
  let auto = !reduce, inView = false, timer = 0, drag = null;
  const schedule = () => {
    clearTimeout(timer);
    if (auto && inView && entry >= 1 && !drag && !flight) timer = setTimeout(() => goTo(target + 1), HOLD);
  };

  // ---- 輪到某隻蝴蝶時（或點牠）：從背景上飛起，繞整個畫面一圈，再停回原位 ----
  const flyer = document.createElement('div');
  flyer.className = 'g-flyer flap';
  flyer.setAttribute('aria-hidden', 'true');
  garden.appendChild(flyer);
  const FLIGHT = 5200;
  let flight = null;
  const smooth = (a, b, t) => { t = clamp01((t - a) / (b - a)); return t * t * (3 - 2 * t); };
  const turnTo = (from, to) => ((to - from + 540) % 360) - 180;
  const perchAt = sc => {                              // 停歇點在 garden 裡的中心與寬度
    const r = sc.perch.getBoundingClientRect(), g = garden.getBoundingClientRect();
    return { x: r.left + r.width / 2 - g.left, y: r.top + r.height / 2 - g.top, w: sc.perch.offsetWidth };
  };
  const land = () => {
    if (!flight) return;
    flight.sc.perch.classList.remove('away');
    flyer.classList.remove('on');
    flight = null;
    schedule();
  };
  const flyTick = now => {
    const f = flight;
    if (!f) return;
    const u = Math.min(1, (now - f.t0) / FLIGHT);
    const p1 = perchAt(f.sc);                          // 地球可能還在微動，降落點每格重算
    const th = f.th0 + f.spin * Math.PI * 2 * ease(u);
    const ex = f.cx + f.rx * Math.cos(th), ey = f.cy + f.ry * Math.sin(th) + Math.sin(u * Math.PI * 7) * f.ry * .07;
    const wi = smooth(0, .18, u), wo = smooth(.74, 1, u);   // 起飛：從停歇點切進繞圈路線；降落：從路線滑回停歇點
    const x = lerp(lerp(f.p0.x, ex, wi), p1.x, wo), y = lerp(lerp(f.p0.y, ey, wi), p1.y, wo);
    const dx = x - f.lx, dy = y - f.ly;
    f.lx = x; f.ly = y;
    if (Math.hypot(dx, dy) > .4) f.ang += turnTo(f.ang, Math.atan2(dx, -dy) * 180 / Math.PI) * .14;   // 頭朝飛行方向
    const a = f.ang + turnTo(f.ang, f.rest) * wo;      // 降落時轉回停著的角度
    const s = 1 + .6 * Math.sin(Math.PI * u);          // 飛近畫面時變大
    const w = p1.w, h = w * 68 / 84;
    flyer.style.width = w + 'px'; flyer.style.height = h + 'px';
    flyer.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${a.toFixed(1)}deg) scale(${s.toFixed(3)})`;
    if (u < 1) requestAnimationFrame(flyTick);
    else land();
  };
  const startFlight = i => {
    const sc = scenes[i];
    if (!sc || reduce || flight || !inView) return;
    const W = garden.clientWidth, H = garden.clientHeight, p0 = perchAt(sc);
    const cx = W / 2, cy = H * .47, rx = W * .41, ry = H * .36;
    const rest = PERCH[species[i].id].r;
    flyer.innerHTML = flyHTML(species[i].id);
    clearTimeout(timer);
    flight = { sc, t0: performance.now(), p0, cx, cy, rx, ry, th0: Math.atan2((p0.y - cy) / ry, (p0.x - cx) / rx),
      spin: p0.x < cx ? 1 : -1, ang: rest, rest, lx: p0.x, ly: p0.y };
    sc.perch.classList.add('away');
    flyer.classList.add('on');
    flyTick(flight.t0);
  };
  const arrive = () => { if (entry >= 1) startFlight(mod(target, N)); };
  scenes.forEach((sc, i) => sc && sc.perch.addEventListener('click', e => {   // 鍵盤（Enter／空白鍵）觸發；滑鼠點擊在 pointerdown 處理
    if (e.detail === 0) i === mod(target, N) ? startFlight(i) : goTo(target + wrap(i - target));
  }));
  const setAuto = on => {
    auto = on;
    playBtn.setAttribute('aria-pressed', on);
    playBtn.setAttribute('aria-label', on ? L('暫停自動輪播', 'Pause autoplay') : L('開始自動輪播', 'Start autoplay'));
    schedule();
  };
  playBtn.addEventListener('click', () => setAuto(!auto));
  // 切換語言：目前這隻的文字、各按鈕的說明一起換
  const labelGarden = () => {
    dotBtns.forEach((b, i) => b.setAttribute('aria-label', L(`第 ${i + 1} 隻：${species[i].name}`, `Butterfly ${i + 1}: ${species[i].en.name}`)));
    scenes.forEach((sc, i) => sc && sc.perch.setAttribute('aria-label', L(`讓${species[i].name}飛一圈`, `Let the ${species[i].en.name} fly a loop`)));
    playBtn.setAttribute('aria-label', auto ? L('暫停自動輪播', 'Pause autoplay') : L('開始自動輪播', 'Start autoplay'));
  };
  labelGarden();
  document.addEventListener('langchange', () => { if (shown >= 0) fillText(species[shown]); labelGarden(); });  const step = now => {
    const t = DUR ? Math.min(1, (now - t0) / DUR) : 1;
    pos = from + (target - from) * ease(t);
    render();
    if (t < 1) anim = requestAnimationFrame(step);
    else { anim = 0; schedule(); arrive(); }
  };
  const goTo = k => {
    land();                                            // 換下一隻前，正在飛的那隻直接停回去
    dir = k >= pos ? 1 : -1;
    target = k; from = pos; t0 = performance.now();
    showText(mod(k, N));
    clearTimeout(timer);
    if (!anim) anim = requestAnimationFrame(step);
  };
  const ENTRY = 1300;   // 介紹頁進場動畫的時間（加快：原本 2.6 秒）
  const playEntry = () => {
    const start = performance.now();
    const tick = now => {
      entry = Math.min(1, (now - start) / ENTRY);
      render();
      if (entry > .8 && text.classList.contains('wait')) { text.classList.remove('wait'); text.classList.add('t-in'); near.classList.add('on'); }
      if (entry < 1) requestAnimationFrame(tick);
      else { schedule(); arrive(); }
    };
    requestAnimationFrame(tick);
  };
  if (reduce) { text.classList.remove('wait'); near.classList.add('on'); }
  let entered = reduce;
  garden.addEventListener('pageenter', () => {
    inView = true;
    if (!entered) { entered = true; playEntry(); }
    schedule();
  });
  garden.addEventListener('pageleave', () => { inView = false; land(); schedule(); });
  $('#gPrev').addEventListener('click', () => goTo(target - 1));
  $('#gNext').addEventListener('click', () => goTo(target + 1));
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(target - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(target + 1); }
  });
  let wheelLock = 0;
  stage.addEventListener('wheel', e => {
    if (entry < 1 || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelLock = now + 700;
    goTo(target + (e.deltaX > 0 ? 1 : -1));
  }, { passive: false });
  // 不讓瀏覽器選取／原生拖曳圖片（會觸發 pointercancel，拖到一半就斷掉）
  garden.addEventListener('dragstart', e => e.preventDefault());
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { e.preventDefault(); stage.focus({ preventScroll: true }); }
    if (entry < 1) return;
    const perch = e.target.closest && e.target.closest('.g-perch');
    if (perch) {                                       // 點蝴蝶：目前這隻就飛一圈；旁邊的就先轉過去（到了也會飛）
      const i = scenes.findIndex(sc => sc && sc.perch === perch);
      if (i === mod(target, N)) startFlight(i); else goTo(target + wrap(i - target));
      return;
    }
    cancelAnimationFrame(anim); anim = 0;
    clearTimeout(timer);
    drag = { x: e.clientX, pos };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    pos = drag.pos - (e.clientX - drag.x) / (stage.clientWidth * .5);
    render();
    showText(mod(Math.round(pos), N));
  });
  const endDrag = () => { if (!drag) return; drag = null; goTo(Math.round(pos)); };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);
  addEventListener('resize', render);
  showText(0);
  render();

  /* ---------- 10. 頁尾：深色；游標帶著一團高飽和光暈，四周飄著光點，碰到游標範圍就彈開 ---------- */
  const footLinks = $$('.fcol.dotted a');
  makeDot($('.fcol.dotted'), footLinks, () => -2);
  {
    const cv = $('#footMotes'), ctx = cv.getContext('2d'), glow = $('#footGlow');
    const R = 130;                                    // 游標推開光點的範圍
    let W = 0, H = 0, motes = [], ptr = null, gx = 0, gy = 0, raf = 0, inView = false, lastT = 0;
    const draw = now => {
      const dt = Math.min(.05, (now - lastT) / 1000 || .016), t = now / 1000;
      lastT = now;
      const r = foot.getBoundingClientRect(), m0 = ptr && { x: ptr.x - r.left, y: ptr.y - r.top };
      ctx.clearRect(0, 0, W, H);
      motes.forEach(m => {
        if (!reduce) {
          // 碰到游標範圍就往外彈，之後慢慢減速、回到原本的飄動
          if (m0) {
            const dx = m.x - m0.x, dy = m.y - m0.y, d = Math.hypot(dx, dy);
            if (d < R && d > .01) { const f = (1 - d / R) * 1400 * dt; m.vx += dx / d * f; m.vy += dy / d * f; }
          }
          const damp = Math.pow(.05, dt);
          m.vx *= damp; m.vy *= damp;
          m.x += (m.vx + Math.sin(t * .6 + m.ph) * 9) * dt;      // 左右輕輕擺
          m.y += (m.vy - m.sp) * dt;                               // 慢慢往上飄
          if (m.y < -12) { m.y = H + 12; m.x = Math.random() * W; }
          else if (m.y > H + 12) m.y = -12;
          if (m.x < -12) m.x = W + 12; else if (m.x > W + 12) m.x = -12;
        }
        const al = m.a * (.6 + .4 * Math.sin(t * m.tw + m.ph)), c = m.warm ? '255,238,206' : '255,255,255';
        ctx.fillStyle = `rgba(${c},${(al * .16).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.4, 0, 6.2832); ctx.fill();
        ctx.fillStyle = `rgba(${c},${al.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
      });
      // 游標光暈：稍微拖在游標後面跟上
      if (m0) {
        const k = reduce ? 1 : Math.min(1, dt * 7);
        gx += (m0.x - gx) * k; gy += (m0.y - gy) * k;
        glow.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
      }
      if (inView && !reduce) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = foot.clientWidth; H = foot.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(170, W * H / 8000));
      motes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
        r: .6 + Math.random() * 1.7, a: .3 + Math.random() * .6, sp: 6 + Math.random() * 18,
        ph: Math.random() * 6.28, tw: .6 + Math.random() * 1.6, warm: Math.random() < .35
      }));
      draw(performance.now());
    };
    new ResizeObserver(resize).observe(foot);
    new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      cancelAnimationFrame(raf);
      if (inView && !reduce) { lastT = 0; raf = requestAnimationFrame(draw); }
    }).observe(foot);
    const move = e => {
      const first = !ptr;
      ptr = { x: e.clientX, y: e.clientY };
      if (first) { const r = foot.getBoundingClientRect(); gx = ptr.x - r.left; gy = ptr.y - r.top; }
      foot.classList.add('glow-on');
      if (reduce) draw(performance.now());
    };
    const leave = () => { ptr = null; foot.classList.remove('glow-on'); };
    foot.addEventListener('pointermove', move);
    foot.addEventListener('pointerdown', move);
    foot.addEventListener('pointerleave', leave);
    foot.addEventListener('pointercancel', leave);
    foot.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); });   // 觸控：手指離開就收起光暈
  }
  // 捲到頁尾（或知識區的黑底段落，由 fx.js 標記）：導覽列換成淺色字
  const drawFoot = () => nav.classList.toggle('on-dark', foot.getBoundingClientRect().top < 68 || document.documentElement.classList.contains('k-dark-top'));
  document.addEventListener('scrolltick', drawFoot);
  /* ---------- 鼠標：蝴蝶的一生（幼蟲 → 蛹 → 成蝶），依捲動到全頁哪裡切換 ---------- */
  if (finePointer) {
    const cur = $('#cursor');
    document.body.classList.add('has-cursor');
    // 幼蟲、蛹、成蝶都用手繪圖（assets/cur-*.png）；幼蟲與成蝶的原圖頭朝左上
    cur.innerHTML = `<span class="pt"></span><span class="ring"></span><div class="critter">` +
      `<div class="cdot">${'<b></b>'.repeat(6)}<i></i></div>` +
      // 幼蟲：圖沿著身體切成 6 條直片，移動時每片往身體的垂直方向錯開 → 身體扭動
      `<div class="cat"><span><div class="cato">${Array.from({ length: 6 }, (_, i) => `<i class="cat-sl" style="left:${i * 12}px;background-position:${-i * 12}px 0"></i>`).join('')}</div></span></div>` +
      // 蛹：頂端掛在游標上
      `<div class="pupa"><span><img src="assets/cur-pupa.png" alt=""></span></div>` +
      // 成蝶：同一張圖疊兩層，下層只留翅膀（繞身體軸線拍動）、上層只留身體（不動）
      `<div class="cbf"><span><div class="bfo"><img class="bw" src="assets/cur-bf.png" alt=""><img class="bb" src="assets/cur-bf.png" alt=""></div></span></div></div>`;
    const pt = cur.querySelector('.pt'), ringEl = cur.querySelector('.ring'), critter = cur.querySelector('.critter');
    const forms = [cur.querySelector('.cdot'), cur.querySelector('.cat'), cur.querySelector('.pupa'), cur.querySelector('.cbf')];
    const bfEl = forms[3].firstChild;
    const catImg = forms[1].querySelector('.cato'), catSl = [...forms[1].querySelectorAll('.cat-sl')], bfImg = forms[3].querySelector('.bfo');
    const dotGhosts = [...forms[0].querySelectorAll('b')], hist = [];
    let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, rot = 0, lastMove = 0, moving = false, seen = false;
    let catPh = 0, catAmp = 0, lastNow = 0;
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY; lastMove = performance.now();
      if (!seen) { seen = true; x = mx; y = my; }
      cur.classList.toggle('link', !!(e.target.closest && e.target.closest('a,button,[tabindex],.card')));
    });
    document.documentElement.addEventListener('pointerleave', () => { cur.style.opacity = 0; });
    document.documentElement.addEventListener('pointerenter', () => { cur.style.opacity = 1; });

    // 蛻變：跨過門檻時完整播放一次（時間驅動，不會停在半途），不用模糊
    const E = 'cubic-bezier(.5,0,.2,1)';
    // 0 圓點（首頁）→ 1 幼蟲 → 2 蛹 → 3 成蝶
    const OUT = {
      0: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 1, offset: .3 }, { transform: 'scale(.2)', opacity: 0 }],
      1: [{ transform: 'scale(1) rotate(0deg)', opacity: 1 }, { transform: 'scale(.8,.55) rotate(-80deg)', opacity: 1, offset: .55 }, { transform: 'scale(.3) rotate(-90deg)', opacity: 0 }],
      2: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.12,.9)', opacity: 1, offset: .35 }, { transform: 'scale(.5,.25) translateY(24px)', opacity: 0 }],
      3: [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 1, offset: .3 }, { transform: 'scale(.25) rotate(20deg)', opacity: 0 }]
    };
    const IN = {
      0: [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.3)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }],
      1: [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }],
      2: [{ transform: 'scale(.2,.1)', opacity: 0 }, { transform: 'scale(1.15,.9)', opacity: 1, offset: .55 }, { transform: 'scale(.95,1.05)', opacity: 1, offset: .8 }, { transform: 'scale(1)', opacity: 1 }],
      3: [{ transform: 'scale(.3,.15) rotate(-20deg)', opacity: 0 }, { transform: 'scale(.55,.95)', opacity: 1, offset: .4 }, { transform: 'scale(1.12)', opacity: 1, offset: .75 }, { transform: 'scale(1)', opacity: 1 }]
    };
    let stageN = -1, anims = [];
    const setStage = s => {
      if (s === stageN) return;
      const prev = stageN;
      stageN = s;
      anims.forEach(a => a.finish());                 // 上一段沒播完就直接跳到結尾，不卡在中間
      anims = [];
      if (prev < 0 || reduce) { forms.forEach((f, i) => f.animate([{ opacity: i === s ? 1 : 0 }], { duration: 1, fill: 'forwards' })); return; }
      anims.push(forms[prev].animate(OUT[prev], { duration: 650, easing: E, fill: 'forwards' }));
      anims.push(forms[s].animate(IN[s], { duration: 900, delay: 380, easing: E, fill: 'forwards' }));
    };
    // 首頁是圓點；漣漪轉到摘要後，依捲到剩下頁面的哪裡進化：幼蟲 → 蛹 → 成蝶
    const morph = () => {
      if (ripP < .5) setStage(0);
      else {
        const start = TZ * .5, end = document.documentElement.scrollHeight - innerHeight;
        const p = clamp01((scrollY - start) / Math.max(1, end - start));
        setStage(p < .3 ? 1 : p < .6 ? 2 : 3);
      }
      cur.classList.toggle('dotmode', stageN === 0);
    };
    document.addEventListener('scrolltick', morph);

    const loop = now => {
      const dx = mx - x, dy = my - y;
      const k = stageN === 0 ? .1 : .2;                // 首頁／開場的圓點：跟得更慢一點 → 明顯的延遲感
      x += dx * k; y += dy * k;
      const v = Math.hypot(dx, dy);
      const isMoving = now - lastMove < 140 && v > .6;
      if (isMoving !== moving) {
        moving = isMoving;
        cur.classList.toggle('moving', moving);
        cur.classList.toggle('rest', !moving);
        bfEl.classList.toggle('flap', moving);        // 動 → 振翅；停 → 合翅
      }
      if (v > 1.5) {
        const head = Math.atan2(dy, dx) * 180 / Math.PI;
        const diff = ((head - rot + 540) % 360) - 180;
        rot += diff * .15;
      }
      hist.unshift([x, y]);
      if (hist.length > 40) hist.length = 40;
      if (false) {                                    // 圓點的位移複製殘影：依需求取消
        dotGhosts.forEach((g, i) => {
          const [hx, hy] = hist[Math.min(hist.length - 1, (i + 1) * 4)], ox = hx - x, oy = hy - y, d = Math.hypot(ox, oy);
          g.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) scale(${(.86 - i * .13).toFixed(2)})`;   // 由大到小漸變
          g.style.opacity = d < 2 ? 0 : ((.55 - i * .08) * Math.min(1, d / 30)).toFixed(3);
        });
      }
      pt.style.translate = ringEl.style.translate = `${mx}px ${my}px`;
      critter.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (stageN === 1 || stageN === 3) {             // 側面圖：往右走就左右翻轉，上下只微微傾斜，不會翻成肚子朝上
        const right = Math.cos(rot * Math.PI / 180) >= 0;
        const tilt = Math.max(-30, Math.min(30, (((right ? rot : rot - 180) % 360) + 540) % 360 - 180));
        const base = stageN === 1 ? 208 : 212;        // 原圖頭部方向（度）
        (stageN === 1 ? catImg : bfImg).style.transform = right ? `rotate(${(tilt + base - 180).toFixed(1)}deg) scaleX(-1)` : `rotate(${(180 + tilt - base).toFixed(1)}deg)`;
      }
      // 幼蟲扭身體：移動時一道波從尾巴傳到頭，停下來慢慢回直
      const dtc = Math.min(.05, (now - lastNow) / 1000 || .016);
      lastNow = now;
      if (stageN === 1 && !reduce) {
        catAmp += ((moving ? 1 : 0) - catAmp) * Math.min(1, dtc * 6);
        catPh += dtc * (4 + Math.min(v, 40) * .25);
        catSl.forEach((s, i) => {
          const off = catAmp * 1.6 * Math.sin(catPh - (5 - i) * .9);   // i = 0 是頭（圖的左邊）
          s.style.transform = `translate(${(off * .469).toFixed(2)}px, ${(off * -.883).toFixed(2)}px)`;   // 垂直於身體（約 28°）
        });
      }
      requestAnimationFrame(loop);
    };
    cur.classList.add('rest');
    requestAnimationFrame(loop);
  }

  /* ---------- 捲軸：右側一隻毛毛蟲，捲動或拖曳時慢慢追上目標位置，身體一節一節蜷曲蠕動 ---------- */
  {
    const bar = document.createElement('div');
    bar.className = 'cbar';
    bar.setAttribute('aria-hidden', 'true');
    // 手繪毛毛蟲（assets/cur-cat-bar.png）：尾巴在上、頭在下（往下爬）；往上捲時整隻翻過來
    // 圖切成一條條橫片，每片左右錯開一點，波從尾巴傳到頭，看起來就是身體在扭
    const TH = 64, SL = 6, SH = TH / SL;
    const slices = Array.from({ length: SL }, (_, i) =>
      `<i class="cbar-sl" style="top:${(i * SH).toFixed(2)}px;height:${(SH + .8).toFixed(2)}px;background-position:0 ${(-i * SH).toFixed(2)}px"></i>`).join('');
    bar.innerHTML = `<div class="cbar-track"></div><div class="cbar-thumb"><span class="cbar-flip">${slices}</span></div>`;
    document.body.appendChild(bar);
    const thumb = bar.querySelector('.cbar-thumb'), slEls = [...bar.querySelectorAll('.cbar-sl')];
    const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const room = () => bar.clientHeight - TH;
    // 軌道：一片片小葉子；毛毛蟲爬過（在牠上方）的葉子被吃掉，只剩黑黑的小便便
    const track = bar.querySelector('.cbar-track'), LEAF = 13;
    let leaves = [];
    const makeLeaves = () => {
      const n = Math.max(4, Math.floor(bar.clientHeight / LEAF));
      track.innerHTML = Array.from({ length: n }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const rot = side * (32 + ((i * 37) % 22));
        const hue = ['#6E9B4F', '#85AE5E', '#5E8C4A', '#9BBE6B'][(i * 7) % 4];
        return `<i class="cbar-lf" style="top:${(i * LEAF + LEAF / 2).toFixed(1)}px;--r:${rot}deg;--sx:${side};--c:${hue};--pd:${(i * 53) % 360}deg"></i>`;
      }).join('');
      leaves = [...track.children].map(el => ({ el, y: parseFloat(el.style.top), eaten: false }));
    };
    makeLeaves();
    addEventListener('resize', makeLeaves);
    const eat = cut => leaves.forEach(l => {
      const e = l.y < cut;
      if (e !== l.eaten) { l.eaten = e; l.el.classList.toggle('eaten', e); }
    });
    let shownY = 0, phase = 0, dirUp = false, crawl = 0, drag = null, cbRaf = 0, lastT = 0;
    const draw = now => {
      const dt = Math.min(.05, (now - lastT) / 1000 || .016); lastT = now;
      const target = clamp01(scrollY / maxScroll()) * room();
      const diff = target - shownY;
      // 慢慢爬：每秒只追上一部分距離，拖曳時跟手一點
      const step = diff * (1 - Math.pow(drag ? .0005 : .12, dt));
      shownY += step;
      if (Math.abs(step) > .05) { const up = step < 0; if (up !== dirUp) { dirUp = up; thumb.classList.toggle('up', up); } }
      crawl += (Math.min(1, Math.abs(diff) / 30) - crawl) * Math.min(1, dt * 6);   // 移動中的蠕動幅度
      phase += (Math.abs(step) * .22 + dt * (.8 + crawl * 6));
      thumb.style.transform = `translate(0, ${shownY.toFixed(1)}px)`;
      eat(shownY + TH * .5);
      // 扭身體：S 形的波從尾巴（上）傳到頭（下），爬得越快扭得越大；停著時也輕輕扭
      const amp = .3 + crawl * .7;
      slEls.forEach((s, i) => {
        const k = i / (SL - 1);
        const off = amp * 1.4 * Math.sin(phase * 1.8 - k * 3.2) * (.55 + .45 * Math.sin(k * Math.PI));   // 身體中段扭得最大
        s.style.transform = `translateX(${off.toFixed(2)}px)`;
      });
      cbRaf = requestAnimationFrame(draw);
    };
    if (!reduce) cbRaf = requestAnimationFrame(draw);
    else { const place = () => { shownY = clamp01(scrollY / maxScroll()) * room(); thumb.style.transform = `translate(0, ${shownY}px)`; eat(shownY + TH * .5); }; addEventListener('scroll', place, { passive: true }); place(); draw(0); cancelAnimationFrame(cbRaf); }
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(cbRaf);
      if (!document.hidden && !reduce) { lastT = 0; cbRaf = requestAnimationFrame(draw); }
    });
    // 拖曳毛毛蟲：換算成頁面捲動位置
    const scrollToBar = y => scrollTo({ top: clamp01(y / room()) * maxScroll(), behavior: 'instant' });
    thumb.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault(); e.stopPropagation();
      drag = { y: e.clientY, from: clamp01(scrollY / maxScroll()) * room() };
      thumb.classList.add('drag');
      thumb.setPointerCapture(e.pointerId);
    });
    thumb.addEventListener('pointermove', e => { if (drag) scrollToBar(drag.from + e.clientY - drag.y); });
    const stop = () => { drag = null; thumb.classList.remove('drag'); };
    thumb.addEventListener('pointerup', stop);
    thumb.addEventListener('lostpointercapture', stop);
    // 點軌道：平滑捲到該處（毛毛蟲會慢慢爬過去）
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('.cbar-thumb')) return;
      const r = bar.getBoundingClientRect();
      scrollTo({ top: clamp01((e.clientY - r.top - TH / 2) / room()) * maxScroll(), behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  hero.dispatchEvent(new Event('pagevisible'));
  layout();
  update();
  if (document.fonts) document.fonts.ready.then(() => { layout(); update(); });
  addEventListener('load', () => { layout(); update(); });
})();
