// La voz y la palabra · museo virtual en 3D (Three.js r169)
import * as THREE from 'three';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from './jsm/environments/RoomEnvironment.js';
import { DATA } from './content.js';

await Promise.all(['400 40px Ibarra', '600 40px Ibarra'].map(f => document.fonts.load(f)));

const MAT = '#FAF7F0', INK = '#1A1A1A', RED = '#B3261E';
const W = 12, D = 10, H = 4.6, DOOR_W = 2.4, DOOR_H = 3.2, EYE = 1.62;
const NR = 8;                                   // 0 vestíbulo · 1–6 salas · 7 referencias
const zc = k => -D * k;
const zNear = k => D / 2 - D * k;
const zFar = k => -D / 2 - D * k;
const roomOf = z => Math.min(NR - 1, Math.max(0, Math.floor((D / 2 - z) / D)));
const ROOM_NAMES = ['Vestíbulo', ...DATA.salas.map(s => `Sala ${s.num}. ${s.periodo}`), 'Referencias'];

// ---------------------------------------------------------------- render
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfc8bb');
scene.fog = new THREE.Fog('#cfc8bb', 26, 70);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 160);
camera.rotation.order = 'YXZ';
const pos = new THREE.Vector3(0, EYE, 3.4);
let yaw = 0, pitch = -0.02;
function applyCam() { camera.position.copy(pos); camera.rotation.set(pitch, yaw, 0); }
applyCam();

// ---------------------------------------------------------------- carga
const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const gltf = new GLTFLoader(manager);
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const texCache = {};
function texture(url, srgb = true) {
  if (!texCache[url]) {
    const t = loader.load(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso; texCache[url] = t;
  }
  return texCache[url];
}
function tiled(url, rx, ry, srgb = true) {
  const t = texture(url, srgb).clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
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
    normalScale: new THREE.Vector2(0.22, 0.22), color: '#ebe3d3', roughness: 0.93,
  });
}
const darkWood = new THREE.MeshStandardMaterial({ color: '#2f2219', roughness: 0.55 });
const inkMat = new THREE.MeshStandardMaterial({ color: '#191715', roughness: 0.5, metalness: 0.1 });
const matMat = new THREE.MeshStandardMaterial({ color: MAT, roughness: 0.9 });
const plinthMat = new THREE.MeshStandardMaterial({ color: '#f1ede6', roughness: 0.8 });

const clickables = [], obstacles = [];
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

const T = 0.24;
box(T, H, TOTAL, wallMat(TOTAL, H), -W / 2 - T / 2, H / 2, ZMID);
box(T, H, TOTAL, wallMat(TOTAL, H), W / 2 + T / 2, H / 2, ZMID);
box(W, H, T, wallMat(W, H), 0, H / 2, zNear(0) + T / 2);
box(W, H, T, wallMat(W, H), 0, H / 2, zFar(NR - 1) - T / 2);
box(0.03, 0.13, TOTAL, darkWood, -W / 2 + 0.015, 0.065, ZMID);
box(0.03, 0.13, TOTAL, darkWood, W / 2 - 0.015, 0.065, ZMID);
const sideW = (W - DOOR_W) / 2;
for (let k = 0; k < NR - 1; k++) {
  const z = zFar(k);
  box(sideW, H, 0.3, wallMat(sideW, H), -(DOOR_W / 2 + sideW / 2), H / 2, z);
  box(sideW, H, 0.3, wallMat(sideW, H), (DOOR_W / 2 + sideW / 2), H / 2, z);
  box(DOOR_W, H - DOOR_H, 0.3, wallMat(DOOR_W, H - DOOR_H), 0, DOOR_H + (H - DOOR_H) / 2, z);
  box(0.09, DOOR_H, 0.36, darkWood, -DOOR_W / 2 + 0.045, DOOR_H / 2, z);
  box(0.09, DOOR_H, 0.36, darkWood, DOOR_W / 2 - 0.045, DOOR_H / 2, z);
  box(DOOR_W, 0.09, 0.36, darkWood, 0, DOOR_H - 0.045, z);
  for (const s of [-1, 1]) for (const zz of [z + 0.165, z - 0.165]) box(sideW, 0.13, 0.03, darkWood, s * (DOOR_W / 2 + sideW / 2), 0.065, zz);
}

// ---------------------------------------------------------------- luz
scene.add(new THREE.HemisphereLight('#fff7ea', '#8a7860', 1.25));
const skyMat = new THREE.MeshBasicMaterial({ color: '#fffaf0' });
for (let k = 0; k < NR; k++) {
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.2), skyMat);
  sky.rotation.x = Math.PI / 2; sky.position.set(0, H - 0.005, zc(k)); scene.add(sky);
  const lamp = new THREE.PointLight('#fff4e2', 24, 0, 2);
  lamp.position.set(0, H - 0.5, zc(k)); scene.add(lamp);
}
function spotOn(target, from, intensity = 70, angle = 0.36) {
  const s = new THREE.SpotLight('#fff1dc', intensity, 0, angle, 0.55, 2);
  s.position.copy(from); s.target.position.copy(target); scene.add(s); scene.add(s.target);
}

// ---------------------------------------------------------------- letreros (vinil sobre el muro)
const PX = 260;
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
function vinyl(blocks, wM, hM, bg = null) {
  const cv = document.createElement('canvas'); cv.width = Math.round(wM * PX); cv.height = Math.round(hM * PX);
  const c = cv.getContext('2d');
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); }
  let y = (bg ? 0.05 : 0) * PX; const pad = (bg ? 0.05 : 0) * PX;
  for (const b of blocks) {
    const px = b.size * PX;
    c.font = `${b.weight || 400} ${px}px Ibarra`; c.fillStyle = b.color || INK; c.textBaseline = 'top';
    y += (b.gap || 0) * PX;
    for (const ln of wrap(c, b.text, (b.width || wM) * PX - 2 * pad)) { c.fillText(ln, pad, y); y += px * (b.lead || 1.25); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), new THREE.MeshStandardMaterial({ map: t, transparent: !bg, roughness: 0.92, depthWrite: !!bg }));
}
function onWall(obj, side, z, y, offset = 0.012, x = 0) {
  if (side === 'L') { obj.position.set(-W / 2 + offset, y, z); obj.rotation.y = Math.PI / 2; }
  else if (side === 'R') { obj.position.set(W / 2 - offset, y, z); obj.rotation.y = -Math.PI / 2; }
  else { obj.position.set(x, y, z + offset); }
  scene.add(obj); return obj;
}

// ---------------------------------------------------------------- obras, bancas, pedestales
function frame(url, w, h, data) {
  const g = new THREE.Group(), m = 0.17, f = 0.07;
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
  obstacles.push({ x, z, hx: 0.25, hz: 0.95 });
}
function plinth(x, z, sx, sy, sz) {
  box(sx, sy, sz, plinthMat, x, sy / 2, z);
  obstacles.push({ x, z, hx: sx / 2, hz: sz / 2 });
  return sy;
}
// coloca un glTF de Poly Haven con su base a la altura `y` y una altura total `h`
function placeModel(name, x, y, z, h, rotY = 0) {
  gltf.load(`models/${name}/${name}_1k.gltf`, g => {
    const o = g.scene; o.rotation.y = rotY;
    const b = new THREE.Box3().setFromObject(o), size = b.getSize(new THREE.Vector3());
    const s = h / size.y; o.scale.setScalar(s);
    const b2 = new THREE.Box3().setFromObject(o), c = b2.getCenter(new THREE.Vector3());
    o.position.set(x - c.x, y - b2.min.y, z - c.z);
    scene.add(o);
  });
}

// ---------------------------------------------------------------- don Quijote y Rocinante (bronce)
function quijote(x, z, baseY, scale) {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: '#3b2a1c', metalness: 0.78, roughness: 0.36 });
  const cast = geo => {   // poro de fundición, muy leve
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = 0.0012 * Math.sin(v.x * 140 + v.y * 90) * Math.cos(v.z * 120 - v.y * 70);
      p.setXYZ(i, v.x * (1 + d), v.y, v.z * (1 + d));
    }
    geo.computeVertexNormals(); return geo;
  };
  const V = a => new THREE.Vector3(...a), up = new THREE.Vector3(0, 1, 0);
  const seg = (a, b, r1, r2) => {            // tramo que se adelgaza de a hacia b
    const A = V(a), B = V(b), L = A.distanceTo(B);
    const m = new THREE.Mesh(cast(new THREE.CylinderGeometry(r2, r1, L, 14, 6)), bronze);
    m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, B.clone().sub(A).normalize()); g.add(m);
    for (const [P, r] of [[A, r1], [B, r2]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), bronze); k.position.copy(P); g.add(k); }
  };
  const blob = (c, r, rot = [0, 0, 0]) => { const m = new THREE.Mesh(cast(new THREE.SphereGeometry(1, 28, 20)), bronze); m.position.set(...c); m.scale.set(...r); m.rotation.set(...rot); g.add(m); };
  // Rocinante: barril angosto, cuello caído, patas secas
  blob([0, 0.70, 0], [0.105, 0.115, 0.40]);
  blob([0, 0.73, 0.33], [0.095, 0.125, 0.13]);
  blob([0, 0.72, -0.34], [0.105, 0.12, 0.13]);
  seg([0, 0.78, 0.40], [0, 0.98, 0.60], 0.075, 0.045);
  seg([0, 0.99, 0.61], [0, 0.88, 0.80], 0.05, 0.03);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.055, 8), bronze); e.position.set(sx * 0.022, 1.04, 0.61); e.rotation.x = -0.3; g.add(e);
    seg([sx * 0.055, 0.66, 0.36], [sx * 0.055, 0.36, 0.38], 0.034, 0.022);   // antebrazo
    seg([sx * 0.055, 0.36, 0.38], [sx * 0.055, 0.04, 0.37], 0.02, 0.017);    // caña
    seg([sx * 0.06, 0.68, -0.36], [sx * 0.06, 0.40, -0.45], 0.045, 0.026);   // muslo
    seg([sx * 0.06, 0.40, -0.45], [sx * 0.06, 0.04, -0.38], 0.022, 0.017);   // garrón y caña
    for (const zz of [0.37, -0.38]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.04, 12), bronze); h.position.set(sx * 0.057, 0.02, zz); g.add(h); }
  }
  seg([0, 0.73, -0.47], [0, 0.50, -0.56], 0.02, 0.013);
  seg([0, 0.50, -0.56], [0, 0.30, -0.53], 0.013, 0.009);
  // don Quijote: alto, seco, piernas largas
  seg([0, 0.86, -0.04], [0, 1.34, 0.0], 0.042, 0.052);
  seg([-0.1, 1.33, 0], [0.1, 1.33, 0], 0.03, 0.03);
  seg([0, 1.36, 0], [0, 1.43, 0.01], 0.022, 0.02);
  blob([0, 1.49, 0.02], [0.042, 0.06, 0.048]);
  const barba = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 10), bronze); barba.position.set(0, 1.43, 0.05); barba.rotation.x = Math.PI - 0.25; g.add(barba);
  const bacia = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.05, 0.0], [0.063, 0.032], [0.065, 0.042], [0.105, 0.046], [0.107, 0.054]].map(([a, b]) => new THREE.Vector2(a, b)), 32), bronze);
  bacia.position.set(0, 1.535, 0.02); bacia.rotation.set(-0.12, 0, 0.08); g.add(bacia);
  for (const sx of [-1, 1]) {
    seg([sx * 0.07, 0.86, -0.03], [sx * 0.12, 0.75, 0.16], 0.03, 0.024);
    seg([sx * 0.12, 0.75, 0.16], [sx * 0.12, 0.45, 0.11], 0.021, 0.017);
    seg([sx * 0.12, 0.45, 0.11], [sx * 0.12, 0.43, 0.19], 0.018, 0.014);
  }
  seg([0.1, 1.33, 0], [0.15, 1.17, 0.11], 0.022, 0.018); seg([0.15, 1.17, 0.11], [0.13, 1.2, 0.27], 0.018, 0.015);
  seg([-0.1, 1.33, 0], [-0.17, 1.18, 0.06], 0.022, 0.018); seg([-0.17, 1.18, 0.06], [-0.18, 1.12, 0.14], 0.018, 0.015);
  const lanza = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.3, 8), bronze);
  const a = new THREE.Vector3(0.13, 1.0, -0.6), b = new THREE.Vector3(0.13, 1.85, 1.55);
  lanza.position.copy(a.clone().add(b).multiplyScalar(0.5)); lanza.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); g.add(lanza);
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.11, 8), bronze); punta.position.copy(b); punta.quaternion.copy(lanza.quaternion); g.add(punta);
  const escudo = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 32), bronze);
  escudo.position.set(-0.2, 1.14, 0.13); escudo.rotation.z = Math.PI / 2; g.add(escudo);
  g.scale.setScalar(scale); g.position.set(x, baseY, z); scene.add(g);
  return g;
}

// ---------------------------------------------------------------- vestíbulo
{
  const P = DATA.portada;
  onWall(vinyl([
    { text: 'La voz\ny la palabra', size: 0.62, weight: 600, lead: 0.98 },
    { text: P.subtitle, size: 0.17, color: RED, gap: 0.12 },
    { text: P.integrantes, size: 0.1, gap: 0.42 },
    { text: P.curso, size: 0.1, gap: 0.04, width: 5.0 },
  ], 5.6, 3.2), 'L', zc(0) - 0.4, 2.1);
  onWall(frame('img/portada_dore.jpg', 1.7, 2.42, { kind: 'none' }), 'R', zc(0) - 0.3, 1.95, 0.0);
  onWall(vinyl([{ text: 'Gustave Doré, Don Quijote en su biblioteca, 1863.', size: 0.04, lead: 1.3 }], 0.6, 0.2, MAT), 'R', zc(0) + 1.7, 1.42, 0.01);
  spotOn(new THREE.Vector3(W / 2, 1.95, zc(0) - 0.3), new THREE.Vector3(W / 2 - 2.3, H - 0.15, zc(0) - 0.3));
  for (const sx of [-1, 1]) { placeModel('potted_plant_02', sx * 2.1, 0, zFar(0) + 0.55, 1.15); obstacles.push({ x: sx * 2.1, z: zFar(0) + 0.55, hx: 0.35, hz: 0.35 }); }
}

// ---------------------------------------------------------------- salas I–VI
DATA.salas.forEach((s, i) => {
  const k = i + 1, z = zc(k);
  onWall(vinyl([{ text: s.num, size: 0.34, weight: 600, color: RED, width: 3.2 }, { text: s.periodo, size: 0.14, width: 3.2 }], 3.2, 0.95), 'N', zFar(k - 1) + 0.15, DOOR_H + 0.62);
  onWall(vinyl([
    { text: s.periodo, size: s.periodo.length > 18 ? 0.38 : 0.46, weight: 600, lead: 1.0 },
    { text: s.contexto, size: 0.115, lead: 1.42, gap: 0.22, width: 4.4 },
  ], 4.6, 3.0), 'L', z, 2.2);
  onWall(frame(`img/cuadro_${s.slug}.jpg`, 1.65, 1.98, { kind: 'obra', i }), 'R', z, 1.92, 0.0);
  spotOn(new THREE.Vector3(W / 2, 1.92, z), new THREE.Vector3(W / 2 - 2.4, H - 0.15, z));
  onWall(vinyl([{ text: s.cedula, size: 0.042, lead: 1.35 }], 0.62, 0.2, MAT), 'R', z + 1.62, 1.42, 0.01);

  if (s.slug === 'lazarillo') {                    // busto de mármol en su pedestal
    const top = plinth(-2.4, z, 0.5, 1.1, 0.5);
    placeModel('marble_bust_01', -2.4, top, z, 0.62, Math.PI / 2);
    spotOn(new THREE.Vector3(-2.4, 1.4, z), new THREE.Vector3(-1.2, H - 0.15, z), 30, 0.3);
  } else if (s.slug === 'quijote') {               // don Quijote y Rocinante
    const top = plinth(-2.4, z, 0.8, 0.7, 1.9);
    quijote(-2.4, z, top, 1.2);
    onWall(vinyl([{ text: 'Don Quijote y Rocinante. Bronce.', size: 0.05 }], 0.78, 0.09), 'N', z + 0.95, 0.5, 0.005, -2.4);
    spotOn(new THREE.Vector3(-2.4, 1.5, z), new THREE.Vector3(-0.6, H - 0.15, z + 0.6), 55, 0.42);
  } else if (s.slug === 'becquer') {               // la lámpara del que escribe de noche
    bench(-2.2, z);
    const top = plinth(-4.9, z + 2.9, 0.5, 0.95, 0.5);
    placeModel('vintage_oil_lamp', -4.9, top, z + 2.9, 0.48);
  } else bench(-2.2, z);
});

// ---------------------------------------------------------------- referencias
{
  const z = zc(7);
  onWall(vinyl([{ text: 'Fin', size: 0.3, weight: 600, color: RED, width: 3.2 }, { text: 'Referencias', size: 0.14, width: 3.2 }], 3.2, 0.95), 'N', zFar(6) + 0.15, DOOR_H + 0.62);
  const refs = onWall(vinyl([
    { text: 'Referencias', size: 0.4, weight: 600 },
    ...DATA.refs.map(r => ({ text: r, size: 0.07, lead: 1.35, gap: 0.07, width: 5.2 })),
  ], 5.4, 3.4), 'L', z, 2.15);
  refs.userData = { kind: 'refs' }; clickables.push(refs);
  const cred = onWall(vinyl([
    { text: 'Imágenes', size: 0.2, weight: 600 },
    ...DATA.credits.map(r => ({ text: r, size: 0.06, lead: 1.35, gap: 0.06, width: 5.0 })),
  ], 5.2, 3.3), 'R', z, 2.1);
  cred.userData = { kind: 'refs' }; clickables.push(cred);
}

// ---------------------------------------------------------------- movimiento
const R = 0.38;
function free(p) {
  if (p.x < -W / 2 + R || p.x > W / 2 - R) return false;
  if (p.z > zNear(0) - R || p.z < zFar(NR - 1) + R) return false;
  for (let k = 0; k < NR - 1; k++) if (Math.abs(p.z - zFar(k)) < 0.15 + R && Math.abs(p.x) > DOOR_W / 2 - R) return false;
  for (const o of obstacles) if (Math.abs(p.x - o.x) < o.hx + R && Math.abs(p.z - o.z) < o.hz + R) return false;
  return true;
}
let path = null;
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
  path = { pts, yawTo, then, i: 0 };
  hideHint();
}
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const lerpAngle = (a, b, t) => a + angDiff(a, b) * t;
function stepPath(dt) {
  if (!path) return;
  const tgt = path.pts[path.i], d = tgt.clone().sub(pos); d.y = 0;
  const dist = d.length(), sp = 3.4 * dt;
  if (dist > 0.02) {
    const mv = d.normalize().multiplyScalar(Math.min(sp, dist)); pos.add(mv);
    if (path.pts.length > 1 && path.i < path.pts.length - 1) yaw = lerpAngle(yaw, Math.atan2(-mv.x, -mv.z), 0.12);
  }
  if (dist <= 0.02 || dist <= sp) {
    if (path.i < path.pts.length - 1) path.i++;
    else if (path.yawTo === null || Math.abs(angDiff(yaw, path.yawTo)) < 0.01) { const f = path.then; path = null; f && f(); }
  }
  if (path && path.yawTo !== null && path.i === path.pts.length - 1) { yaw = lerpAngle(yaw, path.yawTo, 0.1); pitch += (-0.02 - pitch) * 0.1; }
}
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

// ---------------------------------------------------------------- puntero
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (down) {
    const dx = e.clientX - (down.lx ?? down.x), dy = e.clientY - (down.ly ?? down.y);
    down.lx = e.clientX; down.ly = e.clientY; down.moved += Math.abs(dx) + Math.abs(dy);
    if (down.moved > 6) {
      canvas.classList.add('dragging'); hideHint();
      yaw += dx * 0.0042; pitch = Math.max(-1.1, Math.min(1.1, pitch + dy * 0.0035));
      if (path && path.yawTo !== null) path.yawTo = null;
    }
  } else {
    const hit = pick(e), k = hit && hit.object.userData.kind;
    canvas.classList.toggle('pointer', k === 'obra' || k === 'refs');
  }
});
canvas.addEventListener('pointerup', e => { canvas.classList.remove('dragging'); if (down && down.moved <= 6) onTap(e); down = null; });
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(clickables, false).find(h => h.object.userData.kind) || null;
}
function onTap(e) {
  const hit = pick(e); if (!hit) return;
  const u = hit.object.userData;
  if (u.kind === 'obra') goToObra(u.i, true);
  else if (u.kind === 'refs') openRefs();
  else if (u.kind === 'floor') {
    const t = new THREE.Vector3(Math.max(-W / 2 + 0.6, Math.min(W / 2 - 0.6, hit.point.x)), EYE, Math.max(zFar(NR - 1) + 0.6, Math.min(zNear(0) - 0.6, hit.point.z)));
    if (free(t)) routeTo(t);
  }
}
function goToObra(i, open) { routeTo(new THREE.Vector3(W / 2 - 3.3, EYE, zc(i + 1)), -Math.PI / 2, open ? () => openObra(i) : null); }
function goToRoom(k) { if (k >= 1 && k <= 6) return goToObra(k - 1, false); routeTo(new THREE.Vector3(0, EYE, zc(k) + 2.6), 0); }

// ---------------------------------------------------------------- HUD y plano
const hud = document.getElementById('hud'), hudSala = document.getElementById('hudSala'), hint = document.getElementById('hint');
function hideHint() { hint.classList.add('gone'); }
let lastRoom = -1;
function updateHud() { const r = roomOf(pos.z); if (r !== lastRoom) { lastRoom = r; hudSala.textContent = ROOM_NAMES[r]; } }
const plano = document.getElementById('plano'), planoRooms = document.getElementById('planoRooms');
planoRooms.innerHTML = ROOM_NAMES.map((n, k) => {
  const s = DATA.salas[k - 1];
  const num = k === 0 ? 'Entrada' : k === 7 ? 'Fin' : s.num;
  const per = k === 0 ? 'Vestíbulo' : k === 7 ? 'Referencias' : s.periodo;
  const obra = k === 0 || k === 7 ? '' : s.obra;
  return `<li><button type="button" data-room="${k}"><span class="n">${num}</span><span class="p">${per}</span><span class="o">${obra}</span></button></li>`;
}).join('');
planoRooms.addEventListener('click', e => { const b = e.target.closest('button[data-room]'); if (!b) return; plano.hidden = true; goToRoom(+b.dataset.room); });
document.getElementById('btnPlano').onclick = () => { planoRooms.querySelectorAll('button').forEach(b => b.classList.toggle('here', +b.dataset.room === roomOf(pos.z))); plano.hidden = false; };
document.getElementById('btnRefs').onclick = () => openRefs();
plano.addEventListener('click', e => { if (e.target === plano || e.target.closest('[data-close]')) plano.hidden = true; });

// ---------------------------------------------------------------- ventanas
const modal = document.getElementById('modal'), card = document.getElementById('card');
const modalOpen = () => !modal.hidden || !plano.hidden;
function closeAll() { modal.hidden = true; plano.hidden = true; const a = card.querySelector('audio'); a && a.pause(); music.pause(); }
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) closeAll(); });
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function timeline(items) {
  return `<ol class="tl" style="grid-template-columns:repeat(${items.length + 1},minmax(0,1fr))">${items.map((it, i) =>
    `<li class="${i % 2 ? 'down' : 'up'}" style="grid-column:${i + 1} / span 2"><span class="tit"><span class="lab">${esc(it.label)}.</span> ${esc(it.titulo)}</span>${esc(it.texto)}</li>`).join('')}</ol>`;
}
function infografia(s) {
  const imgs = ['img/becq_0.jpg', 'img/becq_1.jpg', 'img/becq_2.jpg'];
  return `<div class="inf"><div>${s.partes.map((p, i) => `
    <div class="inf-row"><img src="${imgs[i]}" alt="">
      <div><span class="tit">${esc(p[0])}, estrofas ${2 * i + 1} y ${2 * i + 2}</span>
      <div class="inf-seq"><span>${esc(p[1])}</span><span class="arr">→</span><span>${esc(p[2])}</span><span class="arr">→</span><span class="no">${esc(p[3])}</span></div></div>
    </div>`).join('')}</div>
    <div class="inf-side"><p><b>Métrica.</b> ${esc(s.metrica)}</p><p><b>Figuras.</b> ${esc(s.figuras)}</p><p><b>Voz poética.</b> ${esc(s.voz)}</p></div></div>`;
}
// líneas del tiempo hechas en Canva (imagen exportada)
const TL_IMG = {
  lucanor: 'la pregunta, el mozo pobre, la boda, la cena, ella obedece, el suegro y la moraleja',
  lazarillo: 'una carta, nace en el río, el ciego, el clérigo, el escudero, más amos y el caso',
  vencidos: 'los presagios, el pájaro del espejo, llegan en 1519, la matanza de 1520, el sitio de 1521, cae Tenochtitlan y el libro de 1959',
  quijote: 'decide ser caballero, primera aventura, Sancho Panza, molinos de viento, continúa la aventura, regreso a casa, recupera la razón y muere',
  becquer: 'rimas perdidas en 1868, las golondrinas, esas no, las madreselvas, esas tampoco, el amor y se publica en 1871',
  medias: 'sale en 1914, la leña, las medias, los huevos, el gancho, la golpiza y sin barco',
};
function resumenVisual(s) {
  if (TL_IMG[s.slug]) {
    const src = `img/tl_${s.slug}.jpg`;
    return `<a class="tl-img" href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="Línea del tiempo de ${esc(s.obra)}: ${esc(TL_IMG[s.slug])}."></a>`;
  }
  return s.slug === 'becquer' ? infografia(s) : timeline(s.resumen);
}
async function audioFor(n) {
  for (const ext of ['m4a', 'mp3', 'wav', 'ogg']) {
    try { const r = await fetch(`audio/sala-${n}.${ext}`, { method: 'HEAD' }); if (r.ok) return `audio/sala-${n}.${ext}`; } catch (e) { /* sin audio */ }
  }
  return null;
}
async function openObra(i) {
  const s = DATA.salas[i];
  card.innerHTML = `
    <div class="card-top"><h2 id="mTitle">${esc(s.obra)}</h2><button type="button" class="x" data-close>Cerrar</button></div>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="1">${s.slug === 'becquer' && !TL_IMG.becquer ? 'Infografía' : 'Línea del tiempo'}</button>
      <button role="tab" aria-selected="false" data-tab="0">Ficha y análisis</button>
      <button role="tab" aria-selected="false" data-tab="2">Conexión AP</button>
      <button role="tab" aria-selected="false" data-tab="3">Audioguía</button>
    </div>
    <section class="pane" data-pane="1">${resumenVisual(s)}</section>
    <section class="pane" data-pane="0" hidden>
      <div class="shots">
        ${shot(`img/ficha_${s.slug}.png`, `Ficha de ${s.obra}. ${s.ficha.map(([l, v]) => `${l}: ${v}`).join('. ')}.`)}
        ${shot(`img/analisis_${s.slug}.png`, s.analisis.map(([l, v]) => `${l}. ${v}`).join(' '))}
      </div>
    </section>
    <section class="pane" data-pane="2" hidden><div class="ap">
      ${shot(`img/ap_${s.slug}.png`, `Conexión AP: ${s.ap_tema}. ${s.ap_texto}`)}
      <figure><img src="img/cuadro_${s.slug}.jpg" alt="Collage digital inspirado en ${esc(s.obra)}"><figcaption><b>Fuente:</b> ${esc(s.cuadro)}</figcaption></figure>
    </div></section>
    <section class="pane" data-pane="3" hidden><div class="audio" id="audioSlot"></div></section>
    <div class="musica"><button type="button" data-music>${musicOn ? 'Pausar música' : 'Poner música'}</button><p><b>Música:</b> ${esc(s.musica)}</p></div>`;
  card.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    card.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    card.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
  });
  card.querySelector('[data-music]').onclick = () => { musicOn = music.paused; musicOn ? playMusic() : music.pause(); };
  modal.hidden = false; card.scrollTop = 0;
  setMusic(s.slug);
  const url = await audioFor(i + 1), slot = card.querySelector('#audioSlot');
  if (slot) slot.innerHTML = url ? `<audio controls preload="metadata" src="${url}"></audio>` : `<p>Se sube pronto.</p>`;
  const guia = slot && slot.querySelector('audio');
  if (guia) guia.addEventListener('play', () => music.pause());
}
// captura del Google Doc, se abre en grande al tocarla
function shot(src, alt) { return `<a class="shot" href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${esc(alt)}"></a>`; }

// música de fondo: una pieza de la época de cada obra
const music = new Audio(); music.loop = true; music.volume = 0.35;
let musicOn = true;
function musicLabel() { const b = card.querySelector('[data-music]'); if (b) b.textContent = music.paused ? 'Poner música' : 'Pausar música'; }
music.addEventListener('play', musicLabel); music.addEventListener('pause', musicLabel);
function playMusic() { music.play().catch(musicLabel); }
function setMusic(slug) {
  const src = `audio/musica/${slug}.m4a`;
  if (!music.src.endsWith(src)) { music.src = src; } else { music.currentTime = 0; }
  music.muted = false;
  if (musicOn) playMusic(); else musicLabel();
}
// Safari solo deja sonar un audio que ya se tocó con un clic: lo "desbloqueamos" en el primer toque
addEventListener('pointerdown', () => {
  if (music.src) return;
  music.muted = true; music.src = 'audio/musica/lucanor.m4a';
  music.play().then(() => { if (music.muted) { music.pause(); music.muted = false; } }).catch(() => { music.muted = false; });
}, { once: true });
function openRefs() {
  music.pause();
  card.innerHTML = `
    <div class="card-top"><h2 id="mTitle">Referencias</h2><button type="button" class="x" data-close>Cerrar</button></div>
    <div class="refs"><div><h3>Obras y fuentes (MLA)</h3>${DATA.refs.map(r => `<p>${esc(r)}</p>`).join('')}</div>
    <div><h3>Imágenes y modelos</h3>${DATA.credits.map(r => `<p>${esc(r)}</p>`).join('')}
    <p>Texturas y modelos 3D (plantas, busto y lámpara): Poly Haven, CC0. Escultura de don Quijote: hecha por el equipo. Letra: Ibarra Real Nova.</p></div></div>`;
  modal.hidden = false; card.scrollTop = 0;
}

// ---------------------------------------------------------------- arranque
const loading = document.getElementById('loading'), loadPct = document.getElementById('loadPct');
manager.onProgress = (_u, a, b) => { loadPct.textContent = Math.round((a / b) * 100) + '%'; };
manager.onLoad = () => {
  loading.classList.add('out'); setTimeout(() => loading.hidden = true, 600);
  hud.hidden = false; hint.hidden = false; setTimeout(hideHint, 10000);
};
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!modalOpen()) { stepKeys(dt); stepPath(dt); }
  applyCam(); updateHud();
  renderer.render(scene, camera);
});
window.__museo = { scene, goToRoom, openObra, openRefs, setView: (x, z, y, p) => { pos.set(x, EYE, z); yaw = y; pitch = p ?? 0; } };
