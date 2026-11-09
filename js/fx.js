/* 版面動態（接在 main.js 後面）：
   跑馬燈、逐行揭露、數字跳動、圖片視差、
   各區塊底色漸變、知識區的捲動編排（構造輪盤文字、生活史橫向滑動、分類依序進場、可展開清單、三角遮罩、條帶轉場）、視差轉場、蝴蝶群（只飛一次） */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const LAG = { s: scrollY, v: 0 };                     // 捲動延遲量（drawCards 每格更新），卡片與大字用來做「落後一點」的延遲效果
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nav = $('#nav');

  /* ---------- 文字：逐行遮罩揭露（依瀏覽器實際換行切成一行一行） ---------- */
  const lineEls = $$('[data-tx="lines"]');
  lineEls.forEach(el => { el.dataset.raw = el.textContent.trim().replace(/\s+/g, ' '); });
  const BR = '';                                    // 強制換行的記號（HTML 裡的 <br>，main.js 先換成這個字元）
  const splitLines = el => {
    const txt = el.dataset.raw, chars = [...txt], glyphs = chars.filter(c => c !== BR);
    el.innerHTML = chars.map(c => c === BR ? '<br>' : `<span class="lc">${esc(c)}</span>`).join('');
    const lines = [];
    let top = null, cur = '';
    el.querySelectorAll('.lc').forEach((s, i) => {
      const t = s.offsetTop;
      if (top !== null && t > top + 2) { lines.push(cur); cur = ''; }
      if (top === null || t > top + 2) top = t;
      cur += glyphs[i];
    });
    lines.push(cur);
    el.innerHTML = `<span class="sr-only">${esc(txt.split(BR).join(' '))}</span>` +
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

  /* ---------- 摘要：浮動光點＋游標暖光（慢慢跟上游標，帶一點延遲，比較沉穩） ---------- */
  {
    const st = $('#story'), bok = st && st.querySelector('.story-bokeh'), glow = st && st.querySelector('.story-glow');
    if (bok) {
      const R = (a, b) => a + Math.random() * (b - a);
      bok.innerHTML = Array.from({ length: 16 }, () =>
        `<i style="--x:${R(2, 96).toFixed(1)}%;--y:${R(4, 92).toFixed(1)}%;--s:${R(14, 90).toFixed(0)}px;--b:${R(2, 10).toFixed(1)}px;--o:${R(.25, .7).toFixed(2)};` +
        `--d:${R(9, 18).toFixed(1)}s;--dl:${(-R(0, 18)).toFixed(1)}s;--mx:${R(-40, 40).toFixed(0)}px;--my:${R(-60, -10).toFixed(0)}px"></i>`).join('');
    }
    if (st && glow && !reduce) {
      let tx = 0, ty = 0, gx = null, gy = 0, raf = 0;
      const step = () => {
        gx = gx === null ? tx : gx + (tx - gx) * .08; gy = gy + (ty - gy) * .08;
        st.style.setProperty('--gx', gx.toFixed(1) + 'px'); st.style.setProperty('--gy', gy.toFixed(1) + 'px');
        raf = Math.abs(tx - gx) + Math.abs(ty - gy) > .3 ? requestAnimationFrame(step) : 0;
      };
      st.addEventListener('pointermove', e => {
        const r = st.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (gx === null) gy = ty;
        st.classList.add('glow-on');
        if (!raf) raf = requestAnimationFrame(step);
      });
      st.addEventListener('pointerleave', () => st.classList.remove('glow-on'));
    }
  }

  /* ---------- 結語「若我們要去了解蝴蝶，只要種植相關植物即可」：點擊畫面種植物 ----------
     點哪裡，就從那一點慢慢長出一株植物或花朵（從根部往上長，長好後隨風輕擺）；
     種得越多，背景從深色漸漸變成綠色的草地漸層；最多留 60 株，再多就把最早種的換掉 */
  {
    const tin = $('#triIn'), box = $('#triPlants'), hint = $('#triHint');
    if (tin && box) {
      // 兩款花輪流隨機出現：g1 白藍色小花、g8 黃色百合（都是從上往下看）；每朵大小、角度都不同
      const FLOWERS = ['assets/garden/g1.png', 'assets/garden/g8.png'];
      let count = 0, bag = [];
      const plant = (x, y) => {
        const el = document.createElement('img');
        if (!bag.length) bag = [0, 1].sort(() => Math.random() - .5);               // 兩款都會出現，不會連續太多同一款
        el.src = FLOWERS[bag.pop()]; el.alt = '';
        el.className = 'tp';
        const r = tin.getBoundingClientRect();
        const size = 46 + Math.random() * Math.random() * 120;                        // 大多是中小朵，偶爾一朵大的
        el.style.cssText = `left:${x - r.left}px;top:${y - r.top}px;width:${size.toFixed(0)}px;` +
          `--rot:${(Math.random() * 360).toFixed(1)}deg;--sw:${(3 + Math.random() * 3).toFixed(1)}s;--sh:${(size * .1).toFixed(1)}px;z-index:${Math.round(size)}`;
        box.appendChild(el);
        if (box.children.length > 60) box.firstElementChild.remove();
        count++;
        const g = Math.min(1, count / 14);
        tin.style.setProperty('--g', g.toFixed(3));                                       // 背景變亮的程度
        tin.classList.toggle('bright', g >= .5);                                          // 背景夠亮了，文字改深色
        if (hint && count >= 3) hint.classList.add('off');
      };
      // 捲回前面的頁面（這一段整個退到畫面下方）就重置：植物清空、背景變回原樣、提示重新出現
      const reset = () => {
        if (!count) return;
        count = 0; bag = [];
        box.textContent = '';
        tin.style.setProperty('--g', 0);
        tin.classList.remove('bright');
        if (hint) hint.classList.remove('off');
      };
      const endSec = $('#k-end');
      if (endSec && 'IntersectionObserver' in window)
        new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && e.boundingClientRect.top > 0) reset(); })).observe(endSec);
      // 改成跟著游標的路徑：滑鼠在畫面上移動，每走約 70px 就在路徑上綻放一朵花（不用點擊）
      let lx = null, ly = null, acc = 0;
      tin.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        if (lx === null) { lx = e.clientX; ly = e.clientY; return; }
        acc += Math.hypot(e.clientX - lx, e.clientY - ly);
        lx = e.clientX; ly = e.clientY;
        if (acc < 70) return;
        acc = 0;
        plant(e.clientX + (Math.random() - .5) * 24, e.clientY + (Math.random() - .5) * 24);
      });
      tin.addEventListener('pointerleave', () => { lx = ly = null; acc = 0; });
      tin.addEventListener('click', e => {                       // 觸控裝置沒有游標路徑：點一下仍可種
        if (e.target.closest('a,button')) return;
        plant(e.clientX, e.clientY);
      });
    }
  }

  /* ---------- 知識區～天敵與常識：捲動視差（背景、中景、前景以不同速度移動 → 深度感） ----------
     背景：一整片連續的「植物背景」（模糊、淡淡的小植物），移動最慢；分兩段，各自從頭到尾連續不中斷：
       A 段：知識（「蝴蝶」大字、簡介）→ 轉場 Small Wings, Wide World
       B 段：轉場 One Life, Four Forms → 生活史 → 型態分類 → 臺灣，蝴蝶王國 → 從利用，轉為保育 → 天敵與常識
       作法：植物的位置記在「整段」的座標上，每個區塊（含被釘住的畫面、轉場的淺色層）各放一份，
       每格依整段的捲動位置換算到該區塊裡 → 跨區塊時位置完全接得上，看起來是同一片背景
     中景：各段原本的標題、說明、地圖（只差一點點，讓標題和內文微微錯開）
     前景：靠畫面左右邊緣、模糊的大葉子，移動最快（往前衝），不擋閱讀、不擋滑鼠
     用 CSS 的 translate 屬性位移，不會蓋掉元素原本的 transform 動畫 */
  const depthEls = [];
  const PLANTS = ['fern', 'oak', 'ivy', 'beech', 'sprig', 'frond', 'poppy', 'blossom'].map(k => `assets/p-${k}.png`);
  const Rnd = (a, b) => a + Math.random() * (b - a);
  {
    const SECS = [
      { sel: '#k-body', mid: [['.kb-meta', .05], ['.kb-txt', -.05]] },
      { sel: '#k-family', mid: [] },
      { sel: '#k-kingdom', mid: [['.kq-t', .1], ['.tw-map', -.08], ['.kq-txt', -.03]] },
      { sel: '#k-enemy', mid: [] }   // 天敵與常識：標題、說明、清單都固定，不做視差（避免文字錯開跑掉）
    ];
    SECS.forEach(({ sel, mid }, n) => {
      const sec = $(sel);
      if (!sec) return;
      sec.classList.add('px-host');
      const front = document.createElement('div');
      front.className = 'px-layer px-front';
      front.setAttribute('aria-hidden', 'true');
      // 前景：左右邊緣各一片大葉子，模糊、移動最快
      [0, 1].forEach(side => {
        const im = document.createElement('img');
        im.src = PLANTS[(side * 3 + n) % 6]; im.alt = ''; im.className = 'px-leaf px-near';
        im.style.cssText = `${side ? 'right' : 'left'}:${Rnd(-6, -2).toFixed(1)}vw;top:${Rnd(20, 75).toFixed(1)}%;width:${Rnd(150, 230).toFixed(0)}px;` +
          `transform:rotate(${(side ? 1 : -1) * Rnd(15, 45).toFixed(0)}deg) scaleX(${side ? -1 : 1});opacity:.5;filter:blur(${Rnd(5, 8).toFixed(1)}px)`;
        front.appendChild(im);
        depthEls.push({ el: im, sec, d: Rnd(-.55, -.4) });
      });
      sec.appendChild(front);
      mid.forEach(([s, d]) => { const el = sec.querySelector(s); if (el) depthEls.push({ el, sec, d }); });
    });
  }
  // 連續背景：第一次畫的時候才建立（轉場的條帶要等前面的程式建好）
  let bgRanges = null;
  const buildBg = () => {
    const kt1 = $('.kt[data-to="dark"]'), kt2 = $('.kt[data-to="light"]');
    const RANGES = [
      { from: $('#dock') || $('#k-body'), to: kt1,
        hosts: ['.dock-space', '#k-body', '.kt[data-to="dark"] .kt-pin > .kt-a'] },
      { from: kt2, to: $('#k-enemy'),
        hosts: ['.kt[data-to="light"] .kt-band > .kt-lay', '#k-cycle .kc-pin', '#k-family .ks-pin', '#k-kingdom', '#k-conserve', '#k-enemy'] }
    ];
    bgRanges = RANGES.filter(r => r.from && r.to).map(rg => {
      // 植物鋪滿整段：每 30vh 左右一株，大多靠左右兩側，少數在中間（更淡）
      const top0 = rg.from.getBoundingClientRect().top + scrollY;
      const len = rg.to.getBoundingClientRect().bottom + scrollY - top0;
      const step = innerHeight * .3, items = [];
      for (let y = 0; y < len + innerHeight; y += step) {
        const side = Math.random();
        const x = side < .42 ? Rnd(1, 20) : side < .84 ? Rnd(80, 98) : Rnd(28, 72);
        items.push({ x, y: y + Rnd(-step * .3, step * .3), w: Rnd(46, 96), rot: Rnd(-60, 60), op: side >= .84 ? Rnd(.07, .11) : Rnd(.12, .2),
          blur: Rnd(1.5, 4), d: Rnd(.32, .5), src: PLANTS[(Math.random() * PLANTS.length) | 0] });
      }
      const hostEls = rg.hosts.flatMap(s => $$(s)).map(h => {
        h.classList.add('pxbg-host');
        const box = document.createElement('div');
        box.className = 'pxbg';
        box.setAttribute('aria-hidden', 'true');
        box.innerHTML = items.map(it => `<img src="${it.src}" alt="" style="width:${it.w.toFixed(0)}px;opacity:${it.op.toFixed(2)};filter:blur(${it.blur.toFixed(1)}px)">`).join('');
        h.prepend(box);
        return { h, imgs: [...box.children] };
      });
      return { from: rg.from, items, hostEls, top0 };
    });
  };
  const drawDepth = () => {
    if (reduce) return;
    const vh = innerHeight;
    for (const o of depthEls) {
      const r = o.sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      // 這一段往上捲走時，d 為正的往下補一點 → 比捲動慢；d 為負的往上多走一點 → 比捲動快（前景）
      const off = -(r.top + r.height / 2 - vh / 2) * o.d;
      o.el.style.translate = `0 ${off.toFixed(1)}px`;
    }
    if (!bgRanges) buildBg();
    for (const rg of bgRanges) {
      let base = rg.from.getBoundingClientRect().top;            // 整段起點目前在畫面上的位置
      // 生活史被釘住、捲動換階段的這段時間，背景素材停在原地不動；之後整片再一起往上走（前後仍接得上）
      if (kc && rg.hostEls.some(o => kc.contains(o.h))) {
        const kr = kc.getBoundingClientRect();
        base += Math.max(0, Math.min(-kr.top, kr.height - vh));
      }
      for (const { h, imgs } of rg.hostEls) {
        const hr = h.getBoundingClientRect();
        if (hr.bottom < 0 || hr.top > vh || !hr.height) continue;
        rg.items.forEach((it, i) => {
          const sy = base + it.y;                                  // 不加視差時，這株植物在畫面上的高度
          const vy = sy - (sy - vh / 2) * it.d;                    // 視差：越接近畫面中心越準，越遠移動越慢
          const img = imgs[i];
          if (vy < -160 || vy > vh + 160) { if (img.style.display !== 'none') img.style.display = 'none'; return; }
          if (img.style.display) img.style.display = '';
          const vx = it.x / 100 * innerWidth;
          img.style.transform = `translate(${(vx - hr.left).toFixed(1)}px,${(vy - hr.top).toFixed(1)}px) translate(-50%,-50%) rotate(${it.rot.toFixed(0)}deg)`;
        });
      }
    }
  };

  /* ---------- 知識開頭「知蝶百識」：每個字從一團煙裡慢慢浮現，煙往外擴散、往上飄散；捲離後重置，下次再播 ---------- */
  {
    const st = $('#smokeT');
    if (st) {
      const render = () => {
        const chars = [...st.textContent.trim()];
        st.innerHTML = `<span class="sr-only">${esc(chars.join(''))}</span>` + chars.map((c, i) =>
          `<span class="sc" aria-hidden="true" style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('') +
          chars.map((c, i) => `<i class="sw" aria-hidden="true" style="--i:${i};--x:${((i + .5) / chars.length * 100).toFixed(1)}%;--dx:${((Math.random() - .5) * 3).toFixed(2)}em"></i>`).join('');
      };
      render();
      document.addEventListener('langchange', () => { const on = st.classList.contains('in'); st.classList.remove('in'); render(); if (on) requestAnimationFrame(() => st.classList.add('in')); });
      if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > .6) st.classList.add('in');
        else if (!e.isIntersecting) st.classList.remove('in');
      }), { threshold: [0, .6] }).observe(st);
      else st.classList.add('in');
    }
  }

  /* ---------- 六種蝴蝶的一生：六朵「花」 ----------
     每一朵的中心是成蟲＋名字，四周隨機散著這種蝴蝶的卵、幼蟲、蛹（角度彼此錯開，不會重疊）；
     捲到時三張圖從中心往外彈出；六朵左右交錯往下排，中間一條彎曲的線隨捲動畫到下一朵 */
  const kgFlow = (() => {
    const kg = $('#k-grow'), grid = kg && kg.querySelector('.kg-grid');
    if (!grid) return null;
    const rows = $$('#k-grow .kg-row:not(.kg-hd)');
    const flow = document.createElement('div');
    flow.className = 'kg-flow';
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
    svg.setAttribute('class', 'kg-line'); svg.setAttribute('aria-hidden', 'true');
    svg.appendChild(path); flow.appendChild(svg);
    const STAGE = [['卵', 'Egg'], ['幼蟲', 'Larva'], ['蛹', 'Pupa']];
    const flowers = rows.map((row, i) => {
      const imgs = [...row.querySelectorAll('.kg-cell img')];
      const f = document.createElement('div');
      f.className = 'kg-fl ' + (i % 2 ? 'r' : 'l');
      // 固定方位（依手繪）：卵在上方、幼蟲在右下、蛹在左下，各帶一點隨機偏移；出現順序：卵 → 蛹 → 幼蟲
      const ANG = [-90, 28, 152], ORDER = [0, 2, 1];
      f.innerHTML = `<div class="kg-core">${imgs[3] ? imgs[3].outerHTML : ''}${row.querySelector('.kg-name').innerHTML}</div>` +
        imgs.slice(0, 3).map((im, k) => {
          const a = (ANG[k] + (i % 2 && k === 0 ? 40 : 0) + (Math.random() - .5) * 24) * Math.PI / 180, rr = 1 + Math.random() * .12;
          return `<figure class="kg-sat" style="--x:${(Math.cos(a) * rr).toFixed(3)};--y:${(Math.sin(a) * rr).toFixed(3)};--k:${ORDER[k]};--rot:${Math.round(Math.random() * 40 - 20)}deg">${im.outerHTML}` +
            `<figcaption data-en="${STAGE[k][1]}">${STAGE[k][0]}</figcaption></figure>`;
        }).join('');
      flow.appendChild(f);
      return f;
    });
    grid.after(flow);
    grid.hidden = true;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in', e.isIntersecting)), { threshold: .35 });
      flowers.forEach(f => io.observe(f));
    } else flowers.forEach(f => f.classList.add('in'));
    // 連接線：經過每一朵花的中心，左右之間用 S 形曲線
    let len = 0;
    const layout = () => {
      const fr = flow.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
      // 線不穿過花：從這一朵的外側（朝下一朵那邊）出發，先橫向走、再彎下去，停在下一朵的上方
      const R = parseFloat(getComputedStyle(flow).getPropertyValue('--R')) || 180;
      const pts = flowers.map(f => { const c = f.querySelector('.kg-core').getBoundingClientRect(); return [c.left + c.width / 2 - fr.left, c.top + c.height / 2 - fr.top]; });
      let d = '';
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], dir = x1 > x0 ? 1 : -1;
        const ax = x0 + dir * R * 1.05, ay = y0 - R * .35, bx = x1 - dir * R * .15, by = y1 - R * 1.25;
        d += `M${ax.toFixed(0)} ${ay.toFixed(0)} C${(bx - dir * R * .2).toFixed(0)} ${ay.toFixed(0)} ${bx.toFixed(0)} ${(ay + (by - ay) * .3).toFixed(0)} ${bx.toFixed(0)} ${by.toFixed(0)} `;
      }
      path.setAttribute('d', d);
      len = path.getTotalLength();
      path.style.strokeDasharray = len;
    };
    layout();
    addEventListener('resize', layout);
    addEventListener('load', layout);
    return { flow, path, get len() { return len; } };
  })();
  // 開頭兩行大字：隨捲動往左右分開前進，過一半時明暗切換（米底黑字 ⇄ 黑底米字）
  const kgHead = $('#kgHead'), kgL1 = $('#kgHead .kg-ln1'), kgL2 = $('#kgHead .kg-ln2');
  const drawGrowHead = () => {
    if (!kgHead) return;
    const r = kgHead.getBoundingClientRect();
    if (!inView(r)) return;
    const p = reduce ? .5 : pinP(r);
    // 文字位移帶延遲：慢慢追上捲動位置（顏色仍用即時的 p，避免和前後區塊有色差）
    kgHead._d = kgHead._d == null || reduce ? p : kgHead._d + (p - kgHead._d) * .08;
    const d = (kgHead._d - .5) * 2;                              // -1 → 1
    // 捲動速度 → 文字傾斜（越快越斜，停下來慢慢回正）
    const v = scrollY - (kgHead._y ?? scrollY); kgHead._y = scrollY;
    kgHead._sk = (kgHead._sk || 0) + (Math.max(-28, Math.min(28, v * .45)) - (kgHead._sk || 0)) * .15;
    const sk = reduce ? 0 : kgHead._sk;
    kgL1.style.transform = `translateX(${(-d * 22).toFixed(2)}vw) skewX(${(-sk).toFixed(2)}deg)`;
    kgL2.style.transform = `translateX(${(d * 22).toFixed(2)}vw) skewX(${(-sk).toFixed(2)}deg)`;
    // 顏色直接跟著捲動位置算（不用時間漸變）：開頭剛好是米色、結尾剛好是深色 → 和前後區塊銜接時沒有色差
    const m = smooth(clamp01((p - .32) / .2));
    const mix = (a, b) => `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * m)).join(',')})`;
    kgHead.querySelector('.kg-pin').style.background = mix([246, 244, 239], [28, 26, 23]);
    const col = mix([15, 118, 82], [246, 244, 239]);
    kgL1.style.color = col; kgL2.style.color = col;
  };
  /* 六種蝴蝶「輪播畫面」（深色底，取代六朵花）：
     這一段被釘住，往下捲一次換一個畫面：大標＝蝴蝶名稱、主圖＝成蟲；
     游標靠近主圖時，四周彈出卵、蛹、幼蟲，成蟲變灰；
     底下一條進度線，每個畫面一個節點；最後一個畫面是「型態分類」大標＋說明（接到下一段） */
  const kgShow = (() => {
    const kg = $('#k-grow'), grid = kg && kg.querySelector('.kg-grid');
    if (!grid) return null;
    const rows = $$('#k-grow .kg-row:not(.kg-hd)');
    const box = document.createElement('div');
    box.className = 'kgs k-dark';   // k-dark：捲到這裡時頂部選單改淺色字
    const att = (el, a) => el && el.hasAttribute(a) ? ` ${a}="${el.getAttribute(a).replace(/"/g, '&quot;')}"` : '';
    const STAGE = [['卵', 'Egg'], ['幼蟲', 'Larva'], ['蛹', 'Pupa']];
    const screens = rows.map((row, i) => {
      const imgs = [...row.querySelectorAll('.kg-cell img')], b = row.querySelector('.kg-name b'), la = row.querySelector('.kg-name i');
      const chars = [...b.textContent];   // 蝴蝶名稱逐字從煙霧裡浮現
      return `<section class="kgs-sc">` +
        `<h3 class="kgs-t"><span class="sr-only">${b.textContent}</span>${chars.map((ch, k) => `<span class="sc" aria-hidden="true" style="--i:${k}">${ch}</span>`).join('')}` +
        `${chars.map((ch, k) => `<i class="sw" aria-hidden="true" style="--i:${k};--x:${((k + .5) / chars.length * 100).toFixed(1)}%;--dx:${((Math.random() - .5) * 2).toFixed(2)}em"></i>`).join('')}</h3>` +
        `<p class="kgs-la">${la ? la.textContent : ''}</p>` +
        `<div class="kgs-stage"><div class="kgs-adult">${imgs[3] ? imgs[3].outerHTML : ''}</div>` +
        imgs.slice(0, 3).map((im, k) => `<figure class="kgs-sat kgs-s${k}">${im.outerHTML}<figcaption data-en="${STAGE[k][1]}">${STAGE[k][0]}</figcaption></figure>`).join('') +
        `</div></section>`;
    });
    screens.push(`<section class="kgs-sc kgs-end"><h3 class="kgs-big" data-en="Families">型態分類</h3>` +
      `<p class="kgs-txt" data-en="From wing shape and colour to body features — meet Taiwan's five butterfly families and discover what makes each one unique.">從翅膀的形狀、色彩到身體特徵，認識臺灣蝴蝶的五大科，發現牠們各具特色的模樣。</p></section>`);
    const n = screens.length;
    box.style.height = (n * 90 + 30) + 'vh';
    box.innerHTML = `<div class="kgs-pin"><div class="kgs-track">${screens.join('')}</div>` +
      `<div class="kgs-bar"><i class="kgs-fill"></i>${screens.map((_, i) => `<b class="kgs-dot" style="left:${(i / (n - 1) * 100).toFixed(2)}%"><span>${String(i + 1).padStart(2, '0')}</span></b>`).join('')}</div></div>`;
    kg.querySelector('.wrap').appendChild(box);
    grid.hidden = true;
    const scs = [...box.querySelectorAll('.kgs-sc')], dots = [...box.querySelectorAll('.kgs-dot')];
    // 游標靠近主圖 → 彈出三個階段、成蟲變灰
    scs.forEach(sc => {
      const st = sc.querySelector('.kgs-stage');
      if (!st) return;
      st.addEventListener('pointerenter', () => sc.classList.add('reveal'));
      st.addEventListener('pointerleave', () => sc.classList.remove('reveal'));
    });
    return { box, track: box.querySelector('.kgs-track'), fill: box.querySelector('.kgs-fill'), scs, dots, n, cur: -1 };
  })();
  const drawShow = () => {
    const s = kgShow;
    if (!s) return;
    const r = s.box.getBoundingClientRect();
    if (!inView(r)) return;
    const p = reduce ? 0 : pinP(r), i = Math.min(s.n - 1, Math.floor(p * s.n));
    if (i === s.cur) return;
    // 進度線只停在節點上（不會停在兩個節點中間）；換畫面時用 CSS 轉場延遲、平滑地走到下一個節點
    s.fill.style.transform = `scaleX(${(i / (s.n - 1)).toFixed(4)})`;
    s.cur = i;
    s.track.style.transform = `translateX(${-i * 100}%)`;
    s.scs.forEach((sc, k) => sc.classList.toggle('on', k === i));
    s.dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('past', k < i); });
  };
  const drawGrow = () => {
    drawGrowHead();
    drawShow();
    if (!kgFlow) return;
    const r = kgFlow.flow.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    const p = reduce ? 1 : clamp01((innerHeight * .55 - r.top) / r.height);   // 線頭大約跟著畫面中線往下走
    kgFlow.path.style.strokeDashoffset = (kgFlow.len * (1 - p)).toFixed(1);
  };

  /* ---------- 臺灣，蝴蝶王國：捲到時地圖浮現、定位標籤落下指著南投埔里；離開後重置，下次再播 ---------- */
  {
    const tw = $('#twMap');
    if (tw && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= .45) tw.classList.add('in');
        else if (!e.isIntersecting) tw.classList.remove('in');
      }), { threshold: [0, .45] }).observe(tw);
    } else if (tw) tw.classList.add('in');
  }

  /* ---------- 摘要：一列毛毛蟲沿著一條「勾形」路線排隊前進（參考環形文字的編排，文字換成毛毛蟲） ----------
     毛毛蟲用結尾轉場那幾隻（assets/larvae/larva1–6.png，頭朝下）；一直沿路線往前爬，走到盡頭再從起點繞回來；
     路線的頭尾兩端漸漸透明，看起來像從空氣中爬出來、又爬進去 */
  const crawlers = (() => {
    const st = $('#story'), fxBox = st && st.querySelector('.story-fx');
    if (!fxBox || reduce) return null;
    const NS = 'http://www.w3.org/2000/svg';
    // 路線（依手繪紅線，區塊的千分比座標 0～1000）：從左邊往上→往右下繞一個大圈→從圈的上方往右上爬過頂端→沿右側往下→在右下勾回、往右上離開
    const PTS = [[20, 570], [100, 380], [200, 330], [310, 330], [370, 400], [380, 550], [350, 700], [270, 720], [190, 680], [170, 520],
      [190, 420], [240, 340], [340, 220], [450, 160], [550, 140], [650, 140], [750, 200], [790, 300], [810, 450], [830, 550], [880, 600], [940, 580], [990, 470]];
    const cr = PTS.map((p, i) => {                       // Catmull-Rom → 三次貝茲，路線平滑經過每一點
      if (!i) return `M${p[0]} ${p[1]}`;
      const p0 = PTS[Math.max(0, i - 2)], p1 = PTS[i - 1], p3 = PTS[Math.min(PTS.length - 1, i + 1)];
      return `C${(p1[0] + (p[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p[1] - p0[1]) / 6).toFixed(1)} ${(p[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p[0]} ${p[1]}`;
    }).join(' ');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'story-path');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', cr);
    svg.appendChild(path);
    fxBox.appendChild(svg);
    // 畫在 canvas 上：每隻毛毛蟲切成一節一節，每一節放在「身體跟著頭走過的路線」上 → 轉彎時身體跟著彎
    const cv = document.createElement('canvas');
    cv.className = 'story-crawl-cv';
    fxBox.appendChild(cv);
    const sprites = [1, 2, 3, 4, 5, 6].map(i => { const im = new Image(); im.src = `assets/larvae/larva${i}.png`; return im; });
    const N = 14, list = [];
    for (let i = 0; i < N; i++) list.push({ sp: sprites[i % 6], off: i / N, ph: i * .9 });
    return { svg, path, cv, ctx: cv.getContext('2d'), list, t: 0, poly: null, W: 0, H: 0 };
  })();
  // 把路線取樣成畫面上的點（像素座標）＋累積長度，之後用長度找位置
  const crawlPoly = c => {
    const W = c.cv.clientWidth, H = c.cv.clientHeight, L = c.path.getTotalLength(), n = 700, pts = [], cum = [0];
    for (let i = 0; i <= n; i++) { const p = c.path.getPointAtLength(L * i / n); pts.push([p.x / 1000 * W, p.y / 1000 * H]); }
    for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    c.poly = { pts, cum, len: cum[n] }; c.W = W; c.H = H;
    const D = Math.min(2, devicePixelRatio || 1); c.D = D;
    c.cv.width = Math.round(W * D); c.cv.height = Math.round(H * D);
  };
  const crawlAt = (P, a) => {
    a = Math.max(0, Math.min(P.len, a));
    let lo = 0, hi = P.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.cum[m] <= a) lo = m; else hi = m; }
    const f = (a - P.cum[lo]) / ((P.cum[hi] - P.cum[lo]) || 1), A = P.pts[lo], B = P.pts[hi];
    return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
  };
  let crawlY = scrollY, crawlLast = 0;
  const drawCrawl = () => {
    if (!crawlers) return;
    const now = performance.now(), dt = Math.min(.05, (now - crawlLast) / 1000 || .016); crawlLast = now;
    const st = $('#story'), r = st.getBoundingClientRect();
    const dy = Math.abs(scrollY - crawlY); crawlY = scrollY;
    if (r.bottom < 0 || r.top > innerHeight || st.style.visibility === 'hidden') return;
    const c = crawlers;
    if (!c.poly || c.cv.clientWidth !== c.W || c.cv.clientHeight !== c.H) crawlPoly(c);
    const P = c.poly, g = c.ctx, D = c.D;
    c.t += dt * .018 + Math.min(.006, dy / 15000);                  // 平常慢慢爬，捲動時爬快一點
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.cv.width, c.cv.height);
    const S = Math.max(132, Math.min(180, innerWidth * .108));     // 毛毛蟲大小（圖的邊長）
    const SEG = 16, HEAD = .9;                                       // 頭在圖的下方 90% 處
    for (const it of c.list) {
      const img = it.sp;
      if (!img.complete || !img.naturalWidth) continue;
      const u = (c.t + it.off) % 1, aHead = u * P.len;
      const fade = Math.min(1, u / .05, (1 - u) / .05);             // 兩端淡入淡出縮短：很快就完全顯示
      if (fade <= 0) continue;
      g.globalAlpha = fade;
      const IW = img.naturalWidth, IH = img.naturalHeight, sh = IH / SEG;
      for (let j = 0; j < SEG; j++) {
        const yc = (j + .5) * sh, dist = (HEAD - yc / IH) * S;     // 這一節離頭多遠
        const k = Math.max(0, dist) / S;
        const squeeze = Math.sin(now / 200 + it.ph + k * 6) * S * .025 * k;   // 蠕動：一節一節伸縮
        const a = aHead - dist - squeeze;
        const [x, y] = crawlAt(P, a), [x2, y2] = crawlAt(P, a + 2);
        const ang = Math.atan2(y2 - y, x2 - x) - Math.PI / 2;      // 圖的「往下」對準前進方向
        const cs = Math.cos(ang) * D, sn = Math.sin(ang) * D;
        g.setTransform(cs, sn, -sn, cs, x * D, y * D);
        const dh = sh / IH * S;
        g.drawImage(img, 0, yc - sh / 2, IW, sh, -S / 2, -dh / 2 - .6, S, dh + 1.4);
      }
    }
    g.globalAlpha = 1;
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
  // 首頁 → 摘要時蝴蝶群飛散的動畫：依需求取消（swarm() 保留不呼叫）
  void swarm;

  /* ---------- 共用 ---------- */
  const poly = pts => `polygon(${pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',')})`;
  const lerpPts = (P, Q, t) => P.map((p, i) => [lerp(p[0], Q[i][0], t), lerp(p[1], Q[i][1], t)]);
  const smooth = t => t * t * (3 - 2 * t);
  const scrollP = r => clamp01((innerHeight - r.top) / (innerHeight + r.height));   // 0 = 剛從下方進來，1 = 從上方離開
  const pinP = r => clamp01(-r.top / Math.max(1, r.height - innerHeight));         // 被釘住的區塊：釘住期間 0 → 1
  const inView = (r, m = 0) => r.bottom > -m && r.top < innerHeight + m;
  const mixRGB = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
  const narrow = () => innerWidth <= 860;

  /* ---------- 輪盤（構造、型態分類共用）：右邊的輪盤文字隨捲動轉到正在介紹的那一項，左下說明、右下編號跟著換 ---------- */
  const WHEEL_STEP = 34;                                  // 輪盤每格的角度
  // 停頓式的進度：每一格中間停一下，兩格之間才轉
  const steps = (p, n) => { const x = p * (n - 1), i = Math.min(n - 2, Math.floor(x)); return i + smooth(clamp01((x - i - .2) / .6)); };
  const makeWheel = (sec, onPick) => {
    if (!sec) return null;
    const words = [...sec.querySelectorAll('.ks-wheel-in > span')], pans = [...sec.querySelectorAll('.ks-info > .ks-pan')];
    const capT = sec.querySelector('.ks-cap b'), capN = sec.querySelector('.ks-cap em span');
    const w = { cur: -1, s: null };
    w.draw = () => {
      const r = sec.getBoundingClientRect();
      if (!inView(r)) return;
      const n = words.length, goal = reduce ? Math.round(pinP(r) * (n - 1)) : steps(pinP(r), n);
      // 視覺延遲：輪盤不是直接跳到捲動的位置，而是慢慢追上
      w.s = w.s === null || reduce ? goal : w.s + (goal - w.s) * .085;
      if (Math.abs(goal - w.s) < .0005) w.s = goal;
      const a = w.s;
      // 一組 =「英文小字＋中文大字」；組與組之間要留比組內（英文和自己的中文）更大的間距：
      // 相鄰兩組的距離 = 一組的高度 + 0.6 個字高，換算成輪盤半徑
      const F = parseFloat(getComputedStyle(words[0]).fontSize) || 100;
      const R = (words[0].offsetHeight + F * .6) / Math.sin(WHEEL_STEP * Math.PI / 180);
      words.forEach((el, i) => {
        const d = i - a, ad = Math.abs(d);
        el.style.transform = `translateZ(${-R.toFixed(1)}px) rotateX(${(-d * WHEEL_STEP).toFixed(2)}deg) translateZ(${R.toFixed(1)}px)`;
        // 目前這一項全亮、上下一格淡淡的；再遠就完全隱藏，避免字擠在一起
        el.style.opacity = (ad <= 1 ? 1 - ad * .78 : Math.max(0, .22 * (1.5 - ad) / .5)).toFixed(3);
      });
      const cur = Math.round(a);
      if (cur === w.cur) return;
      w.cur = cur;
      pans.forEach((p, i) => p.classList.toggle('on', i === cur));
      if (capT) capT.textContent = pans[cur].querySelector('h3,h4').textContent;
      if (capN) capN.textContent = String(cur + 1).padStart(2, '0');
      if (onPick) onPick(cur);
    };
    return w;
  };
  const KS_OY = ['14%', '42%', '78%'];                    // 構造：每個部位在大圖上的位置
  const ks = $('#k-struct'), ksImg = $('#ksImg'), kfNums = $$('#k-family .kf-n');
  /* 型態分類的種數：數字底下的圓依數量放大（面積和種數成正比），旁邊每 10 種放一隻蝴蝶圖示 */
  const KF_MAX = Math.max(...kfNums.map(n => +n.dataset.c || 0));
  kfNums.forEach((n, k) => {
    const c = +n.dataset.c || 0, box = n.querySelector('.kf-ico');
    n.style.setProperty('--r', Math.sqrt(c / KF_MAX).toFixed(3));
    if (!box) return;
    const cnt = Math.max(1, Math.round(c / 10));
    box.innerHTML = Array.from({ length: cnt }, (_, i) => {
      const u = `assets/bf-icons/bf${String((i + k * 3) % 13 + 1).padStart(2, '0')}.png`;
      const rot = ((i * 37 + k * 11) % 50) - 25;
      return `<img src="${u}" alt="" style="--i:${i};--rot:${rot}deg">`;
    }).join('');
  });
  const wheels = [
    makeWheel(ks, i => {
      ksImg.style.setProperty('--oy', KS_OY[i]); ksImg.style.setProperty('--ix', i);   // 圖片依序往右移到第 1、2、3 格
      // 右半部：部位名稱大字直排，換部位時像輪盤一樣上下滾到下一個（保留原本的滾動效果）
      const v = ks.querySelector('.ks-vert');
      if (v) {
        v.style.setProperty('--i', i);
        v.querySelectorAll('.kv-it').forEach((it, k) => { it.classList.toggle('on', k === i); it.style.setProperty('--d', k - i); });
      }
    })
  ].filter(Boolean);

  /* ---------- 型態分類：吃角子老虎機 ----------
     點右邊的拉桿 → 拉桿往下壓再彈回 → 科名轉輪快速往下滾好幾圈，最後卡一下停在下一個科；
     左邊說明、右下的種數圓與蝴蝶圖示跟著換 */
  const slot = (() => {
    const strip = $('#kfStrip'), lever = $('#kfLever');
    if (!strip || !lever) return null;
    const box = strip.closest('.kf-box'), pans = $$('#k-family .ks-pan');
    const base = strip.innerHTML, N = strip.children.length, REP = 8;
    strip.innerHTML = base.repeat(REP);
    const s = { cur: 0, busy: false };
    const H = () => strip.children[0].offsetHeight;
    const place = idx => { strip.style.transform = `translateY(${(-idx * H()).toFixed(1)}px)`; };
    // 下方的點點：一共幾個科、目前在第幾個；點了也能直接轉到那一科
    const dotsBox = $('#kfDots');
    // 只取第一圈的 N 個（轉輪的格子重複了好幾圈）
    const names = [...strip.children].slice(0, N).map(sp => `${sp.querySelector('b').textContent} ${sp.querySelector('small').textContent}`);
    const dots = dotsBox ? names.map((nm, i) => {
      const d = document.createElement('button');
      d.type = 'button'; d.className = 'kf-dot';
      d.textContent = i + 1;
      d.setAttribute('aria-label', `${String(i + 1).padStart(2, '0')} ${nm}`);
      d.addEventListener('click', () => s.spinTo(i));
      dotsBox.appendChild(d);
      return d;
    }) : [];
    const show = i => {
      pans.forEach((p, k) => p.classList.toggle('on', k === i));
      kfNums.forEach((n, k) => n.classList.toggle('on', k === i));
      dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    };
    // 轉輪停在第 N 格起算的那一圈（上下都還有格子可以滾）
    s.reset = () => place(N + s.cur);
    s.reset(); show(0);
    // 拉桿：以底座為軸往前拉下；--c = cos(角度)：1 直立、負的就是拉到底座下方；--z 讓球靠近時變大
    const setLever = th => {
      lever.style.setProperty('--c', Math.cos(th).toFixed(3));
      lever.style.setProperty('--z', (1 + Math.sin(th) * .3).toFixed(3));
    };
    setLever(0);
    const pullLever = () => new Promise(done => {
      if (reduce) { done(); return; }
      const t0 = performance.now(), DOWN = 320, UP = 700, MAX = Math.PI * .9;
      const step = now => {
        const t = now - t0;
        if (t < DOWN) { const u = t / DOWN; setLever(MAX * u * u); }
        else if (t < DOWN + UP) {
          const u = (t - DOWN) / UP;
          setLever(MAX * Math.pow(1 - u, 3) - Math.sin(u * Math.PI * 2.5) * .12 * (1 - u));   // 彈回時晃一下
        } else { setLever(0); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setTimeout(done, DOWN);                         // 拉到底才開始轉
    });
    s.spinTo = async next => {
      if (s.busy || next === s.cur) return;
      s.busy = true;
      box.classList.remove('win');
      box.classList.add('spin');
      await pullLever();
      const h = H();
      if (!reduce) {
        // 往下滾（同草圖的箭頭）：從最後一圈裡「目前這一科」的位置，一路往下捲回第二圈的「下一科」，中間滾過好幾圈
        const A = N * (REP - 1) + s.cur, B = N + next;
        const a = strip.animate([
          { transform: `translateY(${-A * h}px)`, filter: 'blur(0px)' },
          { filter: 'blur(3px)', offset: .12 },
          { filter: 'blur(3px)', offset: .68 },
          { transform: `translateY(${-B * h}px)`, filter: 'blur(0px)' }
        ], { duration: 1800, easing: 'cubic-bezier(.22,.12,.18,1.07)', fill: 'forwards' });   // 最後稍微超過再彈回 = 卡一下停住
        await a.finished;
        place(B);
        a.cancel();
      }
      s.cur = next;
      place(N + next);
      show(next);
      box.classList.remove('spin');
      box.classList.add('win');
      s.busy = false;
    };
    s.pull = () => s.spinTo((s.cur + 1) % N);
    lever.addEventListener('click', s.pull);
    addEventListener('resize', () => { if (!s.busy) s.reset(); });
    return s;
  })();
  // 型態分類：老虎機與拉桿拿掉了，改回「捲動換科」—— 依這一段被釘住時的捲動進度，換左邊說明與右下的種數
  const kfSec2 = $('#k-family'), kfPans2 = $$('#k-family .ks-pan');
  let kfCur2 = -1;
  /* 型態分類（一個畫面）：
     左側一排長橢圓形的科別按鈕（線框綠＋米底，滑過變實心綠，目前這科也是實心）→ 點了切換；
     中間是這一科的文字（科名最大、說明小字），切換時從煙霧中浮現；
     右側一個圓角矩形，裡面是這一科的蝴蝶圖示：游標在框內移動時，中間的「＋」準星跟著游標、圖示被推開並有景深視差（參考 GIF 的互動框） */
  const kfUI = (() => {
    const pin = kfSec2 && kfSec2.querySelector('.ks-pin');
    if (!pin || !kfPans2.length) return null;
    const wrap = document.createElement('div');
    wrap.className = 'kf-ui';
    const data = kfPans2.map((p, i) => {
      const h = p.querySelector('h4'), lis = [...p.querySelectorAll('.kf-ul li')];
      const num = kfNums[i], cnt = num && num.querySelector('.kf-cnt');
      return { h, lis, cnt, icons: num ? [...num.querySelectorAll('.kf-ico img')].map(im => im.getAttribute('src')) : [] };
    });
    const attr = (el, a) => el && el.hasAttribute(a) ? ` ${a}="${el.getAttribute(a).replace(/"/g, '&quot;')}"` : '';
    wrap.innerHTML =
      `<nav class="kf-tabs" aria-label="科別" data-en-label="Families">${data.map((d, i) =>
        `<button type="button" class="kf-tab" data-i="${i}"${attr(d.h, 'data-en')}>${d.h.innerHTML}</button>`).join('')}</nav>` +
      `<div class="kf-stage">${data.map((d, i) =>
        `<div class="kf-txt" data-i="${i}" aria-hidden="true"><h4${attr(d.h, 'data-en')}>${d.h.innerHTML}</h4>` +
        `<ul>${d.lis.map(li => li.outerHTML).join('')}</ul>` +
        (d.cnt ? `<p class="kf-sc-cnt"${attr(d.cnt, 'data-en-html')}>${d.cnt.innerHTML}</p>` : '') + `</div>`).join('')}</div>` +
      `<div class="kf-box" aria-hidden="true"><i class="kf-cross"></i><div class="kf-bugs"></div></div>`;
    pin.appendChild(wrap);
    const tabs = [...wrap.querySelectorAll('.kf-tab')], txts = [...wrap.querySelectorAll('.kf-txt')];
    const box = wrap.querySelector('.kf-box'), bugsEl = wrap.querySelector('.kf-bugs'), cross = wrap.querySelector('.kf-cross');
    let bugs = [], cur = -1;
    const fillBox = i => {
      const src = data[i].icons, n = Math.max(6, src.length);
      bugsEl.innerHTML = Array.from({ length: n }, (_, k) => `<img src="${src[k % src.length]}" alt="">`).join('');
      bugs = [...bugsEl.children].map((el, k) => {
        const b = { el, x: .15 + Math.random() * .7, y: .15 + Math.random() * .7, z: .4 + Math.random() * .9, r: Math.random() * 80 - 40, ox: 0, oy: 0, k };
        el.style.setProperty('--z', b.z.toFixed(2));
        el.style.animationDelay = (k * 60) + 'ms';
        return b;
      });
      place(.5, .5, false);
    };
    const place = (mx, my, inside) => {
      for (const b of bugs) {
        let px = b.x + (.5 - mx) * .12 * b.z, py = b.y + (.5 - my) * .12 * b.z;   // 視差：越近的（z 大）移動越多
        if (inside) {                                                             // 游標附近的被推開
          const dx = px - mx, dy = py - my, d = Math.hypot(dx, dy) || .001, f = Math.max(0, .22 - d) / .22;
          px += dx / d * f * .14; py += dy / d * f * .14;
        }
        b.el.style.left = (px * 100).toFixed(2) + '%';
        b.el.style.top = (py * 100).toFixed(2) + '%';
        b.el.style.transform = `translate(-50%,-50%) rotate(${(b.r + (inside ? (mx - .5) * 30 * b.z : 0)).toFixed(1)}deg) scale(${(.7 + b.z * .4).toFixed(2)})`;
      }
    };
    box.addEventListener('pointermove', e => {
      const r = box.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
      cross.style.left = (mx * 100) + '%'; cross.style.top = (my * 100) + '%';
      box.classList.add('hot');
      place(mx, my, true);
    });
    box.addEventListener('pointerleave', () => { box.classList.remove('hot'); cross.style.left = cross.style.top = '50%'; place(.5, .5, false); });
    const select = i => {
      if (i === cur) return;
      cur = i;
      tabs.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-pressed', k === i); });
      txts.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-hidden', k !== i); });
      fillBox(i);
    };
    tabs.forEach(t => t.addEventListener('click', () => select(+t.dataset.i)));
    select(0);
    return { select };
  })();
  /* 型態分類改成「圖卡」：深色底，五個科各一張卡片排成一列；捲到時卡片由下往上依序浮上來，滑過時卡片抬起 */
  const kfDeck = (() => {
    const pin = kfSec2 && kfSec2.querySelector('.ks-pin');
    if (!pin || !kfPans2.length) return null;
    const att = (el, a) => el && el.hasAttribute(a) ? ` ${a}="${el.getAttribute(a).replace(/"/g, '&quot;')}"` : '';
    const deck = document.createElement('div');
    deck.className = 'kf-deck';
    // 五張米色圖卡 sticky 疊起來：每張頂端錯開一點（看得到前面幾張的標頭），下一張從底下滑上來；
    // 卡片內：左側文字錯位排列；右下空白處是一條傾斜 30° 的圖示帶，隨捲動左右移動
    deck.innerHTML = kfPans2.map((p, i) => {
      const h = p.querySelector('h4'), lis = [...p.querySelectorAll('.kf-ul li')], num = kfNums[i];
      const cnt = num && num.querySelector('.kf-cnt'), icons = num ? [...num.querySelectorAll('.kf-ico img')].map(im => im.getAttribute('src')) : [];
      const strip = Array.from({ length: 3 }, () => icons.map(s => `<img src="${s}" alt="">`).join('')).join('');
      return `<article class="kf-dc" style="--k:${i}"><div class="kf-dc-in">` +
        `<p class="kf-dc-no">${String(i + 1).padStart(2, '0')} — 05</p>` +
        `<h4${att(h, 'data-en')}>${h.innerHTML}</h4>` +
        `<div class="kf-dc-body"><ul>${lis.map((li, k) => li.outerHTML.replace('<li', `<li style="--o:${k}"`)).join('')}</ul>` +
        (cnt ? `<p class="kf-dc-cnt"${att(cnt, 'data-en-html')}>${cnt.innerHTML}</p>` : '') + `</div>` +
        `<div class="kf-band" aria-hidden="true"><div class="kf-band-in">${strip}${strip}</div></div>` +
        `</div></article>`;
    }).join('');
    pin.appendChild(deck);
    deck.classList.add('in');
    return { deck, cards: [...deck.querySelectorAll('.kf-dc')], bands: [...deck.querySelectorAll('.kf-band-in')] };
  })();
  // 圖示帶：依卡片在畫面上的位置左右移動（單數張往左、雙數張往右）
  const drawFam = () => {
    if (!kfDeck) return;
    const vh = innerHeight;
    kfDeck.cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (vh - r.top) / (vh + r.height);                  // 0 → 1
      void p;   // 圖示帶改成自己一直跑的跑馬燈（CSS 動畫），不再跟著捲動位移
      // 延遲效果：還在往上滑、沒停好的卡片稍微落後一點
      const stick = parseFloat(getComputedStyle(c).top) || 76, inner = c.firstElementChild;
      const tf = r.top > stick + 1 ? `translateY(${(LAG.v * .45).toFixed(1)}px)` : '';
      if (inner && inner._tf !== tf) { inner._tf = tf; inner.style.transform = tf; }
    });
  };
  const drawStruct = () => { wheels.forEach(w => w.draw()); drawFam(); };
  /* ---------- 生活史：階段名稱橫向滑過中間那一欄（欄內變深色），說明與圖片跟著換 ---------- */
  const kc = $('#k-cycle'), kcTracks = $$('#k-cycle .kc-track'), kcPans = $$('#kcTxt .kc-pan'), kcStrip = $('#kcStrip');
  const kcCapT = $('#kcCapT'), kcCapN = $('#kcCapN');
  let kcCur = -1, kcA = null, kcB = null, kcVA = 0, kcVB = 0;
  /* 生活史的格線區塊：游標掃到哪一格，就從那一格的右上角展開一片扇形綠色（每格顏色不同，相鄰的不重複）；離開後收回 */
  {
    const pin = kc && kc.querySelector('.kc-pin');
    if (pin) {
      // 格線：直線在 50%、80%，橫線在 50% → 2 列 × 3 欄
      const COLS = [0, 50, 80, 100], ROWS = [0, 50, 100];
      const GREENS = [['#CFE6C4', '#A9D3B2', '#E3F0D2'], ['#B7DCA4', '#D6EBCB', '#9FCDB0']];   // 上下、左右相鄰都不同
      const box = document.createElement('div');
      box.className = 'kc-cells'; box.setAttribute('aria-hidden', 'true');
      for (let rI = 0; rI < 2; rI++) for (let cI = 0; cI < 3; cI++) {
        const c = document.createElement('i');
        c.className = 'kc-cell';
        c.style.cssText = `left:${COLS[cI]}%;width:${COLS[cI + 1] - COLS[cI]}%;top:${ROWS[rI]}%;height:${ROWS[rI + 1] - ROWS[rI]}%;--c:${GREENS[rI][cI]}`;
        box.appendChild(c);
      }
      pin.prepend(box);
      const cells = [...box.children];
      let on = null;
      addEventListener('pointermove', e => {
        const r = pin.getBoundingClientRect();
        let hit = null;
        if (e.clientY >= r.top && e.clientY <= r.bottom) {
          const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
          const cI = x < 50 ? 0 : x < 80 ? 1 : 2, rI = y < 50 ? 0 : 1;
          hit = cells[rI * 3 + cI];
        }
        if (hit === on) return;
        if (on) on.classList.remove('on');
        on = hit;
        if (on) on.classList.add('on');
      }, { passive: true });
    }
  }
  /* 生活史（圖卡版）：每張卡片 sticky 疊上來；被下一張蓋住時往後縮小、變暗一點 → 層疊感。
     上方的引導線：從「One Life, Four Forms」轉場畫下來（修剪路徑，末端一個小點），再接進第一張卡片 */
  const kcCards = $$('#k-cycle .kc-card'), kcLead = $('#k-cycle .kc-lead');
  // 卡片本身只負責 sticky 定位（不變形），外觀與立體變形都放在裡面的 .kc-in：
  // 量位置時量的是沒變形的外框 → 不會因為自己的變形回頭影響計算（之前一直閃爍的原因）
  kcCards.forEach(c => {
    const inner = document.createElement('div');
    inner.className = 'kc-in';
    while (c.firstChild) inner.appendChild(c.firstChild);
    c.appendChild(inner);
    c._in = inner;
  });
  const ktLine = null;   // 只用一條線（.kc-lead，往上延伸到轉場文字下方），避免兩段線、兩顆點
  const drawCards = () => {
    // 延遲量：一個慢慢追上 scrollY 的值；兩者的差 = 往下捲時元素該「落後」多少（捲動停下後歸零）
    LAG.s += (scrollY - LAG.s) * .1;
    LAG.v = reduce ? 0 : Math.max(-140, Math.min(140, scrollY - LAG.s));
    if (ktLine) {
      const r = ktLine.kt.getBoundingClientRect();
      // 等「One Life, Four Forms」三行字都完全出現（轉場進度約 96%）才畫線
      if (inView(r)) ktLine.el.classList.toggle('on', reduce || pinP(r) > .955);
    }
    if (kcLead) {
      // 線的起點：量「One Life, Four Forms」最後一行字的下緣，從字下方 28px 開始（轉場被釘住的畫面底部 = 這條線所在區塊的頂端）
      const kt = $('.kt[data-to="light"]'), pin = kt && kt.querySelector('.kt-pin'), txt = pin && pin.querySelector(':scope > .kt-b .kt-t');
      if (pin && txt) {
        const pr = pin.getBoundingClientRect(), tr = txt.getBoundingClientRect();
        const off = Math.max(40, pr.bottom - tr.bottom - 28);
        if (Math.abs(off - (kcLead._off || 0)) > 1) {
          kcLead._off = off;
          kcLead.style.top = -off + 'px';
          kcLead.style.marginBottom = -Math.min(off * .7, innerHeight * .26) + 'px';   // 不佔版面
          kcLead.style.height = Math.min(off * .7, innerHeight * .26) + 'px';   // 只有一段，不會太長
        }
      }
      // 轉場一放開（文字都已出現、第一張卡片還沒就位）就畫出一段固定長度的線，畫完就停；捲回去時收回
      const r = kcLead.getBoundingClientRect();
      if (inView(r, 200)) kcLead.classList.toggle('on', reduce || r.top < innerHeight * .98);
    }
    // 立體層疊：卡片從下方進來時離鏡頭近（比較大），停到位置時退回原本大小；被下一張蓋住時再往後退（變小、變暗）
    kcCards.forEach((c, i) => {
      const cr = c.getBoundingClientRect();
      if (cr.bottom < -50 || cr.top > innerHeight + 50) return;
      const stick = parseFloat(getComputedStyle(c).top) || 84;
      c.classList.toggle('stuck', cr.top <= stick + 1);           // 已經疊好（停住）→ 陰影收起來，只有滑上來的過程才有陰影
      const enter = reduce ? 1 : clamp01((innerHeight - cr.top) / Math.max(1, innerHeight - stick));
      const next = kcCards[i + 1], nr = next && next.getBoundingClientRect();
      const cover = reduce || !nr ? 0 : clamp01(1 - (nr.top - cr.top) / Math.max(1, cr.height));
      // 空間感：進場時卡片往後仰（上窄下寬的梯形），往上移到停靠位置時慢慢立起來、轉平；被蓋住時退到後方
      const k = 1 - smooth(enter);
      // 照箭頭：消失點在上方，卡片從畫面下方「靠近鏡頭、平躺」的位置，沿著往上收攏的方向推進並立起來
      const tilt = k * 42;                                        // 往後倒（上緣遠、下緣近）的角度
      const z = k * 260 - cover * 140;                            // 進場時離鏡頭近（比較大），到位後退回原位
      void z; void tilt;
      // 不要空間感：卡片只由下往上平移疊上去；還在往上滑（沒停好）時落後一點 → 延遲感
      const t = cr.top > stick + 1 ? `translateY(${(LAG.v * .45).toFixed(1)}px)` : '';
      // 寬度：從下方進來時是 80%，往上滑到定位的過程中慢慢撐開到 100%
      const w = (80 + 20 * smooth(enter)).toFixed(2) + '%';
      if (w !== c._w) { c._w = w; c._in.style.width = w; }
      if (t !== c._t) { c._t = t; c._in.style.transform = t; }
      const f = '';
      if (f !== c._f) { c._f = f; c._in.style.filter = f; }
    });
  };
  const drawCycle = () => {
    drawCards();
    if (!kc || !kcTracks.length) return;
    const r = kc.getBoundingClientRect();
    if (!inView(r)) return;
    // 停頓式進度：每個階段停久一點（約六成的捲動距離不動），只在中間快速換到下一個
    const hold = (p, n) => { const x = p * (n - 1), i = Math.min(n - 2, Math.floor(x)); return i + smooth(clamp01((x - i - .3) / .4)); };
    const n = kcPans.length, goal = reduce ? Math.round(pinP(r) * (n - 1)) : hold(pinP(r), n);
    // 動畫原理：用彈簧追上目標 → 起步有延遲、到位時稍微衝過頭再彈回（跟隨與重疊）；圖片比文字更慢、彈得更多
    if (kcA === null || reduce) { kcA = kcB = goal; kcVA = kcVB = 0; }
    kcVA = (kcVA + (goal - kcA) * .045) * .8;  kcA += kcVA;
    kcVB = (kcVB + (goal - kcB) * .03) * .84;  kcB += kcVB;
    const a = kcA;
    const slot = kcTracks[0].firstElementChild.offsetWidth;
    kcTracks.forEach(t => { t.style.transform = `translateX(${(-a * slot).toFixed(1)}px)`; });
    kcStrip.style.transform = `translateX(${(-kcB * 100).toFixed(3)}%)`;
    const cur = Math.round(a);
    if (cur === kcCur) return;
    kcCur = cur;
    kcPans.forEach((p, i) => p.classList.toggle('on', i === cur));
    if (kcCapT) kcCapT.textContent = kcPans[cur].querySelector('h4').textContent;
    if (kcCapN) kcCapN.textContent = String(cur + 1).padStart(2, '0');
  };
  /* ---------- 天敵與常識：點開／收合（一次只開一項） ---------- */
  const faqs = $$('#kfaq li');
  const openFaq = li => faqs.forEach(x => {
    const on = x === li && !x.classList.contains('open');
    x.classList.toggle('open', on);
    x.querySelector('button').setAttribute('aria-expanded', on);
  });
  faqs.forEach(li => li.querySelector('button').addEventListener('click', () => openFaq(li)));
  if (faqs[0]) openFaq(faqs[0]);

  /* ---------- 結語轉場：一群毛毛蟲到處亂爬，把原本的淺色畫面啃掉 ----------
     淺色畫面是一張 canvas（.tri-cover）蓋在深色的下一頁（.tri-in）上；毛毛蟲爬過的地方用 destination-out 挖出帶缺口的咬痕，
     露出底下；路線事先算好（網格上每一格都會有一隻毛毛蟲經過），所以捲到最後一定全部吃乾淨。往回捲就重畫到當下的進度。
     毛毛蟲圖：assets/larvae/larva1–6.png（頭朝下） */
  const tri = $('#k-end'), triIn = $('#triIn');
  const eat = (() => {
    if (!tri) return null;
    const pin = tri.querySelector('.tri-pin');
    const cover = document.createElement('canvas'), bugs = document.createElement('canvas');
    cover.className = 'tri-cover'; bugs.className = 'tri-bugs';
    cover.setAttribute('aria-hidden', 'true'); bugs.setAttribute('aria-hidden', 'true');
    pin.append(cover, bugs);
    const sprites = [1, 2, 3, 4, 5, 6].map(i => { const im = new Image(); im.src = `assets/larvae/larva${i}.png`; return im; });
    return { cover, bugs, cctx: cover.getContext('2d'), bctx: bugs.getContext('2d'), sprites, paths: [], W: 0, H: 0, R: 30, S: 1, s: -1, paper: '#F6F4EF' };
  })();
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const buildEat = () => {
    const o = eat, W = innerWidth, H = innerHeight, DPR = Math.min(2, devicePixelRatio || 1);
    o.W = W; o.H = H; o.DPR = DPR;
    o.cover.width = W; o.cover.height = H;
    o.bugs.width = Math.round(W * DPR); o.bugs.height = Math.round(H * DPR);
    o.paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#F6F4EF';
    o.R = Math.max(26, Math.min(54, Math.min(W, H) * .06));          // 一口的半徑
    const cell = o.R * 1.25, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const seen = new Uint8Array(cols * rows); let left = cols * rows;
    const ctr = (c, r) => [(c + .5) * W / cols, (r + .5) * H / rows];
    const N = Math.max(5, Math.min(12, Math.round(cols * rows / 40)));
    // 每隻從畫面外的某一邊爬進來
    const bugsArr = Array.from({ length: N }, (_, i) => {
      const side = i % 4, k = (i + .5 + Math.random() * .5) / N;
      let c = side === 1 ? cols - 1 : side === 3 ? 0 : Math.min(cols - 1, Math.floor(k * cols));
      let r = side === 0 ? 0 : side === 2 ? rows - 1 : Math.min(rows - 1, Math.floor(k * rows));
      const [x, y] = ctr(c, r);
      const out = [[x, -o.R * 4], [W + o.R * 4, y], [x, H + o.R * 4], [-o.R * 4, y]][side];
      return { c, r, dc: [0, -1, 0, 1][side], dr: [1, 0, -1, 0][side], pts: [out] };
    });
    const visit = (b, c, r) => {
      b.c = c; b.r = r;
      if (!seen[r * cols + c]) { seen[r * cols + c] = 1; left--; }
      const [x, y] = ctr(c, r);
      b.pts.push([x + (Math.random() - .5) * cell * .4, y + (Math.random() - .5) * cell * .4]);
    };
    bugsArr.forEach(b => visit(b, b.c, b.r));
    // 一起一步一步爬：優先往旁邊還沒被吃的格子、盡量順著原方向（帶點亂數 → 亂爬）；四周都吃過了就朝最近的沒吃格子爬過去
    let guard = cols * rows * 4;
    while (left > 0 && guard-- > 0) bugsArr.forEach(b => {
      if (left <= 0) { visit(b, b.c, b.r); return; }
      let best = null, bs = -1e9;
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        const c = b.c + dc, r = b.r + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows || seen[r * cols + c]) continue;
        const sc = (dc * b.dc + dr * b.dr) / Math.hypot(dc, dr) + Math.random() * 1.3;
        if (sc > bs) { bs = sc; best = [c, r, dc, dr]; }
      }
      if (!best) {
        let tc = b.c, tr = b.r, td = 1e9;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!seen[r * cols + c]) {
          const d = Math.hypot(c - b.c, r - b.r) + Math.random() * .5;
          if (d < td) { td = d; tc = c; tr = r; }
        }
        const dc = Math.sign(tc - b.c), dr = Math.sign(tr - b.r);
        best = [b.c + dc, b.r + dr, dc, dr];
      }
      b.dc = best[2]; b.dr = best[3];
      visit(b, best[0], best[1]);
    });
    // 吃完了：各自往最近的邊爬出畫面
    bugsArr.forEach(b => {
      const [x, y] = b.pts[b.pts.length - 1];
      const ex = [[x, -o.R * 5], [W + o.R * 5, y], [x, H + o.R * 5], [-o.R * 5, y]][[y, W - x, H - y, x].indexOf(Math.min(y, W - x, H - y, x))];
      for (let k = 1; k <= 4; k++) b.pts.push([x + (ex[0] - x) * k / 4, y + (ex[1] - y) * k / 4]);
    });
    // 格點連成平滑曲線（Catmull-Rom），再按弧長取點 → 爬行速度連續、轉彎是圓弧，不會一格一格頓
    const SUB = 10;
    o.paths = bugsArr.map((b, i) => {
      const P = b.pts, n = P.length, dense = [], cum = [0];
      const g = k => P[Math.max(0, Math.min(n - 1, k))];
      for (let k = 0; k < n - 1; k++) for (let j = 0; j < SUB; j++) {
        const t = j / SUB, p0 = g(k - 1), p1 = g(k), p2 = g(k + 1), p3 = g(k + 2), t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
      dense.push(P[n - 1]);
      for (let k = 1; k < dense.length; k++) cum.push(cum[k - 1] + Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]));
      return { pts: P, dense, cum, SUB, sp: i % 6, ph: Math.random() * 6.28 };
    });
    o.S = Math.max(...o.paths.map(p => p.pts.length)) - 1;
    o.s = -1; o.eS = null;
  };
  // 第 s 步（可為小數）在路線上的弧長
  const arcOf = (p, s) => {
    const x = Math.max(0, Math.min(p.dense.length - 1, s * p.SUB)), i = Math.min(p.dense.length - 2, Math.floor(x));
    return p.cum[i] + (p.cum[i + 1] - p.cum[i]) * (x - i);
  };
  // 弧長 a 的位置（超出兩端就沿端點方向延伸）
  const posAt = (p, a) => {
    const c = p.cum, d = p.dense, end = c[c.length - 1];
    if (a <= 0) { const [x0, y0] = d[0], [x1, y1] = d[1], l = Math.hypot(x1 - x0, y1 - y0) || 1; return [x0 + (x1 - x0) / l * a, y0 + (y1 - y0) / l * a]; }
    if (a >= end) { const [x0, y0] = d[d.length - 2], [x1, y1] = d[d.length - 1], l = Math.hypot(x1 - x0, y1 - y0) || 1; return [x1 + (x1 - x0) / l * (a - end), y1 + (y1 - y0) / l * (a - end)]; }
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= a) lo = m; else hi = m; }
    const f = (a - c[lo]) / ((c[hi] - c[lo]) || 1);
    return [d[lo][0] + (d[hi][0] - d[lo][0]) * f, d[lo][1] + (d[hi][1] - d[lo][1]) * f];
  };
  const at = (p, s) => posAt(p, arcOf(p, s));
  const bite = (ctx, x, y, R, seed) => {         // 一口：大圓＋邊上幾個小圓 → 毛邊的咬痕
    ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, 6.2832);
    for (let k = 0; k < 4; k++) {
      const a = hash(seed + k) * 6.2832, d = R * (.8 + hash(seed + k + 9) * .25), rr = R * (.28 + hash(seed + k + 5) * .2);
      ctx.moveTo(x + Math.cos(a) * d + rr, y + Math.sin(a) * d); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 6.2832);
    }
  };
  const eatTo = s => {
    const o = eat, c = o.cctx;
    let from = o.s;
    if (s < from || from < 0) {                  // 往回捲：整張重鋪再吃到目前進度
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = o.paper; c.fillRect(0, 0, o.W, o.H);
      from = 0;
    }
    if (s > from) {
      c.globalCompositeOperation = 'destination-out';
      c.beginPath();
      o.paths.forEach((p, i) => {
        for (let t = from; t <= s; t += .25) { const [x, y] = at(p, t); bite(c, x, y, o.R, i * 1000 + Math.round(t * 4)); }
      });
      c.fill();
    }
    o.s = s;
  };
  const drawTri = () => {
    if (!tri || !eat) return;
    const r = tri.getBoundingClientRect();
    if (!inView(r)) return;
    if (eat.W !== innerWidth || eat.H !== innerHeight) buildEat();
    const e = reduce ? 1 : clamp01(pinP(r) / .85);
    tri._e = e;
    const o = eat;
    // 捲動是一格一格跳的，進度先平滑追上，爬起來才順
    const goal = e * o.S;
    o.eS = o.eS == null || reduce ? goal : o.eS + (goal - o.eS) * .1;
    if (Math.abs(goal - o.eS) < .002) o.eS = goal;
    const sNow = o.eS, done = sNow >= o.S;
    o.cover.style.display = done ? 'none' : '';
    o.bugs.style.display = done ? 'none' : '';
    if (done) { o.s = -1; return; }
    const moved = o.lastS == null ? 0 : sNow - o.lastS; o.lastS = sNow;
    eatTo(sNow);
    /* 畫毛毛蟲：把圖切成一節一節的橫條，每一節放在「身體跟著頭走過的路線」上 → 轉彎時身體自然彎曲；
       再加上從尾巴往頭傳的蠕動波（各節間距一伸一縮）和微微的左右擺動 */
    const b = o.bctx, D = o.DPR, L = o.R * 3.6, now = performance.now() / 1000;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, o.bugs.width, o.bugs.height);
    if (sNow <= 0) return;
    const SEG = 14, HEAD = .93;                       // 圖裡頭的位置（由上往下 93%）
    o.paths.forEach(p => {
      const img = o.sprites[p.sp];
      if (!img.complete || !img.naturalWidth) return;
      const IW = img.naturalWidth, IH = img.naturalHeight, sh = IH / SEG;
      // 蠕動相位：爬越多走越快，停著時也慢慢動
      p.wv = (p.wv || 0) + Math.abs(moved) * 2.2 + .016 * 1.2;
      const aHead = arcOf(p, sNow) + o.R * .25;
      for (let j = 0; j < SEG; j++) {
        const yc = (j + .5) * sh;                     // 這一節在圖裡的中心
        const u = (HEAD - yc / IH) * L;               // 離頭多遠（px），負的是頭前面那一小段
        const k = Math.max(0, u) / L;
        // 蠕動：身體各處間距隨波伸縮，波從尾巴傳向頭
        const squeeze = Math.sin(p.wv * 3 + k * 7) * L * .035 * k;
        const a = aHead - u - squeeze;
        const [x, y] = posAt(p, a), [x2, y2] = posAt(p, a + 2);
        const ang = Math.atan2(y2 - y, x2 - x);
        const sway = Math.sin(p.wv * 2 + k * 5 + p.ph) * L * .025 * k;   // 微微左右擺
        const px = x - Math.sin(ang) * sway, py = y + Math.cos(ang) * sway;
        const rot = ang - Math.PI / 2, cs = Math.cos(rot) * D, sn = Math.sin(rot) * D;
        b.setTransform(cs, sn, -sn, cs, px * D, py * D);
        const dh = sh / IH * L;
        b.drawImage(img, 0, yc - sh / 2, IW, sh, -L / 2, -dh / 2 - .6, L, dh + 1.4);   // 稍微重疊，接縫不露白
      }
    });
  };

  /* ---------- 知識區轉場：橫向條帶揭露＋黑白主題切換＋大字淡入（參考 Santalarch 的條帶轉場） ----------
     新主題的底色切成幾條高度不一的橫向長方形，各自從自己的中線往上下展開；
     舊的大字留在原位，被條帶一塊塊蓋掉（條帶之間的縫隙還看得到，字被條帶的邊切斷）；
     條帶蓋滿後，新的大字一行一行從下方淡入上來 */
  // 兩段轉場用不一樣的切割方式：
  //   第一段（淺 → 黑）：橫向條帶，高度不一，各自從自己的水平中線往上下展開
  //   第二段（黑 → 淺）：直向條帶，寬度不一，各自從自己的垂直中線往左右展開
  const KT_STYLES = [
    { dir: 'rows', cut: [0, .27, .56, .7, 1], start: [.2, .02, .28, .11] },
    { dir: 'cols', cut: [0, .16, .47, .61, .84, 1], start: [.16, .04, .26, .1, .2] }
  ];
  const kts = $$('.kt').map((el, n) => {
    const st = KT_STYLES[n % KT_STYLES.length], cols = st.dir === 'cols';
    const pin = el.querySelector('.kt-pin'), b = el.querySelector('.kt-b');
    const bands = st.start.map((_, i) => {
      const t = st.cut[i], h = st.cut[i + 1] - t;
      const band = document.createElement('div');
      band.className = 'kt-band';
      // 只放新主題的底色（含格線），位置對齊整個畫面
      const pos = (t * 100).toFixed(3) + '%', size = (h * 100 + .05).toFixed(3) + '%';
      const inPos = (-t / h * 100).toFixed(3) + '%', inSize = (100 / h).toFixed(3) + '%';
      band.style.cssText = cols ? `top:0;height:100%;left:${pos};width:${size}` : `left:0;width:100%;top:${pos};height:${size}`;
      band.innerHTML = `<div class="kt-lay kt-b" style="${cols ? `left:${inPos};width:${inSize};right:auto` : `top:${inPos};height:${inSize};bottom:auto`}"></div>`;
      pin.insertBefore(band, b);
      return band;
    });
    b.classList.add('kt-text');                          // 新的字：疊在最上層，底色透明
    return { el, pin, bands, st, cols, toDark: el.dataset.to === 'dark', e0: 0 };
  });
  const drawKt = () => kts.forEach(o => {
    const r = o.el.getBoundingClientRect();
    if (!inView(r)) return;
    // 延遲效果：進度不是直接等於捲動位置，而是慢慢追上（停止捲動後條帶還會繼續展開一下）
    const goal = reduce ? 1 : pinP(r);
    o.ps = o.ps == null || reduce ? goal : o.ps + (goal - o.ps) * .07;
    if (Math.abs(goal - o.ps) < .0005) o.ps = goal;
    const p = o.ps;
    let sum = 0;
    o.bands.forEach((band, i) => {
      // 每條帶子再各自錯開一點延遲：越晚開始的帶子跟得越慢
      band._e = band._e == null ? 0 : band._e;
      const want = smooth(clamp01((p - o.st.start[i]) / .3));
      band._e += (want - band._e) * (.18 - i * .025);
      if (Math.abs(want - band._e) < .001) band._e = want;
      const e = band._e;
      sum += e;
      if (!o.cols && i === 0) o.e0 = e;                   // 橫條：最上面那條決定導覽列深淺
      const c = ((1 - e) * 50).toFixed(2) + '%';
      band.style.clipPath = e >= 1 ? 'none' : o.cols ? `inset(0 ${c} 0 ${c})` : `inset(${c} 0 ${c} 0)`;
    });
    if (o.cols) o.e0 = sum / o.bands.length;              // 直條：大部分蓋滿時導覽列才換色
    for (let i = 0; i < 3; i++)                          // 新的字：條帶蓋滿後，一行接一行從下方淡入
      o.pin.style.setProperty('--b' + i, smooth(clamp01((p - .5 - i * .08) / .3)).toFixed(4));
  });
  /* ---------- 導覽列：畫面最上方是黑底時改成淺色字 ---------- */
  const darkSecs = $$('.k-dark'), root = document.documentElement, foot = $('#foot');
  let navDark = false;
  const drawNavTheme = () => {
    const y = 34;
    const hit = r => r.top < y && r.bottom > y;
    // 摘要（深色）是用漣漪 clip-path 從首頁底下揭開的：還沒完全揭開前，頂端看到的仍是淺色的首頁
    let d = darkSecs.some(el => hit(el.getBoundingClientRect()) && !(el.id === 'story' && el.style.clipPath));
    kts.forEach(o => { if (hit(o.el.getBoundingClientRect())) d = (o.e0 > .5) === o.toDark; });
    if (tri && hit(tri.getBoundingClientRect()) && (tri._e || 0) > .6) d = !triIn.classList.contains('bright');   // 種花種到背景變亮時，選單改回深色字   // 結語的深色三角形蓋過畫面頂端
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
  /* ---------- 地圖區塊：游標在上面時，旁邊跟著一個「前往探索」小方塊；連結還沒設定前先不跳頁 ---------- */
  const zi = $('#map');
  if (zi) {
    const ziCur = zi.querySelector('.zi-cur');
    zi.addEventListener('pointermove', e => {
      const r = zi.getBoundingClientRect();
      ziCur.style.transform = `translate(${(e.clientX - r.left + 18).toFixed(0)}px, ${(e.clientY - r.top + 18).toFixed(0)}px)`;
      zi.classList.add('hover');
    });
    zi.addEventListener('pointerleave', () => zi.classList.remove('hover'));
    zi.addEventListener('click', e => { if (zi.hasAttribute('data-todo')) e.preventDefault(); });
  }
  const leavers = [].map(s => $(s)).filter(Boolean)
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
    drawDepth();
    drawCrawl();
    drawGrow();
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
  document.addEventListener('langchange', () => { relayout(); kcCur = -1; wheels.forEach(w => { w.cur = -1; }); if (slot && !slot.busy) slot.reset(); });
})();
