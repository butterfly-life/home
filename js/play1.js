/* 互動1：把家種回來 —— 即時 3D，用平塗色塊＋墨線＋紙紋，讓 3D 看起來像手繪插畫
   流程：前情提要（對話框）→ 鏡頭轉到地面 → 拖曳畫出植物的生長軌跡、放開種下 → 家園恢復、蝴蝶回來 */
(() => {
  const $ = s => document.querySelector(s);
  const box = $('#p3');
  if (!box) return;
  const canvas = $('#p3c'), dialog = $('#p3Dialog'), whoEl = $('#p3Who'), lineEl = $('#p3Line'), nextBtn = $('#p3Next');
  const hud = $('#p3Hud'), countEl = $('#p3Count'), fallback = $('#p3Fallback');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fail = () => { fallback.hidden = false; canvas.style.display = 'none'; };
  if (!window.THREE) return fail();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { return fail(); }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));

  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const rng = (seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(9241);
  const rand = (a, b) => a + rng() * (b - a);

  /* ---------- 場景、鏡頭、光（光從左上方來，和網站其他地方一致） ---------- */
  const scene = new THREE.Scene();
  const SKY = [new THREE.Color('#D9CDB2'), new THREE.Color('#CFE3E4')];     // [受破壞, 恢復後]
  scene.background = SKY[0].clone();
  scene.fog = new THREE.Fog(scene.background, 24, 62);
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, .1, 200);
  const CAM_INTRO = { pos: new THREE.Vector3(0, 3, 13.5), look: new THREE.Vector3(0, 1.7, 0) };
  const CAM_PLANT = { pos: new THREE.Vector3(0, 7.6, 11.5), look: new THREE.Vector3(0, .2, .5) };
  const camBase = CAM_INTRO.pos.clone(), camLook = CAM_INTRO.look.clone();
  camera.position.copy(camBase);
  scene.add(new THREE.AmbientLight(0xffffff, .42));
  const sun = new THREE.DirectionalLight(0xffffff, .5);
  sun.position.set(-6, 10, 7);
  scene.add(sun);

  /* ---------- 手繪感材質：三階色調＋墨線描邊 ---------- */
  const grad = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.LuminanceFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
  const flat = c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  const INK = 0x24211d;
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const lineMat = new THREE.LineBasicMaterial({ color: INK });
  const outline = (mesh, s = 1.07) => { const o = new THREE.Mesh(mesh.geometry, inkMat); o.scale.setScalar(s); mesh.add(o); return mesh; };
  const edges = mesh => { mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 15), lineMat)); return mesh; };
  const shape = (pts, close = true) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    if (close) s.closePath();
    return s;
  };
  const restorable = [];                              // 隨種植進度從枯黃變回翠綠的材質
  const colorPair = (mat, bad, good) => { restorable.push({ mat, bad: new THREE.Color(bad), good: new THREE.Color(good) }); mat.color.set(bad); return mat; };

  /* ---------- 地面 ---------- */
  const groundMat = colorPair(toon('#CDB98C'), '#CDB98C', '#9DBF78');
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  for (let i = 0; i < 26; i++) {                     // 地上的色斑
    const m = colorPair(flat('#BFA978'), '#BFA978', '#86AE66');
    const d = new THREE.Mesh(new THREE.CircleGeometry(rand(.4, 1.4), 18), m);
    d.rotation.x = -Math.PI / 2;
    d.position.set(rand(-16, 16), .01, rand(-14, 6));
    d.scale.y = rand(.4, .8);
    scene.add(d);
  }

  /* ---------- 遠景：山稜（平塗＋描線）、工廠和煙 ---------- */
  const far = new THREE.Group();
  scene.add(far);
  [[-30, '#B8AE98', '#AFC4B8', 7], [-24, '#A99F88', '#93B09E', 5.5], [-19, '#988E78', '#7E9E86', 4]].forEach(([z, bad, good, h], k) => {
    const pts = [[-40, 0]];
    for (let x = -40; x <= 40; x += rand(3, 6)) pts.push([x, h * (.45 + rng() * .55)]);
    pts.push([40, 0]);
    const m = edges(new THREE.Mesh(new THREE.ShapeGeometry(shape(pts)), colorPair(flat(bad), bad, good)));
    m.position.set(k * 2 - 2, 0, z);
    far.add(m);
  });
  const factory = new THREE.Group();
  [[0, 1.6, 0, 3.2, 3.2, 2], [2.6, 1.1, .4, 2.2, 2.2, 1.8]].forEach(([x, y, z, w, h, d]) => {
    const b = outline(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon('#9C948A')), 1.04);
    b.position.set(x, y, z);
    factory.add(b);
  });
  const chimneys = [[-.6, 4.2], [.8, 4.8]].map(([x, h]) => {
    const c = outline(new THREE.Mesh(new THREE.CylinderGeometry(.28, .36, h, 10), toon('#8A8178')), 1.08);
    c.position.set(x, h / 2, 0);
    factory.add(c);
    return new THREE.Vector3(x, h, 0);
  });
  factory.position.set(11, 0, -16);
  scene.add(factory);
  const puffs = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.MeshBasicMaterial({ color: '#8D867D', transparent: true, opacity: .8 });
    const p = outline(new THREE.Mesh(new THREE.SphereGeometry(.6, 12, 10), m), 1.06);
    p.userData = { t: i / 14, c: chimneys[i % 2], m };
    scene.add(p);
    return p;
  });

  /* ---------- 中景：被砍掉的樹樁、枯樹、還活著的樹 ---------- */
  const mid = new THREE.Group();
  scene.add(mid);
  const crowns = [];                                  // 枯樹的樹冠：家園恢復時長回來
  for (let i = 0; i < 16; i++) {
    const x = rand(-15, 15), z = rand(-13, -4), kind = i % 3;
    const trunkH = kind === 0 ? .5 : rand(1.6, 2.6);
    const trunk = outline(new THREE.Mesh(new THREE.CylinderGeometry(.2, .3, trunkH, 8), toon('#7A5B40')), 1.12);
    trunk.position.set(x, trunkH / 2, z);
    mid.add(trunk);
    if (kind === 0) {                                 // 樹樁：上面是淺色年輪
      const top = new THREE.Mesh(new THREE.CircleGeometry(.2, 12), flat('#E2C99A'));
      top.rotation.x = -Math.PI / 2; top.position.set(x, trunkH + .01, z);
      mid.add(top);
      continue;
    }
    const crown = outline(new THREE.Mesh(kind === 1 ? new THREE.ConeGeometry(1.1, 2.6, 7) : new THREE.IcosahedronGeometry(1.1, 0),
      colorPair(toon('#8C8A5A'), '#8C8A5A', '#5F9A55')), 1.06);
    crown.position.set(x, trunkH + 1, z);
    mid.add(crown);
    if (i % 2) { crown.scale.setScalar(.01); crowns.push(crown); }   // 一半是枯樹
  }

  /* ---------- 前景：大葉子，離鏡頭最近、移動最快 ---------- */
  const near = new THREE.Group();
  scene.add(near);
  const leafShape = (w, h) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(w, h * .25, w * .8, h * .8, 0, h);
    s.bezierCurveTo(-w * .8, h * .8, -w, h * .25, 0, 0);
    return s;
  };
  const leafMesh = (w, h, color) => {
    const g = new THREE.Group();
    const m = edges(new THREE.Mesh(new THREE.ShapeGeometry(leafShape(w, h), 10), flat(color)));
    g.add(m);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, .01), new THREE.Vector3(0, h * .92, .01)]), lineMat));
    return g;
  };
  const nearLeaves = [[-4.6, -.4, 7.2, -.55, '#4F7A45'], [-3.9, -.9, 7.6, -.2, '#6B9455'], [4.6, -.4, 7, .5, '#557F48'], [3.8, -1, 7.7, .15, '#7DA35F']].map(([x, y, z, rz, c]) => {
    const l = leafMesh(.9, 2.8, c);
    l.position.set(x, y, z); l.rotation.z = rz; l.rotation.y = x < 0 ? .5 : -.5;
    l.userData.rz = rz; l.userData.x = x;
    near.add(l);
    return l;
  });

  /* ---------- 蝴蝶（主角是大白斑蝶；回來的蝴蝶用網站介紹的八種配色） ---------- */
  const WING = (() => {
    const f = new THREE.Shape();
    f.moveTo(0, .05); f.bezierCurveTo(-.2, .6, -.9, 1, -1.25, .85); f.bezierCurveTo(-1.4, .6, -1.2, .2, -.85, 0); f.bezierCurveTo(-.5, -.08, -.2, -.05, 0, 0);
    const h = new THREE.Shape();
    h.moveTo(0, 0); h.bezierCurveTo(-.35, -.02, -.95, -.15, -1, -.5); h.bezierCurveTo(-1, -.85, -.6, -.95, -.3, -.8); h.bezierCurveTo(-.12, -.6, -.03, -.3, 0, 0);
    return new THREE.ShapeGeometry([f, h], 12);
  })();
  const SPECIES = [['#FFFFFF', '#1C1A17'], ['#4A3352', '#F3EEF8'], ['#3A322B', '#CFE8F0'], ['#2A2420', '#FFFFFF'],
    ['#7A5232', '#F08A2E'], ['#FFFDF8', '#F08A2E'], ['#2B2622', '#F2D36B'], ['#26221F', '#F4EEDC']];
  const makeButterfly = (k, size = 1) => {
    const [base, mark] = SPECIES[k];
    const g = new THREE.Group(), body = new THREE.Group();
    const wings = [-1, 1].map(side => {
      const w = new THREE.Group();
      const m = edges(new THREE.Mesh(WING, flat(base)));
      w.add(m);
      [[-.7, .55, .09], [-.95, .7, .07], [-.55, -.5, .08], [-.4, .3, .06]].forEach(([x, y, r]) => {
        const s = new THREE.Mesh(new THREE.CircleGeometry(r, 10), flat(mark));
        s.position.set(x, y, .005);
        w.add(s);
      });
      w.scale.x = side;
      body.add(w);
      return w;
    });
    const torso = outline(new THREE.Mesh(new THREE.CylinderGeometry(.07, .05, 1.1, 8), toon('#2A2420')), 1.25);
    body.add(torso);
    [-1, 1].forEach(s => body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, .5, 0), new THREE.Vector3(s * .25, .95, 0)]), lineMat)));
    body.rotation.x = -1.05;                          // 從斜上方看，翅膀接近水平
    g.add(body);
    g.scale.setScalar(size);
    g.userData = { wings, phase: rand(0, 6), speed: rand(14, 18) };
    return g;
  };
  const flapAll = [];
  const hero = makeButterfly(0, .9);
  hero.position.set(1.6, 2.6, 3);
  scene.add(hero);
  flapAll.push(hero);

  /* ---------- 對話框：打字機效果，點「下一步」繼續 ---------- */
  let lines = [], li = 0, typing = 0, onDone = null;
  const typeLine = text => {
    clearInterval(typing);
    let c = 0;
    lineEl.textContent = '';
    lineEl.classList.add('typing');
    if (reduce) { lineEl.textContent = text; lineEl.classList.remove('typing'); return; }
    typing = setInterval(() => {
      lineEl.textContent = text.slice(0, ++c);
      if (c >= text.length) { clearInterval(typing); typing = 0; lineEl.classList.remove('typing'); }
    }, 42);
  };
  const say = (who, list, done, lastLabel = '下一步') => {
    lines = list; li = 0; onDone = done;
    whoEl.textContent = who;
    dialog.classList.add('show');
    nextBtn.dataset.last = lastLabel;
    typeLine(lines[0]);
    nextBtn.firstChild.textContent = (lines.length === 1 ? lastLabel : '下一步') + ' ';
  };
  nextBtn.addEventListener('click', () => {
    if (typing) { clearInterval(typing); typing = 0; lineEl.textContent = lines[li]; lineEl.classList.remove('typing'); return; }   // 先把這句打完
    li++;
    if (li >= lines.length) { dialog.classList.remove('show'); const d = onDone; onDone = null; if (d) d(); return; }
    typeLine(lines[li]);
    nextBtn.firstChild.textContent = (li === lines.length - 1 ? nextBtn.dataset.last : '下一步') + ' ';
  });

  /* ---------- 流程 ---------- */
  let mode = 'intro', camT = 1, camFrom = null, camTo = null;
  const INTRO = [
    '嗨，我是大白斑蝶。這片森林，曾經是我的家。',
    '可是樹一棵棵被砍掉，工廠的煙遮住了天空，夏天也越來越熱。',
    '我的寄主植物「爬森藤」不見了，孩子們沒有東西可以吃……',
    '我們只好離開家園，四處尋找新的落腳處。',
    '你願意幫我們，把家一點一點種回來嗎？'
  ];
  const startIntro = () => say('大白斑蝶', INTRO, toPlanting, '開始種植');
  const toPlanting = () => {
    mode = 'toPlant';
    camFrom = { pos: camBase.clone(), look: camLook.clone() };
    camTo = CAM_PLANT;
    camT = 0;
    setTimeout(() => {
      mode = 'plant';
      box.classList.add('planting');
      hud.classList.add('show');
      say('提示', ['按住地面往上拖曳，畫出植物生長的方向；放開滑鼠的那一刻，植物就會沿著你的軌跡長出來。'], null, '知道了');
    }, reduce ? 0 : 1700);
  };

  /* ---------- 種植：拖曳畫出生長軌跡，放開時沿軌跡長出植物 ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let drawPlane = null, trail = [], preview = null, startPt = null;
  const GOAL = 6;
  let planted = 0;
  const toNDC = e => {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const hit = plane => { const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? p : null; };
  const dashMat = new THREE.LineDashedMaterial({ color: INK, dashSize: .18, gapSize: .12 });
  canvas.addEventListener('pointerdown', e => {
    if (mode !== 'plant') return;
    toNDC(e);
    const p = hit(groundPlane);
    if (!p || p.length() > 10) return;
    startPt = p;
    // 立起一面穿過起點、面向鏡頭的垂直平面，往上拖就是往上長
    const n = camera.position.clone().sub(p); n.y = 0; n.normalize();
    drawPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
    trail = [p.clone()];
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drawPlane) return;
    toNDC(e);
    const p = hit(drawPlane);
    if (!p) return;
    p.y = Math.max(.05, Math.min(p.y, 6));
    if (p.distanceTo(trail[trail.length - 1]) < .12 || trail.length > 80) return;
    trail.push(p);
    if (preview) { scene.remove(preview); preview.geometry.dispose(); }
    preview = new THREE.Line(new THREE.BufferGeometry().setFromPoints(trail), dashMat);
    preview.computeLineDistances();
    scene.add(preview);
  });
  const endDraw = () => {
    if (!drawPlane) return;
    drawPlane = null;
    if (preview) { scene.remove(preview); preview.geometry.dispose(); preview = null; }
    const height = Math.max(...trail.map(p => p.y));
    if (trail.length >= 4 && height > .5) growPlant(trail);
    trail = [];
  };
  canvas.addEventListener('pointerup', endDraw);
  canvas.addEventListener('pointercancel', endDraw);

  const growing = [];
  const LEAF_C = ['#6E9A5B', '#8DB27A', '#5D8A4E', '#A3C08A'], FLOWER_C = ['#F2B8B8', '#F6D27A', '#BFD7EA', '#E8A0C8', '#F4A46A', '#FFFFFF'];
  const growPlant = pts => {
    // 軌跡點太密時抽樣，讓莖順一點
    const simple = pts.filter((p, i) => i === 0 || i === pts.length - 1 || i % 2 === 0);
    const curve = new THREE.CatmullRomCurve3(simple);
    const SEG = 80, RAD = 6;
    const stemGeo = new THREE.TubeGeometry(curve, SEG, .07, RAD, false);
    const inkGeo = new THREE.TubeGeometry(curve, SEG, .115, RAD, false);
    const stem = new THREE.Mesh(stemGeo, toon('#6E8F4E')), stemInk = new THREE.Mesh(inkGeo, inkMat);
    stemGeo.setDrawRange(0, 0); inkGeo.setDrawRange(0, 0);
    const plant = new THREE.Group();
    plant.add(stem, stemInk);
    // 葉子：沿著莖交錯長出來
    const camDir = camera.position.clone().sub(pts[0]).normalize();
    const leaves = [.28, .45, .62, .78].map((t, k) => {
      const p = curve.getPointAt(t), T = curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(T, camDir).normalize().multiplyScalar(k % 2 ? 1 : -1);
      const dir = side.multiplyScalar(1).add(T.clone().multiplyScalar(.7)).add(new THREE.Vector3(0, .25, 0)).normalize();
      const l = leafMesh(.32, .9, LEAF_C[k % 4]);
      l.position.copy(p);
      l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      l.scale.setScalar(.001);
      plant.add(l);
      return { obj: l, t, s: rand(.85, 1.2) };
    });
    // 花：末端
    const flower = new THREE.Group(), fc = FLOWER_C[planted % FLOWER_C.length];
    for (let i = 0; i < 5; i++) {
      const pet = edges(new THREE.Mesh(new THREE.CircleGeometry(.24, 14), flat(fc)));
      pet.scale.y = 1.5;
      const a = i / 5 * Math.PI * 2;
      pet.position.set(Math.cos(a) * .25, Math.sin(a) * .25, 0);
      pet.rotation.z = a - Math.PI / 2;
      flower.add(pet);
    }
    flower.add(outline(new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), toon('#F2C94C')), 1.15));
    flower.position.copy(curve.getPointAt(1));
    flower.lookAt(camera.position);
    flower.scale.setScalar(.001);
    plant.add(flower);
    // 根部長出一小片綠地
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 20), flat('#8DB870'));
    patch.rotation.x = -Math.PI / 2; patch.position.set(pts[0].x, .015, pts[0].z); patch.scale.setScalar(.001);
    plant.add(patch);
    scene.add(plant);
    growing.push({ t0: performance.now(), stemGeo, inkGeo, total: stemGeo.index.count, inkTotal: inkGeo.index.count, leaves, flower, patch, top: curve.getPointAt(1) });
    planted++;
    countEl.textContent = planted >= GOAL ? `${planted} 株` : `${planted} / ${GOAL}`;
    if (planted >= 2 && returners.length < 8) setTimeout(() => spawnReturner(growing[growing.length - 1].top), reduce ? 0 : 1500);
    if (planted === GOAL) setTimeout(() => say('大白斑蝶', ['家園回來了！謝謝你。', '大家會再回到這裡產卵、長大。你也可以繼續種，讓森林更茂密。'], null, '繼續種'), 1800);
  };

  // 回來的蝴蝶：從畫面外飛進來，繞著新種的花飛
  const returners = [];
  const spawnReturner = target => {
    const k = 1 + (returners.length % 7);
    const b = makeButterfly(k, .55);
    b.position.set(target.x + (rng() < .5 ? -14 : 14), target.y + 4, target.z - 6);
    b.userData.target = target.clone();
    b.userData.orbit = rand(.6, 1.1);
    b.userData.ang = rand(0, 6.28);
    scene.add(b);
    returners.push(b);
    flapAll.push(b);
  };

  /* ---------- 互動：游標造成視差（前景＞中景＞遠景） ---------- */
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  box.addEventListener('pointermove', e => {
    const r = box.getBoundingClientRect();
    look.tx = (e.clientX - r.left) / r.width * 2 - 1;
    look.ty = (e.clientY - r.top) / r.height * 2 - 1;
  });
  box.addEventListener('pointerleave', () => { look.tx = look.ty = 0; });

  /* ---------- 每一格 ---------- */
  let last = performance.now(), running = false, started = false;
  const restore = { v: 0 };
  const tick = now => {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    look.x = lerp(look.x, look.tx, .06); look.y = lerp(look.y, look.ty, .06);

    // 鏡頭：前情 → 種植的轉場
    if (camT < 1 && camTo) {
      camT = Math.min(1, camT + dt / 1.6);
      const t = ease(camT);
      camBase.lerpVectors(camFrom.pos, camTo.pos, t);
      camLook.lerpVectors(camFrom.look, camTo.look, t);
    }
    const par = mode === 'intro' ? 1 : .35;
    camera.position.set(camBase.x + look.x * 1.3 * par, camBase.y - look.y * .5 * par, camBase.z);
    camera.lookAt(camLook);
    // 前景另外再多移一點：近的東西動得更多
    nearLeaves.forEach((l, i) => {
      l.rotation.z = l.userData.rz + Math.sin(time * 1.2 + i) * .04;
      l.position.x += (l.userData.x - look.x * .8 - l.position.x) * .08;
    });
    far.position.x = look.x * .6;

    // 煙：往上飄、變大、變淡；家園恢復後越來越少
    puffs.forEach(p => {
      const u = p.userData;
      u.t = (u.t + dt * .12) % 1;
      p.position.set(factory.position.x + u.c.x + u.t * 2.4, factory.position.y + u.c.y + u.t * 5, factory.position.z);
      p.scale.setScalar(.5 + u.t * 1.6);
      u.m.opacity = (1 - u.t) * .8 * (1 - restore.v * .9);
    });

    // 主角：在前景附近輕輕飛
    if (mode === 'intro') hero.position.set(1.6 + Math.sin(time * .7) * .5, 2.6 + Math.sin(time * 1.4) * .25, 3);
    else hero.position.lerp(new THREE.Vector3(-3.2 + Math.sin(time * .6) * .6, 2.4 + Math.sin(time * 1.3) * .3, 2.5), .03);
    hero.rotation.y = Math.sin(time * .5) * .4;
    flapAll.forEach(b => {
      const u = b.userData, a = Math.sin(time * u.speed + u.phase) * .9 + .2;
      u.wings[0].rotation.y = a; u.wings[1].rotation.y = -a;
    });
    returners.forEach(b => {
      const u = b.userData;
      u.ang += dt * 1.4;
      const tx = u.target.x + Math.cos(u.ang) * u.orbit, ty = u.target.y + .5 + Math.sin(u.ang * 2) * .2, tz = u.target.z + Math.sin(u.ang) * u.orbit;
      b.position.x += (tx - b.position.x) * .03; b.position.y += (ty - b.position.y) * .03; b.position.z += (tz - b.position.z) * .03;
      b.rotation.y = -u.ang;
    });

    // 植物生長：莖沿軌跡長出來 → 葉子依序冒出 → 開花
    growing.forEach(g => {
      const t = reduce ? 1 : clamp01((now - g.t0) / 1500);
      const step = 6 * 6;                              // 每一節莖的索引數（徑向 6 段 × 6）
      g.stemGeo.setDrawRange(0, Math.floor(g.total * t / step) * step);
      g.inkGeo.setDrawRange(0, Math.floor(g.inkTotal * t / step) * step);
      g.leaves.forEach(l => { const k = clamp01((t - l.t) / .2); l.obj.scale.setScalar(Math.max(.001, ease(k) * l.s)); });
      const fk = clamp01((t - .9) / .1);
      g.flower.scale.setScalar(Math.max(.001, fk < 1 ? ease(fk) * 1.15 : 1));
      g.patch.scale.setScalar(Math.max(.001, ease(t) * 1.2));
    });

    // 家園恢復：天空、地面、山、樹冠慢慢變回來
    restore.v = lerp(restore.v, Math.min(1, planted / GOAL), .02);
    scene.background.copy(SKY[0]).lerp(SKY[1], restore.v);
    scene.fog.color.copy(scene.background);
    restorable.forEach(r => r.mat.color.copy(r.bad).lerp(r.good, restore.v));
    crowns.forEach((c, i) => c.scale.setScalar(Math.max(.01, clamp01(restore.v * 1.4 - i * .08))));

    renderer.render(scene, camera);
    if (running) requestAnimationFrame(tick);
  };

  const resize = () => {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 55 : 38;
    camera.updateProjectionMatrix();
  };
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(box);
  else addEventListener('resize', resize);

  // 只在這一頁顯示時才算圖；第一次進來時開始前情提要
  const sec = document.getElementById('play1');
  sec.addEventListener('pagevisible', () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } });
  sec.addEventListener('pagehidden', () => { running = false; });
  sec.addEventListener('pageenter', () => { if (!started) { started = true; setTimeout(startIntro, 900); } });
  renderer.render(scene, camera);
})();
