import { CONSTRUCTION_COSTS } from './config.js';
import {
  WALL_ASSEMBLIES,
  FLOOR_ASSEMBLIES,
  LAYER_MATERIALS,
  calculateAssemblyPhysics,
} from './assemblies.js';

export function calculateConstruction(walls, rooms, editableObjects, roofConfig) {
  let grossWallLength = 0;
  let grossWallArea = 0;
  let wallVolume = 0;
  let extWallArea = 0;
  let intWallArea = 0;

  const doors = [];
  const windows = [];

  walls.forEach(w => {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const h = w.h || 2.6;
    const t = w.t || 0.15;
    grossWallLength += len;
    const area = len * h;
    grossWallArea += area;
    wallVolume += area * t;

    if (t >= 0.22) extWallArea += area;
    else intWallArea += area;

    (w.openings || []).forEach(op => {
      const item = {
        type: op.type,
        width: op.width,
        height: op.height,
        area: +(op.width * op.height).toFixed(2),
        wallId: w.id
      };
      if (op.type === 'door') doors.push(item);
      else windows.push(item);
    });
  });

  const totalOpeningsArea = [...doors, ...windows].reduce((sum, o) => sum + o.area, 0);
  const netWallArea = Math.max(0, grossWallArea - totalOpeningsArea);

  // Floor and footprint calculations
  const totalInteriorArea = rooms.reduce((sum, r) => sum + (Number(r.area) || 0), 0);
  
  // Calculate bounding box of walls for footprint
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  walls.forEach(w => {
    minX = Math.min(minX, w.x1, w.x2);
    maxX = Math.max(maxX, w.x1, w.x2);
    minZ = Math.min(minZ, w.z1, w.z2);
    maxZ = Math.max(maxZ, w.z1, w.z2);
  });
  const hasWalls = walls.length > 0 && isFinite(minX);
  const footWidth = hasWalls ? Math.max(0, maxX - minX) : 0;
  const footDepth = hasWalls ? Math.max(0, maxZ - minZ) : 0;
  const buildingFootprint = +(footWidth * footDepth).toFixed(1);

  // Roof calculation
  const pitchRad = ((roofConfig?.pitch || 25) * Math.PI) / 180;
  const overhang = roofConfig?.overhang || 0.4;
  const roofWidth = Math.max(0, footWidth + overhang * 2);
  const roofDepth = Math.max(0, footDepth + overhang * 2);
  let roofArea = 0;
  if (roofConfig?.type === 'gable') {
    roofArea = +((roofWidth * roofDepth) / Math.cos(pitchRad)).toFixed(1);
  } else if (roofConfig?.type === 'shed') {
    roofArea = +((roofWidth * roofDepth) / Math.cos(pitchRad * 0.7)).toFixed(1);
  } else if (roofConfig?.type === 'flat') {
    roofArea = +(roofWidth * roofDepth * 1.05).toFixed(1);
  }

  // Landscape elements
  let terraceM2 = 0;
  let pathM2 = 0;
  let fenceM = 0;
  let plantsCount = 0;
  editableObjects.forEach(o => {
    const t = o.userData.type;
    if (t === 'deckModule') terraceM2 += 12;
    else if (t === 'stonePath' || t === 'gravelPath') pathM2 += 3;
    else if (t === 'fenceWood') fenceM += 4;
    else if (['appleTree', 'pine', 'birch', 'hedgeThuja', 'bushLilac'].includes(t)) plantsCount++;
  });

  // Cost estimates
  const foundationCost = Math.round(buildingFootprint * CONSTRUCTION_COSTS.foundationM2);
  const wallTimberCost = Math.round(netWallArea * CONSTRUCTION_COSTS.wallM2Timber);
  const roofCost = Math.round(roofArea * CONSTRUCTION_COSTS.roofM2);
  const terraceCost = Math.round(terraceM2 * CONSTRUCTION_COSTS.deckM2);
  const insulationCost = Math.round(netWallArea * CONSTRUCTION_COSTS.insulationM2);
  const interiorCost = Math.round(totalInteriorArea * CONSTRUCTION_COSTS.interiorFinishingM2);

  const doorsCost = doors.reduce((acc, d) => acc + (d.width >= 1.2 ? CONSTRUCTION_COSTS.doorEntry : CONSTRUCTION_COSTS.doorStd), 0);
  const windowsCost = windows.reduce((acc, w) => acc + (w.height >= 1.8 ? CONSTRUCTION_COSTS.windowPano : CONSTRUCTION_COSTS.windowStd), 0);

  const materialsSubtotal = foundationCost + wallTimberCost + roofCost + terraceCost + insulationCost + interiorCost + doorsCost + windowsCost;
  const laborCost = Math.round(materialsSubtotal * CONSTRUCTION_COSTS.laborRatio);
  const grandTotal = materialsSubtotal + laborCost;

  // Assemblies summary
  const wallAssembliesMap = new Map();
  walls.forEach(w => {
    const key = w.assemblyKey || (w.t >= 0.22 ? 'timber_ext_250' : 'timber_int_light');
    const asm = w.assembly || WALL_ASSEMBLIES[key] || WALL_ASSEMBLIES.timber_ext_250;
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    if (!wallAssembliesMap.has(asm.name)) {
      wallAssembliesMap.set(asm.name, {
        assembly: asm,
        physics: calculateAssemblyPhysics(asm, false),
        totalLength: 0,
        area: 0,
      });
    }
    const item = wallAssembliesMap.get(asm.name);
    item.totalLength += len;
    item.area += len * (w.h || 2.6);
  });

  const floorAssembliesMap = new Map();
  rooms.forEach(r => {
    const key = r.floorAssemblyKey || (r.floorMat === 'paver' ? 'terrace_paver_ground' : r.floorMat === 'tile_gray' ? 'ground_slab_tile' : 'ground_slab_heated');
    const asm = r.floorAssembly || FLOOR_ASSEMBLIES[key] || FLOOR_ASSEMBLIES.ground_slab_heated;
    const area = Number(r.area) || 10;
    if (!floorAssembliesMap.has(asm.name)) {
      floorAssembliesMap.set(asm.name, {
        assembly: asm,
        physics: calculateAssemblyPhysics(asm, true),
        area: 0,
      });
    }
    floorAssembliesMap.get(asm.name).area += area;
  });

  return {
    hasWalls,
    buildingFootprint,
    totalInteriorArea: +totalInteriorArea.toFixed(1),
    grossWallLength: +grossWallLength.toFixed(1),
    grossWallArea: +grossWallArea.toFixed(1),
    netWallArea: +netWallArea.toFixed(1),
    wallVolume: +wallVolume.toFixed(2),
    extWallArea: +extWallArea.toFixed(1),
    intWallArea: +intWallArea.toFixed(1),
    roofArea,
    totalOpeningsArea,
    doorsCount: doors.length,
    windowsCount: windows.length,
    doors,
    windows,
    terraceM2,
    pathM2,
    fenceM,
    plantsCount,
    wallAssemblies: Array.from(wallAssembliesMap.values()),
    floorAssemblies: Array.from(floorAssembliesMap.values()),
    costs: {
      foundationCost,
      wallTimberCost,
      roofCost,
      terraceCost,
      insulationCost,
      interiorCost,
      doorsCost,
      windowsCost,
      materialsSubtotal,
      laborCost,
      grandTotal,
    }
  };
}

export function renderSpecificationHtml(projectName, calc, rooms) {
  const c = calc.costs;
  return `
    <div class="spec-section">
      <h4>1. Hoone põhiparameetrid & ehitusmaht</h4>
      <table class="spec-table">
        <thead><tr><th>Parameeter</th><th class="num">Väärtus</th><th>Selgitus</th></tr></thead>
        <tbody>
          <tr><td>Ehitusalune pind (footprint)</td><td class="num"><strong>${calc.buildingFootprint} m²</strong></td><td>Hoone välispiiride pindala krundil</td></tr>
          <tr><td>Kasulik netopind (siseruumid)</td><td class="num"><strong>${calc.totalInteriorArea} m²</strong></td><td>Ruumide kogupind kokku</td></tr>
          <tr><td>Seinte kogupikkus</td><td class="num">${calc.grossWallLength} m</td><td>Välis- ja siseseinad</td></tr>
          <tr><td>Neto seinapind (ilma avadeta)</td><td class="num">${calc.netWallArea} m²</td><td>Bruto ${calc.grossWallArea} m² miinus avatäited</td></tr>
          <tr><td>Seinte maht</td><td class="num">${calc.wallVolume} m³</td><td>Konstruktiivne seinamaterjali maht</td></tr>
          <tr><td>Katuse pindala</td><td class="num">${calc.roofArea} m²</td><td>Koos räästaste ja kaldega</td></tr>
        </tbody>
      </table>
    </div>

    <div class="spec-section">
      <h4>2. Ruumide koondtabel ja põrandakatted</h4>
      <table class="spec-table">
        <thead><tr><th>Ruumi nimetus</th><th class="num">Pindala</th><th>Põrandakate</th></tr></thead>
        <tbody>
          ${rooms.length ? rooms.map(r => `
            <tr>
              <td>${r.name || 'Ruum'}</td>
              <td class="num">${r.area ? Number(r.area).toFixed(2) + ' m²' : '—'}</td>
              <td>${r.floorMat ? r.floorMat : 'Parkett / Plaat'}</td>
            </tr>
          `).join('') : '<tr><td colspan="3" class="muted">Ruume pole veel määratud. Lisa ruumi sildid või kasuta automaatset tuvastust.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="spec-section">
      <h4>3. Avatäited (uksed ja aknad)</h4>
      <table class="spec-table">
        <thead><tr><th>Tüüp</th><th class="num">Mõõt (L × K)</th><th class="num">Pindala</th></tr></thead>
        <tbody>
          ${calc.doors.map((d, i) => `<tr><td>Uks #${i + 1} (${d.width >= 1.2 ? 'Välis/terrassiuks' : 'Siseuks'})</td><td class="num">${(d.width*100).toFixed(0)} × ${(d.height*100).toFixed(0)} cm</td><td class="num">${d.area} m²</td></tr>`).join('')}
          ${calc.windows.map((w, i) => `<tr><td>Aken #${i + 1} (${w.height >= 1.8 ? 'Panoraamaken' : 'Standardaken'})</td><td class="num">${(w.width*100).toFixed(0)} × ${(w.height*100).toFixed(0)} cm</td><td class="num">${w.area} m²</td></tr>`).join('')}
          ${(!calc.doors.length && !calc.windows.length) ? '<tr><td colspan="3" class="muted">Avatäited seintel puuduvad</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <div class="spec-section">
      <h4>4. Ehituslik eelarve ja materjalide kalkulatsioon</h4>
      <table class="spec-table">
        <thead><tr><th>Ehitusetapp / Materjaligrupp</th><th class="num">Kogus</th><th class="num">Hinnanguline maksumus</th></tr></thead>
        <tbody>
          <tr><td>Vundamendi rajamine (plaat/post + soojustus)</td><td class="num">${calc.buildingFootprint} m²</td><td class="num">${c.foundationCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td>Kandvad seinad ja karkassipuit</td><td class="num">${calc.netWallArea} m²</td><td class="num">${c.wallTimberCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td>Seinte soojustus ja tuuletõke</td><td class="num">${calc.netWallArea} m²</td><td class="num">${c.insulationCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td>Katusekonstruktsioon, aluskate ja kate</td><td class="num">${calc.roofArea} m²</td><td class="num">${c.roofCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td>Uksed (${calc.doorsCount} tk)</td><td class="num">${calc.doorsCount} tk</td><td class="num">${c.doorsCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td>Aknad (${calc.windowsCount} tk)</td><td class="num">${calc.windowsCount} tk</td><td class="num">${c.windowsCost.toLocaleString('et-EE')} €</td></tr>
          <tr><td>Siseviimistlus ja põrandad</td><td class="num">${calc.totalInteriorArea} m²</td><td class="num">${c.interiorCost.toLocaleString('et-EE')} €</td></tr>
          ${calc.terraceM2 > 0 ? `<tr><td>Terrassid ja välispõrandad</td><td class="num">${calc.terraceM2} m²</td><td class="num">${c.terraceCost.toLocaleString('et-EE')} €</td></tr>` : ''}
          <tr class="total-row"><td>Ehitusmaterjalid kokku</td><td class="num">Orienteeruv</td><td class="num">${c.materialsSubtotal.toLocaleString('et-EE')} €</td></tr>
          <tr><td>Ehitustööd ja paigaldus (~38%)</td><td class="num">Tööjõud</td><td class="num">${c.laborCost.toLocaleString('et-EE')} €</td></tr>
          <tr class="total-row"><td><strong>KOGUMAKSUMUS (KM-ta)</strong></td><td></td><td class="num"><strong>~${c.grandTotal.toLocaleString('et-EE')} €</strong></td></tr>
        </tbody>
      </table>
      <p class="hint-sm" style="margin-top:0.6rem">Märkus: Hinnang põhineb tüüpprojekti keskmistel materjalihindadel Eestis. Täpne pakkumine sõltub pinnasetingimustest, eriosade (vesi, kanal, elekter, küte) lahendusest ja viimistlustasemest.</p>
    </div>

    <div class="spec-section">
      <h4>5. Konstruktsioonilised kihid ja soojusjuhtivus (U-arvud)</h4>
      <p class="hint-sm" style="margin-bottom:0.6rem;">Ehituslike kihtide spetsifikatsioon vastavalt EVS-EN ISO 6946 normidele:</p>

      <table class="spec-table">
        <thead><tr><th>Konstruktsioon</th><th class="num">Paksus</th><th class="num">Soojusläbivus U</th><th>Energiaklass & Kihtide kirjeldus</th></tr></thead>
        <tbody>
          ${(calc.wallAssemblies || []).map(w => `
            <tr>
              <td><strong>🧱 ${w.assembly.name}</strong><br><small class="muted">Maht: ${w.totalLength.toFixed(1)} jm / ${w.area.toFixed(1)} m²</small></td>
              <td class="num"><strong>${w.physics.totalMm} mm</strong><br><small>(${w.physics.totalM} m)</small></td>
              <td class="num"><strong style="color:${w.physics.uValue <= 0.16 ? '#15803d' : '#b45309'}">U = ${w.physics.uValue} W/m²K</strong><br><small>R = ${w.physics.R_total}</small></td>
              <td>
                <span class="u-badge ${w.physics.uValue <= 0.16 ? 'good' : 'warn'}">${w.physics.energyClass}</span>
                <div style="font-size:0.75rem; margin-top:0.25rem; color:#475569;">
                  ${w.assembly.layers.map((l, i) => `${i+1}. ${(LAYER_MATERIALS[l.matId]?.name || l.matId)} (${l.thickMm} mm)`).join(' · ')}
                </div>
              </td>
            </tr>
          `).join('')}

          ${(calc.floorAssemblies || []).map(f => `
            <tr>
              <td><strong>🪵 ${f.assembly.name}</strong><br><small class="muted">Pindala: ${f.area.toFixed(1)} m²</small></td>
              <td class="num"><strong>${f.physics.totalMm} mm</strong></td>
              <td class="num"><strong style="color:${f.physics.uValue <= 0.16 ? '#15803d' : '#b45309'}">U = ${f.physics.uValue} W/m²K</strong></td>
              <td>
                <span class="u-badge good">${f.physics.energyClass}</span>
                <div style="font-size:0.75rem; margin-top:0.25rem; color:#475569;">
                  ${f.assembly.layers.map((l, i) => `${i+1}. ${(LAYER_MATERIALS[l.matId]?.name || l.matId)} (${l.thickMm} mm)`).join(' · ')}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
