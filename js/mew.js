/* 蝶影浮生 — mew.xyz 架構版互動
   主題切換、Header 收合、全螢幕選單、跑馬燈（隨捲動速度加速）、
   出場動畫、數字跑動、視差、卡片輪播（箭頭／拖曳／六種蝴蝶條跳轉） */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  if (new URLSearchParams(location.search).has('shot')) root.classList.add('shot');   // 截圖用：Hero 固定 900px 高

  /* ---------- 主題 A / B ---------- */
  $('#themeBtn').addEventListener('click', () => {
    const t = root.dataset.theme === 'b' ? 'a' : 'b';
    root.dataset.theme = t;
    try { localStorage.setItem('bf-theme', t); } catch (e) {}
    requestAnimationFrame(measureMarquees);              // 字型換了，寬度要重量
  });

  /* ---------- Header：往下捲收起、往上捲出現；選單 ---------- */
  const sh = $('#sh'), tog = $('#mtoggle');
  const setMenu = open => {
    sh.classList.toggle('--open', open);
    tog.setAttribute('aria-expanded', open);
    tog.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  tog.addEventListener('click', () => setMenu(!sh.classList.contains('--open')));
  $$('#mmenu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- 跑馬燈 ---------- */
  const marquees = $$('.mq').map(el => {
    const track = $('.mq-track', el), set = $('.mq-set', track);
    return { el, track, set, x: 0, w: 0, speed: +(el.dataset.speed || .5), dir: +(el.dataset.dir || 1), on: true };
  });
  function measureMarquees() {
    marquees.forEach(m => {
      $$('.mq-set', m.track).slice(1).forEach(n => n.remove());
      m.w = m.set.getBoundingClientRect().width || 1;
      const need = Math.ceil((innerWidth * 1.2) / m.w) + 1;
      for (let i = 0; i < need; i++) m.track.appendChild(m.set.cloneNode(true));
    });
  }
  const mqIO = new IntersectionObserver(es => es.forEach(e => {
    const m = marquees.find(m => m.el === e.target); if (m) m.on = e.isIntersecting;
  }), { rootMargin: '100px' });
  marquees.forEach(m => mqIO.observe(m.el));

  /* ---------- 視差 ---------- */
  const px = $$('[data-px]').map(el => ({ el, k: +el.dataset.px, base: getComputedStyle(el).transform }));
  const heroImg = $('.hero-bg img'), csImg = $('.cs-bg img');

  /* ---------- 主迴圈：跑馬燈＋捲動速度＋視差＋Header ---------- */
  let lastY = scrollY, vel = 0, headY = scrollY;
  function tick() {
    const y = scrollY, dy = y - lastY; lastY = y;
    vel += (Math.min(Math.abs(dy), 80) - vel) * .1;     // 捲越快，跑馬燈越快
    const boost = 1 + vel * .12;
    const dirFlip = dy < -1 ? -1 : 1;                    // 往上捲時反向（mew 的手感）
    if (!reduce) marquees.forEach(m => {
      if (!m.on) return;
      m.x -= m.speed * m.dir * boost * (vel > 2 ? dirFlip : 1);
      if (m.x <= -m.w) m.x += m.w;
      if (m.x > 0) m.x -= m.w;
      m.track.style.transform = `translate3d(${m.x}px,0,0)`;
    });

    if (!reduce) {
      const vh = innerHeight;
      px.forEach(p => {
        const r = p.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const t = (r.top + r.height / 2 - vh / 2) / vh;  // -1 ~ 1
        const rot = p.el.classList.contains('film-a') ? -2.5 : 2.5;
        p.el.style.transform = `translateX(${(t * p.k).toFixed(1)}px) rotate(${rot}deg)`;
      });
      if (y < vh * 1.2) heroImg.style.transform = `scale(1.08) translateY(${(y * .25).toFixed(1)}px)`;
      const cr = csImg.parentElement.getBoundingClientRect();
      if (cr.bottom > 0 && cr.top < vh) csImg.style.transform = `translateY(${((cr.top / vh) * -60).toFixed(1)}px)`;
    }

    if (!sh.classList.contains('--open')) {
      // headY＝最近一次換方向的位置；同方向捲超過 40px 才切換
      if ((dy > 0) !== (y > headY)) headY = y - dy;
      if (y < 120) sh.classList.remove('--hide');
      else if (y - headY > 40) sh.classList.add('--hide');
      else if (headY - y > 40) sh.classList.remove('--hide');
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 出場動畫 ---------- */
  const rvIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => rvIO.observe(el));

  /* ---------- 數字跑動 ---------- */
  const fmt = n => n.toLocaleString('en-US');
  const ctIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    ctIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count;
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 1600;
    const step = now => {
      const p = Math.min((now - t0) / dur, 1), ease = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(to * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => ctIO.observe(el));

  /* ---------- 卡片輪播 ---------- */
  const rail = $('#cdRail'), cards = $$('.card', rail), prev = $('#cdPrev'), next = $('#cdNext');
  const stepW = () => cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 20);
  const syncArrows = () => {
    prev.disabled = rail.scrollLeft < 8;
    next.disabled = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8;
  };
  prev.addEventListener('click', () => rail.scrollBy({ left: -stepW(), behavior: 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left: stepW(), behavior: 'smooth' }));
  rail.addEventListener('scroll', syncArrows, { passive: true });
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });
  // 滑鼠拖曳（觸控用原生捲動）
  let drag = null;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    drag = { x: e.clientX, s: rail.scrollLeft, moved: false };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; rail.classList.add('--drag'); }
    if (drag.moved) rail.scrollLeft = drag.s - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    if (!moved) return;
    rail.classList.remove('--drag');                      // 放開後吸附到最近的卡片
    const i = Math.round(rail.scrollLeft / stepW());
    rail.scrollTo({ left: i * stepW(), behavior: 'smooth' });
  });
  // 「六種蝴蝶」條：點名稱 → 捲到輪播、停在那張卡
  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.go;
    $('#species').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => rail.scrollTo({ left: i * stepW(), behavior: 'smooth' }), reduce ? 0 : 600);
  }));

  /* ---------- 啟動 ---------- */
  measureMarquees(); syncArrows(); requestAnimationFrame(tick);
  // 中文字型檔很大、底片圖也可能還沒載完：載到之後再重量一次寬度
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureMarquees);
  addEventListener('load', measureMarquees);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { measureMarquees(); syncArrows(); }, 200); });
})();
