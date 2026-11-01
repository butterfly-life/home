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
  const mouse = { x: -999, y: -999 };                 // 視窗座標，粒子、照片聚光燈共用
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  /* ---------- 物種資料（依「蝴蝶百科資料」） ---------- */
  const species = [
    { id: 'idea', name: '大白斑蝶', latin: 'Idea leuconoe clara', fam: '蛺蝶科 · 斑蝶亞科', alias: '黑點大白斑蝶、大胡麻斑蝶、大帛斑蝶',
      color: ['白', '黑'], mark: '斑點、線條', tail: false, wing: '58–71', alt: '0–1000', host: '爬森藤', food: '花蜜', author: 'Butler, 1867', glow: '#FFF6DE' },
    { id: 'euploea', name: '小紫斑蝶', latin: 'Euploea tulliolus koxinga', fam: '蛺蝶科 · 斑蝶亞科', alias: '妒麗紫斑蝶、埔里紫斑蝶',
      color: ['黑褐', '紫'], mark: '斑點', tail: false, wing: '36–41', alt: '0–1000', host: '盤龍木', food: '花蜜', author: 'Fruhstorfer, 1908', glow: '#EEDDF7' },
    { id: 'tirumala', name: '淡紋青斑蝶', latin: 'Tirumala limniace limniace', fam: '蛺蝶科 · 斑蝶亞科', alias: '淡色小紋青斑蝶、叉斑蝶',
      color: ['黑褐', '白'], mark: '斑點、線條', tail: false, wing: '35–51', alt: '0–1000', host: '華他卡藤、夜香花', food: '花蜜', author: '(Cramer), 1775', glow: '#DDF0F7' },
    { id: 'hypolimnas', name: '幻蛺蝶', latin: 'Hypolimnas bolina kezia', fam: '蛺蝶科 · 蛺蝶亞科', alias: '琉球紫蛺蝶、幻紫斑蛺蝶、幻紫蝶',
      color: ['黑褐', '白'], mark: '斑點、線條', tail: false, wing: '33–53', alt: '0–2000', host: '甘藷、甕菜、海牽牛、金午時花、賽葵、金腰箭、紫莖牛膝', food: '花蜜、腐果、樹液、動物排遺', author: 'Butler, 1878', glow: '#E2E0FA' },
    { id: 'kallima', name: '枯葉蝶', latin: 'Kallima inachus formosana', fam: '蛺蝶科 · 蛺蝶亞科', alias: '枯葉蛺蝶、木葉蝶',
      color: ['褐', '橙'], mark: '斑點、線條', tail: true, wing: '44–52', alt: '0–2000', host: '臺灣馬藍、腺萼馬藍、曲莖馬藍', food: '花蜜、腐果、樹液', author: 'Fruhstorfer, 1912', glow: '#FBE6D2' },
    { id: 'hebomoia', name: '橙端粉蝶', latin: 'Hebomoia glaucippe formosana', fam: '粉蝶科 · 粉蝶亞科', alias: '鶴頂粉蝶、端紅蝶、紅衽粉蝶、紅角大粉蝶',
      color: ['白', '橙'], mark: '斑點', tail: false, wing: '47–51', alt: '0–2000', host: '小刺山柑、多花山柑、毛瓣蝴蝶木、魚木', food: '花蜜', author: 'Fruhstorfer, 1908', glow: '#FCE7D4' },
    { id: 'demoleus', name: '花鳳蝶', latin: 'Papilio demoleus', fam: '鳳蝶科 · 鳳蝶亞科', alias: '無尾鳳蝶、達摩鳳蝶、黃斑鳳蝶',
      color: ['花', '花'], mark: '斑點', tail: false, wing: '42–46', alt: '0–1000', host: '柑橘、來母、柚、佛手柑、過山香、烏柑仔、金柑、石苓舅', food: '花蜜', author: 'Linnaeus, 1758', glow: '#F7F0D2' },
    { id: 'polytes', name: '玉帶鳳蝶', latin: 'Papilio polytes polytes', fam: '鳳蝶科 · 鳳蝶亞科', alias: '白帶鳳蝶、縞鳳蝶、白帶蝶',
      color: ['黑', '白'], mark: '斑點、線條', tail: true, wing: '39–54', alt: '0–2000', host: '柑橘、黎檬、柚、甜橙、飛龍掌血、食茱萸、烏柑仔、過山香', food: '花蜜', author: 'Linnaeus, 1758', glow: '#F1EFE8' }
  ];
  const KINDS = species.map(s => s.id);               // 網站上出現的蝴蝶只用這八種

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

  /* ---------- 0. 開場：待機、載入進度條，載完出現 START ---------- */
  const intro = $('#intro'), nav = $('#nav'), startBtn = $('#start');
  const loadBar = $('#loadBar'), loadPct = $('#loadPct'), perch = $('#perch');
  perch.innerHTML = bfHTML('idea');
  perch.firstChild.classList.add('bask');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  document.body.classList.add('locked');               // 按 START 前不能捲動
  const F_ASSETS = ['f04', 'f05', 'f14', 'f15', 'f16', 'f20', 'f22', 'f25', 'f26', 'f27', 'f31', 'f32'];
  const PRELOAD = ['assets/logo.png', ...KINDS.map(k => `assets/${k}-700.webp`), ...F_ASSETS.map(f => `assets/${f}.webp`)];
  let loaded = 0, shownLoad = 0;
  const total = PRELOAD.length + 1;
  const bump = () => { loaded++; };
  PRELOAD.forEach(src => { const im = new Image(); im.onload = im.onerror = bump; im.src = src; });
  (document.fonts ? document.fonts.load(`900 100px "Noto Serif TC"`, '一生') : Promise.resolve()).then(bump, bump);
  setTimeout(() => { loaded = total; }, 12000);        // 網路太慢時不要一直卡住
  const loadTick = () => {
    shownLoad = Math.min(loaded / total, shownLoad + .012);   // 進度條平順前進
    const p = (shownLoad * 100).toFixed(0) + '%';
    loadBar.style.width = perch.style.left = p;
    loadPct.textContent = p;
    if (shownLoad >= 1) { startBtn.disabled = false; startBtn.classList.add('ready'); return; }
    requestAnimationFrame(loadTick);
  };
  requestAnimationFrame(loadTick);
  startBtn.addEventListener('click', () => {
    intro.classList.add('out');
    nav.classList.add('visible');
    document.body.classList.add('started');
    document.body.classList.remove('locked');
    document.dispatchEvent(new Event('introdone'));
    setTimeout(() => intro.remove(), 1100);
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
    burger.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
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
  $$('[data-split]').forEach(el => {
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.innerHTML = [...txt].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  });
  $$('[data-tx]').forEach(el => {
    if (el.dataset.tx === 'type') { el.dataset.full = el.textContent; el.setAttribute('aria-label', el.textContent); if (!reduce) el.textContent = ' '; }
    if (el.dataset.tx === 'mask') el.innerHTML = `<span class="mk">${el.innerHTML}</span>`;
  });
  const story = $('#story');
  const txIO = new IntersectionObserver(es => es.forEach(e => {
    if (story.contains(e.target)) return;              // 摘要的文字跟著漣漪播放
    if (e.isIntersecting) txOn(e.target);
    else if (e.boundingClientRect.top > 0 || e.boundingClientRect.bottom < 0) txOff(e.target);
  }), { threshold: .2 });
  if (reduce) $$(TX).forEach(el => el.classList.add('in'));
  else $$(TX).forEach(el => txIO.observe(el));

  /* ---------- 一頁式捲動：首頁 → 摘要是漣漪轉場（摘要固定在畫面上、從游標處以圓形擴散出來），之後一般捲動 ---------- */
  const pages = $$('[data-sec]'), NP = pages.length, garden = $('#garden'), foot = $('#foot'), gallery = $('#gallery');
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
  const ripple = () => {
    const p = reduce ? (scrollY > 2 ? 1 : 0) : clamp01(scrollY / TZ);
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
    const r = gallery.getBoundingClientRect();         // 照片：捲過時的進度 → 單雙欄錯位
    if (r.bottom > 0 && r.top < innerHeight) gallery.dispatchEvent(new CustomEvent('pagehold', { detail: clamp01((innerHeight - r.top) / (innerHeight + r.height)) }));
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
  const STEMS = ['f04', 'f05', 'f14', 'f16', 'f20', 'f22', 'f25', 'f31', 'f32'];
  const BLOOMS = ['f26', 'f15', 'f27'];
  const pops = [];
  // 素材：anchor = 'base'（從根部長）或 'mid'（以中心綻放）
  const plant = (parent, src, x, y, rot, size, delay, mid) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
    g.innerHTML = `<g class="pop"><g class="sway" style="--sw:${between(4, 8).toFixed(1)}s;--swd:${(-between(0, 6)).toFixed(1)}s">` +
      `<image href="assets/${src}.webp" x="${-size / 2}" y="${mid ? -size / 2 : -size}" width="${size}" height="${size}" preserveAspectRatio="${mid ? 'xMidYMid' : 'xMidYMax'} meet"/></g></g>`;
    parent.appendChild(g);
    pops.push({ el: g.firstChild, delay });
  };

  // LOGO（assets/logo.png）墨線邊緣的取樣點，事先算好（SVG 座標 ÷8；y 從 136 起算）
  // 本機開檔時瀏覽器不允許讀取圖片像素，所以不在執行時取樣
  const LOGO_EDGE = [88,1,89,1,90,1,84,2,85,2,86,2,87,2,89,2,4,3,5,3,6,3,7,3,8,3,82,3,83,3,89,3,3,4,9,4,81,4,88,4,2,5,10,5,70,5,71,5,72,5,80,5,88,5,2,6,11,6,69,6,79,6,87,6,1,7,12,7,79,7,87,7,1,8,12,8,68,8,78,8,87,8,1,9,13,9,48,9,68,9,78,9,87,9,1,10,13,10,48,10,77,10,86,10,1,11,14,11,49,11,77,11,83,11,86,11,169,11,170,11,171,11,172,11,173,11,183,11,184,11,185,11,186,11,187,11,1,12,14,12,49,12,76,12,82,12,84,12,85,12,169,12,173,12,183,12,187,12,0,13,15,13,49,13,50,13,76,13,83,13,168,13,173,13,183,13,187,13,0,14,15,14,30,14,31,14,49,14,50,14,68,14,75,14,84,14,85,14,168,14,173,14,183,14,187,14,1,15,11,15,12,15,16,15,29,15,32,15,49,15,50,15,68,15,75,15,86,15,107,15,108,15,109,15,110,15,111,15,168,15,172,15,183,15,187,15,1,16,10,16,13,16,16,16,29,16,32,16,42,16,43,16,44,16,45,16,46,16,47,16,50,16,51,16,69,16,74,16,87,16,106,16,111,16,150,16,151,16,152,16,153,16,154,16,155,16,156,16,157,16,168,16,172,16,182,16,187,16,1,17,10,17,14,17,16,17,28,17,32,17,42,17,46,17,50,17,51,17,69,17,70,17,73,17,88,17,89,17,106,17,111,17,146,17,147,17,148,17,149,17,156,17,167,17,172,17,182,17,187,17,1,18,9,18,15,18,17,18,28,18,32,18,42,18,46,18,50,18,51,18,70,18,71,18,72,18,89,18,105,18,111,18,141,18,142,18,143,18,144,18,145,18,155,18,156,18,167,18,172,18,182,18,186,18,1,19,9,19,15,19,17,19,28,19,32,19,42,19,46,19,50,19,52,19,72,19,73,19,74,19,81,19,82,19,83,19,90,19,104,19,110,19,137,19,138,19,139,19,140,19,151,19,152,19,153,19,154,19,167,19,171,19,182,19,186,19,2,20,9,20,16,20,17,20,28,20,32,20,42,20,46,20,50,20,52,20,54,20,75,20,80,20,84,20,91,20,103,20,109,20,118,20,119,20,133,20,134,20,135,20,136,20,147,20,148,20,149,20,150,20,166,20,171,20,182,20,186,20,2,21,9,21,16,21,18,21,28,21,32,21,42,21,46,21,50,21,52,21,54,21,75,21,79,21,85,21,91,21,103,21,109,21,116,21,117,21,120,21,130,21,131,21,132,21,142,21,143,21,144,21,145,21,146,21,166,21,171,21,182,21,186,21,3,22,8,22,17,22,18,22,28,22,32,22,41,22,46,22,49,22,52,22,55,22,75,22,79,22,85,22,91,22,102,22,108,22,115,22,121,22,130,22,138,22,139,22,140,22,141,22,166,22,170,22,182,22,186,22,3,23,8,23,17,23,18,23,27,23,32,23,41,23,46,23,49,23,52,23,55,23,74,23,79,23,86,23,92,23,101,23,107,23,115,23,122,23,130,23,135,23,136,23,137,23,166,23,170,23,181,23,186,23,4,24,5,24,6,24,7,24,18,24,19,24,27,24,31,24,41,24,45,24,49,24,53,24,55,24,56,24,74,24,78,24,86,24,92,24,100,24,106,24,115,24,122,24,130,24,131,24,132,24,133,24,134,24,165,24,170,24,181,24,185,24,18,25,19,25,27,25,31,25,41,25,45,25,49,25,53,25,55,25,56,25,74,25,78,25,87,25,92,25,100,25,106,25,114,25,122,25,165,25,170,25,181,25,185,25,18,26,19,26,27,26,31,26,41,26,45,26,49,26,53,26,55,26,56,26,74,26,78,26,87,26,92,26,99,26,105,26,114,26,123,26,165,26,169,26,181,26,185,26,19,27,27,27,31,27,41,27,45,27,49,27,53,27,55,27,57,27,74,27,78,27,87,27,92,27,98,27,104,27,114,27,123,27,165,27,169,27,181,27,185,27,19,28,27,28,31,28,41,28,45,28,49,28,53,28,55,28,57,28,74,28,78,28,87,28,92,28,97,28,103,28,114,28,123,28,164,28,169,28,181,28,185,28,19,29,20,29,27,29,31,29,38,29,39,29,40,29,46,29,47,29,48,29,54,29,58,29,59,29,60,29,61,29,62,29,63,29,74,29,78,29,87,29,92,29,97,29,103,29,113,29,123,29,164,29,169,29,180,29,185,29,20,30,26,30,31,30,37,30,63,30,73,30,79,30,80,30,81,30,82,30,83,30,84,30,85,30,86,30,91,30,96,30,102,30,113,30,123,30,164,30,168,30,180,30,184,30,20,31,21,31,22,31,23,31,24,31,25,31,30,31,37,31,38,31,39,31,45,31,46,31,47,31,54,31,59,31,60,31,61,31,62,31,63,31,73,31,91,31,95,31,101,31,113,31,123,31,129,31,130,31,131,31,132,31,133,31,138,31,139,31,140,31,141,31,142,31,163,31,168,31,180,31,184,31,20,32,30,32,40,32,44,32,48,32,53,32,55,32,58,32,73,32,91,32,94,32,100,32,113,32,123,32,129,32,134,32,138,32,143,32,163,32,168,32,180,32,184,32,19,33,31,33,40,33,44,33,48,33,53,33,55,33,58,33,73,33,91,33,94,33,100,33,113,33,123,33,129,33,134,33,138,33,143,33,163,33,167,33,180,33,184,33,19,34,24,34,32,34,40,34,44,34,48,34,53,34,55,34,58,34,73,34,77,34,78,34,79,34,80,34,81,34,82,34,83,34,84,34,90,34,93,34,99,34,114,34,123,34,129,34,134,34,138,34,143,34,163,34,168,34,180,34,184,34,19,35,23,35,25,35,33,35,40,35,44,35,48,35,53,35,55,35,58,35,73,35,76,35,85,35,90,35,92,35,98,35,114,35,123,35,129,35,134,35,138,35,143,35,162,35,169,35,170,35,171,35,172,35,173,35,174,35,175,35,176,35,177,35,178,35,179,35,185,35,186,35,187,35,188,35,189,35,190,35,191,35,192,35,193,35,194,35,195,35,196,35,197,35,198,35,199,35,19,36,23,36,25,36,34,36,39,36,44,36,48,36,53,36,55,36,58,36,72,36,76,36,84,36,89,36,91,36,97,36,114,36,123,36,129,36,134,36,138,36,143,36,162,36,199,36,19,37,23,37,25,37,34,37,39,37,43,37,48,37,53,37,55,37,58,37,72,37,76,37,83,37,89,37,90,37,97,37,114,37,122,37,129,37,134,37,138,37,143,37,162,37,167,37,168,37,169,37,170,37,171,37,172,37,173,37,174,37,175,37,176,37,177,37,178,37,184,37,185,37,186,37,187,37,188,37,189,37,190,37,191,37,192,37,193,37,194,37,195,37,196,37,197,37,198,37,199,37,19,38,23,38,25,38,34,38,39,38,43,38,47,38,53,38,55,38,58,38,72,38,75,38,83,38,88,38,90,38,96,38,115,38,122,38,130,38,135,38,138,38,143,38,161,38,166,38,179,38,183,38,19,39,23,39,25,39,35,39,39,39,43,39,47,39,53,39,55,39,58,39,72,39,75,39,82,39,87,39,90,39,95,39,115,39,122,39,130,39,135,39,138,39,143,39,161,39,166,39,179,39,183,39,18,40,23,40,25,40,35,40,39,40,43,40,47,40,53,40,55,40,58,40,72,40,75,40,81,40,87,40,90,40,91,40,92,40,93,40,94,40,116,40,121,40,130,40,135,40,139,40,144,40,161,40,165,40,179,40,183,40,18,41,22,41,25,41,35,41,39,41,43,41,48,41,53,41,55,41,58,41,72,41,75,41,80,41,86,41,116,41,117,41,119,41,120,41,130,41,135,41,139,41,144,41,161,41,165,41,179,41,183,41,18,42,22,42,24,42,35,42,38,42,43,42,48,42,53,42,55,42,58,42,71,42,75,42,79,42,85,42,104,42,105,42,106,42,107,42,108,42,118,42,130,42,135,42,139,42,144,42,160,42,165,42,178,42,183,42,18,43,22,43,24,43,29,43,35,43,38,43,42,43,48,43,54,43,58,43,71,43,75,43,78,43,83,43,84,43,103,43,108,43,130,43,135,43,139,43,144,43,160,43,165,43,178,43,182,43,18,44,22,44,24,44,28,44,30,44,35,44,38,44,42,44,48,44,57,44,71,44,75,44,77,44,82,44,103,44,108,44,130,44,135,44,139,44,144,44,160,44,164,44,178,44,182,44,18,45,22,45,24,45,28,45,30,45,35,45,38,45,42,45,48,45,57,45,71,45,76,45,81,45,102,45,108,45,130,45,136,45,139,45,144,45,159,45,164,45,178,45,182,45,17,46,22,46,24,46,28,46,30,46,35,46,38,46,42,46,48,46,57,46,71,46,72,46,73,46,74,46,75,46,81,46,101,46,107,46,131,46,136,46,139,46,144,46,159,46,164,46,178,46,182,46,17,47,22,47,24,47,28,47,30,47,35,47,38,47,42,47,49,47,57,47,76,47,81,47,100,47,106,47,131,47,136,47,140,47,141,47,142,47,143,47,144,47,159,47,163,47,178,47,182,47,17,48,18,48,19,48,20,48,21,48,22,48,24,48,25,48,26,48,27,48,28,48,30,48,31,48,32,48,33,48,34,48,35,48,38,48,39,48,40,48,41,48,42,48,49,48,50,48,51,48,52,48,53,48,54,48,55,48,56,48,57,48,76,48,77,48,78,48,79,48,80,48,81,48,99,48,100,48,101,48,102,48,103,48,104,48,105,48,131,48,132,48,133,48,134,48,135,48,136,48,159,48,160,48,161,48,162,48,163,48,178,48,179,48,180,48,181,48,182,48];
  const sampleGlyph = () => {
    const edge = [];
    for (let i = 0; i < LOGO_EDGE.length; i += 2) edge.push([LOGO_EDGE[i] * 8, LOGO_EDGE[i + 1] * 8 + 136]);
    return edge;
  };
  const spread = (pts, k) => {
    const out = [pick(pts)];
    while (out.length < k) {
      let best = null, bd = -1;
      for (const p of pts) {
        const d = Math.min(...out.map(q => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2));
        if (d > bd) { bd = d; best = p; }
      }
      out.push(best);
    }
    return out;
  };

  const flowerSpots = [];                             // 蝴蝶從這些花飛出來，也會停在這裡（SVG 座標）
  const buildLogo = () => {
    const edge = sampleGlyph();
    if (!edge.length) return;
    const back = $('#logoBack'), front = $('#logoFront');
    const cx = 800, cy = 330;
    // 字的邊緣長出 16 叢：2–3 株往外伸的植物＋一朵花
    spread(edge, 16).forEach(([px, py], i) => {
      const base = .3 + i * .24;
      const out = Math.atan2((py - cy) * 2.4, px - cx) * 180 / Math.PI + 90;
      for (let k = 0, n = 2 + (hRand() < .5); k < n; k++)
        plant(k ? front : back, pick(STEMS), px + between(-20, 20), py + between(-20, 20), out + between(-45, 45), between(140, 240), base + k * .25);
      const s = pick(BLOOMS);
      plant(front, s, px, py, between(-30, 30), s === 'f26' ? between(100, 150) : between(80, 120), base + .8, true);
      flowerSpots.push([px, py]);
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
    const k = pick(KINDS);
    const el = document.createElement('div');
    el.className = 'fly flap';
    el.style.setProperty('--flap', between(.14, .22).toFixed(2) + 's');
    el.innerHTML = `<div class="fsh">${bfHTML(k)}</div><div class="fbd">${bfHTML(k)}</div>`;
    fliesBox.appendChild(el);
    const [x, y] = from;
    const f = { el, sh: el.firstChild, bd: el.lastChild, x, y, vx: between(-30, 30), vy: between(-90, -40), rot: 0, ang: between(0, 6.28),
      orbit: between(40, 120), spd: between(.7, 1.3), size: between(.8, 1.3), phase: between(0, 6.28), tx: x, ty: y, next: 0,
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
      if (chasing) {                                  // 被滑鼠吸引：繞著游標飛
        takeOff(f, now);
        f.ang += dt * (1.6 + f.spd);
        tx = heroMouse.x + Math.cos(f.ang) * f.orbit;
        ty = heroMouse.y + Math.sin(f.ang) * f.orbit * .7;
        maxV = 320;
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
      const k = Math.min(1, dt * (chasing ? 3.2 : 1.8));
      f.vx += (dx / dist * sp - f.vx) * k;
      f.vy += (dy / dist * sp - f.vy) * k;
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

  const paintGlobe = () => {
    const S = 2048, c = $('#gTex'), g = c.getContext('2d'), r = rng(77);
    c.width = c.height = S;
    const sea = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    sea.addColorStop(0, '#9CC3CC'); sea.addColorStop(.7, '#7FAEBB'); sea.addColorStop(1, '#5E8FA2');
    g.fillStyle = sea; g.fillRect(0, 0, S, S);
    const blot = (x, y, rad, col, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(.8, col.replace('A', a * .85)); gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
    };
    for (let i = 0; i < 160; i++) blot(r() * S, r() * S, 40 + r() * 140, 'rgba(170,205,212,A)', .2);
    const lands = ['rgba(122,158,96,A)', 'rgba(150,178,110,A)', 'rgba(96,134,82,A)', 'rgba(206,190,136,A)', 'rgba(176,160,110,A)'];
    for (let k = 0; k < 22; k++) {
      const a = k / 22 * 6.283 + r() * .2, d = (.62 + r() * .34) * S / 2, cx = S / 2 + Math.cos(a) * d, cy = S / 2 + Math.sin(a) * d;
      const n = 40 + r() * 40, spreadR = 60 + r() * 140;
      for (let i = 0; i < n; i++) {
        const t = r() * 6.283, q = Math.pow(r(), .7) * spreadR;
        blot(cx + Math.cos(t) * q * 1.4, cy + Math.sin(t) * q, 14 + r() * 44, lands[Math.floor(r() * lands.length)], .75);
      }
    }
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '30,40,30'},${(r() * .12).toFixed(3)})`;
      g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
    }
    const cc = $('#gCloud'), cg = cc.getContext('2d');
    cc.width = cc.height = 512;
    for (let k = 0; k < 14; k++) {
      const a = r() * 6.283, d = (.55 + r() * .42) * 256, x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d;
      for (let i = 0; i < 9; i++) {
        const gx = x + (r() - .5) * 60, gy = y + (r() - .5) * 24, rad = 10 + r() * 22;
        const gr = cg.createRadialGradient(gx, gy, 0, gx, gy, rad);
        gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        cg.fillStyle = gr; cg.beginPath(); cg.arc(gx, gy, rad, 0, 6.283); cg.fill();
      }
    }
  };
  paintGlobe();

  const stage = $('#gStage'), ring = $('#gRing'), text = $('#gText'), dotsBox = $('#gDots');
  const globe = $('#gGlobe'), tex = $('#gTex'), cloud = $('#gCloud'), spot = $('#gSpot'), far = $('#gFar'), near = $('#gNear');
  const groups = species.map((s, i) => {
    const el = document.createElement('div');
    el.className = 'g-group';
    el.innerHTML = `<div class="g-shadow"></div><img src="assets/${s.id}-700.webp" alt="" draggable="false" style="--delay:${(-i * .7).toFixed(1)}s">`;
    return ring.appendChild(el);
  });
  const DECO = ['f04', 'f31', 'f14', 'f16', 'f05', 'f20', 'f22', 'f25'];
  const decos = DECO.flatMap((src, i) => [i + .5, i + .28].map((at, j) => {
    const el = document.createElement('div');
    el.className = 'g-deco';
    el.innerHTML = `<img src="assets/${j ? DECO[(i + 3) % DECO.length] : src}.webp" alt="" draggable="false">`;
    ring.appendChild(el);
    return { el, at, k: j ? .55 : .8 };
  }));
  const FAR = [['f15', 6, 8, 22], ['f22', 70, 4, 18], ['f26', 84, 30, 14], ['f25', 30, 2, 12]].map(([s, x, y, w]) => {
    const img = document.createElement('img');
    img.src = `assets/${s}.webp`; img.alt = '';
    img.style.cssText = `left:${x}%;top:${y}%;width:${w}vw`;
    return far.appendChild(img);
  });
  const NEAR = [['f32', -9, 21, 1], ['f04', 88, 17, -1]].map(([s, x, w, dir]) => {
    const img = document.createElement('img');
    img.src = `assets/${s}.webp`; img.alt = '';
    img.style.cssText = `left:${x}%;width:${w}vw;transform-origin:50% 100%`;
    img.dataset.dir = dir;
    return near.appendChild(img);
  });
  const dotBtns = species.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `第 ${i + 1} 隻：${s.name}`);
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
    cloud.style.transform = `rotate(${turn * .6 + entry * 20}deg)`;
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
    $('#gName').textContent = s.name;
    $('#gLatin').textContent = s.latin;
    $('#gFam').textContent = s.fam;
    $('#gDesc').textContent = `別名${s.alias}。主色為${s.color[0]}、次色為${s.color[1]}，斑紋呈${s.mark}${s.tail ? '，後翅有尾突' : ''}。全年皆可見到成蝶。`;
    $('#gMeta').innerHTML = [['翅長', `約 ${s.wing} 公厘`], ['海拔', `約 ${s.alt} 公尺`], ['寄主植物', s.host], ['成蝶食物', s.food], ['命名', s.author]]
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
    if (auto && inView && entry >= 1 && !drag) timer = setTimeout(() => goTo(target + 1), HOLD);
  };
  const setAuto = on => {
    auto = on;
    playBtn.setAttribute('aria-pressed', on);
    playBtn.setAttribute('aria-label', on ? '暫停自動輪播' : '開始自動輪播');
    schedule();
  };
  playBtn.addEventListener('click', () => setAuto(!auto));
  const step = now => {
    const t = DUR ? Math.min(1, (now - t0) / DUR) : 1;
    pos = from + (target - from) * ease(t);
    render();
    if (t < 1) anim = requestAnimationFrame(step);
    else { anim = 0; schedule(); }
  };
  const goTo = k => {
    dir = k >= pos ? 1 : -1;
    target = k; from = pos; t0 = performance.now();
    showText(mod(k, N));
    clearTimeout(timer);
    if (!anim) anim = requestAnimationFrame(step);
  };
  const ENTRY = 2600;
  const playEntry = () => {
    const start = performance.now();
    const tick = now => {
      entry = Math.min(1, (now - start) / ENTRY);
      render();
      if (entry > .8 && text.classList.contains('wait')) { text.classList.remove('wait'); text.classList.add('t-in'); near.classList.add('on'); }
      if (entry < 1) requestAnimationFrame(tick);
      else schedule();
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
  garden.addEventListener('pageleave', () => { inView = false; schedule(); });
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
  stage.addEventListener('pointerdown', e => {
    if (entry < 1) return;
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
  addEventListener('resize', render);
  showText(0);
  render();

  /* ---------- 7. 照片：自動播放、拖曳、頭尾相接無限循環；捲動時單雙欄錯位 ---------- */
  const PHOTOS = [
    ['idea-700', '大白斑蝶', '#D9D4E8'], ['f26', '花', '#E6CFC9'], ['tirumala-700', '淡紋青斑蝶', '#D3DDE3'],
    ['f25', '銀杏', '#EADBC0'], ['euploea-700', '小紫斑蝶', '#DCCFD9'], ['f04', '蕨', '#D3DCCB'],
    ['hypolimnas-700', '幻蛺蝶', '#CFD3E6'], ['f27', '漿果', '#E4D1D0'], ['kallima-700', '枯葉蝶', '#DCD6CB'],
    ['f15', '荷葉', '#D2E0D9'], ['hebomoia-700', '橙端粉蝶', '#EDD9C6'], ['f32', '龜背芋', '#D0D9C6'],
    ['demoleus-700', '花鳳蝶', '#E6DDEA'], ['f22', '葉脈', '#E0DEDA'], ['polytes-700', '玉帶鳳蝶', '#E4DED0'],
    ['f31', '蒲公英', '#DEDBD4'], ['f14', '毛茛', '#ECE3C6'], ['f05', '藍果', '#D4DBE4']
  ];
  const galView = $('#galView'), galTrack = $('#galTrack'), galBar = $('#galBar');
  const COLS = 6;
  let hoverCard = null;
  // 同一個色相，只提高飽和度、稍微提亮（聚光燈用）
  const saturate = hex => {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return `hsl(${(h * 60 + 360) % 360} ${Math.min(100, s * 100 + 32).toFixed(0)}% ${Math.min(92, l * 100 + 3).toFixed(0)}%)`;
  };
  const makeCol = (c, clone) => {
    const col = document.createElement('div');
    col.className = 'gal-col';
    if (clone) col.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < 3; k++) {
      const n = c * 3 + k, [src, name, bg] = PHOTOS[n % PHOTOS.length];
      const fig = document.createElement('figure');
      fig.className = 'card';
      fig.style.setProperty('--bg', bg);
      fig.style.setProperty('--bgS', saturate(bg));
      fig.innerHTML = `<span class="tag">蝶影浮生</span><img src="assets/${src}.webp" alt="${clone ? '' : name}" loading="lazy" draggable="false">` +
        `<span class="lit"><img src="assets/${src}.webp" alt="" loading="lazy" draggable="false"></span><figcaption><b>${name}</b><span>NO.${pad(n + 1)}</span></figcaption>`;
      fig.addEventListener('pointerenter', () => { hoverCard = fig; });
      fig.addEventListener('pointerleave', () => { if (hoverCard === fig) hoverCard = null; });
      col.appendChild(fig);
    }
    return galTrack.appendChild(col);
  };
  // 一組 6 欄＋複製一組接在後面，捲到第二組開頭時無縫跳回第一組
  const cols = [...Array.from({ length: COLS }, (_, c) => makeCol(c, false)), ...Array.from({ length: COLS }, (_, c) => makeCol(c, true))];
  let gx = 0, gVel = 0, setW = 1, galOn = false, gLast = 0, gDrag = null;
  let gyT = 0, gyS = 0, gEnt0 = 0, rangeA = 0, rangeB = 0;
  const AUTO = reduce ? 0 : 38;                       // 自動播放速度（px/秒）
  const measureGal = () => {
    setW = cols[COLS].offsetLeft - cols[0].offsetLeft || 1;
    const H = galView.clientHeight, ch = cols[0].offsetHeight;
    rangeA = Math.max(0, cols[0].offsetTop + ch - H + 40);
    rangeB = Math.max(0, cols[1].offsetTop + ch - H + 40);
  };
  // 上下錯位：依捲過照片區的進度
  gallery.addEventListener('pagehold', e => { gyT = e.detail; });
  const galLoop = now => {
    const dt = Math.min(.05, (now - gLast) / 1000 || .016);
    gLast = now;
    if (!gDrag) {
      const want = hoverCard ? AUTO * .15 : AUTO;     // 停在照片上時放慢，方便看聚光燈
      gVel = lerp(gVel, want, Math.min(1, dt * 2.5));
      gx += gVel * dt;
    }
    gx = mod(gx, setW);
    gyS = lerp(gyS, gyT, Math.min(1, dt * 3));
    const ent = reduce ? 1 : ease(clamp01((now - gEnt0) / 1500));   // 進場：單數欄從下、雙數欄從上滑進來
    cols.forEach((col, i) => {
      const y = (.5 - gyS) * (i % 2 ? 340 : 80) + (1 - ent) * (i % 2 ? -320 : 320);   // 第 1、3、5 欄同速；第 2、4、6 欄快一些
      col.style.transform = `translateY(${y.toFixed(1)}px)`;
    });
    galTrack.style.transform = `translateX(${(-gx).toFixed(2)}px)`;
    galBar.style.transform = `scaleX(${(gx / setW).toFixed(4)})`;
    if (hoverCard) {                                  // 照片在動時，聚光燈仍對準游標
      const r = hoverCard.getBoundingClientRect();
      hoverCard.style.setProperty('--mx', (mouse.x - r.left) + 'px');
      hoverCard.style.setProperty('--my', (mouse.y - r.top) + 'px');
    }
    if (galOn) requestAnimationFrame(galLoop);
  };
  gallery.addEventListener('pagevisible', () => {
    measureGal();
    if (!galOn) { galOn = true; gLast = performance.now(); requestAnimationFrame(galLoop); }
  });
  gallery.addEventListener('pageenter', () => { gEnt0 = performance.now(); });
  gallery.addEventListener('pagehidden', () => { galOn = false; });
  addEventListener('resize', measureGal);
  galView.addEventListener('pointerdown', e => {
    if (e.button) return;
    gDrag = { x: e.clientX, gx, lx: e.clientX, lt: performance.now(), moved: false, id: e.pointerId };
  });
  addEventListener('pointermove', e => {
    if (!gDrag || e.pointerId !== gDrag.id) return;
    const dx = e.clientX - gDrag.x;
    if (!gDrag.moved && Math.abs(dx) > 6) { gDrag.moved = true; galView.classList.add('dragging'); try { galView.setPointerCapture(e.pointerId); } catch (_) {} }
    if (!gDrag.moved) return;
    gx = gDrag.gx - dx;
    const now = performance.now();
    gVel = -(e.clientX - gDrag.lx) / Math.max(1, now - gDrag.lt) * 1000;
    gDrag.lx = e.clientX; gDrag.lt = now;
  });
  const endGal = () => { if (!gDrag) return; gDrag = null; galView.classList.remove('dragging'); };
  addEventListener('pointerup', endGal);
  addEventListener('pointercancel', endGal);
  galView.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;    // 上下捲動交給整頁
    e.preventDefault();
    gx += e.deltaX;
  }, { passive: false });
  galView.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); gVel = 900; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); gVel = -900; }
  });
  measureGal();

  /* ---------- 10. 頁尾：底色轉深；漫畫線條的書，植物與蝴蝶從書頁中間長出來 ---------- */
  const footLinks = $$('.fcol.dotted a');
  makeDot($('.fcol.dotted'), footLinks, () => -2);
  const cbook = $('#cbook');
  const bRand = rng(5150);
  const bb = (a, b) => a + bRand() * (b - a);
  // 漫畫風的蝴蝶：墨線＋平塗，配色對照八種蝴蝶
  const COMIC = {
    idea: ['#FFFFFF', '<circle cx="-18" cy="-12" r="2.6" fill="#1C1A17"/><circle cx="-26" cy="-17" r="2" fill="#1C1A17"/><circle cx="-12" cy="12" r="2.4" fill="#1C1A17"/>'],
    euploea: ['#4A3352', '<circle cx="-24" cy="-16" r="1.6" fill="#fff"/><circle cx="-28" cy="-10" r="1.3" fill="#fff"/><ellipse cx="-16" cy="-10" rx="7" ry="4" fill="#7E6CE0" opacity=".8"/>'],
    tirumala: ['#3A322B', '<path d="M-6 -6L-20 -16M-8 -2L-26 -8M-6 8L-16 14" stroke="#CFE8F0" stroke-width="3.4" stroke-linecap="round"/>'],
    hypolimnas: ['#2A2420', '<ellipse cx="-20" cy="-12" rx="5" ry="3.4" fill="#fff" stroke="#9E8CFF" stroke-width="2"/><ellipse cx="-13" cy="12" rx="4.4" ry="3.4" fill="#fff" stroke="#9E8CFF" stroke-width="2"/>'],
    kallima: ['#7A5232', '<path d="M-8 -8C-14 -16 -22 -20 -28 -18L-25 -10C-18 -11 -13 -7 -11 -3Z" fill="#F08A2E"/>'],
    hebomoia: ['#FFFDF8', '<path d="M-20 -24C-26 -20 -30 -12 -28 -4L-34 -8L-34 -24Z" fill="#F08A2E"/>'],
    demoleus: ['#2B2622', '<circle cx="-14" cy="-10" r="2.2" fill="#F2D36B"/><circle cx="-22" cy="-16" r="2" fill="#F2D36B"/><circle cx="-26" cy="-8" r="1.8" fill="#F2D36B"/><circle cx="-12" cy="12" r="2.4" fill="#F2D36B"/>'],
    polytes: ['#26221F', '<ellipse cx="-8" cy="8" rx="2.4" ry="3.4" fill="#F4EEDC"/><ellipse cx="-14" cy="10" rx="2.4" ry="3.4" fill="#F4EEDC"/><ellipse cx="-20" cy="13" rx="2.2" ry="3.2" fill="#F4EEDC"/>']
  };
  const cWing = (k, cls) => {
    const [fill, marks] = COMIC[k];
    return `<g class="${cls}"><path d="M0 1C-10 2 -24 8 -24 16C-22 24 -10 22 0 6Z" fill="${fill}" class="ink"/>` +
      `<path d="M0 -2C-6 -16 -22 -26 -32 -22C-36 -14 -30 -4 -20 1C-12 3 -5 2 0 1Z" fill="${fill}" class="ink"/>${marks}</g>`;
  };
  const buildBook = () => {
    const P = 'class="ink sheet"';
    let s = `<defs><pattern id="hdots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#1C1A17"/></pattern>` +
      `<clipPath id="cbL"><path d="M0 -30C-90 -58 -230 -60 -340 -40L-352 112C-240 92 -110 96 0 124Z"/></clipPath>` +
      `<clipPath id="cbR"><path d="M0 -30C90 -58 230 -60 340 -40L352 112C240 92 110 96 0 124Z"/></clipPath></defs>` +
      `<ellipse cx="14" cy="150" rx="370" ry="16" fill="rgba(0,0,0,.35)"/>` +
      // 書頁厚度
      `<path class="ink sheet draw" d="M-352 112L-357 126C-244 106 -112 110 0 138C112 110 244 106 357 126L352 112"/>` +
      `<path class="ink thin draw" d="M-355 119C-242 99 -111 103 0 131C111 103 242 99 355 119"/>` +
      // 左右頁
      `<path ${P} d="M0 -30C-90 -58 -230 -60 -340 -40L-352 112C-240 92 -110 96 0 124Z"/>` +
      `<path ${P} d="M0 -30C90 -58 230 -60 340 -40L352 112C240 92 110 96 0 124Z"/>` +
      // 書溝的網點陰影
      `<path d="M0 -30C-24 -38 -44 -40 -58 -40L-60 104C-38 106 -18 112 0 124Z" fill="url(#hdots)" opacity=".5" clip-path="url(#cbL)"/>` +
      `<path d="M0 -30C24 -38 44 -40 58 -40L60 104C38 106 18 112 0 124Z" fill="url(#hdots)" opacity=".35" clip-path="url(#cbR)"/>` +
      `<path class="ink draw" d="M0 -30L0 124"/>`;
    // 書頁上的文字：像漫畫裡潦草的字行
    for (let side = -1; side <= 1; side += 2)
      for (let r = 0; r < 7; r++) {
        const y = -18 + r * 16, x0 = side * 80, x1 = side * bb(240, 300);
        s += `<path class="ink thin draw" opacity=".45" d="M${x0} ${y + 6 - Math.abs(x0) * .02}Q${(x0 + x1) / 2} ${y - 4} ${x1} ${y + 2 - Math.abs(x1) * .02}"/>`;
      }
    // 爆發線：植物冒出來那一下
    s += `<g id="cbBurst" opacity="0">` + Array.from({ length: 18 }, (_, i) => {
      const a = -Math.PI + i / 17 * Math.PI, r0 = 70, r1 = bb(110, 150);
      return `<path class="ink thin" d="M${(Math.cos(a) * r0).toFixed(1)} ${(-30 + Math.sin(a) * r0 * .8).toFixed(1)}L${(Math.cos(a) * r1).toFixed(1)} ${(-30 + Math.sin(a) * r1 * .8).toFixed(1)}"/>`;
    }).join('') + `</g>`;
    // 從書溝長出來的枝條、葉子、花
    const LEAF_C = ['#8DB27A', '#6E9A5B', '#B9C98A', '#A3C08A'], FLOWER_C = ['#F2B8B8', '#F6D27A', '#BFD7EA', '#E8A0C8', '#F4A46A'];
    s += `<g id="cbPlants">`;
    for (let i = 0; i < 7; i++) {
      const a = (-160 + i * (140 / 6) + bb(-6, 6)) * Math.PI / 180, L = bb(190, 320) * (1 - Math.abs(Math.cos(a)) * .25);
      const x0 = bb(-10, 10), y0 = -24, ex = x0 + Math.cos(a) * L, ey = y0 + Math.sin(a) * L * .95;
      const c1x = x0 + Math.cos(a) * L * .1, c1y = y0 - L * .45, c2x = ex - Math.cos(a) * L * .4 + bb(-40, 40), c2y = ey + L * .2;
      const at = t => { const u = 1 - t; return [u ** 3 * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * ex, u ** 3 * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * ey]; };
      s += `<path class="ink stemc" data-i="${i}" stroke-width="3" d="M${x0} ${y0}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;
      [.3, .52, .74].forEach((t, k) => {
        const [lx, ly] = at(t), [nx, ny] = at(t + .02), dir = Math.atan2(ny - ly, nx - lx) * 180 / Math.PI;
        const rot = dir + 90 + (k % 2 ? 55 : -55), sz = bb(.8, 1.25);
        s += `<g transform="translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sz.toFixed(2)})"><g class="grow" data-i="${i}" data-t="${t}" style="transform-origin:50% 100%">` +
          `<path class="ink" d="M0 0C12 -10 12 -30 0 -42C-12 -30 -12 -10 0 0Z" fill="${LEAF_C[(i + k) % 4]}"/><path class="ink thin" d="M0 -2L0 -36"/></g></g>`;
      });
      const fc = FLOWER_C[i % FLOWER_C.length];
      s += `<g transform="translate(${ex.toFixed(1)} ${ey.toFixed(1)})"><g class="grow" data-i="${i}" data-t="1" style="transform-origin:50% 50%">` +
        [0, 72, 144, 216, 288].map(r => `<ellipse class="ink" cy="-11" rx="7.5" ry="11" fill="${fc}" transform="rotate(${r})"/>`).join('') +
        `<circle class="ink" r="5.5" fill="#F2C94C"/></g></g>`;
    }
    s += `</g>`;
    // 八種蝴蝶
    s += KINDS.map((k, i) => `<g class="cfly" data-i="${i}"><g class="cfi" style="transform-box:fill-box;transform-origin:50% 50%">${cWing(k, 'wl')}<g transform="scale(-1 1)">${cWing(k, 'wr')}</g>` +
      `<ellipse class="ink" cy="4" rx="2.6" ry="11" fill="#1C1A17"/><path class="ink thin" d="M-1 -6L-6 -16M1 -6L6 -16"/></g></g>`).join('');
    cbook.innerHTML = s;
  };
  buildBook();
  // 還沒播放前，要描出來的線先藏起來
  const hideLines = () => $$('#cbook .draw, #cbook .stemc').forEach(el => {
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len} ${len}`;
    el.style.strokeDashoffset = len;
  });
  hideLines();
  let bookPlayed = false;
  const resetBook = () => {
    bookPlayed = false;
    cbook.getAnimations({ subtree: true }).forEach(a => a.cancel());
    $$('#cbook .cfly').forEach(el => el.classList.remove('fl'));
    hideLines();
  };
  const playBook = () => {
    bookPlayed = true;
    if (reduce) {
      $$('#cbook .draw, #cbook .stemc').forEach(el => { el.style.strokeDashoffset = 0; });
      $$('#cbook .grow').forEach(el => { el.style.transform = 'none'; });
      $$('#cbook .cfly').forEach((el, i) => { el.style.opacity = 1; el.style.transform = `translate(${-280 + i * 80}px, ${-250 + (i % 2) * 40}px)`; });
      return;
    }
    const opt = (delay, duration, easing = 'cubic-bezier(.3,.7,.2,1)') => ({ delay, duration, easing, fill: 'both' });
    const dash = (el, delay, duration) => {
      const len = el.getTotalLength();
      el.style.strokeDasharray = `${len} ${len}`;
      el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], opt(delay, duration, 'ease-out'));
    };
    // 1) 書的線條先描出來
    $$('#cbook .draw').forEach((el, i) => dash(el, i * 40, 700));
    // 2) 爆發線一閃
    $('#cbBurst').animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)', offset: .3 }, { opacity: 0, transform: 'scale(1.15)' }], opt(700, 700, 'ease-out'));
    // 3) 枝條從書溝伸出，經過的地方長葉子、末端開花
    const STEM_T = 900, STEM_D = 1500;
    $$('#cbook .stemc').forEach(el => dash(el, STEM_T + +el.dataset.i * 110, STEM_D));
    $$('#cbook .grow').forEach(el => {
      const d = STEM_T + +el.dataset.i * 110 + STEM_D * +el.dataset.t * .9;
      el.animate([{ transform: 'scale(0) rotate(-20deg)' }, { transform: 'scale(1.12) rotate(4deg)', offset: .7 }, { transform: 'scale(1) rotate(0deg)' }], opt(d, 700));
    });
    // 4) 蝴蝶從書頁中間飛出來，散開後停在空中振翅
    const flies = $$('#cbook .cfly');
    flies.forEach((el, i) => {
      const ang = (-165 + i * (150 / (flies.length - 1))) * Math.PI / 180, rad = bb(230, 360);
      const tx = Math.cos(ang) * rad, ty = -40 + Math.sin(ang) * rad * .85;
      const c = [tx * .15, -320];
      const frames = Array.from({ length: 13 }, (_, n) => {
        const t = n / 12, u = 1 - t;
        const x = 2 * u * t * c[0] + t * t * tx, y = u * u * -20 + 2 * u * t * c[1] + t * t * ty;
        const t2 = Math.min(1, t + .04), u2 = 1 - t2;
        const x2 = 2 * u2 * t2 * c[0] + t2 * t2 * tx, y2 = u2 * u2 * -20 + 2 * u2 * t2 * c[1] + t2 * t2 * ty;
        const rot = n === 12 ? (i % 2 ? 14 : -14) : Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 90;
        return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${(.2 + t * .9).toFixed(2)})`, opacity: Math.min(1, t * 5) };
      });
      const start = 2300 + i * 160;
      setTimeout(() => { if (bookPlayed) el.classList.add('fl'); }, start);
      el.animate(frames, opt(start, 1900, 'cubic-bezier(.4,0,.2,1)')).finished.then(() => {
        if (!bookPlayed) return;
        el.firstChild.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }], { duration: 1400 + i * 90, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      }).catch(() => {});
    });
  };
  const INK = [36, 33, 29], LIGHT = [234, 228, 216];
  // 捲到頁尾：底色由網站底色轉成深色；捲進來播放故事書，捲走後重置（下次再播）
  const drawFoot = () => {
    const vh = innerHeight, r = foot.getBoundingClientRect();
    if (r.top > vh) { if (bookPlayed) resetBook(); return; }
    const q = clamp01((vh - r.top) / vh), dk = clamp01((q - .05) / .45);
    foot.style.setProperty('--dk', dk.toFixed(3));
    foot.style.setProperty('--fc', `rgb(${INK.map((v, i) => Math.round(lerp(v, LIGHT[i], dk))).join(',')})`);
    foot.classList.toggle('dark', dk > .5);
    nav.classList.toggle('on-dark', r.top < 68 && dk > .5);
    if (q > .55 && !bookPlayed) playBook();
    else if (q < .12 && bookPlayed) resetBook();
  };
  document.addEventListener('scrolltick', drawFoot);
  /* ---------- 鼠標：大白斑蝶的一生（幼蟲 → 金色的蛹 → 成蝶），依捲動到全頁哪裡切換 ---------- */
  if (finePointer) {
    const cur = $('#cursor');
    document.body.classList.add('has-cursor');
    // 幼蟲（俯視）：黑色體節＋白色環紋、側面紅點，四對黑色長肉棘；頭朝右（+x）
    const segs = Array.from({ length: 10 }, (_, i) => {
      const x = -30 + i * 6.4, fil = [0, 3, 6, 8].includes(i);
      return `<g class="seg" style="--k:${9 - i}">` +
        (fil ? `<path d="M${x} -5Q${x - 3} -12 ${x - 1} -18M${x} 5Q${x - 3} 12 ${x - 1} 18" stroke="#121110" stroke-width="1.5" fill="none" stroke-linecap="round"/>` : '') +
        `<ellipse cx="${x}" cy="0" rx="4.3" ry="6.6" fill="url(#catBody)"/>` +
        `<rect x="${x - .8}" y="-6.2" width="1.6" height="12.4" rx=".8" fill="#F1EDE0" opacity=".9"/>` +
        `<circle cx="${x + 1.8}" cy="-5" r="1.1" fill="#D8432B"/><circle cx="${x + 1.8}" cy="5" r="1.1" fill="#D8432B"/>` +
        `<circle cx="${x - 2}" cy="-3.4" r=".6" fill="#F5D24A"/><circle cx="${x - 2}" cy="3.4" r=".6" fill="#F5D24A"/></g>`;
    }).join('');
    cur.innerHTML = `<span class="pt"></span><span class="ring"></span><div class="critter">` +
      `<div class="cdot">${'<b></b>'.repeat(6)}<i></i></div>` +
      `<div class="cat"><svg viewBox="-40 -20 80 40"><defs><radialGradient id="catBody" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#6A6660"/><stop offset=".45" stop-color="#22201D"/><stop offset="1" stop-color="#050505"/></radialGradient>` +
      `<radialGradient id="catHead" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#8A6B4A"/><stop offset=".5" stop-color="#2B1E14"/><stop offset="1" stop-color="#0B0705"/></radialGradient></defs>${segs}` +
      `<g class="seg" style="--k:0"><path d="M36 -3Q41 -9 40 -14M36 3Q41 9 40 14" stroke="#121110" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="35" cy="0" r="5" fill="url(#catHead)"/><ellipse cx="33.5" cy="-1.6" rx="1.4" ry=".9" fill="rgba(255,255,255,.55)"/></g></svg></div>` +
      // 蛹：金色、像珠寶一樣有光澤，尾端掛在游標上
      `<div class="pupa"><svg viewBox="-17 -6 34 58"><defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#6E4E10"/><stop offset=".3" stop-color="#D9AE3C"/><stop offset=".46" stop-color="#FFF4BF"/><stop offset=".6" stop-color="#E7C255"/><stop offset="1" stop-color="#7A5A14"/></linearGradient>` +
      `<radialGradient id="goldHi" cx=".3" cy=".3" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
      `<path d="M0 -6V3" stroke="#2A2116" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M0 3C8 4 12 12 12.5 22C13 34 7 46 0 50C-7 46 -13 34 -12.5 22C-12 12 -8 4 0 3Z" fill="url(#gold)" stroke="#5A400C" stroke-width=".6"/>` +
      `<path d="M-12 20Q0 25 12 20" stroke="#5A400C" stroke-width="1" fill="none"/><path d="M-6 22C-8 32 -6 40 -2 46M6 22C8 32 6 40 2 46" stroke="rgba(90,64,12,.5)" stroke-width=".7" fill="none"/>` +
      [[-8, 21.5], [-4, 22.6], [0, 23], [4, 22.6], [8, 21.5], [-5, 10], [5, 10], [-3, 38], [3, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#1A1410"/>`).join('') +
      `<ellipse cx="-4.5" cy="16" rx="3.4" ry="9" fill="url(#goldHi)"/></svg></div>` +
      `<div class="cbf">${bfHTML('idea')}</div></div>`;
    const pt = cur.querySelector('.pt'), ringEl = cur.querySelector('.ring'), critter = cur.querySelector('.critter');
    const forms = [cur.querySelector('.cdot'), cur.querySelector('.cat'), cur.querySelector('.pupa'), cur.querySelector('.cbf')];
    const bfEl = forms[3].firstChild;
    const dotGhosts = [...forms[0].querySelectorAll('b')], hist = [];
    let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, rot = 0, lastMove = 0, moving = false, seen = false;
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
      x += dx * .2; y += dy * .2;
      const v = Math.hypot(dx, dy);
      const isMoving = now - lastMove < 140 && v > .6;
      if (isMoving !== moving) {
        moving = isMoving;
        cur.classList.toggle('moving', moving);
        cur.classList.toggle('rest', !moving);
        bfEl.classList.toggle('flap', moving);        // 動 → 振翅；停 → 合翅
      }
      if (v > 1.5) {
        const head = Math.atan2(dy, dx) * 180 / Math.PI + (stageN === 3 ? 90 : 0);
        const diff = ((head - rot + 540) % 360) - 180;
        rot += diff * .15;
      }
      hist.unshift([x, y]);
      if (hist.length > 40) hist.length = 40;
      if (stageN === 0) {                             // 圓點：殘影是一圈圈的圓形線條，沿走過的路徑位移複製
        dotGhosts.forEach((g, i) => {
          const [hx, hy] = hist[Math.min(hist.length - 1, (i + 1) * 4)], ox = hx - x, oy = hy - y, d = Math.hypot(ox, oy);
          g.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) scale(${(1 + i * .14).toFixed(2)})`;
          g.style.opacity = d < 2 ? 0 : ((.55 - i * .08) * Math.min(1, d / 30)).toFixed(3);
        });
      }
      pt.style.translate = ringEl.style.translate = `${mx}px ${my}px`;
      critter.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${stageN === 1 || stageN === 3 ? rot.toFixed(1) : 0}deg)`;
      requestAnimationFrame(loop);
    };
    cur.classList.add('rest');
    requestAnimationFrame(loop);
  }

  hero.dispatchEvent(new Event('pagevisible'));
  layout();
  update();
  if (document.fonts) document.fonts.ready.then(() => { layout(); update(); });
  addEventListener('load', () => { layout(); update(); });
})();
