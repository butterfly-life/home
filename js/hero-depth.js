/* 首頁的滑鼠景深晃動：
   LOGO 跟著滑鼠立體傾斜（rotateX / rotateY），LOGO 後面的植物與前面的植物再各自錯開一點 → LOGO 本身有前後層次；
   用插值慢慢追上滑鼠，帶一點延遲與慣性。（四周的漂浮物件已依需求移除） */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = document.getElementById('hero'), logo = document.getElementById('logo');
  if (!hero || !logo) return;
  const back = document.getElementById('logoBack'), front = document.getElementById('logoFront');
  const text = hero.querySelector('.hero-text');

  // 滑鼠位置（-1～1），平滑追上
  let tx = 0, ty = 0, mx = 0, my = 0, raf = 0, px = -9999, py = -9999;
  addEventListener('pointermove', e => {
    tx = e.clientX / innerWidth * 2 - 1;
    ty = e.clientY / innerHeight * 2 - 1;
    px = e.clientX; py = e.clientY;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { tx = ty = 0; px = py = -9999; });

  /* ---------- LOGO 上的植物：游標靠近時變回彩色，離開 0.6 秒後慢慢褪成灰褐色 ----------
     SVG 的濾鏡不能直接做轉場，所以準備 7 階「從原色到灰褐色」的濾鏡，每株植物依目前程度一階一階換過去 */
  const NS = 'http://www.w3.org/2000/svg', STEPS = 6;
  const defs = document.createElementNS(NS, 'defs');
  // 灰褐色＝去彩度後帶一點棕（sepia），再稍微壓暗；中間各階用矩陣線性內插
  const SEP = [.393, .769, .189, 0, 0, .349, .686, .168, 0, 0, .272, .534, .131, 0, 0, 0, 0, 0, 1, 0].map((v, i) => i % 5 === 3 || i >= 15 ? v : v * .82);
  const ID = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  for (let k = 1; k <= STEPS; k++) {
    const t = k / STEPS;
    defs.innerHTML += `<filter id="lfDull${k}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${ID.map((v, i) => (v + (SEP[i] - v) * t).toFixed(3)).join(' ')}"/></filter>`;
  }
  logo.prepend(defs);
  let plants = [];
  const collect = () => {
    plants = [...logo.querySelectorAll('#logoBack > g, #logoFront > g')].map(g => {
      const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(g.getAttribute('transform') || '');
      return { g, x: m ? +m[1] : 0, y: m ? +m[2] : 0, lv: STEPS, far: 0 };   // lv：0 = 原色，STEPS = 最灰褐
    });
    plants.forEach(p => p.g.setAttribute('filter', `url(#lfDull${STEPS})`));
  };
  /* ---------- 像相機對焦框一樣的灰色矩形：在首頁上不規律地快速跳來跳去 ---------- */
  const scans = [0, 1].map(() => {
    const el = document.createElement('i');
    el.className = 'hd-scan';
    el.setAttribute('aria-hidden', 'true');
    hero.appendChild(el);
    return { el, next: 0 };
  });
  const drawScans = now => {
    for (const s of scans) {
      if (now < s.next) continue;
      const W = innerWidth, H = innerHeight;
      const w = 90 + Math.random() * Math.min(420, W * .3), h = w * (.55 + Math.random() * .6);
      const x = Math.random() * (W - w), y = 200 + Math.random() * Math.max(10, H - 400 - h);
      const show = Math.random() > .18;                  // 偶爾消失一下
      s.el.style.cssText = `width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;transform:translate(${x.toFixed(0)}px,${y.toFixed(0)}px);opacity:${show ? 1 : 0}`;
      s.next = now + 90 + Math.random() * (Math.random() < .3 ? 900 : 260);   // 大多很快換位置，偶爾停久一點
    }
  };

  const NEAR = 190;                                     // 游標多近算「靠近」（px）
  let lastColor = 0;
  const colorPlants = now => {
    if (!plants.length || plants.length !== logo.querySelectorAll('#logoBack > g, #logoFront > g').length) collect();
    if (now - lastColor < 45) return;                   // 每一階約 45ms，全程約 0.3 秒
    lastColor = now;
    const m = logo.getScreenCTM();
    if (!m) return;
    for (const p of plants) {
      const sx = m.a * p.x + m.c * p.y + m.e, sy = m.b * p.x + m.d * p.y + m.f;
      const near = Math.hypot(sx - px, sy - py) < NEAR;
      let want = p.lv;
      if (near) {                                        // 靠近：立刻開始變回彩色
        p.far = 0; want = 0;
      } else { if (!p.far) p.far = now; if (now - p.far > 600) want = STEPS; }   // 離開 0.6 秒後才開始褪色
      p.near = near;
      if (want === p.lv) continue;
      p.lv += want > p.lv ? 1 : -1;
      if (p.lv) p.g.setAttribute('filter', `url(#lfDull${p.lv})`); else p.g.removeAttribute('filter');
    }
  };

  const draw = now => {
    raf = requestAnimationFrame(draw);
    if (hero.style.visibility === 'hidden') return;   // 已捲離首頁就不畫
    mx += (tx - mx) * .07; my += (ty - my) * .07;
    // 視差：LOGO 跟著游標轉向（游標在哪一側，那一側就朝游標轉過來），並往反方向微微位移
    logo.style.transform = `translate(-50%,-50%) translate3d(${(-mx * 16).toFixed(1)}px,${(-my * 11).toFixed(1)}px,0) ` +
      `perspective(1100px) rotateY(${(mx * 11).toFixed(2)}deg) rotateX(${(-my * 9).toFixed(2)}deg) rotateZ(${(mx * 6 + mx * my * 2).toFixed(2)}deg) scale(${(1 + Math.hypot(mx, my) * .03).toFixed(4)})`;   // 平面上也跟著游標轉動，游標越靠邊微微放大
    // LOGO 後面的植物退得多、前面的植物跟得多 → 前後層次
    if (back) back.style.transform = `translate(${(-mx * 18).toFixed(1)}px,${(-my * 13).toFixed(1)}px)`;
    if (front) front.style.transform = `translate(${(mx * 24).toFixed(1)}px,${(my * 17).toFixed(1)}px)`;
    if (text) text.style.transform = `translate(${(-mx * 4).toFixed(1)}px,${(-my * 3).toFixed(1)}px)`;
    colorPlants(now);
    drawScans(now);
  };
  /* ---------- 點擊首頁：一道淡淡的光從點擊處斜斜掃過畫面＋LOGO 上的植物像被風吹過一下 ---------- */
  // 首頁上面疊著摘要的捲動軌道（透明但會擋住點擊），所以改聽整個頁面的點擊，只在停在首頁時才觸發
  document.addEventListener('click', e => {
    if (e.target.closest('a,button,input,.nav,.intro,.cbar')) return;
    if (hero.style.visibility === 'hidden' || scrollY > innerHeight * .12) return;
    const r = hero.getBoundingClientRect();
    // 1. 光：一道斜的光帶，固定從畫面左邊掃到右邊
    const sweep = document.createElement('i');
    sweep.className = 'hd-sweep';
    hero.appendChild(sweep);
    sweep.animate([
      { opacity: 0, transform: `translateX(${-r.width * .5}px) skewX(-20deg)` },
      { opacity: 1, offset: .3 },
      { opacity: 1, offset: .7 },
      { opacity: 0, transform: `translateX(${r.width * 1.1}px) skewX(-20deg)` }
    ], { duration: 2400, easing: 'cubic-bezier(.37,0,.63,1)' }).finished.then(() => sweep.remove());   // 慢一點、緩進緩出
    // 2. 風：每株植物依離點擊處的距離，稍晚一點被吹動，往遠離點擊的方向彎一下再晃回來（疊加在原本的擺動上）
    const m = logo.getScreenCTM();
    if (!m) return;
    logo.querySelectorAll('.sway').forEach(el => {
      const b = el.getBoundingClientRect();
      const px = b.left + b.width / 2 - e.clientX, py = b.top + b.height / 2 - e.clientY;
      const d = Math.hypot(px, py);
      const k = Math.max(.25, 1 - d / (r.width * .9));                 // 離越遠吹得越輕
      const a = (px >= 0 ? 1 : -1) * (5 + Math.random() * 4) * k;
      el.animate([
        { transform: 'rotate(0deg)' },
        { transform: `rotate(${a.toFixed(2)}deg)`, offset: .25 },
        { transform: `rotate(${(-a * .45).toFixed(2)}deg)`, offset: .55 },
        { transform: `rotate(${(a * .18).toFixed(2)}deg)`, offset: .8 },
        { transform: 'rotate(0deg)' }
      ], { duration: 1500 + Math.random() * 500, delay: d * .55, easing: 'ease-in-out', composite: 'add' });
    });
  });

  raf = requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(draw);
  });
})();
