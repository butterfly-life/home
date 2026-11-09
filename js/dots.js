/* 小蝴蝶匯聚成字（知識區以下各段的中文大標）：
   標題捲進畫面後，一群各種顏色（單色）的小蝴蝶拍著翅膀飛向字形位置；每個字比前一個字晚 0.3 秒開始聚集，
   該字的蝴蝶到齊後縮小淡出、那個字以原本的字體淡入；全部完成後就是標題原樣。標題捲回下方離開畫面時，倒著飛散。
   作法：量出標題每個字在畫面上的位置 → 逐字畫到離屏 canvas → 取樣成落點 → 用一張固定在視窗上的 canvas 畫蝴蝶與字
   蝴蝶圖示：assets/bf-icons/bf01–13.png（透明底，載入後重新上色） */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // 「從利用，轉為保育」（#k-conserve）不套用，維持原本的逐行浮現
  const els = [...document.querySelectorAll('.dock-t, .kq-t, .kfaq-title')].filter(el => !el.closest('#k-conserve'));
  if (!els.length) return;
  const DPR = Math.min(2, devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.className = 'dotx-cv';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const smooth = t => t * t * (3 - 2 * t);
  const outCubic = t => 1 - Math.pow(1 - t, 3);

  const CHAR_DELAY = .3;      // 每個字比前一個字晚幾秒
  const FLY = 1.3;            // 每隻蝴蝶飛行時間（秒）
  const SPREAD = .3;          // 同一個字裡蝴蝶出發時間的隨機差
  const MELT = .35;           // 蝴蝶化成字的時間
  // 蝴蝶顏色：各種常見的蝶色，每隻一種單色
  const COLORS = ['#D9772F', '#E9B949', '#3E6FA8', '#6FA8D6', '#7A5BA6', '#C2453A', '#D07A9A', '#2E8C8A', '#5E8C5A', '#8A5A33', '#2B2B2B', '#E58F6B'];

  /* 圖示預先縮小、轉正（原圖頭朝右上，轉 -45° 讓頭朝上、翅膀在左右，才能左右拍翅），再依顏色各做一份 */
  const ICON = 64, shapes = [], tinted = [];
  let loaded = 0;
  for (let i = 1; i <= 13; i++) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = ICON;
      const g = c.getContext('2d');
      g.translate(ICON / 2, ICON / 2); g.rotate(-Math.PI / 4);
      const s = ICON * .95;
      g.drawImage(img, -s / 2, -s / 2, s, s);
      shapes.push(COLORS.map(col => {
        const t = document.createElement('canvas'); t.width = t.height = ICON;
        const tg = t.getContext('2d');
        tg.drawImage(c, 0, 0);
        tg.globalCompositeOperation = 'source-in';
        tg.fillStyle = col; tg.fillRect(0, 0, ICON, ICON);
        return t;
      }));
      if (++loaded === 13) tinted.push(...shapes);
    };
    img.onerror = () => { if (++loaded === 13) tinted.push(...shapes); };
    img.src = `assets/bf-icons/bf${String(i).padStart(2, '0')}.png`;
  }

  const items = els.map(el => { el.classList.add('dotx'); return { el, pts: [], glyphs: [], size: 8, T: 0, end: 1, lastIn: false }; });

  const build = o => {
    const el = o.el, box = el.getBoundingClientRect();
    o.pts = []; o.glyphs = [];
    if (!box.width || !box.height) return;
    const color = getComputedStyle(el).color;
    // 1) 收集每個看得見的字：字元、字型、位置
    const chars = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rg = document.createRange();
    let n, fs = 40;
    while ((n = walk.nextNode())) {
      // 逐行揭露會在標題裡放一份給螢幕閱讀器的隱藏全文（.sr-only），不能拿來取樣
      if (n.parentElement.closest('.sr-only')) continue;
      const cs = getComputedStyle(n.parentElement);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      fs = parseFloat(cs.fontSize) || fs;
      const t = n.textContent;
      for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if (!ch.trim() || ch === '') continue;
        rg.setStart(n, i); rg.setEnd(n, i + 1);
        const r = rg.getClientRects()[0];
        if (!r || !r.width) continue;
        chars.push({ ch, font, fs: parseFloat(cs.fontSize) || fs, x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height });
      }
    }
    if (!chars.length) return;
    // 2) 每個字各畫一張：取樣用的黑字、最後淡入用的原色字
    const pad = Math.ceil(fs * .15);
    const glyphOf = (c, fill, scale) => {
      const W = Math.ceil(c.w + pad * 2), H = Math.ceil(c.h + pad * 2);
      const k = document.createElement('canvas'); k.width = Math.ceil(W * scale); k.height = Math.ceil(H * scale);
      const g = k.getContext('2d', { willReadFrequently: scale === 1 });
      g.scale(scale, scale);
      g.font = c.font; g.textBaseline = 'alphabetic'; g.fillStyle = fill;
      const m = g.measureText(c.ch);
      const asc = m.fontBoundingBoxAscent || c.fs * .88, desc = m.fontBoundingBoxDescent || c.fs * .12;
      g.fillText(c.ch, pad + (c.w - m.width) / 2, pad + (c.h - (asc + desc)) / 2 + asc);
      return { k, g, W, H };
    };
    const masks = chars.map(c => glyphOf(c, '#000', 1));
    o.glyphs = chars.map((c, ci) => { const { k, W, H } = glyphOf(c, color, DPR); return { k, x: c.x - pad, y: c.y - pad, w: W, h: H, ci }; });
    // 3) 取樣：間距跟字級走，數量太多就放寬
    const max = innerWidth < 760 ? 450 : 1100;
    let gap = Math.max(5, Math.round(fs / 13)), raw;
    const datas = masks.map(m => m.g.getImageData(0, 0, m.W, m.H).data);
    for (;;) {
      raw = [];
      masks.forEach((m, ci) => {
        const d = datas[ci], c = chars[ci];
        for (let y = gap >> 1; y < m.H; y += gap) for (let x = gap >> 1; x < m.W; x += gap)
          if (d[(y * m.W + x) * 4 + 3] > 110) raw.push([c.x - pad + x, c.y - pad + y, ci]);
      });
      if (raw.length <= max) break;
      gap++;
    }
    const vw = innerWidth, vh = innerHeight;
    o.size = gap * 1.75;
    o.end = (chars.length - 1) * CHAR_DELAY + SPREAD + FLY + MELT;
    o.pts = raw.map(([x, y, ci]) => {
      const a = Math.random() * Math.PI * 2, d = (.3 + Math.random() * .9) * Math.max(vw, vh) * .6;
      return {
        x: x + (Math.random() - .5) * gap * .5, y: y + (Math.random() - .5) * gap * .5, ci,
        dx: Math.cos(a) * d, dy: Math.sin(a) * d * .7 + vh * .3,      // 從四周、偏下方飛來
        st: ci * CHAR_DELAY + Math.random() * SPREAD,                  // 出發時間：每個字晚 0.3 秒
        sw: (Math.random() - .5) * 160,
        s: .75 + Math.random() * .5,
        rest: (Math.random() - .5) * 1.1,
        ph: Math.random() * 6.28, fq: 15 + Math.random() * 9,
        ic: (Math.random() * 13) | 0, co: (Math.random() * COLORS.length) | 0
      };
    });
  };
  const buildAll = () => items.forEach(build);

  const resize = () => { cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); };

  const pos = (q, t) => {
    const e = outCubic(t), k = 1 - e;
    return [q.x + q.dx * k + Math.sin(e * Math.PI) * q.sw * .3, q.y + q.dy * k + q.sw * k * k * .4];
  };
  // 某個字「化成字」的進度
  const meltOf = (o, ci) => smooth(clamp01((o.T - (ci * CHAR_DELAY + SPREAD + FLY)) / MELT));

  let last = 0;
  const draw = now => {
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    const time = now / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const vh = innerHeight;
    items.forEach(o => {
      const b = o.el.getBoundingClientRect();
      // 標題上緣進到視窗 80% 以上就開始播；捲回去讓它退到視窗底下，就倒著飛散
      const play = b.top < vh * .8;
      o.T = Math.max(0, Math.min(o.end, o.T + (play ? dt : -dt * 1.6)));
      const done = o.T >= o.end;
      o.el.style.opacity = done ? '1' : '0';
      if (done || !o.T || !tinted.length || b.bottom < -300 || b.top > vh + 300) return;
      // 已經化好的字：畫原本的字形（之後整段交給真正的文字）
      ctx.globalAlpha = 1;
      for (const g of o.glyphs) {
        const m = meltOf(o, g.ci);
        if (m <= 0) continue;
        ctx.globalAlpha = m;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(g.k, (b.left + g.x) * DPR, (b.top + g.y) * DPR, g.w * DPR, g.h * DPR);
      }
      for (const q of o.pts) {
        const t = clamp01((o.T - q.st) / FLY);
        if (t <= 0) continue;
        const melt = meltOf(o, q.ci);
        if (melt >= 1) continue;
        const e = outCubic(t);
        const [x, y] = pos(q, t);
        const [nx, ny] = pos(q, Math.min(1, t + .02));
        const head = (nx - x) ** 2 + (ny - y) ** 2 > .01 ? Math.atan2(ny - y, nx - x) + Math.PI / 2 : q.rest;
        let dr = q.rest - head; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        const land = smooth(clamp01((t - .7) / .3));
        const rot = head + dr * land;
        const fast = .2 + .8 * Math.abs(Math.cos(time * q.fq + q.ph));
        const slow = .72 + .28 * Math.abs(Math.cos(time * 2.4 + q.ph));
        const flap = fast + (slow - fast) * land;
        const s = o.size * q.s * (.55 + .45 * e) * (1 - .6 * melt);
        const cs = Math.cos(rot) * DPR, sn = Math.sin(rot) * DPR;
        ctx.globalAlpha = smooth(clamp01(t * 4)) * (1 - melt);
        ctx.setTransform(cs * flap, sn * flap, -sn, cs, (b.left + x) * DPR, (b.top + y) * DPR);
        ctx.drawImage(tinted[q.ic % tinted.length][q.co], -s / 2, -s / 2, s, s);
      }
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  };

  resize();
  buildAll();
  requestAnimationFrame(draw);
  let rT = 0;
  const later = () => { clearTimeout(rT); rT = setTimeout(buildAll, 200); };
  addEventListener('resize', () => { resize(); later(); });
  addEventListener('load', later);
  if (document.fonts) { document.fonts.ready.then(later); document.fonts.addEventListener('loadingdone', later); }
  document.addEventListener('langchange', later);
})();
