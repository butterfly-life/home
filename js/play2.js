/* 互動2：大白斑蝶的 3D 模型 —— 平塗色塊＋墨線，點按鈕觸發不同動作（羽化、飛舞、曬太陽、吸花蜜、轉一圈），也可以拖曳旋轉 */
(() => {
  const $ = s => document.querySelector(s);
  const box = $('#m3');
  if (!box) return;
  const canvas = $('#m3c'), cap = $('#m3Cap'), btns = [...box.querySelectorAll('[data-act]')], fallback = $('#m3Fallback');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fail = () => { fallback.hidden = false; canvas.style.display = 'none'; };
  if (!window.THREE) return fail();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { return fail(); }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));

  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const angDiff = d => Math.atan2(Math.sin(d), Math.cos(d));
  const DEG = Math.PI / 180;
  const rng = (seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(3301);
  const rand = (a, b) => a + rng() * (b - a);

  /* ---------- 場景（光從左上方來） ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ECE5D3');
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, .1, 100);
  camera.position.set(0, 3.7, 7.4);
  const LOOK = new THREE.Vector3(0, 1.55, 0);
  camera.lookAt(LOOK);
  scene.add(new THREE.AmbientLight(0xffffff, .5));
  const sun = new THREE.DirectionalLight(0xffffff, .55);
  sun.position.set(-5, 9, 6);
  scene.add(sun);

  const grad = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.LuminanceFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
  const flat = c => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  const INK = 0x1c1a17;
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const lineMat = new THREE.LineBasicMaterial({ color: INK });
  const outline = (mesh, s = 1.08) => { const o = new THREE.Mesh(mesh.geometry, inkMat); o.scale.setScalar(s); mesh.add(o); return mesh; };
  const edges = mesh => { mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 15), lineMat)); return mesh; };
  // 管狀（莖、枝條）的描邊：同一條曲線、粗一點的背面管子（不能用縮放，會偏移）
  const tube = (curve, r, mat, seg = 16) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 6), mat);
    m.add(new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r * 1.7, 6), inkMat));
    return m;
  };
  const line = pts => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p))), lineMat);

  const stage = new THREE.Group();                    // 拖曳時整個舞台一起轉
  scene.add(stage);

  /* ---------- 地面、遠山、草 ---------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 48), toon('#CBD5A6'));
  ground.rotation.x = -Math.PI / 2;
  stage.add(ground);
  const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos(i / 64 * 6.283) * 7, .01, Math.sin(i / 64 * 6.283) * 7))), lineMat);
  stage.add(rim);
  [[-9, '#C9CFB2', 3.2], [-7, '#B5C29C', 2.2]].forEach(([z, c, h]) => {
    const s = new THREE.Shape();
    s.moveTo(-16, 0);
    for (let x = -16; x <= 16; x += rand(2.5, 4.5)) s.lineTo(x, h * (.5 + rng() * .5));
    s.lineTo(16, 0);
    const m = edges(new THREE.Mesh(new THREE.ShapeGeometry(s), flat(c)));
    m.position.z = z;
    scene.add(m);
  });
  for (let i = 0; i < 22; i++) {
    const a = rand(0, 6.283), r = rand(1.2, 6.2), h = rand(.25, .6);
    const s = new THREE.Shape();
    s.moveTo(-.07, 0); s.lineTo(0, h); s.lineTo(.07, 0);
    const m = edges(new THREE.Mesh(new THREE.ShapeGeometry(s), flat(['#8FB173', '#A5C185', '#7EA265'][i % 3])));
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    m.rotation.y = rand(0, 3);
    stage.add(m);
  }

  /* ---------- 花：粉紫色花瓣、黃色花心 ---------- */
  const leafShape = (w, h) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(w, h * .25, w * .8, h * .8, 0, h);
    s.bezierCurveTo(-w * .8, h * .8, -w, h * .25, 0, 0);
    return s;
  };
  const flower = (x, z, h, size, petal) => {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.12, h * .5, .02), new THREE.Vector3(0, h, 0)]);
    g.add(tube(curve, .035 * size, toon('#6E9A55')));
    [[.3, 1], [.5, -1]].forEach(([t, side]) => {
      const p = curve.getPoint(t);
      const l = edges(new THREE.Mesh(new THREE.ShapeGeometry(leafShape(.22 * size, .7 * size), 8), flat('#7FA866')));
      l.position.copy(p);
      l.rotation.set(-.5, side > 0 ? .4 : 2.6, side * -1.1);
      g.add(l);
    });
    const head = new THREE.Group();
    head.position.set(0, h, 0);
    for (let i = 0; i < 6; i++) {
      const p = edges(new THREE.Mesh(new THREE.ShapeGeometry(leafShape(.2 * size, .42 * size), 8), flat(petal)));
      p.rotation.set(-Math.PI / 2 + .45, 0, 0);
      const holder = new THREE.Group();
      holder.rotation.y = i / 6 * 6.283;
      holder.add(p);
      head.add(holder);
    }
    const c = outline(new THREE.Mesh(new THREE.SphereGeometry(.1 * size, 12, 8), toon('#F2C94C')), 1.12);
    c.scale.y = .6;
    head.add(c);
    g.add(head);
    g.position.set(x, 0, z);
    stage.add(g);
    return g;
  };
  flower(0, 0, 1.6, 1.3, '#E7A3C0');
  flower(1.7, -1.1, 1.0, .9, '#F2D27A');
  flower(-1.0, 1.0, .7, .8, '#BFD7EA');
  const PERCH = new THREE.Vector3(0, 1.84, .22);      // 停在主花上的位置（頭在花心上方）

  /* ---------- 掛著蛹的枝條（金色的蛹） ---------- */
  const TIP = new THREE.Vector3(-1.5, 3.25, -.6);
  const branch = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.7, 0, -1.2), new THREE.Vector3(-2.5, 1.6, -1), new THREE.Vector3(-2.1, 2.9, -.8), new THREE.Vector3(-1.5, 3.35, -.6)]);
  stage.add(tube(branch, .06, toon('#7A5B40'), 24));
  [[.55, 1], [.8, -1], [.95, 1]].forEach(([t, s]) => {
    const l = edges(new THREE.Mesh(new THREE.ShapeGeometry(leafShape(.28, .9), 8), flat(['#6E9A55', '#88AE6C', '#6E9A55'][t * 10 % 3 | 0])));
    l.position.copy(branch.getPoint(t));
    l.rotation.set(.3, s * .8, s * 1.2);
    stage.add(l);
  });
  const pupaMat = toon('#E3B53F', { emissive: new THREE.Color('#3A2A08') });
  const pupa = new THREE.Group();
  pupa.position.copy(TIP);
  const prof = [[0, 0], [.035, -.04], [.11, -.13], [.165, -.29], [.155, -.46], [.11, -.6], [.045, -.72], [0, -.76]].reverse().map(([r, y]) => new THREE.Vector2(r, y));   // 由下往上排，法線才會朝外
  const shell = outline(new THREE.Mesh(new THREE.LatheGeometry(prof, 18), pupaMat), 1.06);
  pupa.add(shell);
  const dotsG = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 4), flat('#1C1A17'));
    const a = i / 7 * 6.283;
    d.position.set(Math.cos(a) * .165, -.29, Math.sin(a) * .165);
    dotsG.add(d);
  }
  pupa.add(dotsG);
  stage.add(pupa);
  const GOLD = new THREE.Color('#E3B53F'), PALE = new THREE.Color('#EFE8D2');

  /* ---------- 大白斑蝶：翅膀用畫出來的貼圖（白底、黑翅脈、黑斑、黑邊白點） ---------- */
  const FORE = [[0, .05], [-.25, .75, -1.05, 1.18, -1.42, 1.0], [-1.55, .7, -1.3, .22, -.92, 0], [-.55, -.08, -.22, -.05, 0, 0]];
  const HIND = [[0, 0], [-.38, -.02, -1.02, -.15, -1.08, -.55], [-1.1, -.92, -.65, -1.02, -.32, -.86], [-.13, -.65, -.03, -.32, 0, 0]];
  const toShape = def => {
    const s = new THREE.Shape();
    s.moveTo(...def[0]);
    def.slice(1).forEach(c => s.bezierCurveTo(...c));
    return s;
  };
  const toPath = (ctx, def) => { ctx.moveTo(...def[0]); def.slice(1).forEach(c => ctx.bezierCurveTo(...c)); ctx.closePath(); };
  const bez = (p0, c, t) => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * c[0] + 3 * u * t * t * c[2] + t * t * t * c[4], u * u * u * p0[1] + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t * t * t * c[5]];
  };
  const edgePts = (def, n) => {
    const out = [];
    let p0 = def[0];
    def.slice(1).forEach(c => { for (let i = 0; i < n; i++) out.push(bez(p0, c, i / n)); p0 = [c[4], c[5]]; });
    return out;
  };
  // 貼圖座標：x ∈ [-1.6, .05]、y ∈ [-1.1, 1.25]
  const UX = [-1.6, 1.65], UY = [-1.1, 2.35];
  const wingTex = (() => {
    const S = 1024, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#FBF8EF'; g.fillRect(0, 0, S, S);
    g.setTransform(S / UX[1], 0, 0, -S / UY[1], -UX[0] * S / UX[1], S + UY[0] * S / UY[1]);
    const both = () => { g.beginPath(); toPath(g, FORE); toPath(g, HIND); };
    both(); g.save(); g.clip();
    const base = g.createRadialGradient(0, 0, 0, 0, 0, .9);
    base.addColorStop(0, 'rgba(232,222,190,.9)'); base.addColorStop(1, 'rgba(251,248,239,0)');
    g.fillStyle = base; g.fillRect(-2, -2, 3, 4);
    g.strokeStyle = '#1C1A17'; g.lineCap = 'round';
    // 翅脈：從翅基呈放射狀
    g.lineWidth = .028;
    [...edgePts(FORE, 4).filter((_, i) => i % 2 === 0 && i > 0 && i < 10), ...edgePts(HIND, 4).filter((_, i) => i % 2 === 0 && i > 0 && i < 10)].forEach(([x, y]) => {
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(x * .45, y * .45 + (y > 0 ? .05 : -.05), x, y); g.stroke();
    });
    g.beginPath(); g.moveTo(-.05, .02); g.quadraticCurveTo(-.5, .22, -.9, .3); g.stroke();
    // 黑色斑點：靠外緣較大
    for (let i = 0; i < 70; i++) {
      const fore = i < 42, x = rand(-1.45, -.15), y = fore ? rand(.05, 1.05) : rand(-.95, -.05);
      const d = Math.hypot(x, y);
      g.beginPath(); g.arc(x, y, .025 + d * rand(.02, .045), 0, 6.283); g.fillStyle = '#1C1A17'; g.fill();
    }
    // 外緣黑邊＋白點
    g.lineWidth = .16; g.beginPath(); toPath(g, FORE); g.stroke();
    g.beginPath(); toPath(g, HIND); g.stroke();
    g.restore();
    g.fillStyle = '#FBF8EF';
    [...edgePts(FORE, 9).slice(3, 24), ...edgePts(HIND, 9).slice(2, 22)].forEach(([x, y]) => {
      const d = Math.hypot(x, y) || 1;
      g.beginPath(); g.arc(x - x / d * .045, y - y / d * .045, .017, 0, 6.283); g.fill();
    });
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  })();
  const WING_GEO = (() => {
    const geo = new THREE.ShapeGeometry([toShape(FORE), toShape(HIND)], 16);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - UX[0]) / UX[1], (pos.getY(i) - UY[0]) / UY[1]);
    return geo;
  })();
  const wingMat = toon('#ffffff', { map: wingTex, side: THREE.DoubleSide });

  const bf = new THREE.Group(), pose = new THREE.Group();
  bf.add(pose);
  stage.add(bf);
  const wings = [-1, 1].map(side => {
    const w = new THREE.Group();
    w.add(edges(new THREE.Mesh(WING_GEO, wingMat)));
    w.scale.x = side;
    w.userData.side = side;
    pose.add(w);
    return w;
  });
  const bodyMat = toon('#24201C');
  const part = (geo, y, sy = 1) => { const m = outline(new THREE.Mesh(geo, bodyMat), 1.18); m.position.y = y; m.scale.y = sy; pose.add(m); return m; };
  part(new THREE.CylinderGeometry(.055, .03, .72, 10), -.4);       // 腹部
  part(new THREE.SphereGeometry(.09, 12, 10), .03, 1.4);            // 胸部
  part(new THREE.SphereGeometry(.07, 12, 10), .22);                 // 頭
  [[.03, -.12], [-.03, -.26], [.035, -.42], [-.03, -.56]].forEach(([x, y]) => {   // 身上的白點
    const d = new THREE.Mesh(new THREE.SphereGeometry(.014, 6, 4), flat('#F4F0E4'));
    d.position.set(x, y, .045);
    pose.add(d);
  });
  [-1, 1].forEach(s => {
    pose.add(line([[s * .025, .27, .02], [s * .14, .55, .05], [s * .26, .78, .07]]));
    const club = new THREE.Mesh(new THREE.SphereGeometry(.022, 6, 4), bodyMat);
    club.position.set(s * .26, .78, .07);
    pose.add(club);
    [.08, .02, -.05].forEach((y, k) => pose.add(line([[s * .03, y, -.05], [s * .13, y + .02 - k * .03, -.14], [s * .17, y - .06 - k * .05, -.24]])));   // 六隻腳
  });
  // 口器：平常捲成發條狀，吸花蜜時伸直
  let probe = null, probeU = -1;
  const setProbe = u => {
    if (Math.abs(u - probeU) < .004) return;
    probeU = u;
    const pts = [];
    let y = .19, z = -.06, phi = .25;
    const L = .55, n = 40, ds = L / n;
    for (let j = 0; j <= n; j++) {
      pts.push(new THREE.Vector3(0, y, z));
      phi += (1 - u) * (10 + 34 * j / n) * ds;
      y += Math.sin(phi) * ds; z -= Math.cos(phi) * ds;
    }
    if (probe) { pose.remove(probe); probe.geometry.dispose(); }
    probe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .008, 5), bodyMat);
    pose.add(probe);
  };
  setProbe(0);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.55, 24), new THREE.MeshBasicMaterial({ color: '#3C3628', transparent: true, opacity: .18 }));
  shadow.rotation.x = -Math.PI / 2;
  stage.add(shadow);

  /* ---------- 動作：每個動作算出目標姿勢，切換時平滑過渡 ---------- */
  // 姿勢：位置、朝向 yaw、身體俯仰 pitch（-90° = 水平、背朝上；0 = 直立、背朝鏡頭）、翅膀開合角、翅膀大小、口器伸直、顯示
  const flapW = (t, f, mid, amp) => mid + amp * Math.sin(t * f * 6.283);
  const ACTS = {
    bask: t => {                                      // 停在花上攤開翅膀曬太陽，偶爾慢慢開合
      const k = (t % 4.5) / 4.5, pulse = k > .7 ? Math.sin((k - .7) / .3 * Math.PI) : 0;
      return { x: PERCH.x, y: PERCH.y, z: PERCH.z, yaw: .5, pitch: -90 * DEG, open: (6 + 62 * pulse) * DEG, ws: 1, unc: 0, vis: 1 };
    },
    feed: t => ({ x: PERCH.x, y: PERCH.y, z: PERCH.z, yaw: -.4, pitch: -84 * DEG, open: (84 + 3 * Math.sin(t * 9) * (Math.sin(t * .8) > .7)) * DEG,
      ws: 1, unc: ease(clamp01((t - .9) / 1.3)), vis: 1 }),
    fly: t => {                                       // 慢慢拍幾下、再張開翅膀滑翔
      const a = t * .8, r = 2.1, x = Math.sin(a) * r, z = Math.cos(a) * r * .8 + .2;
      const vx = Math.cos(a), vz = -Math.sin(a) * .8;
      const cyc = t % 2.8, gliding = cyc > 1.3;
      return { x, y: 2.5 + Math.sin(t * 1.3) * .45, z, yaw: Math.atan2(-vx, -vz), pitch: (-90 + 16) * DEG,
        open: gliding ? (8 + 4 * Math.sin(t * 3)) * DEG : flapW(t, 3.2, 38 * DEG, 46 * DEG), ws: 1, unc: 0, vis: 1 };
    },
    spin: t => ({ x: 0, y: 2.55, z: 1.4, yaw: t * 6.283 / 7, pitch: -8 * DEG, open: (4 + 6 * Math.sin(t * 1.5)) * DEG, ws: 1, unc: 0, vis: 1 }),
    emerge: t => {                                    // 蛹扭動 → 裂開 → 成蝶爬出來倒掛 → 翅膀慢慢撐開 → 試著開合
      const out = clamp01((t - 1.6) / 1.1), grow = ease(clamp01((t - 2.6) / 3.6));
      const dry = t > 6.4 && t < 8.6 ? Math.sin((t - 6.4) / 2.2 * Math.PI * 3) : 0;
      return { x: TIP.x, y: TIP.y - .55 - ease(out) * .5, z: TIP.z + .05, yaw: Math.PI / 2, pitch: 0,
        open: (86 - Math.max(0, dry) * 55) * DEG, ws: .18 + .82 * grow, unc: 0, vis: t > 1.6 ? clamp01((t - 1.6) / .35) : 0 };
    }
  };
  const CAPS = {
    emerge: '金色的蛹裂開，成蝶慢慢爬出來，倒掛著把皺皺的翅膀撐開、晾乾。',
    fly: '大白斑蝶飛得很慢，拍幾下翅膀就張開來滑翔，像一張在空中飄的紙。',
    bask: '停在花上時，牠會攤開翅膀曬太陽，偶爾慢慢地開合。',
    feed: '平常捲成發條狀的口器會伸直，探進花心吸食花蜜。',
    spin: '轉過來看看：白底的翅膀上有黑色翅脈與斑點，外緣是一圈黑邊白點。'
  };
  const pose0 = ACTS.bask(0);
  let act = null, actT = 0, from = { ...pose0 }, cur = { ...pose0 }, blendDur = 1;
  const setAct = (name, now = performance.now()) => {
    if (name === act && name !== 'emerge') return;
    from = { ...cur };
    blendDur = name === 'emerge' ? 0 : Math.max(.9, Math.min(2, Math.hypot(cur.x - ACTS[name](0).x, cur.y - ACTS[name](0).y, cur.z - ACTS[name](0).z) * .45));
    act = name; actT = now;
    if (name === 'emerge') { pupaMat.color.copy(GOLD); pupaMat.emissive.set('#3A2A08'); dotsG.visible = true; }
    btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.act === name));
    cap.textContent = CAPS[name];
    cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop');
  };
  btns.forEach(b => b.addEventListener('click', () => setAct(b.dataset.act)));

  const apply = (p, now) => {
    bf.position.set(p.x, p.y, p.z);
    bf.rotation.y = p.yaw;
    pose.rotation.x = p.pitch;
    const s = Math.max(.001, p.vis);
    bf.scale.setScalar(s);
    wings.forEach(w => { w.rotation.y = w.userData.side * p.open; w.scale.set(w.userData.side * p.ws, p.ws * (.85 + .15 * p.ws), 1); w.rotation.x = (1 - p.ws) * .5; });
    setProbe(p.unc);
    shadow.position.set(p.x, .012, p.z);
    const h = Math.max(0, p.y - .2);
    shadow.scale.setScalar((1 + h * .25) * s * (.4 + .6 * Math.cos(p.open)));
    shadow.material.opacity = .22 / (1 + h * .5) * s;
  };

  /* ---------- 拖曳旋轉舞台 ---------- */
  let drag = null, yawT = 0, yaw = 0;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y0: yawT }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener('pointermove', e => { if (drag) yawT = drag.y0 + (e.clientX - drag.x) / box.clientWidth * 4; });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  /* ---------- 迴圈 ---------- */
  let running = false, started = false;
  const tick = now => {
    if (act) {
      const t = (now - actT) / 1000, tgt = ACTS[act](t);
      const k = blendDur ? ease(clamp01(t / blendDur)) : 1;
      const travel = Math.hypot(tgt.x - from.x, tgt.y - from.y, tgt.z - from.z);
      Object.keys(tgt).forEach(key => { cur[key] = key === 'yaw' ? from.yaw + angDiff(tgt.yaw - from.yaw) * k : lerp(from[key], tgt[key], k); });
      if (k < 1 && travel > .3) {                     // 換位置途中：邊飛邊拍翅，路線拱起來
        cur.y += Math.sin(k * Math.PI) * Math.min(1, travel * .3);
        cur.open = flapW(t, 3.4, 36 * DEG, 44 * DEG);
        cur.pitch = lerp(cur.pitch, -74 * DEG, Math.sin(k * Math.PI));
      }
      if (act === 'emerge') {
        pupa.rotation.z = t < 1.6 ? Math.sin(t * 15) * .12 * clamp01(t / .4) : 0;
        const c = clamp01((t - 1.5) / .8);
        pupaMat.color.copy(GOLD).lerp(PALE, c);                // 羽化後只剩淡色的空殼
        pupaMat.emissive.setRGB(.23 * (1 - c), .16 * (1 - c), .03 * (1 - c));
        dotsG.visible = c < .5;
      }
      apply(cur, now);
    }
    yaw += (yawT - yaw) * .12;
    stage.rotation.y = yaw;
    renderer.render(scene, camera);
    if (running) requestAnimationFrame(tick);
  };
  const resize = () => {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 58 : 38;
    camera.updateProjectionMatrix();
  };
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(box);
  else addEventListener('resize', resize);
  apply({ ...pose0, vis: 0 });
  bf.scale.setScalar(.001);

  // 只在這一頁看得到時才算圖；第一次進來時先播一次羽化
  const sec = document.getElementById('play2');
  sec.addEventListener('pagevisible', () => { if (!running) { running = true; requestAnimationFrame(tick); } });
  sec.addEventListener('pagehidden', () => { running = false; });
  sec.addEventListener('pageenter', () => { if (!started) { started = true; setAct(reduce ? 'bask' : 'emerge'); } });
  renderer.render(scene, camera);
})();
