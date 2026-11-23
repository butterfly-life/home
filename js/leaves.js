/* 四階段：兩側靜止的樹＋循環落葉
   - 樹本身不動；葉子是獨立的透明葉片圖，從每棵樹冠邊緣 2～3 個固定點（data-pts）錯開放出
   - 動作全部是 CSS keyframes（隨時間播放，停住捲動也會繼續）：
       .lf       剛離開枝頭先輕微側移，接著沿弧線緩慢落下、飄出場景下緣（lfFall）
       .lf-sway  途中左右擺盪（lfSway）
       .lf-img   小幅翻轉（lfFlip）
   - JS 只負責「什麼時候放下一片、用哪些隨機數」：畫面上同時最多 3 片，每片之間留一點空檔
   - 場景離開視窗 → 暫停（animation-play-state）並停止放新葉子；開啟「減少動態效果」→ 只顯示靜態的樹
   - 本段沒有 GSAP ScrollTrigger；之後如果加了，讓它控制外層 .st4-scene，落葉在 .tr-leaves 裡照樣獨立播放 */
(() => {
  const scene = document.getElementById('st4Scene');
  if (!scene) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SRC = ['assets/trees/leaf-1.svg', 'assets/trees/leaf-2.svg', 'assets/trees/leaf-3.svg'];
  const MAX = 3;                 // 畫面上同時最多幾片
  const GAP = [2400, 4800];      // 兩片之間的間隔（毫秒）
  const rand = (a, b) => a + Math.random() * (b - a);

  const trees = [...scene.querySelectorAll('.tr')].map(el => {
    const mirror = el.classList.contains('tr-r');
    const pts = (el.dataset.pts || '').split(';').map(s => s.split(',').map(Number)).filter(p => p.length === 2)
      .map(([x, y]) => [mirror ? 100 - x : x, y]);
    return { el, layer: el.querySelector('.tr-leaves'), pts, mirror, last: -1 };
  }).filter(t => t.layer && t.pts.length);
  if (!trees.length) return;

  let live = 0, timer = 0, on = false, lastTree = -1;

  const spawn = () => {
    timer = 0;
    if (!on) return;
    if (live >= MAX) { schedule(900); return; }
    // 兩棵樹輪流為主，偶爾同一棵連續兩次
    let ti = trees.length > 1 && Math.random() < .75 ? (lastTree + 1) % trees.length : Math.floor(Math.random() * trees.length);
    lastTree = ti;
    const t = trees[ti];
    let pi; do { pi = Math.floor(Math.random() * t.pts.length); } while (t.pts.length > 1 && pi === t.last);
    t.last = pi;
    const [px, py] = t.pts[pi];

    // 落下距離：從出生點到場景下緣再多 60px（確定飄出畫面）
    const sr = scene.getBoundingClientRect(), tr = t.el.getBoundingClientRect();
    const fall = Math.max(200, sr.bottom - (tr.top + tr.height * py / 100) + 60);
    // 微風：大致吹向畫面中間（左樹往右、右樹往左），每片的量不同，偶爾反方向一點
    const toward = t.mirror ? -1 : 1;
    const drift = toward * rand(-30, 170);
    const kick = (drift >= 0 ? 1 : -1) * rand(14, 34);

    const lf = document.createElement('div');
    lf.className = 'lf';
    lf.style.cssText =
      `left:${px}%;top:${py}%;` +
      `--dur:${Math.max(5, fall / rand(40, 55)).toFixed(2)}s;--fall:${fall.toFixed(0)}px;--drift:${drift.toFixed(0)}px;--kick:${kick.toFixed(0)}px;` +
      `--sd:${rand(1.9, 2.9).toFixed(2)}s;--sw:${rand(14, 30).toFixed(0)}px;--rt:${rand(16, 32).toFixed(0)}deg;` +
      `--fd:${rand(2.4, 3.8).toFixed(2)}s;--fx:${rand(35, 60).toFixed(0)}deg;--fy:${rand(-25, 25).toFixed(0)}deg;` +
      `--r0:${rand(-50, 50).toFixed(0)}deg;--s:${rand(.8, 1.15).toFixed(2)}`;
    lf.innerHTML = `<div class="lf-sway"><img class="lf-img" src="${SRC[Math.floor(Math.random() * SRC.length)]}" alt=""></div>`;
    lf.addEventListener('animationend', e => {
      if (e.animationName !== 'lfFall') return;
      lf.remove(); live--;
    });
    t.layer.appendChild(lf);
    live++;
    schedule(rand(GAP[0], GAP[1]));
  };
  const schedule = ms => { clearTimeout(timer); timer = setTimeout(spawn, ms); };

  const setOn = v => {
    if (v === on) return;
    on = v;
    scene.classList.toggle('lf-paused', !on);
    if (on) schedule(live ? 1200 : 300);
    else { clearTimeout(timer); timer = 0; }
  };
  // 場景（四階段整段）在畫面裡才播放
  const host = scene.closest('#k-cycle') || scene;
  new IntersectionObserver(es => setOn(es[0].isIntersecting && !document.hidden)).observe(host);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setOn(false);
    else { const r = host.getBoundingClientRect(); setOn(r.bottom > 0 && r.top < innerHeight); }
  });
})();
