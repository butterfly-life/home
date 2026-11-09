/* 懸蛹互動（#pupa）—— 參考掛繩名牌的彈力繩效果
   - 絲線是一條真的「繩子」：由十多個節點組成（Verlet 物理），會彎曲、會被拉長（彈力繩），鬆掉時自然垂下
   - 蛹掛在繩子末端：待機時輕輕晃；按住可拖到任何地方，放開後被繩子彈回去，上下彈跳、左右甩動再慢慢停回原位
   - 點蛹：旁邊出現這個蛹會羽化成的蝴蝶名字與資料
   - 連續點很多次：蛹殼越裂越多 → 蝴蝶提早羽化飛出，但翅膀皺縮、沒有飛行力，掙扎幾下就掉到地上 →
     跳出「血淋巴」說明
   - 下方六個圓形縮圖切換蛹（一次只吊一個在畫面正中間）；六個都羽化後出現結尾畫面
   蛹圖：assets/pupae/pupa1–6.png；蝴蝶圖：assets/<id>-fly.png */
(() => {
  const sec = document.getElementById('pupa'), cv = document.getElementById('pupaCv');
  if (!sec || !cv) return;
  const ctx = cv.getContext('2d');
  const info = document.getElementById('pupaInfo'), thumbs = document.getElementById('pupaThumbs');
  const note = document.getElementById('pupaNote'), noteX = document.getElementById('pupaNoteX');
  const end = document.getElementById('pupaEnd'), endX = document.getElementById('pupaEndX');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isEn = () => document.body.classList.contains('lang-en');
  const L = (zh, en) => isEn() ? en : zh;

  // 六個蛹 ↔ 蝴蝶（ax：蛹圖上端絲線綁的位置，0～1）
  const DATA = [
    { id: 'idea', ax: .499, zh: { name: '大白斑蝶', fam: '蛺蝶科 · 斑蝶亞科', host: '爬森藤', pupa: '金黃色、帶黑色斑點，像一顆有金屬光澤的小寶石' },
      en: { name: 'Paper Kite', fam: 'Nymphalidae · Danainae', host: 'Parsonsia laevigata', pupa: 'Golden with black spots, like a small metallic jewel' },
      latin: 'Idea leuconoe clara', wing: '58–71', alt: '0–1000' },
    { id: 'euploea', ax: .527, zh: { name: '小紫斑蝶', fam: '蛺蝶科 · 斑蝶亞科', host: '盤龍木', pupa: '銀亮如鏡，帶著藍紫色的金屬反光' },
      en: { name: 'Dwarf Crow', fam: 'Nymphalidae · Danainae', host: 'Malaisia scandens', pupa: 'Mirror-bright, with a blue-violet metallic sheen' },
      latin: 'Euploea tulliolus koxinga', wing: '36–41', alt: '0–1000' },
    { id: 'tirumala', ax: .682, zh: { name: '淡紋青斑蝶', fam: '蛺蝶科 · 斑蝶亞科', host: '華他卡藤、夜香花', pupa: '深綠色，藏在葉片間不容易被發現' },
      en: { name: 'Blue Tiger', fam: 'Nymphalidae · Danainae', host: 'Dregea volubilis, Telosma cordata', pupa: 'Deep green, hard to spot among the leaves' },
      latin: 'Tirumala limniace limniace', wing: '35–51', alt: '0–1000' },
    { id: 'kallima', ax: .271, zh: { name: '枯葉蝶', fam: '蛺蝶科 · 蛺蝶亞科', host: '臺灣馬藍、腺萼馬藍', pupa: '暗褐色、邊緣有尖刺，像一片乾枯的碎葉' },
      en: { name: 'Orange Oakleaf', fam: 'Nymphalidae · Nymphalinae', host: 'Strobilanthes formosanus, S. penstemonoides', pupa: 'Dark brown with spiky edges, like a scrap of dead leaf' },
      latin: 'Kallima inachus formosana', wing: '44–52', alt: '0–2000' },
    { id: 'demoleus', ax: .585, zh: { name: '花鳳蝶', fam: '鳳蝶科 · 鳳蝶亞科', host: '柑橘、柚、金柑', pupa: '鮮綠色，以一條絲帶繫在枝條上（帶蛹）' },
      en: { name: 'Lime Swallowtail', fam: 'Papilionidae · Papilioninae', host: 'citrus, pomelo, kumquat', pupa: 'Bright green, tied to a twig by a silk girdle' },
      latin: 'Papilio demoleus', wing: '42–46', alt: '0–1000' },
    { id: 'polytes', ax: .626, zh: { name: '玉帶鳳蝶', fam: '鳳蝶科 · 鳳蝶亞科', host: '柑橘、柚、飛龍掌血', pupa: '黃綠漸層到褐色，看起來就像一截小樹枝' },
      en: { name: 'Common Mormon', fam: 'Papilionidae · Papilioninae', host: 'citrus, pomelo, Toddalia asiatica', pupa: 'Yellow-green fading to brown, just like a broken twig' },
      latin: 'Papilio polytes polytes', wing: '39–54', alt: '0–2000' }
  ];
  const load = src => { const im = new Image(); im.src = src; return im; };
  DATA.forEach((d, i) => { d.img = load(`assets/pupae/pupa${i + 1}.png?v=2`); d.fly = load(`assets/${d.id}-fly.png`); d.hits = 0; d.done = false; d.bf = null; });

  /* ---------- 版面 ---------- */
  let W = 0, H = 0, DPR = 1, PH = 200, L0 = 200;          // PH：蛹的高度；L0：絲線不受力時的長度
  const A = { x: 0, y: 0 };                                 // 絲線上端（畫面頂端正中間）
  const N = 16;                                             // 繩子的節點數
  let nodes = [], seg = 10;
  const resize = () => {
    const r = sec.getBoundingClientRect();
    const oldW = W;
    W = r.width; H = r.height; DPR = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    PH = Math.min(H * .3, 270);
    L0 = H * .28;
    seg = L0 / N;
    A.x = W / 2; A.y = -6;
    if (!nodes.length || Math.abs(oldW - W) > 1) buildRope();
  };
  // 繩子節點：0 是固定的上端，N 是綁著蛹的那一點（比較重）
  const buildRope = (kick = 0) => {
    nodes = Array.from({ length: N + 1 }, (_, i) => {
      const x = A.x + kick * (i / N) * 60, y = A.y + i * seg;
      return { x, y, px: x - kick * (i / N) * 6, py: y, m: i === N ? .12 : 1 };   // m：反質量（越小越重）
    });
    P.th = kick * .3; P.w = 0;
  };
  const P = { th: 0, w: 0 };                               // 蛹的角度（0 = 垂直往下）與角速度
  const tip = () => nodes[N];

  /* ---------- 物理（Verlet 繩子） ---------- */
  const G = 1500, STIFF = .55, ITER = 14;                  // STIFF < 1：繩子可以被拉長 → 彈力繩
  let drag = null, cur = 0, shake = 0;
  const step = (dt, t) => {
    const d2 = dt * dt;
    for (let i = 1; i <= N; i++) {
      const n = nodes[i];
      let ax = 0, ay = G;
      if (i === N && !drag && !reduce) ax += (Math.sin(t * .9) * 60 + Math.sin(t * 2.3) * 18);   // 待機時的微風
      const vx = (n.x - n.px) * .992, vy = (n.y - n.py) * .992;
      n.px = n.x; n.py = n.y;
      n.x += vx + ax * d2; n.y += vy + ay * d2;
    }
    if (drag) {                                             // 拖曳：蛹被游標拉著走（保留速度，放開時能甩出去）
      const n = tip();
      n.x += (drag.x - n.x) * .45; n.y += (drag.y - n.y) * .45;
    }
    nodes[0].x = A.x; nodes[0].y = A.y;
    for (let k = 0; k < ITER; k++) {
      for (let i = 0; i < N; i++) {
        const a = nodes[i], b = nodes[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || .001;
        if (dist <= seg) continue;                          // 繩子只會被拉緊，不會被推（鬆的時候自然彎）
        const ma = i === 0 ? 0 : a.m, mb = (drag && i + 1 === N) ? .02 : b.m, sum = ma + mb;
        if (!sum) continue;
        const diff = (dist - seg) / dist * STIFF;
        a.x += dx * diff * ma / sum; a.y += dy * diff * ma / sum;
        b.x -= dx * diff * mb / sum; b.y -= dy * diff * mb / sum;
      }
      nodes[0].x = A.x; nodes[0].y = A.y;
    }
    // 蛹的角度：跟著繩子末端的方向，再加上慣性的甩動
    const a = nodes[N - 2], b = tip();
    const target = -Math.atan2(b.x - a.x, b.y - a.y);
    const swing = (b.x - b.px) / dt;
    P.w += (-(P.th - target) * 30 - P.w * 3.6 - swing * .0035) * dt;
    P.th += P.w * dt;
  };

  /* ---------- 羽化的蝴蝶：飛出蛹 → 翅膀皺縮撐不住 → 掉到地上 ---------- */
  const floorY = () => H - Math.max(160, H * .25);       // 地面：蝴蝶變大了，地面抬高一點，躺著時不會壓到下方縮圖
  const bottomOf = () => { const p = tip(); return { x: p.x - Math.sin(P.th) * PH * .9, y: p.y + Math.cos(P.th) * PH * .9 }; };
  const emerge = d => {
    d.done = true;
    const b = bottomOf(), dir = Math.random() < .5 ? -1 : 1;
    d.bf = { x: b.x, y: b.y, vx: dir * (90 + Math.random() * 60), vy: -60, r: 0, t: 0, phase: 'fly', land: 0, dir };
    shake = 1;
    renderThumbs();
  };
  const stepBf = (d, dt) => {
    const b = d.bf; if (!b) return;
    b.t += dt;
    if (b.phase === 'fly') {                               // 想飛：用力拍翅往外飛，但升力不夠，越飛越低
      const lift = 520 * Math.max(0, 1 - b.t / 1.4) * (Math.sin(b.t * 16) > 0 ? 1 : .25);
      b.vy += (G * .35 - lift) * dt;
      b.vx *= 1 - dt * .8;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.r = Math.sin(b.t * 7) * .25 + b.dir * .1;
      if (b.t > 1.5 || b.y > floorY() - 40) { b.phase = 'fall'; }
    } else if (b.phase === 'fall') {
      b.vy += G * .8 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      b.r += b.dir * 3 * dt;
      const fy = floorY();
      if (b.y >= fy) {
        b.y = fy;
        if (b.vy > 180) { b.vy *= -.22; b.vx *= .4; }     // 落地輕彈一下
        else { b.vy = 0; b.vx = 0; b.phase = 'down'; b.land = b.t; }
      }
    } else {
      b.r += (b.dir * 1.35 - b.r) * Math.min(1, dt * 5);  // 側躺在地上，偶爾抽動一下翅膀
      if (!b.noted && b.t - b.land > .9) { b.noted = true; showNote(); }
    }
  };

  /* ---------- 畫 ---------- */
  const draw = now => {
    const t = now / 1000, d = DATA[cur];
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // 地上的影子
    const fy = floorY(), p = tip();
    const lift = Math.max(0, Math.min(1, (fy - p.y - PH) / (H * .4)));
    ctx.fillStyle = `rgba(60,45,30,${(.13 - lift * .06).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(p.x, fy + 16, PH * (.3 - lift * .1), 8, 0, 0, 6.2832); ctx.fill();
    // 絲線：沿著節點畫平滑曲線
    ctx.strokeStyle = 'rgba(96,84,66,.8)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < N; i++) {
      const a = nodes[i], b = nodes[i + 1];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    // 繩子綁在蛹上的那一小團絲
    ctx.fillStyle = 'rgba(235,228,212,.95)';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, 6.2832); ctx.fill();
    // 蛹
    if (d.img.complete && d.img.naturalWidth) {
      const pw = PH * d.img.naturalWidth / d.img.naturalHeight;
      const sh = shake > 0 ? Math.sin(t * 38) * shake * .05 : 0;   // 蠕動：小角度快速左右扭
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(P.th + sh);
      if (d.done) { ctx.globalAlpha = .5; ctx.filter = 'saturate(.3) brightness(.92)'; }   // 留下的空殼
      ctx.drawImage(d.img, -pw * d.ax, 0, pw, PH);
      ctx.filter = 'none'; ctx.globalAlpha = 1;
      // 裂痕：點越多次裂得越多
      const cracks = 0;   // 不畫裂痕線條：破掉後只變成灰色的空殼
      if (cracks) {
        ctx.strokeStyle = d.done ? 'rgba(40,30,20,.65)' : 'rgba(255,255,240,.9)'; ctx.lineWidth = 1.6;
        const ox = -pw * d.ax + pw * .5;
        for (let k = 0; k < Math.min(cracks, 5); k++) {
          const y0 = PH * (.3 + k * .12), sx = (k % 2 ? -1 : 1) * pw * .16;
          ctx.beginPath(); ctx.moveTo(ox - sx, y0);
          for (let j = 1; j <= 4; j++) ctx.lineTo(ox - sx + sx * j / 2, y0 + (j % 2 ? -1 : 1) * PH * .022 + j * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // 羽化出來的蝴蝶
    const b = d.bf;
    if (b && d.fly.complete && d.fly.naturalWidth) {
      // 大小：比蛹稍大（翅膀皺縮後，整體仍略大於蛹）
      const bw = PH * 1.3, bh = bw * d.fly.naturalHeight / d.fly.naturalWidth;
      const flap = b.phase === 'fly' ? .55 + .4 * Math.abs(Math.sin(b.t * 16)) :
        b.phase === 'fall' ? .55 + .15 * Math.abs(Math.sin(b.t * 8)) :
        .6 + (Math.sin(b.t * 3) > .97 ? .08 : 0);
      const gray = b.phase === 'down' ? Math.min(1, (b.t - b.land) / 1.4) : 0;
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.filter = `saturate(${(.8 - gray * .5).toFixed(2)}) brightness(${(.96 - gray * .16).toFixed(2)})`;
      ctx.scale(flap, .85);                               // 皺縮、展不開的翅膀
      ctx.drawImage(d.fly, -bw / 2, -bh / 2, bw, bh);
      ctx.restore();
      ctx.filter = 'none';
    }
  };

  let last = 0, acc = 0, seen = false;
  const DT = 1 / 120;
  const loop = now => {
    requestAnimationFrame(loop);
    if (!seen) { last = now; return; }
    const frame = Math.min(.05, (now - last) / 1000 || .016); last = now;
    acc += frame;
    const t = now / 1000;
    while (acc >= DT) { step(DT, t); acc -= DT; }
    shake = Math.max(0, shake - frame * 1.6);
    stepBf(DATA[cur], frame);
    draw(now);
  };

  /* ---------- 資料面板、縮圖、說明、結尾 ---------- */
  const renderInfo = () => {
    const d = DATA[cur], x = isEn() ? d.en : d.zh;
    info.innerHTML =
      `<p class="pi-k">PUPA ${String(cur + 1).padStart(2, '0')} / 06${d.done ? ` · ${L('已羽化', 'EMERGED')}` : ''}</p>` +
      `<h3 class="pi-n">${x.name}</h3><p class="pi-l">${d.latin}</p>` +
      `<p class="pi-p">${x.pupa}</p>` +
      `<dl class="pi-d"><dt>${L('科別', 'Family')}</dt><dd>${x.fam}</dd><dt>${L('寄主植物', 'Host plant')}</dt><dd>${x.host}</dd>` +
      `<dt>${L('前翅長', 'Forewing')}</dt><dd>${d.wing} mm</dd><dt>${L('海拔', 'Altitude')}</dt><dd>${d.alt} m</dd></dl>`;
  };
  const showInfo = () => { renderInfo(); info.classList.add('on'); };
  const renderThumbs = () => {
    thumbs.innerHTML = DATA.map((d, i) =>
      `<button type="button" class="pz-t${i === cur ? ' on' : ''}${d.done ? ' done' : ''}" data-i="${i}" aria-pressed="${i === cur}" aria-label="${(isEn() ? d.en : d.zh).name}${d.done ? L('（已羽化）', ' (emerged)') : ''}">` +
      `<img src="assets/pupae/pupa${i + 1}.png?v=2" alt=""></button>`).join('');
  };
  const select = i => {
    cur = i; DATA.forEach(d => { if (!d.done) d.hits = 0; });
    hide(note); info.classList.remove('on'); buildRope(1); renderThumbs();
  };
  thumbs.addEventListener('click', e => {
    const b = e.target.closest('.pz-t'); if (!b) return;
    const i = +b.dataset.i; if (i !== cur) select(i);
  });
  const show = el => { if (!el) return; el.hidden = false; requestAnimationFrame(() => el.classList.add('on')); const btn = el.querySelector('button'); if (btn) btn.focus({ preventScroll: true }); };
  const hide = el => { if (!el) return; el.classList.remove('on'); el.hidden = true; };
  const showNote = () => show(note);
  noteX.addEventListener('click', () => {
    hide(note);
    if (DATA.every(d => d.done)) setTimeout(() => show(end), 400);   // 六個都羽化了 → 結尾畫面
  });
  if (endX) endX.addEventListener('click', () => {                  // 重新開始：六個蛹都恢復
    DATA.forEach(d => { d.done = false; d.hits = 0; d.bf = null; });
    hide(end); select(0);
  });

  /* ---------- 滑鼠：點中蛹才拖；幾乎沒移動就算「點一下」 ---------- */
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onPupa = m => {
    const d = DATA[cur], p = tip(), pw = PH * (d.img.naturalWidth / d.img.naturalHeight || .8);
    const c = Math.cos(-P.th), s = Math.sin(-P.th), x = m.x - p.x, y = m.y - p.y;
    const lx = x * c - y * s, ly = x * s + y * c;
    return lx > -pw * d.ax - 12 && lx < pw * (1 - d.ax) + 12 && ly > -14 && ly < PH + 12;
  };
  const HITS = 6;                                          // 連續點幾下會被「敲開」
  cv.addEventListener('pointerdown', e => {
    const m = local(e);
    if (!onPupa(m)) return;
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    drag = { x: m.x, y: m.y, sx: m.x, sy: m.y, moved: false };
    sec.classList.add('grab');
  });
  cv.addEventListener('pointermove', e => {
    const m = local(e);
    if (drag) {
      drag.x = m.x; drag.y = m.y;
      if (Math.hypot(m.x - drag.sx, m.y - drag.sy) > 6) drag.moved = true;
    } else sec.classList.toggle('over', onPupa(m));
  });
  const knock = () => {
    const d = DATA[cur];
    showInfo();
    if (d.done) return;
    // 被點一下：蛹在原地小幅度地扭動（像裡面的蝴蝶在動），不再大幅彈跳；點越多次扭得稍微明顯一點
    P.w += (Math.random() < .5 ? -1 : 1) * (.5 + d.hits * .12);
    shake = Math.min(.6, .28 + d.hits * .06);
    d.hits++;
    if (d.hits >= HITS) { emerge(d); renderInfo(); }
  };
  const up = () => {
    if (!drag) return;
    const click = !drag.moved;
    drag = null; sec.classList.remove('grab');
    if (click) knock();
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.tabIndex = 0;
  cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knock(); } });

  new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(sec);
  addEventListener('resize', resize);
  document.addEventListener('langchange', () => { renderThumbs(); if (info.classList.contains('on')) renderInfo(); });
  resize(); buildRope(1); renderThumbs();
  requestAnimationFrame(loop);
})();
