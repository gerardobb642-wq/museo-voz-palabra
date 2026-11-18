// La voz y la palabra · museo virtual en 3D (Three.js r169, sin dependencias externas)
import * as THREE from './three.module.min.js';
import { DATA } from './content.js';

// los letreros de los muros se dibujan con Ibarra: esperar la fuente antes de construirlos
await Promise.all(['400 40px Ibarra', '600 40px Ibarra', 'italic 400 40px Ibarra'].map(f => document.fonts.load(f)));

const PAPER = '#F2EDE3', MAT = '#FAF7F0', INK = '#1A1A1A', RED = '#B3261E', MUTED = '#57514A';
const W = 12, D = 10, H = 4.6, DOOR_W = 2.4, DOOR_H = 3.2, EYE = 1.62;
const NR = 8;                                   // 0 vestíbulo · 1–6 salas · 7 referencias
const zc = k => -D * k;                         // centro de la sala k
const zNear = k => D / 2 - D * k;               // muro de entrada de la sala k
const zFar = k => -D / 2 - D * k;               // muro del fondo (tabique con puerta)
const roomOf = z => Math.min(NR - 1, Math.max(0, Math.floor((D / 2 - z) / D)));
const ROOM_NAMES = ['Vestíbulo', ...DATA.salas.map(s => `Sala ${s.num} · ${s.periodo}`), 'Referencias'];

// ---------------------------------------------------------------- render
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfc8bb');
scene.fog = new THREE.Fog('#cfc8bb', 26, 70);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 160);
camera.rotation.order = 'YXZ';
const pos = new THREE.Vector3(0, EYE, 3.4);
let yaw = 0, pitch = -0.02;
function applyCam() { camera.position.copy(pos); camera.rotation.set(pitch, yaw, 0); }
applyCam();

// ---------------------------------------------------------------- carga
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const texCache = {};
function texture(url, srgb = true) {
  if (!texCache[url]) {
    const t = loader.load(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    texCache[url] = t;
  }
  return texCache[url];
}
function tiled(url, rx, ry, srgb = true) {
  const t = texture(url, srgb).clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- materiales
const TOTAL = D * NR, ZMID = (zNear(0) + zFar(NR - 1)) / 2;
const floorMat = new THREE.MeshStandardMaterial({
  map: tiled('tex/herringbone_parquet_diff_1k.jpg', W / 2.2, TOTAL / 2.2),
  normalMap: tiled('tex/herringbone_parquet_nor_gl_1k.jpg', W / 2.2, TOTAL / 2.2, false),
  color: '#b9a58c', roughness: 0.78,
});
function wallMat(sx, sy) {
  return new THREE.MeshStandardMaterial({
    normalMap: tiled('tex/painted_plaster_wall_nor_gl_1k.jpg', Math.max(sx, 0.3) / 3.2, sy / 3.2, false),
    normalScale: new THREE.Vector2(0.22, 0.22),
    color: '#ebe3d3', roughness: 0.93,
  });
}
const darkWood = new THREE.MeshStandardMaterial({ color: '#2f2219', roughness: 0.55 });
const inkMat = new THREE.MeshStandardMaterial({ color: '#191715', roughness: 0.5, metalness: 0.1 });
const matMat = new THREE.MeshStandardMaterial({ color: MAT, roughness: 0.9 });

const clickables = [];
function box(sx, sy, sz, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z); scene.add(m); return m;
}

// ---------------------------------------------------------------- arquitectura
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, TOTAL), floorMat);
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, ZMID); floor.userData.kind = 'floor';
scene.add(floor); clickables.push(floor);

const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, TOTAL), new THREE.MeshStandardMaterial({ color: '#f3eee5', emissive: '#4a453d', roughness: 1 }));
ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, ZMID); scene.add(ceil);

const T = 0.24; // grosor de muro
box(T, H, TOTAL, wallMat(TOTAL, H), -W / 2 - T / 2, H / 2, ZMID);           // muro izquierdo
box(T, H, TOTAL, wallMat(TOTAL, H), W / 2 + T / 2, H / 2, ZMID);            // muro derecho
box(W, H, T, wallMat(W, H), 0, H / 2, zNear(0) + T / 2);                     // entrada
box(W, H, T, wallMat(W, H), 0, H / 2, zFar(NR - 1) - T / 2);                 // fondo
// zoclos
box(0.03, 0.13, TOTAL, darkWood, -W / 2 + 0.015, 0.065, ZMID);
box(0.03, 0.13, TOTAL, darkWood, W / 2 - 0.015, 0.065, ZMID);

const sideW = (W - DOOR_W) / 2;
for (let k = 0; k < NR - 1; k++) {
  const z = zFar(k);
  box(sideW, H, 0.3, wallMat(sideW, H), -(DOOR_W / 2 + sideW / 2), H / 2, z);
  box(sideW, H, 0.3, wallMat(sideW, H), (DOOR_W / 2 + sideW / 2), H / 2, z);
  box(DOOR_W, H - DOOR_H, 0.3, wallMat(DOOR_W, H - DOOR_H), 0, DOOR_H + (H - DOOR_H) / 2, z);
  // marco de la puerta
  box(0.09, DOOR_H, 0.36, darkWood, -DOOR_W / 2 + 0.045, DOOR_H / 2, z);
  box(0.09, DOOR_H, 0.36, darkWood, DOOR_W / 2 - 0.045, DOOR_H / 2, z);
  box(DOOR_W, 0.09, 0.36, darkWood, 0, DOOR_H - 0.045, z);
  for (const s of [-1, 1]) for (const zz of [z + 0.165, z - 0.165]) box(sideW, 0.13, 0.03, darkWood, s * (DOOR_W / 2 + sideW / 2), 0.065, zz);
}

// ---------------------------------------------------------------- luz
scene.add(new THREE.HemisphereLight('#fff7ea', '#8a7860', 1.5));
const skyMat = new THREE.MeshBasicMaterial({ color: '#fffaf0' });
for (let k = 0; k < NR; k++) {
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.2), skyMat);
  sky.rotation.x = Math.PI / 2; sky.position.set(0, H - 0.005, zc(k)); scene.add(sky);
  const lamp = new THREE.PointLight('#fff4e2', 26, 0, 2);
  lamp.position.set(0, H - 0.5, zc(k)); scene.add(lamp);
}
function spotOn(target, from) {
  const s = new THREE.SpotLight('#fff1dc', 70, 0, 0.36, 0.55, 2);
  s.position.copy(from); s.target.position.copy(target);
  scene.add(s); scene.add(s.target);
}

// ---------------------------------------------------------------- texto pintado en muro (vinil)
const PX = 260; // pixeles por metro
function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !line) line = t; else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}
// blocks: [{text, size(m), style:'600'|'italic 400'..., color, lead, gap, width(m)}]
function vinyl(blocks, wM, hM, bg = null) {
  const cv = document.createElement('canvas'); cv.width = Math.round(wM * PX); cv.height = Math.round(hM * PX);
  const c = cv.getContext('2d');
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); }
  let y = 0;
  for (const b of blocks) {
    const px = b.size * PX;
    c.font = `${b.style || '400'} ${px}px Ibarra`;
    c.fillStyle = b.color || INK; c.textBaseline = 'top';
    const lines = wrap(c, b.text, (b.width || wM) * PX - (b.x || 0) * PX);
    y += (b.gap || 0) * PX;
    for (const ln of lines) { c.fillText(ln, (b.x || 0) * PX, y); y += px * (b.lead || 1.25); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  const mat = new THREE.MeshStandardMaterial({ map: t, transparent: !bg, roughness: 0.92, depthWrite: !!bg });
  return new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), mat);
}
// coloca un objeto plano sobre un muro: side 'L' (x=-W/2, mira +x), 'R' (x=+W/2, mira -x), 'N' (tabique, mira +z)
function onWall(obj, side, z, y, offset = 0.012, x = 0) {
  if (side === 'L') { obj.position.set(-W / 2 + offset, y, z); obj.rotation.y = Math.PI / 2; }
  else if (side === 'R') { obj.position.set(W / 2 - offset, y, z); obj.rotation.y = -Math.PI / 2; }
  else if (side === 'N') { obj.position.set(x, y, z + offset); }
  scene.add(obj); return obj;
}

// ---------------------------------------------------------------- obras enmarcadas
function frame(url, w, h, data) {
  const g = new THREE.Group();
  const m = 0.17, f = 0.07;
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * (m + f), h + 2 * (m + f), 0.07), inkMat); fr.position.z = 0.035; g.add(fr);
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(w + 2 * m, h + 2 * m), matMat); mt.position.z = 0.0705; g.add(mt);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture(url), roughness: 0.85 }));
  art.position.z = 0.072; g.add(art);
  for (const o of [fr, art]) { o.userData = data; clickables.push(o); }
  return g;
}
function bench(x, z) {
  box(0.5, 0.07, 1.9, darkWood, x, 0.45, z);
  for (const dz of [-0.78, 0.78]) box(0.42, 0.42, 0.06, inkMat, x, 0.21, z + dz);
}

// ---------------------------------------------------------------- vestíbulo (sala 0)
{
  const P = DATA.portada;
  onWall(vinyl([
    { text: 'Museo virtual de literatura en español', size: 0.13, style: 'italic 400' },
    { text: 'La voz\ny la palabra', size: 0.62, style: '600', lead: 0.98, gap: 0.08 },
    { text: P.subtitle, size: 0.17, style: 'italic 400', color: RED, gap: 0.12 },
    { text: P.integrantes, size: 0.1, style: '600', gap: 0.42 },
    { text: P.curso, size: 0.085, color: MUTED, gap: 0.06, lead: 1.4 },
  ], 5.6, 3.3), 'L', zc(0) - 0.4, 2.15);
  const dore = frame('img/portada_dore.jpg', 1.7, 2.42, { kind: 'none' });
  onWall(dore, 'R', zc(0) - 0.3, 1.95, 0.0);
  onWall(vinyl([
    { text: 'Gustave Doré, Don Quijote en su biblioteca, 1863', size: 0.045, style: 'italic 400', lead: 1.3 },
    { text: 'Así empieza este museo: con un lector que se pierde dentro de los libros.', size: 0.04, color: MUTED, gap: 0.03, lead: 1.35 },
  ], 0.62, 0.4, MAT), 'R', zc(0) + 1.75, 1.45, 0.01);
  spotOn(new THREE.Vector3(W / 2, 1.95, zc(0) - 0.3), new THREE.Vector3(W / 2 - 2.3, H - 0.15, zc(0) - 0.3));
}

// ---------------------------------------------------------------- salas I–VI
DATA.salas.forEach((s, i) => {
  const k = i + 1, z = zc(k);
  // letrero sobre la puerta de entrada (en el tabique de la sala anterior)
  onWall(vinyl([{ text: `${s.num}`, size: 0.34, style: '600', color: RED, width: 3.2 },
                { text: s.periodo, size: 0.14, style: 'italic 400', width: 3.2 }], 3.2, 0.95), 'N', zFar(k - 1) + 0.15, DOOR_H + 0.62);
  // texto de sala en el muro izquierdo
  onWall(vinyl([
    { text: `Sala ${s.num}`, size: 0.15, style: 'italic 400', color: RED },
    { text: s.periodo, size: s.periodo.length > 18 ? 0.36 : 0.44, style: '600', lead: 1.0, gap: 0.04 },
    { text: s.fechas, size: 0.13, style: 'italic 400', gap: 0.06 },
    { text: s.contexto, size: 0.112, lead: 1.42, gap: 0.2, width: 4.4 },
  ], 4.6, 3.0), 'L', z, 2.2);
  // la obra
  const art = frame(`img/cuadro_${s.slug}.jpg`, 1.65, 1.98, { kind: 'obra', i });
  onWall(art, 'R', z, 1.92, 0.0);
  spotOn(new THREE.Vector3(W / 2, 1.92, z), new THREE.Vector3(W / 2 - 2.4, H - 0.15, z));
  // cédula
  onWall(vinyl([
    { text: s.cedula, size: 0.042, lead: 1.32 },
    { text: s.cuadro, size: 0.032, style: 'italic 400', color: MUTED, gap: 0.035, lead: 1.35 },
    { text: 'Toca la obra para abrir su ficha →', size: 0.036, style: '600', color: RED, gap: 0.04 },
  ], 0.66, 0.66, MAT), 'R', z + 1.62, 1.42, 0.01);
  bench(-2.2, z);
});

// ---------------------------------------------------------------- referencias (sala 7)
{
  const z = zc(7);
  onWall(vinyl([{ text: 'Ref.', size: 0.3, style: '600', color: RED, width: 3.2 }, { text: 'Referencias', size: 0.14, style: 'italic 400', width: 3.2 }], 3.2, 0.95), 'N', zFar(6) + 0.15, DOOR_H + 0.62);
  const refs = onWall(vinyl([
    { text: 'Referencias', size: 0.4, style: '600' },
    { text: 'Obras y fuentes (MLA, 9.ª edición)', size: 0.11, style: 'italic 400', color: RED, gap: 0.08 },
    ...DATA.refs.map(r => ({ text: r, size: 0.07, lead: 1.35, gap: 0.07, width: 5.2 })),
  ], 5.4, 3.4), 'L', z, 2.15);
  refs.userData = { kind: 'refs' }; clickables.push(refs);
  const cred = onWall(vinyl([
    { text: 'Imágenes de los collages', size: 0.16, style: 'italic 400', color: RED },
    ...DATA.credits.map(r => ({ text: r, size: 0.06, color: MUTED, lead: 1.35, gap: 0.06, width: 5.0 })),
  ], 5.2, 3.3), 'R', z, 2.1);
  cred.userData = { kind: 'refs' }; clickables.push(cred);
  onWall(vinyl([{ text: 'Fin del recorrido', size: 0.3, style: '600' }, { text: 'Abre el plano para volver a cualquier sala.', size: 0.12, style: 'italic 400', color: MUTED, gap: 0.08 }], 5, 1.1), 'N', zFar(7) - 0.0, 2.3, 0.012);
}

// ---------------------------------------------------------------- movimiento
const R = 0.38;
function free(p) {
  if (p.x < -W / 2 + R || p.x > W / 2 - R) return false;
  if (p.z > zNear(0) - R || p.z < zFar(NR - 1) + R) return false;
  for (let k = 0; k < NR - 1; k++) if (Math.abs(p.z - zFar(k)) < 0.15 + R && Math.abs(p.x) > DOOR_W / 2 - R) return false;
  for (let k = 1; k <= 6; k++) if (Math.abs(p.x + 2.2) < 0.25 + R && Math.abs(p.z - zc(k)) < 0.95 + R) return false;
  return true;
}
let path = null; // {pts:[Vector3], seg, t, yawTo, then}
function routeTo(target, yawTo = null, then = null) {
  const pts = [], a = roomOf(pos.z), b = roomOf(target.z);
  if (a !== b) {
    const dir = b > a ? 1 : -1;
    for (let k = a; k !== b; k += dir) {
      const zp = zFar(dir > 0 ? k : k - 1);
      pts.push(new THREE.Vector3(0, EYE, zp + 0.9 * dir), new THREE.Vector3(0, EYE, zp - 0.9 * dir));
    }
  }
  pts.push(new THREE.Vector3(target.x, EYE, target.z));
  path = { pts, from: pos.clone(), yawFrom: yaw, yawTo, then, i: 0 };
  hideHint();
}
function stepPath(dt) {
  if (!path) return;
  const tgt = path.pts[path.i], d = tgt.clone().sub(pos); d.y = 0;
  const dist = d.length(), sp = 3.4 * dt;
  if (dist > 0.02) {
    const mv = d.normalize().multiplyScalar(Math.min(sp, dist));
    pos.add(mv);
    // al cruzar salas, mirar hacia donde se camina
    if (path.pts.length > 1 && path.i < path.pts.length - 1) yaw = lerpAngle(yaw, Math.atan2(-mv.x, -mv.z), 0.12);
  }
  if (dist <= 0.02 || dist <= sp) {
    if (path.i < path.pts.length - 1) path.i++;
    else if (path.yawTo === null || Math.abs(angDiff(yaw, path.yawTo)) < 0.01) { const f = path.then; path = null; f && f(); }
  }
  if (path && path.yawTo !== null && path.i === path.pts.length - 1) { yaw = lerpAngle(yaw, path.yawTo, 0.1); pitch += (-0.02 - pitch) * 0.1; }
}
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const lerpAngle = (a, b, t) => a + angDiff(a, b) * t;

const keys = new Set();
addEventListener('keydown', e => { if (!modalOpen()) keys.add(e.key.toLowerCase()); if (e.key === 'Escape') closeAll(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
function stepKeys(dt) {
  let f = 0, s = 0, turn = 0;
  if (keys.has('w') || keys.has('arrowup')) f += 1;
  if (keys.has('s') || keys.has('arrowdown')) f -= 1;
  if (keys.has('a')) s -= 1;
  if (keys.has('d')) s += 1;
  if (keys.has('arrowleft')) turn += 1;
  if (keys.has('arrowright')) turn -= 1;
  if (!f && !s && !turn) return;
  path = null; hideHint();
  yaw += turn * 1.6 * dt;
  const fw = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), rt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const mv = fw.multiplyScalar(f).add(rt.multiplyScalar(s)).normalize().multiplyScalar(3.0 * dt);
  const nx = pos.clone(); nx.x += mv.x; if (free(nx)) pos.x = nx.x;
  const nz = pos.clone(); nz.z += mv.z; if (free(nz)) pos.z = nz.z;
}

// ---------------------------------------------------------------- puntero: arrastrar para mirar, tocar para ir
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (down) {
    const dx = e.clientX - (down.lx ?? down.x), dy = e.clientY - (down.ly ?? down.y);
    down.lx = e.clientX; down.ly = e.clientY; down.moved += Math.abs(dx) + Math.abs(dy);
    if (down.moved > 6) {
      canvas.classList.add('dragging'); hideHint();
      yaw += dx * 0.0042; pitch = Math.max(-0.6, Math.min(0.6, pitch + dy * 0.0032));
      if (path && path.yawTo !== null) path.yawTo = null;
    }
  } else {
    const hit = pick(e);
    canvas.classList.toggle('pointer', !!hit && hit.object.userData.kind !== 'floor' && hit.object.userData.kind !== 'none');
  }
});
canvas.addEventListener('pointerup', e => {
  canvas.classList.remove('dragging');
  if (down && down.moved <= 6) onTap(e);
  down = null;
});
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(clickables, false).filter(h => h.object.userData.kind);
  return hits[0] || null;
}
function onTap(e) {
  const hit = pick(e); if (!hit) return;
  const u = hit.object.userData;
  if (u.kind === 'obra') goToObra(u.i, true);
  else if (u.kind === 'refs') openRefs();
  else if (u.kind === 'floor') {
    const p = hit.point.clone(); p.x = Math.max(-W / 2 + 0.6, Math.min(W / 2 - 0.6, p.x));
    p.z = Math.max(zFar(NR - 1) + 0.6, Math.min(zNear(0) - 0.6, p.z));
    const t = new THREE.Vector3(p.x, EYE, p.z);
    if (!free(t)) return;
    routeTo(t);
  }
}
function goToObra(i, open) {
  const k = i + 1;
  routeTo(new THREE.Vector3(W / 2 - 3.3, EYE, zc(k)), -Math.PI / 2, open ? () => openObra(i) : null);
}
function goToRoom(k) {
  if (k >= 1 && k <= 6) return goToObra(k - 1, false);
  routeTo(new THREE.Vector3(0, EYE, zc(k) + 2.6), 0);
}

// ---------------------------------------------------------------- HUD
const hud = document.getElementById('hud'), hudSala = document.getElementById('hudSala'), hint = document.getElementById('hint');
let hintTimer;
function hideHint() { if (!hint.hidden && !hint.classList.contains('gone')) { hint.classList.add('gone'); } }
let lastRoom = -1;
function updateHud() {
  const r = roomOf(pos.z);
  if (r !== lastRoom) { lastRoom = r; hudSala.textContent = ROOM_NAMES[r]; }
}

// ---------------------------------------------------------------- plano
const plano = document.getElementById('plano'), planoRooms = document.getElementById('planoRooms');
planoRooms.innerHTML = ROOM_NAMES.map((n, k) => {
  const s = DATA.salas[k - 1];
  const num = k === 0 ? '·' : k === 7 ? 'Ref.' : s.num;
  const per = k === 0 ? 'Vestíbulo' : k === 7 ? 'Referencias' : s.periodo;
  const obra = k === 0 ? 'Entrada' : k === 7 ? 'Fuentes e imágenes' : s.obra;
  return `<li><button type="button" data-room="${k}"><span class="n">${num}</span><span class="p">${per}</span><span class="o">${obra}</span></button></li>`;
}).join('');
planoRooms.addEventListener('click', e => { const b = e.target.closest('button[data-room]'); if (!b) return; plano.hidden = true; goToRoom(+b.dataset.room); });
document.getElementById('btnPlano').onclick = () => {
  planoRooms.querySelectorAll('button').forEach(b => b.classList.toggle('here', +b.dataset.room === roomOf(pos.z)));
  plano.hidden = false;
};
document.getElementById('btnRefs').onclick = () => openRefs();
plano.addEventListener('click', e => { if (e.target === plano || e.target.closest('[data-close]')) plano.hidden = true; });

// ---------------------------------------------------------------- ventanas
const modal = document.getElementById('modal'), card = document.getElementById('card');
const modalOpen = () => !modal.hidden || !plano.hidden;
function closeAll() { modal.hidden = true; plano.hidden = true; const a = card.querySelector('audio'); a && a.pause(); }
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) closeAll(); });
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function timeline(items) {
  return `<ol class="tl" style="grid-template-columns:repeat(${items.length + 1},minmax(0,1fr))">${items.map((it, i) =>
    `<li class="${i % 2 ? 'down' : 'up'}" style="grid-column:${i + 1} / span 2"><span class="lab">${esc(it.label)}</span><span class="tit">${esc(it.titulo)}</span>${esc(it.texto)}</li>`).join('')}</ol>`;
}
function infografia(s) {
  const imgs = ['img/becq_0.jpg', 'img/becq_1.jpg', 'img/becq_2.jpg'];
  return `<div class="inf"><div>${s.partes.map((p, i) => `
    <div class="inf-row"><img src="${imgs[i]}" alt="">
      <div><span class="lab">Estrofas ${2 * i + 1} y ${2 * i + 2}</span><span class="tit">${esc(p[0])}</span>
      <div class="inf-seq"><span class="v">${esc(p[1])}</span><span class="arr">→</span><span class="v">${esc(p[2])}</span><span class="arr">→</span><span class="no">${esc(p[3])}</span></div></div>
    </div>`).join('')}</div>
    <aside class="inf-side"><h4>Métrica</h4><p>${esc(s.metrica)}</p><h4>Figuras</h4><p>${esc(s.figuras)}</p><h4>Voz poética</h4><p>${esc(s.voz)}</p></aside></div>`;
}
async function audioFor(n) {
  for (const ext of ['m4a', 'mp3', 'wav', 'ogg']) {
    const url = `audio/sala-${n}.${ext}`;
    try { const r = await fetch(url, { method: 'HEAD' }); if (r.ok) return url; } catch (e) { /* sin audio */ }
  }
  return null;
}
async function openObra(i) {
  const s = DATA.salas[i], n = i + 1;
  card.innerHTML = `
    <div class="card-top"><p class="card-kicker">Sala ${s.num} · ${esc(s.periodo)} · ${esc(s.fechas)}</p><button type="button" class="x" data-close>× Cerrar</button></div>
    <h2 id="mTitle">${esc(s.obra)}</h2><p class="card-sub">${esc(s.sub)}</p>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="0">Ficha y análisis</button>
      <button role="tab" aria-selected="false" data-tab="1">Resumen visual</button>
      <button role="tab" aria-selected="false" data-tab="2">Conexión AP</button>
    </div>
    <section class="pane" data-pane="0">
      <div class="ficha-grid">
        <div><h3>Ficha</h3><dl class="ficha">${s.ficha.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
        <div class="analisis"><h3>Análisis</h3>${s.analisis.map(([l, v]) => `<p><b>${esc(l)}</b>${esc(v)}</p>`).join('')}
          <div class="audio" id="audioBox"><p>Audioguía: nuestro comentario de un minuto</p><div id="audioSlot"></div>
          <details><summary>Leer el comentario</summary><p>${esc(s.guion)}</p></details></div>
        </div>
      </div>
    </section>
    <section class="pane" data-pane="1" hidden>
      <h3>Resumen visual: ${esc(s.resumen_tipo.toLowerCase())}</h3>
      ${s.slug === 'becquer' ? infografia(s) : timeline(s.resumen)}
    </section>
    <section class="pane" data-pane="2" hidden>
      <div class="ap"><div><h3>Conexión con los temas AP</h3><p class="tema">${esc(s.ap_tema)}</p><p>${esc(s.ap_texto)}</p></div>
      <figure><img src="img/cuadro_${s.slug}.jpg" alt="Collage digital inspirado en ${esc(s.obra)}"><figcaption>${esc(s.cuadro)}</figcaption></figure></div>
    </section>`;
  card.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    card.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    card.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
  });
  modal.hidden = false; card.scrollTop = 0;
  const url = await audioFor(n);
  const slot = card.querySelector('#audioSlot');
  if (slot) slot.innerHTML = url ? `<audio controls preload="metadata" src="${url}"></audio>` : `<p style="color:var(--muted);font-style:normal;font-size:16px">El audio de esta sala todavía no se sube.</p>`;
}
function openRefs() {
  card.innerHTML = `
    <div class="card-top"><p class="card-kicker">Sala final</p><button type="button" class="x" data-close>× Cerrar</button></div>
    <h2 id="mTitle">Referencias</h2><p class="card-sub">Obras, fuentes e imágenes del museo</p>
    <div class="refs"><div><h3>Obras y fuentes (MLA, 9.ª edición)</h3>${DATA.refs.map(r => `<p>${esc(r)}</p>`).join('')}</div>
    <div class="cred"><h3>Imágenes de los collages</h3>${DATA.credits.map(r => `<p>${esc(r)}</p>`).join('')}
    <p>Texturas de piso y muro: Poly Haven (CC0). Tipografía: Ibarra Real Nova (OFL).</p></div></div>`;
  modal.hidden = false; card.scrollTop = 0;
}

// ---------------------------------------------------------------- portada
document.getElementById('introNames').textContent = DATA.portada.integrantes;
document.getElementById('introCourse').textContent = DATA.portada.curso;
const btnEnter = document.getElementById('btnEnter'), loadPct = document.getElementById('loadPct');
manager.onProgress = (_u, a, b) => { loadPct.textContent = Math.round((a / b) * 100) + '%'; };
manager.onLoad = () => { btnEnter.disabled = false; btnEnter.textContent = 'Entrar al museo →'; };
btnEnter.onclick = () => {
  document.getElementById('intro').classList.add('out');
  setTimeout(() => { document.getElementById('intro').hidden = true; }, 520);
  hud.hidden = false; hint.hidden = false;
  hintTimer = setTimeout(hideHint, 9000);
};

// ---------------------------------------------------------------- bucle
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!modalOpen()) { stepKeys(dt); stepPath(dt); }
  applyCam(); updateHud();
  renderer.render(scene, camera);
});

// los letreros se dibujan con Ibarra: esperar a la fuente antes de construirlos
// (main.js se carga como módulo: el documento ya pidió la fuente vía <link rel=preload>)
window.__museo = { scene, THREE, goToRoom, openObra, openRefs, setView: (x, z, y, p) => { pos.set(x, EYE, z); yaw = y; pitch = p ?? 0; } };
