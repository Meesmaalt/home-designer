import * as THREE from 'three';
import { MATERIALS } from './config.js';
import {
  getGrassTexture,
  getWoodPlankTexture,
  getParquetTexture,
  getTileTexture,
  getPaverTexture,
  getWaterTexture,
  getRugTexture,
  getBoucleTexture,
  getWalnutTexture,
  getLeatherTexture,
} from './textures.js';

export function createMaterial(color, options = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: options.r ?? 0.7,
    metalness: options.m ?? 0.05,
    transparent: (options.op ?? 1) < 1,
    opacity: options.op ?? 1,
    side: options.side ?? THREE.FrontSide,
    depthWrite: (options.op ?? 1) >= 0.99,
  });
  if (options.map) mat.map = options.map;
  if (options.emissive) {
    mat.emissive = new THREE.Color(options.emissive);
    mat.emissiveIntensity = options.emissiveIntensity ?? 1;
  }
  return mat;
}

export function box(sx, sy, sz, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mark(g, type, kind) {
  g.userData.movable = true;
  g.userData.type = type;
  g.userData.kind = kind;
  g.userData.uid = Math.random().toString(36).slice(2, 9);
  g.traverse(c => {
    if (c.isMesh) {
      c.userData.root = g;
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return g;
}

const MAT = {
  woodLight: createMaterial(MATERIALS.wood.color, { r: 0.65, map: getWoodPlankTexture(false) }),
  woodDark: createMaterial(MATERIALS.dark.color, { r: 0.65, map: getWoodPlankTexture(true) }),
  plaster: createMaterial(MATERIALS.plaster.color, { r: 0.85 }),
  brick: createMaterial(MATERIALS.brick.color, { r: 0.8 }),
  concrete: createMaterial(MATERIALS.concrete.color, { r: 0.7 }),
  glass: createMaterial(0xb4e2f8, { op: 0.35, side: THREE.DoubleSide, r: 0.1 }),
  metal: createMaterial(0x32373d, { m: 0.65, r: 0.35 }),
  whiteMetal: createMaterial(0xeeeeee, { m: 0.3, r: 0.4 }),
  roofDark: createMaterial(MATERIALS.roof_dark.color, { r: 0.5, m: 0.25 }),
  bark: createMaterial(0x543d2b, { r: 0.9 }),
  pineNeedle: createMaterial(0x2d5e30, { r: 0.85 }),
  leafLight: createMaterial(0x56a644, { r: 0.88 }),
  leafDark: createMaterial(0x3a7830, { r: 0.88 }),
  flowerPink: createMaterial(0xd95b88, { r: 0.8 }),
  flowerYellow: createMaterial(0xe8c038, { r: 0.8 }),
  soil: createMaterial(0x3f3123, { r: 0.95 }),
  water: createMaterial(0x3892b3, { op: 0.75, r: 0.1, map: getWaterTexture(), side: THREE.DoubleSide }),
  sand: createMaterial(0xd8be8d, { r: 0.9 }),
  paver: createMaterial(MATERIALS.paver.color, { r: 0.85, map: getPaverTexture() }),
  parquet: createMaterial(0xbe8d58, { r: 0.45, map: getParquetTexture() }),
  tileLight: createMaterial(0xf5f5f5, { r: 0.3, map: getTileTexture(true) }),
  tileDark: createMaterial(0x636c78, { r: 0.35, map: getTileTexture(false) }),
  rugPattern: createMaterial(0xe5dfd5, { r: 0.95, map: getRugTexture() }),
  fabricGray: createMaterial(0x5c6570, { r: 0.9 }),
  fabricWarm: createMaterial(0xd8c8b4, { r: 0.92 }),
  fabricNavy: createMaterial(0x2b3848, { r: 0.9 }),
  fabricBoucle: createMaterial(0xf5f3ee, { r: 0.94, map: getBoucleTexture() }),
  woodWalnut: createMaterial(0x4c3528, { r: 0.55, map: getWalnutTexture() }),
  leatherCognac: createMaterial(0x874c27, { r: 0.45, map: getLeatherTexture() }),
  brass: createMaterial(0xd4af37, { m: 0.85, r: 0.25 }),
  terracotta: createMaterial(0xc4684b, { r: 0.85 }),
  ceramicWhite: createMaterial(0xfcfcfc, { r: 0.2 }),
  fireOrange: createMaterial(0xff7700, { r: 0.3, emissive: 0xff5500, emissiveIntensity: 0.8 }),
  lampGlow: createMaterial(0xfff5dd, { r: 0.2, emissive: 0xffe6aa, emissiveIntensity: 1.0 }),
  poolWater: createMaterial(0x2da8d8, { op: 0.8, r: 0.05, map: getWaterTexture(), side: THREE.DoubleSide }),
  poolTile: createMaterial(0xdee6ed, { r: 0.35, map: getTileTexture(true) }),
  slideYellow: createMaterial(0xf5a623, { r: 0.35 }),
  carBody: createMaterial(0x2c3e50, { m: 0.8, r: 0.25 }),
  carGlass: createMaterial(0x1a242f, { op: 0.75, r: 0.1 }),
  humanFig: createMaterial(0x616e7d, { r: 0.8 }),
  plasticGreen: createMaterial(0x2e7d32, { r: 0.4 }),
};

export const ASSET_BUILDERS = {
  // --- EHITUS & TARINDID ---
  foundationSlab: () => {
    const g = new THREE.Group();
    g.add(box(6, 0.25, 5, MAT.concrete, 0, 0.125, 0));
    return mark(g, 'foundationSlab', 'scenery');
  },
  deckModule: () => {
    const g = new THREE.Group();
    // wooden deck base beams + planks
    g.add(box(4.0, 0.1, 3.0, MAT.woodDark, 0, 0.05, 0));
    for (let i = -14; i <= 14; i++) {
      g.add(box(3.96, 0.025, 0.085, MAT.woodLight, 0, 0.11, i * 0.1));
    }
    return mark(g, 'deckModule', 'scenery');
  },
  pergola: () => {
    const g = new THREE.Group();
    // 4 posts
    const postH = 2.4;
    [-1.4, 1.4].forEach(x => {
      [-1.4, 1.4].forEach(z => {
        g.add(box(0.12, postH, 0.12, MAT.woodDark, x, postH / 2, z));
      });
    });
    // main beams
    g.add(box(3.2, 0.14, 0.08, MAT.woodDark, 0, postH + 0.07, -1.4));
    g.add(box(3.2, 0.14, 0.08, MAT.woodDark, 0, postH + 0.07, 1.4));
    // rafters across
    for (let x = -1.5; x <= 1.5; x += 0.5) {
      g.add(box(0.06, 0.1, 3.1, MAT.woodLight, x, postH + 0.18, 0));
    }
    return mark(g, 'pergola', 'scenery');
  },
  greenhouse: () => {
    const g = new THREE.Group();
    const w = 2.8, l = 3.6, h = 2.0, rH = 0.8;
    // aluminum base & corners
    g.add(box(w, 0.3, l, MAT.concrete, 0, 0.15, 0));
    // glass walls
    const glassWallFront = box(w - 0.05, h - 0.3, 0.02, MAT.glass, 0, 0.3 + (h - 0.3) / 2, -l / 2);
    const glassWallBack = box(w - 0.05, h - 0.3, 0.02, MAT.glass, 0, 0.3 + (h - 0.3) / 2, l / 2);
    const glassWallLeft = box(0.02, h - 0.3, l - 0.05, MAT.glass, -w / 2, 0.3 + (h - 0.3) / 2, 0);
    const glassWallRight = box(0.02, h - 0.3, l - 0.05, MAT.glass, w / 2, 0.3 + (h - 0.3) / 2, 0);
    g.add(glassWallFront, glassWallBack, glassWallLeft, glassWallRight);
    // frame struts
    [-w / 2, w / 2].forEach(x => {
      [-l / 2, l / 2].forEach(z => {
        g.add(box(0.05, h, 0.05, MAT.metal, x, h / 2, z));
      });
    });
    // pitched glass roof
    const roofLeft = box(Math.hypot(w / 2, rH) + 0.05, 0.02, l, MAT.glass, -w / 4, h + rH / 2, 0);
    roofLeft.rotation.z = Math.atan2(rH, w / 2);
    const roofRight = box(Math.hypot(w / 2, rH) + 0.05, 0.02, l, MAT.glass, w / 4, h + rH / 2, 0);
    roofRight.rotation.z = -Math.atan2(rH, w / 2);
    g.add(roofLeft, roofRight);
    // ridge beam
    g.add(box(0.04, 0.04, l, MAT.metal, 0, h + rH, 0));
    // plant shelves inside
    g.add(box(0.6, 0.03, l - 0.6, MAT.woodLight, -w / 2 + 0.4, 0.8, 0));
    g.add(box(0.6, 0.03, l - 0.6, MAT.woodLight, w / 2 - 0.4, 0.8, 0));
    return mark(g, 'greenhouse', 'scenery');
  },
  shed: () => {
    const g = new THREE.Group();
    // wooden siding shed with lean-to roof
    g.add(box(2.8, 2.2, 2.2, MAT.woodDark, 0, 1.1, 0));
    // door
    g.add(box(0.9, 1.9, 0.04, MAT.woodLight, 0, 1.0, 1.11));
    // roof
    const rf = box(3.1, 0.1, 2.6, MAT.roofDark, 0, 2.3, 0);
    rf.rotation.x = 0.12;
    g.add(rf);
    return mark(g, 'shed', 'scenery');
  },
  carport: () => {
    const g = new THREE.Group();
    // 6 timber posts
    [-1.6, 1.6].forEach(x => {
      [-2.4, 0, 2.4].forEach(z => {
        g.add(box(0.14, 2.6, 0.14, MAT.woodDark, x, 1.3, z));
      });
    });
    // roof beams and dark roof cover
    g.add(box(3.6, 0.15, 5.6, MAT.roofDark, 0, 2.7, 0));
    return mark(g, 'carport', 'scenery');
  },
  houseMain: () => {
    const g = new THREE.Group();
    g.add(box(10, 5.5, 14, MAT.plaster, 0, 2.75, 0));
    g.add(box(10.4, 0.4, 14.4, MAT.roofDark, 0, 5.6, 0));
    return mark(g, 'houseMain', 'scenery');
  },
  houseNeigh: () => {
    const g = new THREE.Group();
    g.add(box(9, 4.2, 11, MAT.brick, 0, 2.1, 0));
    g.add(box(9.4, 0.35, 11.4, MAT.roofDark, 0, 4.3, 0));
    return mark(g, 'houseNeigh', 'scenery');
  },

  // --- HALJASTUS & AED ---
  appleTree: () => {
    const g = new THREE.Group();
    g.add(cyl(0.12, 0.16, 1.6, MAT.bark, 0, 0.8, 0, 8));
    // layered crown
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 10), MAT.leafLight);
    c1.position.set(0, 2.4, 0);
    c1.scale.set(1.1, 0.9, 1.1);
    g.add(c1);
    // apples
    const appleMat = createMaterial(0xcc2929, { r: 0.4 });
    const pts = [
      [0.6, 2.4, 0.7], [-0.7, 2.2, 0.5], [0.3, 2.8, -0.7],
      [-0.5, 2.5, -0.6], [0.8, 2.0, -0.3], [-0.2, 1.9, 0.9],
    ];
    pts.forEach(([x, y, z]) => {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), appleMat);
      a.position.set(x, y, z);
      g.add(a);
    });
    return mark(g, 'appleTree', 'scenery');
  },
  pine: () => {
    const g = new THREE.Group();
    g.add(cyl(0.14, 0.2, 2.2, MAT.bark, 0, 1.1, 0, 8));
    for (let i = 0; i < 5; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4 - i * 0.22, 1.1, 8), MAT.pineNeedle);
      cone.position.y = 1.6 + i * 0.75;
      g.add(cone);
    }
    return mark(g, 'pine', 'scenery');
  },
  birch: () => {
    const g = new THREE.Group();
    const birchBark = createMaterial(0xe8ede8, { r: 0.8 });
    g.add(cyl(0.1, 0.15, 2.6, birchBark, 0, 1.3, 0, 8));
    // birch crown (oval)
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), MAT.leafLight);
    crown.position.set(0, 3.2, 0);
    crown.scale.set(0.9, 1.4, 0.9);
    g.add(crown);
    return mark(g, 'birch', 'scenery');
  },
  hedgeThuja: () => {
    const g = new THREE.Group();
    // 3 trimmed thuja cones forming a hedge block
    [-0.7, 0, 0.7].forEach(x => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.8, 8), MAT.pineNeedle);
      t.position.set(x, 0.9, 0);
      g.add(t);
    });
    return mark(g, 'hedgeThuja', 'scenery');
  },
  bushLilac: () => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), MAT.leafDark);
    b.position.y = 0.65;
    g.add(b);
    // lilac flower clusters
    for (let i = 0; i < 5; i++) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), MAT.flowerPink);
      const ang = (i * Math.PI * 2) / 5;
      fl.position.set(Math.cos(ang) * 0.55, 0.85 + (i % 2) * 0.2, Math.sin(ang) * 0.55);
      g.add(fl);
    }
    return mark(g, 'bushLilac', 'scenery');
  },
  raisedBed: () => {
    const g = new THREE.Group();
    // timber frame
    g.add(box(2.0, 0.45, 0.9, MAT.woodDark, 0, 0.225, 0));
    // soil top
    g.add(box(1.85, 0.05, 0.75, MAT.soil, 0, 0.43, 0));
    // vegetable rows (little green shrubs)
    for (let x = -0.7; x <= 0.7; x += 0.35) {
      for (let z = -0.25; z <= 0.25; z += 0.25) {
        const veg = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), MAT.leafLight);
        veg.position.set(x, 0.48, z);
        g.add(veg);
      }
    }
    return mark(g, 'raisedBed', 'scenery');
  },
  flowerBed: () => {
    const g = new THREE.Group();
    // stone border ring
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      g.add(box(0.24, 0.15, 0.2, MAT.concrete, Math.cos(a) * 0.9, 0.075, Math.sin(a) * 0.9));
    }
    g.add(cyl(0.85, 0.85, 0.12, MAT.soil, 0, 0.06, 0, 14));
    // mixed flowers
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      const m = i % 2 === 0 ? MAT.flowerPink : MAT.flowerYellow;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), m);
      fl.position.set(Math.cos(a) * 0.5, 0.18, Math.sin(a) * 0.5);
      g.add(fl);
    }
    return mark(g, 'flowerBed', 'scenery');
  },
  pond: () => {
    const g = new THREE.Group();
    const rX = 2.4, rZ = 1.8;
    // stone edge ring
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      g.add(box(0.35, 0.16, 0.3, MAT.concrete, Math.cos(a) * rX, 0.08, Math.sin(a) * rZ));
    }
    // water surface
    const waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(rX - 0.1, rX - 0.1, 0.06, 20), MAT.water);
    waterMesh.position.y = 0.05;
    waterMesh.scale.set(1, 1, rZ / rX);
    g.add(waterMesh);
    // water lilies
    const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.01, 8), MAT.leafLight);
    lily.position.set(0.5, 0.09, 0.3);
    g.add(lily);
    return mark(g, 'pond', 'scenery');
  },
  hotTub: () => {
    const g = new THREE.Group();
    // wooden barrel
    g.add(cyl(1.1, 1.1, 1.1, MAT.woodDark, 0, 0.55, 0, 18));
    // water inside
    const w = cyl(1.02, 1.02, 0.1, MAT.water, 0, 0.95, 0, 18);
    g.add(w);
    // stainless steel heater pipe
    g.add(cyl(0.08, 0.08, 1.8, MAT.metal, 0.85, 0.9, 0.4));
    // bench inside
    return mark(g, 'hotTub', 'scenery');
  },
  stonePath: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      g.add(cyl(0.26, 0.28, 0.05, MAT.concrete, i * 0.55, 0.03, 0, 8));
    }
    return mark(g, 'stonePath', 'scenery');
  },
  gravelPath: () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4.0), MAT.sand);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    g.add(m);
    return mark(g, 'gravelPath', 'scenery');
  },
  fenceWood: () => {
    const g = new THREE.Group();
    // 2 horizontal rails
    g.add(box(4.0, 0.06, 0.04, MAT.woodLight, 0, 0.35, 0));
    g.add(box(4.0, 0.06, 0.04, MAT.woodLight, 0, 0.85, 0));
    // pickets
    for (let x = -1.9; x <= 1.9; x += 0.25) {
      g.add(box(0.12, 1.1, 0.02, MAT.woodLight, x, 0.55, 0.03));
    }
    // end posts
    g.add(box(0.1, 1.25, 0.1, MAT.woodDark, -2.0, 0.625, 0));
    g.add(box(0.1, 1.25, 0.1, MAT.woodDark, 2.0, 0.625, 0));
    return mark(g, 'fenceWood', 'scenery');
  },
  fenceGate: () => {
    const g = new THREE.Group();
    g.add(box(0.14, 1.35, 0.14, MAT.woodDark, -0.6, 0.675, 0));
    g.add(box(0.14, 1.35, 0.14, MAT.woodDark, 0.6, 0.675, 0));
    g.add(box(1.05, 1.0, 0.04, MAT.woodLight, 0, 0.6, 0));
    return mark(g, 'fenceGate', 'scenery');
  },

  // --- VÄLIMÖÖBEL & PUHKUS ---
  outdoorTable: () => {
    const g = new THREE.Group();
    // table
    g.add(box(1.6, 0.06, 0.9, MAT.woodLight, 0, 0.74, 0));
    [-0.7, 0.7].forEach(x => {
      [-0.35, 0.35].forEach(z => {
        g.add(box(0.06, 0.72, 0.06, MAT.woodDark, x, 0.36, z));
      });
    });
    // 4 chairs
    [-0.5, 0.5].forEach(x => {
      [-0.65, 0.65].forEach(z => {
        const ch = new THREE.Group();
        ch.add(box(0.4, 0.04, 0.4, MAT.woodLight, 0, 0.44, 0));
        ch.add(box(0.4, 0.45, 0.04, MAT.woodLight, 0, 0.68, z > 0 ? 0.18 : -0.18));
        ch.position.set(x, 0, z);
        g.add(ch);
      });
    });
    return mark(g, 'outdoorTable', 'scenery');
  },
  loungeChair: () => {
    const g = new THREE.Group();
    // lounger
    g.add(box(0.65, 0.1, 1.4, MAT.woodLight, 0, 0.25, 0));
    const back = box(0.65, 0.08, 0.65, MAT.woodLight, 0, 0.45, -0.85);
    back.rotation.x = -0.4;
    g.add(back);
    // parasol
    const umbrella = new THREE.Group();
    umbrella.add(cyl(0.03, 0.03, 2.2, MAT.metal, 0, 1.1, 0));
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 8), MAT.fabricBeige);
    canopy.position.y = 2.05;
    umbrella.add(canopy);
    umbrella.position.set(0.8, 0, 0.2);
    g.add(umbrella);
    return mark(g, 'loungeChair', 'scenery');
  },
  bbqGrill: () => {
    const g = new THREE.Group();
    // masonry outdoor kitchen counter
    g.add(box(1.8, 0.85, 0.7, MAT.brick, 0, 0.425, 0));
    g.add(box(1.9, 0.08, 0.78, MAT.concrete, 0, 0.89, 0));
    // grill unit with hood
    g.add(box(0.7, 0.35, 0.5, MAT.metal, -0.4, 1.08, 0));
    // chimney
    g.add(box(0.3, 0.8, 0.3, MAT.brick, -0.4, 1.65, 0));
    return mark(g, 'bbqGrill', 'scenery');
  },
  gardenLight: () => {
    const g = new THREE.Group();
    g.add(cyl(0.04, 0.05, 0.85, MAT.metal, 0, 0.425, 0, 8));
    const lampGlass = createMaterial(0xfff0b3, { r: 0.1, op: 0.85 });
    g.add(cyl(0.08, 0.08, 0.18, lampGlass, 0, 0.82, 0, 8));
    g.add(cyl(0.12, 0.08, 0.06, MAT.metal, 0, 0.93, 0, 8));
    return mark(g, 'gardenLight', 'scenery');
  },
  solarPanel: () => {
    const g = new THREE.Group();
    const frameMat = MAT.metal;
    const panelMat = createMaterial(0x1a2e4a, { m: 0.6, r: 0.25 });
    // angled mounting rack
    const rack = new THREE.Group();
    rack.add(box(2.2, 0.05, 1.4, panelMat, 0, 0.65, 0));
    rack.add(box(2.24, 0.06, 1.44, frameMat, 0, 0.64, 0));
    rack.rotation.x = 0.45;
    g.add(rack);
    // ground stands
    g.add(cyl(0.03, 0.03, 0.8, frameMat, -0.9, 0.4, -0.4));
    g.add(cyl(0.03, 0.03, 0.8, frameMat, 0.9, 0.4, -0.4));
    return mark(g, 'solarPanel', 'scenery');
  },
  firePit: () => {
    const g = new THREE.Group();
    // stone ring
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      g.add(box(0.3, 0.25, 0.25, MAT.concrete, Math.cos(a) * 0.7, 0.125, Math.sin(a) * 0.7));
    }
    // ash and glowing ember
    g.add(cyl(0.55, 0.55, 0.1, MAT.soil, 0, 0.05, 0));
    g.add(cyl(0.35, 0.35, 0.08, MAT.fireOrange, 0, 0.09, 0));
    // log benches
    [1.4, -1.4].forEach(z => {
      g.add(cyl(0.18, 0.2, 1.5, MAT.woodDark, 0, 0.18, z, 8).rotateZ(Math.PI / 2));
    });
    return mark(g, 'firePit', 'scenery');
  },

  // --- SISUSTUS ---
  sofa: () => {
    const g = new THREE.Group();
    // base & main cushion
    g.add(box(2.2, 0.42, 0.9, MAT.fabricGray, 0, 0.21, 0));
    // backrest
    g.add(box(2.2, 0.45, 0.25, MAT.fabricGray, 0, 0.6, -0.325));
    // armrests
    g.add(box(0.25, 0.3, 0.9, MAT.fabricGray, -1.0, 0.52, 0));
    g.add(box(0.25, 0.3, 0.9, MAT.fabricGray, 1.0, 0.52, 0));
    return mark(g, 'sofa', 'furniture');
  },
  table: () => {
    const g = new THREE.Group();
    g.add(box(1.5, 0.05, 0.85, MAT.woodLight, 0, 0.73, 0));
    [-0.65, 0.65].forEach(x => {
      [-0.35, 0.35].forEach(z => {
        g.add(box(0.06, 0.7, 0.06, MAT.metal, x, 0.35, z));
      });
    });
    return mark(g, 'table', 'furniture');
  },
  kitchenUnit: () => {
    const g = new THREE.Group();
    // kitchen island base with cabinet doors
    g.add(box(2.4, 0.86, 0.9, MAT.woodDark, 0, 0.43, 0));
    // stone countertop
    g.add(box(2.45, 0.05, 0.95, MAT.concrete, 0, 0.885, 0));
    // sink
    g.add(box(0.5, 0.02, 0.4, MAT.metal, -0.6, 0.915, 0));
    // faucet
    g.add(cyl(0.02, 0.02, 0.28, MAT.metal, -0.6, 1.05, -0.15));
    // induction cooktop
    g.add(box(0.6, 0.015, 0.45, MAT.metal, 0.5, 0.915, 0));
    return mark(g, 'kitchenUnit', 'furniture');
  },
  fridge: () => {
    const g = new THREE.Group();
    g.add(box(0.65, 1.85, 0.65, MAT.metal, 0, 0.925, 0));
    // handle
    g.add(box(0.03, 0.45, 0.04, MAT.whiteMetal, 0.25, 1.0, 0.35));
    return mark(g, 'fridge', 'furniture');
  },
  bed: () => {
    const g = new THREE.Group();
    // wooden frame + mattress + headboard
    g.add(box(1.7, 0.32, 2.1, MAT.woodDark, 0, 0.16, 0));
    g.add(box(1.6, 0.22, 2.0, MAT.fabricBeige, 0, 0.38, -0.02));
    g.add(box(1.75, 0.9, 0.12, MAT.woodDark, 0, 0.45, -1.02));
    // pillows
    [-0.45, 0.45].forEach(x => {
      g.add(box(0.5, 0.1, 0.35, MAT.fabricGray, x, 0.52, -0.75));
    });
    return mark(g, 'bed', 'furniture');
  },
  wardrobe: () => {
    const g = new THREE.Group();
    g.add(box(1.2, 2.1, 0.6, MAT.woodLight, 0, 1.05, 0));
    g.add(box(0.03, 0.3, 0.03, MAT.metal, 0.05, 1.05, 0.32));
    return mark(g, 'wardrobe', 'furniture');
  },
  fireplace: () => {
    const g = new THREE.Group();
    // stone body
    g.add(box(0.95, 1.6, 0.65, MAT.concrete, 0, 0.8, 0));
    // glass hearth door
    g.add(box(0.5, 0.55, 0.05, MAT.glass, 0, 0.55, 0.33));
    // fire glow
    g.add(box(0.35, 0.2, 0.25, MAT.fireOrange, 0, 0.45, 0.15));
    // flue
    g.add(cyl(0.1, 0.1, 1.0, MAT.metal, 0, 2.1, 0));
    return mark(g, 'fireplace', 'furniture');
  },
  bathTub: () => {
    const g = new THREE.Group();
    g.add(box(1.6, 0.58, 0.75, MAT.ceramicWhite, 0, 0.29, 0));
    g.add(box(1.4, 0.1, 0.6, MAT.water, 0, 0.38, 0));
    return mark(g, 'bathTub', 'furniture');
  },
  shower: () => {
    const g = new THREE.Group();
    g.add(box(0.9, 0.06, 0.9, MAT.ceramicWhite, 0, 0.03, 0));
    g.add(box(0.02, 2.0, 0.9, MAT.glass, -0.44, 1.03, 0));
    g.add(box(0.9, 2.0, 0.02, MAT.glass, 0, 1.03, 0.44));
    g.add(cyl(0.08, 0.08, 0.02, MAT.metal, -0.3, 1.9, 0.3));
    return mark(g, 'shower', 'furniture');
  },
  toilet: () => {
    const g = new THREE.Group();
    g.add(box(0.4, 0.42, 0.6, MAT.ceramicWhite, 0, 0.21, 0));
    g.add(box(0.4, 0.4, 0.22, MAT.ceramicWhite, 0, 0.55, -0.19));
    return mark(g, 'toilet', 'furniture');
  },
  stove: () => {
    const g = new THREE.Group();
    g.add(box(0.48, 0.68, 0.48, MAT.metal, 0, 0.34, 0));
    g.add(cyl(0.05, 0.05, 1.3, MAT.metal, 0, 1.25, 0));
    return mark(g, 'stove', 'furniture');
  },
  lavaLong: () => {
    const g = new THREE.Group();
    g.add(box(0.55, 0.4, 1.8, MAT.woodLight, 0, 0.2, 0));
    g.add(box(0.55, 0.4, 1.8, MAT.woodDark, 0, 0.6, 0));
    return mark(g, 'lavaLong', 'furniture');
  },
  lavaShort: () => {
    const g = new THREE.Group();
    g.add(box(1.1, 0.4, 0.55, MAT.woodLight, 0, 0.2, 0));
    g.add(box(1.1, 0.4, 0.55, MAT.woodDark, 0, 0.6, 0));
    return mark(g, 'lavaShort', 'furniture');
  },

  // --- ARENGUETAPP: UUED KODU- JA AIAELEMENDID ---
  saunaBarrel: () => {
    const g = new THREE.Group();
    const r = 1.1, len = 3.4;
    // Support cradles
    [-1.0, 1.0].forEach(z => {
      g.add(box(2.0, 0.25, 0.25, MAT.woodDark, 0, 0.125, z));
    });
    // Barrel body
    const barrel = cyl(r, r, len, MAT.woodDark, 0, r + 0.15, 0, 20);
    barrel.rotation.x = Math.PI / 2;
    g.add(barrel);
    // Roof shingles over upper half
    const shingles = cyl(r + 0.03, r + 0.03, len + 0.1, MAT.roofDark, 0, r + 0.15, 0, 20, 0, Math.PI);
    shingles.rotation.x = Math.PI / 2;
    g.add(shingles);
    // Front porch & door
    g.add(box(0.8, 1.6, 0.05, MAT.woodLight, 0, r + 0.05, len / 2 + 0.02));
    // Door window
    g.add(box(0.35, 0.6, 0.06, MAT.glass, 0, r + 0.35, len / 2 + 0.02));
    // Chimney flue
    g.add(cyl(0.06, 0.06, 1.2, MAT.metal, 0, r * 2 + 0.6, -len / 4));
    return mark(g, 'saunaBarrel', 'scenery');
  },

  wasteEnclosure: () => {
    const g = new THREE.Group();
    const w = 2.4, d = 1.2, h = 1.5;
    // 4 posts
    [-w / 2 + 0.06, w / 2 - 0.06].forEach(x => {
      [-d / 2 + 0.06, d / 2 - 0.06].forEach(z => {
        g.add(box(0.1, h, 0.1, MAT.metal, x, h / 2, z));
      });
    });
    // Timber horizontal slats back & sides
    for (let y = 0.2; y <= h - 0.1; y += 0.15) {
      g.add(box(w, 0.08, 0.025, MAT.woodDark, 0, y, -d / 2));
      g.add(box(0.025, 0.08, d, MAT.woodDark, -w / 2, y, 0));
      g.add(box(0.025, 0.08, d, MAT.woodDark, w / 2, y, 0));
    }
    // Dark angled metal roof
    const roof = box(w + 0.2, 0.04, d + 0.2, MAT.metal, 0, h + 0.05, 0);
    roof.rotation.x = 0.08;
    g.add(roof);
    // 2 recycling wheelie bins inside
    [-0.5, 0.5].forEach((x, i) => {
      const binMat = i === 0 ? MAT.plasticGreen : MAT.metal;
      g.add(box(0.55, 0.95, 0.55, binMat, x, 0.48, 0));
      g.add(box(0.58, 0.06, 0.58, binMat, x, 0.97, 0));
    });
    return mark(g, 'wasteEnclosure', 'scenery');
  },

  swimmingPool: () => {
    const g = new THREE.Group();
    const pw = 3.2, pl = 6.2, pd = 1.5;
    // Surrounding stone coping / paved patio
    g.add(box(pw + 1.6, 0.1, pl + 1.6, MAT.poolTile, 0, 0.05, 0));
    // Water basin
    g.add(box(pw, 0.02, pl, MAT.poolWater, 0, 0.08, 0));
    // Internal walls / depth simulation
    g.add(box(pw + 0.04, 0.14, pl + 0.04, MAT.poolTile, 0, 0.02, 0));
    // Stainless steel ladder rails
    [-0.3, 0.3].forEach(x => {
      g.add(cyl(0.025, 0.025, 0.9, MAT.whiteMetal, pw / 2 - 0.2, 0.45, -pl / 2 + 0.4 + x));
    });
    // Entry steps at front end
    for (let i = 0; i < 3; i++) {
      g.add(box(pw - 0.2, 0.04, 0.4, MAT.poolTile, 0, 0.06 - i * 0.02, pl / 2 - 0.3 - i * 0.4));
    }
    return mark(g, 'swimmingPool', 'scenery');
  },

  childrenPlayground: () => {
    const g = new THREE.Group();
    // Play tower: 4 posts
    const th = 2.8, tw = 1.4;
    [-tw / 2, tw / 2].forEach(x => {
      [-tw / 2, tw / 2].forEach(z => {
        g.add(box(0.1, th, 0.1, MAT.woodLight, x, th / 2, z));
      });
    });
    // Platform at 1.2m
    g.add(box(tw, 0.08, tw, MAT.woodDark, 0, 1.2, 0));
    // Safety railings
    g.add(box(tw, 0.05, 0.04, MAT.woodLight, 0, 1.8, -tw / 2));
    g.add(box(0.04, 0.05, tw, MAT.woodLight, -tw / 2, 1.8, 0));
    // Peaked roof
    const roofL = box(1.1, 0.04, tw + 0.2, MAT.woodDark, -0.4, th + 0.25, 0);
    roofL.rotation.z = 0.55;
    const roofR = box(1.1, 0.04, tw + 0.2, MAT.woodDark, 0.4, th + 0.25, 0);
    roofR.rotation.z = -0.55;
    g.add(roofL, roofR);
    // Yellow wave slide descending to +Z
    const slide = box(0.55, 0.06, 2.4, MAT.slideYellow, 0, 0.65, tw / 2 + 1.0);
    slide.rotation.x = 0.52;
    g.add(slide);
    // Climbing ladder on -Z
    for (let y = 0.3; y <= 1.2; y += 0.3) {
      g.add(box(0.5, 0.04, 0.04, MAT.woodDark, 0, y, -tw / 2 - 0.05));
    }
    // Swing A-frame extending to -X
    g.add(box(2.6, 0.1, 0.1, MAT.woodLight, -tw / 2 - 1.3, 2.4, 0));
    // A-frame legs
    const leg1 = box(0.1, 2.6, 0.1, MAT.woodLight, -tw / 2 - 2.5, 1.2, 0.5);
    leg1.rotation.x = -0.25;
    const leg2 = box(0.1, 2.6, 0.1, MAT.woodLight, -tw / 2 - 2.5, 1.2, -0.5);
    leg2.rotation.x = 0.25;
    g.add(leg1, leg2);
    // Swing ropes and seat
    g.add(cyl(0.015, 0.015, 1.6, MAT.metal, -tw / 2 - 1.3, 1.5, 0));
    g.add(box(0.45, 0.04, 0.25, MAT.woodDark, -tw / 2 - 1.3, 0.6, 0));
    return mark(g, 'childrenPlayground', 'scenery');
  },

  trampoline: () => {
    const g = new THREE.Group();
    const r = 1.6, padH = 0.8, netH = 1.6;
    // Curved steel frame
    const ring = cyl(r, r, 0.08, MAT.metal, 0, padH, 0, 20);
    g.add(ring);
    // Jumping black mat
    g.add(cyl(r - 0.25, r - 0.25, 0.02, MAT.metal, 0, padH + 0.01, 0, 18));
    // Green safety spring surround pad
    const pad = cyl(r, r, 0.05, MAT.plasticGreen, 0, padH + 0.02, 0, 20);
    g.add(pad);
    // 6 W-shaped steel legs
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      g.add(cyl(0.035, 0.035, padH, MAT.whiteMetal, Math.cos(a) * (r - 0.15), padH / 2, Math.sin(a) * (r - 0.15)));
    }
    // 6 curved safety net poles + mesh cylinder
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      g.add(cyl(0.025, 0.025, netH, MAT.metal, Math.cos(a) * r, padH + netH / 2, Math.sin(a) * r));
    }
    const net = new THREE.Mesh(new THREE.CylinderGeometry(r, r, netH, 18, 1, true), createMaterial(0x111111, { op: 0.25, side: THREE.DoubleSide }));
    net.position.y = padH + netH / 2;
    g.add(net);
    return mark(g, 'trampoline', 'scenery');
  },

  carModern: () => {
    const g = new THREE.Group();
    // Lower body (4.5m x 1.85m x 0.6m)
    g.add(box(1.85, 0.55, 4.5, MAT.carBody, 0, 0.45, 0));
    // Cabin greenhouse
    g.add(box(1.55, 0.55, 2.4, MAT.carGlass, 0, 0.95, -0.2));
    // Roof top
    g.add(box(1.5, 0.04, 2.2, MAT.carBody, 0, 1.24, -0.2));
    // Front LED light bar
    g.add(box(1.6, 0.08, 0.06, createMaterial(0xffffff, { r: 0.1 }), 0, 0.52, 2.25));
    // Rear red LED bar
    g.add(box(1.6, 0.08, 0.06, createMaterial(0xff2222, { r: 0.1 }), 0, 0.56, -2.25));
    // 4 wheels with alloys
    [-0.92, 0.92].forEach(x => {
      [-1.4, 1.4].forEach(z => {
        const wheel = cyl(0.33, 0.33, 0.22, MAT.metal, x, 0.33, z, 14);
        wheel.rotation.z = Math.PI / 2;
        g.add(wheel);
        const hub = cyl(0.2, 0.2, 0.23, MAT.whiteMetal, x, 0.33, z, 10);
        hub.rotation.z = Math.PI / 2;
        g.add(hub);
      });
    });
    return mark(g, 'carModern', 'scenery');
  },

  humanScale: () => {
    const g = new THREE.Group();
    // Head (1.7m)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), MAT.humanFig);
    head.position.y = 1.68;
    g.add(head);
    // Torso (0.95 to 1.55m)
    g.add(box(0.38, 0.6, 0.22, MAT.humanFig, 0, 1.25, 0));
    // Legs
    [-0.1, 0.1].forEach(x => {
      g.add(cyl(0.06, 0.05, 0.95, MAT.humanFig, x, 0.48, 0, 8));
    });
    // Arms
    [-0.23, 0.23].forEach(x => {
      g.add(cyl(0.04, 0.035, 0.65, MAT.humanFig, x, 1.15, 0, 8));
    });
    return mark(g, 'humanScale', 'scenery');
  },

  // --- ELUTUBA & SISEKUJUNDUS ---
  tvConsole: () => {
    const g = new THREE.Group();
    // Low wooden media console (2.0m x 0.45m x 0.4m)
    g.add(box(2.0, 0.42, 0.45, MAT.woodLight, 0, 0.21, 0));
    // Metal thin legs
    [-0.9, 0.9].forEach(x => {
      [-0.18, 0.18].forEach(z => {
        g.add(cyl(0.015, 0.015, 0.1, MAT.metal, x, 0.05, z, 8));
      });
    });
    // Console open shelf & drawer divider
    g.add(box(0.03, 0.35, 0.44, MAT.woodDark, 0, 0.22, 0));
    // 65-inch slim Smart TV (1.45m x 0.85m x 0.04m)
    g.add(box(1.45, 0.85, 0.035, MAT.metal, 0, 0.95, 0));
    // TV screen gloss
    g.add(box(1.41, 0.81, 0.005, createMaterial(0x11161d, { r: 0.15, m: 0.8 }), 0, 0.95, 0.019));
    // TV stand base
    g.add(box(0.5, 0.02, 0.25, MAT.metal, 0, 0.43, 0));
    g.add(box(0.08, 0.1, 0.04, MAT.metal, 0, 0.48, 0));
    // Soundbar
    g.add(box(1.0, 0.07, 0.09, MAT.metal, 0, 0.455, 0.12));
    return mark(g, 'tvConsole', 'furniture');
  },

  armchairNordic: () => {
    const g = new THREE.Group();
    // Cushioned seat
    g.add(box(0.82, 0.16, 0.78, MAT.fabricGray, 0, 0.4, 0));
    // Backrest angled
    const back = box(0.82, 0.58, 0.14, MAT.fabricGray, 0, 0.72, -0.32);
    back.rotation.x = -0.12;
    g.add(back);
    // 2 armrests
    [-0.43, 0.43].forEach(x => {
      g.add(box(0.09, 0.3, 0.76, MAT.fabricGray, x, 0.52, -0.02));
    });
    // 4 wooden angled legs
    [-0.35, 0.35].forEach(x => {
      [-0.3, 0.3].forEach(z => {
        const leg = cyl(0.025, 0.018, 0.34, MAT.woodLight, x, 0.17, z, 8);
        leg.rotation.z = (x < 0 ? 1 : -1) * 0.08;
        leg.rotation.x = (z < 0 ? -1 : 1) * 0.08;
        g.add(leg);
      });
    });
    return mark(g, 'armchairNordic', 'furniture');
  },

  coffeeTable: () => {
    const g = new THREE.Group();
    // Round oak tabletop (dia 0.85m, h 0.42m)
    const top = cyl(0.42, 0.42, 0.035, MAT.woodLight, 0, 0.41, 0, 24);
    g.add(top);
    // 3 sleek metal legs
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const lx = Math.cos(a) * 0.32;
      const lz = Math.sin(a) * 0.32;
      const leg = cyl(0.015, 0.012, 0.4, MAT.metal, lx, 0.2, lz, 8);
      leg.rotation.z = -Math.cos(a) * 0.1;
      leg.rotation.x = Math.sin(a) * 0.1;
      g.add(leg);
    }
    // Decorative ceramic bowl on table
    g.add(cyl(0.1, 0.06, 0.05, MAT.ceramicWhite, 0.08, 0.45, -0.05, 12));
    return mark(g, 'coffeeTable', 'furniture');
  },

  floorLamp: () => {
    const g = new THREE.Group();
    // Heavy round base
    g.add(cyl(0.2, 0.2, 0.025, MAT.metal, 0, 0.012, 0, 18));
    // Slim vertical stem
    g.add(cyl(0.015, 0.015, 1.5, MAT.metal, 0, 0.76, 0, 10));
    // Conical shade
    const shade = cyl(0.14, 0.22, 0.28, MAT.lampGlow, 0, 1.58, 0, 18);
    g.add(shade);
    // Warm light source inside
    const light = new THREE.PointLight(0xffdfa8, 0.9, 5.5, 1.5);
    light.position.set(0, 1.55, 0);
    g.add(light);
    return mark(g, 'floorLamp', 'furniture');
  },

  deskOffice: () => {
    const g = new THREE.Group();
    // Modern minimalist desk (1.4m W x 0.74m H x 0.7m D)
    g.add(box(1.4, 0.035, 0.7, MAT.woodLight, 0, 0.73, 0));
    // Metal loop legs
    [-0.62, 0.62].forEach(x => {
      g.add(box(0.04, 0.72, 0.04, MAT.metal, x, 0.36, -0.3));
      g.add(box(0.04, 0.72, 0.04, MAT.metal, x, 0.36, 0.3));
      g.add(box(0.04, 0.04, 0.64, MAT.metal, x, 0.02, 0));
    });
    // Slim monitor
    g.add(box(0.55, 0.35, 0.02, MAT.metal, 0, 0.96, -0.18));
    g.add(box(0.53, 0.33, 0.005, createMaterial(0x1a2e4a, { r: 0.2 }), 0, 0.96, -0.17));
    g.add(box(0.18, 0.015, 0.16, MAT.metal, 0, 0.76, -0.18));
    // Keyboard & mouse
    g.add(box(0.38, 0.01, 0.12, MAT.metal, 0, 0.755, 0.08));
    g.add(box(0.06, 0.015, 0.09, MAT.metal, 0.28, 0.755, 0.08));
    // Office chair
    const ch = new THREE.Group();
    ch.add(cyl(0.24, 0.24, 0.08, MAT.fabricNavy, 0, 0.46, 0.45, 16));
    const back = box(0.42, 0.48, 0.06, MAT.fabricNavy, 0, 0.72, 0.62);
    back.rotation.x = 0.08;
    ch.add(back);
    ch.add(cyl(0.03, 0.03, 0.42, MAT.metal, 0, 0.21, 0.45, 8));
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ch.add(cyl(0.015, 0.015, 0.26, MAT.metal, Math.cos(a) * 0.13, 0.04, 0.45 + Math.sin(a) * 0.13, 6));
    }
    g.add(ch);
    return mark(g, 'deskOffice', 'furniture');
  },

  bookshelf: () => {
    const g = new THREE.Group();
    // Scandinavian open bookshelf (1.0m W x 1.85m H x 0.32m D)
    const W_s = 1.0, H_s = 1.85, D_s = 0.32;
    // 2 vertical side walls
    [-W_s / 2, W_s / 2].forEach(x => {
      g.add(box(0.03, H_s, D_s, MAT.woodLight, x, H_s / 2, 0));
    });
    // 5 horizontal shelves
    for (let i = 0; i < 5; i++) {
      const y = 0.08 + i * (H_s / 4.2);
      g.add(box(W_s, 0.025, D_s, MAT.woodLight, 0, y, 0));
      // Colorful books & ceramic decor on shelves
      if (i > 0 && i < 4) {
        g.add(box(0.24, 0.18, 0.2, MAT.fabricNavy, -0.25, y + 0.1, 0));
        g.add(box(0.18, 0.22, 0.19, MAT.fabricGray, 0.22, y + 0.12, 0));
        g.add(cyl(0.05, 0.03, 0.12, MAT.ceramicWhite, 0.02, y + 0.07, 0, 10));
      }
    }
    return mark(g, 'bookshelf', 'furniture');
  },

  rugModern: () => {
    const g = new THREE.Group();
    // Flat 2.4m x 1.7m patterned wool carpet
    g.add(box(2.4, 0.012, 1.7, MAT.rugPattern, 0, 0.006, 0));
    return mark(g, 'rugModern', 'furniture');
  },

  indoorPlant: () => {
    const g = new THREE.Group();
    // White ceramic planter
    g.add(cyl(0.2, 0.14, 0.38, MAT.ceramicWhite, 0, 0.19, 0, 16));
    // Soil
    g.add(cyl(0.19, 0.19, 0.04, MAT.soil, 0, 0.36, 0, 12));
    // Plant stem + 7 lush green leaves
    g.add(cyl(0.02, 0.015, 0.5, MAT.bark, 0, 0.55, 0, 8));
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      const leaf = box(0.22, 0.008, 0.32, MAT.leafLight, Math.cos(a) * 0.18, 0.65 + (i * 0.06), Math.sin(a) * 0.18);
      leaf.rotation.y = a;
      leaf.rotation.x = 0.35;
      leaf.rotation.z = (Math.random() - 0.5) * 0.2;
      g.add(leaf);
    }
    return mark(g, 'indoorPlant', 'furniture');
  },

  // --- KÖÖK & SÖÖGITUBA ---
  kitchenHighCabinets: () => {
    const g = new THREE.Group();
    // Tall kitchen cabinet block (1.8m W x 2.25m H x 0.62m D)
    g.add(box(1.8, 2.25, 0.62, MAT.woodDark, 0, 1.125, 0));
    // Integrated double oven & microwave in center
    g.add(box(0.6, 0.6, 0.03, createMaterial(0x1a1a1a, { m: 0.7, r: 0.2 }), 0, 1.25, 0.32));
    g.add(box(0.52, 0.35, 0.01, createMaterial(0x334455, { r: 0.1 }), 0, 1.25, 0.336));
    // Sleek stainless handles
    [-0.55, 0.55].forEach(x => {
      g.add(box(0.02, 0.8, 0.025, MAT.whiteMetal, x, 1.4, 0.325));
      g.add(box(0.02, 0.5, 0.025, MAT.whiteMetal, x, 0.45, 0.325));
    });
    return mark(g, 'kitchenHighCabinets', 'furniture');
  },

  barStools: () => {
    const g = new THREE.Group();
    // Pair of high bar stools (0.8m apart)
    [-0.4, 0.4].forEach(x => {
      // Round wooden seat
      g.add(cyl(0.18, 0.18, 0.04, MAT.woodLight, x, 0.74, 0, 16));
      // 4 metal legs + footrest ring
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI * 2) / 4 + Math.PI / 4;
        const lx = x + Math.cos(a) * 0.14;
        const lz = Math.sin(a) * 0.14;
        const leg = cyl(0.014, 0.012, 0.72, MAT.metal, lx, 0.36, lz, 8);
        leg.rotation.z = (lx > x ? -1 : 1) * 0.05;
        g.add(leg);
      }
      // Footrest ring
      const ring = cyl(0.15, 0.15, 0.02, MAT.metal, x, 0.28, 0, 16);
      g.add(ring);
    });
    return mark(g, 'barStools', 'furniture');
  },

  diningPendant: () => {
    const g = new THREE.Group();
    // Ceiling rosette
    g.add(cyl(0.08, 0.08, 0.03, MAT.metal, 0, 2.38, 0, 12));
    // 3 suspended brass/black dome shades
    [-0.35, 0, 0.35].forEach((x, idx) => {
      g.add(cyl(0.005, 0.005, 0.75, MAT.metal, x, 1.95, 0, 6));
      const dome = cyl(0.06, 0.16, 0.18, MAT.metal, x, 1.54, 0, 16);
      g.add(dome);
      // Inner glowing bulb
      g.add(cyl(0.04, 0.04, 0.04, MAT.lampGlow, x, 1.48, 0, 10));
    });
    const light = new THREE.PointLight(0xffdfa0, 0.95, 6, 1.4);
    light.position.set(0, 1.45, 0);
    g.add(light);
    return mark(g, 'diningPendant', 'furniture');
  },

  // --- MAGAMISTUBA ---
  bedNightstands: () => {
    const g = new THREE.Group();
    // Double bed frame (1.8m x 2.1m) + mattress
    g.add(box(1.8, 0.32, 2.1, MAT.woodLight, 0, 0.16, 0));
    g.add(box(1.72, 0.22, 1.98, MAT.ceramicWhite, 0, 0.4, -0.02));
    // Duvet blanket (cozy warm fabric)
    g.add(box(1.74, 0.12, 1.4, MAT.fabricWarm, 0, 0.52, 0.28));
    // 2 soft pillows
    [-0.45, 0.45].forEach(x => {
      const pillow = box(0.65, 0.12, 0.4, MAT.ceramicWhite, x, 0.56, -0.75);
      pillow.rotation.x = -0.15;
      g.add(pillow);
    });
    // Tall padded headboard
    g.add(box(2.6, 1.1, 0.12, MAT.fabricGray, 0, 0.65, -1.06));
    // 2 matching nightstands with lamps
    [-1.2, 1.2].forEach(x => {
      g.add(box(0.48, 0.45, 0.4, MAT.woodLight, x, 0.225, -0.82));
      // Mini lamp on nightstand
      g.add(cyl(0.06, 0.06, 0.02, MAT.metal, x, 0.46, -0.82, 10));
      g.add(cyl(0.01, 0.01, 0.18, MAT.metal, x, 0.56, -0.82, 8));
      g.add(cyl(0.07, 0.11, 0.14, MAT.lampGlow, x, 0.68, -0.82, 12));
    });
    return mark(g, 'bedNightstands', 'furniture');
  },

  wardrobeModern: () => {
    const g = new THREE.Group();
    // 2.2m W x 2.2m H x 0.65m D wardrobe
    g.add(box(2.2, 2.2, 0.65, MAT.woodLight, 0, 1.1, 0));
    // Sliding door 1: Oak wood panel
    g.add(box(1.08, 2.12, 0.02, MAT.woodDark, -0.54, 1.1, 0.33));
    // Sliding door 2: Mirrored / tinted glass panel
    g.add(box(1.08, 2.12, 0.02, createMaterial(0x8ab2cf, { r: 0.1, m: 0.9 }), 0.54, 1.1, 0.34));
    return mark(g, 'wardrobeModern', 'furniture');
  },

  dresser: () => {
    const g = new THREE.Group();
    // 4-drawer Scandinavian dresser (1.1m x 0.95m x 0.48m)
    g.add(box(1.1, 0.82, 0.48, MAT.woodLight, 0, 0.53, 0));
    // 4 legs
    [-0.48, 0.48].forEach(x => {
      [-0.18, 0.18].forEach(z => {
        g.add(cyl(0.02, 0.015, 0.14, MAT.woodDark, x, 0.07, z, 8));
      });
    });
    // 4 drawer grooves & handles
    for (let i = 0; i < 4; i++) {
      const y = 0.22 + i * 0.19;
      g.add(box(1.06, 0.01, 0.01, MAT.woodDark, 0, y, 0.245));
      [-0.2, 0.2].forEach(hx => {
        g.add(box(0.08, 0.02, 0.025, MAT.metal, hx, y + 0.09, 0.25));
      });
    }
    return mark(g, 'dresser', 'furniture');
  },

  // --- VANNITUBA & TEHNIKA ---
  bathroomVanity: () => {
    const g = new THREE.Group();
    // Wall-hung vanity cabinet (1.0m W x 0.55m H x 0.48m D)
    g.add(box(1.0, 0.52, 0.48, MAT.woodLight, 0, 0.58, 0));
    // White ceramic top with integrated basin
    g.add(box(1.02, 0.05, 0.5, MAT.ceramicWhite, 0, 0.86, 0));
    g.add(box(0.55, 0.14, 0.35, MAT.ceramicWhite, 0, 0.77, 0));
    // Chrome mixer tap
    g.add(cyl(0.018, 0.018, 0.22, MAT.whiteMetal, 0, 0.98, -0.15, 10));
    g.add(box(0.02, 0.02, 0.12, MAT.whiteMetal, 0, 1.07, -0.09));
    // Illuminated wall mirror (0.9m x 0.8m)
    g.add(box(0.9, 0.8, 0.025, createMaterial(0x9fc3dc, { r: 0.1, m: 0.95 }), 0, 1.5, -0.22));
    // LED ambient halo around mirror
    g.add(box(0.94, 0.84, 0.01, MAT.lampGlow, 0, 1.5, -0.235));
    return mark(g, 'bathroomVanity', 'furniture');
  },

  towelWarmer: () => {
    const g = new THREE.Group();
    // Wall ladder towel warmer (0.55m W x 1.1m H)
    [-0.26, 0.26].forEach(x => {
      g.add(cyl(0.016, 0.016, 1.1, MAT.whiteMetal, x, 1.2, 0, 8));
    });
    for (let i = 0; i < 6; i++) {
      const y = 0.75 + i * 0.18;
      g.add(cyl(0.012, 0.012, 0.52, MAT.whiteMetal, 0, y, 0, 8));
      if (i === 2) {
        // Folded grey towel on bar
        g.add(box(0.38, 0.32, 0.04, MAT.fabricGray, 0.04, y - 0.1, 0.02));
      }
    }
    return mark(g, 'towelWarmer', 'furniture');
  },

  washingMachine: () => {
    const g = new THREE.Group();
    // Washer + dryer stack (0.6m W x 1.7m H x 0.62m D)
    g.add(box(0.6, 1.7, 0.62, MAT.ceramicWhite, 0, 0.85, 0));
    // Center divider
    g.add(box(0.61, 0.02, 0.63, MAT.metal, 0, 0.85, 0));
    // 2 round glass porthole doors
    [0.45, 1.28].forEach(y => {
      const doorRim = cyl(0.2, 0.2, 0.03, MAT.metal, 0, y, 0.32, 18);
      doorRim.rotation.x = Math.PI / 2;
      g.add(doorRim);
      const glass = cyl(0.16, 0.16, 0.035, MAT.glass, 0, y, 0.32, 18);
      glass.rotation.x = Math.PI / 2;
      g.add(glass);
    });
    return mark(g, 'washingMachine', 'furniture');
  },

  // --- TERRASS & VÄLIMÖÖBEL ---
  pergolaLouvre: () => {
    const g = new THREE.Group();
    // Modern bioclimatic aluminium pergola (4.0m x 3.2m x 2.6m H)
    const W_p = 4.0, D_p = 3.2, H_p = 2.6;
    // 4 thick corner posts
    [-W_p / 2 + 0.1, W_p / 2 - 0.1].forEach(x => {
      [-D_p / 2 + 0.1, D_p / 2 - 0.1].forEach(z => {
        g.add(box(0.15, H_p, 0.15, MAT.metal, x, H_p / 2, z));
      });
    });
    // Perimeter top beams
    g.add(box(W_p, 0.2, 0.12, MAT.metal, 0, H_p - 0.1, -D_p / 2 + 0.1));
    g.add(box(W_p, 0.2, 0.12, MAT.metal, 0, H_p - 0.1, D_p / 2 - 0.1));
    g.add(box(0.12, 0.2, D_p, MAT.metal, -W_p / 2 + 0.1, H_p - 0.1, 0));
    g.add(box(0.12, 0.2, D_p, MAT.metal, W_p / 2 - 0.1, H_p - 0.1, 0));
    // 16 louvre blades angled at 35 degrees
    for (let i = -8; i <= 8; i++) {
      const bz = i * 0.18;
      const blade = box(W_p - 0.25, 0.02, 0.16, MAT.metal, 0, H_p - 0.05, bz);
      blade.rotation.x = 0.55;
      g.add(blade);
    }
    return mark(g, 'pergolaLouvre', 'scenery');
  },

  outdoorKitchen: () => {
    const g = new THREE.Group();
    // Premium outdoor kitchen unit (2.6m W x 0.95m H x 0.75m D)
    // Stone base / dark wood base
    g.add(box(2.6, 0.86, 0.75, MAT.woodDark, 0, 0.43, 0));
    // Stainless steel countertop
    g.add(box(2.65, 0.06, 0.8, MAT.whiteMetal, 0, 0.89, 0));
    // Built-in 4-burner gas BBQ grill with stainless lid
    g.add(box(0.85, 0.25, 0.55, MAT.metal, -0.4, 1.04, 0));
    const handle = box(0.65, 0.03, 0.03, MAT.whiteMetal, -0.4, 1.12, 0.28);
    g.add(handle);
    // Sink with gooseneck tap
    g.add(box(0.48, 0.18, 0.42, MAT.whiteMetal, 0.7, 0.82, 0));
    g.add(cyl(0.015, 0.015, 0.32, MAT.whiteMetal, 0.7, 1.05, -0.15, 10));
    return mark(g, 'outdoorKitchen', 'furniture');
  },

  daybedOutdoor: () => {
    const g = new THREE.Group();
    // Luxury outdoor daybed (2.0m x 1.4m)
    g.add(box(2.0, 0.3, 1.4, MAT.woodLight, 0, 0.15, 0));
    // Thick waterproof cream cushion
    g.add(box(1.92, 0.18, 1.32, MAT.fabricWarm, 0, 0.39, 0));
    // 4 decorative cushions
    [-0.5, 0.5].forEach(x => {
      [-0.3, 0.3].forEach(z => {
        const c = box(0.42, 0.14, 0.42, MAT.fabricNavy, x, 0.52, z);
        c.rotation.y = (Math.random() - 0.5) * 0.4;
        g.add(c);
      });
    });
    // Curved back/side screen
    g.add(box(2.0, 0.65, 0.08, MAT.woodLight, 0, 0.55, -0.66));
    return mark(g, 'daybedOutdoor', 'furniture');
  },

  sunLoungerPair: () => {
    const g = new THREE.Group();
    // 2 loungers + small cocktail table in between
    [-0.65, 0.65].forEach(x => {
      // Base frame
      g.add(box(0.68, 0.24, 1.95, MAT.woodLight, x, 0.12, 0));
      // Fabric cushion
      g.add(box(0.62, 0.1, 1.9, MAT.fabricWarm, x, 0.29, 0));
      // Angled headrest
      const head = box(0.62, 0.08, 0.65, MAT.fabricWarm, x, 0.45, -0.68);
      head.rotation.x = -0.45;
      g.add(head);
    });
    // Center side table
    g.add(box(0.42, 0.35, 0.42, MAT.woodLight, 0, 0.175, 0));
    // Cocktail glass on table
    g.add(cyl(0.04, 0.02, 0.12, MAT.glass, 0, 0.41, 0, 10));
    return mark(g, 'sunLoungerPair', 'furniture');
  },

  firetable: () => {
    const g = new THREE.Group();
    // Modern rectangular concrete fire table (1.4m x 0.8m x 0.45m H)
    g.add(box(1.4, 0.42, 0.8, MAT.concrete, 0, 0.21, 0));
    // Fire bowl inset in center with black lava rock
    g.add(box(0.9, 0.08, 0.4, MAT.soil, 0, 0.42, 0));
    // Glowing fire flame effect
    g.add(box(0.8, 0.14, 0.3, MAT.fireOrange, 0, 0.49, 0));
    const fireLight = new THREE.PointLight(0xff6600, 1.4, 5, 1.2);
    fireLight.position.set(0, 0.6, 0);
    g.add(fireLight);
    // 2 low outdoor lounge poufs
    [-1.1, 1.1].forEach(x => {
      g.add(cyl(0.35, 0.35, 0.38, MAT.fabricGray, x, 0.19, 0, 16));
    });
    return mark(g, 'firetable', 'furniture');
  },

  greenhouseWalkin: () => {
    const g = new THREE.Group();
    // Walk-in black aluminum glass greenhouse (3.2m x 2.4m x 2.5m H)
    const W_gh = 3.2, D_gh = 2.4, H_wall = 1.7, H_ridge = 2.45;
    // Base foundation curb
    g.add(box(W_gh, 0.15, D_gh, MAT.brick, 0, 0.075, 0));
    // 4 corner posts
    [-W_gh / 2, W_gh / 2].forEach(x => {
      [-D_gh / 2, D_gh / 2].forEach(z => {
        g.add(box(0.06, H_wall, 0.06, MAT.metal, x, H_wall / 2, z));
      });
    });
    // Glass walls
    g.add(box(W_gh - 0.08, H_wall - 0.1, 0.02, MAT.glass, 0, H_wall / 2, -D_gh / 2));
    g.add(box(W_gh - 0.08, H_wall - 0.1, 0.02, MAT.glass, 0, H_wall / 2, D_gh / 2));
    g.add(box(0.02, H_wall - 0.1, D_gh - 0.08, MAT.glass, -W_gh / 2, H_wall / 2, 0));
    g.add(box(0.02, H_wall - 0.1, D_gh - 0.08, MAT.glass, W_gh / 2, H_wall / 2, 0));
    // Gable roof glass panes
    const roofL = box(W_gh, 0.02, 1.4, MAT.glass, 0, (H_wall + H_ridge) / 2, -D_gh / 4);
    roofL.rotation.x = 0.55;
    g.add(roofL);
    const roofR = box(W_gh, 0.02, 1.4, MAT.glass, 0, (H_wall + H_ridge) / 2, D_gh / 4);
    roofR.rotation.x = -0.55;
    g.add(roofR);
    // Ridge beam
    g.add(box(W_gh, 0.08, 0.08, MAT.metal, 0, H_ridge, 0));
    // Plant staging shelves inside with terracotta pots
    g.add(box(W_gh - 0.4, 0.04, 0.45, MAT.woodLight, 0, 0.8, -D_gh / 2 + 0.35));
    [-0.8, 0, 0.8].forEach(px => {
      g.add(cyl(0.1, 0.07, 0.16, MAT.brick, px, 0.9, -D_gh / 2 + 0.35, 10));
      g.add(cyl(0.12, 0.02, 0.18, MAT.leafLight, px, 1.05, -D_gh / 2 + 0.35, 8));
    });
    return mark(g, 'greenhouseWalkin', 'scenery');
  },

  flowerPlanterTrio: () => {
    const g = new THREE.Group();
    // Trio of stylish wooden tiered planter boxes
    const heights = [0.42, 0.65, 0.85];
    const offsets = [[-0.45, -0.2], [0.35, -0.25], [0, 0.35]];
    for (let i = 0; i < 3; i++) {
      const h = heights[i];
      const [x, z] = offsets[i];
      g.add(box(0.55, h, 0.55, MAT.woodDark, x, h / 2, z));
      g.add(box(0.51, 0.06, 0.51, MAT.soil, x, h - 0.03, z));
      // Lush green bush on top
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), MAT.leafLight));
      g.children[g.children.length - 1].position.set(x, h + 0.18, z);
      // Flowers
      const flowerMat = i === 1 ? MAT.flowerPink : MAT.flowerYellow;
      for (let f = 0; f < 5; f++) {
        const fa = (f * Math.PI * 2) / 5;
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), flowerMat);
        fl.position.set(x + Math.cos(fa) * 0.18, h + 0.28, z + Math.sin(fa) * 0.18);
        g.add(fl);
      }
    }
    return mark(g, 'flowerPlanterTrio', 'scenery');
  },

  bicycleRack: () => {
    const g = new THREE.Group();
    // Metal ground rack
    g.add(box(1.6, 0.04, 0.45, MAT.metal, 0, 0.02, 0));
    // 3 bike arches
    [-0.5, 0, 0.5].forEach((x, idx) => {
      g.add(box(0.04, 0.7, 0.45, MAT.whiteMetal, x, 0.35, 0));
      // Parked modern bike in rack 1 and 3
      if (idx !== 1) {
        const bx = x + 0.05;
        // 2 wheels
        [-0.45, 0.45].forEach(wz => {
          const w = cyl(0.32, 0.32, 0.03, MAT.metal, bx, 0.32, wz, 12);
          w.rotation.z = Math.PI / 2;
          g.add(w);
        });
        // Frame bars
        g.add(box(0.03, 0.45, 0.5, idx === 0 ? MAT.carBody : MAT.slideYellow, bx, 0.5, 0));
        // Handlebars
        g.add(box(0.4, 0.03, 0.03, MAT.metal, bx, 0.85, -0.38));
        // Saddle
        g.add(box(0.14, 0.04, 0.22, MAT.metal, bx, 0.78, 0.15));
      }
    });
    return mark(g, 'bicycleRack', 'furniture');
  },

  hammock: () => {
    const g = new THREE.Group();
    // Arched bentwood stand (3.0m L x 1.1m H x 1.0m W)
    // 2 ground stabilizers
    [-1.1, 1.1].forEach(z => {
      g.add(box(0.8, 0.06, 0.12, MAT.woodDark, 0, 0.03, z));
    });
    // Curved wooden arc
    for (let i = -10; i <= 10; i++) {
      const t = i / 10;
      const z = t * 1.4;
      const y = 0.15 + (t * t) * 0.85;
      g.add(box(0.1, 0.06, 0.16, MAT.woodDark, 0, y, z));
    }
    // Suspended fabric hammock bed
    for (let i = -8; i <= 8; i++) {
      const t = i / 8;
      const z = t * 1.1;
      const y = 0.48 + (t * t) * 0.4;
      g.add(box(0.75 - Math.abs(t) * 0.2, 0.02, 0.15, MAT.fabricWarm, 0, y, z));
    }
    // Soft pillow
    g.add(box(0.45, 0.08, 0.25, MAT.fabricNavy, 0, 0.82, -0.9));
    return mark(g, 'hammock', 'furniture');
  },

  gardenLantern: () => {
    const g = new THREE.Group();
    // Minimalist black garden bollard lantern (0.9m H)
    g.add(box(0.14, 0.9, 0.14, MAT.metal, 0, 0.45, 0));
    // Inset 360-degree frosted glowing slit
    g.add(box(0.12, 0.2, 0.12, MAT.lampGlow, 0, 0.75, 0));
    // Warm night light
    const light = new THREE.PointLight(0xffe2aa, 1.1, 4.8, 1.4);
    light.position.set(0, 0.75, 0);
    g.add(light);
    return mark(g, 'gardenLantern', 'furniture');
  },

  // --- TREPID & VERTIKAALNE LIIKUMINE ---
  stairsStraight: () => {
    const g = new THREE.Group();
    const stepsCount = 14;
    const totalH = 2.8;
    const totalL = 3.2;
    const width = 0.95;
    const stepH = totalH / stepsCount;
    const stepL = totalL / stepsCount;

    // Astmed (Steps / Treads)
    for (let i = 0; i < stepsCount; i++) {
      const y = (i + 1) * stepH;
      const z = -totalL / 2 + i * stepL + stepL / 2;
      // Astmelaud (tread)
      g.add(box(width, 0.04, stepL + 0.03, MAT.woodLight, 0, y - 0.02, z));
      // Esiserv / varvaslaud (riser)
      g.add(box(width - 0.04, stepH - 0.04, 0.02, MAT.whiteMetal, 0, y - stepH / 2 - 0.02, z - stepL / 2));
    }

    // Külgmised kandetalad (Stringers)
    const stringerThick = 0.04;
    const stringerH = 0.18;
    const stringerSlopeAngle = Math.atan2(totalH, totalL);
    const stringerLen = Math.hypot(totalH, totalL);

    [-width / 2, width / 2].forEach(x => {
      const stringer = box(stringerThick, stringerH, stringerLen, MAT.metal, x, totalH / 2, 0);
      stringer.rotation.x = stringerSlopeAngle;
      g.add(stringer);

      // Käsipuu postid ja käsipuu (Handrail & Balustrade)
      const postH = 0.9;
      [0, Math.floor(stepsCount / 2), stepsCount - 1].forEach(si => {
        const py = (si + 1) * stepH;
        const pz = -totalL / 2 + si * stepL;
        g.add(cyl(0.018, 0.018, postH, MAT.metal, x, py + postH / 2, pz));
      });
      const rail = cyl(0.025, 0.025, stringerLen, MAT.woodDark, x, totalH / 2 + postH, 0);
      rail.rotation.x = stringerSlopeAngle + Math.PI / 2;
      g.add(rail);
    });

    return mark(g, 'stairsStraight', 'furniture');
  },

  stairsLTurn: () => {
    const g = new THREE.Group();
    const totalH = 2.8;
    const flight1Steps = 7;
    const flight2Steps = 7;
    const stepH = totalH / (flight1Steps + flight2Steps);
    const stepL = 0.26;
    const width = 0.95;

    // Esimene marss: z-suunas
    for (let i = 0; i < flight1Steps; i++) {
      const y = (i + 1) * stepH;
      const z = -1.1 + i * stepL;
      g.add(box(width, 0.04, stepL + 0.03, MAT.woodLight, -0.45, y - 0.02, z));
      g.add(box(width - 0.04, stepH - 0.04, 0.02, MAT.whiteMetal, -0.45, y - stepH / 2 - 0.02, z - stepL / 2));
    }

    // Vahemade (Landing 1.0m x 1.0m)
    const landingY = flight1Steps * stepH;
    const landingZ = -1.1 + flight1Steps * stepL + 0.45;
    g.add(box(width * 1.9, 0.06, width, MAT.woodLight, 0, landingY - 0.03, landingZ));

    // Teine marss: x-suunas (pöörab 90 kraadi)
    for (let i = 0; i < flight2Steps; i++) {
      const y = landingY + (i + 1) * stepH;
      const x = 0.45 + i * stepL;
      g.add(box(stepL + 0.03, 0.04, width, MAT.woodLight, x, y - 0.02, landingZ));
      g.add(box(0.02, stepH - 0.04, width - 0.04, MAT.whiteMetal, x - stepL / 2, y - stepH / 2 - 0.02, landingZ));
    }

    // Käsipuu toed ja postid
    g.add(box(0.08, landingY, 0.08, MAT.metal, -width + 0.04, landingY / 2, landingZ + width / 2));
    g.add(box(0.08, landingY, 0.08, MAT.metal, width - 0.04, landingY / 2, landingZ + width / 2));

    return mark(g, 'stairsLTurn', 'furniture');
  },

  stairsSpiral: () => {
    const g = new THREE.Group();
    const totalH = 2.8;
    const stepsCount = 16;
    const stepH = totalH / stepsCount;
    const radius = 0.85;

    // Keskmine terassammas
    g.add(cyl(0.06, 0.06, totalH + 0.9, MAT.metal, 0, (totalH + 0.9) / 2, 0, 16));

    // Spiraalselt lahknevad tammeastmed
    for (let i = 0; i < stepsCount; i++) {
      const y = (i + 1) * stepH;
      const angle = (i / stepsCount) * (Math.PI * 1.6);
      const stepMesh = box(radius, 0.045, 0.28, MAT.woodLight, radius / 2, 0, 0);
      const stepPivot = new THREE.Group();
      stepPivot.position.set(0, y, 0);
      stepPivot.rotation.y = angle;
      stepPivot.add(stepMesh);

      // Välimine püstpost
      const outerX = radius - 0.05;
      const baluster = cyl(0.012, 0.012, 0.88, MAT.metal, outerX, 0.44, 0);
      stepPivot.add(baluster);

      // Käsipuusegment
      const railCap = box(0.04, 0.03, 0.32, MAT.woodDark, outerX, 0.88, 0);
      stepPivot.add(railCap);

      g.add(stepPivot);
    }

    return mark(g, 'stairsSpiral', 'furniture');
  },
};

/**
 * Mööbli ja sisustuse viimistlusmaterjalide dünaamiline vahetamine
 */
export const FURNITURE_FINISHES = {
  fabric_gray: { name: 'Klassikaline hall tekstiil', mat: MAT.fabricGray },
  fabric_warm: { name: 'Soe linane beež', mat: MAT.fabricWarm },
  fabric_boucle: { name: 'Põhjamaine hele Bouclé', mat: MAT.fabricBoucle },
  fabric_navy: { name: 'Sügav öösinine kangas', mat: MAT.fabricNavy },
  leather_cognac: { name: 'Konjaki tooni naturaalnahk', mat: MAT.leatherCognac },
  wood_light: { name: 'Hele naturaalne tamm', mat: MAT.woodLight },
  wood_dark: { name: 'Tume suitsutamm', mat: MAT.woodDark },
  wood_walnut: { name: 'Soe väärikas pähkel', mat: MAT.woodWalnut },
  metal_black: { name: 'Matt must teras', mat: MAT.metal },
  metal_brass: { name: 'Harjatud soe messing / kuld', mat: MAT.brass },
  ceramic_white: { name: 'Karge valge keraamika', mat: MAT.ceramicWhite },
  terracotta: { name: 'Soe savi / terrakota', mat: MAT.terracotta },
};

export function applyFurnitureFinish(group, finishKey) {
  const finish = FURNITURE_FINISHES[finishKey];
  if (!finish || !group) return;
  group.userData.customFinish = finishKey;

  group.traverse(child => {
    if (child.isMesh && child.material) {
      // Kui objektil on tekstiil, puit või viimistletav pind
      const currentMat = child.material;
      if (finishKey.startsWith('fabric_') || finishKey.startsWith('leather_')) {
        // Asenda pehmed polstrid ja padjad
        if (currentMat === MAT.fabricGray || currentMat === MAT.fabricWarm || currentMat === MAT.fabricNavy || currentMat === MAT.fabricBoucle || currentMat === MAT.leatherCognac) {
          child.material = finish.mat;
        }
      } else if (finishKey.startsWith('wood_')) {
        // Asenda puitpinnad
        if (currentMat === MAT.woodLight || currentMat === MAT.woodDark || currentMat === MAT.woodWalnut) {
          child.material = finish.mat;
        }
      } else if (finishKey.startsWith('metal_')) {
        // Asenda metalljalad/raamid
        if (currentMat === MAT.metal || currentMat === MAT.brass || currentMat === MAT.whiteMetal) {
          child.material = finish.mat;
        }
      } else if (finishKey === 'ceramic_white' || finishKey === 'terracotta') {
        if (currentMat === MAT.ceramicWhite || currentMat === MAT.terracotta) {
          child.material = finish.mat;
        }
      }
    }
  });
}

