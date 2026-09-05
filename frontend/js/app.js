/**
 * KoduDisain – Professionaalne kodu, aia ja ehituse planeerija
 * 3D / 2D / Plaan / Jalutuskäik (Walkthrough)
 * Täielik arhitektuurne mudeldus, maastikukujundus, katus, ruumid, ehituslik mahutabel (BOM)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import {
  SITE, CATALOG, MATERIALS, PRICES, APP, WALL_PRESETS, OPENING_PRESETS, PLOT_DEFAULTS,
} from './config.js';
import { ASSET_BUILDERS, createMaterial, box, cyl, FURNITURE_FINISHES, applyFurnitureFinish } from './models.js';
import { calculateConstruction, renderSpecificationHtml } from './construction.js';
import {
  getGrassTexture,
  getWoodPlankTexture,
  getParquetTexture,
  getTileTexture,
  getPaverTexture,
} from './textures.js';
import {
  LAYER_MATERIALS,
  WALL_ASSEMBLIES,
  FLOOR_ASSEMBLIES,
  calculateAssemblyPhysics,
  renderAssemblySvg,
  renderAssemblyMiniPreview,
} from './assemblies.js';
import {
  isLoggedIn, currentUser, login, register, logout, onAuthChange, checkHealth,
} from './auth.js';
import {
  listMyProjects, saveProject, loadProject, deleteProject, setShare, loadByShareToken, shareUrl,
} from './cloud.js';
import { ROOM_MODULES, DESIGN_STYLES } from './room-modules.js';
import {
  findNearestWall,
  alignToWall,
  findContainingRoom,
  buildRoomModule,
  analyzeErgonomics,
} from './design-tools.js';

const L = SITE.sauna.L, W = SITE.sauna.W, H = SITE.sauna.H;
const FRONT_D = SITE.sauna.FRONT_D, BACK_D = SITE.sauna.BACK_D;
const PESU_W = SITE.PESU_W, LEILI_W = SITE.LEILI_W;
const FLOOR_Y = SITE.FLOOR_Y;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  logarithmicDepthBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// Pehme taeva ja keskkonnavalguse gradient
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x84bfe6);
scene.fog = new THREE.FogExp2(0xb2d6ee, 0.009);

const cameraPersp = new THREE.PerspectiveCamera(40, 2, 0.2, 200);
cameraPersp.position.set(L / 2 - 3, 16, W / 2 + 13);
const cameraOrtho = new THREE.OrthographicCamera(-16, 16, 16, -16, 0.5, 120);
cameraOrtho.position.set(L / 2 + 2, 45, W / 2);
let camera = cameraPersp;
let viewMode = '3d'; // '3d' | '2d' | 'blueprint' | 'walk'

const controls = new OrbitControls(camera, canvas);
controls.target.set(L / 2 + 2, 0.2, W / 2);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 1.2;
controls.maxDistance = 90;

const transform = new TransformControls(camera, canvas);
transform.setSize(0.75);
transform.setTranslationSnap(0.1);
transform.setRotationSnap(THREE.MathUtils.degToRad(15));
transform.addEventListener('dragging-changed', e => {
  controls.enabled = !e.value && viewMode !== 'walk';
  if (!e.value) { pushHist(); refreshQuote(); }
});
transform.addEventListener('objectChange', () => { syncProps(); clampSel(); });
scene.add(transform);

// Valguslahendus & Päevaajad
const ambientLight = new THREE.AmbientLight(0xfff6eb, 0.58);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xfff0dd, 1.25);
sun.position.set(14, 26, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -32;
sun.shadow.camera.right = sun.shadow.camera.top = 32;
sun.shadow.camera.near = 1.0;
sun.shadow.camera.far = 75;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.025;
scene.add(sun);

const hemiLight = new THREE.HemisphereLight(0xd4e9ff, 0x546e45, 0.52);
scene.add(hemiLight);

// Hubased soojad sisevalgustid ruumide jaoks
const indoorLightsGroup = new THREE.Group();
scene.add(indoorLightsGroup);

const SUN_PRESETS = [
  { name: 'Keskpäev (13:00)', pos: [12, 26, 8], color: 0xfffaed, sky: 0x84bfe6, fog: 0xb2d6ee, hemiSky: 0xd8edff, hemiGround: 0x5a8a40, int: 1.25 },
  { name: 'Õhtu (18:00)', pos: [-18, 14, 14], color: 0xffd29d, sky: 0x6bb5e8, fog: 0xa8cce5, hemiSky: 0xffdfc4, hemiGround: 0x3d5a2d, int: 1.05 },
  { name: 'Kuldne tund (20:30)', pos: [-24, 5, 20], color: 0xff9452, sky: 0x486b99, fog: 0x738ba8, hemiSky: 0xffaa77, hemiGround: 0x22331b, int: 0.9 },
  { name: 'Öö / Hubane valgus (23:00)', pos: [5, -15, 5], color: 0x243342, sky: 0x09141f, fog: 0x0c1a27, hemiSky: 0x162432, hemiGround: 0x0a1014, int: 0.22 },
  { name: 'Hommik (8:00)', pos: [20, 16, -14], color: 0xffe6c4, sky: 0x75bfe8, fog: 0xafd2ec, hemiSky: 0xffeedd, hemiGround: 0x4e7838, int: 1.1 },
];
let currentSunIndex = 0;

function setSunTime(index) {
  currentSunIndex = (index + SUN_PRESETS.length) % SUN_PRESETS.length;
  const p = SUN_PRESETS[currentSunIndex];
  sun.position.set(p.pos[0], p.pos[1], p.pos[2]);
  sun.color.setHex(p.color);
  sun.intensity = p.int;
  hemiLight.color.setHex(p.hemiSky);
  hemiLight.groundColor.setHex(p.hemiGround);
  scene.background.setHex(p.sky);
  scene.fog.color.setHex(p.fog);

  const btnSun = document.getElementById('btn-sun');
  if (btnSun) {
    const isNight = p.name.includes('Öö');
    btnSun.textContent = (isNight ? '🌙 ' : '☀️ ') + p.name.split(' ')[0];
  }
  updateCompassUi();
  setStatus(`Päevaaeg: ${p.name}`);
}

function M(c, o = {}) {
  return createMaterial(c, o);
}

const MAT = {
  grass: M(0x569644, { r: 0.9, map: getGrassTexture() }),
  sand: M(0xe8a040, { r: 0.9, op: 0.5 }),
  floorC: M(0xd2c4a6, { r: 0.35, map: getTileTexture(true) }),
  floorP: M(0x4a8c70, { r: 0.45, map: getTileTexture(false) }),
  floorL: M(0x8a5a2c, { r: 0.6, map: getWoodPlankTexture(false) }),
  wood: M(0xc99a6a, { r: 0.65, map: getWoodPlankTexture(false) }),
  woodD: M(0xb07848, { r: 0.65, map: getWoodPlankTexture(true) }),
  door: M(0x3f3830, { r: 0.6 }),
  alu: M(0x2c3036, { m: 0.75, r: 0.25 }),
  glass: M(0x9bd0ea, { op: 0.32, side: THREE.DoubleSide, r: 0.08, m: 0.1 }),
  house: M(0xd8d0b0, { r: 0.8 }),
  roof: M(0x363c44, { r: 0.45, m: 0.25 }),
  concrete: M(0xb0aca4, { r: 0.75, map: getPaverTexture() }),
};

const layers = {
  plot: new THREE.Group(),
  building: new THREE.Group(),
  roof: new THREE.Group(),
  scenery: new THREE.Group(),
  furniture: new THREE.Group(),
  grid: new THREE.Group(),
  trace: new THREE.Group(),
  dims: new THREE.Group(),
};
Object.values(layers).forEach(g => scene.add(g));

// Krundi maapind (muru)
{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), MAT.grass);
  g.rotation.x = -Math.PI / 2;
  g.position.y = -0.005;
  g.receiveShadow = true;
  layers.scenery.add(g);
}

// Krundi seaded & 4m ehitusala andmemudel
let plotConfig = {
  width: PLOT_DEFAULTS?.width || 25,
  depth: PLOT_DEFAULTS?.depth || 35,
  setback: PLOT_DEFAULTS?.setback || 4.0,
  maxCoverage: PLOT_DEFAULTS?.maxCoverage || 20,
  northAngle: PLOT_DEFAULTS?.northAngle || 0,
};

function plotCenter() {
  return { x: L / 2 + 1, z: W / 2 };
}

function rebuildPlotMesh() {
  while (layers.plot.children.length) layers.plot.remove(layers.plot.children[0]);
  if (!layers.plot.visible) return;

  const { x: cx, z: cz } = plotCenter();
  const w = plotConfig.width;
  const d = plotConfig.depth;
  const halfW = w / 2;
  const halfD = d / 2;
  const yBase = 0.025;

  // 1. Krundi välispiir (roheline kindel joon)
  const outerCorners = [
    new THREE.Vector3(cx - halfW, yBase, cz - halfD),
    new THREE.Vector3(cx + halfW, yBase, cz - halfD),
    new THREE.Vector3(cx + halfW, yBase, cz + halfD),
    new THREE.Vector3(cx - halfW, yBase, cz + halfD),
    new THREE.Vector3(cx - halfW, yBase, cz - halfD),
  ];
  const borderGeo = new THREE.BufferGeometry().setFromPoints(outerCorners);
  const borderLine = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x1f8b4c, linewidth: 2 }));
  borderLine.renderOrder = 3;
  layers.plot.add(borderLine);

  // 2. Piirikivid ja märgised (PK1, PK2, PK3, PK4)
  const pegLabels = ['PK1', 'PK2', 'PK3', 'PK4'];
  const cornerCoords = [
    { x: cx - halfW, z: cz - halfD },
    { x: cx + halfW, z: cz - halfD },
    { x: cx + halfW, z: cz + halfD },
    { x: cx - halfW, z: cz + halfD },
  ];
  cornerCoords.forEach((pt, idx) => {
    // Betoonist piirikivi
    const peg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), MAT.concrete);
    peg.position.set(pt.x, 0.12, pt.z);
    peg.castShadow = true;
    // Messingist tsentritapp
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8), createMaterial(0xd4af37, { m: 0.8, r: 0.2 }));
    pin.position.set(pt.x, 0.27, pt.z);
    layers.plot.add(peg, pin);

    // Tekstisilt
    const c = document.createElement('canvas');
    c.width = 72; c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#17212b';
    ctx.roundRect(2, 2, 68, 28, 5);
    ctx.fill();
    ctx.fillStyle = '#27ae60';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pegLabels[idx], 36, 16);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.position.set(pt.x, 0.48, pt.z);
    sp.scale.set(0.65, 0.28, 1);
    layers.plot.add(sp);
  });

  // 3. 4m Ehituskeeluala / Ehituspiir (oranž kriipsjoon)
  const sb = Math.min(plotConfig.setback, Math.min(halfW - 0.5, halfD - 0.5));
  if (sb > 0) {
    const innerCorners = [
      new THREE.Vector3(cx - halfW + sb, yBase + 0.005, cz - halfD + sb),
      new THREE.Vector3(cx + halfW - sb, yBase + 0.005, cz - halfD + sb),
      new THREE.Vector3(cx + halfW - sb, yBase + 0.005, cz + halfD - sb),
      new THREE.Vector3(cx - halfW + sb, yBase + 0.005, cz + halfD - sb),
      new THREE.Vector3(cx - halfW + sb, yBase + 0.005, cz - halfD + sb),
    ];
    const setbackGeo = new THREE.BufferGeometry().setFromPoints(innerCorners);
    const setbackLine = new THREE.Line(
      setbackGeo,
      new THREE.LineDashedMaterial({ color: 0xe67e22, dashSize: 0.5, gapSize: 0.3, depthTest: false })
    );
    setbackLine.computeLineDistances();
    setbackLine.renderOrder = 4;
    layers.plot.add(setbackLine);

    // Ehituskeeluala silt sisenurgas
    const sc = document.createElement('canvas');
    sc.width = 190; sc.height = 36;
    const sctx = sc.getContext('2d');
    sctx.fillStyle = 'rgba(230, 126, 34, 0.9)';
    sctx.roundRect(2, 2, 186, 32, 6);
    sctx.fill();
    sctx.fillStyle = '#ffffff';
    sctx.font = 'bold 13px system-ui';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText(`4 m ehituspiir`, 95, 18);
    const stex = new THREE.CanvasTexture(sc);
    const ssp = new THREE.Sprite(new THREE.SpriteMaterial({ map: stex, depthTest: false }));
    ssp.position.set(cx - halfW + sb + 1.2, yBase + 0.18, cz - halfD + sb + 0.5);
    ssp.scale.set(1.4, 0.28, 1);
    layers.plot.add(ssp);
  }

  // 4. Krundi mõõtude tähistused (laius ja sügavus)
  const makeDimLabel = (text, x, z) => {
    const c = document.createElement('canvas');
    c.width = 140; c.height = 34;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#1f8b4c';
    ctx.lineWidth = 2;
    ctx.roundRect(2, 2, 136, 30, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#17212b';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 70, 17);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.position.set(x, yBase + 0.22, z);
    sp.scale.set(1.2, 0.3, 1);
    layers.plot.add(sp);
  };
  makeDimLabel(`${w.toFixed(1)} m`, cx, cz - halfD - 0.7);
  makeDimLabel(`${d.toFixed(1)} m`, cx + halfW + 0.7, cz);

  // 5. Põhjasuuna kompassi maapealne graafika
  const compassGrp = new THREE.Group();
  compassGrp.position.set(cx - halfW + 2.5, yBase + 0.01, cz - halfD + 2.5);
  compassGrp.rotation.y = -THREE.MathUtils.degToRad(plotConfig.northAngle);

  // Põhja nool (punane)
  const northArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.4, 4),
    createMaterial(0xe74c3c, { r: 0.3 })
  );
  northArrow.rotation.x = -Math.PI / 2;
  northArrow.position.z = -0.7;
  // Lõuna nool (valge/metall)
  const southArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.4, 4),
    createMaterial(0xdcdde1, { r: 0.3 })
  );
  southArrow.rotation.x = Math.PI / 2;
  southArrow.position.z = 0.7;
  compassGrp.add(northArrow, southArrow);
  layers.plot.add(compassGrp);

  updatePlotCompliance();
}

function updatePlotCompliance() {
  const plotArea = plotConfig.width * plotConfig.depth;
  const calc = calculateConstruction(walls, rooms, allEditable(), roofConfig);
  const fp = calc.buildingFootprint;
  const covPercent = plotArea > 0 ? (fp / plotArea) * 100 : 0;

  const { x: cx, z: cz } = plotCenter();
  const halfW = plotConfig.width / 2;
  const halfD = plotConfig.depth / 2;
  const sb = plotConfig.setback;

  const minAllowedX = cx - halfW + sb;
  const maxAllowedX = cx + halfW - sb;
  const minAllowedZ = cz - halfD + sb;
  const maxAllowedZ = cz + halfD - sb;

  let setbackViolated = false;
  let outsideCount = 0;
  walls.forEach(w => {
    [ { x: w.x1, z: w.z1 }, { x: w.x2, z: w.z2 } ].forEach(pt => {
      if (pt.x < minAllowedX - 0.05 || pt.x > maxAllowedX + 0.05 ||
          pt.z < minAllowedZ - 0.05 || pt.z > maxAllowedZ + 0.05) {
        setbackViolated = true;
        outsideCount++;
      }
    });
  });

  const covViolated = covPercent > plotConfig.maxCoverage;

  const sumTag = document.getElementById('plot-summary-tag');
  if (sumTag) sumTag.textContent = `${plotConfig.width}×${plotConfig.depth} m · ${plotArea} m²`;

  const badge = document.getElementById('plot-compliance-card');
  const title = document.getElementById('plot-compliance-title');
  const desc = document.getElementById('plot-compliance-desc');

  if (badge && title && desc) {
    if (!walls.length) {
      badge.className = 'compliance-badge ok';
      title.textContent = 'Krunt valmis ehituseks';
      desc.textContent = `Krundi suurus: ${plotArea} m² · 4 m ehitusjoone sisse lubatud kuni ${(plotArea * plotConfig.maxCoverage / 100).toFixed(0)} m² ehitusalust pinda.`;
    } else if (setbackViolated) {
      badge.className = 'compliance-badge warn';
      title.textContent = '⚠️ 4 m ehituskeeluala rikkumine';
      desc.textContent = `Tähelepanu: Osa hoonest ulatub krundi 4 m ehituskeelualasse (${outsideCount} seinaotsa väljaspool lubatud ehitusala).`;
    } else if (covViolated) {
      badge.className = 'compliance-badge warn';
      title.textContent = '⚠️ Max täisehitus ületatud';
      desc.textContent = `Ehitusalune pind ${fp} m² moodustab ${covPercent.toFixed(1)}% krundist (lubatud kuni ${plotConfig.maxCoverage}%).`;
    } else {
      badge.className = 'compliance-badge ok';
      title.textContent = '✓ Ehitusõigus täidetud';
      desc.textContent = `Ehitusalune pind ${fp} m² (${covPercent.toFixed(1)}% krundist / max ${plotConfig.maxCoverage}%). Hoone asub lubatud 4 m ehitusalas.`;
    }
  }
}

function updateCompassUi() {
  const needle = document.getElementById('compass-needle');
  if (needle) needle.style.transform = `rotate(${plotConfig.northAngle}deg)`;

  const dirs = ['P', 'KI', 'I', 'KAGU', 'L', 'EDEL', 'LÄÄS', 'LOE'];
  const dirIdx = Math.round(plotConfig.northAngle / 45) % 8;
  const headingEl = document.getElementById('compass-heading');
  if (headingEl) headingEl.textContent = `${plotConfig.northAngle}° ${dirs[dirIdx]}`;

  const northVal = document.getElementById('plot-north-val');
  if (northVal) northVal.textContent = `${plotConfig.northAngle}° (${dirs[dirIdx]})`;
  const northRange = document.getElementById('plot-north');
  if (northRange) northRange.value = plotConfig.northAngle;

  // Päikese asend kompassi kettal
  const sunIcon = document.getElementById('compass-sun-icon');
  const sunText = document.getElementById('compass-sun-text');
  const p = SUN_PRESETS[currentSunIndex];
  if (sunIcon && p) {
    const sunAngle = Math.atan2(p.pos[0], -p.pos[2]) - THREE.MathUtils.degToRad(plotConfig.northAngle);
    const r = 12;
    const sx = Math.sin(sunAngle) * r;
    const sy = -Math.cos(sunAngle) * r;
    sunIcon.style.transform = `translate(${sx}px, ${sy}px)`;
    if (sunText) sunText.textContent = p.name.split(' ')[0];
  }
}

// Ruudustik
const gridHelper = new THREE.GridHelper(50, 100, 0x8899aa, 0x3a4550);
gridHelper.position.set(L / 2 + 2, 0.01, W / 2);
layers.grid.add(gridHelper);

// ---- Seinte ja ruumide andmemudel ----
let walls = []; // { id, x1, z1, x2, z2, h, t, mat, openings: [] }
let rooms = []; // { id, name, x, z, area, floorMat }
let measurements = []; // { id, x1, z1, x2, z2 }
let traceMeta = null;
let traceMesh = null;
const wallMeshes = new Map();
const planSymbols = new THREE.Group();
layers.building.add(planSymbols);
const handleGroup = new THREE.Group();
scene.add(handleGroup);
let dragHandle = null;
const SNAP_EPS = 0.22;

// Katuse andmemudel
let roofConfig = {
  type: 'gable', // 'gable' | 'shed' | 'flat' | 'none'
  pitch: 25,
  overhang: 0.4,
  material: 'roof_dark',
  visible: true,
};
const roofGroup = new THREE.Group();
layers.roof.add(roofGroup);

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function wallLength(w) {
  return Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
}

function matColor(key) {
  return MATERIALS[key]?.color ?? 0xc4a574;
}

const layerMaterialCache = new Map();
function getLayerThreeMaterial(matId) {
  if (layerMaterialCache.has(matId)) return layerMaterialCache.get(matId);
  const def = LAYER_MATERIALS[matId] || { color: '#e2e8f0', roughness: 0.8, metalness: 0.05 };
  let map = null;
  if (matId === 'wood_cladding' || matId === 'timber_batten') {
    map = getWoodPlankTexture(false);
  } else if (matId === 'parquet_board') {
    map = getParquetTexture();
  } else if (matId === 'ceramic_tile') {
    map = getTileTexture(false);
  } else if (matId === 'concrete_paver') {
    map = getPaverTexture();
  }
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color),
    roughness: def.roughness ?? 0.75,
    metalness: def.metalness ?? 0.05,
    map,
  });
  layerMaterialCache.set(matId, mat);
  return mat;
}

// Seina 3D võre taastamine koos konstruktsioonikihtide ja avadega (uksed, aknad)
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
  const angle = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);

  // Konstruktsiooni kihid ja paksus
  const asmKey = w.assemblyKey || ((w.t || 0.15) >= 0.22 ? 'timber_ext_250' : 'timber_int_light');
  const asm = w.assembly || WALL_ASSEMBLIES[asmKey] || WALL_ASSEMBLIES.timber_ext_250;
  const physics = calculateAssemblyPhysics(asm, false);
  const t = w.t || physics.totalM || 0.15;

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

  // 1. Seinasektsioonide kihiline ehitus
  segments.forEach(seg => {
    const segLen = seg.b - seg.a;
    if (segLen < 0.02) return;
    const cx = w.x1 + Math.cos(angle) * (seg.a + segLen / 2);
    const cz = w.z1 + Math.sin(angle) * (seg.a + segLen / 2);

    let cumThick = 0;
    const scaleRatio = t / (physics.totalM || t);
    asm.layers.forEach(l => {
      const layerThick = (l.thickMm / 1000) * scaleRatio;
      if (layerThick < 0.002) return;
      const lMat = getLayerThreeMaterial(l.matId);
      const localOffset = -t / 2 + cumThick + layerThick / 2;
      cumThick += layerThick;

      const nx = -Math.sin(angle) * localOffset;
      const nz = Math.cos(angle) * localOffset;

      const mesh = box(segLen, h, layerThick, lMat, 0, h / 2, 0);
      mesh.position.set(cx + nx, FLOOR_Y + h / 2, cz + nz);
      mesh.rotation.y = -angle;
      g.add(mesh);
    });
  });

  // 2. Avatäited (uksed, aknad) ja avade ümbrus
  opens.forEach(op => {
    const ox = w.x1 + Math.cos(angle) * op.along;
    const oz = w.z1 + Math.sin(angle) * op.along;
    const oh = op.height || (op.type === 'door' ? 2.1 : 1.3);
    const sill = op.type === 'door' ? 0 : (op.sill ?? 0.9);

    if (op.type === 'door') {
      const d = box(0.04, oh - 0.04, op.width - 0.04, MAT.door, 0, FLOOR_Y + oh / 2, 0);
      d.position.set(ox, FLOOR_Y + oh / 2, oz);
      d.rotation.y = -angle;
      g.add(d);
      // ukselink
      const handle = box(0.08, 0.03, 0.02, MAT.alu, 0, FLOOR_Y + 1.0, op.width * 0.35);
      handle.position.set(ox, FLOOR_Y + 1.0, oz);
      handle.rotation.y = -angle;
      g.add(handle);
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

    // Seinaosa akna sillusel (akna all)
    if (sill > 0.04) {
      let cumBottomThick = 0;
      const scaleRatio = t / (physics.totalM || t);
      asm.layers.forEach(l => {
        const layerThick = (l.thickMm / 1000) * scaleRatio;
        if (layerThick < 0.002) return;
        const lMat = getLayerThreeMaterial(l.matId);
        const localOffset = -t / 2 + cumBottomThick + layerThick / 2;
        cumBottomThick += layerThick;

        const nx = -Math.sin(angle) * localOffset;
        const nz = Math.cos(angle) * localOffset;

        const btm = box(op.width + 0.02, sill, layerThick, lMat, 0, sill / 2, 0);
        btm.position.set(ox + nx, FLOOR_Y + sill / 2, oz + nz);
        btm.rotation.y = -angle;
        g.add(btm);
      });
    }

    // Seinaosa ava kohal (sillis)
    const topH = h - (sill + oh);
    if (topH > 0.04) {
      let cumTopThick = 0;
      const scaleRatio = t / (physics.totalM || t);
      asm.layers.forEach(l => {
        const layerThick = (l.thickMm / 1000) * scaleRatio;
        if (layerThick < 0.002) return;
        const lMat = getLayerThreeMaterial(l.matId);
        const localOffset = -t / 2 + cumTopThick + layerThick / 2;
        cumTopThick += layerThick;

        const nx = -Math.sin(angle) * localOffset;
        const nz = Math.cos(angle) * localOffset;

        const top = box(op.width + 0.02, topH, layerThick, lMat, 0, topH / 2, 0);
        top.position.set(ox + nx, FLOOR_Y + sill + oh + topH / 2, oz + nz);
        top.rotation.y = -angle;
        g.add(top);
      });
    }
  });

  g.traverse(c => {
    if (c.isMesh) {
      c.userData.root = g;
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  layers.building.add(g);
  wallMeshes.set(w.id, g);
  rebuildPlanSymbols();
  return g;
}

function rebuildAllWalls() {
  walls.forEach(w => rebuildWallMesh(w));
  rebuildDims();
  rebuildPlanSymbols();
  rebuildRooms();
  rebuildRoof();
  refreshQuote();
}

// Katuse 3D ehitamine hoone seinte peale
function rebuildRoof() {
  while (roofGroup.children.length) roofGroup.remove(roofGroup.children[0]);
  if (!walls.length || roofConfig.type === 'none') return;

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxH = 0;
  walls.forEach(w => {
    minX = Math.min(minX, w.x1, w.x2);
    maxX = Math.max(maxX, w.x1, w.x2);
    minZ = Math.min(minZ, w.z1, w.z2);
    maxZ = Math.max(maxZ, w.z1, w.z2);
    maxH = Math.max(maxH, w.h || H);
  });

  const oh = roofConfig.overhang || 0.45;
  const bW = (maxX - minX) + oh * 2;
  const bD = (maxZ - minZ) + oh * 2;
  const midX = (minX + maxX) / 2;
  const midZ = (minZ + maxZ) / 2;
  const baseY = FLOOR_Y + maxH;

  const matColorCode = MATERIALS[roofConfig.material]?.color ?? 0x2e353d;
  const roofMat = M(matColorCode, { r: 0.42, m: 0.35 });
  const trimMat = M(0x1a1e22, { r: 0.38, m: 0.25 });
  const ceilingMat = M(0xede8df, { r: 0.85 });
  const wallMatKey = walls[0]?.mat || 'wood';
  const wallMatCode = MATERIALS[wallMatKey]?.color ?? 0xc99a6a;
  const gableWallMat = M(wallMatCode, { r: 0.68 });

  // 1. Laeplaat hoone kohale (veidi sissepoole nihutatud, et vältida Z-fightingut seina ülaservaga)
  const ceiling = box((maxX - minX) - 0.04, 0.04, (maxZ - minZ) - 0.04, ceilingMat, midX, baseY - 0.02, midZ);
  ceiling.receiveShadow = true;
  roofGroup.add(ceiling);

  if (roofConfig.type === 'gable') {
    // Viilkatus: harjajoon piki pikemat hoone mõõdet
    const alongX = bW >= bD;
    const span = alongX ? bD : bW;
    const len = alongX ? bW : bD;
    const pitchRad = ((roofConfig.pitch || 24) * Math.PI) / 180;
    const peakH = (span / 2) * Math.tan(pitchRad);
    const slopeLen = (span / 2) / Math.cos(pitchRad);
    const slopeThick = 0.09;

    if (alongX) {
      // Hari piki X (z = midZ, kõrgus baseY + peakH)
      // Kalle 1 (Lõunapoolne, z < midZ): tõuseb z suunas harjani -> rotX = -pitchRad
      const slope1 = box(len, slopeThick, slopeLen, roofMat);
      slope1.rotation.x = -pitchRad;
      slope1.position.set(midX, baseY + peakH / 2, midZ - span / 4);
      slope1.castShadow = true;
      slope1.receiveShadow = true;

      // Kalle 2 (Põhjapoolne, z > midZ): langeb z suunas räästani -> rotX = +pitchRad
      const slope2 = box(len, slopeThick, slopeLen, roofMat);
      slope2.rotation.x = pitchRad;
      slope2.position.set(midX, baseY + peakH / 2, midZ + span / 4);
      slope2.castShadow = true;
      slope2.receiveShadow = true;

      // Harjaplekk / Harjakivi
      const ridge = box(len + 0.08, 0.08, 0.22, trimMat, midX, baseY + peakH + 0.03, midZ);
      ridge.castShadow = true;

      // Räästalauad / Tuulekastid (fascia boards) räästastel
      const fascia1 = box(len + 0.04, 0.14, 0.035, trimMat, midX, baseY + 0.02, midZ - span / 2);
      const fascia2 = box(len + 0.04, 0.14, 0.035, trimMat, midX, baseY + 0.02, midZ + span / 2);

      // Otsaviilud (Gable end wall triangles) - sulgevad hoone otsad arhitektuurselt!
      const gableSpan = maxZ - minZ;
      const gablePeakH = (gableSpan / 2) * Math.tan(pitchRad);
      [minX, maxX].forEach(gx => {
        const shape = new THREE.Shape();
        shape.moveTo(-gableSpan / 2, 0);
        shape.lineTo(gableSpan / 2, 0);
        shape.lineTo(0, gablePeakH);
        shape.closePath();
        const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
        const gableMesh = new THREE.Mesh(extrudeGeo, gableWallMat);
        gableMesh.rotation.y = Math.PI / 2;
        gableMesh.position.set(gx + (gx === minX ? 0.06 : -0.06), baseY, midZ);
        gableMesh.castShadow = true;
        gableMesh.receiveShadow = true;
        roofGroup.add(gableMesh);
      });

      roofGroup.add(slope1, slope2, ridge, fascia1, fascia2);
    } else {
      // Hari piki Z (x = midX, kõrgus baseY + peakH)
      // Kalle 1 (Läänepoolne, x < midX): tõuseb x suunas harjani -> rotZ = +pitchRad
      const slope1 = box(slopeLen, slopeThick, len, roofMat);
      slope1.rotation.z = pitchRad;
      slope1.position.set(midX - span / 4, baseY + peakH / 2, midZ);
      slope1.castShadow = true;
      slope1.receiveShadow = true;

      // Kalle 2 (Idapoolne, x > midX): langeb x suunas räästani -> rotZ = -pitchRad
      const slope2 = box(slopeLen, slopeThick, len, roofMat);
      slope2.rotation.z = -pitchRad;
      slope2.position.set(midX + span / 4, baseY + peakH / 2, midZ);
      slope2.castShadow = true;
      slope2.receiveShadow = true;

      // Harjaplekk
      const ridge = box(0.22, 0.08, len + 0.08, trimMat, midX, baseY + peakH + 0.03, midZ);
      ridge.castShadow = true;

      // Räästalauad
      const fascia1 = box(0.035, 0.14, len + 0.04, trimMat, midX - span / 2, baseY + 0.02, midZ);
      const fascia2 = box(0.035, 0.14, len + 0.04, trimMat, midX + span / 2, baseY + 0.02, midZ);

      // Otsaviilud Z otstes
      const gableSpan = maxX - minX;
      const gablePeakH = (gableSpan / 2) * Math.tan(pitchRad);
      [minZ, maxZ].forEach(gz => {
        const shape = new THREE.Shape();
        shape.moveTo(-gableSpan / 2, 0);
        shape.lineTo(gableSpan / 2, 0);
        shape.lineTo(0, gablePeakH);
        shape.closePath();
        const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
        const gableMesh = new THREE.Mesh(extrudeGeo, gableWallMat);
        gableMesh.position.set(midX, baseY, gz + (gz === minZ ? 0.06 : -0.06));
        gableMesh.castShadow = true;
        gableMesh.receiveShadow = true;
        roofGroup.add(gableMesh);
      });

      roofGroup.add(slope1, slope2, ridge, fascia1, fascia2);
    }
  } else if (roofConfig.type === 'shed') {
    // Ühepoolne katus
    const pitchRad = ((roofConfig.pitch || 14) * Math.PI) / 180;
    const slopeLen = bD / Math.cos(pitchRad);
    const riseH = bD * Math.tan(pitchRad);
    const slope = box(bW, 0.09, slopeLen, roofMat);
    slope.rotation.x = -pitchRad;
    slope.position.set(midX, baseY + riseH / 2, midZ);
    slope.castShadow = true;
    slope.receiveShadow = true;

    // Küljekilbid / kiilukujulised viilud külgedel
    [minX, maxX].forEach(gx => {
      const shape = new THREE.Shape();
      const sD = maxZ - minZ;
      shape.moveTo(-sD / 2, 0);
      shape.lineTo(sD / 2, 0);
      shape.lineTo(sD / 2, sD * Math.tan(pitchRad));
      shape.closePath();
      const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
      const wedgeMesh = new THREE.Mesh(extrudeGeo, gableWallMat);
      wedgeMesh.rotation.y = Math.PI / 2;
      wedgeMesh.position.set(gx - 0.06, baseY, midZ);
      wedgeMesh.castShadow = true;
      wedgeMesh.receiveShadow = true;
      roofGroup.add(wedgeMesh);
    });

    const fasciaBack = box(bW + 0.04, 0.16, 0.04, trimMat, midX, baseY + riseH, maxZ + oh);
    const fasciaFront = box(bW + 0.04, 0.16, 0.04, trimMat, midX, baseY, minZ - oh);
    roofGroup.add(slope, fasciaBack, fasciaFront);
  } else if (roofConfig.type === 'flat') {
    // Lamekatus koos parapeti ja veeplekiga
    const flat = box(bW, 0.16, bD, roofMat, midX, baseY + 0.06, midZ);
    flat.castShadow = true;
    flat.receiveShadow = true;
    const pThick = 0.10, pH = 0.26;
    const p1 = box(bW, pH, pThick, trimMat, midX, baseY + pH / 2, midZ - bD / 2 + pThick / 2);
    const p2 = box(bW, pH, pThick, trimMat, midX, baseY + pH / 2, midZ + bD / 2 - pThick / 2);
    const p3 = box(pThick, pH, bD, trimMat, midX - bW / 2 + pThick / 2, baseY + pH / 2, midZ);
    const p4 = box(pThick, pH, bD, trimMat, midX + bW / 2 - pThick / 2, baseY + pH / 2, midZ);
    roofGroup.add(flat, p1, p2, p3, p4);
  }
}

// Ruumide 3D põrandad ja 2D sildid
const roomSprites = new Map();
function rebuildRooms() {
  roomSprites.forEach(s => layers.building.remove(s));
  roomSprites.clear();
  while (indoorLightsGroup.children.length) indoorLightsGroup.remove(indoorLightsGroup.children[0]);
  // eemalda vanad põrandaplaadid
  [...layers.building.children].filter(c => c.userData.roomFloor).forEach(c => layers.building.remove(c));

  rooms.forEach(r => {
    // 1. Põranda 3D visuaal
    const floorKey = r.floorMat || 'parquet';
    const matConfig = MATERIALS[floorKey] || MATERIALS.parquet;
    let floorTex = null;
    if (floorKey === 'parquet') floorTex = getParquetTexture();
    else if (floorKey === 'tile_gray' || floorKey === 'tile') floorTex = getTileTexture(false);
    else if (floorKey === 'wood') floorTex = getWoodPlankTexture(false);
    else if (floorKey === 'paver') floorTex = getPaverTexture();
    else if (floorKey === 'grass') floorTex = getGrassTexture();
    const floorMat = M(matConfig.color, { r: matConfig.r ?? 0.55, map: floorTex });
    floorMat.polygonOffset = true;
    floorMat.polygonOffsetFactor = -1;
    floorMat.polygonOffsetUnits = -1;
    const sideLen = Math.max(1.2, Math.sqrt(r.area || 10));
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, sideLen), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(r.x, FLOOR_Y + 0.015, r.z);
    floorMesh.receiveShadow = true;
    floorMesh.userData.roomFloor = true;
    floorMesh.userData.roomId = r.id;
    layers.building.add(floorMesh);

    // 1b. Hubane soe sisevalgustus ruumile (Blender-sarnane pehme interjöörisära)
    const roomLight = new THREE.PointLight(0xffebd2, 0.45, Math.max(4.5, sideLen * 1.4), 2);
    roomLight.position.set(r.x, FLOOR_Y + 2.1, r.z);
    indoorLightsGroup.add(roomLight);

    // 1b. Põranda aluskihtide 3D konstruktsioon (plaat, soojustus, killustik)
    const fAsmKey = r.floorAssemblyKey || (r.floorMat === 'paver' ? 'terrace_paver_ground' : r.floorMat === 'tile_gray' ? 'ground_slab_tile' : 'ground_slab_heated');
    const fAsm = r.floorAssembly || FLOOR_ASSEMBLIES[fAsmKey] || FLOOR_ASSEMBLIES.ground_slab_heated;
    if (fAsm && fAsm.layers) {
      let depthCursor = 0;
      fAsm.layers.forEach(fl => {
        const lThick = fl.thickMm / 1000;
        if (lThick < 0.005) return;
        const flMat = getLayerThreeMaterial(fl.matId);
        const subMesh = box(sideLen - 0.02, lThick, sideLen - 0.02, flMat, 0, 0, 0);
        subMesh.position.set(r.x, FLOOR_Y + 0.015 - depthCursor - lThick / 2, r.z);
        subMesh.userData.roomFloor = true;
        subMesh.userData.roomId = r.id;
        layers.building.add(subMesh);
        depthCursor += lThick;
      });
    }

    // 2. Ruumi tekstisilt
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(23, 33, 43, 0.88)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 9);
    ctx.fill();
    ctx.strokeStyle = '#39a979';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.name || 'Ruum', 128, 32);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.position.set(r.x, FLOOR_Y + 1.4, r.z);
    sp.scale.set(1.7, 0.42, 1);
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
    `<button type="button" data-room="${r.id}"><b>${r.name || 'Ruum'}</b> ${r.area ? `· ${Number(r.area).toFixed(1)} m²` : ''}</button>`
  ).join('') || '<span class="muted">Ruume pole määratud</span>';
  el.querySelectorAll('[data-room]').forEach(b => {
    b.onclick = () => {
      const sp = roomSprites.get(b.dataset.room);
      if (sp) select(sp);
    };
  });
}

// Suletud kontuuride tuvastus seintest
function keyPt(x, z) {
  return `${(Math.round(x * 20) / 20).toFixed(2)},${(Math.round(z * 20) / 20).toFixed(2)}`;
}

function detectRoomsFromWalls(keepNames = true) {
  const oldNames = keepNames ? rooms.map(r => ({ ...r })) : [];
  const nodes = new Map();
  const edges = [];
  walls.forEach(w => {
    if (wallLength(w) < 0.15) return;
    const ka = keyPt(w.x1, w.z1), kb = keyPt(w.x2, w.z2);
    if (!nodes.has(ka)) nodes.set(ka, { x: w.x1, z: w.z1 });
    if (!nodes.has(kb)) nodes.set(kb, { x: w.x2, z: w.z2 });
    const na = nodes.get(ka), nb = nodes.get(kb);
    na.x = (na.x + w.x1) / 2; na.z = (na.z + w.z1) / 2;
    nb.x = (nb.x + w.x2) / 2; nb.z = (nb.z + w.z2) / 2;
    edges.push({ a: ka, b: kb, wallId: w.id });
  });
  const adj = new Map();
  nodes.forEach((_, k) => adj.set(k, []));
  edges.forEach(e => {
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  });

  const cycles = [];
  const cycleKeys = new Set();
  function dfs(start, current, path, visitedEdge) {
    if (path.length > 12) return;
    for (const next of adj.get(current) || []) {
      const ek = [current, next].sort().join('|');
      if (path.length >= 3 && next === start) {
        const cyc = path.slice();
        let minI = 0;
        for (let i = 1; i < cyc.length; i++) if (cyc[i] < cyc[minI]) minI = i;
        const norm = cyc.slice(minI).concat(cyc.slice(0, minI)).join('>');
        if (!cycleKeys.has(norm)) {
          cycleKeys.add(norm);
          cycles.push(cyc);
        }
        continue;
      }
      if (path.includes(next)) continue;
      if (visitedEdge.has(ek) && path.length > 1) continue;
      const ve = new Set(visitedEdge);
      ve.add(ek);
      dfs(start, next, path.concat(next), ve);
    }
  }
  [...nodes.keys()].forEach(start => dfs(start, start, [start], new Set()));

  const polys = [];
  cycles.forEach(cyc => {
    const pts = cyc.map(k => nodes.get(k)).filter(Boolean);
    if (pts.length < 3) return;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].z - pts[j].x * pts[i].z;
    }
    area = Math.abs(area) / 2;
    if (area < 0.8 || area > 500) return;
    let cx = 0, cz = 0;
    pts.forEach(p => { cx += p.x; cz += p.z; });
    cx /= pts.length; cz /= pts.length;
    polys.push({ pts, area, x: cx, z: cz });
  });
  polys.sort((a, b) => a.area - b.area);
  const filtered = [];
  polys.forEach(p => {
    if (filtered.some(f => Math.hypot(f.x - p.x, f.z - p.z) < 0.5 && Math.abs(f.area - p.area) < 0.5)) return;
    filtered.push(p);
  });

  rooms = filtered.map((p, i) => {
    let name = `Ruum ${i + 1}`;
    const old = oldNames.find(o => Math.hypot(o.x - p.x, o.z - p.z) < 1.2);
    if (old?.name && !/^Ruum \d/.test(old.name)) name = old.name.replace(/\s*\d+[.,]\d+\s*m²/, '').trim();
    const areaStr = p.area.toFixed(1).replace('.', ',');
    name = `${name} (${areaStr} m²)`;
    return {
      id: uid(),
      name,
      x: p.x,
      z: p.z,
      area: +p.area.toFixed(2),
      floorMat: old?.floorMat || 'parquet',
    };
  });
  rebuildRooms();
  refreshQuote();
  return rooms;
}

// Mõõtude ja sümbolite joonestamine
function rebuildDims() {
  while (layers.dims.children.length) layers.dims.remove(layers.dims.children[0]);
  if (!layers.dims.visible) return;

  walls.forEach(w => {
    const len = wallLength(w);
    if (len < 0.15) return;
    const mx = (w.x1 + w.x2) / 2, mz = (w.z1 + w.z2) / 2;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(23, 33, 43, 0.85)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#e8a87c';
    ctx.font = 'bold 16px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(len.toFixed(2) + ' m', 64, 22);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.position.set(mx, FLOOR_Y + (w.h || H) + 0.25, mz);
    sp.scale.set(1.0, 0.25, 1);
    layers.dims.add(sp);
  });

  measurements.forEach(m => {
    const len = Math.hypot(m.x2 - m.x1, m.z2 - m.z1);
    if (len < 0.05) return;
    const y = FLOOR_Y + 0.09;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(m.x1, y, m.z1),
        new THREE.Vector3(m.x2, y, m.z2),
      ]),
      new THREE.LineDashedMaterial({ color: 0x176b52, dashSize: 0.14, gapSize: 0.08, depthTest: false })
    );
    line.computeLineDistances();
    line.renderOrder = 8;
    layers.dims.add(line);

    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 42;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#176b52';
    ctx.beginPath();
    ctx.roundRect(2, 2, 156, 38, 9);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(len.toFixed(2) + ' m', 80, 21);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.position.set((m.x1 + m.x2) / 2, y + 0.14, (m.z1 + m.z2) / 2);
    sp.scale.set(1.15, 0.3, 1);
    layers.dims.add(sp);
  });
}

function rebuildPlanSymbols() {
  while (planSymbols.children.length) planSymbols.remove(planSymbols.children[0]);
  const y = FLOOR_Y + 0.03;
  walls.forEach(w => {
    const len = wallLength(w);
    if (len < 0.05) return;
    const angle = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);
    const nx = -Math.sin(angle), nz = Math.cos(angle);
    (w.openings || []).forEach(op => {
      const ox = w.x1 + Math.cos(angle) * op.along;
      const oz = w.z1 + Math.sin(angle) * op.along;
      const half = (op.width || 0.9) / 2;
      if (op.type === 'door') {
        const g = new THREE.Group();
        const arc = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const a = angle + (Math.PI / 2) * t;
          const r = op.width || 0.9;
          arc.push(new THREE.Vector3(ox + Math.cos(a) * r, y, oz + Math.sin(a) * r));
        }
        g.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(arc),
          new THREE.LineBasicMaterial({ color: 0x3d8bfd })
        ));
        planSymbols.add(g);
      } else {
        const g = new THREE.Group();
        const off = 0.08;
        for (const s of [-1, 1]) {
          const ax = ox + nx * off * s - Math.cos(angle) * half;
          const az = oz + nz * off * s - Math.sin(angle) * half;
          const bx = ox + nx * off * s + Math.cos(angle) * half;
          const bz = oz + nz * off * s + Math.sin(angle) * half;
          g.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz),
            ]),
            new THREE.LineBasicMaterial({ color: 0x5a9ab0 })
          ));
        }
        planSymbols.add(g);
      }
    });
  });
}

function showWallHandles(wallId) {
  while (handleGroup.children.length) handleGroup.remove(handleGroup.children[0]);
  const w = walls.find(x => x.id === wallId);
  if (!w) return;
  const mk = (x, z, end) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x3d8bfd, emissive: 0x1a4060 })
    );
    m.position.set(x, FLOOR_Y + 0.15, z);
    m.userData.handle = true;
    m.userData.wallId = wallId;
    m.userData.end = end;
    m.userData.movable = false;
    handleGroup.add(m);
  };
  mk(w.x1, w.z1, 1);
  mk(w.x2, w.z2, 2);
}

function hideWallHandles() {
  while (handleGroup.children.length) handleGroup.remove(handleGroup.children[0]);
  dragHandle = null;
}

// Snapping: punktid ja nurk
let orthoEnabled = true;
let gridSnapStep = 0.5;

function snapPoint(x, z, excludeWallId = null, startPt = null) {
  let bx = x, bz = z, best = SNAP_EPS;

  // 1. Nurkade ja seinte otspunktide snap
  walls.forEach(w => {
    if (w.id === excludeWallId) return;
    [[w.x1, w.z1], [w.x2, w.z2]].forEach(([px, pz]) => {
      const d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; bx = px; bz = pz; }
    });
  });

  // 2. Kui alguspunkt on teada ja ortho on sees, lukusta 0°, 45°, 90° nurkadele
  if (best >= SNAP_EPS && startPt && orthoEnabled) {
    const dx = x - startPt.x;
    const dz = z - startPt.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.3) {
      let angle = Math.atan2(dz, dx);
      // snap 45 kraadile
      const snapAng = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      bx = startPt.x + Math.cos(snapAng) * dist;
      bz = startPt.z + Math.sin(snapAng) * dist;
    }
  }

  // 3. Ruudustiku snap valitud sammuga (0.1 m, 0.25 m, 0.5 m, 1.0 m)
  if (best >= SNAP_EPS) {
    const inv = 1 / (gridSnapStep || 0.1);
    bx = Math.round(bx * inv) / inv;
    bz = Math.round(bz * inv) / inv;
  }
  return { x: bx, z: bz };
}

// ---- Objektid & Kataloog ----
const ASSETS = {
  ...ASSET_BUILDERS,
  saunaPad: () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L + 1.6, W + 1.8), MAT.sand);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    g.add(m);
    g.userData.movable = true;
    g.userData.type = 'saunaPad';
    g.userData.kind = 'scenery';
    g.userData.uid = uid();
    return g;
  }
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
  return [
    ...layers.scenery.children,
    ...layers.furniture.children,
    ...layers.building.children,
  ].filter(o => o.userData.movable);
}

// Alusplaan (Trace image)
function clearTraceMesh() {
  if (!traceMesh) return;
  layers.trace.remove(traceMesh);
  traceMesh.geometry?.dispose();
  traceMesh.material?.map?.dispose();
  traceMesh.material?.dispose();
  traceMesh = null;
}

function syncTraceUi() {
  const hasTrace = !!traceMeta;
  document.getElementById('btn-trace-open')?.classList.toggle('hidden', hasTrace);
  document.getElementById('trace-controls')?.classList.toggle('hidden', !hasTrace);
  if (!hasTrace) return;
  const name = document.getElementById('trace-name');
  const size = document.getElementById('trace-size');
  const width = document.getElementById('trace-width');
  const opacity = document.getElementById('trace-opacity');
  const opacityValue = document.getElementById('trace-opacity-value');
  const toggle = document.getElementById('btn-trace-toggle');
  if (name) name.textContent = traceMeta.name || 'Alusplaan';
  if (size) size.textContent = `${traceMeta.width || 10} m lai`;
  if (width) width.value = traceMeta.width || 10;
  if (opacity) opacity.value = Math.round((traceMeta.opacity ?? 0.38) * 100);
  if (opacityValue) opacityValue.textContent = `${Math.round((traceMeta.opacity ?? 0.38) * 100)}%`;
  if (toggle) toggle.textContent = traceMeta.visible === false ? 'Näita' : 'Peida';
}

function updateTraceVisibility() {
  layers.trace.visible = !!traceMeta && traceMeta.visible !== false && viewMode !== '3d';
  const cb = document.querySelector('[data-layer="trace"]');
  if (cb) cb.checked = !!traceMeta && traceMeta.visible !== false;
}

function rebuildTrace() {
  clearTraceMesh();
  syncTraceUi();
  if (!traceMeta?.dataUrl) { updateTraceVisibility(); return; }
  const expectedData = traceMeta.dataUrl;
  new THREE.TextureLoader().load(expectedData, tex => {
    if (!traceMeta || traceMeta.dataUrl !== expectedData) { tex.dispose(); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    const imgW = tex.image?.naturalWidth || tex.image?.width || 1;
    const imgH = tex.image?.naturalHeight || tex.image?.height || 1;
    const width = Math.max(1, Number(traceMeta.width) || 10);
    const height = width * (imgH / imgW);
    const material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: traceMeta.opacity ?? 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    traceMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    traceMesh.rotation.x = -Math.PI / 2;
    traceMesh.position.set(traceMeta.x ?? controls.target.x, FLOOR_Y + 0.035, traceMeta.z ?? controls.target.z);
    traceMesh.renderOrder = 1;
    layers.trace.add(traceMesh);
    updateTraceVisibility();
    syncTraceUi();
  }, undefined, () => setStatus('Alusplaani ei õnnestunud avada'));
}

function removeTrace() {
  clearTraceMesh();
  traceMeta = null;
  syncTraceUi();
  updateTraceVisibility();
}

function clearEditable() {
  deselect();
  [layers.scenery, layers.furniture].forEach(layer => {
    [...layer.children].forEach(c => { if (c.userData.movable) layer.remove(c); });
  });
  walls = [];
  rooms = [];
  measurements = [];
  removeTrace();
  wallMeshes.forEach(m => layers.building.remove(m));
  wallMeshes.clear();
  roomSprites.forEach(s => layers.building.remove(s));
  roomSprites.clear();
  while (layers.dims.children.length) layers.dims.remove(layers.dims.children[0]);
  while (roofGroup.children.length) roofGroup.remove(roofGroup.children[0]);
}

// Mallid
function placeSaunaTemplate() {
  clearEditable();
  const h = 2.4, t = 0.15;
  const outline = [
    { x1: 0, z1: 0, x2: L, z2: 0 },
    { x1: L, z1: 0, x2: L, z2: W },
    { x1: L, z1: W, x2: 0, z2: W },
    { x1: 0, z1: W, x2: 0, z2: 0 },
  ];
  outline.forEach(s => {
    walls.push({ id: uid(), ...s, h, t, mat: 'wood', openings: [] });
  });
  // vaheseinad
  walls.push({
    id: uid(), x1: FRONT_D, z1: 0, x2: FRONT_D, z2: W, h, t: 0.12, mat: 'wood',
    openings: [{ type: 'door', along: PESU_W * 0.5, width: 0.8, height: 2.05 }],
  });
  walls.push({
    id: uid(), x1: FRONT_D, z1: PESU_W, x2: L, z2: PESU_W, h, t: 0.12, mat: 'wood',
    openings: [{ type: 'door', along: BACK_D * 0.45, width: 0.8, height: 2.05 }],
  });
  // välisuks ja aknad
  walls[3].openings.push({ type: 'door', along: W / 2, width: 1.0, height: 2.1 });
  walls[0].openings.push({ type: 'window', along: L * 0.4, width: 1.4, height: 1.3, sill: 0.85 });
  walls[1].openings.push({ type: 'window', along: W * 0.5, width: 0.6, height: 0.6, sill: 1.4 });

  rooms = [
    { id: uid(), name: 'Puhkeruum (11,0 m²)', x: FRONT_D / 2, z: W / 2, area: 11.0, floorMat: 'parquet' },
    { id: uid(), name: 'Pesu (2,5 m²)', x: FRONT_D + BACK_D / 2, z: PESU_W / 2, area: 2.5, floorMat: 'tile_gray' },
    { id: uid(), name: 'Leil (5,8 m²)', x: FRONT_D + BACK_D / 2, z: PESU_W + LEILI_W / 2, area: 5.8, floorMat: 'wood' },
  ];

  rebuildAllWalls();

  // Haljastus & aed sauna ümber
  addAsset('deckModule', L / 2, W + 1.8);
  addAsset('hotTub', L + 2.8, W + 2.2);
  addAsset('pond', L + 4.5, -3.5);
  addAsset('pine', -4, W + 4, 0, 1.6);
  addAsset('pine', L + 3, W + 7, 0, 1.8);
  addAsset('birch', -6, -2, 0, 1.3);
  addAsset('stonePath', L / 2, W + 3.8);
  addAsset('outdoorTable', L / 2, W + 1.8);
  addAsset('gardenLight', L + 1.2, W + 3.4);
  addAsset('gardenLight', -1.2, W + 1.2);
  addAsset('sofa', 1.4, 1.0);
  addAsset('stove', 4.4, 3.2);
  addAsset('lavaLong', 4.5, 2.3);
  addAsset('shower', 4.4, 0.45);

  roofConfig.type = 'gable';
  roofConfig.pitch = 22;
  roofConfig.material = 'roof_dark';
  rebuildRoof();

  pushHist('Mall: Saunakompleks ja tiik');
  refreshList();
  setStatus('Laaditud saunakrundi näidis');
}

function placeHouseTemplate() {
  clearEditable();
  const h = 2.6, t = 0.25;
  const houseL = 11.0, houseW = 8.5;
  // välisseinad
  const outline = [
    { x1: 0, z1: 0, x2: houseL, z2: 0 },
    { x1: houseL, z1: 0, x2: houseL, z2: houseW },
    { x1: houseL, z1: houseW, x2: 0, z2: houseW },
    { x1: 0, z1: houseW, x2: 0, z2: 0 },
  ];
  outline.forEach(s => walls.push({ id: uid(), ...s, h, t, mat: 'plaster', openings: [] }));

  // siseseinad
  walls.push({
    id: uid(), x1: 6.0, z1: 0, x2: 6.0, z2: houseW, h, t: 0.15, mat: 'plaster',
    openings: [{ type: 'door', along: 2.2, width: 0.9, height: 2.1 }],
  });
  walls.push({
    id: uid(), x1: 6.0, z1: 4.5, x2: houseL, z2: 4.5, h, t: 0.12, mat: 'plaster',
    openings: [{ type: 'door', along: 1.5, width: 0.9, height: 2.1 }],
  });
  walls.push({
    id: uid(), x1: 0, z1: 4.0, x2: 6.0, z2: 4.0, h, t: 0.12, mat: 'plaster',
    openings: [{ type: 'door', along: 3.5, width: 1.2, height: 2.1 }],
  });

  // Avatäited
  walls[0].openings.push({ type: 'door', along: 2.5, width: 1.0, height: 2.1 });
  walls[0].openings.push({ type: 'window', along: 8.5, width: 1.6, height: 1.4, sill: 0.85 });
  walls[1].openings.push({ type: 'window', along: 2.5, width: 1.8, height: 2.1, sill: 0.05 });
  walls[1].openings.push({ type: 'window', along: 6.5, width: 1.4, height: 1.4, sill: 0.85 });
  walls[2].openings.push({ type: 'door', along: 3.5, width: 1.8, height: 2.1 });
  walls[3].openings.push({ type: 'window', along: 2.2, width: 1.4, height: 1.4, sill: 0.85 });

  rooms = [
    { id: uid(), name: 'Elutuba ja köök (24,0 m²)', x: 3.0, z: 2.0, area: 24.0, floorMat: 'parquet' },
    { id: uid(), name: 'Söögituba & terrassipääs (22,0 m²)', x: 3.0, z: 6.2, area: 22.0, floorMat: 'parquet' },
    { id: uid(), name: 'Magamistuba (21,5 m²)', x: 8.5, z: 2.2, area: 21.5, floorMat: 'parquet' },
    { id: uid(), name: 'Vannituba & Spa (19,0 m²)', x: 8.5, z: 6.5, area: 19.0, floorMat: 'tile_gray' },
  ];

  rebuildAllWalls();

  // Krunt & aed pereelamu ümber
  addAsset('deckModule', 3.5, houseW + 1.8);
  addAsset('pergola', 3.5, houseW + 1.8);
  addAsset('greenhouse', 14.5, 4.0);
  addAsset('raisedBed', 14.5, 0.5);
  addAsset('raisedBed', 14.5, -1.2);
  addAsset('appleTree', -4.5, 3.0);
  addAsset('appleTree', -4.5, 7.5);
  addAsset('bushLilac', -3.0, -2.5);
  addAsset('hedgeThuja', 8.5, -3.0);
  addAsset('hedgeThuja', 10.5, -3.0);
  addAsset('outdoorTable', 3.5, houseW + 1.8);
  addAsset('bbqGrill', 1.0, houseW + 1.5);
  addAsset('sofa', 3.0, 1.8);
  addAsset('kitchenUnit', 1.5, 6.0);
  addAsset('bed', 8.5, 2.0);
  addAsset('bathTub', 8.5, 6.2);

  roofConfig.type = 'gable';
  roofConfig.pitch = 25;
  roofConfig.material = 'roof_dark';
  rebuildRoof();

  pushHist('Mall: Kaasaegne pereelamu ja aed');
  refreshList();
  setStatus('Laaditud pereelamu ja aia näidis');
}

function placeGardenShedTemplate() {
  clearEditable();
  addAsset('shed', 0, 0);
  addAsset('greenhouse', 5.0, 0);
  addAsset('pergola', 0, 4.5);
  addAsset('deckModule', 0, 4.5);
  addAsset('raisedBed', 4.5, 3.5);
  addAsset('raisedBed', 4.5, 5.0);
  addAsset('flowerBed', 2.5, 2.5);
  addAsset('fenceWood', -2.5, -2.5);
  addAsset('fenceWood', 1.5, -2.5);
  addAsset('appleTree', -4.0, 4.0);
  addAsset('outdoorTable', 0, 4.5);
  addAsset('bbqGrill', -1.5, 4.5);

  pushHist('Mall: Aiamaja, kasvuhoone ja terrass');
  refreshList();
  refreshQuote();
  setStatus('Laaditud aiamaja ja kasvuhoone näidis');
}

// Tagasivõtmise (Undo) süsteem
const history = [];
let cloudProjectId = null;

function snap() {
  return {
    walls: JSON.parse(JSON.stringify(walls)),
    rooms: JSON.parse(JSON.stringify(rooms)),
    measurements: JSON.parse(JSON.stringify(measurements)),
    roofConfig: { ...roofConfig },
    plotConfig: { ...plotConfig },
    trace: traceMeta ? { ...traceMeta } : null,
    objects: allEditable()
      .filter(o => o.userData.kind !== 'wall' && o.userData.kind !== 'room')
      .map(o => ({
        type: o.userData.type,
        uid: o.userData.uid,
        kind: o.userData.kind,
        x: o.position.x,
        y: o.position.y,
        z: o.position.z,
        ry: o.rotation.y,
        s: o.scale.x,
      })),
  };
}

function pushHist(label) {
  history.push(snap());
  if (history.length > 40) history.shift();
}

function restore(s) {
  if (!s) return;
  clearEditable();
  walls = s.walls || [];
  rooms = s.rooms || [];
  measurements = s.measurements || [];
  if (s.roofConfig) roofConfig = { ...roofConfig, ...s.roofConfig };
  if (s.plotConfig) {
    plotConfig = { ...plotConfig, ...s.plotConfig };
    const pw = document.getElementById('plot-width'); if (pw) pw.value = plotConfig.width;
    const pd = document.getElementById('plot-depth'); if (pd) pd.value = plotConfig.depth;
    const ps = document.getElementById('plot-setback'); if (ps) ps.value = plotConfig.setback;
    const pc = document.getElementById('plot-max-cov'); if (pc) pc.value = plotConfig.maxCoverage;
    const pn = document.getElementById('plot-north'); if (pn) pn.value = plotConfig.northAngle;
  }
  traceMeta = s.trace ? { ...s.trace } : null;
  rebuildAllWalls();
  rebuildRooms();
  rebuildRoof();
  rebuildPlotMesh();
  updateCompassUi();
  rebuildTrace();
  (s.objects || []).forEach(x => {
    const o = addAsset(x.type, x.x, x.z, x.ry, x.s || 1);
    if (o) {
      o.userData.uid = x.uid;
      o.position.y = x.y;
    }
  });
  deselect();
  refreshList();
  refreshQuote();
}

function undo() {
  if (history.length < 2) return;
  history.pop();
  restore(history[history.length - 1]);
  setStatus('Viimane tegevus tagasi võetud');
}

function payload() {
  return {
    app: APP.name,
    version: APP.version,
    name: document.getElementById('project-name').value || 'Projekt',
    ...snap(),
    savedAt: new Date().toISOString(),
  };
}

function apply(data) {
  if (data.name) document.getElementById('project-name').value = data.name;
  restore({
    walls: data.walls || [],
    rooms: data.rooms || [],
    measurements: data.measurements || [],
    roofConfig: data.roofConfig || null,
    trace: data.trace || null,
    objects: data.objects || data.layout || [],
  });
  history.length = 0;
  pushHist();
}

// Objekti valimine ja inspektor
let selected = null;
function select(o) {
  deselect();
  selected = o;
  if (o.userData.kind !== 'wall' && o.userData.kind !== 'room') {
    transform.attach(o);
    hideWallHandles();
  } else {
    transform.detach();
    if (o.userData.kind === 'wall') showWallHandles(o.userData.wallId);
    else hideWallHandles();
  }
  document.getElementById('btn-del').disabled = false;
  document.getElementById('props-empty').classList.add('hidden');
  document.getElementById('props-form').classList.remove('hidden');

  const isWall = o.userData.kind === 'wall';
  const isRoom = o.userData.kind === 'room';
  const isFurniture = o.userData.kind === 'furniture' || (!isWall && !isRoom);
  document.getElementById('props-wall').classList.toggle('hidden', !isWall);
  document.getElementById('props-room').classList.toggle('hidden', !isRoom);
  document.getElementById('props-mat').classList.toggle('hidden', !isWall);
  document.getElementById('props-furniture-finish')?.classList.toggle('hidden', !isFurniture);
  syncProps();
  refreshList();
  setStatus((o.userData.type || 'objekt') + ' valitud');
}

function deselect() {
  if (selected) transform.detach();
  hideWallHandles();
  selected = null;
  document.getElementById('btn-del').disabled = true;
  document.getElementById('props-empty').classList.remove('hidden');
  document.getElementById('props-form').classList.add('hidden');
  refreshList();
}

function clampSel() {
  if (!selected || selected.userData.kind === 'wall') return;
  selected.position.x = THREE.MathUtils.clamp(selected.position.x, -35, 45);
  selected.position.z = THREE.MathUtils.clamp(selected.position.z, -35, 45);
  selected.position.y = Math.max(0, selected.position.y);
}

function syncProps() {
  if (!selected) return;
  document.getElementById('p-type').value = selected.userData.type;
  const nameEl = document.getElementById('p-name');
  if (selected.userData.kind === 'room') {
    const r = rooms.find(x => x.id === selected.userData.roomId);
    nameEl.value = r?.name || '';
    if (r?.floorMat) document.getElementById('p-floor-mat').value = r.floorMat;

    // Põranda konstruktsioon ja kihid
    const floorKey = r?.floorAssemblyKey || (r?.floorMat === 'paver' ? 'terrace_paver_ground' : r?.floorMat === 'tile_gray' ? 'ground_slab_tile' : 'ground_slab_heated');
    const floorAsm = r?.floorAssembly || FLOOR_ASSEMBLIES[floorKey] || FLOOR_ASSEMBLIES.ground_slab_heated;
    const floorAsmSelect = document.getElementById('p-floor-assembly');
    if (floorAsmSelect) floorAsmSelect.value = r?.floorAssembly ? 'custom' : (FLOOR_ASSEMBLIES[floorKey] ? floorKey : 'ground_slab_heated');
    const floorMini = document.getElementById('floor-assembly-mini');
    if (floorMini) floorMini.innerHTML = renderAssemblyMiniPreview(floorAsm, true);
  } else {
    nameEl.value = selected.userData.name || '';
  }

  if (selected.userData.kind === 'wall') {
    const w = walls.find(x => x.id === selected.userData.wallId);
    if (w) {
      document.getElementById('p-len').value = wallLength(w).toFixed(2);
      document.getElementById('p-wh').value = w.h || H;
      document.getElementById('p-wt').value = (w.t || 0.15).toFixed(2);
      document.getElementById('p-mat').value = w.mat || 'wood';
      document.getElementById('p-x').value = ((w.x1 + w.x2) / 2).toFixed(2);
      document.getElementById('p-z').value = ((w.z1 + w.z2) / 2).toFixed(2);
      document.getElementById('p-y').value = FLOOR_Y.toFixed(2);
      document.getElementById('p-ry').value = 0;
      document.getElementById('p-s').value = 1;

      // Seina konstruktsioon ja kihid
      const asmKey = w.assemblyKey || ((w.t || 0.15) >= 0.22 ? 'timber_ext_250' : 'timber_int_light');
      const asm = w.assembly || WALL_ASSEMBLIES[asmKey] || WALL_ASSEMBLIES.timber_ext_250;
      const wallAsmSelect = document.getElementById('p-wall-assembly');
      if (wallAsmSelect) wallAsmSelect.value = w.assembly ? 'custom' : (WALL_ASSEMBLIES[asmKey] ? asmKey : 'timber_ext_250');
      const wallMini = document.getElementById('wall-assembly-mini');
      if (wallMini) wallMini.innerHTML = renderAssemblyMiniPreview(asm, false);
    }
  } else {
    document.getElementById('p-x').value = selected.position.x.toFixed(2);
    document.getElementById('p-y').value = selected.position.y.toFixed(2);
    document.getElementById('p-z').value = selected.position.z.toFixed(2);
    document.getElementById('p-ry').value = Math.round(THREE.MathUtils.radToDeg(selected.rotation.y));
    document.getElementById('p-s').value = selected.scale.x.toFixed(2);

    // Ruumiline ja ergonoomiline info
    const nearWall = findNearestWall(selected.position.x, selected.position.z, walls);
    const wallDistEl = document.getElementById('meta-wall-dist');
    if (wallDistEl) {
      wallDistEl.textContent = nearWall ? `${nearWall.dist.toFixed(2)} m (${nearWall.dist < 0.15 ? 'seina ääres' : 'eemal'})` : '-';
    }
    const contRoom = findContainingRoom(selected.position.x, selected.position.z, rooms);
    const roomNameEl = document.getElementById('meta-room-name');
    if (roomNameEl) {
      roomNameEl.textContent = contRoom ? (contRoom.name || 'Ruum') : 'Krundi õueala / terrass';
    }
    const ergoEl = document.getElementById('meta-ergo-status');
    if (ergoEl) {
      if (nearWall && nearWall.dist < 0.12) {
        ergoEl.textContent = 'Joondatud seina äärde';
        ergoEl.style.color = '#38bdf8';
      } else {
        ergoEl.textContent = 'Vaba liikumisruum';
        ergoEl.style.color = 'var(--accent)';
      }
    }

    // Mööbli viimistluse kuvamine
    const finishSelect = document.getElementById('p-furniture-finish');
    if (finishSelect && selected.userData.customFinish) {
      finishSelect.value = selected.userData.customFinish;
    }
  }
}

function applyProps() {
  if (!selected) return;
  if (selected.userData.kind === 'wall') {
    const w = walls.find(x => x.id === selected.userData.wallId);
    if (!w) return;
    w.h = +document.getElementById('p-wh').value || H;
    
    // Seina konstruktsiooni valik
    const chosenAsm = document.getElementById('p-wall-assembly')?.value;
    if (chosenAsm && chosenAsm !== 'custom' && WALL_ASSEMBLIES[chosenAsm]) {
      w.assemblyKey = chosenAsm;
      w.assembly = null;
      const phy = calculateAssemblyPhysics(WALL_ASSEMBLIES[chosenAsm], false);
      w.t = phy.totalM;
      document.getElementById('p-wt').value = w.t.toFixed(2);
    } else {
      w.t = +document.getElementById('p-wt').value || 0.15;
    }

    w.mat = document.getElementById('p-mat').value || 'wood';
    rebuildWallMesh(w);
    rebuildDims();
    rebuildPlanSymbols();
    rebuildRoof();
    pushHist();
    refreshQuote();
    select(wallMeshes.get(w.id));
    showWallHandles(w.id);
    return;
  }
  if (selected.userData.kind === 'room') {
    const r = rooms.find(x => x.id === selected.userData.roomId);
    if (r) {
      r.name = document.getElementById('p-name').value || 'Ruum';
      r.floorMat = document.getElementById('p-floor-mat').value || 'parquet';

      // Põranda konstruktsiooni valik
      const chosenFloorAsm = document.getElementById('p-floor-assembly')?.value;
      if (chosenFloorAsm && chosenFloorAsm !== 'custom' && FLOOR_ASSEMBLIES[chosenFloorAsm]) {
        r.floorAssemblyKey = chosenFloorAsm;
        r.floorAssembly = null;
      }

      rebuildRooms();
      const sp = roomSprites.get(r.id);
      if (sp) select(sp);
    }
    pushHist();
    return;
  }

  // Mööbli või sisustuse viimistlus
  const finishVal = document.getElementById('p-furniture-finish')?.value;
  if (finishVal && finishVal !== selected.userData.customFinish) {
    applyFurnitureFinish(selected, finishVal);
  }

  selected.position.set(
    +document.getElementById('p-x').value || 0,
    +document.getElementById('p-y').value || 0,
    +document.getElementById('p-z').value || 0
  );
  selected.rotation.y = THREE.MathUtils.degToRad(+document.getElementById('p-ry').value || 0);
  selected.scale.setScalar(Math.max(0.1, +document.getElementById('p-s').value || 1));
  clampSel();
  pushHist();
}

['p-x', 'p-y', 'p-z', 'p-ry', 'p-s', 'p-wh', 'p-wt', 'p-mat', 'p-name', 'p-floor-mat', 'p-wall-assembly', 'p-floor-assembly', 'p-furniture-finish'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', applyProps);
});

// Kiirvaliku värvinupud (swatches)
document.querySelectorAll('#finish-swatches-row .swatch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!selected || selected.userData.kind === 'wall' || selected.userData.kind === 'room') return;
    const finishKey = btn.dataset.finish;
    if (finishKey) {
      const finishSelect = document.getElementById('p-furniture-finish');
      if (finishSelect) finishSelect.value = finishKey;
      applyFurnitureFinish(selected, finishKey);
      pushHist();
      setStatus(`Viimistlus muudetud: ${FURNITURE_FINISHES[finishKey]?.name || finishKey}`);
    }
  });
});

function setStatus(t) {
  const label = document.getElementById('status-text');
  if (label) label.textContent = t;
}

function setDrawHint(t) {
  const el = document.getElementById('draw-hint');
  if (!t) { el.classList.add('hidden'); el.textContent = ''; return; }
  el.classList.remove('hidden');
  el.textContent = t;
}

function refreshList() {
  const el = document.getElementById('obj-list');
  const names = {};
  CATALOG.forEach(c => c.items.forEach(i => { names[i.id] = i.name; }));
  names.wall = 'Sein';
  names.room = 'Ruum';
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
  const calc = calculateConstruction(walls, rooms, allEditable(), roofConfig);
  const c = calc.costs;
  el.innerHTML = `
    <div><span>Ehitusalune pind</span><strong>${calc.buildingFootprint} m²</strong></div>
    <div><span>Seinad (neto) · ${calc.netWallArea} m²</span><strong>${c.wallTimberCost.toLocaleString('et-EE')} €</strong></div>
    <div><span>Katus · ${calc.roofArea} m²</span><strong>${c.roofCost.toLocaleString('et-EE')} €</strong></div>
    <div><span>Avatäited (${calc.doorsCount} uks, ${calc.windowsCount} aken)</span><strong>${(c.doorsCost + c.windowsCost).toLocaleString('et-EE')} €</strong></div>
    <div><span>Vundament & põrandad</span><strong>${(c.foundationCost + c.interiorCost).toLocaleString('et-EE')} €</strong></div>
    <div><span>Tööjõud (~38%)</span><strong>${c.laborCost.toLocaleString('et-EE')} €</strong></div>
    <div class="q-total"><span>Hinnang kokku</span><strong>~${c.grandTotal.toLocaleString('et-EE')} €</strong></div>`;
}

// Kataloogi renderdamine
const catEl = document.getElementById('catalog-list');
const catalogSearch = document.getElementById('catalog-search');
const catalogCount = document.getElementById('catalog-count');
const catalogEmpty = document.getElementById('catalog-empty');

let currentCatalogCategory = 'all';
const CAT_MAP = {
  all: null,
  living: 'Elutuba',
  kitchen: 'Köök',
  bedroom: 'Magamistuba',
  bath: 'Vannituba',
  terrace: 'Terrass',
  garden: 'Haljastus',
  build: 'Ehitised',
};

function renderCatalog(query = '', filterKey = currentCatalogCategory) {
  const needle = query.trim().toLocaleLowerCase('et');
  const targetCategoryName = CAT_MAP[filterKey] || null;

  let groups = CATALOG.map(c => ({
    ...c,
    items: c.items.filter(i => (!needle || i.name.toLocaleLowerCase('et').includes(needle))),
  })).filter(c => c.items.length);

  if (targetCategoryName) {
    groups = groups.filter(c => c.cat.toLocaleLowerCase('et').includes(targetCategoryName.toLocaleLowerCase('et')));
  }

  const visibleCount = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (catalogCount) catalogCount.textContent = String(visibleCount);
  if (catalogEmpty) catalogEmpty.classList.toggle('hidden', visibleCount > 0);

  catEl.innerHTML = groups.map(c => `
    <div class="cat-block" data-category="${c.cat}">
      <div class="cat-title">${c.cat} <small style="font-size:0.75rem;opacity:0.65;">(${c.items.length})</small></div>
      <div class="cat-items">
        ${c.items.map(i => `<button type="button" draggable="true" data-add="${i.id}" title="Lohista või klõpsa, et lisada ${i.name.toLocaleLowerCase('et')}"><span class="icon">${i.icon}</span><span>${i.name}</span></button>`).join('')}
      </div>
    </div>`).join('');

  catEl.querySelectorAll('[data-add]').forEach(b => {
    b.onclick = () => {
      setDrawMode(null);
      const item = CATALOG.flatMap(c => c.items).find(i => i.id === b.dataset.add);
      const o = addAsset(b.dataset.add, controls.target.x, controls.target.z);
      if (o) {
        select(o);
        pushHist();
        refreshList();
        refreshQuote();
        setStatus('Lisatud: ' + (item?.name || b.dataset.add));
      }
    };

    b.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('text/plain', b.dataset.add);
      ev.dataTransfer.effectAllowed = 'copy';
    });
  });
}

document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentCatalogCategory = pill.dataset.cat || 'all';
    renderCatalog(catalogSearch?.value || '', currentCatalogCategory);
  });
});

renderCatalog();
catalogSearch?.addEventListener('input', () => renderCatalog(catalogSearch.value, currentCatalogCategory));

// Valitud objekti kiirtoimingud (seina äärde joondamine, tsentreerimine, 90° pööre, kloonimine, põrandale asetamine, kustutamine)
function snapSelectedToWall() {
  if (!selected || !selected.userData?.movable) return;
  const changed = alignToWall(selected, walls);
  if (changed) {
    syncProps();
    clampSel();
    pushHist();
    refreshQuote();
    runErgoCheck();
    setStatus('Objekt joondatud lähima seina äärde');
  } else {
    setStatus('Läheduses ei leitud sobivat seina');
  }
}

function centerSelectedInRoom() {
  if (!selected || !selected.userData?.movable) return;
  const room = findContainingRoom(selected.position.x, selected.position.z, rooms);
  if (room) {
    selected.position.x = room.x;
    selected.position.z = room.z;
    syncProps();
    clampSel();
    pushHist();
    refreshQuote();
    runErgoCheck();
    setStatus(`Objekt tsentreeritud ruumi: ${room.name || 'Ruum'}`);
  } else {
    setStatus('Objekt ei asu ühegi tuvastatud ruumi piirides');
  }
}

function rotateSelected90() {
  if (!selected || !selected.userData?.movable) return;
  selected.rotation.y = (selected.rotation.y + Math.PI / 2) % (Math.PI * 2);
  syncProps();
  clampSel();
  pushHist();
  runErgoCheck();
  setStatus('Pööratud 90°');
}

function cloneSelected() {
  if (!selected || !selected.userData?.movable) return;
  const type = selected.userData.type;
  if (!type) return;
  const newObj = addAsset(type, selected.position.x + 0.6, selected.position.z + 0.6);
  if (newObj) {
    newObj.rotation.y = selected.rotation.y;
    newObj.scale.copy(selected.scale);
    select(newObj);
    pushHist();
    refreshList();
    refreshQuote();
    runErgoCheck();
    setStatus('Loodud koopia elemendist');
  }
}

function groundSelected() {
  if (!selected || !selected.userData?.movable) return;
  selected.position.y = 0;
  syncProps();
  clampSel();
  pushHist();
  setStatus('Elemendi kõrgus viidud pinnale');
}

function deleteSelected() {
  if (!selected) return;
  if (selected.userData?.movable) {
    const parent = selected.parent;
    if (parent) parent.remove(selected);
    deselect();
    pushHist();
    refreshList();
    refreshQuote();
    runErgoCheck();
    setStatus('Objekt kustutatud');
  } else if (selected.userData?.wall) {
    deleteWall(selected.userData.wall.id);
  }
}

document.getElementById('btn-sel-snap-wall')?.addEventListener('click', snapSelectedToWall);
document.getElementById('btn-sel-center')?.addEventListener('click', centerSelectedInRoom);
document.getElementById('btn-sel-rotate')?.addEventListener('click', rotateSelected90);
document.getElementById('btn-sel-clone')?.addEventListener('click', cloneSelected);
document.getElementById('btn-sel-ground')?.addEventListener('click', groundSelected);
document.getElementById('btn-sel-delete')?.addEventListener('click', deleteSelected);

// Alusplaan failist laadimine
const traceFile = document.getElementById('trace-file');
document.getElementById('btn-trace-open')?.addEventListener('click', () => traceFile?.click());
traceFile?.addEventListener('change', () => {
  const file = traceFile.files?.[0];
  traceFile.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { setStatus('Vali JPG, PNG või WebP pilt'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    traceMeta = {
      dataUrl: String(reader.result),
      name: file.name,
      bytes: file.size,
      width: 12,
      opacity: 0.38,
      x: controls.target.x,
      z: controls.target.z,
      visible: true,
    };
    rebuildTrace();
    setViewMode('blueprint');
    pushHist();
    setStatus('Alusplaan lisatud – määra tegelik laius');
  };
  reader.readAsDataURL(file);
});
document.getElementById('trace-width')?.addEventListener('change', e => {
  if (!traceMeta) return;
  traceMeta.width = THREE.MathUtils.clamp(Number(e.target.value) || 10, 1, 100);
  rebuildTrace();
  pushHist();
});
document.getElementById('trace-opacity')?.addEventListener('input', e => {
  if (!traceMeta) return;
  traceMeta.opacity = Number(e.target.value) / 100;
  if (traceMesh?.material) traceMesh.material.opacity = traceMeta.opacity;
  const output = document.getElementById('trace-opacity-value');
  if (output) output.textContent = `${e.target.value}%`;
});
document.getElementById('trace-opacity')?.addEventListener('change', () => { if (traceMeta) pushHist(); });
document.getElementById('btn-trace-center')?.addEventListener('click', () => {
  if (!traceMeta) return;
  traceMeta.x = controls.target.x;
  traceMeta.z = controls.target.z;
  rebuildTrace();
  pushHist();
});
document.getElementById('btn-trace-toggle')?.addEventListener('click', () => {
  if (!traceMeta) return;
  traceMeta.visible = traceMeta.visible === false;
  updateTraceVisibility();
  syncTraceUi();
});
document.getElementById('btn-trace-remove')?.addEventListener('click', () => {
  if (!traceMeta) return;
  removeTrace();
  pushHist();
});

// Joonistamisrežiimid (Wall, BoxRoom, Room, Door, Window, Measure)
let drawMode = null;
let wallStart = null;
let boxRoomStart = null;
let measureStart = null;
let previewLine = null;

function setDrawMode(mode) {
  drawMode = mode;
  document.querySelectorAll('[data-draw]').forEach(b => b.classList.toggle('active', b.dataset.draw === mode));
  wallStart = null;
  boxRoomStart = null;
  measureStart = null;
  if (previewLine) { scene.remove(previewLine); previewLine = null; }
  deselect();
  if (mode === 'wall') setDrawHint('Sein: 1. klõps algus, 2. klõps lõpp. Hoia Shift sirgnurkadeks.');
  else if (mode === 'boxRoom') setDrawHint('Ristkülik: 1. klõps algusnurk, 2. klõps vastasnurk (loob 4 seina ja ruumi).');
  else if (mode === 'room') setDrawHint('Ruum: klõpsa plaanil asukohta sildi ja põranda lisamiseks.');
  else if (mode === 'door') setDrawHint('Uks: klõpsa seinal avatäite paigaldamiseks.');
  else if (mode === 'window') setDrawHint('Aken: klõpsa seinal akna lisamiseks.');
  else if (mode === 'measure') setDrawHint('Mõõdulint: klõpsa algus- ja lõpp-punkt kauguse mõõtmiseks.');
  else setDrawHint('');
  setStatus(mode ? `Tööriist: ${mode}` : 'Valmis');
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
  return hit;
}

function nearestWall(x, z) {
  let best = null, bestD = 0.8;
  walls.forEach(w => {
    const len = wallLength(w);
    if (len < 0.1) return;
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
  const rawP = groundPoint(event);
  if (!rawP) return true;

  if (drawMode === 'wall') {
    const p = snapPoint(rawP.x, rawP.z, null, wallStart);
    if (!wallStart) {
      wallStart = { x: p.x, z: p.z };
      setDrawHint(`Sein: algus (${p.x.toFixed(1)}, ${p.z.toFixed(1)}). Klõpsa lõpp-punkt.`);
    } else {
      const presetId = document.getElementById('wall-preset-select')?.value || 'ext_timber';
      const preset = WALL_PRESETS.find(p => p.id === presetId) || WALL_PRESETS[0];
      const w = {
        id: uid(),
        x1: wallStart.x,
        z1: wallStart.z,
        x2: p.x,
        z2: p.z,
        h: preset.h || 2.6,
        t: preset.t || 0.25,
        mat: preset.mat || 'wood',
        openings: [],
      };
      if (wallLength(w) >= 0.25) {
        walls.push(w);
        rebuildWallMesh(w);
        rebuildDims();
        rebuildRoof();
        updatePlotCompliance();
        pushHist();
        refreshList();
        refreshQuote();
        setStatus(`Sein lisatud: ${wallLength(w).toFixed(2)} m`);
      }
      wallStart = null;
      if (previewLine) { scene.remove(previewLine); previewLine = null; }
      setDrawHint('Sein: 1. klõps algus, 2. klõps lõpp.');
    }
    return true;
  }

  if (drawMode === 'boxRoom') {
    const p = snapPoint(rawP.x, rawP.z, null, boxRoomStart);
    if (!boxRoomStart) {
      boxRoomStart = { x: p.x, z: p.z };
      setDrawHint(`Ristkülik: algusnurk (${p.x.toFixed(1)}, ${p.z.toFixed(1)}). Klõpsa vastasnurka.`);
    } else {
      const xMin = Math.min(boxRoomStart.x, p.x);
      const xMax = Math.max(boxRoomStart.x, p.x);
      const zMin = Math.min(boxRoomStart.z, p.z);
      const zMax = Math.max(boxRoomStart.z, p.z);
      const wWidth = +(xMax - xMin).toFixed(2);
      const wDepth = +(zMax - zMin).toFixed(2);

      if (wWidth >= 0.6 && wDepth >= 0.6) {
        const presetId = document.getElementById('wall-preset-select')?.value || 'ext_timber';
        const preset = WALL_PRESETS.find(p => p.id === presetId) || WALL_PRESETS[0];
        const h = preset.h || 2.6;
        const t = preset.t || 0.25;
        const mat = preset.mat || 'wood';

        const newWalls = [
          { id: uid(), x1: xMin, z1: zMin, x2: xMax, z2: zMin, h, t, mat, openings: [] },
          { id: uid(), x1: xMax, z1: zMin, x2: xMax, z2: zMax, h, t, mat, openings: [] },
          { id: uid(), x1: xMax, z1: zMax, x2: xMin, z2: zMax, h, t, mat, openings: [] },
          { id: uid(), x1: xMin, z1: zMax, x2: xMin, z2: zMin, h, t, mat, openings: [] },
        ];
        newWalls.forEach(w => {
          walls.push(w);
          rebuildWallMesh(w);
        });

        const area = +(wWidth * wDepth).toFixed(2);
        const r = {
          id: uid(),
          name: `Ruum (${area.toFixed(1).replace('.', ',')} m²)`,
          x: +(xMin + wWidth / 2).toFixed(2),
          z: +(zMin + wDepth / 2).toFixed(2),
          area,
          floorMat: 'parquet',
        };
        rooms.push(r);
        rebuildRooms();
        rebuildDims();
        rebuildPlanSymbols();
        rebuildRoof();
        updatePlotCompliance();
        pushHist();
        refreshList();
        refreshQuote();
        setStatus(`Ristkülik loodud: ${wWidth} × ${wDepth} m (${area} m²)`);
      }
      boxRoomStart = null;
      if (previewLine) { scene.remove(previewLine); previewLine = null; }
      setDrawHint('Ristkülik: 1. klõps algusnurk, 2. klõps vastasnurk.');
    }
    return true;
  }

  if (drawMode === 'room') {
    const r = {
      id: uid(),
      name: 'Ruum',
      x: Math.round(rawP.x * 10) / 10,
      z: Math.round(rawP.z * 10) / 10,
      area: 12.0,
      floorMat: 'parquet',
    };
    rooms.push(r);
    rebuildRooms();
    pushHist();
    const sp = roomSprites.get(r.id);
    if (sp) select(sp);
    setStatus('Ruum lisatud – muuda nime ja põrandat');
    return true;
  }

  if (drawMode === 'measure') {
    const p = snapPoint(rawP.x, rawP.z);
    if (!measureStart) {
      measureStart = { x: p.x, z: p.z };
      setDrawHint(`Mõõdulint: algus (${p.x.toFixed(1)}, ${p.z.toFixed(1)}). Vali teine punkt.`);
    } else {
      const length = Math.hypot(p.x - measureStart.x, p.z - measureStart.z);
      if (length >= 0.1) {
        measurements.push({ id: uid(), x1: measureStart.x, z1: measureStart.z, x2: p.x, z2: p.z });
        rebuildDims();
        pushHist();
        setStatus(`Mõõt lisatud: ${length.toFixed(2)} m`);
      }
      measureStart = null;
      if (previewLine) { scene.remove(previewLine); previewLine = null; }
      setDrawHint('Mõõdulint: klõpsa järgmine alguspunkt');
    }
    return true;
  }

  if (drawMode === 'door' || drawMode === 'window') {
    const hit = nearestWall(rawP.x, rawP.z);
    if (!hit) { setStatus('Klõpsa seina lähedale'); return true; }
    const opPresetId = document.getElementById('opening-preset-select')?.value;
    const doorPreset = OPENING_PRESETS.door.find(d => d.id === opPresetId);
    const winPreset = OPENING_PRESETS.window.find(w => w.id === opPresetId);

    const op = {
      type: drawMode,
      along: hit.along,
      width: drawMode === 'door' ? (doorPreset?.width || 0.9) : (winPreset?.width || 1.2),
      height: drawMode === 'door' ? (doorPreset?.height || 2.1) : (winPreset?.height || 1.3),
      sill: drawMode === 'door' ? 0 : (winPreset?.sill ?? 0.9),
    };
    hit.wall.openings = hit.wall.openings || [];
    hit.wall.openings.push(op);
    rebuildWallMesh(hit.wall);
    rebuildDims();
    pushHist();
    refreshQuote();
    setStatus(drawMode === 'door' ? 'Uks lisatud seinale' : 'Aken lisatud seinale');
    return true;
  }
  return false;
}

canvas.addEventListener('pointermove', e => {
  if (dragHandle) {
    const rawP = groundPoint(e);
    if (!rawP) return;
    const w = walls.find(x => x.id === dragHandle.wallId);
    if (!w) return;
    const sn = snapPoint(rawP.x, rawP.z, w.id);
    if (dragHandle.end === 1) { w.x1 = sn.x; w.z1 = sn.z; }
    else { w.x2 = sn.x; w.z2 = sn.z; }
    const len = wallLength(w);
    (w.openings || []).forEach(op => { op.along = THREE.MathUtils.clamp(op.along, 0.2, Math.max(0.2, len - 0.2)); });
    rebuildWallMesh(w);
    rebuildDims();
    rebuildRoof();
    showWallHandles(w.id);
    return;
  }

  const isBox = drawMode === 'boxRoom' && boxRoomStart;
  const start = drawMode === 'wall' ? wallStart : drawMode === 'measure' ? measureStart : isBox ? boxRoomStart : null;
  if (!start) return;
  const rawP = groundPoint(e);
  if (!rawP) return;
  const p = snapPoint(rawP.x, rawP.z, null, start);

  if (previewLine) scene.remove(previewLine);
  let pts = [];
  if (isBox) {
    const xMin = Math.min(boxRoomStart.x, p.x), xMax = Math.max(boxRoomStart.x, p.x);
    const zMin = Math.min(boxRoomStart.z, p.z), zMax = Math.max(boxRoomStart.z, p.z);
    pts = [
      new THREE.Vector3(xMin, FLOOR_Y + 0.08, zMin),
      new THREE.Vector3(xMax, FLOOR_Y + 0.08, zMin),
      new THREE.Vector3(xMax, FLOOR_Y + 0.08, zMax),
      new THREE.Vector3(xMin, FLOOR_Y + 0.08, zMax),
      new THREE.Vector3(xMin, FLOOR_Y + 0.08, zMin),
    ];
    setDrawHint(`Ristkülik: ${(xMax - xMin).toFixed(2)} × ${(zMax - zMin).toFixed(2)} m (${((xMax - xMin) * (zMax - zMin)).toFixed(1)} m²)`);
  } else {
    pts = [
      new THREE.Vector3(start.x, FLOOR_Y + 0.08, start.z),
      new THREE.Vector3(p.x, FLOOR_Y + 0.08, p.z),
    ];
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  previewLine = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: drawMode === 'measure' ? 0x176b52 : drawMode === 'boxRoom' ? 0x27ae60 : 0x3d8bfd,
    depthTest: false,
  }));
  scene.add(previewLine);
});

// Tööriistad (Select, Move, Rotate, Scale)
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
    deselect();
    rebuildDims();
    rebuildRoof();
    pushHist();
    refreshList();
    refreshQuote();
    setStatus('Sein kustutatud');
    return;
  }
  if (selected.userData.kind === 'room') {
    rooms = rooms.filter(r => r.id !== selected.userData.roomId);
    rebuildRooms();
    deselect();
    pushHist();
    setStatus('Ruum kustutatud');
    return;
  }
  layerFor(selected.userData.kind).remove(selected);
  deselect();
  pushHist();
  refreshList();
  refreshQuote();
  setStatus('Kustutatud');
};

document.getElementById('btn-dup').onclick = () => {
  if (!selected || selected.userData.kind === 'wall' || selected.userData.kind === 'room') return;
  const o = addAsset(selected.userData.type, selected.position.x + 0.5, selected.position.z + 0.5, selected.rotation.y, selected.scale.x);
  if (o) {
    o.position.y = selected.position.y;
    select(o);
    pushHist();
    refreshList();
    refreshQuote();
  }
};

document.getElementById('btn-undo').onclick = undo;
document.getElementById('btn-save').onclick = () => {
  const data = payload();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = (data.name || 'projekt').replace(/\s+/g, '-').toLowerCase() + '-kodudisain.json';
  a.click();
  setStatus('Projekt failina alla laaditud');
};
document.getElementById('btn-open').onclick = () => document.getElementById('file-open').click();
document.getElementById('file-open').onchange = e => {
  const f = e.target.files?.[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      apply(JSON.parse(r.result));
      setStatus('Avatud fail: ' + f.name);
    } catch {
      setStatus('Vigane failivorming');
    }
  };
  r.readAsText(f);
  e.target.value = '';
};
document.getElementById('btn-new').onclick = () => {
  if (confirm('Kas soovid tühjendada töölaua ja alustada uut projekti?')) {
    clearEditable();
    history.length = 0;
    pushHist();
    refreshList();
    refreshQuote();
    setStatus('Uus puhas projekt');
  }
};

// Katuse ja vundamendi seaded UI
document.getElementById('roof-type-select')?.addEventListener('change', e => {
  roofConfig.type = e.target.value;
  rebuildRoof();
  pushHist();
  refreshQuote();
});
document.getElementById('roof-pitch')?.addEventListener('change', e => {
  roofConfig.pitch = Math.max(3, Math.min(55, Number(e.target.value) || 25));
  rebuildRoof();
  pushHist();
  refreshQuote();
});
document.getElementById('roof-overhang')?.addEventListener('change', e => {
  roofConfig.overhang = Math.max(0, Math.min(1.5, Number(e.target.value) || 0.4));
  rebuildRoof();
  pushHist();
  refreshQuote();
});
document.getElementById('roof-material-select')?.addEventListener('change', e => {
  roofConfig.material = e.target.value;
  rebuildRoof();
  pushHist();
  refreshQuote();
});
document.getElementById('btn-rebuild-roof')?.addEventListener('click', () => {
  rebuildRoof();
  setStatus('Katus uuendatud hoone kohale');
});

// Mallide laadimine rippmenüüst
document.getElementById('template-select')?.addEventListener('change', e => {
  const v = e.target.value;
  if (v === 'sauna') placeSaunaTemplate();
  else if (v === 'house') placeHouseTemplate();
  else if (v === 'garden_shed') placeGardenShedTemplate();
  else if (v === 'empty') {
    clearEditable();
    pushHist();
    setStatus('Puhas tühi krunt');
  }
  e.target.value = '';
});

// Kataloogi tabid ja sektsioonide vahetamine
function switchSidebarTab(tabKey) {
  document.querySelectorAll('.catalog-tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabKey}`)?.classList.add('active');

  const secRooms = document.getElementById('section-rooms');
  const secBuild = document.getElementById('section-build-tools');
  const secStyles = document.getElementById('section-styles');
  const secLibrary = document.querySelector('.library-section');
  const detTrace = document.getElementById('details-trace');

  if (secRooms) secRooms.classList.toggle('hidden', tabKey !== 'rooms');
  if (secBuild) secBuild.classList.toggle('hidden', tabKey !== 'build');
  if (secStyles) secStyles.classList.toggle('hidden', tabKey !== 'style');

  // Kataloogi raamatukogu nähtavus
  const isLibraryTab = tabKey === 'build' || tabKey === 'furnish' || tabKey === 'garden';
  if (secLibrary) secLibrary.classList.toggle('hidden', !isLibraryTab);

  if (tabKey === 'rooms') {
    renderRoomModules();
  } else if (tabKey === 'style') {
    renderDesignStyles();
  } else if (tabKey === 'build') {
    renderCatalog('', 'Ehitus');
  } else if (tabKey === 'furnish') {
    renderCatalog('', 'Tubane');
  } else if (tabKey === 'garden') {
    renderCatalog('', 'Haljastus');
  } else if (tabKey === 'trace') {
    detTrace?.removeAttribute('hidden');
    detTrace?.scrollIntoView({ behavior: 'smooth' });
  }
}

document.getElementById('tab-rooms')?.addEventListener('click', () => switchSidebarTab('rooms'));
document.getElementById('tab-build')?.addEventListener('click', () => switchSidebarTab('build'));
document.getElementById('tab-furnish')?.addEventListener('click', () => switchSidebarTab('furnish'));
document.getElementById('tab-style')?.addEventListener('click', () => switchSidebarTab('style'));
document.getElementById('tab-garden')?.addEventListener('click', () => switchSidebarTab('garden'));
document.getElementById('tab-trace')?.addEventListener('click', () => switchSidebarTab('trace'));

// ---- ARHITEKTUURSED RUUMIMOODULID (KIIRRUUMID) ----
function renderRoomModules() {
  const container = document.getElementById('room-modules-gallery');
  if (!container) return;
  container.innerHTML = Object.entries(ROOM_MODULES).map(([key, m]) => `
    <div class="room-module-card" data-room-key="${key}">
      <div class="room-module-header">
        <span class="room-module-icon">${m.icon || '🏠'}</span>
        <div class="room-module-titles">
          <h4>${m.name || key}</h4>
          <span class="room-module-meta">${m.width} × ${m.depth} m · ${(m.width * m.depth).toFixed(1)} m²</span>
        </div>
      </div>
      <p class="room-module-desc">${m.desc || ''}</p>
      <div class="room-module-furniture-tags">
        ${(m.items || m.furniture || []).map(f => `<span class="room-module-tag">${f.type || f.catalogKey || 'ese'}</span>`).join('')}
      </div>
      <button type="button" class="btn-place-room" data-module="${key}">＋ Lisa plaanile</button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-place-room').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.module;
      placeRoomModule(key);
    };
  });
}

function placeRoomModule(moduleKey) {
  const modDef = ROOM_MODULES[moduleKey];
  if (!modDef) return;

  const mode = document.getElementById('room-placement-mode')?.value || 'center';
  let ox = controls.target.x, oz = controls.target.z;

  if (mode === 'center') {
    ox = L / 2 + 1;
    oz = W / 2;
  } else if (mode === 'next') {
    // Kui seinu juba on, leia parempoolne vaba ala
    if (walls.length) {
      let maxX = -Infinity, avgZ = 0;
      walls.forEach(w => {
        maxX = Math.max(maxX, w.x1, w.x2);
        avgZ += (w.z1 + w.z2) / 2;
      });
      avgZ /= walls.length;
      ox = maxX + modDef.width / 2 + 0.8;
      oz = avgZ;
    }
  }

  // Ehita ruumi seinad, uksed, aknad ja sisustus
  const built = buildRoomModule(moduleKey, ox, oz);
  if (!built) return;

  // Lisa seinad
  (built.walls || []).forEach(w => {
    walls.push(w);
    rebuildWallMesh(w);
  });

  // Lisa ruumi põrand
  if (built.room) {
    rooms.push(built.room);
  }

  // Lisa sisustusesemed kataloogist
  (built.items || built.furniture || []).forEach(item => {
    const assetKey = item.type || item.catalogKey;
    const o = addAsset(assetKey, item.x, item.z, item.rotY || item.ry || 0, item.scale || item.s || 1);
    if (o && item.mat) {
      // rakenda mööblile spetsiifiline viimistlus kui vaja
      o.userData.customMat = item.mat;
    }
  });

  rebuildAllWalls();
  updatePlotCompliance();
  pushHist();
  refreshList();
  refreshQuote();
  runErgoCheck();
  setStatus(`Lisatud ruumilahendus: ${modDef.name} (${(modDef.width * modDef.depth).toFixed(1)} m²)`);
}

// Kohandatud ristkülikruumi loomine
document.getElementById('btn-create-custom-room')?.addEventListener('click', () => {
  const wVal = THREE.MathUtils.clamp(parseFloat(document.getElementById('custom-room-w')?.value) || 5.0, 2, 25);
  const dVal = THREE.MathUtils.clamp(parseFloat(document.getElementById('custom-room-d')?.value) || 4.0, 2, 25);
  const floorMat = document.getElementById('custom-room-floor')?.value || 'parquet';

  const ox = controls.target.x;
  const oz = controls.target.z;
  const hW = wVal / 2, hD = dVal / 2;
  const h = 2.6, t = 0.22;

  const w1 = { id: uid(), x1: ox - hW, z1: oz - hD, x2: ox + hW, z2: oz - hD, h, t, mat: 'wood', openings: [{ type: 'window', along: hW, width: 1.4, height: 1.3, sill: 0.85 }] };
  const w2 = { id: uid(), x1: ox + hW, z1: oz - hD, x2: ox + hW, z2: oz + hD, h, t, mat: 'wood', openings: [] };
  const w3 = { id: uid(), x1: ox + hW, z1: oz + hD, x2: ox - hW, z2: oz + hD, h, t, mat: 'wood', openings: [{ type: 'door', along: hW, width: 0.9, height: 2.1 }] };
  const w4 = { id: uid(), x1: ox - hW, z1: oz + hD, x2: ox - hW, z2: oz - hD, h, t, mat: 'wood', openings: [] };

  [w1, w2, w3, w4].forEach(w => {
    walls.push(w);
    rebuildWallMesh(w);
  });

  const area = +(wVal * dVal).toFixed(2);
  rooms.push({
    id: uid(),
    name: `Tuba (${area.toFixed(1).replace('.', ',')} m²)`,
    x: +ox.toFixed(2),
    z: +oz.toFixed(2),
    area,
    floorMat,
  });

  rebuildAllWalls();
  updatePlotCompliance();
  pushHist();
  refreshList();
  refreshQuote();
  runErgoCheck();
  setStatus(`Loodud ruum: ${wVal} × ${dVal} m (${area} m²)`);
});

// ---- HARMOONILISED DISAINISTIILID JA PALETID ----
function renderDesignStyles() {
  const container = document.getElementById('design-styles-list');
  if (!container) return;

  container.innerHTML = Object.entries(DESIGN_STYLES).map(([key, s]) => {
    const swatches = s.swatches || [s.accentColor || '#176b52', '#f8fafc', '#767c85', '#b5824c'];
    const title = s.name || s.title || key;
    const features = s.features || [
      `Seinad: ${s.wallMat || 'krohv'}`,
      `Põrand: ${s.floorMat || 'parkett'}`,
      `Katus: ${s.roofMat || 'tume plekk'}`
    ];

    return `
    <div class="design-style-card" data-style-key="${key}">
      <div class="design-style-head">
        <h4>${s.icon || '🎨'} ${title}</h4>
        <div class="style-palette-preview">
          ${swatches.slice(0, 4).map(c => `<span class="style-swatch" style="background:${c}"></span>`).join('')}
        </div>
      </div>
      <p class="design-style-desc">${s.desc || ''}</p>
      <div class="design-style-features">
        ${features.map(f => `<span class="style-feature-chip">✓ ${f}</span>`).join('')}
      </div>
      <div class="style-apply-row">
        <button type="button" class="btn-apply-style-all" data-style="${key}">Rakenda tervele majale</button>
        <button type="button" class="btn-apply-style-room" data-style="${key}">Valitud ruumile</button>
      </div>
    </div>
  `;
  }).join('');

  container.querySelectorAll('.btn-apply-style-all').forEach(b => {
    b.onclick = () => applyDesignStyle(b.dataset.style, 'all');
  });
  container.querySelectorAll('.btn-apply-style-room').forEach(b => {
    b.onclick = () => applyDesignStyle(b.dataset.style, 'room');
  });
}

function applyDesignStyle(styleKey, scope = 'all') {
  const style = DESIGN_STYLES[styleKey];
  if (!style) return;
  const styleTitle = style.name || style.title || styleKey;

  if (scope === 'all') {
    walls.forEach(w => { w.mat = style.wallMat; });
    rooms.forEach(r => { r.floorMat = style.floorMat; });
    roofConfig.material = style.roofMat;
    const roofSel = document.getElementById('roof-material-select');
    if (roofSel) roofSel.value = style.roofMat;

    rebuildAllWalls();
    pushHist();
    refreshQuote();
    setStatus(`Rakendatud disainistiil "${styleTitle}" kogu hoonele`);
  } else if (scope === 'room') {
    let targetRoom = null;
    if (selected && selected.userData.kind === 'room') {
      targetRoom = rooms.find(r => r.id === selected.userData.roomId);
    } else if (selected && selected.userData.movable) {
      targetRoom = findContainingRoom(selected.position.x, selected.position.z, rooms);
    } else if (rooms.length > 0) {
      targetRoom = rooms[0];
    }

    if (targetRoom) {
      targetRoom.floorMat = style.floorMat;
      rebuildRooms();
      pushHist();
      setStatus(`Rakendatud "${styleTitle}" ruumile: ${targetRoom.name}`);
    } else {
      setStatus('Vali esmalt ruum või mööbliese ruumis');
    }
  }
}

// ---- ERGONOOMIKA & LIIKUMISTEEDE ANALÜÜSI MOOTOR ----
let ergoGuidesEnabled = true;

function runErgoCheck() {
  const result = analyzeErgonomics(walls, rooms, allEditable());
  const badge = document.getElementById('ergo-badge');
  const badgeText = document.getElementById('ergo-text');

  if (badge && badgeText) {
    badge.className = `ergo-badge ${result.badgeStatus}`;
    badgeText.textContent = `Ergonoomika: ${result.badgeStatus === 'good' ? 'Suurepärane' : result.badgeStatus === 'warn' ? '1 kitsaskoht' : 'Tähelepanu!'}`;
  }

  // Uuenda modaalakna sisu
  const summaryStrip = document.getElementById('ergo-modal-summary');
  const modalTitle = document.getElementById('ergo-modal-title');
  const modalDesc = document.getElementById('ergo-modal-desc');
  const statDoors = document.getElementById('ergo-stat-doors');
  const statClearance = document.getElementById('ergo-stat-clearance');
  const statItems = document.getElementById('ergo-stat-items');
  const issuesList = document.getElementById('ergo-issues-list');

  if (summaryStrip) summaryStrip.className = `ergo-summary-strip ${result.badgeStatus}`;
  if (modalTitle) modalTitle.textContent = result.badgeStatus === 'good' ? 'Ergonoomika: Suurepärane' : result.badgeStatus === 'warn' ? 'Ergonoomika: Väikesed kitsaskohad' : 'Ergonoomika: Vajab tähelepanu';
  if (modalDesc) modalDesc.textContent = result.summary;
  if (statDoors) statDoors.textContent = `${result.stats.doorClearanceRatio}% vaba`;
  if (statClearance) statClearance.textContent = `${result.stats.minClearanceM} m`;
  if (statItems) statItems.textContent = `${result.stats.totalItems} tk`;

  if (issuesList) {
    if (!result.issues || result.issues.length === 0) {
      issuesList.innerHTML = '<p class="muted" style="font-size:0.82rem; margin:0.4rem 0;">Plaanil ei leitud ühtegi kriitilist uste blokeeringut ega ergonoomilist konflikti.</p>';
    } else {
      issuesList.innerHTML = result.issues.map(iss => `
        <div class="ergo-issue-item ${iss.type}">
          <span class="ergo-issue-icon">${iss.type === 'blocked_door' ? '🚪⚠️' : '🚶⚠️'}</span>
          <div>
            <strong>${iss.title}</strong>
            <p>${iss.desc}</p>
          </div>
        </div>
      `).join('');
    }
  }

  return result;
}

// Ergonoomika nupu ja modaali sündmused
document.getElementById('ergo-badge')?.addEventListener('click', () => {
  runErgoCheck();
  document.getElementById('modal-ergo')?.classList.remove('hidden');
});
document.getElementById('btn-ergo')?.addEventListener('click', e => {
  ergoGuidesEnabled = !ergoGuidesEnabled;
  document.getElementById('btn-ergo')?.classList.toggle('active', ergoGuidesEnabled);
  runErgoCheck();
  setStatus(ergoGuidesEnabled ? 'Ergonoomika ja liikumisruumi kontroll sisse lülitatud' : 'Ergonoomika juhised peidetud');
});
document.getElementById('btn-ergo-close')?.addEventListener('click', () => {
  document.getElementById('modal-ergo')?.classList.add('hidden');
});
document.getElementById('btn-ergo-close-2')?.addEventListener('click', () => {
  document.getElementById('modal-ergo')?.classList.add('hidden');
});

// Ruumide tuvastus ja Arhitektuurne plaan / Blueprint eksport
document.getElementById('btn-detect-rooms')?.addEventListener('click', () => {
  const r = detectRoomsFromWalls(true);
  setStatus(r.length ? `Tuvastatud ${r.length} ruumi` : 'Suletud ruume ei leitud seintest');
});
document.getElementById('btn-pdf')?.addEventListener('click', () => {
  openBlueprintModal();
});
document.getElementById('btn-blueprint-modal')?.addEventListener('click', () => {
  openBlueprintModal();
});

// Arhitektuurne SVG CAD generaator
let blueprintCadStyle = false;

function generateArchitecturalSvg(calc, cadStyle = false) {
  const { x: cx, z: cz } = plotCenter();
  const halfW = plotConfig.width / 2;
  const halfD = plotConfig.depth / 2;
  const margin = 2.8;

  const minX = cx - halfW - margin;
  const maxX = cx + halfW + margin;
  const minZ = cz - halfD - margin;
  const maxZ = cz + halfD + margin;
  const rangeX = maxX - minX;
  const rangeZ = maxZ - minZ;

  const viewW = 900;
  const viewH = Math.round((rangeZ / rangeX) * viewW);

  const toSvgX = x => (((x - minX) / rangeX) * viewW).toFixed(1);
  const toSvgY = z => (((z - minZ) / rangeZ) * viewH).toFixed(1);
  const toLen = len => ((len / rangeX) * viewW).toFixed(1);

  const bg = cadStyle ? '#0c1524' : '#ffffff';
  const plotLine = cadStyle ? '#2ecc71' : '#1f8b4c';
  const plotFill = cadStyle ? 'rgba(46, 204, 113, 0.05)' : 'rgba(86, 150, 68, 0.05)';
  const setbackLine = cadStyle ? '#f39c12' : '#d35400';
  const wallExt = cadStyle ? '#00e5ff' : '#17212b';
  const wallInt = cadStyle ? '#e2e8f0' : '#4a5568';
  const doorStroke = cadStyle ? '#f1c40f' : '#2980b9';
  const winStroke = cadStyle ? '#38bdf8' : '#0284c7';
  const textMain = cadStyle ? '#f1f5f9' : '#0f172a';
  const textMuted = cadStyle ? '#94a3b8' : '#64748b';
  const gridColor = cadStyle ? 'rgba(0, 180, 216, 0.08)' : 'rgba(0, 0, 0, 0.04)';
  const dimLine = cadStyle ? '#4cc9f0' : '#176b52';

  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}" width="100%" height="auto" class="cad-svg">`;
  out += `<rect width="${viewW}" height="${viewH}" fill="${bg}" />`;

  // Ruudustik (5m võre)
  for (let gx = Math.ceil(minX / 5) * 5; gx <= maxX; gx += 5) {
    const sx = toSvgX(gx);
    out += `<line x1="${sx}" y1="0" x2="${sx}" y2="${viewH}" stroke="${gridColor}" stroke-width="1" />`;
  }
  for (let gz = Math.ceil(minZ / 5) * 5; gz <= maxZ; gz += 5) {
    const sy = toSvgY(gz);
    out += `<line x1="0" y1="${sy}" x2="${viewW}" y2="${sy}" stroke="${gridColor}" stroke-width="1" />`;
  }

  // 1. Krundi välispiir
  const px1 = toSvgX(cx - halfW), py1 = toSvgY(cz - halfD);
  const pw = toLen(plotConfig.width), ph = toLen(plotConfig.depth);
  out += `<rect x="${px1}" y="${py1}" width="${pw}" height="${ph}" fill="${plotFill}" stroke="${plotLine}" stroke-width="2.5" />`;

  // Krundi mõõdud piiril
  out += `<text x="${toSvgX(cx)}" y="${py1 - 8}" fill="${plotLine}" font-size="12" font-weight="bold" text-anchor="middle">Krundi laius: ${plotConfig.width.toFixed(2)} m</text>`;
  out += `<text x="${toSvgX(cx + halfW) + 12}" y="${toSvgY(cz)}" fill="${plotLine}" font-size="12" font-weight="bold" text-anchor="start" transform="rotate(90 ${toSvgX(cx + halfW) + 12} ${toSvgY(cz)})">Krundi sügavus: ${plotConfig.depth.toFixed(2)} m</text>`;

  // 2. 4m Ehituskeeluala (ehitusjoon)
  const sb = Math.min(plotConfig.setback, Math.min(halfW - 0.5, halfD - 0.5));
  if (sb > 0) {
    const sx1 = toSvgX(cx - halfW + sb), sy1 = toSvgY(cz - halfD + sb);
    const sw = toLen(plotConfig.width - 2 * sb), sh = toLen(plotConfig.depth - 2 * sb);
    out += `<rect x="${sx1}" y="${sy1}" width="${sw}" height="${sh}" fill="none" stroke="${setbackLine}" stroke-width="2" stroke-dasharray="8,5" />`;
    out += `<text x="${sx1 + 8}" y="${sy1 + 16}" fill="${setbackLine}" font-size="10" font-weight="bold">4.0 m EHITUSPIIR / EHITUSALA</text>`;
  }

  // 3. Piirikivid PK1-PK4
  const corners = [
    { x: cx - halfW, z: cz - halfD, lbl: 'PK1' },
    { x: cx + halfW, z: cz - halfD, lbl: 'PK2' },
    { x: cx + halfW, z: cz + halfD, lbl: 'PK3' },
    { x: cx - halfW, z: cz + halfD, lbl: 'PK4' },
  ];
  corners.forEach(c => {
    const sx = toSvgX(c.x), sy = toSvgY(c.z);
    out += `<circle cx="${sx}" cy="${sy}" r="5" fill="${plotLine}" />`;
    out += `<text x="${sx + 7}" y="${sy - 7}" fill="${textMain}" font-size="10" font-weight="bold">${c.lbl}</text>`;
  });

  // 4. Haljastus & õueobjektid
  allEditable().filter(o => o.userData.kind !== 'wall' && o.userData.kind !== 'room').forEach(o => {
    const ox = toSvgX(o.position.x);
    const oy = toSvgY(o.position.z);
    const type = o.userData.type;

    if (type === 'deckModule') {
      const dw = toLen(2.4), dh = toLen(2.4);
      out += `<rect x="${ox - dw/2}" y="${oy - dh/2}" width="${dw}" height="${dh}" fill="${cadStyle ? 'rgba(217,119,6,0.15)' : 'rgba(217,119,6,0.1)'}" stroke="#d97706" stroke-width="1.5" />`;
      out += `<text x="${ox}" y="${oy}" fill="#d97706" font-size="9" text-anchor="middle">Terrass</text>`;
    } else if (type === 'swimmingPool') {
      const pw = toLen(5.0), ph = toLen(3.0);
      out += `<rect x="${ox - pw/2}" y="${oy - ph/2}" width="${pw}" height="${ph}" rx="8" fill="${cadStyle ? 'rgba(6,182,212,0.25)' : 'rgba(6,182,212,0.18)'}" stroke="#06b6d4" stroke-width="2" />`;
      out += `<text x="${ox}" y="${oy + 3}" fill="#0891b2" font-size="10" font-weight="bold" text-anchor="middle">Bassein 5×3 m</text>`;
    } else if (type === 'saunaBarrel') {
      const r = toLen(1.1);
      out += `<circle cx="${ox}" cy="${oy}" r="${r}" fill="${cadStyle ? 'rgba(180,83,9,0.2)' : 'rgba(180,83,9,0.12)'}" stroke="#b45309" stroke-width="2" />`;
      out += `<text x="${ox}" y="${oy + 3}" fill="#b45309" font-size="9" font-weight="bold" text-anchor="middle">Tünnisaun</text>`;
    } else if (type === 'carModern') {
      const cw = toLen(2.0), cl = toLen(4.2);
      out += `<rect x="${ox - cw/2}" y="${oy - cl/2}" width="${cw}" height="${cl}" rx="6" fill="${cadStyle ? '#334155' : '#e2e8f0'}" stroke="${cadStyle ? '#94a3b8' : '#475569'}" stroke-width="1.5" />`;
      out += `<text x="${ox}" y="${oy + 3}" fill="${textMuted}" font-size="9" text-anchor="middle">Auto</text>`;
    } else if (['pine', 'appleTree', 'birch'].includes(type)) {
      const tr = toLen(type === 'pine' ? 1.6 : 1.4);
      out += `<circle cx="${ox}" cy="${oy}" r="${tr}" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3,2" />`;
      out += `<circle cx="${ox}" cy="${oy}" r="2" fill="#22c55e" />`;
    }
  });

  // 5. Seinad ja avatäited
  walls.forEach(w => {
    const x1 = toSvgX(w.x1), y1 = toSvgY(w.z1);
    const x2 = toSvgX(w.x2), y2 = toSvgY(w.z2);
    const isExt = (w.t || 0.15) >= 0.2;
    const strokeW = isExt ? 6 : 3.5;
    const strokeColor = isExt ? wallExt : wallInt;

    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linecap="round" />`;

    // Avatäited seinal (uksed, aknad)
    const len = wallLength(w);
    if (len > 0.1 && (w.openings || []).length) {
      const angle = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);
      (w.openings || []).forEach(op => {
        const ox = w.x1 + Math.cos(angle) * op.along;
        const oz = w.z1 + Math.sin(angle) * op.along;
        const sox = toSvgX(ox), soy = toSvgY(oz);
        const opW = toLen(op.width || 0.9);

        if (op.type === 'door') {
          out += `<circle cx="${sox}" cy="${soy}" r="3" fill="${doorStroke}" />`;
          out += `<line x1="${sox}" y1="${soy}" x2="${+sox + Math.cos(angle + Math.PI/2)*opW}" y2="${+soy + Math.sin(angle + Math.PI/2)*opW}" stroke="${doorStroke}" stroke-width="1.5" />`;
        } else {
          out += `<circle cx="${sox}" cy="${soy}" r="2.5" fill="${winStroke}" />`;
        }
      });
    }

    // Seina pikkuse mõõdik
    if (len >= 0.8) {
      const mx = (parseFloat(x1) + parseFloat(x2)) / 2;
      const my = (parseFloat(y1) + parseFloat(y2)) / 2;
      out += `<rect x="${mx - 18}" y="${my - 8}" width="36" height="15" rx="3" fill="${bg}" stroke="${dimLine}" stroke-width="0.8" opacity="0.92" />`;
      out += `<text x="${mx}" y="${my + 3}" fill="${dimLine}" font-size="9" font-weight="bold" text-anchor="middle">${len.toFixed(2)}</text>`;
    }
  });

  // 6. Ruumid (nimetused ja ruutmeetrid)
  rooms.forEach(r => {
    const rx = toSvgX(r.x), ry = toSvgY(r.z);
    const cleanName = (r.name || 'Ruum').replace(/\s*\(\d+([.,]\d+)?\s*m²\)/, '').trim();
    out += `<circle cx="${rx}" cy="${ry - 12}" r="3" fill="${textMuted}" />`;
    out += `<text x="${rx}" y="${ry - 2}" fill="${textMain}" font-size="12" font-weight="700" text-anchor="middle">${cleanName}</text>`;
    out += `<text x="${rx}" y="${ry + 13}" fill="${textMuted}" font-size="10" font-weight="600" text-anchor="middle">${Number(r.area).toFixed(1).replace('.', ',')} m²</text>`;
  });

  // 7. Põhjanool (North Arrow)
  const navX = viewW - 60, navY = 60;
  out += `<g transform="translate(${navX}, ${navY}) rotate(${plotConfig.northAngle})">`;
  out += `<circle r="26" fill="${cadStyle ? '#132235' : '#f8fafc'}" stroke="${plotLine}" stroke-width="1.5" />`;
  out += `<polygon points="0,-20 6,0 0,-3" fill="#e74c3c" />`;
  out += `<polygon points="0,-20 -6,0 0,-3" fill="#c0392b" />`;
  out += `<polygon points="0,20 6,0 0,-3" fill="#94a3b8" />`;
  out += `<polygon points="0,20 -6,0 0,-3" fill="#64748b" />`;
  out += `<text y="-8" fill="#e74c3c" font-size="10" font-weight="bold" text-anchor="middle">P</text>`;
  out += `</g>`;

  // 8. Joonmõõtkava (Linear scale bar)
  const barLen10m = toLen(10);
  const barX = 25, barY = viewH - 22;
  out += `<g transform="translate(${barX}, ${barY})">`;
  out += `<line x1="0" y1="0" x2="${barLen10m}" y2="0" stroke="${textMain}" stroke-width="2" />`;
  out += `<line x1="0" y1="-4" x2="0" y2="4" stroke="${textMain}" stroke-width="2" />`;
  out += `<line x1="${barLen10m / 2}" y1="-3" x2="${barLen10m / 2}" y2="3" stroke="${textMain}" stroke-width="1.5" />`;
  out += `<line x1="${barLen10m}" y1="-4" x2="${barLen10m}" y2="4" stroke="${textMain}" stroke-width="2" />`;
  out += `<text x="0" y="-7" fill="${textMuted}" font-size="9" text-anchor="middle">0</text>`;
  out += `<text x="${barLen10m / 2}" y="-7" fill="${textMuted}" font-size="9" text-anchor="middle">5m</text>`;
  out += `<text x="${barLen10m}" y="-7" fill="${textMuted}" font-size="9" text-anchor="middle">10m</text>`;
  out += `<text x="${barLen10m + 16}" y="0" fill="${textMain}" font-size="10" font-weight="bold" text-anchor="start">Mõõtkava 1:100 (digitaalne)</text>`;
  out += `</g>`;

  out += `</svg>`;
  return out;
}

function renderArchitecturalTitleBlock(projName, calc) {
  const plotArea = plotConfig.width * plotConfig.depth;
  const coveragePercent = plotArea > 0 ? ((calc.buildingFootprint / plotArea) * 100).toFixed(1) : 0;
  const dateStr = new Date().toLocaleDateString('et-EE');
  const roofDesc = `${roofConfig.type === 'gable' ? 'Viilkatus' : roofConfig.type === 'shed' ? 'Ühepoolne katus' : 'Lamekatus'} (${roofConfig.pitch}°)`;

  return `
    <div class="arch-title-block">
      <div class="block-col">
        <div class="row"><span>PROJEKT</span><strong>${projName}</strong></div>
        <div class="row"><span>KRUNDI MÕÕDUD</span><strong>${plotConfig.width} × ${plotConfig.depth} m (${plotArea} m²)</strong></div>
        <div class="row"><span>ASUKOHT / EHITUSALA</span><strong>Ehitusjoon 4.0 m piirist</strong></div>
        <div class="row"><span>KUUPÄEV</span><strong>${dateStr}</strong></div>
      </div>
      <div class="block-col">
        <div class="row"><span>DOKUMENT</span><strong>Arhitektuurne eskiisplaan</strong></div>
        <div class="row"><span>STAATUS</span><strong>Eelprojekt / Asendiplaan</strong></div>
        <div class="row"><span>KOOSTAJA</span><strong>KoduDisain Studio</strong></div>
        <div class="row"><span>KATUS</span><strong>${roofDesc}</strong></div>
      </div>
      <div class="block-col">
        <div class="row"><span>EHITUSALUNE PIND</span><strong>${calc.buildingFootprint} m²</strong></div>
        <div class="row"><span>KRUNDI TÄISEHITUS</span><strong>${coveragePercent}% (max ${plotConfig.maxCoverage}%)</strong></div>
        <div class="row"><span>SULETUD NETOPIND</span><strong>${calc.netFloorArea} m²</strong></div>
        <div class="row"><span>HINNANGULINE MAKSUMUS</span><strong>~${calc.costs.grandTotal.toLocaleString('et-EE')} €</strong></div>
      </div>
    </div>
  `;
}

function openBlueprintModal() {
  if (!rooms.length) detectRoomsFromWalls(true);
  renderBlueprintModalContent();
  document.getElementById('blueprint-modal')?.classList.remove('hidden');
  setStatus('Arhitektuurne plaan avatud');
}

function renderBlueprintModalContent() {
  const calc = calculateConstruction(walls, rooms, allEditable(), roofConfig);
  const projName = document.getElementById('project-name')?.value || 'Kodu ja krundi projekt';
  const container = document.getElementById('blueprint-preview-container');
  if (!container) return;

  const svgHtml = generateArchitecturalSvg(calc, blueprintCadStyle);
  const titleBlockHtml = renderArchitecturalTitleBlock(projName, calc);

  const bomHtml = `
    <div class="blueprint-bom">
      <h4 style="margin: 0.8rem 0 0.4rem; font-size: 0.85rem; color: #176b52; text-transform: uppercase; letter-spacing: 0.05em;">Materjalide ja mahtude spetsifikatsioon (BOM)</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; border: 1px solid #dde2e8;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 5px 8px; border: 1px solid #dde2e8;">Ehitusosa</th>
            <th style="padding: 5px 8px; border: 1px solid #dde2e8;">Parameetrid</th>
            <th style="padding: 5px 8px; border: 1px solid #dde2e8; text-align: right;">Maht</th>
            <th style="padding: 5px 8px; border: 1px solid #dde2e8; text-align: right;">Orienteeruv maksumus</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding: 4px 8px; border: 1px solid #dde2e8;"><strong>Välis- ja siseseinad</strong></td><td style="padding: 4px 8px; border: 1px solid #dde2e8;">Puitkarkass / plokk, viimistletud</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${calc.netWallArea} m²</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${calc.costs.wallTimberCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td style="padding: 4px 8px; border: 1px solid #dde2e8;"><strong>Katus & sarikad</strong></td><td style="padding: 4px 8px; border: 1px solid #dde2e8;">${roofConfig.type}, kalle ${roofConfig.pitch}°</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${calc.roofArea} m²</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${calc.costs.roofCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td style="padding: 4px 8px; border: 1px solid #dde2e8;"><strong>Avatäited</strong></td><td style="padding: 4px 8px; border: 1px solid #dde2e8;">${calc.doorsCount} ust, ${calc.windowsCount} akent</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${calc.doorsCount + calc.windowsCount} tk</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${(calc.costs.doorsCost + calc.costs.windowsCost).toLocaleString('et-EE')} €</td></tr>
          <tr><td style="padding: 4px 8px; border: 1px solid #dde2e8;"><strong>Vundament & põrandad</strong></td><td style="padding: 4px 8px; border: 1px solid #dde2e8;">Plaat/lintvundament, soojustus</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${calc.buildingFootprint} m²</td><td style="padding: 4px 8px; border: 1px solid #dde2e8; text-align: right;">${(calc.costs.foundationCost + calc.costs.interiorCost).toLocaleString('et-EE')} €</td></tr>
          <tr style="background: #eef8f3; font-weight: bold;"><td style="padding: 5px 8px; border: 1px solid #dde2e8;">KOKKU HINNANGULINE</td><td style="padding: 5px 8px; border: 1px solid #dde2e8;">Koos tööjõu (~38%) ja materjalidega</td><td style="padding: 5px 8px; border: 1px solid #dde2e8; text-align: right;">Neto ${calc.netFloorArea} m²</td><td style="padding: 5px 8px; border: 1px solid #dde2e8; text-align: right;">~${calc.costs.grandTotal.toLocaleString('et-EE')} €</td></tr>
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = `
    <div class="blueprint-sheet ${blueprintCadStyle ? 'cad-sheet' : 'arch-sheet'}">
      <div class="blueprint-svg-wrap">
        ${svgHtml}
      </div>
      ${titleBlockHtml}
      ${bomHtml}
    </div>
  `;
}

function downloadBlueprintSvg() {
  const calc = calculateConstruction(walls, rooms, allEditable(), roofConfig);
  const svgData = generateArchitecturalSvg(calc, blueprintCadStyle);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = (document.getElementById('project-name')?.value || 'plaan').replace(/\s+/g, '_');
  a.href = url;
  a.download = `arhi-plaan-${name}.svg`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('SVG joonis alla laaditud');
}

// Blueprint modali nupud
document.getElementById('btn-blueprint-close')?.addEventListener('click', () => {
  document.getElementById('blueprint-modal')?.classList.add('hidden');
});
document.getElementById('btn-blueprint-close-2')?.addEventListener('click', () => {
  document.getElementById('blueprint-modal')?.classList.add('hidden');
});
document.getElementById('btn-blueprint-style')?.addEventListener('click', () => {
  blueprintCadStyle = !blueprintCadStyle;
  const btn = document.getElementById('btn-blueprint-style');
  if (btn) btn.textContent = blueprintCadStyle ? 'Arhitektuurne valge' : 'CAD tume vaade';
  renderBlueprintModalContent();
});
document.getElementById('btn-blueprint-download-svg')?.addEventListener('click', downloadBlueprintSvg);
document.getElementById('btn-print-blueprint')?.addEventListener('click', () => window.print());

// Spetsifikatsiooni ja BOM mahutabeli modal
const specModal = document.getElementById('spec-modal');
document.getElementById('btn-spec-modal')?.addEventListener('click', () => {
  if (!rooms.length) detectRoomsFromWalls(true);
  const calc = calculateConstruction(walls, rooms, allEditable(), roofConfig);
  const contentEl = document.getElementById('spec-modal-content');
  const projName = document.getElementById('project-name')?.value || 'Projekt';
  if (contentEl) contentEl.innerHTML = renderSpecificationHtml(projName, calc, rooms);
  specModal?.classList.remove('hidden');
});
document.getElementById('btn-spec-close')?.addEventListener('click', () => specModal?.classList.add('hidden'));
document.getElementById('btn-spec-close-2')?.addEventListener('click', () => specModal?.classList.add('hidden'));
document.getElementById('btn-print-spec')?.addEventListener('click', () => window.print());

// ============================================================================
// KONSTRUKTSIOONI KIHTIDE & RISTLÕIKE STUUDIO (ASSEMBLY CROSS-SECTION STUDIO)
// ============================================================================
let assemblyStudioState = {
  tab: 'wall', // 'wall' | 'floor'
  targetId: null,
  assembly: null,
};

function openAssemblyStudio(type = 'wall', targetItem = null) {
  assemblyStudioState.tab = type;

  // Sihtobjekti tuvastus
  if (targetItem) {
    assemblyStudioState.targetId = targetItem.id;
  } else if (selected?.userData.kind === 'wall') {
    assemblyStudioState.tab = 'wall';
    assemblyStudioState.targetId = selected.userData.wallId;
  } else if (selected?.userData.kind === 'room') {
    assemblyStudioState.tab = 'floor';
    assemblyStudioState.targetId = selected.userData.roomId;
  } else if (type === 'wall' && walls.length > 0) {
    assemblyStudioState.targetId = walls[0].id;
  } else if (type === 'floor' && rooms.length > 0) {
    assemblyStudioState.targetId = rooms[0].id;
  } else {
    assemblyStudioState.targetId = null;
  }

  // Vali algne konstruktsioon
  if (assemblyStudioState.tab === 'wall') {
    const w = walls.find(x => x.id === assemblyStudioState.targetId) || walls[0];
    const key = w?.assemblyKey || ((w?.t || 0.15) >= 0.22 ? 'timber_ext_250' : 'timber_int_light');
    const baseAsm = w?.assembly || WALL_ASSEMBLIES[key] || WALL_ASSEMBLIES.timber_ext_250;
    assemblyStudioState.assembly = JSON.parse(JSON.stringify(baseAsm));
  } else {
    const r = rooms.find(x => x.id === assemblyStudioState.targetId) || rooms[0];
    const key = r?.floorAssemblyKey || (r?.floorMat === 'paver' ? 'terrace_paver_ground' : r?.floorMat === 'tile_gray' ? 'ground_slab_tile' : 'ground_slab_heated');
    const baseAsm = r?.floorAssembly || FLOOR_ASSEMBLIES[key] || FLOOR_ASSEMBLIES.ground_slab_heated;
    assemblyStudioState.assembly = JSON.parse(JSON.stringify(baseAsm));
  }

  // Vahelehtede lülitus
  document.getElementById('tab-assembly-wall')?.classList.toggle('active', assemblyStudioState.tab === 'wall');
  document.getElementById('tab-assembly-floor')?.classList.toggle('active', assemblyStudioState.tab === 'floor');

  // Rakendamise ulatuse valikud
  const isWall = (assemblyStudioState.tab === 'wall');
  document.getElementById('asm-scope-ext-wrap')?.classList.toggle('hidden', !isWall);
  document.getElementById('asm-scope-int-wrap')?.classList.toggle('hidden', !isWall);
  document.getElementById('asm-scope-room-wrap')?.classList.toggle('hidden', isWall);

  populateAssemblyPresetsDropdown();
  renderAssemblyStudioContent();

  document.getElementById('assembly-modal')?.classList.remove('hidden');
  setStatus('Konstruktsiooni ristlõike stuudio avatud');
}

function populateAssemblyPresetsDropdown() {
  const selectEl = document.getElementById('modal-assembly-preset');
  if (!selectEl) return;
  const isWall = (assemblyStudioState.tab === 'wall');
  const presets = isWall ? WALL_ASSEMBLIES : FLOOR_ASSEMBLIES;

  let optionsHtml = '';
  for (const [key, p] of Object.entries(presets)) {
    const phy = calculateAssemblyPhysics(p, !isWall);
    optionsHtml += `<option value="${key}">${p.name} (${phy.totalMm} mm, U ~ ${phy.uValue})</option>`;
  }
  optionsHtml += `<option value="custom">-- Kohandatud ehituslikud kihid --</option>`;
  selectEl.innerHTML = optionsHtml;

  const currentName = assemblyStudioState.assembly?.name;
  const matchKey = Object.keys(presets).find(k => presets[k].name === currentName);
  selectEl.value = matchKey || 'custom';
}

function renderAssemblyStudioContent() {
  const asm = assemblyStudioState.assembly;
  if (!asm) return;
  const isFloor = (assemblyStudioState.tab === 'floor');
  const physics = calculateAssemblyPhysics(asm, isFloor);

  // 1. Arhitektuurne vektor-ristlõige (CAD)
  const cadWrap = document.getElementById('assembly-cad-preview');
  if (cadWrap) {
    cadWrap.innerHTML = renderAssemblySvg(asm, isFloor);
  }

  // 2. Füüsikalised mõõdikud
  const uBadge = document.getElementById('assembly-u-badge');
  if (uBadge) {
    uBadge.textContent = `U = ${physics.uValue} W/m²K`;
    uBadge.className = `u-badge ${physics.uValue <= 0.16 ? 'good' : 'warn'}`;
  }

  const thickEl = document.getElementById('asm-metric-thick');
  if (thickEl) thickEl.textContent = `${physics.totalMm} mm`;
  const thickMEl = document.getElementById('asm-metric-thick-m');
  if (thickMEl) thickMEl.textContent = `${physics.totalM} m`;

  const uEl = document.getElementById('asm-metric-u');
  if (uEl) uEl.textContent = `${physics.uValue} W/m²K`;
  const classEl = document.getElementById('asm-metric-class');
  if (classEl) classEl.textContent = physics.energyClass;

  const rEl = document.getElementById('asm-metric-r');
  if (rEl) rEl.textContent = `${physics.R_total} m²K/W`;

  const countEl = document.getElementById('asm-layer-count');
  if (countEl) countEl.textContent = `${asm.layers.length} kihti`;

  // 3. Kihtide redaktor
  const listEl = document.getElementById('assembly-layers-list');
  if (listEl) {
    listEl.innerHTML = asm.layers.map((layer, idx) => {
      const matDef = LAYER_MATERIALS[layer.matId] || { color: '#cbd5e1', name: layer.matId };
      return `
        <div class="assembly-layer-row" data-idx="${idx}">
          <span class="layer-drag-handle" title="Kiht #${idx + 1}">#${idx + 1}</span>
          <span class="layer-swatch-badge" style="background:${matDef.color};"></span>
          <select class="layer-select-mat" data-idx="${idx}">
            ${Object.entries(LAYER_MATERIALS).map(([mId, mDef]) =>
              `<option value="${mId}" ${mId === layer.matId ? 'selected' : ''}>${mDef.name} (λ=${mDef.lambda || '—'})</option>`
            ).join('')}
          </select>
          <input type="number" class="layer-thick-input" min="1" max="800" step="1" value="${layer.thickMm}" data-idx="${idx}" />
          <span class="layer-unit">mm</span>
          <button type="button" class="icon-button layer-move-up" data-idx="${idx}" title="Liiguta ülespoole" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>▲</button>
          <button type="button" class="icon-button layer-move-down" data-idx="${idx}" title="Liiguta allapoole" ${idx === asm.layers.length - 1 ? 'disabled style="opacity:0.3"' : ''}>▼</button>
          <button type="button" class="layer-del-btn" data-idx="${idx}" title="Eemalda kiht" ${asm.layers.length <= 1 ? 'disabled style="opacity:0.3"' : ''}>✕</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.layer-select-mat').forEach(sel => {
      sel.onchange = e => {
        const i = +e.target.dataset.idx;
        asm.layers[i].matId = e.target.value;
        const presetEl = document.getElementById('modal-assembly-preset');
        if (presetEl) presetEl.value = 'custom';
        renderAssemblyStudioContent();
      };
    });

    listEl.querySelectorAll('.layer-thick-input').forEach(inp => {
      inp.oninput = e => {
        const i = +e.target.dataset.idx;
        const val = Math.max(1, Math.min(1200, +e.target.value || 10));
        asm.layers[i].thickMm = val;
        const presetEl = document.getElementById('modal-assembly-preset');
        if (presetEl) presetEl.value = 'custom';
        renderAssemblyStudioContent();
      };
    });

    listEl.querySelectorAll('.layer-move-up').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.idx;
        if (i > 0) {
          const temp = asm.layers[i];
          asm.layers[i] = asm.layers[i - 1];
          asm.layers[i - 1] = temp;
          const presetEl = document.getElementById('modal-assembly-preset');
          if (presetEl) presetEl.value = 'custom';
          renderAssemblyStudioContent();
        }
      };
    });

    listEl.querySelectorAll('.layer-move-down').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.idx;
        if (i < asm.layers.length - 1) {
          const temp = asm.layers[i];
          asm.layers[i] = asm.layers[i + 1];
          asm.layers[i + 1] = temp;
          const presetEl = document.getElementById('modal-assembly-preset');
          if (presetEl) presetEl.value = 'custom';
          renderAssemblyStudioContent();
        }
      };
    });

    listEl.querySelectorAll('.layer-del-btn').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.idx;
        if (asm.layers.length > 1) {
          asm.layers.splice(i, 1);
          const presetEl = document.getElementById('modal-assembly-preset');
          if (presetEl) presetEl.value = 'custom';
          renderAssemblyStudioContent();
        }
      };
    });
  }
}

function applyAssemblyStudioChanges() {
  const asm = assemblyStudioState.assembly;
  if (!asm) return;
  const isWall = (assemblyStudioState.tab === 'wall');
  const physics = calculateAssemblyPhysics(asm, !isWall);
  const scope = document.querySelector('input[name="asm-scope"]:checked')?.value || 'selected';

  if (isWall) {
    const targetW = walls.find(x => x.id === assemblyStudioState.targetId);
    if (scope === 'selected' && targetW) {
      targetW.assembly = JSON.parse(JSON.stringify(asm));
      targetW.t = physics.totalM;
      rebuildWallMesh(targetW);
    } else if (scope === 'all_ext') {
      walls.forEach(w => {
        if ((w.t || 0.15) >= 0.18 || w.assemblyKey?.includes('ext')) {
          w.assembly = JSON.parse(JSON.stringify(asm));
          w.t = physics.totalM;
          rebuildWallMesh(w);
        }
      });
    } else if (scope === 'all_int') {
      walls.forEach(w => {
        if ((w.t || 0.15) < 0.18 || w.assemblyKey?.includes('int')) {
          w.assembly = JSON.parse(JSON.stringify(asm));
          w.t = physics.totalM;
          rebuildWallMesh(w);
        }
      });
    } else if (targetW) {
      targetW.assembly = JSON.parse(JSON.stringify(asm));
      targetW.t = physics.totalM;
      rebuildWallMesh(targetW);
    }
  } else {
    // Põrand
    const targetR = rooms.find(x => x.id === assemblyStudioState.targetId);
    if (scope === 'selected' && targetR) {
      targetR.floorAssembly = JSON.parse(JSON.stringify(asm));
    } else {
      rooms.forEach(r => {
        r.floorAssembly = JSON.parse(JSON.stringify(asm));
      });
    }
    rebuildRooms();
  }

  rebuildDims();
  rebuildRoof();
  pushHist();
  refreshQuote();
  syncProps();

  document.getElementById('assembly-modal')?.classList.add('hidden');
  setStatus(`Konstruktsioon "${asm.name}" (${physics.totalMm} mm, U=${physics.uValue}) rakendatud!`);
}

// Modal sündmuste sidumine
document.getElementById('btn-open-assembly-tool')?.addEventListener('click', () => openAssemblyStudio('wall'));
document.getElementById('btn-open-wall-assembly')?.addEventListener('click', () => openAssemblyStudio('wall'));
document.getElementById('btn-open-floor-assembly')?.addEventListener('click', () => openAssemblyStudio('floor'));

document.getElementById('tab-assembly-wall')?.addEventListener('click', () => openAssemblyStudio('wall'));
document.getElementById('tab-assembly-floor')?.addEventListener('click', () => openAssemblyStudio('floor'));

document.getElementById('modal-assembly-preset')?.addEventListener('change', e => {
  const val = e.target.value;
  if (val === 'custom') return;
  const isWall = (assemblyStudioState.tab === 'wall');
  const presets = isWall ? WALL_ASSEMBLIES : FLOOR_ASSEMBLIES;
  if (presets[val]) {
    assemblyStudioState.assembly = JSON.parse(JSON.stringify(presets[val]));
    renderAssemblyStudioContent();
  }
});

document.getElementById('btn-add-layer')?.addEventListener('click', () => {
  const isWall = (assemblyStudioState.tab === 'wall');
  const defaultMat = isWall ? 'mineral_wool_soft' : 'eps_insulation';
  const defaultThick = isWall ? 50 : 100;
  assemblyStudioState.assembly?.layers.push({
    matId: defaultMat,
    thickMm: defaultThick,
  });
  const presetEl = document.getElementById('modal-assembly-preset');
  if (presetEl) presetEl.value = 'custom';
  renderAssemblyStudioContent();
});

document.getElementById('btn-assembly-apply')?.addEventListener('click', applyAssemblyStudioChanges);
document.getElementById('btn-assembly-close')?.addEventListener('click', () => {
  document.getElementById('assembly-modal')?.classList.add('hidden');
});
document.getElementById('btn-assembly-close-2')?.addEventListener('click', () => {
  document.getElementById('assembly-modal')?.classList.add('hidden');
});

function exportPdfPlan() {
  openBlueprintModal();
}

// Vaadete vahetamine (3D, 2D, Plaan, Jaluta)
let isWalking = false;
const walkPos = new THREE.Vector3(L / 2, FLOOR_Y + 1.7, W / 2 + 3);
let walkYaw = 0;
let walkPitch = 0;
const walkKeys = { w: false, a: false, s: false, d: false };

function setViewMode(mode) {
  viewMode = mode;
  isWalking = (mode === 'walk');
  document.getElementById('mode-3d').classList.toggle('active', mode === '3d');
  document.getElementById('mode-2d').classList.toggle('active', mode === '2d');
  document.getElementById('mode-blueprint')?.classList.toggle('active', mode === 'blueprint');
  document.getElementById('mode-walk')?.classList.toggle('active', mode === 'walk');
  document.getElementById('viewport')?.classList.toggle('blueprint', mode === 'blueprint');
  document.getElementById('walk-help')?.classList.toggle('hidden', !isWalking);

  const sceneLabel = document.getElementById('scene-mode-label');
  const sceneSub = document.getElementById('scene-mode-sub');

  if (mode === 'walk') {
    if (sceneLabel) sceneLabel.textContent = 'Jalutuskäik 1.7 m';
    if (sceneSub) sceneSub.textContent = 'Liigu nooltega/WASD ja vaata ruumi seest';
    camera = cameraPersp;
    controls.enabled = false;
    transform.detach();
    walkPos.set(controls.target.x, FLOOR_Y + 1.7, controls.target.z + 2);
    setStatus('🚶 Jalutuskäik: kasuta W, A, S, D liikumiseks ja hiirt vaatamiseks');
    return;
  }

  controls.enabled = true;
  if (sceneSub) sceneSub.textContent = 'Muuda, mõõda ja vaata tulemust';
  if (mode === '2d' || mode === 'blueprint') {
    if (sceneLabel) sceneLabel.textContent = mode === 'blueprint' ? 'Arhitektuurne plaan' : '2D pealtvaade';
    camera = cameraOrtho;
    controls.object = cameraOrtho;
    controls.enableRotate = false;
    cameraOrtho.position.set(L / 2 + 2, 45, W / 2);
    controls.target.set(L / 2 + 2, 0, W / 2);
  } else {
    if (sceneLabel) sceneLabel.textContent = '3D vaade';
    camera = cameraPersp;
    controls.object = cameraPersp;
    controls.enableRotate = true;
    cameraPersp.position.set(L / 2 - 3, 16, W / 2 + 13);
    controls.target.set(L / 2 + 2, 0.2, W / 2);
  }
  transform.camera = camera;
  controls.update();
  updateTraceVisibility();
  setStatus(mode === '3d' ? '3D vaade' : mode === 'blueprint' ? 'Arhitektuurne plaan' : '2D pealtvaade');
}

document.getElementById('mode-3d').onclick = () => setViewMode('3d');
document.getElementById('mode-2d').onclick = () => setViewMode('2d');
document.getElementById('mode-blueprint')?.addEventListener('click', () => setViewMode('blueprint'));
document.getElementById('mode-walk')?.addEventListener('click', () => setViewMode('walk'));

document.getElementById('btn-top').onclick = () => setViewMode('2d');
document.getElementById('btn-iso').onclick = () => {
  setViewMode('3d');
  cameraPersp.position.set(-6, 14, 14);
  controls.update();
};
document.getElementById('btn-reset-view').onclick = () => setViewMode(viewMode);

function zoomView(factor) {
  if (camera === cameraOrtho) {
    cameraOrtho.zoom = THREE.MathUtils.clamp(cameraOrtho.zoom * factor, 0.45, 4);
    cameraOrtho.updateProjectionMatrix();
  } else {
    const offset = cameraPersp.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance);
    offset.setLength(distance);
    cameraPersp.position.copy(controls.target).add(offset);
  }
  controls.update();
}
document.getElementById('btn-zoom-in')?.addEventListener('click', () => zoomView(1.22));
document.getElementById('btn-zoom-out')?.addEventListener('click', () => zoomView(0.82));

// HUD Nupud
document.getElementById('btn-roof')?.addEventListener('click', () => {
  layers.roof.visible = !layers.roof.visible;
  document.getElementById('btn-roof')?.classList.toggle('active', layers.roof.visible);
  const cb = document.querySelector('[data-layer="roof"]');
  if (cb) cb.checked = layers.roof.visible;
  setStatus(layers.roof.visible ? 'Katus nähtav' : 'Katus peidetud (vaata siseruume)');
});

document.getElementById('btn-sun')?.addEventListener('click', () => {
  setSunTime(currentSunIndex + 1);
});

// Sisevalgustite ja hubaste meeleolutulede lüliti
let indoorLightsEnabled = true;
document.getElementById('btn-indoor-lights')?.addEventListener('click', () => {
  indoorLightsEnabled = !indoorLightsEnabled;
  indoorLightsGroup.visible = indoorLightsEnabled;
  document.getElementById('btn-indoor-lights')?.classList.toggle('active', indoorLightsEnabled);
  setStatus(indoorLightsEnabled ? 'Hubased sisevalgustid sisse lülitatud (2700K)' : 'Sisevalgustid välja lülitatud');
});

// Fotorežiim (Kinematograafiline 35mm stuudio vaade pehmete kontaktvarjudega)
let isPhotoMode = false;
let savedCameraFov = 40;
let savedCameraPos = null;

function togglePhotoMode(enable) {
  isPhotoMode = (enable !== undefined) ? enable : !isPhotoMode;
  const btnPhoto = document.getElementById('btn-photo-mode');
  const bar = document.getElementById('photo-mode-bar');
  const hud = document.getElementById('hud');
  const toolbar = document.getElementById('toolbar');

  btnPhoto?.classList.toggle('active', isPhotoMode);
  bar?.classList.toggle('hidden', !isPhotoMode);

  if (isPhotoMode) {
    savedCameraFov = cameraPersp.fov;
    savedCameraPos = cameraPersp.position.clone();
    cameraPersp.fov = 32; // 35mm-50mm kinolääts
    cameraPersp.updateProjectionMatrix();

    renderer.toneMappingExposure = 1.35; // Luksuslik valgustatus
    transform.detach();
    if (toolbar) toolbar.style.display = 'none';
    setStatus('📸 Fotorežiim: 35mm kinokaader, kõrge valgustäpsus. Pildistamiseks vajuta "Pildista"');
  } else {
    cameraPersp.fov = savedCameraFov;
    cameraPersp.updateProjectionMatrix();
    renderer.toneMappingExposure = 1.15;
    if (toolbar) toolbar.style.display = '';
    setStatus('Fotorežiimist väljutud');
  }
}

document.getElementById('btn-photo-mode')?.addEventListener('click', () => togglePhotoMode());
document.getElementById('btn-photo-exit')?.addEventListener('click', () => togglePhotoMode(false));

document.getElementById('btn-photo-capture')?.addEventListener('click', () => {
  // Tee puhas kaader ilma abijoonteta
  const gridWasVis = layers.grid.visible;
  const dimsWasVis = layers.dims.visible;
  layers.grid.visible = false;
  layers.dims.visible = false;
  renderer.render(scene, camera);

  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  const projName = (document.getElementById('project-name')?.value || 'kodudisain').replace(/\s+/g, '-').toLowerCase();
  a.download = `${projName}-render-${Date.now()}.png`;
  a.click();

  layers.grid.visible = gridWasVis;
  layers.dims.visible = dimsWasVis;
  setStatus('📷 Kõrge resolutsiooniga foto salvestatud PNG-failina!');
});

document.getElementById('btn-ortho')?.addEventListener('click', () => {
  orthoEnabled = !orthoEnabled;
  document.getElementById('btn-ortho')?.classList.toggle('active', orthoEnabled);
  setStatus(orthoEnabled ? 'Risti snap (0°/45°/90°) sees' : 'Vaba nurga joonistamine');
});

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
    if (k === 'roof') document.getElementById('btn-roof')?.classList.toggle('active', cb.checked);
    if (k === 'dims') rebuildDims();
  });
});

// Ruudustiku snap sammu valik
document.getElementById('snap-grid-select')?.addEventListener('change', e => {
  gridSnapStep = parseFloat(e.target.value) || 0.5;
  setStatus(`Ruudustiku snap: ${gridSnapStep} m`);
});

// Kompassi vidin – klõpsates pöörab põhjasuunda 45° võrra
document.getElementById('compass-badge')?.addEventListener('click', () => {
  plotConfig.northAngle = (plotConfig.northAngle + 45) % 360;
  const pn = document.getElementById('plot-north');
  if (pn) pn.value = plotConfig.northAngle;
  rebuildPlotMesh();
  updateCompassUi();
  pushHist('Põhjasuund muudetud');
  setStatus(`Põhjasuund: ${plotConfig.northAngle}°`);
});

// Krundi seadete (Plot inspector) sisendid
['plot-width', 'plot-depth', 'plot-setback', 'plot-max-cov'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    plotConfig.width = Math.max(8, parseFloat(document.getElementById('plot-width')?.value) || 25);
    plotConfig.depth = Math.max(8, parseFloat(document.getElementById('plot-depth')?.value) || 35);
    plotConfig.setback = Math.max(0, parseFloat(document.getElementById('plot-setback')?.value) || 4.0);
    plotConfig.maxCoverage = Math.max(5, Math.min(100, parseFloat(document.getElementById('plot-max-cov')?.value) || 20));
    rebuildPlotMesh();
    pushHist('Krundi parameetrid muudetud');
    setStatus(`Krunt: ${plotConfig.width} × ${plotConfig.depth} m (4 m ehitusjoon)`);
  });
});

document.getElementById('plot-north')?.addEventListener('input', e => {
  plotConfig.northAngle = parseInt(e.target.value, 10) || 0;
  rebuildPlotMesh();
  updateCompassUi();
});

document.getElementById('btn-rebuild-plot')?.addEventListener('click', () => {
  rebuildPlotMesh();
  updateCompassUi();
  setStatus('Krunt ja 4 m ehitusala uuendatud');
});

// Pointer ja hiire sündmused
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isPointerDown = false;
let lastPointerX = 0, lastPointerY = 0;

canvas.addEventListener('pointerdown', e => {
  isPointerDown = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;

  if (viewMode === 'walk') return;
  if (e.button !== 0 || transform.dragging) return;
  if (drawMode) {
    onDrawClick(e);
    return;
  }

  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);

  const hHits = ray.intersectObjects(handleGroup.children, true);
  if (hHits.length) {
    const h = hHits[0].object;
    dragHandle = { wallId: h.userData.wallId, end: h.userData.end };
    controls.enabled = false;
    setStatus('Lohista seina otsa (snap nurkadesse)');
    return;
  }

  const hits = ray.intersectObjects(allEditable(), true);
  if (hits.length) {
    let root = hits[0].object;
    while (root && !root.userData.movable) root = root.parent;
    if (root?.userData.movable) select(root);
  } else if (!e.shiftKey) {
    deselect();
  }
});

canvas.addEventListener('pointermove', e => {
  if (isWalking && isPointerDown) {
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    walkYaw -= dx * 0.005;
    walkPitch = THREE.MathUtils.clamp(walkPitch - dy * 0.005, -Math.PI * 0.35, Math.PI * 0.35);
  }
});

window.addEventListener('pointerup', () => {
  isPointerDown = false;
  if (dragHandle) {
    dragHandle = null;
    controls.enabled = true;
    rebuildPlanSymbols();
    rebuildRoof();
    pushHist();
    refreshQuote();
    setStatus('Seina asend uuendatud');
  }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

// Drag-and-drop mööbli ja kataloogi elementide paigutamine 3D stseeni
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

canvas.addEventListener('drop', e => {
  e.preventDefault();
  const assetId = e.dataTransfer.getData('text/plain');
  if (!assetId) return;

  const groundPos = groundPoint(e);
  if (!groundPos) return;

  const snapped = snapPoint(groundPos.x, groundPos.z);
  const o = addAsset(assetId, snapped.x, snapped.z);
  if (o) {
    select(o);
    pushHist();
    refreshList();
    refreshQuote();
    runErgoCheck();
    const item = CATALOG.flatMap(c => c.items).find(i => i.id === assetId);
    setStatus(`Lohistatud ja paigutatud: ${item?.name || assetId}`);
  }
});

// Klaviatuuri kiirklahvid
window.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd'].includes(k) && isWalking) {
    walkKeys[k] = true;
    return;
  }
  if (k === 'v') { setDrawMode(null); document.querySelector('[data-tool="select"]')?.click(); }
  if (k === 'g') { document.querySelector('[data-tool="move"]')?.click(); transform.setMode('translate'); }
  if (k === 'r' && !drawMode && selected?.userData?.movable) { e.preventDefault(); rotateSelected90(); return; }
  if (k === 'r') { document.querySelector('[data-tool="rotate"]')?.click(); transform.setMode('rotate'); }
  if (k === 's' && !e.ctrlKey) { document.querySelector('[data-tool="scale"]')?.click(); transform.setMode('scale'); }
  if (k === 'w' && !e.ctrlKey && !isWalking) setDrawMode(drawMode === 'wall' ? null : 'wall');
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelected(); return; }
  if (k === 'escape') {
    if (viewMode === 'walk') setViewMode('3d');
    else { setDrawMode(null); deselect(); }
  }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); cloneSelected(); return; }
});

window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd'].includes(k)) walkKeys[k] = false;
});

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  cameraPersp.aspect = aspect;
  cameraPersp.updateProjectionMatrix();
  const s = 16;
  cameraOrtho.left = -s * aspect;
  cameraOrtho.right = s * aspect;
  cameraOrtho.top = s;
  cameraOrtho.bottom = -s;
  cameraOrtho.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// Käivita saunamall ja disainitööriistad vaikimisi
placeSaunaTemplate();
rebuildPlotMesh();
updateCompassUi();
renderRoomModules();
renderDesignStyles();
runErgoCheck();
resize();

// Põhirenderdus ja jalutuskäigu animatsioon
(function loop() {
  requestAnimationFrame(loop);
  if (isWalking) {
    const speed = 0.075;
    const forward = new THREE.Vector3(Math.sin(walkYaw), 0, -Math.cos(walkYaw));
    const right = new THREE.Vector3(Math.cos(walkYaw), 0, Math.sin(walkYaw));
    if (walkKeys.w) walkPos.addScaledVector(forward, speed);
    if (walkKeys.s) walkPos.addScaledVector(forward, -speed);
    if (walkKeys.a) walkPos.addScaledVector(right, -speed);
    if (walkKeys.d) walkPos.addScaledVector(right, speed);
    camera.position.set(walkPos.x, FLOOR_Y + 1.7, walkPos.z);
    const target = camera.position.clone().add(new THREE.Vector3(
      Math.sin(walkYaw) * Math.cos(walkPitch),
      Math.sin(walkPitch),
      -Math.cos(walkYaw) * Math.cos(walkPitch)
    ));
    camera.lookAt(target);
  } else {
    controls.update();
  }
  renderer.render(scene, camera);
})();

setStatus('KoduDisain ' + APP.phase);

// ========== Konto & Pilv (PocketBase API) ==========
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

let authMode = 'login';
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
    el.innerHTML = '<p class="muted">Logi esmalt sisse</p>';
    return;
  }
  el.innerHTML = '<p class="muted">Laen nimekirja…</p>';
  try {
    const items = await listMyProjects();
    if (!items.length) {
      el.innerHTML = '<p class="muted">Pole veel pilveprojekte – vajuta ☁ Salvesta</p>';
      return;
    }
    el.innerHTML = items.map(r => `
      <div class="proj-item" data-id="${r.id}">
        <span class="name">${r.name || 'Projekt'}</span>
        <button type="button" data-load="${r.id}">Ava</button>
        <button type="button" data-share="${r.id}">Jaga</button>
        <button type="button" data-del="${r.id}" class="danger">✕</button>
        <span class="meta">${r.updated ? new Date(r.updated).toLocaleString('et-EE') : ''}</span>
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
        if (!confirm('Kustuta projekt pilvest?')) return;
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
    setStatus('Jagamislink valmis ja kopeeritud');
  } catch (e) {
    setStatus('Jagamine: ' + (e.message || e));
  }
});

// Jagamislingi kontroll lehe laadimisel
(async () => {
  refreshAuthUI();
  onAuthChange(() => refreshAuthUI());
  const ok = await checkHealth();
  if (!ok) setStatus('PocketBase API ei vasta – lokaalne JSON töötab');
  const params = new URLSearchParams(location.search);
  const share = params.get('share');
  if (share) {
    try {
      const rec = await loadByShareToken(share);
      apply(rec.data || rec);
      document.getElementById('project-name').value = rec.name || 'Jagatud projekt';
      setStatus('Avatud jagamislingiga');
    } catch (e) {
      setStatus('Jagamislingi avamise viga: ' + (e.message || e));
    }
  }
})();
