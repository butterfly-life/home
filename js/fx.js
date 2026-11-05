/* 版面動態（接在 main.js 後面）：
   跑馬燈、逐行揭露、數字跳動、圖片視差、
   各區塊底色漸變、知識區的捲動編排（構造輪盤文字、生活史橫向滑動、分類依序進場、可展開清單、三角遮罩、條帶轉場）、視差轉場、蝴蝶群（只飛一次） */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nav = $('#nav');

  /* ---------- 文字：逐行遮罩揭露（依瀏覽器實際換行切成一行一行） ---------- */
  const lineEls = $$('[data-tx="lines"]');
  lineEls.forEach(el => { el.dataset.raw = el.textContent.trim().replace(/\s+/g, ' '); });
  const splitLines = el => {
    const txt = el.dataset.raw, chars = [...txt];
    el.innerHTML = chars.map(c => `<span class="lc">${esc(c)}</span>`).join('');
    const lines = [];
    let top = null, cur = '';
    el.querySelectorAll('.lc').forEach((s, i) => {
      const t = s.offsetTop;
      if (top !== null && t > top + 2) { lines.push(cur); cur = ''; }
      if (top === null || t > top + 2) top = t;
      cur += chars[i];
    });
    lines.push(cur);
    el.innerHTML = `<span class="sr-only">${esc(txt)}</span>` +
      lines.map((l, i) => `<span class="ln" aria-hidden="true"><span style="--l:${i}">${esc(l.trim()) || '&nbsp;'}</span></span>`).join('');
    el._w = el.clientWidth;
  };
  const splitAll = force => lineEls.forEach(el => { if (force || el.clientWidth !== el._w) splitLines(el); });
  splitAll(true);

  /* ---------- 子項目依序進場：延遲成等差數列 ---------- */
  $$('[data-tx="stagger"]').forEach(el => [...el.children].forEach((c, i) => c.style.setProperty('--k', i)));

  /* ---------- 捲動填色：一個字一個字由淡轉深 ---------- */
  const scrubs = $$('[data-scrub]').map(el => {
    const txt = el.textContent.trim();
    el.innerHTML = `<span class="sr-only">${esc(txt)}</span>` + [...txt].map(c => `<span class="sc" aria-hidden="true">${esc(c)}</span>`).join('');
    return { el, chs: [...el.querySelectorAll('.sc')], n: 0 };
  });
  const drawScrub = () => scrubs.forEach(s => {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    const p = reduce ? 1 : clamp01((innerHeight * .85 - r.top) / (innerHeight * .55));
    const k = Math.round(p * s.chs.length);
    if (k === s.n) return;
    const [a, b] = k > s.n ? [s.n, k] : [k, s.n];
    for (let i = a; i < b; i++) s.chs[i].classList.toggle('on', i < k);
    s.n = k;
  });

  /* ---------- 數字：進入畫面時從 0 跳到目標，離開後重置 ---------- */
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target, to = +el.dataset.count;
    cancelAnimationFrame(el._raf);
    if (!e.isIntersecting) { if (!reduce) el.textContent = '0'; return; }
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), D = 1800;
    const step = now => {
      const t = clamp01((now - t0) / D);
      el.textContent = fmt(to * (1 - Math.pow(1 - t, 4)));
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- 視差：圖片在框裡跟著捲動慢慢位移 ---------- */
  const pars = $$('[data-par]');
  const drawPar = () => pars.forEach(img => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const off = (r.top + r.height / 2 - innerHeight / 2) * -(+img.dataset.par);
    img.style.transform = `translateY(${off.toFixed(1)}px) scale(1.14)`;
  });

  /* ---------- 跑馬燈：等速循環；捲動越快跑得越快，往上捲時反向，並跟著速度傾斜 ---------- */
  const mqs = $$('.mq').map(el => ({ el, inner: el.querySelector('.mq-in'), base: +el.dataset.mq || 40, x: 0, w: 1, on: false, sk: 0 }));
  const fillMq = m => {
    const set = m.inner.firstElementChild;
    [...m.inner.children].slice(1).forEach(c => c.remove());
    m.w = set.offsetWidth || 1;
    const need = Math.ceil(m.el.clientWidth / m.w) + 1;
    for (let i = 0; i < need; i++) m.inner.appendChild(set.cloneNode(true));
  };
  mqs.forEach(fillMq);
  const mqIO = new IntersectionObserver(es => es.forEach(e => { const m = mqs.find(q => q.el === e.target); if (m) m.on = e.isIntersecting; }));
  mqs.forEach(m => mqIO.observe(m.el));

  /* ---------- 底色漸變：依畫面中間是哪一段，在兩段的顏色之間漸變 ---------- */
  const wash = $('#wash');
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const marks = $$('[data-bg]').map(el => ({ el, c: hex(el.dataset.bg) }));
  let washC = '';
  const drawWash = () => {
    if (!marks.length) return;
    const cy = innerHeight / 2, tops = marks.map(m => m.el.getBoundingClientRect().top);
    let i = 0;
    tops.forEach((t, k) => { if (t <= cy) i = k; });
    const j = Math.min(marks.length - 1, i + 1);
    const t = j === i ? 0 : 1 - clamp01((tops[j] - cy) / (innerHeight * .5));
    const s = t * t * (3 - 2 * t);
    const c = marks[i].c.map((v, k) => Math.round(lerp(v, marks[j].c[k], s)));
    const css = `rgb(${c.join(',')})`;
    if (css !== washC) { washC = css; wash.style.background = css; }
  };

  /* ---------- 轉場 1：蝴蝶群從畫面下方中間飛出去 ---------- */
  const KS = ['idea', 'euploea', 'tirumala', 'kallima', 'demoleus', 'polytes'];
  const flyHTML = k => {
    const bg = `style="background-image:url(assets/${k}-fly.png)"`;
    return `<div class="bf bf-img"><div class="bf-3d"><i class="wl" ${bg}></i><i class="wr" ${bg}></i><i class="bd" ${bg}></i></div></div>`;
  };
  const swarmBox = $('#swarm');
  let lastSwarm = -1e4, hold = false;
  const swarm = (n = 26) => {
    if (reduce || !document.body.classList.contains('started')) return;
    const now = performance.now();
    if (now - lastSwarm < 1800) return;
    lastSwarm = now;
    const W = innerWidth, H = innerHeight, sx = W / 2, sy = H + 50;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'sw flap';
      el.style.setProperty('--flap', (.1 + Math.random() * .08).toFixed(2) + 's');
      el.innerHTML = flyHTML(KS[i % KS.length]);
      swarmBox.appendChild(el);
      // 往上方扇形散開，終點一定在畫面外
      const ang = (-90 + (Math.random() * 2 - 1) * 78) * Math.PI / 180;
      const R = Math.max(W, H) * 1.05 + Math.random() * 260;
      const ex = sx + Math.cos(ang) * R, ey = sy + Math.sin(ang) * R;
      const cx = sx + (ex - sx) * .25 + (Math.random() - .5) * W * .45, cy = sy - H * (.25 + Math.random() * .35);
      const sx0 = sx + (Math.random() - .5) * 60, size = .55 + Math.random() * .7, wob = 8 + Math.random() * 14;
      const at = t => { const u = 1 - t; return [u * u * sx0 + 2 * u * t * cx + t * t * ex, u * u * sy + 2 * u * t * cy + t * t * ey]; };
      const frames = Array.from({ length: 21 }, (_, k) => {
        const t = k / 20, [x, y] = at(t), [x2, y2] = at(Math.min(1, t + .03));
        const rot = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 90 + Math.sin(t * 9 + i) * wob;
        return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${(size * (.45 + t * .75)).toFixed(3)})`, opacity: Math.min(1, t * 8) };
      });
      el.animate(frames, { duration: 1700 + Math.random() * 900, delay: i * 45, easing: 'cubic-bezier(.3,.1,.55,1)', fill: 'both' })
        .finished.then(() => el.remove(), () => el.remove());
    }
  };
  // 只飛一次：第一次由首頁轉到摘要時
  let swarmed = false;
  $('#story').addEventListener('pageenter', () => {
    if (swarmed || !document.body.classList.contains('started')) return;
    swarmed = true;
    swarm();
  });

  /* ---------- 共用 ---------- */
  const poly = pts => `polygon(${pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',')})`;
  const lerpPts = (P, Q, t) => P.map((p, i) => [lerp(p[0], Q[i][0], t), lerp(p[1], Q[i][1], t)]);
  const smooth = t => t * t * (3 - 2 * t);
  const scrollP = r => clamp01((innerHeight - r.top) / (innerHeight + r.height));   // 0 = 剛從下方進來，1 = 從上方離開
  const pinP = r => clamp01(-r.top / Math.max(1, r.height - innerHeight));         // 被釘住的區塊：釘住期間 0 → 1
  const inView = (r, m = 0) => r.bottom > -m && r.top < innerHeight + m;
  const mixRGB = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
  const narrow = () => innerWidth <= 860;

  /* ---------- 構造：右邊的輪盤文字隨捲動轉到正在介紹的部位，下方圖片與說明跟著換 ---------- */
  const ks = $('#k-struct'), ksWords = $$('#ksWheel span'), ksPans = $$('#ksInfo .ks-pan');
  const ksImg = $('#ksImg'), ksCapT = $('#ksCapT'), ksCapN = $('#ksCapN');
  const KS_OY = ['14%', '42%', '78%'], KS_STEP = 34;      // 每個部位在大圖上的位置；輪盤每格的角度
  // 停頓式的進度：每一格中間停一下，兩格之間才轉
  const steps = (p, n) => { const x = p * (n - 1), i = Math.min(n - 2, Math.floor(x)); return i + smooth(clamp01((x - i - .2) / .6)); };
  let ksCur = -1;
  const drawStruct = () => {
    if (!ks) return;
    const r = ks.getBoundingClientRect();
    if (!inView(r)) return;
    const a = reduce ? Math.round(pinP(r) * 2) : steps(pinP(r), ksWords.length);
    const F = parseFloat(getComputedStyle(ksWords[0]).fontSize) || 100, R = F * 1.15 / Math.sin(KS_STEP * Math.PI / 180);
    ksWords.forEach((w, i) => {
      const d = i - a;
      w.style.transform = `translateZ(${-R.toFixed(1)}px) rotateX(${(-d * KS_STEP).toFixed(2)}deg) translateZ(${R.toFixed(1)}px)`;
      // 目前的部位全亮、上下一格淡淡的；再遠就完全隱藏，避免字擠在一起
      const ad = Math.abs(d);
      w.style.opacity = (ad <= 1 ? 1 - ad * .78 : Math.max(0, .22 * (1.5 - ad) / .5)).toFixed(3);
    });
    const cur = Math.round(a);
    if (cur === ksCur) return;
    ksCur = cur;
    ksPans.forEach((p, i) => p.classList.toggle('on', i === cur));
    ksImg.style.setProperty('--oy', KS_OY[cur]);
    ksCapT.textContent = ksPans[cur].querySelector('h3').textContent;
    ksCapN.textContent = String(cur + 1).padStart(2, '0');
  };

  /* ---------- 生活史：階段名稱橫向滑過中間那一欄（欄內變深色），說明與圖片跟著換 ---------- */
  const kc = $('#k-cycle'), kcTracks = $$('#k-cycle .kc-track'), kcPans = $$('#kcTxt .kc-pan'), kcStrip = $('#kcStrip');
  const kcCapT = $('#kcCapT'), kcCapN = $('#kcCapN');
  let kcCur = -1;
  const drawCycle = () => {
    if (!kc) return;
    const r = kc.getBoundingClientRect();
    if (!inView(r)) return;
    const n = kcPans.length, a = reduce ? Math.round(pinP(r) * (n - 1)) : steps(pinP(r), n);
    const slot = kcTracks[0].firstElementChild.offsetWidth;
    kcTracks.forEach(t => { t.style.transform = `translateX(${(-a * slot).toFixed(1)}px)`; });
    kcStrip.style.transform = `translateX(${(-a * 100).toFixed(3)}%)`;
    const cur = Math.round(a);
    if (cur === kcCur) return;
    kcCur = cur;
    kcPans.forEach((p, i) => p.classList.toggle('on', i === cur));
    kcCapT.textContent = kcPans[cur].querySelector('h4').textContent;
    kcCapN.textContent = String(cur + 1).padStart(2, '0');
  };
  /* ---------- 型態分類：滑過科名 → 文字、圖片跟著換 ---------- */
  const kfBtns = $$('#kfList button'), kfPics = $$('#kfImg .kf-pic'), kfPans = $$('#kfInfo .kf-pan');
  kfPans.forEach(p => p.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--k', i)));
  const setFam = i => {
    kfBtns.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', k === i); });
    kfPics.forEach((p, k) => p.classList.toggle('on', k === i));
    kfPans.forEach((p, k) => p.classList.toggle('on', k === i));
  };
  kfBtns.forEach((b, i) => ['pointerenter', 'focus', 'click'].forEach(ev => b.addEventListener(ev, () => setFam(i))));
  setFam(0);
  // 進場：主標先浮出來 → 大綱 → 內文（只播一次）
  const kf = $('#k-family');
  if (kf) {
    $$('#kfList li').forEach((li, i) => li.style.setProperty('--k', i + 1));
    if (reduce) kf.classList.add('in');
    else {
      const kfIO = new IntersectionObserver(([e]) => { if (e.isIntersecting) { kf.classList.add('in'); kfIO.disconnect(); } }, { threshold: .2 });
      kfIO.observe(kf);
    }
  }

  /* ---------- 天敵與常識：點開／收合（一次只開一項） ---------- */
  const faqs = $$('#kfaq li');
  const openFaq = li => faqs.forEach(x => {
    const on = x === li && !x.classList.contains('open');
    x.classList.toggle('open', on);
    x.querySelector('button').setAttribute('aria-expanded', on);
  });
  faqs.forEach(li => li.querySelector('button').addEventListener('click', () => openFaq(li)));
  if (faqs[0]) openFaq(faqs[0]);

  /* ---------- 結語：捲動驅動的三角形遮罩展開 ---------- */  const tri = $('#k-end'), triIn = $('#triIn');
  const drawTri = () => {
    if (!tri) return;
    const r = tri.getBoundingClientRect();
    if (!inView(r)) return;
    const e = reduce ? 1 : smooth(clamp01(pinP(r) / .9));
    if (e >= 1) { triIn.style.clipPath = 'none'; return; }
    const h = 4 + 280 * e * e, w = 3 + 230 * e * e;                 // 先是小三角形，越後面張得越快
    triIn.style.clipPath = poly([[50, 100 - h], [50 + w, 104], [50 - w, 104]]);
  };

  /* ---------- 知識區轉場：橫向條帶遮罩揭露＋黑白主題切換＋大字排版動畫 ----------
     新主題那層切成 N 條橫向條帶（每條裡面放一份完整的內容，位置對齊），
     條帶交錯從左右兩側展開蓋住舊內容；舊的大字橫移後往上被裁掉，新的大字從裁切處升上來 */
  const KTN = 6;
  const kts = $$('.kt').map(el => {
    const pin = el.querySelector('.kt-pin'), b = el.querySelector('.kt-b'), html = b.innerHTML;
    const bands = Array.from({ length: KTN }, (_, i) => {
      const band = document.createElement('div');
      band.className = 'kt-band';
      band.style.cssText = `top:${(i * 100 / KTN).toFixed(4)}%;height:${(100 / KTN + .05).toFixed(4)}%`;
      band.innerHTML = `<div class="kt-lay kt-b" style="top:${-i * 100}%;height:${KTN * 100}%">${html}</div>`;
      pin.appendChild(band);
      return band;
    });
    b.remove();
    return { el, pin, bands, toDark: el.dataset.to === 'dark', e0: 0 };
  });
  const drawKt = () => kts.forEach(o => {
    const r = o.el.getBoundingClientRect();
    if (!inView(r)) return;
    const p = reduce ? 1 : pinP(r);
    o.bands.forEach((band, i) => {
      // 單數列先、雙數列後；偶數條由左往右展開，奇數條由右往左
      const e = smooth(clamp01((p - .04 - (i % 2) * .18 - (i >> 1) * .05) / .38));
      if (i === 0) o.e0 = e;
      const cut = ((1 - e) * 100).toFixed(2) + '%';
      band.style.clipPath = e >= 1 ? 'none' : i % 2 ? `inset(0 0 0 ${cut})` : `inset(0 ${cut} 0 0)`;
    });
    for (let i = 0; i < 3; i++) {
      o.pin.style.setProperty('--a' + i, clamp01((p - .02 - i * .05) / .6).toFixed(4));
      o.pin.style.setProperty('--b' + i, smooth(clamp01((p - .3 - i * .08) / .4)).toFixed(4));
    }
  });

  /* ---------- 導覽列：畫面最上方是黑底時改成淺色字 ---------- */
  const darkSecs = $$('.k-dark'), root = document.documentElement, foot = $('#foot');
  let navDark = false;
  const drawNavTheme = () => {
    const y = 34;
    const hit = r => r.top < y && r.bottom > y;
    let d = darkSecs.some(el => hit(el.getBoundingClientRect()));
    kts.forEach(o => { if (hit(o.el.getBoundingClientRect())) d = (o.e0 > .5) === o.toDark; });
    if (d === navDark) return;
    navDark = d;
    root.classList.toggle('k-dark-top', d);
    nav.classList.toggle('on-dark', d || (foot && foot.getBoundingClientRect().top < 68));
  };

  /* ---------- 視差轉場：背景植物慢、大字橫移、蝴蝶快 ---------- */
  const pbs = $$('.pband').map(el => ({ el, bg: el.querySelector('.pb-bg'), t: el.querySelector('.pb-t'), fly: el.querySelector('.pb-fly') }));
  const drawPb = () => pbs.forEach((o, n) => {
    const r = o.el.getBoundingClientRect();
    if (!inView(r)) return;
    const d = (reduce ? .5 : scrollP(r)) - .5, dir = n % 2 ? -1 : 1;
    o.bg.style.transform = `translate(-50%, -50%) translateY(${(d * 34).toFixed(2)}vh) scale(1.1)`;
    o.t.style.transform = `translate(calc(-50% + ${(d * -60 * dir).toFixed(2)}vw), -50%)`;
    o.fly.style.transform = `translate(-50%, -50%) translate(${(d * 34 * dir).toFixed(2)}vw, ${(d * -130).toFixed(2)}vh) rotate(${(d * 36 * dir).toFixed(1)}deg)`;
  });
  // 區塊離開時，內容比捲動慢一點往上走、稍微變淡（視差）
  const leavers = ['#play1', '#play2', '#play3'].map(s => $(s)).filter(Boolean)
    .map(sec => ({ sec, w: sec.querySelector(':scope > .wrap') })).filter(o => o.w);
  const drawLeave = () => leavers.forEach(o => {
    const r = o.sec.getBoundingClientRect();
    if (!inView(r)) return;
    const q = reduce ? 0 : clamp01((innerHeight * .6 - r.bottom) / (innerHeight * .6));
    o.w.style.transform = q ? `translateY(${(q * innerHeight * .22).toFixed(1)}px)` : '';
    o.w.style.opacity = q ? (1 - q * .5).toFixed(3) : '';
  });

  /* ---------- 主迴圈 ---------- */
  let vel = 0, lastY = scrollY, flip = 1, lastT = 0;
  const loop = now => {
    const dt = Math.min(.05, (now - lastT) / 1000 || .016);
    lastT = now;
    const dy = scrollY - lastY;
    lastY = scrollY;
    if (Math.abs(dy) > .5) flip = dy > 0 ? 1 : -1;
    vel = lerp(vel, dy, .18);
    if (!reduce) mqs.forEach(m => {
      if (!m.on) return;
      const sp = m.base * (1 + Math.min(7, Math.abs(vel) * .09)) * flip;
      m.x -= sp * dt;
      m.x = ((m.x % m.w) - m.w) % m.w;
      m.sk = lerp(m.sk, Math.max(-10, Math.min(10, -vel * .35)), .12);
      m.inner.style.transform = `translateX(${m.x.toFixed(1)}px) skewX(${m.sk.toFixed(2)}deg)`;
    });
    drawScrub();
    drawPar();
    drawStruct();
    drawCycle();
    drawTri();
    drawKt();
    drawNavTheme();
    drawPb();
    drawLeave();
    drawWash();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  let rT = 0;
  addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { splitAll(false); mqs.forEach(fillMq); }, 150);
  });
  const relayout = () => { splitAll(true); mqs.forEach(fillMq); };
  if (document.fonts) {
    document.fonts.ready.then(relayout);
    document.fonts.addEventListener('loadingdone', relayout);      // 之後才載入的字重（例如黑體粗體）也要重新換行
  }
  addEventListener('load', relayout);
  // 中／EN 切換（main.js）：段落重新切行、跑馬燈重新排、右下角的編號說明重新寫
  document.addEventListener('langchange', () => { relayout(); ksCur = kcCur = -1; });
})();