/**
 * KoduDisain – etapid 2–3
 * Seinad 2D, ruumid, avad, materjalid, pakkumine, JSON
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { SITE, CATALOG, MATERIALS, PRICES, APP } from './config.js';
import {
  isLoggedIn, currentUser, login, register, logout, onAuthChange, checkHealth,
} from './auth.js';
import {
  listMyProjects, saveProject, loadProject, deleteProject, setShare, loadByShareToken, shareUrl,
} from './cloud.js';


const L = SITE.sauna.L, W = SITE.sauna.W, H = SITE.sauna.H;
const FRONT_D = SITE.sauna.FRONT_D, BACK_D = SITE.sauna.BACK_D;
const PESU_W = SITE.PESU_W, LEILI_W = SITE.LEILI_W;
const FLOOR_Y = SITE.FLOOR_Y;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec8f0);
scene.fog = new THREE.FogExp2(0xb0d4f0, 0.012);

const cameraPersp = new THREE.PerspectiveCamera(42, 2, 0.05, 120);
cameraPersp.position.set(L / 2 - 2, 18, W / 2 + 10);
const cameraOrtho = new THREE.OrthographicCamera(-14, 14, 14, -14, 0.1, 100);
cameraOrtho.position.set(L / 2 + 2, 40, W / 2);
let camera = cameraPersp;
let viewMode = '3d';

const controls = new OrbitControls(camera, canvas);
controls.target.set(L / 2 + 2, 0.2, W / 2);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 2;
controls.maxDistance = 70;

const transform = new TransformControls(camera, canvas);
transform.setSize(0.75);
transform.setTranslationSnap(0.1);
transform.setRotationSnap(THREE.MathUtils.degToRad(15));
transform.addEventListener('dragging-changed', e => {
  controls.enabled = !e.value;
  if (!e.value) { pushHist(); refreshQuote(); }
});
transform.addEventListener('objectChange', () => { syncProps(); clampSel(); });
scene.add(transform);

scene.add(new THREE.AmbientLight(0xfff5e8, 0.5));
const sun = new THREE.DirectionalLight(0xfff0dd, 1.1);
sun.position.set(12, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -25;
sun.shadow.camera.right = sun.shadow.camera.top = 25;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xd0e8ff, 0x5a8a40, 0.45));

function M(c, o = {}) {
  return new THREE.MeshStandardMaterial({
    color: c, roughness: o.r ?? 0.7, metalness: o.m ?? 0.05,
    transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1,
    side: o.side ?? THREE.FrontSide, depthWrite: (o.op ?? 1) >= 0.99,
  });
}
function box(sx, sy, sz, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function cyl(rt, rb, h, mat, x, y, z, s = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}

const MAT = {
  grass: M(0x5a9a48, { r: 0.92 }),
  sand: M(0xe8a040, { r: 0.9, op: 0.5 }),
  floorC: M(0xd2c4a6), floorP: M(0x4a8c70), floorL: M(0x8a5a2c),
  wood: M(0xc99a6a), woodD: M(0xb07848),
  door: M(0x3f3830), alu: M(0x2c3036, { m: 0.6, r: 0.35 }),
  glass: M(0xa0d0f0, { op: 0.3, side: THREE.DoubleSide }),
  house: M(0xd8d0b0), roof: M(0x6a6e72), deck: M(0x6b4a2a),
  bark: M(0x5a4030), pine: M(0x3a6b3a), leaf: M(0x2d5a28),
  road: M(0x6a6a68), fence: M(0x6a6a62), concrete: M(0xb0aca4),
  preview: M(0x3d8bfd, { op: 0.55 }),
};

const layers = {
  building: new THREE.Group(),
  scenery: new THREE.Group(),
  furniture: new THREE.Group(),
  grid: new THREE.Group(),
  dims: new THREE.Group(),
};
Object.values(layers).forEach(g => scene.add(g));

{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), MAT.grass);
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true;
  layers.scenery.add(g);
}
const gridHelper = new THREE.GridHelper(40, 80, 0x8899aa, 0x3a4550);
gridHelper.position.set(L / 2 + 2, 0.01, W / 2);
layers.grid.add(gridHelper);

// Sauna floors (reference, not walls – walls are drawn)
function buildSaunaFloors() {
  const g = layers.building;
  // remove only floor markers
  [...g.children].filter(c => c.userData.floorMark).forEach(c => g.remove(c));
  const fl = (sx, sz, mat, x, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, FLOOR_Y + 0.01, z); m.receiveShadow = true;
    m.userData.floorMark = true; g.add(m);
  };
  fl(FRONT_D - 0.05, W - 0.08, MAT.floorC, FRONT_D / 2, W / 2);
  fl(BACK_D - 0.05, PESU_W - 0.05, MAT.floorP, FRONT_D + BACK_D / 2, PESU_W / 2);
  fl(BACK_D - 0.05, LEILI_W - 0.05, MAT.floorL, FRONT_D + BACK_D / 2, PESU_W + LEILI_W / 2);
}
buildSaunaFloors();

// ---- Walls / rooms data ----
let walls = []; // { id, x1, z1, x2, z2, h, t, mat, openings: [] }
let rooms = []; // { id, name, x, z }
const wallMeshes = new Map();

function uid() { return Math.random().toString(36).slice(2, 9); }

function wallLength(w) {
  return Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
}

function matColor(key) {
  return MATERIALS[key]?.color ?? 0xc4a574;
}

function rebuildWallMesh(w) {
  const old = wallMeshes.get(w.id);
  if (old) {
    layers.building.remove(old);
    wallMeshes.delete(w.id);
  }
  const len = wallLength(w);
  if (len < 0.05) return;
  const g = new THREE.Group();
  g.userData.movable = true;
  g.userData.type = 'wall';
  g.userData.kind = 'wall';
  g.userData.wallId = w.id;
  g.userData.uid = w.id;

  const h = w.h || H;
  const t = w.t || 0.12;
  const midX = (w.x1 + w.x2) / 2;
  const midZ = (w.z1 + w.z2) / 2;
  const angle = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);
  const mat = M(matColor(w.mat || 'wood'), { r: 0.75 });

  // openings cut wall into segments along length
  const opens = [...(w.openings || [])].sort((a, b) => a.along - b.along);
  const segments = [];
  let cursor = 0;
  opens.forEach(op => {
    const start = Math.max(0, op.along - op.width / 2);
    const end = Math.min(len, op.along + op.width / 2);
    if (start > cursor + 0.02) segments.push({ a: cursor, b: start });
    cursor = end;
  });
  if (cursor < len - 0.02) segments.push({ a: cursor, b: len });
  if (!opens.length) segments.push({ a: 0, b: len });

  segments.forEach(seg => {
    const segLen = seg.b - seg.a;
    if (segLen < 0.02) return;
    const cx = w.x1 + Math.cos(angle) * (seg.a + segLen / 2);
    const cz = w.z1 + Math.sin(angle) * (seg.a + segLen / 2);
    const mesh = box(segLen, h, t, mat, 0, h / 2, 0);
    mesh.position.set(cx, FLOOR_Y + h / 2, cz);
    mesh.rotation.y = -angle;
    g.add(mesh);
  });

  // lintels above openings + opening frames
  opens.forEach(op => {
    const ox = w.x1 + Math.cos(angle) * op.along;
    const oz = w.z1 + Math.sin(angle) * op.along;
    const oh = op.height || (op.type === 'door' ? 2.05 : 1.2);
    const sill = op.type === 'door' ? 0 : (op.sill ?? 0.9);
    // frame
    if (op.type === 'door') {
      const d = box(0.05, oh - 0.05, op.width - 0.05, MAT.door, 0, FLOOR_Y + oh / 2, 0);
      d.position.set(ox, FLOOR_Y + oh / 2, oz);
      d.rotation.y = -angle;
      g.add(d);
    } else {
      const fr = box(0.04, oh, op.width, MAT.alu, 0, FLOOR_Y + sill + oh / 2, 0);
      fr.position.set(ox, FLOOR_Y + sill + oh / 2, oz);
      fr.rotation.y = -angle;
      g.add(fr);
      const gl = box(0.02, oh - 0.08, op.width - 0.08, MAT.glass, 0, FLOOR_Y + sill + oh / 2, 0);
      gl.position.set(ox, FLOOR_Y + sill + oh / 2, oz);
      gl.rotation.y = -angle;
      g.add(gl);
    }
    // wall above opening
    const topH = h - (sill + oh);
    if (topH > 0.05) {
      const top = box(op.width + 0.04, topH, t, mat, 0, FLOOR_Y + sill + oh + topH / 2, 0);
      top.position.set(ox, FLOOR_Y + sill + oh + topH / 2, oz);
      top.rotation.y = -angle;
      g.add(top);
    }
  });

  g.traverse(c => { if (c.isMesh) { c.userData.root = g; c.castShadow = true; c.receiveShadow = true; } });
  // store wall endpoints for editing (group origin at 0 – we use wallId)
  layers.building.add(g);
  wallMeshes.set(w.id, g);
  return g;
}

function rebuildAllWalls() {
  walls.forEach(w => rebuildWallMesh(w));
  rebuildDims();
  refreshRooms();
  refreshQuote();
}

function rebuildDims() {
  while (layers.dims.children.length) layers.dims.remove(layers.dims.children[0]);
  if (!layers.dims.visible) return;
  walls.forEach(w => {
    const len = wallLength(w);
    if (len < 0.15) return;
    const mx = (w.x1 + w.x2) / 2, mz = (w.z1 + w.z2) / 2;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(20,24,30,0.85)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#e8a87c';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(len.toFixed(2) + ' m', 64, 22);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.position.set(mx, FLOOR_Y + (w.h || H) + 0.25, mz);
    sp.scale.set(1.0, 0.25, 1);
    layers.dims.add(sp);
  });
}

// Room labels
const roomSprites = new Map();
function rebuildRooms() {
  roomSprites.forEach(s => layers.building.remove(s));
  roomSprites.clear();
  rooms.forEach(r => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(30,50,80,0.88)';
    ctx.beginPath(); ctx.roundRect(4, 4, 248, 56, 8); ctx.fill();
    ctx.strokeStyle = '#5a9ab0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c0e0f0';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(r.name || 'Ruum', 128, 32);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.position.set(r.x, FLOOR_Y + 1.5, r.z);
    sp.scale.set(1.6, 0.4, 1);
    sp.userData.movable = true;
    sp.userData.type = 'room';
    sp.userData.kind = 'room';
    sp.userData.uid = r.id;
    sp.userData.roomId = r.id;
    layers.building.add(sp);
    roomSprites.set(r.id, sp);
  });
  refreshRooms();
}

function refreshRooms() {
  const el = document.getElementById('room-list');
  if (!el) return;
  el.innerHTML = rooms.map(r =>
    `<button type="button" data-room="${r.id}">${r.name || 'Ruum'}</button>`
  ).join('') || '<span class="muted">Lisa 🏷 Ruum</span>';
  el.querySelectorAll('[data-room]').forEach(b => {
    b.onclick = () => {
      const sp = roomSprites.get(b.dataset.room);
      if (sp) select(sp);
    };
  });
}

// ---- Assets (furniture / scenery) ----
function mark(g, type, kind) {
  g.userData.movable = true;
  g.userData.type = type;
  g.userData.kind = kind;
  g.userData.uid = uid();
  g.traverse(c => { if (c.isMesh) { c.userData.root = g; c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

const ASSETS = {
  saunaPad: () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L + 1.6, W + 1.8), MAT.sand);
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; g.add(m);
    return mark(g, 'saunaPad', 'scenery');
  },
  houseMain: () => {
    const g = new THREE.Group();
    g.add(box(10, 5.5, 14, MAT.house, 0, 2.75, 0));
    g.add(box(10.4, 0.35, 14.4, MAT.roof, 0, 5.6, 0));
    return mark(g, 'houseMain', 'scenery');
  },
  houseShed: () => {
    const g = new THREE.Group();
    g.add(box(4.5, 2.8, 5.5, M(0xc8c4bc), 0, 1.4, 0));
    g.add(box(4.7, 0.2, 5.7, MAT.roof, 0, 2.9, 0));
    return mark(g, 'houseShed', 'scenery');
  },
  houseNeigh: () => {
    const g = new THREE.Group();
    g.add(box(9, 4.2, 11, M(0xece8e0), 0, 2.1, 0));
    g.add(box(9.3, 0.25, 11.3, M(0xc4a090), 0, 4.3, 0));
    return mark(g, 'houseNeigh', 'scenery');
  },
  road: () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.5), MAT.road);
    m.rotation.x = -Math.PI / 2; m.position.y = 0.01; g.add(m);
    return mark(g, 'road', 'scenery');
  },
  pine: () => {
    const g = new THREE.Group();
    g.add(cyl(0.1, 0.15, 1.8, MAT.bark, 0, 0.9, 0, 8));
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(1 - i * 0.15, 0.9, 8), MAT.pine);
      c.position.y = 1.2 + i * 0.65; g.add(c);
    }
    return mark(g, 'pine', 'scenery');
  },
  bush: () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), MAT.leaf);
    b.position.y = 0.35; g.add(b);
    return mark(g, 'bush', 'scenery');
  },
  fence: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) g.add(box(0.05, 0.9, 0.05, MAT.fence, i * 1.1, 0.45, 0));
    g.add(box(4.5, 0.04, 0.04, MAT.fence, 2.2, 1.0, 0));
    return mark(g, 'fence', 'scenery');
  },
  stonePath: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) g.add(cyl(0.2, 0.22, 0.04, MAT.concrete, i * 0.55, 0.03, 0, 7));
    return mark(g, 'stonePath', 'scenery');
  },
  stump: () => {
    const g = new THREE.Group();
    g.add(cyl(0.28, 0.32, 0.25, MAT.bark, 0, 0.12, 0, 10));
    return mark(g, 'stump', 'scenery');
  },
  sofa: () => {
    const g = new THREE.Group();
    g.add(box(2, 0.34, 0.8, M(0xc8b49a), 0.3, 0.17, 0));
    g.add(box(0.8, 0.34, 1.3, M(0xc8b49a), -0.5, 0.17, 0.25));
    return mark(g, 'sofa', 'furniture');
  },
  table: () => {
    const g = new THREE.Group();
    g.add(box(0.6, 0.04, 0.6, M(0xeae6de), 0, 0.68, 0));
    return mark(g, 'table', 'furniture');
  },
  chair: () => { const g = new THREE.Group(); g.add(box(0.36, 0.04, 0.36, M(0xd6cbb0), 0, 0.38, 0)); return mark(g, 'chair', 'furniture'); },
  fridge: () => { const g = new THREE.Group(); g.add(box(0.5, 1.45, 0.5, M(0xe8ecf0), 0, 0.73, 0)); return mark(g, 'fridge', 'furniture'); },
  lamp: () => { const g = new THREE.Group(); g.add(box(0.05, 0.9, 0.05, M(0x555), 0, 0.45, 0)); g.add(box(0.15, 0.15, 0.15, M(0xffe8c0), 0, 1, 0)); return mark(g, 'lamp', 'furniture'); },
  stove: () => { const g = new THREE.Group(); g.add(box(0.48, 0.68, 0.48, M(0x2a2a2a), 0, 0.34, 0)); g.add(cyl(0.04, 0.04, 1.1, M(0x999), 0, 1.2, 0)); return mark(g, 'stove', 'furniture'); },
  shower: () => {
    const g = new THREE.Group();
    const gl = M(0x98cfc0, { op: 0.28, side: THREE.DoubleSide });
    g.add(box(0.04, 1.9, 0.78, gl, -0.35, 0.95, 0));
    g.add(box(0.7, 1.9, 0.04, gl, 0, 0.95, 0.35));
    return mark(g, 'shower', 'furniture');
  },
  lavaLong: () => {
    const g = new THREE.Group();
    g.add(box(0.5, 0.34, LEILI_W - 0.3, MAT.wood, 0, 0.17, 0));
    g.add(box(0.5, 0.32, LEILI_W - 0.3, MAT.woodD, 0, 0.52, 0));
    return mark(g, 'lavaLong', 'furniture');
  },
  lavaShort: () => {
    const g = new THREE.Group();
    g.add(box(1.1, 0.34, 0.5, MAT.wood, 0, 0.17, 0));
    g.add(box(1.1, 0.32, 0.5, MAT.woodD, 0, 0.52, 0));
    return mark(g, 'lavaShort', 'furniture');
  },
};

function layerFor(kind) {
  if (kind === 'scenery') return layers.scenery;
  return layers.furniture;
}

function addAsset(type, x, z, ry = 0, s = 1) {
  const fn = ASSETS[type];
  if (!fn) return null;
  const o = fn();
  const y = o.userData.kind === 'scenery' ? 0 : FLOOR_Y;
  o.position.set(x, y, z);
  o.rotation.y = ry;
  o.scale.setScalar(s);
  layerFor(o.userData.kind).add(o);
  return o;
}

function allEditable() {
  const list = [
    ...layers.scenery.children,
    ...layers.furniture.children,
    ...layers.building.children,
  ].filter(o => o.userData.movable);
  return list;
}

function clearEditable() {
  deselect();
  [layers.scenery, layers.furniture].forEach(layer => {
    [...layer.children].forEach(c => { if (c.userData.movable) layer.remove(c); });
  });
  walls = [];
  rooms = [];
  wallMeshes.forEach(m => layers.building.remove(m));
  wallMeshes.clear();
  roomSprites.forEach(s => layers.building.remove(s));
  roomSprites.clear();
  while (layers.dims.children.length) layers.dims.remove(layers.dims.children[0]);
}

// Template: sauna outline as walls
function placeTemplate() {
  clearEditable();
  // Outer rectangle walls
  const h = H, t = 0.12;
  const outline = [
    { x1: 0, z1: 0, x2: L, z2: 0 },
    { x1: L, z1: 0, x2: L, z2: W },
    { x1: L, z1: W, x2: 0, z2: W },
    { x1: 0, z1: W, x2: 0, z2: 0 },
  ];
  outline.forEach(s => {
    walls.push({ id: uid(), ...s, h, t, mat: 'wood', openings: [] });
  });
  // inner walls
  walls.push({
    id: uid(), x1: FRONT_D, z1: 0, x2: FRONT_D, z2: W, h, t, mat: 'plaster',
    openings: [
      { type: 'door', along: PESU_W * 0.5, width: 0.72, height: 1.95 },
    ],
  });
  walls.push({
    id: uid(), x1: FRONT_D, z1: PESU_W, x2: L, z2: PESU_W, h, t, mat: 'plaster',
    openings: [
      { type: 'door', along: BACK_D * 0.35, width: 0.7, height: 1.95 },
    ],
  });
  // front door opening on wall 0–0 (first wall is z=0, need door on x=0 wall)
  // wall index 3 is x=0 from W to 0 – add door at mid
  const frontWall = walls[3];
  frontWall.openings.push({ type: 'door', along: W / 2, width: 0.9, height: 2.05 });
  // windows
  walls[0].openings.push({ type: 'window', along: L * 0.35, width: 1.1, height: 1.2, sill: 0.85 });
  walls[1].openings.push({ type: 'window', along: W * 0.45, width: 1.1, height: 1.2, sill: 0.85 });

  rebuildAllWalls();

  rooms = [
    { id: uid(), name: 'Puhkeruum 10,9 m²', x: FRONT_D / 2, z: W / 2 },
    { id: uid(), name: 'Pesu 2,11 m²', x: FRONT_D + BACK_D / 2, z: PESU_W / 2 },
    { id: uid(), name: 'Leili 5,84 m²', x: FRONT_D + BACK_D / 2, z: PESU_W + LEILI_W / 2 },
  ];
  rebuildRooms();

  addAsset('saunaPad', L / 2, W / 2);
  addAsset('houseMain', L + 9.5, W / 2 - 1);
  addAsset('houseNeigh', -9, W / 2);
  addAsset('road', L / 2 + 2, -12);
  addAsset('pine', L / 2 + 3, W + 9, 0, 1.8);
  addAsset('pine', -5, W + 7, 0, 1.4);
  addAsset('sofa', 1.4, 0.8);
  addAsset('table', 2.3, 1.9);
  addAsset('stove', 4.4, 3.3);
  addAsset('lavaLong', 4.55, 2.4);
  addAsset('lavaShort', 3.85, 1.3);
  addAsset('shower', 4.4, 0.45);

  pushHist('Mall');
  refreshList();
  setStatus('Mall: saunakrunt + seinad + ruumid');
}

// History
const history = [];
let cloudProjectId = null;

function snap() {
  return {
    walls: JSON.parse(JSON.stringify(walls)),
    rooms: JSON.parse(JSON.stringify(rooms)),
    objects: allEditable().filter(o => o.userData.kind !== 'wall' && o.userData.kind !== 'room').map(o => ({
      type: o.userData.type, uid: o.userData.uid, kind: o.userData.kind,
      x: o.position.x, y: o.position.y, z: o.position.z, ry: o.rotation.y, s: o.scale.x,
    })),
  };
}
function pushHist(label) {
  history.push(snap());
  if (history.length > 35) history.shift();
}
function restore(s) {
  if (!s) return;
  clearEditable();
  walls = s.walls || [];
  rooms = s.rooms || [];
  rebuildAllWalls();
  rebuildRooms();
  (s.objects || []).forEach(x => {
    const o = addAsset(x.type, x.x, x.z, x.ry, x.s || 1);
    if (o) { o.userData.uid = x.uid; o.position.y = x.y; }
  });
  deselect(); refreshList(); refreshQuote();
}
function undo() {
  if (history.length < 2) return;
  history.pop();
  restore(history[history.length - 1]);
  setStatus('Undo');
}

function payload() {
  return {
    app: APP.name, version: APP.version,
    name: document.getElementById('project-name').value || 'Projekt',
    ...snap(),
    savedAt: new Date().toISOString(),
  };
}
function apply(data) {
  if (data.name) document.getElementById('project-name').value = data.name;
  restore({ walls: data.walls || [], rooms: data.rooms || [], objects: data.objects || data.layout || [] });
  history.length = 0; pushHist();
}

// Selection
let selected = null;
function select(o) {
  deselect();
  selected = o;
  if (o.userData.kind !== 'wall' && o.userData.kind !== 'room') {
    transform.attach(o);
  } else {
    transform.detach();
  }
  document.getElementById('btn-del').disabled = false;
  document.getElementById('props-empty').classList.add('hidden');
  document.getElementById('props-form').classList.remove('hidden');
  const isWall = o.userData.kind === 'wall';
  const isRoom = o.userData.kind === 'room';
  document.getElementById('props-wall').classList.toggle('hidden', !isWall);
  document.getElementById('props-mat').classList.toggle('hidden', !isWall);
  syncProps();
  refreshList();
  setStatus((o.userData.type || 'objekt') + ' valitud');
}
function deselect() {
  if (selected) transform.detach();
  selected = null;
  document.getElementById('btn-del').disabled = true;
  document.getElementById('props-empty').classList.remove('hidden');
  document.getElementById('props-form').classList.add('hidden');
  refreshList();
}
function clampSel() {
  if (!selected || selected.userData.kind === 'wall') return;
  selected.position.x = THREE.MathUtils.clamp(selected.position.x, -25, 35);
  selected.position.z = THREE.MathUtils.clamp(selected.position.z, -25, 30);
  selected.position.y = Math.max(0, selected.position.y);
}
function syncProps() {
  if (!selected) return;
  document.getElementById('p-type').value = selected.userData.type;
  const nameEl = document.getElementById('p-name');
  if (selected.userData.kind === 'room') {
    const r = rooms.find(x => x.id === selected.userData.roomId);
    nameEl.value = r?.name || '';
  } else nameEl.value = selected.userData.name || '';
  if (selected.userData.kind === 'wall') {
    const w = walls.find(x => x.id === selected.userData.wallId);
    if (w) {
      document.getElementById('p-len').value = wallLength(w).toFixed(2);
      document.getElementById('p-wh').value = w.h || H;
      document.getElementById('p-wt').value = w.t || 0.12;
      document.getElementById('p-mat').value = w.mat || 'wood';
      document.getElementById('p-x').value = ((w.x1 + w.x2) / 2).toFixed(2);
      document.getElementById('p-z').value = ((w.z1 + w.z2) / 2).toFixed(2);
      document.getElementById('p-y').value = FLOOR_Y.toFixed(2);
      document.getElementById('p-ry').value = 0;
      document.getElementById('p-s').value = 1;
    }
  } else {
    document.getElementById('p-x').value = selected.position.x.toFixed(2);
    document.getElementById('p-y').value = selected.position.y.toFixed(2);
    document.getElementById('p-z').value = selected.position.z.toFixed(2);
    document.getElementById('p-ry').value = Math.round(THREE.MathUtils.radToDeg(selected.rotation.y));
    document.getElementById('p-s').value = selected.scale.x.toFixed(2);
  }
}
function applyProps() {
  if (!selected) return;
  if (selected.userData.kind === 'wall') {
    const w = walls.find(x => x.id === selected.userData.wallId);
    if (!w) return;
    w.h = +document.getElementById('p-wh').value || H;
    w.t = +document.getElementById('p-wt').value || 0.12;
    w.mat = document.getElementById('p-mat').value || 'wood';
    rebuildWallMesh(w);
    rebuildDims();
    pushHist();
    refreshQuote();
    select(wallMeshes.get(w.id));
    return;
  }
  if (selected.userData.kind === 'room') {
    const r = rooms.find(x => x.id === selected.userData.roomId);
    if (r) {
      r.name = document.getElementById('p-name').value || 'Ruum';
      rebuildRooms();
      const sp = roomSprites.get(r.id);
      if (sp) select(sp);
    }
    pushHist();
    return;
  }
  selected.position.set(
    +document.getElementById('p-x').value || 0,
    +document.getElementById('p-y').value || 0,
    +document.getElementById('p-z').value || 0
  );
  selected.rotation.y = THREE.MathUtils.degToRad(+document.getElementById('p-ry').value || 0);
  selected.scale.setScalar(Math.max(0.1, +document.getElementById('p-s').value || 1));
  clampSel(); pushHist();
}
['p-x', 'p-y', 'p-z', 'p-ry', 'p-s', 'p-wh', 'p-wt', 'p-mat', 'p-name'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', applyProps);
});

function setStatus(t) { document.getElementById('status').textContent = t; }
function setDrawHint(t) {
  const el = document.getElementById('draw-hint');
  if (!t) { el.classList.add('hidden'); el.textContent = ''; return; }
  el.classList.remove('hidden'); el.textContent = t;
}

function refreshList() {
  const el = document.getElementById('obj-list');
  const names = {};
  CATALOG.forEach(c => c.items.forEach(i => { names[i.id] = i.name; }));
  names.wall = 'Sein'; names.room = 'Ruum';
  const items = allEditable();
  el.innerHTML = items.map(o => {
    const n = names[o.userData.type] || o.userData.type;
    return `<button type="button" data-uid="${o.userData.uid}" class="${selected === o ? 'active' : ''}">${n}</button>`;
  }).join('') || '<span class="muted">Tühi</span>';
  el.querySelectorAll('[data-uid]').forEach(b => {
    b.onclick = () => {
      const o = allEditable().find(x => x.userData.uid === b.dataset.uid);
      if (o) select(o);
    };
  });
}

function refreshQuote() {
  const el = document.getElementById('quote-box');
  if (!el) return;
  let wallM2 = 0;
  let doors = 0, windows = 0;
  walls.forEach(w => {
    wallM2 += wallLength(w) * (w.h || H);
    (w.openings || []).forEach(o => {
      if (o.type === 'door') doors++;
      else windows++;
    });
  });
  const matCost = wallM2 * PRICES.wallM2;
  const openCost = doors * PRICES.door + windows * PRICES.window;
  let furnCost = 0;
  allEditable().filter(o => o.userData.kind === 'furniture').forEach(o => {
    const item = CATALOG.flatMap(c => c.items).find(i => i.id === o.userData.type);
    if (item?.eur) furnCost += item.eur;
  });
  const sub = matCost + openCost + furnCost;
  const labor = sub * PRICES.laborPct / 100;
  const total = sub + labor;
  el.innerHTML = `
    <div>Seinad: ${wallM2.toFixed(1)} m² · ${matCost.toFixed(0)} €</div>
    <div>Uksed ${doors} / aknad ${windows} · ${openCost.toFixed(0)} €</div>
    <div>Sisustus · ${furnCost.toFixed(0)} €</div>
    <div>Töö ${PRICES.laborPct}% · ${labor.toFixed(0)} €</div>
    <div class="q-total"><strong>~${total.toFixed(0)} €</strong></div>`;
}

// Catalog
const catEl = document.getElementById('catalog-list');
catEl.innerHTML = CATALOG.map(c => `
  <div class="cat-block">
    <div class="cat-title">${c.cat}</div>
    <div class="cat-items">
      ${c.items.map(i => `<button type="button" data-add="${i.id}"><span class="icon">${i.icon}</span>${i.name}</button>`).join('')}
    </div>
  </div>`).join('');
catEl.querySelectorAll('[data-add]').forEach(b => {
  b.onclick = () => {
    drawMode = null;
    document.querySelectorAll('[data-draw]').forEach(x => x.classList.remove('active'));
    setDrawHint('');
    const o = addAsset(b.dataset.add, controls.target.x, controls.target.z);
    if (o) { select(o); pushHist(); refreshList(); refreshQuote(); setStatus('Lisatud: ' + b.dataset.add); }
  };
});

// Draw modes
let drawMode = null; // wall | room | door | window
let wallStart = null;
let previewLine = null;

function setDrawMode(mode) {
  drawMode = mode;
  document.querySelectorAll('[data-draw]').forEach(b => b.classList.toggle('active', b.dataset.draw === mode));
  wallStart = null;
  if (previewLine) { scene.remove(previewLine); previewLine = null; }
  deselect();
  if (mode === 'wall') setDrawHint('Sein: 1. klõps algus, 2. klõps lõpp (2D soovitatud)');
  else if (mode === 'room') setDrawHint('Ruum: klõpsa asukohta, siis muuda nime');
  else if (mode === 'door') setDrawHint('Uks: klõpsa seinal');
  else if (mode === 'window') setDrawHint('Aken: klõpsa seinal');
  else setDrawHint('');
  setStatus(mode ? 'Joonistus: ' + mode : 'Valmis');
}
document.querySelectorAll('[data-draw]').forEach(b => {
  b.onclick = () => setDrawMode(b.dataset.draw === drawMode ? null : b.dataset.draw);
});

function groundPoint(event) {
  const r = canvas.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - r.left) / r.width) * 2 - 1,
    -((event.clientY - r.top) / r.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  ray.ray.intersectPlane(plane, hit);
  if (!hit) return null;
  // snap 0.1
  hit.x = Math.round(hit.x * 10) / 10;
  hit.z = Math.round(hit.z * 10) / 10;
  return hit;
}

function nearestWall(x, z) {
  let best = null, bestD = 0.6;
  walls.forEach(w => {
    const len = wallLength(w);
    if (len < 0.1) return;
    // distance point to segment
    const dx = w.x2 - w.x1, dz = w.z2 - w.z1;
    let t = ((x - w.x1) * dx + (z - w.z1) * dz) / (len * len);
    t = Math.max(0, Math.min(1, t));
    const px = w.x1 + t * dx, pz = w.z1 + t * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < bestD) { bestD = d; best = { wall: w, along: t * len, dist: d }; }
  });
  return best;
}

function onDrawClick(event) {
  if (!drawMode) return false;
  const p = groundPoint(event);
  if (!p) return true;

  if (drawMode === 'wall') {
    if (!wallStart) {
      wallStart = { x: p.x, z: p.z };
      setDrawHint(`Sein: lõpp-punkt (algus ${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
    } else {
      const w = {
        id: uid(),
        x1: wallStart.x, z1: wallStart.z,
        x2: p.x, z2: p.z,
        h: H, t: 0.12, mat: 'wood', openings: [],
      };
      if (wallLength(w) >= 0.3) {
        walls.push(w);
        rebuildWallMesh(w);
        rebuildDims();
        pushHist();
        refreshList();
        refreshQuote();
        setStatus('Sein ' + wallLength(w).toFixed(2) + ' m');
      }
      wallStart = null;
      if (previewLine) { scene.remove(previewLine); previewLine = null; }
      setDrawHint('Sein: 1. klõps algus, 2. klõps lõpp');
    }
    return true;
  }

  if (drawMode === 'room') {
    const r = { id: uid(), name: 'Ruum', x: p.x, z: p.z };
    rooms.push(r);
    rebuildRooms();
    pushHist();
    const sp = roomSprites.get(r.id);
    if (sp) select(sp);
    setStatus('Ruum lisatud – muuda nime');
    return true;
  }

  if (drawMode === 'door' || drawMode === 'window') {
    const hit = nearestWall(p.x, p.z);
    if (!hit) { setStatus('Klõpsa seina lähedale'); return true; }
    const op = {
      type: drawMode,
      along: hit.along,
      width: drawMode === 'door' ? 0.9 : 1.0,
      height: drawMode === 'door' ? 2.05 : 1.2,
      sill: drawMode === 'door' ? 0 : 0.9,
    };
    hit.wall.openings = hit.wall.openings || [];
    hit.wall.openings.push(op);
    rebuildWallMesh(hit.wall);
    rebuildDims();
    pushHist();
    refreshQuote();
    setStatus(drawMode === 'door' ? 'Uks seinal' : 'Aken seinal');
    return true;
  }
  return false;
}

canvas.addEventListener('pointermove', e => {
  if (drawMode !== 'wall' || !wallStart) return;
  const p = groundPoint(e);
  if (!p) return;
  if (previewLine) scene.remove(previewLine);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(wallStart.x, 0.05, wallStart.z),
    new THREE.Vector3(p.x, 0.05, p.z),
  ]);
  previewLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x3d8bfd }));
  scene.add(previewLine);
});

// Tools
document.querySelectorAll('[data-tool]').forEach(b => {
  b.onclick = () => {
    setDrawMode(null);
    document.querySelectorAll('[data-tool]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const tool = b.dataset.tool;
    if (tool !== 'select') transform.setMode(tool === 'move' ? 'translate' : tool);
  };
});
document.getElementById('btn-del').onclick = () => {
  if (!selected) return;
  if (selected.userData.kind === 'wall') {
    walls = walls.filter(w => w.id !== selected.userData.wallId);
    const m = wallMeshes.get(selected.userData.wallId);
    if (m) layers.building.remove(m);
    wallMeshes.delete(selected.userData.wallId);
    deselect(); rebuildDims(); pushHist(); refreshList(); refreshQuote();
    setStatus('Sein kustutatud');
    return;
  }
  if (selected.userData.kind === 'room') {
    rooms = rooms.filter(r => r.id !== selected.userData.roomId);
    rebuildRooms(); deselect(); pushHist(); setStatus('Ruum kustutatud');
    return;
  }
  layerFor(selected.userData.kind).remove(selected);
  deselect(); pushHist(); refreshList(); refreshQuote(); setStatus('Kustutatud');
};
document.getElementById('btn-dup').onclick = () => {
  if (!selected || selected.userData.kind === 'wall' || selected.userData.kind === 'room') return;
  const o = addAsset(selected.userData.type, selected.position.x + 0.4, selected.position.z + 0.4, selected.rotation.y, selected.scale.x);
  if (o) { o.position.y = selected.position.y; select(o); pushHist(); refreshList(); }
};
document.getElementById('btn-undo').onclick = undo;

document.getElementById('btn-save').onclick = () => {
  const data = payload();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = (data.name || 'projekt').replace(/\s+/g, '-').toLowerCase() + '-kodudisain.json';
  a.click();
  setStatus('JSON salvestatud');
};
document.getElementById('btn-open').onclick = () => document.getElementById('file-open').click();
document.getElementById('file-open').onchange = e => {
  const f = e.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { apply(JSON.parse(r.result)); setStatus('Avatud: ' + f.name); } catch { setStatus('Vigane JSON'); } };
  r.readAsText(f); e.target.value = '';
};
document.getElementById('btn-new').onclick = () => {
  if (confirm('Tühjenda projekt?')) {
    clearEditable(); history.length = 0; pushHist(); refreshList(); refreshQuote(); setStatus('Uus projekt');
  }
};
document.getElementById('btn-template-sauna').onclick = placeTemplate;
document.getElementById('btn-quote').onclick = () => {
  refreshQuote();
  const html = `<!DOCTYPE html><html lang="et"><head><meta charset="utf-8"><title>Pakkumine</title>
  <style>body{font-family:system-ui;max-width:640px;margin:2rem auto;padding:1rem} h1{font-size:1.3rem}</style></head>
  <body><h1>Pakkumine – ${document.getElementById('project-name').value}</h1>
  ${document.getElementById('quote-box').innerHTML}
  <p style="color:#666;font-size:0.85rem">Orienteeriv. Prindi PDF: Ctrl+P</p>
  <script>document.querySelector('.q-total')?.scrollIntoView()</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
};

function setViewMode(mode) {
  viewMode = mode;
  document.getElementById('mode-3d').classList.toggle('active', mode === '3d');
  document.getElementById('mode-2d').classList.toggle('active', mode === '2d');
  if (mode === '2d') {
    camera = cameraOrtho;
    controls.object = cameraOrtho;
    controls.enableRotate = false;
    cameraOrtho.position.set(L / 2 + 2, 40, W / 2);
    controls.target.set(L / 2 + 2, 0, W / 2);
  } else {
    camera = cameraPersp;
    controls.object = cameraPersp;
    controls.enableRotate = true;
    cameraPersp.position.set(L / 2 - 3, 12, W / 2 + 10);
    controls.target.set(L / 2 + 2, 0.2, W / 2);
  }
  transform.camera = camera;
  controls.update();
  setStatus(mode === '2d' ? '2D – sobib seinte joonistamiseks' : '3D vaade');
}
document.getElementById('mode-3d').onclick = () => setViewMode('3d');
document.getElementById('mode-2d').onclick = () => setViewMode('2d');
document.getElementById('btn-top').onclick = () => setViewMode('2d');
document.getElementById('btn-iso').onclick = () => { setViewMode('3d'); cameraPersp.position.set(-4, 12, 12); };
document.getElementById('btn-reset-view').onclick = () => setViewMode(viewMode);
document.getElementById('btn-grid').onclick = () => {
  layers.grid.visible = !layers.grid.visible;
  document.getElementById('btn-grid').classList.toggle('active', layers.grid.visible);
};
document.getElementById('btn-dims').onclick = () => {
  layers.dims.visible = !layers.dims.visible;
  document.getElementById('btn-dims').classList.toggle('active', layers.dims.visible);
  rebuildDims();
};

document.querySelectorAll('[data-layer]').forEach(cb => {
  cb.addEventListener('change', () => {
    const k = cb.dataset.layer;
    if (layers[k]) layers[k].visible = cb.checked;
  });
});

const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || transform.dragging) return;
  if (drawMode) {
    onDrawClick(e);
    return;
  }
  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(allEditable(), true);
  if (hits.length) {
    let root = hits[0].object;
    while (root && !root.userData.movable) root = root.parent;
    if (root?.userData.movable) select(root);
  } else if (!e.shiftKey) deselect();
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select')) return;
  const k = e.key.toLowerCase();
  if (k === 'v') { setDrawMode(null); document.querySelector('[data-tool="select"]')?.click(); }
  if (k === 'g') { document.querySelector('[data-tool="move"]')?.click(); transform.setMode('translate'); }
  if (k === 'r') { document.querySelector('[data-tool="rotate"]')?.click(); transform.setMode('rotate'); }
  if (k === 's' && !e.ctrlKey) { document.querySelector('[data-tool="scale"]')?.click(); transform.setMode('scale'); }
  if (k === 'w' && !e.ctrlKey) setDrawMode(drawMode === 'wall' ? null : 'wall');
  if (k === 'delete' || k === 'backspace') document.getElementById('btn-del').click();
  if (k === 'escape') { setDrawMode(null); deselect(); }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); document.getElementById('btn-dup').click(); }
});

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  cameraPersp.aspect = aspect;
  cameraPersp.updateProjectionMatrix();
  const s = 14;
  cameraOrtho.left = -s * aspect; cameraOrtho.right = s * aspect;
  cameraOrtho.top = s; cameraOrtho.bottom = -s;
  cameraOrtho.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

placeTemplate();
resize();
(function loop() {
  requestAnimationFrame(loop);
  resize();
  controls.update();
  renderer.render(scene, camera);
})();

setStatus('KoduDisain ' + APP.phase);



// ========== Konto + pilv ==========
function refreshAuthUI() {
  const logged = isLoggedIn();
  const u = currentUser();
  document.getElementById('btn-login')?.classList.toggle('hidden', logged);
  document.getElementById('btn-logout')?.classList.toggle('hidden', !logged);
  const lab = document.getElementById('user-label');
  if (lab) {
    lab.classList.toggle('hidden', !logged);
    lab.textContent = logged ? (u?.email || u?.name || 'Konto') : '';
  }
}

let authMode = 'login'; // login | register
document.getElementById('btn-login')?.addEventListener('click', () => {
  authMode = 'login';
  document.getElementById('auth-title').textContent = 'Logi sisse';
  document.getElementById('auth-name-wrap')?.classList.add('hidden');
  document.getElementById('auth-submit').textContent = 'Logi sisse';
  document.getElementById('auth-modal')?.classList.remove('hidden');
  document.getElementById('auth-status').textContent = '';
});
document.getElementById('btn-logout')?.addEventListener('click', () => {
  logout();
  cloudProjectId = null;
  refreshAuthUI();
  setStatus('Välja logitud');
});
document.getElementById('auth-close')?.addEventListener('click', () => {
  document.getElementById('auth-modal')?.classList.add('hidden');
});
document.getElementById('auth-toggle')?.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'register' : 'login';
  const reg = authMode === 'register';
  document.getElementById('auth-title').textContent = reg ? 'Loo konto' : 'Logi sisse';
  document.getElementById('auth-name-wrap')?.classList.toggle('hidden', !reg);
  document.getElementById('auth-submit').textContent = reg ? 'Registreeru' : 'Logi sisse';
  document.getElementById('auth-toggle').textContent = reg ? 'Mul on konto' : 'Loo konto';
});
document.getElementById('auth-submit')?.addEventListener('click', async () => {
  const email = document.getElementById('auth-email')?.value?.trim();
  const pass = document.getElementById('auth-pass')?.value || '';
  const name = document.getElementById('auth-name')?.value?.trim() || '';
  const st = document.getElementById('auth-status');
  if (!email || pass.length < 6) {
    st.textContent = 'E-post ja parool (min 6 märki) vajalikud';
    return;
  }
  st.textContent = 'Ootan…';
  try {
    if (authMode === 'register') await register(email, pass, name);
    else await login(email, pass);
    document.getElementById('auth-modal')?.classList.add('hidden');
    refreshAuthUI();
    setStatus('Sisse logitud: ' + email);
  } catch (e) {
    st.textContent = e?.message || String(e);
  }
});

document.getElementById('btn-cloud-save')?.addEventListener('click', async () => {
  if (!isLoggedIn()) {
    document.getElementById('btn-login')?.click();
    setStatus('Logi sisse, et pilve salvestada');
    return;
  }
  try {
    setStatus('Salvestan pilve…');
    const data = payload();
    const rec = await saveProject(data, cloudProjectId);
    cloudProjectId = rec.id;
    setStatus('☁ Salvestatud pilve: ' + (rec.name || rec.id));
  } catch (e) {
    setStatus('Pilve viga: ' + (e?.message || e));
  }
});

async function renderProjectsList() {
  const el = document.getElementById('projects-list');
  if (!el) return;
  if (!isLoggedIn()) {
    el.innerHTML = '<p class="muted">Logi sisse</p>';
    return;
  }
  el.innerHTML = '<p class="muted">Laen…</p>';
  try {
    const items = await listMyProjects();
    if (!items.length) {
      el.innerHTML = '<p class="muted">Pole veel pilves projekte – vajuta ☁ Pilv</p>';
      return;
    }
    el.innerHTML = items.map(r => `
      <div class="proj-item" data-id="${r.id}">
        <span class="name">${r.name || 'Projekt'}</span>
        <button type="button" data-load="${r.id}">Ava</button>
        <button type="button" data-share="${r.id}">Jaga</button>
        <button type="button" data-del="${r.id}" class="danger">✕</button>
        <span class="meta">${r.updated ? new Date(r.updated).toLocaleString('et-EE') : ''} ${r.is_public ? '· avalik' : ''}</span>
      </div>`).join('');
    el.querySelectorAll('[data-load]').forEach(b => {
      b.onclick = async () => {
        try {
          const rec = await loadProject(b.dataset.load);
          cloudProjectId = rec.id;
          apply(rec.data || rec);
          document.getElementById('project-name').value = rec.name || 'Projekt';
          document.getElementById('projects-modal')?.classList.add('hidden');
          setStatus('Avatud pilvest: ' + rec.name);
        } catch (e) { setStatus(String(e.message || e)); }
      };
    });
    el.querySelectorAll('[data-share]').forEach(b => {
      b.onclick = async () => {
        try {
          const rec = await setShare(b.dataset.share, true);
          const url = shareUrl(rec);
          document.getElementById('share-url').textContent = url;
          try { await navigator.clipboard.writeText(url); } catch {}
          setStatus('Jagamislink kopeeritud');
          renderProjectsList();
        } catch (e) { setStatus(String(e.message || e)); }
      };
    });
    el.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('Kustuta pilvest?')) return;
        await deleteProject(b.dataset.del);
        if (cloudProjectId === b.dataset.del) cloudProjectId = null;
        renderProjectsList();
      };
    });
  } catch (e) {
    el.innerHTML = '<p class="muted">Viga: ' + (e.message || e) + '</p>';
  }
}

document.getElementById('btn-my-projects')?.addEventListener('click', () => {
  document.getElementById('projects-modal')?.classList.remove('hidden');
  renderProjectsList();
});
document.getElementById('projects-close')?.addEventListener('click', () => {
  document.getElementById('projects-modal')?.classList.add('hidden');
});

document.getElementById('btn-share')?.addEventListener('click', async () => {
  if (!isLoggedIn()) {
    document.getElementById('btn-login')?.click();
    return;
  }
  try {
    if (!cloudProjectId) {
      const rec = await saveProject(payload(), null);
      cloudProjectId = rec.id;
    }
    const rec = await setShare(cloudProjectId, true);
    const url = shareUrl(rec);
    document.getElementById('share-url').textContent = url;
    try { await navigator.clipboard.writeText(url); } catch {}
    setStatus('Jagamislink valmis');
  } catch (e) {
    setStatus('Jagamine: ' + (e.message || e));
  }
});

// Share link on load
(async () => {
  refreshAuthUI();
  onAuthChange(() => refreshAuthUI());
  const ok = await checkHealth();
  if (!ok) setStatus('PocketBase ei vasta – JSON töötab; pilv pärast Dockerit');
  const params = new URLSearchParams(location.search);
  const share = params.get('share');
  if (share) {
    try {
      const rec = await loadByShareToken(share);
      apply(rec.data || rec);
      document.getElementById('project-name').value = rec.name || 'Jagatud';
      setStatus('Avatud jagamislingiga (ainult vaade/koopia)');
    } catch (e) {
      setStatus('Jagamislink: ' + (e.message || e));
    }
  }
})();
