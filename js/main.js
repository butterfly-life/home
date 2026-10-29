(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ---------- 0. 開場：淡入 → 淡出後才能捲動 ---------- */
  const intro = $('#intro');
  const nav = $('#nav');
  document.body.classList.add('locked');
  scrollTo(0, 0);
  const endIntro = () => {
    intro.classList.add('out');
    nav.classList.add('visible');
    document.body.classList.remove('locked');
    document.dispatchEvent(new Event('introdone'));
    setTimeout(() => intro.remove(), 1000);
  };
  addEventListener('load', () => {
    if (reduce) return endIntro();
    requestAnimationFrame(() => intro.classList.add('show'));
    setTimeout(endIntro, 2500);
  });

  /* ---------- 選單 ---------- */
  const navTone = () => {
    nav.classList.toggle('scrolled', scrollY > 40);
    nav.classList.toggle('on-light', scrollY < $('#hero').offsetHeight - 64);   // 首頁是淺底
  };
  addEventListener('scroll', navTone, { passive: true });
  navTone();

  const links = $$('.menu a');
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-sec]').forEach(s => secIO.observe(s));

  const burger = $('#burger');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  links.forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- 進場 ＋ 逐字打出 ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const typeLines = async lines => {
    const texts = lines.map(p => p.textContent);
    lines.forEach(p => (p.textContent = ' '));
    for (let i = 0; i < lines.length; i++) {
      const p = lines[i];
      p.classList.add('typing');
      for (let c = 1; c <= texts[i].length; c++) {
        p.textContent = texts[i].slice(0, c);
        await sleep(45);
      }
      p.classList.remove('typing');
      await sleep(300);
    }
  };
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    revealIO.unobserve(e.target);
  }), { threshold: .15 });
  $$('.rv').forEach(el => revealIO.observe(el));

  // 每個 section 內的 [data-type] 依序打出
  const typeIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    typeIO.unobserve(e.target);
    if (!reduce) typeLines([...e.target.querySelectorAll('[data-type]')]);
  }), { threshold: .3 });
  $$('[data-sec]').forEach(s => { if (s.querySelector('[data-type]')) typeIO.observe(s); });

  /* ---------- 1. 首頁：LOGO 長出植物 → 蝴蝶飛出，會被滑鼠吸引 ---------- */
  const hero = $('#hero'), logo = $('#logo'), fliesBox = $('#flies');
  const hRand = (seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(20240611);
  const between = (a, b) => a + hRand() * (b - a);
  const pick = arr => arr[Math.floor(hRand() * arr.length)];

  const FLOWER_COLORS = ['#2F5BD3', '#E8547A', '#F28C38', '#F6C94A', '#9B5DE5', '#F4A3B5', '#E23B3B', '#F3E3C6', '#5DB7DE', '#C04DD9', '#FF7A59'];
  const LEAF_COLORS = ['#3E7A3A', '#5C9A45', '#2F5E33', '#7FAF5A', '#4F8A6B'];
  const shade = (hex, k) => {                         // k < 0 變暗，k > 0 變亮
    const n = parseInt(hex.slice(1), 16), f = c => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };

  // 各種花：都以 (0,0) 為中心
  const FLOWERS = {
    five: (r, c) => [0, 1, 2, 3, 4].map(i => `<ellipse cy="${-r * .55}" rx="${r * .42}" ry="${r * .58}" fill="${c}" transform="rotate(${i * 72})"/>`).join('') +
      `<circle r="${r * .22}" fill="#F6D365"/><circle r="${r * .1}" fill="${shade(c, -.5)}"/>`,
    daisy: (r, c) => Array.from({ length: 14 }, (_, i) => `<ellipse cy="${-r * .6}" rx="${r * .14}" ry="${r * .42}" fill="${c}" transform="rotate(${i * 360 / 14})"/>`).join('') +
      `<circle r="${r * .28}" fill="#F2B632"/>`,
    rose: (r, c) => [1, .8, .6, .42, .24].map((k, i) => `<circle r="${r * k}" fill="${shade(c, i % 2 ? -.12 : .08)}" stroke="${shade(c, -.3)}" stroke-width="${r * .03}"/>`).join('') +
      `<path d="M${-r * .3} 0Q0 ${-r * .35} ${r * .3} 0" fill="none" stroke="${shade(c, -.35)}" stroke-width="${r * .04}"/>`,
    hydra: (r, c) => Array.from({ length: 13 }, (_, i) => {
      const a = i * 2.4, d = r * .62 * Math.sqrt(i / 13), x = Math.cos(a) * d, y = Math.sin(a) * d, s = r * .26;
      return `<g transform="translate(${x} ${y}) rotate(${i * 37})">${[0, 1, 2, 3].map(j => `<ellipse cy="${-s * .5}" rx="${s * .38}" ry="${s * .5}" fill="${shade(c, (i % 3 - 1) * .12)}" transform="rotate(${j * 90})"/>`).join('')}<circle r="${s * .14}" fill="#FFF3C4"/></g>`;
    }).join(''),
    orchid: (r, c) => [0, 120, 240].map(a => `<ellipse cy="${-r * .55}" rx="${r * .3}" ry="${r * .55}" fill="${c}" transform="rotate(${a})"/>`).join('') +
      [60, 300].map(a => `<ellipse cy="${-r * .5}" rx="${r * .36}" ry="${r * .46}" fill="${shade(c, .2)}" transform="rotate(${a})"/>`).join('') +
      `<ellipse cy="${r * .28}" rx="${r * .24}" ry="${r * .3}" fill="${shade(c, -.35)}"/><circle r="${r * .1}" fill="#FFE27A"/>`,
    bud: (r, c) => `<ellipse rx="${r * .5}" ry="${r * .8}" fill="${c}"/><path d="M${-r * .5} ${r * .2}Q0 ${r * 1.1} ${r * .5} ${r * .2}" fill="#4F8A4A"/>`
  };
  const LEAF = (l, w, c) => `<path d="M0 0C${w / 2} ${-l * .3} ${w / 2} ${-l * .75} 0 ${-l}C${-w / 2} ${-l * .75} ${-w / 2} ${-l * .3} 0 0Z" fill="${c}"/>` +
    `<path d="M0 0L0 ${-l * .9}" stroke="${shade(c, -.35)}" stroke-width="${Math.max(1, w * .05)}" fill="none"/>`;
  const place = (x, y, rot, delay, body) =>
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})"><g class="pop" style="--delay:${delay.toFixed(2)}s">${body}</g></g>`;
  const twig = (x0, y0, x1, y1, bend, width, delay, dur) => {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, len = Math.hypot(x1 - x0, y1 - y0);
    const cx = mx - (y1 - y0) / len * bend, cy = my + (x1 - x0) / len * bend;
    const at = t => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1];
    const svg = `<path class="twig" pathLength="1" d="M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}" stroke-width="${width}" style="--delay:${delay.toFixed(2)}s;--dur:${dur.toFixed(2)}s"/>`;
    return { svg, at };
  };

  // 把「蝶」畫到 canvas 上取樣，找出字的邊緣點，植物就從邊緣長出來
  const sampleGlyph = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 1000;
    const g = c.getContext('2d');
    g.font = `900 860px ${getComputedStyle($('#logoText')).fontFamily}`;
    g.textAlign = 'center';
    g.fillText('蝶', 500, 830);
    const d = g.getImageData(0, 0, 1000, 1000).data;
    const ink = (x, y) => x >= 0 && y >= 0 && x < 1000 && y < 1000 && d[(y * 1000 + x) * 4 + 3] > 128;
    const edge = [], fill = [];
    for (let y = 0; y < 1000; y += 8)
      for (let x = 0; x < 1000; x += 8) {
        if (!ink(x, y)) continue;
        fill.push([x, y]);
        if (!ink(x + 12, y) || !ink(x - 12, y) || !ink(x, y + 12) || !ink(x, y - 12)) edge.push([x, y]);
      }
    return { edge, fill };
  };
  // 在邊緣點中挑出彼此距離最遠的 k 個，讓花叢平均分布
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

  const flowerSpots = [];                             // 蝴蝶從這些花飛出來（SVG 座標）
  const buildLogo = () => {
    const { edge, fill } = sampleGlyph();
    if (!edge.length) return;
    const cx = 500, cy = 480;
    let back = '', front = '';
    const flower = (x, y, r, delay) => {
      const kind = pick(['five', 'five', 'daisy', 'rose', 'rose', 'hydra', 'orchid']);
      front += place(x, y, between(0, 360), delay, FLOWERS[kind](r, pick(FLOWER_COLORS)));
      flowerSpots.push([x, y]);
    };
    const leafAt = (x, y, ang, delay, size, layer) => {
      const html = place(x, y, ang, delay, LEAF(size, size * between(.38, .55), pick(LEAF_COLORS)));
      if (layer === 'front') front += html; else back += html;
    };

    // 1) 三根細長枝條穿過整個字
    for (let k = 0; k < 3; k++) {
      const [sx, sy] = pick(fill), a = between(0, Math.PI * 2), L = between(420, 640);
      const t = twig(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L, between(-90, 90), between(2, 3.2), between(.1, .6), between(2.6, 3.4));
      back += t.svg;
      for (let j = 1; j <= 5; j++) {
        const [bx, by] = t.at(.25 + j * .14);
        if (j % 2) back += place(bx, by, between(0, 360), .6 + j * .45, FLOWERS.bud(between(7, 12), pick(FLOWER_COLORS)));
        else leafAt(bx, by, a * 180 / Math.PI + between(40, 140), .5 + j * .45, between(28, 46), 'back');
      }
    }

    // 2) 字的邊緣長出 10 叢花，每叢帶 1–2 根往外伸的枝條
    spread(edge, 10).forEach(([px, py], i) => {
      const base = .3 + i * .28;
      let ox = px - cx, oy = py - cy;
      const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
      const outAng = Math.atan2(oy, ox);
      for (let k = 0, n = hRand() < .6 ? 2 : 1; k < n; k++) {
        const a = outAng + between(-.8, .8), L = between(130, 300), dur = between(1.4, 2.2);
        const t = twig(px, py, px + Math.cos(a) * L, py + Math.sin(a) * L, between(-60, 60), between(2, 3.5), base, dur);
        back += t.svg;
        [.35, .65].forEach(s => { const [lx, ly] = t.at(s); leafAt(lx, ly, a * 180 / Math.PI + 90 + between(-50, 50) * (hRand() < .5 ? 1 : -1), base + dur * s, between(30, 55)); });
        const [ex, ey] = t.at(1);
        flower(ex, ey, between(16, 30), base + dur);
      }
      for (let k = 0; k < 3; k++) leafAt(px + between(-30, 30), py + between(-30, 30), outAng * 180 / Math.PI + 90 + between(-70, 70), base + .4 + k * .15, between(45, 85), k === 2 ? 'front' : 'back');
      flower(px, py, between(55, 95), base + 1);
      for (let k = 0, n = 3 + Math.floor(hRand() * 3); k < n; k++)
        flower(px + between(-85, 85), py + between(-85, 85), between(18, 38), base + 1.2 + k * .18);
    });

    // 3) 零星小花點綴在字上
    for (let k = 0; k < 10; k++) { const [x, y] = pick(edge); flower(x, y, between(8, 15), between(2.5, 4.5)); }

    $('#logoBack').innerHTML = back;
    $('#logoFront').innerHTML = front;
  };
  // 枝條畫完後改成實線，避免虛線動畫結束時枝條消失
  logo.addEventListener('animationend', e => { if (e.target.classList.contains('twig')) e.target.classList.add('drawn'); });

  // ---- 蝴蝶 ----
  const BF_COLORS = [
    { w: '#2E6BE6', e: '#0B1E3F', s: '#BFE3FF' }, { w: '#F28C28', e: '#2A1A0E', s: '#FFF4E0' },
    { w: '#F5D547', e: '#3A2E0A', s: '#FFFFFF' }, { w: '#1FA39A', e: '#0C2B2A', s: '#BFF5EE' },
    { w: '#E85A8B', e: '#3B0F20', s: '#FFE0EC' }, { w: '#F4F1E8', e: '#2A2622', s: '#2A2622' },
    { w: '#7B4FD6', e: '#1E1236', s: '#E6DAFF' }
  ];
  const wing = c =>
    `<path d="M0 -2C-5 -18 -24 -26 -28 -14C-30 -5 -16 1 0 1Z" fill="${c.w}" stroke="${c.e}" stroke-width="2.4"/>` +
    `<path d="M0 1C-9 1 -22 7 -19 17C-16 24 -5 17 0 5Z" fill="${shade(c.w, -.12)}" stroke="${c.e}" stroke-width="2.4"/>` +
    `<circle cx="-21" cy="-13" r="2.2" fill="${c.s}"/><circle cx="-14" cy="-17" r="1.5" fill="${c.s}"/><circle cx="-13" cy="12" r="1.8" fill="${c.s}"/>`;
  const bfSVG = c => `<svg viewBox="-30 -26 60 52"><g class="wings">${wing(c)}<g transform="scale(-1 1)">${wing(c)}</g></g>` +
    `<ellipse cy="1" rx="2" ry="10" fill="#2A2622"/><path d="M-1 -8L-6 -17M1 -8L6 -17" stroke="#2A2622" stroke-width="1" fill="none"/></svg>`;

  const flies = [];
  let logoBox = { x: 0, y: 0, r: 300 }, mouse = null, mouseT = 0, flyRaf = 0, lastT = 0, heroInView = true;
  const measure = () => {
    const h = hero.getBoundingClientRect(), l = logo.getBoundingClientRect();
    logoBox = { x: l.left - h.left + l.width / 2, y: l.top - h.top + l.height * .48, r: l.width * .36 };
  };
  const toHero = ([x, y]) => {                        // SVG 座標 → 首頁區塊內的 px
    const m = logo.getScreenCTM(), h = hero.getBoundingClientRect();
    const p = new DOMPoint(x, y).matrixTransform(m);
    return [p.x - h.left, p.y - h.top];
  };
  const spawnFly = from => {
    const el = document.createElement('div');
    el.className = 'fly';
    el.style.setProperty('--flap', between(.16, .3).toFixed(2) + 's');
    el.innerHTML = bfSVG(pick(BF_COLORS));
    fliesBox.appendChild(el);
    const [x, y] = from;
    const f = { el, x, y, vx: between(-30, 30), vy: between(-90, -40), rot: 0, ang: between(0, 6.28),
      orbit: between(40, 110), spd: between(.7, 1.3), size: between(.7, 1.3), phase: between(0, 6.28), tx: x, ty: y, next: 0 };
    flies.push(f);
    requestAnimationFrame(() => el.classList.add('on'));
    return f;
  };

  const flyStep = now => {
    const dt = Math.min(.05, (now - lastT) / 1000 || .016);
    lastT = now;
    const chasing = mouse && now - mouseT < 4000;
    flies.forEach(f => {
      let tx, ty, maxV;
      if (chasing) {                                  // 被滑鼠吸引：繞著游標飛
        f.ang += dt * (1.6 + f.spd);
        tx = mouse.x + Math.cos(f.ang) * f.orbit;
        ty = mouse.y + Math.sin(f.ang) * f.orbit * .7;
        maxV = 320;
      } else {                                        // 平常：在 LOGO 周圍隨意飛
        if (now > f.next) {
          const a = between(0, 6.28), rr = logoBox.r * between(.3, 1.15);
          f.tx = logoBox.x + Math.cos(a) * rr;
          f.ty = logoBox.y + Math.sin(a) * rr * .85;
          f.next = now + between(1200, 3200);
        }
        tx = f.tx; ty = f.ty; maxV = 130;
      }
      const dx = tx - f.x, dy = ty - f.y, dist = Math.hypot(dx, dy) || 1;
      const sp = Math.min(maxV * f.spd, dist * 2.4);
      const k = Math.min(1, dt * (chasing ? 3.2 : 1.8));
      f.vx += (dx / dist * sp - f.vx) * k;
      f.vy += (dy / dist * sp - f.vy) * k;
      f.phase += dt * (7 + f.spd * 5);                // 拍翅造成的上下起伏
      f.x += (f.vx + Math.cos(f.phase * .7) * 22) * dt;
      f.y += (f.vy + Math.sin(f.phase) * 46) * dt;
      const head = Math.atan2(f.vy, f.vx) * 180 / Math.PI + 90;
      let diff = ((head - f.rot + 540) % 360) - 180;
      f.rot += diff * Math.min(1, dt * 5);
      f.el.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) rotate(${f.rot.toFixed(1)}deg) scale(${f.size.toFixed(2)})`;
    });
    flyRaf = heroInView ? requestAnimationFrame(flyStep) : 0;
  };
  const runFlies = () => { if (!flyRaf && !reduce) { lastT = performance.now(); flyRaf = requestAnimationFrame(flyStep); } };

  hero.addEventListener('pointermove', e => {
    const h = hero.getBoundingClientRect();
    mouse = { x: e.clientX - h.left, y: e.clientY - h.top };
    mouseT = performance.now();
  });
  hero.addEventListener('pointerdown', e => {           // 手機：點一下，蝴蝶飛過來
    const h = hero.getBoundingClientRect();
    mouse = { x: e.clientX - h.left, y: e.clientY - h.top };
    mouseT = performance.now();
  });
  hero.addEventListener('pointerleave', () => { mouse = null; });
  new IntersectionObserver(([e]) => { heroInView = e.isIntersecting; if (heroInView && flies.length) runFlies(); }).observe(hero);
  addEventListener('resize', measure);

  // 開場結束 + 字型載入後才開始長
  let introDone = false, logoBuilt = false, grown = false;
  const startHero = () => {
    if (grown || !introDone || !logoBuilt) return;
    grown = true;
    hero.classList.add('grow');
    measure();
    const count = innerWidth < 768 ? 9 : 16;
    if (reduce) {                                     // 減少動態：直接放幾隻靜止的蝴蝶
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28, f = spawnFly([logoBox.x + Math.cos(a) * logoBox.r * 1.05, logoBox.y + Math.sin(a) * logoBox.r * .9]);
        f.el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${between(-30, 30)}deg) scale(${f.size})`;
      }
      return;
    }
    for (let i = 0; i < count; i++)
      setTimeout(() => { spawnFly(toHero(pick(flowerSpots))); runFlies(); }, 3800 + i * 260);
  };
  document.addEventListener('introdone', () => { introDone = true; startHero(); });
  (document.fonts ? document.fonts.load(`900 100px "Noto Serif TC"`, '蝶') : Promise.resolve())
    .catch(() => {}).then(() => { buildLogo(); logoBuilt = true; startHero(); });

  /* ---------- 3. 介紹：旋轉花園 ---------- */
  const species = [
    { id: 'idea',       name: '大白斑蝶',   latin: 'Idea leuconoe',      fam: 'Danainae',     wing: [120, 150], host: '爬森藤',           color: '#E5E7EB' },
    { id: 'euploea',    name: '小紫斑蝶',   latin: 'Euploea tulliolus',  fam: 'Danainae',     wing: [50, 60],   host: '盤龍木',           color: '#A855F7' },
    { id: 'tirumala',   name: '淡紋青斑蝶', latin: 'Tirumala limniace',  fam: 'Danainae',     wing: [85, 100],  host: '華他卡藤',         color: '#38BDF8' },
    { id: 'hypolimnas', name: '幻蛺蝶',     latin: 'Hypolimnas bolina',  fam: 'Nymphalidae',  wing: [70, 85],   host: '番薯、金午時花等', color: '#6366F1' },
    { id: 'kallima',    name: '枯葉蝶',     latin: 'Kallima inachus',    fam: 'Nymphalidae',  wing: [85, 110],  host: '馬藍等爵床科植物', color: '#F97316' },
    { id: 'hebomoia',   name: '橙端粉蝶',   latin: 'Hebomoia glaucippe', fam: 'Pieridae',     wing: [90, 100],  host: '魚木',             color: '#FB923C' },
    { id: 'demoleus',   name: '無尾鳳蝶',   latin: 'Papilio demoleus',   fam: 'Papilionidae', wing: [80, 95],   host: '柑橘類',           color: '#FACC15' },
    { id: 'polytes',    name: '玉帶鳳蝶',   latin: 'Papilio polytes',    fam: 'Papilionidae', wing: [85, 100],  host: '柑橘類',           color: '#F8FAFC' }
  ];
  const N = species.length;
  const STEP = Math.PI * 2 / N;
  const pad = n => String(n).padStart(2, '0');

  // 可重現的亂數，讓每組植物長得不一樣但每次載入相同
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // 葉片：從原點往上長，長 l、寬 w
  const leaf = (x, y, l, w, rot, fill, vein) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0C${w / 2} ${-l * .3} ${w / 2} ${-l * .75} 0 ${-l}C${-w / 2} ${-l * .75} ${-w / 2} ${-l * .3} 0 0Z" fill="${fill}"/>` +
    `<path d="M0 0L0 ${-l * .92}" stroke="${vein}" stroke-width="1.2" fill="none"/></g>`;

  const flower = (x, y, r, petals, color, rot) => {
    let s = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
    for (let i = 0; i < petals; i++)
      s += `<ellipse cx="0" cy="${-r * .62}" rx="${r * .38}" ry="${r * .62}" fill="${color}" transform="rotate(${i * 360 / petals})"/>`;
    return s + `<circle r="${r * .28}" fill="#FDE68A"/><circle r="${r * .14}" fill="#B45309"/></g>`;
  };

  const svg = (cls, body) =>
    `<svg class="${cls}" viewBox="0 0 400 360" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">${body}</svg>`;

  // 一組紙雕植物：後層大葉、中層花莖花朵、前層矮葉
  const buildGroup = (s, i) => {
    const r = rng(i * 977 + 13);
    let back = '', mid = '', front = '';
    for (let k = 0; k < 7; k++)
      back += leaf(140 + r() * 120, 350, 150 + r() * 120, 60 + r() * 40, -70 + k * 23 + r() * 10, k % 2 ? '#1F3B24' : '#284A2C', '#16301B');
    for (let k = 0; k < 4; k++) {
      const x0 = 150 + k * 34 + r() * 16, h = 170 + r() * 110, bend = -50 + r() * 100;
      const tx = x0 + bend, ty = 350 - h;
      mid += `<path d="M${x0} 352Q${x0 + bend * .2} ${350 - h * .5} ${tx} ${ty}" stroke="#4C7A3C" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      mid += leaf(x0 + bend * .15, 350 - h * .45, 60 + r() * 30, 26, bend > 0 ? 40 : -40, '#3E6E37', '#2D5528');
      mid += flower(tx, ty, 22 + r() * 14, 5 + (k % 2), s.color, r() * 60);
    }
    for (let k = 0; k < 5; k++)
      front += leaf(110 + k * 45 + r() * 20, 362, 70 + r() * 50, 40 + r() * 16, -60 + k * 30 + r() * 10, k % 2 ? '#6A9F4C' : '#5A8E42', '#41702F');

    const el = document.createElement('div');
    el.className = 'g-group';
    el.innerHTML = `<div class="g-shadow"></div>${svg('g-back', back)}${svg('g-mid', mid)}` +
      `<div class="g-bf" style="--delay:${(-r() * 3).toFixed(2)}s"><div class="bob"><img src="assets/${s.id}-700.webp" alt="" draggable="false"></div></div>` +
      svg('g-front', front);
    return el;
  };

  // 近景用的無縫橫條
  const strip = (w, h, count, minL, maxL, colors, seed) => {
    const r = rng(seed);
    let body = '';
    for (let k = 0; k < count; k++)
      body += leaf(k * w / count + r() * 20, h + 4, minL + r() * (maxL - minL), 30 + r() * 40, -50 + r() * 100, colors[k % colors.length], 'rgba(0,0,0,.25)');
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`)}")`;
  };
  const near = $('#gNear');
  near.style.backgroundImage = strip(700, 180, 14, 90, 170, ['#2F5A2A', '#3B6B33', '#264B23'], 99);

  // 每一場的背景：從四角伸出的枝條＋淡淡的花，花色跟著該隻蝴蝶
  const buildBackdrop = (s, i) => {
    const r = rng(i * 331 + 5);
    let body = '';
    const corners = [[-40, 120, 1], [1640, 80, -1], [-40, 760, 1], [1640, 820, -1]];
    corners.forEach(([x0, y0, dir], k) => {
      if (k > 1 && r() < .4) return;
      let x = x0, y = y0, a = (dir > 0 ? 0 : 180) + (k < 2 ? 12 : -18) * dir + (r() - .5) * 20;
      const segs = 6 + Math.floor(r() * 4);
      let d = `M${x} ${y}`;
      for (let j = 0; j < segs; j++) {
        a += (r() - .5) * 34;
        const len = 60 + r() * 50;
        const nx = x + Math.cos(a * Math.PI / 180) * len, ny = y + Math.sin(a * Math.PI / 180) * len;
        d += `Q${(x + nx) / 2 + (r() - .5) * 30} ${(y + ny) / 2 + (r() - .5) * 30} ${nx} ${ny}`;
        body += leaf(nx, ny, 40 + r() * 40, 18 + r() * 14, a + 90 + (r() < .5 ? -60 : 60), r() < .5 ? '#3A4A30' : '#2C3A26', 'rgba(0,0,0,.2)');
        if (r() < .45) body += flower(nx + (r() - .5) * 30, ny + (r() - .5) * 30, 10 + r() * 10, 5, s.color, r() * 70);
        x = nx; y = ny;
      }
      body = `<path d="${d}" stroke="#2A2318" stroke-width="${7 - k}" fill="none" stroke-linecap="round"/>` + body;
    });
    const el = document.createElement('div');
    el.className = 'g-back-scene';
    el.innerHTML = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><rect width="1600" height="900" fill="#2A251C"/>` +
      `<g opacity=".75" style="filter:saturate(.55)">${body}</g></svg>`;
    return el;
  };

  // 轉盤：俯視時像傘面（放射傘骨＋同心圈），盤緣是一圈藤蔓花紋
  const buildDisc = () => {
    let ribs = '', band = '';
    for (let k = 0; k < 24; k++) {
      const a = k * 15 * Math.PI / 180;
      ribs += `<line x1="0" y1="0" x2="${Math.sin(a) * 925}" y2="${-Math.cos(a) * 925}"/>`;
    }
    for (let k = 0; k < 72; k++) {
      const a = k * 5;
      band += `<g transform="rotate(${a}) translate(0 -965)">` +
        `<path d="M-16 0C-10 -16 6 -16 14 -4C6 -8 -6 -8 -16 0Z" fill="${k % 2 ? '#E7D9B8' : '#8DB27A'}"/>` +
        `<path d="M-14 6C-4 18 10 14 16 4C8 10 -2 10 -14 6Z" fill="${k % 2 ? '#5E8C5A' : '#D8C59A'}"/>` +
        (k % 3 === 0 ? `<circle cx="20" cy="0" r="6" fill="#C2553A"/><circle cx="20" cy="0" r="2.4" fill="#F2D07A"/>` : '') + `</g>`;
    }
    $('#gDisc').innerHTML =
      `<svg viewBox="-1000 -1000 2000 2000"><defs><radialGradient id="gSurf"><stop offset="0" stop-color="#5A4D36"/><stop offset=".7" stop-color="#3B3326"/><stop offset="1" stop-color="#2A241B"/></radialGradient></defs>` +
      `<circle r="1000" fill="url(#gSurf)"/>` +
      `<g stroke="rgba(0,0,0,.28)" stroke-width="4">${ribs}</g>` +
      `<g fill="none" stroke="rgba(255,230,180,.08)" stroke-width="3"><circle r="300"/><circle r="560"/><circle r="800"/></g>` +
      `<circle r="40" fill="#2A2318"/><circle r="18" fill="#C9A96B"/>` +
      `<circle r="965" fill="none" stroke="#1F3A2E" stroke-width="70"/>${band}` +
      `<circle r="930" fill="none" stroke="#C9A96B" stroke-width="6"/><circle r="998" fill="none" stroke="#C9A96B" stroke-width="5"/></svg>`;
  };
  buildDisc();

  const stage = $('#gStage'), ring = $('#gRing'), text = $('#gText'), dots = $('#gDots');
  const disc = $('#gDisc'), spot = $('#gSpot'), backs = $('#gBacks'), section = $('#garden');
  const groups = species.map((s, i) => ring.appendChild(buildGroup(s, i)));
  const scenes = species.map((s, i) => backs.appendChild(buildBackdrop(s, i)));
  const dotBtns = species.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `第 ${i + 1} 隻：${s.name}`);
    b.addEventListener('click', () => { goTo(nearest(i)); });
    return dots.appendChild(b);
  });

  let pos = 0, target = 0, from = 0, t0 = 0, anim = 0, shown = -1;
  let entry = reduce ? 1 : 0;                         // 開場進度 0→1
  const DUR = reduce ? 0 : 1500;
  const TILT = 72;                                    // 轉盤傾斜角度（越大越扁）
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mod = (a, n) => ((a % n) + n) % n;
  const wrap = d => { d = mod(d, N); return d > N / 2 ? d - N : d; };
  // 往最近的方向轉到第 i 隻
  const nearest = i => target + wrap(i - target);

  const render = () => {
    const W = section.clientWidth, H = section.clientHeight;
    const R = Math.max(W * .6, 420);                // 轉盤半徑：左右兩側看得到前後一隻，感覺得到是一整圈
    const edgeY = H * (W < 768 ? .9 : .86);           // 轉盤上緣在畫面中的高度
    const gh = Math.min(edgeY - 60, W * (W < 768 ? .95 : .56) * .9);  // 主體盡量大，但不超出畫面
    const gw = gh / .9;

    // 開場：小圓盤在中央旋轉 → 倒下、放大成下方的圓弧
    const fall = ease(clamp01((entry - .3) / .7));
    const tilt = TILT * fall;
    const s = lerp(Math.min(W, H) * .42 / (2 * R), 1, fall);
    const ry = R * s * Math.cos(tilt * Math.PI / 180);
    const cy = lerp(H * .5, edgeY + R * Math.cos(TILT * Math.PI / 180), fall);
    const spin = -540 * Math.pow(1 - entry, 2);
    disc.style.width = 2 * R + 'px';
    disc.style.transform = `translate(${W / 2 - R}px, ${cy - R}px) scale(${s}) rotateX(${tilt}deg) rotateZ(${spin - pos * 360 / N}deg)`;

    // 主角群：站在盤緣上，跟著盤面轉
    const show = clamp01((entry - .82) / .18);
    const feet = (R - R * .052) * s;                  // 腳踩在花紋帶內側
    const ryFeet = feet * Math.cos(tilt * Math.PI / 180);
    groups.forEach((g, i) => {
      const d = wrap(i - pos);
      const th = d * STEP, c = Math.cos(th), sn = Math.sin(th);
      const x = W / 2 + feet * sn, y = cy - ryFeet * c;
      const slope = Math.atan2(ryFeet * sn, feet * c) * 180 / Math.PI;
      const off = Math.min(1, Math.abs(d));           // 0 = 正中央主角，1 = 左右鄰居
      const vis = Math.abs(th) < 1.45 ? show : 0;
      g.style.width = gw + 'px';
      g.style.height = gh + 'px';
      g.style.transform = `translate3d(${x - gw / 2}px, ${y - gh + (1 - show) * 80}px, 0) rotate(${slope}deg) rotateY(${th * 180 / Math.PI * .5}deg) scale(${1 - off * .4})`;
      g.style.zIndex = 50 - Math.round(Math.abs(d) * 10);
      g.style.opacity = vis;
      g.style.visibility = vis ? 'visible' : 'hidden';
      g.style.filter = `brightness(${1 - .5 * Math.min(1, Math.abs(d))}) saturate(${1 - .35 * Math.min(1, Math.abs(d))})`;
      g.style.setProperty('--d', Math.max(-1.5, Math.min(1.5, d)).toFixed(3));
    });

    // 背景：只顯示目前這一場，轉動時交叉淡入並慢速平移
    scenes.forEach((el, i) => {
      const d = wrap(i - pos);
      el.style.opacity = Math.max(0, 1 - Math.abs(d)) * lerp(.25, 1, show);
      el.style.transform = `translateX(${d * W * .12}px)`;
    });

    const sr = gh * .8;
    spot.style.width = spot.style.height = sr * 2 + 'px';
    spot.style.transform = `translate(${W / 2 - sr}px, ${edgeY - gh * .5 - sr}px)`;
    spot.style.opacity = show;
    near.style.backgroundPositionX = `${-pos * W * .6}px`;
  };

  const showText = i => {
    if (i === shown) return;
    shown = i;
    const s = species[i];
    dotBtns.forEach((b, k) => b.setAttribute('aria-current', k === i));
    text.classList.add('swap');
    setTimeout(() => {
      $('#gNo').textContent = `NO.${pad(i + 1)} / ${pad(N)}`;
      $('#gName').textContent = s.name;
      $('#gLatin').textContent = `${s.latin} · ${s.fam}`.toUpperCase();
      $('#gDesc').textContent = '【待補】約 40 字的介紹。';
      $('#gWing').textContent = `約 ${s.wing[0]}–${s.wing[1]}mm`;
      $('#gHost').textContent = s.host;
      text.classList.remove('swap');
    }, reduce ? 0 : 250);
  };

  // 自動輪播：在畫面內、開場結束、沒暫停時，每 5 秒轉到下一隻
  const HOLD = 5000;
  const playBtn = $('#gPlay');
  let auto = !reduce, inView = false, timer = 0;
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
    target = k; from = pos; t0 = performance.now();
    showText(mod(k, N));
    clearTimeout(timer);
    if (!anim) anim = requestAnimationFrame(step);
  };

  // 開場：第一次捲到這裡時播放（傘面旋轉 → 倒下成舞台 → 主角升起）
  const ENTRY = 2800;
  const playEntry = () => {
    const start = performance.now();
    const tick = now => {
      entry = Math.min(1, (now - start) / ENTRY);
      render();
      if (entry > .85) { text.classList.remove('wait'); near.classList.add('on'); }
      if (entry < 1) requestAnimationFrame(tick);
      else schedule();
    };
    requestAnimationFrame(tick);
  };
  if (reduce) { text.classList.remove('wait'); near.classList.add('on'); }
  let entered = reduce;
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView && !entered) { entered = true; playEntry(); }
    schedule();
  }, { threshold: .45 }).observe(section);

  $('#gPrev').addEventListener('click', () => goTo(target - 1));
  $('#gNext').addEventListener('click', () => goTo(target + 1));
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(target - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(target + 1); }
  });

  // 觸控板／滑鼠橫向滾動也能轉（直向滾動保留給頁面捲動）
  let wheelLock = 0;
  stage.addEventListener('wheel', e => {
    if (entry < 1 || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 8) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLock) return;
    wheelLock = now + 700;
    goTo(target + (e.deltaX > 0 ? 1 : -1));
  }, { passive: false });

  // 拖曳：往左拖 = 下一隻
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (entry < 1) return;
    cancelAnimationFrame(anim); anim = 0;
    clearTimeout(timer);
    drag = { x: e.clientX, pos, moved: false };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    pos = drag.pos - dx / (stage.clientWidth * .6);
    render();
    showText(mod(Math.round(pos), N));
  });
  const endDrag = () => {
    if (!drag) return;
    stage.classList.remove('dragging');
    drag = null;
    goTo(Math.round(pos));
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  addEventListener('resize', render);
  showText(0);
  render();

  /* ---------- 8. 照片：複製一份做無縫循環 ---------- */
  const reel = $('#reel');
  [...reel.children].forEach(li => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    reel.appendChild(c);
  });
})();
