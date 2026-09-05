import * as THREE from 'three';
import { ROOM_MODULES } from './room-modules.js';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Lähima seina ja magnet-joondamise arvutamine
export function findNearestWall(x, z, walls) {
  if (!walls || !walls.length) return null;
  let nearest = null;
  let minDist = Infinity;

  walls.forEach(w => {
    const dx = w.x2 - w.x1;
    const dz = w.z2 - w.z1;
    const lenSq = dx * dx + dz * dz;
    if (lenSq < 0.001) return;

    let t = ((x - w.x1) * dx + (z - w.z1) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const px = w.x1 + t * dx;
    const pz = w.z1 + t * dz;
    const dist = Math.hypot(x - px, z - pz);

    if (dist < minDist) {
      minDist = dist;
      nearest = {
        wall: w,
        px,
        pz,
        dist,
        dx,
        dz,
        len: Math.sqrt(lenSq),
        t,
      };
    }
  });

  return nearest;
}

// Mööblieseme seina äärde joondamine (seljaga vastu seina)
export function alignToWall(obj, walls) {
  if (!obj || !walls || !walls.length) return null;
  const n = findNearestWall(obj.position.x, obj.position.z, walls);
  if (!n) return null;

  const w = n.wall;
  const ux = n.dx / n.len;
  const uz = n.dz / n.len;

  // Seina ristsuunaline normaalvektor
  let nx = -uz;
  let nz = ux;

  // Kontrolli, et normaal osutaks objekti poole
  const toObjX = obj.position.x - n.px;
  const toObjZ = obj.position.z - n.pz;
  if (nx * toObjX + nz * toObjZ < 0) {
    nx = -nx;
    nz = -nz;
  }

  // Hinda objekti sügavust (vaikimisi ~0.45m või bounding boxist)
  let depth = 0.45;
  try {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    depth = Math.max(0.3, Math.min(size.x, size.z) / 2);
  } catch {
    depth = 0.45;
  }

  const wallHalfT = (w.t || 0.2) / 2;
  const offset = wallHalfT + depth + 0.02;

  const targetX = n.px + nx * offset;
  const targetZ = n.pz + nz * offset;

  // Pööra objekt nii, et selle selg on seina poole (pind vaatab normaali suunas tuppa)
  const targetRotY = Math.atan2(nx, nz);

  return {
    x: targetX,
    z: targetZ,
    ry: targetRotY,
    dist: n.dist,
    wallId: w.id,
  };
}

// Objekti paigutamine ruumi keskele
export function findContainingRoom(x, z, rooms) {
  if (!rooms || !rooms.length) return null;
  let bestRoom = null;
  let minDist = Infinity;

  rooms.forEach(r => {
    const dist = Math.hypot(x - r.x, z - r.z);
    if (dist < minDist) {
      minDist = dist;
      bestRoom = r;
    }
  });

  return bestRoom;
}

// Ruumilahenduse mooduli genereerimine ja koordinaatide arvutamine
export function buildRoomModule(moduleKey, originX = 0, originZ = 0) {
  const mod = ROOM_MODULES[moduleKey];
  if (!mod) return null;

  const halfW = mod.width / 2;
  const halfD = mod.depth / 2;
  const h = 2.6;
  const t = mod.wallThick || 0.25;
  const mat = mod.wallMat || 'plaster';

  // 4 perimeetriseina (päripäeva alates tagaseinast)
  // Wall 0: Tagasein (-Z)
  // Wall 1: Parempoolne sein (+X)
  // Wall 2: Esisein (+Z)
  // Wall 3: Vasakpoolne sein (-X)
  const wallDefs = [
    { x1: originX - halfW, z1: originZ - halfD, x2: originX + halfW, z2: originZ - halfD },
    { x1: originX + halfW, z1: originZ - halfD, x2: originX + halfW, z2: originZ + halfD },
    { x1: originX + halfW, z1: originZ + halfD, x2: originX - halfW, z2: originZ + halfD },
    { x1: originX - halfW, z1: originZ + halfD, x2: originX - halfW, z2: originZ - halfD },
  ];

  const generatedWalls = wallDefs.map((def, idx) => {
    const openings = (mod.openings || [])
      .filter(op => op.wallIdx === idx)
      .map(op => ({
        type: op.type,
        along: op.along,
        width: op.width,
        height: op.height,
        sill: op.sill ?? 0,
      }));

    return {
      id: uid(),
      ...def,
      h,
      t,
      mat,
      openings,
    };
  });

  const generatedRoom = {
    id: uid(),
    name: `${mod.name} (${mod.area} m²)`,
    x: originX,
    z: originZ,
    area: mod.area,
    floorMat: mod.floorMat || 'parquet',
  };

  const generatedItems = (mod.items || []).map(item => ({
    type: item.type,
    x: originX + (item.rx || 0),
    z: originZ + (item.rz || 0),
    ry: item.ry || 0,
    s: 1,
  }));

  return {
    module: mod,
    walls: generatedWalls,
    room: generatedRoom,
    items: generatedItems,
  };
}

// Ergonoomika ja ruumilise läbipääsetavuse analüüs
export function analyzeErgonomics(walls, rooms, objects) {
  const issues = [];
  const checks = [];

  // 1. Uste avanemisalad ja blokeeringud
  let totalDoors = 0;
  let blockedDoors = 0;

  walls.forEach(w => {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    if (len < 0.1) return;
    const angle = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);

    (w.openings || []).forEach(op => {
      if (op.type !== 'door') return;
      totalDoors++;
      const doorW = op.width || 0.9;
      const ox = w.x1 + Math.cos(angle) * op.along;
      const oz = w.z1 + Math.sin(angle) * op.along;

      // Kontrolli, kas mööbel on uksest lähemal kui 0.85 * doorW
      objects.forEach(obj => {
        if (!obj.userData?.movable || obj.userData?.kind === 'wall' || obj.userData?.kind === 'room') return;
        const dist = Math.hypot(obj.position.x - ox, obj.position.z - oz);
        if (dist < doorW * 0.85) {
          blockedDoors++;
          issues.push({
            type: 'door_blocked',
            severity: 'warning',
            title: 'Ukse avanemistee on takistatud',
            desc: `Objekt "${obj.userData.type || 'Mööbel'}" asub ukse vahetus avanemistsoonis (${dist.toFixed(2)} m < ${doorW.toFixed(2)} m).`,
            x: ox,
            z: oz,
          });
        }
      });
    });
  });

  // 2. Käiguteede miinimumlaiused ja vaba ruum mööbli ümber
  let tightCorridors = 0;
  let minClearanceFound = 999;

  objects.forEach(obj => {
    if (!obj.userData?.movable || obj.userData?.kind === 'wall' || obj.userData?.kind === 'room') return;
    const n = findNearestWall(obj.position.x, obj.position.z, walls);
    if (!n) return;

    if (n.dist < minClearanceFound) minClearanceFound = n.dist;

    // Kui ese on suurem (voodi, diivan, söögilaud) ja seina vahe on 0.25m .. 0.65m (pole päris vastu seina ega jäta ka käiguruumi)
    const t = obj.userData.type || '';
    const isLargeCentral = ['table', 'bed', 'sofa', 'kitchenUnit'].includes(t);
    if (isLargeCentral && n.dist > 0.25 && n.dist < 0.70) {
      tightCorridors++;
      issues.push({
        type: 'tight_corridor',
        severity: 'notice',
        title: 'Kitsas liikumiskoridor',
        desc: `Käigutee objekti "${t}" ja seina vahel on vaid ${n.dist.toFixed(2)} m. Soovitatav miinimum on vähemalt 0.80 m.`,
        x: obj.position.x,
        z: obj.position.z,
      });
    }
  });

  // Kokkuvõte
  let badgeStatus = 'good';
  let summaryText = 'Ergonoomika: Suurepärane · Käiguteed vabad';

  if (blockedDoors > 0) {
    badgeStatus = 'error';
    summaryText = `Tähelepanu: ${blockedDoors} ukse avanemistee on takistatud`;
  } else if (tightCorridors > 0) {
    badgeStatus = 'warn';
    summaryText = `Ergonoomika: ${tightCorridors} kitsast käiguteed (< 0.8 m)`;
  } else if (objects.length > 3) {
    summaryText = `Ergonoomika: Hea ruumijaotus · Vaba liikumine tagatud`;
  }

  const doorClearanceRatio = totalDoors > 0
    ? Math.round(((totalDoors - blockedDoors) / totalDoors) * 100)
    : 100;
  const minClearanceM = minClearanceFound === 999 ? '0.90' : minClearanceFound.toFixed(2);

  return {
    status: badgeStatus,
    badgeStatus,
    summary: summaryText,
    summaryText,
    issues,
    totalDoors,
    blockedDoors,
    tightCorridors,
    minClearance: minClearanceM,
    stats: {
      doorClearanceRatio,
      minClearanceM,
      totalItems: objects.filter(o => o.userData?.movable && o.userData?.kind !== 'wall' && o.userData?.kind !== 'room').length,
      totalDoors,
      blockedDoors,
      tightCorridors,
    },
  };
}
