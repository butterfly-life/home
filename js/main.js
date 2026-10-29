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
    setTimeout(() => intro.remove(), 1000);
  };
  addEventListener('load', () => {
    if (reduce) return endIntro();
    requestAnimationFrame(() => intro.classList.add('show'));
    setTimeout(endIntro, 2500);
  });

  /* ---------- 選單 ---------- */
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });

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

  /* ---------- 1. Hero 手電筒 ---------- */
  const dark = $('#heroDark');
  if (matchMedia('(hover: hover)').matches) {
    let tx = 50, ty = 50, x = 50, y = 50, raf = 0;
    const tick = () => {
      x += (tx - x) * .15; y += (ty - y) * .15;
      dark.style.setProperty('--x', x + '%');
      dark.style.setProperty('--y', y + '%');
      raf = Math.abs(tx - x) + Math.abs(ty - y) > .1 ? requestAnimationFrame(tick) : 0;
    };
    $('#hero').addEventListener('pointermove', e => {
      const r = dark.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width * 100;
      ty = (e.clientY - r.top) / r.height * 100;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }

  /* ---------- 3. 蝴蝶輪播 ---------- */
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
  const pad = n => String(n).padStart(2, '0');
  const card = $('#spCard');
  let cur = 0;
  const show = i => {
    cur = (i + species.length) % species.length;
    const s = species[cur];
    card.classList.add('swap');
    setTimeout(() => {
      $('#spNo').textContent = `NO.${pad(cur + 1)}`;
      $('#spName').textContent = s.name;
      $('#spLatin').textContent = `${s.latin} · ${s.fam}`.toUpperCase();
      $('#spSay').textContent = '「【待補】蝴蝶的自我介紹。」';
      $('#spWing').textContent = `約 ${s.wing[0]}–${s.wing[1]}mm`;
      $('#spHost').textContent = s.host;
      $('#spBar').style.width = (s.wing[1] / 150 * 100) + '%';
      $('#spTint').style.backgroundColor = s.color;
      $('#spInk').src = `assets/${s.id}-ink.webp`;
      const img = $('#spImg');
      img.src = `assets/${s.id}-700.webp`;
      img.alt = `${s.name} ${s.latin}`;
      card.classList.remove('swap');
    }, reduce ? 0 : 250);
  };
  $('#spPrev').addEventListener('click', () => show(cur - 1));
  $('#spNext').addEventListener('click', () => show(cur + 1));
  show(0);

  if (!reduce && matchMedia('(hover: hover)').matches) {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5) * 2);
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5) * 2);
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--mx', 0); card.style.setProperty('--my', 0); });
  }

  /* ---------- 8. 照片：複製一份做無縫循環 ---------- */
  const reel = $('#reel');
  [...reel.children].forEach(li => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    reel.appendChild(c);
  });
})();
