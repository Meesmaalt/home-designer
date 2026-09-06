// Puitkarkassi (Timber Framing) ja seinakihtide inseneritehniline moodul
// Arvutab ja genereerib reaalsed puitpostid (sammuga 600 mm), vööd, nurgapostid,
// avade sillused (headers), katuse sarikad ning võimaldab kihtide astmelist läbilõiget.

import * as THREE from 'three';

export const FRAMING_PRESETS = {
  studSpacingStandard: 0.60, // 600 mm Põhjamaade standard
  studSpacingDense: 0.40,    // 400 mm tugevdatud karkass
  timberThickness: 0.045,    // 45 mm kalibreeritud C24 puit
  plateThickness: 0.045,     // 45 mm vöö paksus
  headerDepth: 0.195,        // 195 mm sillusava tala
};

// Ühised materjalid karkassile ja kihtidele (hoitakse ühtsena jõudluse tagamiseks)
let framingMaterials = null;

function getFramingMaterials() {
  if (framingMaterials) return framingMaterials;

  framingMaterials = {
    // C24 hööveldatud okaspuit (hele soe puidutoon)
    timber: new THREE.MeshStandardMaterial({
      color: 0xdfb479,
      roughness: 0.72,
      metalness: 0.04,
    }),
    // Taldmik / immutatud alusvöö (rohekas immutuspuit)
    soleTreated: new THREE.MeshStandardMaterial({
      color: 0x8ea372,
      roughness: 0.78,
      metalness: 0.02,
    }),
    // Sillus / liimpuit (tumedam tugevdatud puit)
    headerTimber: new THREE.MeshStandardMaterial({
      color: 0xc49354,
      roughness: 0.65,
      metalness: 0.05,
    }),
    // Mineraalvill (kollakas soe villatekstuur)
    mineralWool: new THREE.MeshStandardMaterial({
      color: 0xf1df91,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.92,
    }),
    // Tuuletõkke kipsplaat GTS 9 (kollakasroheline)
    windBarrier: new THREE.MeshStandardMaterial({
      color: 0xd6de78,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
    }),
    // Aurutõkkekile PE (läbipaistev sinakas kile)
    vaporBarrier: new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
    // Välisvoodrilaud (tume viimistletud puit)
    exteriorCladding: new THREE.MeshStandardMaterial({
      color: 0x4a3b32,
      roughness: 0.6,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
    }),
    // Sisevooder / kipsplaat
    interiorPlaster: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.82,
    }),
    // Sarikad ja katusetalad
    rafterTimber: new THREE.MeshStandardMaterial({
      color: 0xd9a86c,
      roughness: 0.70,
      metalness: 0.04,
    }),
  };

  return framingMaterials;
}

/**
 * Puhastab ja vabastab karkassi Three.js ressursside mälu
 */
export function disposeFramingGroup(group) {
  if (!group) return;
  group.traverse(child => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      // Ära vabasta jagatud materjale, ainult unikaalsed
    }
  });
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }
}

/**
 * Genereerib hoone seinte täieliku insenertehnilise puitkarkassi (C24)
 * @param {Array} walls - Hoone seinte massiiv
 * @param {Object} roofConfig - Katuse konfiguratsioon
 * @param {Object} options - Valikud: { mode: 'studs'|'insulation'|'cutaway'|'peel', studSpacing: 0.6, peelPercent: 50, includeRoof: true, floorY: 0.2 }
 * @returns {Object} { group: THREE.Group, stats: Object }
 */
export function buildTimberFramingModel(walls, roofConfig = {}, options = {}) {
  const mats = getFramingMaterials();
  const group = new THREE.Group();
  group.name = 'TimberFramingModel';

  const mode = options.mode || 'studs'; // 'studs', 'insulation', 'cutaway', 'peel'
  const studSpacing = options.studSpacing || FRAMING_PRESETS.studSpacingStandard;
  const timberThick = FRAMING_PRESETS.timberThickness; // 45 mm
  const floorY = options.floorY ?? 0.2;
  const peelRatio = (options.peelPercent !== undefined ? options.peelPercent : 50) / 100;
  const includeRoof = options.includeRoof !== false;

  const stats = {
    studCount: 0,
    linearMetersTimber: 0,
    timberVolumeM3: 0,
    insulationVolumeM3: 0,
    insulationAreaM2: 0,
    windBarrierAreaM2: 0,
    vaporBarrierAreaM2: 0,
  };

  function addStud(w, h, d, mat, px, py, pz, rotY) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px, py, pz);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    stats.studCount++;
    stats.linearMetersTimber += h;
    stats.timberVolumeM3 += w * h * d;
    return mesh;
  }

  function addPlate(w, h, d, mat, px, py, pz, rotY) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px, py, pz);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    stats.linearMetersTimber += w;
    stats.timberVolumeM3 += w * h * d;
    return mesh;
  }

  function addInsulationBlock(w, h, d, px, py, pz, rotY) {
    if (w <= 0.04 || h <= 0.04) return;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mats.mineralWool);
    mesh.position.set(px, py, pz);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    group.add(mesh);

    stats.insulationVolumeM3 += w * h * d;
    stats.insulationAreaM2 += w * h;
  }

  function addLayerPlane(w, h, d, mat, px, py, pz, rotY) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px, py, pz);
    mesh.rotation.y = rotY;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // 1. IGA SEINA PUIDUKARKASS
  walls.forEach(w => {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    if (len < 0.2) return;

    const angle = Math.atan2(w.z2 - w.z1, w.x2 - w.x1);
    const wallH = w.h || 2.8;
    // Karkassi sügavus: kui seina paksus >= 0.22, siis 195 mm karkass, muidu 145 mm (või vaheseinas 95 mm)
    const studDepth = (w.t || 0.15) >= 0.22 ? 0.195 : (w.t || 0.15) >= 0.14 ? 0.145 : 0.095;
    const plateH = FRAMING_PRESETS.plateThickness; // 0.045 m
    const doubleTopH = plateH * 2; // 0.090 m topelt-ülemine vöö

    const studHeight = Math.max(0.4, wallH - plateH - doubleTopH);
    const midX = (w.x1 + w.x2) / 2;
    const midZ = (w.z1 + w.z2) / 2;

    // A. ALUMINE VÖÖ (Taldmik / immutatud alusvöö maapinna/põranda peal)
    addPlate(len, plateH, studDepth, mats.soleTreated, midX, floorY + plateH / 2, midZ, -angle);

    // B. ÜLEMINE TOPELT-VÖÖ (Double Top Plate nurgasidemeteks)
    addPlate(len, plateH, studDepth, mats.timber, midX, floorY + wallH - plateH * 1.5, midZ, -angle);
    addPlate(len, plateH, studDepth, mats.timber, midX, floorY + wallH - plateH / 2, midZ, -angle);

    // Avad sellel seinal
    const openings = (w.openings || []).map(op => {
      const start = Math.max(0, op.along - op.width / 2);
      const end = Math.min(len, op.along + op.width / 2);
      const h = op.height || (op.type === 'door' ? 2.1 : 1.3);
      const sill = op.type === 'door' ? 0 : (op.sill ?? 0.9);
      return { ...op, start, end, h, sill };
    }).sort((a, b) => a.start - b.start);

    // Arvutame postide asukohad (xAlong mööda seina)
    const studAlongPositions = [];

    // Alusta nurgapostist
    studAlongPositions.push(timberThick / 2);
    // Lisa topelt-nurgapost stabiilsuseks
    studAlongPositions.push(timberThick * 1.5);

    // Tavapostid sammuga 600 mm
    let cur = studSpacing;
    while (cur < len - timberThick * 1.5) {
      studAlongPositions.push(cur);
      cur += studSpacing;
    }

    // Lõpeta nurgapostiga
    studAlongPositions.push(len - timberThick * 1.5);
    studAlongPositions.push(len - timberThick / 2);

    // Avade lengipostid (King studs ja Jack studs)
    const headerLocations = [];
    openings.forEach(op => {
      // King stud (täispikkuses) ava vasakul ja paremal
      const kingLeft = Math.max(timberThick / 2, op.start - timberThick / 2);
      const kingRight = Math.min(len - timberThick / 2, op.end + timberThick / 2);
      studAlongPositions.push(kingLeft);
      studAlongPositions.push(kingRight);

      // Jack stud (ava sillust toetav lühem post) ava mõlemal äärel
      const jackLeft = op.start + timberThick / 2;
      const jackRight = op.end - timberThick / 2;
      const jackH = op.sill + op.h;
      if (jackH > 0.1 && jackH < wallH - doubleTopH) {
        const jxL = w.x1 + Math.cos(angle) * jackLeft;
        const jzL = w.z1 + Math.sin(angle) * jackLeft;
        addStud(timberThick, jackH, studDepth, mats.timber, jxL, floorY + plateH + jackH / 2, jzL, -angle);

        const jxR = w.x1 + Math.cos(angle) * jackRight;
        const jzR = w.z1 + Math.sin(angle) * jackRight;
        addStud(timberThick, jackH, studDepth, mats.timber, jxR, floorY + plateH + jackH / 2, jzR, -angle);
      }

      // Sillus (Header) ava kohal
      const headerLen = op.width + timberThick * 2;
      const headerH = Math.min(0.20, Math.max(0.12, wallH - doubleTopH - (op.sill + op.h)));
      const headerCenterAlong = op.along;
      const headerY = floorY + plateH + op.sill + op.h + headerH / 2;
      const hx = w.x1 + Math.cos(angle) * headerCenterAlong;
      const hz = w.z1 + Math.sin(angle) * headerCenterAlong;
      addPlate(headerLen, headerH, studDepth, mats.headerTimber, hx, headerY, hz, -angle);
      headerLocations.push({ headerCenterAlong, headerLen, headerY, headerH, topH: wallH - doubleTopH - (op.sill + op.h + headerH) });

      // Akna alusvöö (Sill plate) ja aknaalused lühikesed postid (Cripple studs)
      if (op.sill > 0.1) {
        const sillCenterY = floorY + plateH + op.sill - plateH / 2;
        addPlate(op.width, plateH, studDepth, mats.timber, hx, sillCenterY, hz, -angle);

        // Cripple studs akna all
        const crippleH = op.sill - plateH;
        if (crippleH > 0.1) {
          let cAlong = op.start + studSpacing / 2;
          while (cAlong < op.end) {
            const cx = w.x1 + Math.cos(angle) * cAlong;
            const cz = w.z1 + Math.sin(angle) * cAlong;
            addStud(timberThick, crippleH, studDepth, mats.timber, cx, floorY + plateH + crippleH / 2, cz, -angle);
            cAlong += studSpacing;
          }
        }
      }

      // Sillusepealsed tugipostid (Top cripple studs)
      const topSpace = wallH - doubleTopH - (op.sill + op.h + headerH);
      if (topSpace > 0.1) {
        let tcAlong = op.start + studSpacing / 2;
        while (tcAlong < op.end) {
          const tcx = w.x1 + Math.cos(angle) * tcAlong;
          const tcz = w.z1 + Math.sin(angle) * tcAlong;
          addStud(timberThick, topSpace, studDepth, mats.timber, tcx, floorY + wallH - doubleTopH - topSpace / 2, tcz, -angle);
          tcAlong += studSpacing;
        }
      }
    });

    // Filtreeri postid, et vältida dubleerimist ja postide tekkimist otse akna/ukseava tühimikku
    const uniquePositions = [...new Set(studAlongPositions.map(p => Math.round(p * 100) / 100))].sort((a, b) => a - b);
    const finalStuds = uniquePositions.filter(p => {
      // Kontrolli, kas post satub akna või ukse sisse
      for (const op of openings) {
        if (p > op.start + 0.03 && p < op.end - 0.03) {
          return false; // avas ei tohi olla täispikka posti
        }
      }
      return true;
    });

    // Loo vertikaalsed karkassipostid
    finalStuds.forEach(along => {
      const sx = w.x1 + Math.cos(angle) * along;
      const sz = w.z1 + Math.sin(angle) * along;
      const sy = floorY + plateH + studHeight / 2;
      addStud(timberThick, studHeight, studDepth, mats.timber, sx, sy, sz, -angle);
    });

    // C. SOOJUSTUS POSTIDE VAHEL (kui režiim 'insulation' või 'cutaway')
    if (mode === 'insulation' || mode === 'cutaway' || mode === 'peel') {
      for (let i = 0; i < finalStuds.length - 1; i++) {
        const p1 = finalStuds[i] + timberThick / 2;
        const p2 = finalStuds[i + 1] - timberThick / 2;
        const bayWidth = p2 - p1;
        if (bayWidth > 0.06) {
          // Vaata, kas selles vahes on ava
          let inOpening = false;
          for (const op of openings) {
            if (p1 >= op.start - 0.02 && p2 <= op.end + 0.02) {
              inOpening = true;
              break;
            }
          }
          if (!inOpening) {
            const bayMid = (p1 + p2) / 2;
            const bx = w.x1 + Math.cos(angle) * bayMid;
            const bz = w.z1 + Math.sin(angle) * bayMid;
            const by = floorY + plateH + studHeight / 2;

            // Cutaway režiimis astmeline kõrgus
            const woolH = (mode === 'cutaway') ? studHeight * 0.85 : studHeight;
            const woolY = floorY + plateH + woolH / 2;
            addInsulationBlock(bayWidth, woolH, studDepth * 0.96, bx, woolY, bz, -angle);
          }
        }
      }
    }

    // D. SEINAKIHTIDE ASTMELINE LÄBILÕIGE (Stepped Layer Cutaway või Peel Slider)
    if (mode === 'cutaway' || mode === 'peel') {
      const normalX = -Math.sin(angle);
      const normalZ = Math.cos(angle);

      // Kiht 1: Tuuletõkkeplaat (karkassi välisküljel)
      const windH = mode === 'peel' ? wallH * (1 - peelRatio * 0.3) : wallH * 0.65;
      if (windH > 0.1) {
        const windDist = studDepth / 2 + 0.009 / 2;
        const wx = midX + normalX * windDist;
        const wz = midZ + normalZ * windDist;
        addLayerPlane(len, windH, 0.009, mats.windBarrier, wx, floorY + windH / 2, wz, -angle);
        stats.windBarrierAreaM2 += len * windH;
      }

      // Kiht 2: Fassaadi laudis (kõige välisem kiht, lõigatud madalamalt)
      const cladH = mode === 'peel' ? wallH * Math.max(0, 1 - peelRatio) : wallH * 0.40;
      if (cladH > 0.1) {
        const cladDist = studDepth / 2 + 0.025 + 0.021 / 2;
        const cx = midX + normalX * cladDist;
        const cz = midZ + normalZ * cladDist;
        addLayerPlane(len, cladH, 0.021, mats.exteriorCladding, cx, floorY + cladH / 2, cz, -angle);
      }

      // Kiht 3: Aurutõkkekile (karkassi siseküljel)
      const vaporH = mode === 'peel' ? wallH * (1 - peelRatio * 0.15) : wallH * 0.90;
      if (vaporH > 0.1) {
        const vaporDist = -(studDepth / 2 + 0.002);
        const vx = midX + normalX * vaporDist;
        const vz = midZ + normalZ * vaporDist;
        addLayerPlane(len, vaporH, 0.002, mats.vaporBarrier, vx, floorY + vaporH / 2, vz, -angle);
        stats.vaporBarrierAreaM2 += len * vaporH;
      }

      // Kiht 4: Sisevooder / kipsplaat
      const intH = mode === 'peel' ? wallH : wallH;
      const intDist = -(studDepth / 2 + 0.045 + 0.013 / 2);
      const ix = midX + normalX * intDist;
      const iz = midZ + normalZ * intDist;
      addLayerPlane(len, intH, 0.013, mats.interiorPlaster, ix, floorY + intH / 2, iz, -angle);
    }
  });

  // 2. KATUSE SARIKAD JA PUITKONSTRUKTSIOON (Roof Rafters & Collar Ties)
  if (includeRoof && walls.length > 0 && roofConfig.type !== 'none') {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxH = 0;
    walls.forEach(w => {
      minX = Math.min(minX, w.x1, w.x2);
      maxX = Math.max(maxX, w.x1, w.x2);
      minZ = Math.min(minZ, w.z1, w.z2);
      maxZ = Math.max(maxZ, w.z1, w.z2);
      maxH = Math.max(maxH, w.h || 2.8);
    });

    const bW = maxX - minX;
    const bD = maxZ - minZ;
    const pitchDeg = roofConfig.pitch || 25;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    const rafterSpacing = 0.60; // 600 mm sarika samm
    const rafterThick = 0.045;
    const rafterDepth = 0.195; // 45x195 mm sarikad
    const ridgeH = Math.tan(pitchRad) * (bW / 2);
    const rafterLen = (bW / 2 + 0.3) / Math.cos(pitchRad);

    const roofBaseY = floorY + maxH;

    // Harjatala (Ridge Beam)
    addPlate(bD + 0.6, 0.195, 0.045, mats.headerTimber, (minX + maxX) / 2, roofBaseY + ridgeH, (minZ + maxZ) / 2, 0);

    // Sarikapaarid 600 mm sammuga piki hoonet
    let rz = minZ - 0.2;
    while (rz <= maxZ + 0.2) {
      // Vasakpoolne sarikas
      const leftGeo = new THREE.BoxGeometry(rafterLen, rafterThick, rafterDepth);
      const leftMesh = new THREE.Mesh(leftGeo, mats.rafterTimber);
      leftMesh.position.set(minX + bW / 4 - 0.15 * Math.cos(pitchRad), roofBaseY + ridgeH / 2, rz);
      leftMesh.rotation.z = pitchRad;
      leftMesh.castShadow = true;
      group.add(leftMesh);

      // Parempoolne sarikas
      const rightGeo = new THREE.BoxGeometry(rafterLen, rafterThick, rafterDepth);
      const rightMesh = new THREE.Mesh(rightGeo, mats.rafterTimber);
      rightMesh.position.set(maxX - bW / 4 + 0.15 * Math.cos(pitchRad), roofBaseY + ridgeH / 2, rz);
      rightMesh.rotation.z = -pitchRad;
      rightMesh.castShadow = true;
      group.add(rightMesh);

      // Penn (Collar tie) sidumiseks
      if (bW > 2.5) {
        const collarW = bW * 0.55;
        const collarY = roofBaseY + ridgeH * 0.55;
        addPlate(collarW, 0.095, rafterThick, mats.timber, (minX + maxX) / 2, collarY, rz, 0);
      }

      stats.studCount += 2;
      stats.linearMetersTimber += rafterLen * 2;
      stats.timberVolumeM3 += rafterLen * 2 * rafterThick * rafterDepth;

      rz += rafterSpacing;
    }
  }

  stats.linearMetersTimber = Math.round(stats.linearMetersTimber * 10) / 10;
  stats.timberVolumeM3 = Math.round(stats.timberVolumeM3 * 100) / 100;
  stats.insulationVolumeM3 = Math.round(stats.insulationVolumeM3 * 10) / 10;
  stats.insulationAreaM2 = Math.round(stats.insulationAreaM2 * 10) / 10;
  stats.windBarrierAreaM2 = Math.round(stats.windBarrierAreaM2 * 10) / 10;
  stats.vaporBarrierAreaM2 = Math.round(stats.vaporBarrierAreaM2 * 10) / 10;

  return { group, stats };
}
