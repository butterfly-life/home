/* ==========================================================
   互動1：3D 小遊戲「蝶舞花島」
   選一隻蝴蝶 → 在浮空花島上飛行，採集 10 朵發光花蜜、解鎖成就
   需要 three.js r128（index.html 由 cdnjs 載入）與 js/game-tex.js（內嵌貼圖）
   ========================================================== */
(() => {
  'use strict';
  const game = document.getElementById('game');
  if (!game) return;
  const $ = id => document.getElementById(id);
  const cv = $('gmCv'), sorry = $('gmSorry');
  const fail = () => { sorry.hidden = false; game.classList.add('broken'); };
  if (!window.THREE || !window.GAME_TEX) return fail();
  const T = window.THREE, TEX = window.GAME_TEX;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true }); }
  catch (e) { return fail(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputEncoding = T.sRGBEncoding;

  /* ---------- 小工具 ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wrapAng = a => Math.atan2(Math.sin(a), Math.cos(a));
  let seed = 7;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const between = (a, b) => a + rnd() * (b - a);
  const loader = new T.TextureLoader();
  const tex = key => { const t = loader.load(TEX[key]); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; };
  // 柔邊圓點（光暈、影子用），用 canvas 畫
  const glowTex = (inner, outer) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  };

  const SPECIES = [
    ['idea', '大白斑蝶'], ['euploea', '小紫斑蝶'], ['tirumala', '淡紋青斑蝶'],
    ['kallima', '枯葉蝶'], ['demoleus', '花鳳蝶'], ['polytes', '玉帶鳳蝶']
  ];
  const PLANTS = ['p-oak', 'p-fern', 'p-ivy', 'p-sprig', 'p-frond', 'p-beech', 'p-poppy'];

  /* ---------- 場景 ---------- */
  const scene = new T.Scene();
  const SKY = new T.Color('#E6ECE4');
  scene.background = SKY;
  scene.fog = new T.Fog(SKY, 70, 190);
  const camera = new T.PerspectiveCamera(55, 16 / 9, .1, 400);
  scene.add(new T.HemisphereLight('#FFF8EC', '#6F8A62', .95));
  const sun = new T.DirectionalLight('#FFF0D2', .75);
  sun.position.set(40, 60, 25);
  scene.add(sun);

  // 低多邊形的面要用 Phong 才會照面著色（r128 的 Lambert 不支援 flatShading）
  // 地形：浮空花島（中間起伏、邊緣收成懸崖，底下是倒三角的岩塊）
  const ISL = 46, LAKE = [12, -8, 7];
  const ground = (x, z) => {
    const r = Math.hypot(x, z);
    const hills = 2.2 * Math.sin(x * .09 + 1.3) * Math.cos(z * .08 - .7) + 1.2 * Math.sin(x * .21 + z * .17) + .6 * Math.sin(z * .33 - x * .11);
    const lake = Math.hypot(x - LAKE[0], z - LAKE[1]);
    return (3 + hills) * (1 - smooth(ISL * .78, ISL, r)) - 3.4 * (1 - smooth(0, LAKE[2], lake));
  };
  {
    const g = new T.PlaneGeometry(ISL * 2 + 6, ISL * 2 + 6, 80, 80);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = [];
    const cSand = new T.Color('#D8CDA2'), cLow = new T.Color('#9DBE82'), cHigh = new T.Color('#5F8E52'), c = new T.Color();
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), z = p.getZ(i);
      const r = Math.hypot(x, z);
      let y;
      if (r > ISL) { x *= ISL / r; z *= ISL / r; y = -1.6; }      // 島外的頂點收到島緣，折成懸崖
      else y = ground(x, z);
      p.setXYZ(i, x, y, z);
      if (y < .6) c.copy(cSand); else c.copy(cLow).lerp(cHigh, clamp((y - 1) / 5, 0, 1));
      c.offsetHSL(0, 0, (rnd() - .5) * .05);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    scene.add(new T.Mesh(g, new T.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 0 })));
    // 島底岩塊
    const cone = new T.ConeGeometry(ISL, 30, 28, 6);
    cone.rotateX(Math.PI);
    const cp = cone.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const s = 1 + (rnd() - .5) * .18;
      cp.setXYZ(i, cp.getX(i) * s, cp.getY(i) + (rnd() - .5) * 1.5, cp.getZ(i) * s);
    }
    cone.computeVertexNormals();
    const rock = new T.Mesh(cone, new T.MeshPhongMaterial({ color: '#9C8B74', flatShading: true, shininess: 0 }));
    rock.position.y = -16.4;
    scene.add(rock);
    // 小湖
    const water = new T.Mesh(new T.CircleGeometry(LAKE[2] * .92, 40), new T.MeshLambertMaterial({ color: '#8FC0C4', transparent: true, opacity: .85 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(LAKE[0], .25, LAKE[1]);
    scene.add(water);
  }
  const onIsland = (x, z, pad = 0) => Math.hypot(x, z) < ISL * .82 - pad && Math.hypot(x - LAKE[0], z - LAKE[1]) > LAKE[2] + 1.5 + pad;
  const spot = (pad, rMin = 0) => { for (;;) { const a = rnd() * 6.283, r = Math.sqrt(between((rMin / ISL) ** 2, 1)) * ISL * .82, x = Math.cos(a) * r, z = Math.sin(a) * r; if (onIsland(x, z, pad)) return [x, z]; } };

  // 樹、石頭
  const leafMats = ['#7FA866', '#6B9A5A', '#93B571', '#5E8A54'].map(c => new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 0 }));
  const trunkMat = new T.MeshPhongMaterial({ color: '#8A6A4C', flatShading: true, shininess: 0 });
  const trees = [];
  for (let i = 0; i < 24; i++) {
    const [x, z] = spot(3, 6), s = between(.8, 1.5), t = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(.22 * s, .38 * s, 3 * s, 6), trunkMat);
    trunk.position.y = 1.5 * s;
    const crown = new T.Mesh(new T.IcosahedronGeometry(2 * s, 0), leafMats[i % 4]);
    crown.position.y = 3.6 * s; crown.rotation.set(rnd() * 3, rnd() * 3, 0);
    t.add(trunk, crown);
    t.position.set(x, ground(x, z) - .2, z);
    scene.add(t);
    trees.push([x, z, 2.4 * s, ground(x, z) + 5.6 * s]);
  }
  const rockMat = new T.MeshPhongMaterial({ color: '#B2A893', flatShading: true, shininess: 0 });
  for (let i = 0; i < 14; i++) {
    const [x, z] = spot(1), m = new T.Mesh(new T.DodecahedronGeometry(between(.5, 1.2), 0), rockMat);
    m.position.set(x, ground(x, z) + .2, z); m.rotation.set(rnd() * 3, rnd() * 3, 0);
    scene.add(m);
  }
  // 地上的花草（手繪素材，永遠面向鏡頭）
  const plantMats = PLANTS.map(k => new T.SpriteMaterial({ map: tex(k), alphaTest: .45 }));
  const ASPECT = { 'p-oak': 89 / 160, 'p-fern': 94 / 160, 'p-ivy': 129 / 160, 'p-sprig': 138 / 160, 'p-frond': 76 / 160, 'p-beech': 82 / 160, 'p-poppy': 97 / 160 };
  for (let i = 0; i < 190; i++) {
    const k = i % PLANTS.length, [x, z] = spot(.5), h = between(1.1, 2.4);
    const s = new T.Sprite(plantMats[k]);
    s.center.set(.5, 0);
    s.scale.set(h * ASPECT[PLANTS[k]], h, 1);
    s.position.set(x, ground(x, z) - .05, z);
    scene.add(s);
  }
  // 雲、周圍的小浮島
  const cloudMat = new T.MeshPhongMaterial({ color: '#FFFFFF', flatShading: true, shininess: 0, transparent: true, opacity: .92 });
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const c = new T.Group(), a = i / 12 * 6.283 + rnd() * .3, r = between(58, 100);
    for (let k = 0, n = 3 + (rnd() * 3 | 0); k < n; k++) {
      const b = new T.Mesh(new T.IcosahedronGeometry(between(2.5, 4.5), 1), cloudMat);
      b.position.set(k * 3.2 - n * 1.6, between(-.6, .8), between(-1.5, 1.5));
      c.add(b);
    }
    c.position.set(Math.cos(a) * r, between(8, 30), Math.sin(a) * r);
    c.userData = { a, r, sp: between(.004, .01) };
    scene.add(c); clouds.push(c);
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.283 + .4, r = between(64, 86), s = between(3, 6), g = new T.Group();
    const top = new T.Mesh(new T.CylinderGeometry(s, s * .9, .8, 9), leafMats[i % 4]);
    const bottom = new T.Mesh(new T.ConeGeometry(s * .9, s * 2.2, 9), new T.MeshPhongMaterial({ color: '#9C8B74', flatShading: true, shininess: 0 }));
    bottom.rotation.x = Math.PI; bottom.position.y = -s * 1.1 - .4;
    g.add(top, bottom);
    g.position.set(Math.cos(a) * r, between(-6, 10), Math.sin(a) * r);
    scene.add(g);
  }

  /* ---------- 花蜜（要採集的發光花） ---------- */
  const NECTAR = 10;
  const glow = glowTex('rgba(255,236,170,1)', 'rgba(255,214,120,0)');
  const beamMat = new T.MeshBasicMaterial({ color: '#FFE3A0', transparent: true, opacity: .2, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const flowerMats = [new T.SpriteMaterial({ map: tex('p-blossom'), alphaTest: .4 }), new T.SpriteMaterial({ map: tex('p-poppy'), alphaTest: .4 })];
  const nectars = [];
  {
    // 平均分散在島上（每次挑離已選點最遠的位置）
    const cand = Array.from({ length: 300 }, () => spot(2, 6));
    const pick = [cand[0]];
    while (pick.length < NECTAR) {
      let best = null, bd = -1;
      for (const c of cand) { const d = Math.min(...pick.map(p => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2)); if (d > bd) { bd = d; best = c; } }
      pick.push(best);
    }
    pick.forEach(([x, z], i) => {
      const g = new T.Group(), y = ground(x, z);
      const f = new T.Sprite(flowerMats[i % 2]);
      f.center.set(.5, 0);
      f.scale.set(i % 2 ? 1.6 : 2.6, 2.6, 1);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glow, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      halo.scale.setScalar(5); halo.position.y = 1.6;
      const beam = new T.Mesh(new T.CylinderGeometry(.12, .9, 18, 10, 1, true), beamMat);
      beam.position.y = 9;
      g.add(beam, f, halo);
      g.position.set(x, y, z);
      scene.add(g);
      nectars.push({ g, halo, x, y: y + 1.6, z, got: false, t: rnd() * 6 });
    });
  }

  /* ---------- 蝴蝶（貼圖從身體中線切成左右兩片翅膀） ---------- */
  const bfTex = {};
  const makeBf = (id, W) => {
    const map = bfTex[id] || (bfTex[id] = tex(id + '-fly'));
    const L = W * 207 / 256, mat = new T.MeshLambertMaterial({ map, transparent: true, alphaTest: .3, side: T.DoubleSide });
    const half = right => {
      const g = new T.PlaneGeometry(W / 2, L);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * .5 + (right ? .5 : 0));
      g.translate(right ? W / 4 : -W / 4, 0, 0);
      g.rotateX(-Math.PI / 2);                         // 平躺，頭朝 -Z
      return new T.Mesh(g, mat);
    };
    const root = new T.Group(), body = new T.Group(), wl = half(false), wr = half(true);
    body.add(wl, wr); root.add(body);
    return { root, body, wl, wr, phase: rnd() * 6 };
  };
  const flap = (b, dt, rate, amp) => {
    b.phase += dt * rate;
    const a = (Math.sin(b.phase) * .5 + .5) * amp - .12;
    b.wl.rotation.z = -a; b.wr.rotation.z = a;
    return Math.cos(b.phase);
  };
  const shadowTex = glowTex('rgba(30,40,30,.5)', 'rgba(30,40,30,0)');
  const shadow = new T.Mesh(new T.PlaneGeometry(3, 3), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  let me = null, myId = 'idea';
  const pl = { x: 0, y: 8, z: 30, yaw: 0, speed: 0, vy: 0, roll: 0 };
  const setPlayer = id => {
    if (me) scene.remove(me.root);
    myId = id;
    me = makeBf(id, 3);
    scene.add(me.root);
    friends.forEach(f => { f.b.root.visible = f.id !== id; });
  };
  // 其他五種蝴蝶在島上閒逛
  const friends = SPECIES.map(([id]) => {
    const b = makeBf(id, 2.2);
    scene.add(b.root);
    const [x, z] = spot(0);
    return { id, b, x, y: between(4, 10), z, yaw: rnd() * 6, tx: x, tz: z, ty: 6, next: 0 };
  });

  // 採到花蜜時的光點
  const BURST = 60, bGeo = new T.BufferGeometry(), bPos = new Float32Array(BURST * 3), bVel = new Float32Array(BURST * 3);
  bGeo.setAttribute('position', new T.BufferAttribute(bPos, 3));
  const burst = new T.Points(bGeo, new T.PointsMaterial({ color: '#FFD878', size: .45, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
  let burstT = 9;
  scene.add(burst);
  const pop = (x, y, z) => {
    for (let i = 0; i < BURST; i++) {
      bPos.set([x, y, z], i * 3);
      const a = rnd() * 6.283, u = rnd() * 2 - 1, s = between(3, 8), q = Math.sqrt(1 - u * u);
      bVel.set([Math.cos(a) * q * s, u * s + 3, Math.sin(a) * q * s], i * 3);
    }
    bGeo.attributes.position.needsUpdate = true;
    burstT = 0;
  };

  /* ---------- 成就、提示 ---------- */
  const ACH = [
    ['fly', '🦋', '振翅起飛'], ['first', '🌸', '第一口花蜜'], ['friend', '🤝', '遇見同伴'],
    ['high', '☁️', '乘風而上'], ['loop', '🔄', '環島一周'], ['all', '🏆', '採蜜完成']
  ];
  const badges = $('gmBadges');
  badges.innerHTML = ACH.map(([id, ic, name]) => `<li data-a="${id}" title="${name}" aria-label="成就：${name}（未解鎖）">${ic}</li>`).join('');
  const got = new Set();
  const toastEl = $('gmToast'), toasts = [];
  let toastBusy = false;
  const nextToast = () => {
    if (toastBusy || !toasts.length) return;
    toastBusy = true;
    toastEl.innerHTML = toasts.shift();
    toastEl.classList.add('on');
    setTimeout(() => { toastEl.classList.remove('on'); setTimeout(() => { toastBusy = false; nextToast(); }, 400); }, 2200);
  };
  const toast = html => { toasts.push(html); nextToast(); };
  const unlock = id => {
    if (got.has(id)) return;
    got.add(id);
    const [, ic, name] = ACH.find(a => a[0] === id), li = badges.querySelector(`[data-a="${id}"]`);
    li.classList.add('got'); li.setAttribute('aria-label', `成就：${name}（已解鎖）`);
    toast(`<small>ACHIEVEMENT ${got.size} / ${ACH.length}</small>${ic} ${name}`);
  };

  /* ---------- 選蝴蝶、開始、重玩 ---------- */
  const pickBox = $('gmPick');
  pickBox.innerHTML = SPECIES.map(([id, name], i) =>
    `<button type="button" role="radio" aria-checked="${i === 0}" aria-label="${name}" data-id="${id}" style="background-image:url(assets/${id}-fly.png)"></button>`).join('') +
    '<p class="gm-pick-name" id="gmPickName" style="flex-basis:100%">大白斑蝶</p>';
  pickBox.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    pickBox.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b));
    $('gmPickName').textContent = b.getAttribute('aria-label');
    setPlayer(b.dataset.id);
  });
  let playing = false, done = false, elapsed = 0, nectarN = 0, loopAcc = 0, lastAng = 0;
  const nectarEl = $('gmNectar'), timeEl = $('gmTime'), doneEl = $('gmDone');
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const reset = () => {
    Object.assign(pl, { x: 0, y: 8, z: 30, yaw: 0, speed: 0, vy: 0, roll: 0 });
    nectars.forEach(n => { n.got = false; n.g.visible = true; n.g.scale.setScalar(1); });
    nectarN = 0; elapsed = 0; loopAcc = 0; lastAng = Math.atan2(pl.z, pl.x); done = false;
    got.clear(); badges.querySelectorAll('li').forEach(li => li.classList.remove('got'));
    nectarEl.textContent = 0; timeEl.textContent = '00:00';
    doneEl.hidden = true;
  };
  const start = () => {
    reset();
    playing = true;
    game.classList.add('playing');
    game.focus({ preventScroll: true });
    toast('<small>START</small>跟著光柱找到花蜜吧');
  };
  $('gmGo').addEventListener('click', start);
  $('gmAgain').addEventListener('click', start);
  $('gmFull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (game.requestFullscreen) game.requestFullscreen().catch(() => {});
  });

  /* ---------- 操作：鍵盤、按住滑鼠／手指 ---------- */
  const keys = new Set();
  const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'u', ShiftLeft: 'd', ShiftRight: 'd' };
  const focused = () => game === document.activeElement || game.contains(document.activeElement);
  addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (!k || !playing || !focused()) return;
    if (e.target.closest && e.target.closest('button') && (e.code === 'Space')) return;
    e.preventDefault();
    keys.add(k);
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
  addEventListener('blur', () => keys.clear());
  let steer = null;
  cv.addEventListener('pointerdown', e => {
    if (!playing) return;
    e.preventDefault();
    game.focus({ preventScroll: true });
    cv.setPointerCapture(e.pointerId);
    const r = cv.getBoundingClientRect();
    steer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  });
  cv.addEventListener('pointermove', e => {
    if (!steer) return;
    const r = cv.getBoundingClientRect();
    steer.x = (e.clientX - r.left) / r.width; steer.y = (e.clientY - r.top) / r.height;
  });
  const endSteer = () => { steer = null; };
  cv.addEventListener('pointerup', endSteer);
  cv.addEventListener('pointercancel', endSteer);
  cv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- 每一格 ---------- */
  const fwd = new T.Vector3(), camGoal = new T.Vector3(), look = new T.Vector3(), lookS = new T.Vector3(0, 4, 0);
  let t = 0;
  const update = dt => {
    t += dt;
    // 輸入 → 前進、轉向、升降
    let f = 0, turn = 0, up = 0;
    if (playing && !done) {
      if (keys.has('f')) f += 1;
      if (keys.has('b')) f -= .5;
      if (keys.has('l')) turn += 1;
      if (keys.has('r')) turn -= 1;
      if (keys.has('u')) up += 1;
      if (keys.has('d')) up -= 1;
      if (steer) { f = 1; turn = clamp(-(steer.x - .5) * 2.6, -1, 1); up = clamp((.5 - steer.y) * 2.4, -1, 1); }
    } else {                                           // 展示模式：繞島慢飛
      f = .55; turn = .32; up = (8 + Math.sin(t * .3) * 3 - pl.y) * .3;
    }
    pl.speed = damp(pl.speed, f * 13, 2.2, dt);
    pl.yaw += turn * 1.7 * dt;
    pl.vy = damp(pl.vy, up * 7, 3, dt);
    pl.roll = damp(pl.roll, -turn * .55, 4, dt);
    pl.x += -Math.sin(pl.yaw) * pl.speed * dt;
    pl.z += -Math.cos(pl.yaw) * pl.speed * dt;
    pl.y += pl.vy * dt;
    // 邊界：離島太遠就被風吹回來；不能鑽到地面或樹冠裡、也不能飛太高
    const r = Math.hypot(pl.x, pl.z);
    if (r > 72) { pl.x *= 72 / r; pl.z *= 72 / r; pl.yaw += wrapAng(Math.atan2(pl.x, pl.z) - pl.yaw) * dt * 2; }
    let floor = (r < ISL ? ground(pl.x, pl.z) : -4) + 1.2;
    trees.forEach(([x, z, cr, top]) => { if (Math.hypot(pl.x - x, pl.z - z) < cr) floor = Math.max(floor, top); });
    pl.y = clamp(pl.y, floor, 32);
    if (playing && !done && (Math.abs(pl.speed) > 2 || Math.abs(pl.vy) > 2)) unlock('fly');
    if (playing && !done && pl.y > 24) unlock('high');

    // 蝴蝶本身：拍翅（往上飛拍得快，滑翔時慢）、上下起伏、轉彎側傾
    const moving = Math.min(1, Math.abs(pl.speed) / 8 + Math.max(0, pl.vy) / 4);
    const beat = flap(me, dt, 7 + moving * 9, .55 + moving * .5);
    me.root.position.set(pl.x, pl.y + beat * .12, pl.z);
    me.root.rotation.set(0, pl.yaw, 0);
    me.body.rotation.set(clamp(pl.vy * .04, -.35, .35) - .08, 0, pl.roll, 'XYZ');
    const gy = r < ISL ? ground(pl.x, pl.z) : -40;
    shadow.position.set(pl.x, gy + .08, pl.z);
    shadow.material.opacity = clamp(1 - (pl.y - gy) / 18, 0, 1) * .9;
    shadow.scale.setScalar(1 + (pl.y - gy) * .05);

    // 環島一周：累計繞島中心轉過的角度
    const ang = Math.atan2(pl.z, pl.x);
    if (playing && !done) { loopAcc += wrapAng(ang - lastAng); if (Math.abs(loopAcc) > Math.PI * 2) unlock('loop'); }
    lastAng = ang;

    // 花蜜：脈動、靠近就採到
    nectars.forEach(n => {
      if (!n.g.visible) return;
      n.t += dt;
      if (n.got) { const s = n.g.scale.x - dt * 3; if (s <= 0) n.g.visible = false; else n.g.scale.setScalar(s); return; }
      n.halo.scale.setScalar(4.6 + Math.sin(n.t * 3) * .7);
      n.halo.position.y = 1.6 + Math.sin(n.t * 2) * .15;
      if (playing && !done && Math.hypot(pl.x - n.x, pl.y - n.y, pl.z - n.z) < 3) {
        n.got = true; nectarN++;
        nectarEl.textContent = nectarN;
        pop(n.x, n.y, n.z);
        unlock('first');
        if (nectarN < NECTAR) toast(`<small>NECTAR</small>採到花蜜 ${nectarN} / ${NECTAR}`);
        else finish();
      }
    });
    if (burstT < 1.4) {
      burstT += dt;
      for (let i = 0; i < BURST * 3; i += 3) {
        bVel[i + 1] -= 9 * dt;
        bPos[i] += bVel[i] * dt; bPos[i + 1] += bVel[i + 1] * dt; bPos[i + 2] += bVel[i + 2] * dt;
      }
      bGeo.attributes.position.needsUpdate = true;
      burst.material.opacity = Math.max(0, 1 - burstT / 1.4);
    }

    // 同伴：各自找目標點慢慢飛
    friends.forEach(fr => {
      if (!fr.b.root.visible) return;
      if (t > fr.next || Math.hypot(fr.tx - fr.x, fr.tz - fr.z) < 2) {
        [fr.tx, fr.tz] = spot(0); fr.ty = between(3, 12); fr.next = t + between(5, 10);
      }
      fr.yaw += wrapAng(Math.atan2(-(fr.tx - fr.x), -(fr.tz - fr.z)) - fr.yaw) * Math.min(1, dt * 1.2);
      fr.x += -Math.sin(fr.yaw) * 5 * dt; fr.z += -Math.cos(fr.yaw) * 5 * dt;
      fr.y = damp(fr.y, Math.max(fr.ty, ground(fr.x, fr.z) + 1.5), .8, dt);
      const b = flap(fr.b, dt, 11, .9);
      fr.b.root.position.set(fr.x, fr.y + b * .15, fr.z);
      fr.b.root.rotation.set(0, fr.yaw, 0);
      if (playing && !done && elapsed > 4 && Math.hypot(pl.x - fr.x, pl.y - fr.y, pl.z - fr.z) < 4) unlock('friend');
    });
    clouds.forEach(c => { c.userData.a += c.userData.sp * dt; c.position.x = Math.cos(c.userData.a) * c.userData.r; c.position.z = Math.sin(c.userData.a) * c.userData.r; });

    // 鏡頭：跟在蝴蝶後上方，帶一點延遲
    fwd.set(-Math.sin(pl.yaw), 0, -Math.cos(pl.yaw));
    camGoal.set(pl.x - fwd.x * 7.5, pl.y + 3.4, pl.z - fwd.z * 7.5);
    const cg = Math.hypot(camGoal.x, camGoal.z) < ISL ? ground(camGoal.x, camGoal.z) + 1.5 : -30;
    camGoal.y = Math.max(camGoal.y, cg);
    const k = 1 - Math.exp(-3 * dt);
    camera.position.lerp(camGoal, k);
    look.set(pl.x + fwd.x * 5, pl.y + 1, pl.z + fwd.z * 5);
    lookS.lerp(look, 1 - Math.exp(-6 * dt));
    camera.lookAt(lookS);

    if (playing && !done) { elapsed += dt; timeEl.textContent = fmt(elapsed); }
  };
  const finish = () => {
    unlock('all');
    done = true;
    setTimeout(() => {
      $('gmDoneTxt').textContent = `用時 ${fmt(elapsed)}　·　解鎖成就 ${got.size} / ${ACH.length}`;
      doneEl.hidden = false;
      playing = false;
      game.classList.remove('playing');
    }, 1600);
  };

  /* ---------- 畫面大小、只在看得到時才跑 ---------- */
  const resize = () => {
    const w = game.clientWidth, h = game.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  if (window.ResizeObserver) new ResizeObserver(resize).observe(game);
  addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', resize);
  resize();
  let visible = false, raf = 0, last = 0;
  const frame = now => {
    raf = 0;
    if (cv.width !== Math.round(game.clientWidth * renderer.getPixelRatio())) resize();
    const dt = Math.min(.05, (now - last) / 1000 || .016);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const run = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const section = game.closest('section') || game;
  section.addEventListener('pagevisible', () => { visible = true; run(); });
  section.addEventListener('pagehidden', () => { visible = false; keys.clear(); steer = null; });
  document.addEventListener('visibilitychange', run);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; run(); })).observe(game);

  setPlayer('idea');
  reset();
  camera.position.set(0, 14, 48);
  renderer.render(scene, camera);
})();
