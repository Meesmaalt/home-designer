// Konstruktsiooniliste kihtide (Sandwich assemblies) ja soojusjuhtivuse (U-väärtus) moodul
// Võimaldab defineerida seina ja põranda ehituslikke kihte, paksusi ja materjale ning genereerida arhitektuurseid ristlõikeid.

export const LAYER_MATERIALS = {
  // Fassaad & Välisviimistlus
  wood_cladding_21: {
    id: 'wood_cladding_21',
    name: 'Puitvoodrilaud (kuusk/mänd)',
    category: 'cladding',
    defaultThickMm: 21,
    lambda: 0.13,
    color: '#d6a87c',
    hatch: 'wood',
    role: 'exterior',
  },
  render_ext_10: {
    id: 'render_ext_10',
    name: 'Fassaadikrohv (silikoon/mineraalne)',
    category: 'cladding',
    defaultThickMm: 10,
    lambda: 0.80,
    color: '#e2decb',
    hatch: 'stipple',
    role: 'exterior',
  },
  brick_veneer_85: {
    id: 'brick_veneer_85',
    name: 'Fassaaditellis / tellisvooder',
    category: 'cladding',
    defaultThickMm: 85,
    lambda: 0.60,
    color: '#b85438',
    hatch: 'brick',
    role: 'exterior',
  },
  facade_board_8: {
    id: 'facade_board_8',
    name: 'Tsementkiud fassaadiplaat',
    category: 'cladding',
    defaultThickMm: 8,
    lambda: 0.35,
    color: '#7b8591',
    hatch: 'solid',
    role: 'exterior',
  },

  // Tuulutus ja aluskate
  vent_cavity_25: {
    id: 'vent_cavity_25',
    name: 'Tuulutusvahe roovitus',
    category: 'cavity',
    defaultThickMm: 25,
    lambda: 0.14, // ekvivalent õhuvahele
    color: '#f0ece1',
    hatch: 'cavity',
    role: 'ventilation',
  },
  wind_barrier_gyproc_9: {
    id: 'wind_barrier_gyproc_9',
    name: 'Tuuletõkke kipsplaat (GTS 9)',
    category: 'membrane',
    defaultThickMm: 9,
    lambda: 0.21,
    color: '#e5eaae',
    hatch: 'gypsum',
    role: 'membrane',
  },
  wind_barrier_wool_30: {
    id: 'wind_barrier_wool_30',
    name: 'Tuuletõkke villaplaat (Isover RKL-30)',
    category: 'insulation',
    defaultThickMm: 30,
    lambda: 0.031,
    color: '#d4ce5e',
    hatch: 'wool',
    role: 'insulation',
  },

  // Kandekonstruktsioon ja põhisoojustus
  stud_wool_150: {
    id: 'stud_wool_150',
    name: 'Puitkarkass 50×150 mm + mineraalvill',
    category: 'structure',
    defaultThickMm: 150,
    lambda: 0.036,
    color: '#f6d88c',
    hatch: 'wool_stud',
    role: 'structure',
  },
  stud_wool_200: {
    id: 'stud_wool_200',
    name: 'Puitkarkass 50×200 mm + mineraalvill',
    category: 'structure',
    defaultThickMm: 200,
    lambda: 0.035,
    color: '#f6d88c',
    hatch: 'wool_stud',
    role: 'structure',
  },
  stud_wool_250: {
    id: 'stud_wool_250',
    name: 'Puitkarkass 50×250 mm + mineraalvill',
    category: 'structure',
    defaultThickMm: 250,
    lambda: 0.035,
    color: '#f6d88c',
    hatch: 'wool_stud',
    role: 'structure',
  },
  bauroc_ecoterm_375: {
    id: 'bauroc_ecoterm_375',
    name: 'Bauroc Ecoterm+ 375 mm poorbetoonplokk',
    category: 'masonry',
    defaultThickMm: 375,
    lambda: 0.072,
    color: '#cbd5e1',
    hatch: 'diagonal',
    role: 'structure',
  },
  bauroc_classic_200: {
    id: 'bauroc_classic_200',
    name: 'Bauroc Classic 200 mm plokk',
    category: 'masonry',
    defaultThickMm: 200,
    lambda: 0.10,
    color: '#94a3b8',
    hatch: 'diagonal',
    role: 'structure',
  },
  fibo_block_200: {
    id: 'fibo_block_200',
    name: 'Fibo 3 kergkruusaplokk 200 mm',
    category: 'masonry',
    defaultThickMm: 200,
    lambda: 0.20,
    color: '#71717a',
    hatch: 'stipple',
    role: 'structure',
  },
  eps_silver_200: {
    id: 'eps_silver_200',
    name: 'EPS Silver fassaadisoojustus 200 mm',
    category: 'insulation',
    defaultThickMm: 200,
    lambda: 0.031,
    color: '#a1a1aa',
    hatch: 'foam',
    role: 'insulation',
  },
  stud_partition_66: {
    id: 'stud_partition_66',
    name: 'Karkass 66 mm + akustiline vill',
    category: 'structure',
    defaultThickMm: 66,
    lambda: 0.038,
    color: '#e4d49a',
    hatch: 'wool_stud',
    role: 'structure',
  },
  block_partition_100: {
    id: 'block_partition_100',
    name: 'Bauroc Element 100 mm vaheseinaplokk',
    category: 'masonry',
    defaultThickMm: 100,
    lambda: 0.13,
    color: '#a8b5c2',
    hatch: 'diagonal',
    role: 'structure',
  },

  // Aurutõke ja lisapaigaldus
  vapor_barrier_pe: {
    id: 'vapor_barrier_pe',
    name: 'Aurutõkkekile PE 0.2 mm (õhutihe kiht)',
    category: 'membrane',
    defaultThickMm: 1, // visualiseeritav 1mm
    lambda: 0.33,
    color: '#38bdf8',
    hatch: 'line',
    role: 'membrane',
  },
  installation_cavity_45: {
    id: 'installation_cavity_45',
    name: 'Paigalduskarkass 45 mm + vill (kommunikatsioonid)',
    category: 'cavity',
    defaultThickMm: 45,
    lambda: 0.036,
    color: '#f8e4a8',
    hatch: 'wool_stud',
    role: 'insulation',
  },

  // Siseviimistlus
  gypsum_board_13: {
    id: 'gypsum_board_13',
    name: 'Kipsplaat Gyproc GN 13',
    category: 'finishing',
    defaultThickMm: 13,
    lambda: 0.25,
    color: '#ede9dd',
    hatch: 'gypsum',
    role: 'interior',
  },
  gypsum_double_25: {
    id: 'gypsum_double_25',
    name: '2× Kipsplaat (25 mm helikindel)',
    category: 'finishing',
    defaultThickMm: 25,
    lambda: 0.25,
    color: '#e4decb',
    hatch: 'gypsum',
    role: 'interior',
  },
  wood_lining_int_14: {
    id: 'wood_lining_int_14',
    name: 'Sisevoodrilaud (okaspuu 14 mm)',
    category: 'finishing',
    defaultThickMm: 14,
    lambda: 0.13,
    color: '#f5d9b5',
    hatch: 'wood',
    role: 'interior',
  },
  render_int_10: {
    id: 'render_int_10',
    name: 'Sisekrohv ja pahtel (10 mm)',
    category: 'finishing',
    defaultThickMm: 10,
    lambda: 0.70,
    color: '#f5f4ef',
    hatch: 'stipple',
    role: 'interior',
  },

  // Põranda kihid
  floor_parquet_14: {
    id: 'floor_parquet_14',
    name: 'Tammeparkett 14 mm',
    category: 'floor_finish',
    defaultThickMm: 14,
    lambda: 0.17,
    color: '#c99355',
    hatch: 'wood',
    role: 'interior',
  },
  floor_tile_10: {
    id: 'floor_tile_10',
    name: 'Keraamiline põrandaplaat 10 mm',
    category: 'floor_finish',
    defaultThickMm: 10,
    lambda: 1.30,
    color: '#838e9a',
    hatch: 'grid',
    role: 'interior',
  },
  floor_underlay_4: {
    id: 'floor_underlay_4',
    name: 'Aluskate / sammumüramatt 4 mm',
    category: 'membrane',
    defaultThickMm: 4,
    lambda: 0.04,
    color: '#d4d4d8',
    hatch: 'line',
    role: 'membrane',
  },
  concrete_slab_80: {
    id: 'concrete_slab_80',
    name: 'Raudbetoonplaat küttega C25/30 80 mm',
    category: 'structure',
    defaultThickMm: 80,
    lambda: 2.0,
    color: '#a1a1aa',
    hatch: 'concrete',
    role: 'structure',
  },
  eps_floor_200: {
    id: 'eps_floor_200',
    name: 'EPS 100 põrandasoojustus 200 mm',
    category: 'insulation',
    defaultThickMm: 200,
    lambda: 0.036,
    color: '#e4e4e7',
    hatch: 'foam',
    role: 'insulation',
  },
  gravel_subbase_150: {
    id: 'gravel_subbase_150',
    name: 'Tihendatud killustik / liiva tasanduskiht 150 mm',
    category: 'subbase',
    defaultThickMm: 150,
    lambda: 0.70,
    color: '#78716c',
    hatch: 'stipple',
    role: 'subbase',
  },
  subsoil_ground: {
    id: 'subsoil_ground',
    name: 'Geotekstiil ja aluspinnas',
    category: 'subbase',
    defaultThickMm: 60,
    lambda: 1.5,
    color: '#574d42',
    hatch: 'diagonal',
    role: 'subbase',
  },
  paver_block_60: {
    id: 'paver_block_60',
    name: 'Betoonist unikivi sillutis 60 mm',
    category: 'floor_finish',
    defaultThickMm: 60,
    lambda: 1.40,
    color: '#64748b',
    hatch: 'brick',
    role: 'exterior',
  },
  sand_bedding_30: {
    id: 'sand_bedding_30',
    name: 'Paigaldusliiv 30 mm',
    category: 'subbase',
    defaultThickMm: 30,
    lambda: 0.55,
    color: '#d9be8c',
    hatch: 'stipple',
    role: 'subbase',
  },
};

// Tüüpsed seina- ja põrandakoostud (Presets)
export const WALL_ASSEMBLIES = {
  timber_ext_250: {
    id: 'timber_ext_250',
    name: 'Energiatõhus puitkarkass-välissein (U ~ 0.12)',
    type: 'exterior',
    desc: 'Kaasaegne Põhjamaade puitfassaadiga välissein tuulutuse ja paigaldusrooviga',
    layers: [
      { matId: 'wood_cladding_21', thickMm: 21 },
      { matId: 'vent_cavity_25', thickMm: 25 },
      { matId: 'wind_barrier_wool_30', thickMm: 30 },
      { matId: 'stud_wool_200', thickMm: 200 },
      { matId: 'vapor_barrier_pe', thickMm: 1 },
      { matId: 'installation_cavity_45', thickMm: 45 },
      { matId: 'gypsum_board_13', thickMm: 13 },
    ],
  },
  bauroc_ext_375: {
    id: 'bauroc_ext_375',
    name: 'Bauroc Ecoterm+ 375 mm monoliitne plokksein (U ~ 0.18)',
    type: 'exterior',
    desc: 'Hingav ja soojapidav ühekihiline poorbetoonsein ilma lisasoojustuseta',
    layers: [
      { matId: 'render_ext_10', thickMm: 10 },
      { matId: 'bauroc_ecoterm_375', thickMm: 375 },
      { matId: 'render_int_10', thickMm: 10 },
    ],
  },
  block_eps_render: {
    id: 'block_eps_render',
    name: 'Krohvitud plokksein lisasoojustusega (U ~ 0.14)',
    type: 'exterior',
    desc: 'Bauroc/Fibo kandev kiviplokk + 200 mm EPS Silver + silikoonkrohv',
    layers: [
      { matId: 'render_ext_10', thickMm: 10 },
      { matId: 'eps_silver_200', thickMm: 200 },
      { matId: 'bauroc_classic_200', thickMm: 200 },
      { matId: 'render_int_10', thickMm: 10 },
    ],
  },
  brick_cavity_wall: {
    id: 'brick_cavity_wall',
    name: 'Tellisvoodriga soojustatud plokksein (U ~ 0.15)',
    type: 'exterior',
    desc: 'Väljas väärikas fassaaditellis, tuulutusvahe, villaplaat ja plokkmüüritis',
    layers: [
      { matId: 'brick_veneer_85', thickMm: 85 },
      { matId: 'vent_cavity_25', thickMm: 30 },
      { matId: 'wind_barrier_wool_30', thickMm: 30 },
      { matId: 'eps_silver_200', thickMm: 150 },
      { matId: 'bauroc_classic_200', thickMm: 200 },
      { matId: 'render_int_10', thickMm: 10 },
    ],
  },
  timber_int_light: {
    id: 'timber_int_light',
    name: 'Kerge kips-vahesein villaga (Heliisolatsioon)',
    type: 'interior',
    desc: 'Teras- või puitkarkass villaga, mõlemal poolel 13 mm kipsplaat',
    layers: [
      { matId: 'gypsum_board_13', thickMm: 13 },
      { matId: 'stud_partition_66', thickMm: 66 },
      { matId: 'gypsum_board_13', thickMm: 13 },
    ],
  },
  block_int_heavy: {
    id: 'block_int_heavy',
    name: 'Kandev plokk-vahesein (Helipidav)',
    type: 'interior',
    desc: 'Massiivne ja hea helipidavusega krohvitud kiviplokk siseruumide vahele',
    layers: [
      { matId: 'render_int_10', thickMm: 10 },
      { matId: 'block_partition_100', thickMm: 100 },
      { matId: 'render_int_10', thickMm: 10 },
    ],
  },
};

export const FLOOR_ASSEMBLIES = {
  ground_slab_heated: {
    id: 'ground_slab_heated',
    name: 'Pinnasel plaatpõrand vesipõrandaküttega (U ~ 0.13)',
    type: 'floor',
    desc: 'Monoliitne raudbetoonplaat kütetorudega, 200 mm EPS soojustus ja pinnasealus',
    layers: [
      { matId: 'floor_parquet_14', thickMm: 14 },
      { matId: 'floor_underlay_4', thickMm: 4 },
      { matId: 'concrete_slab_80', thickMm: 80 },
      { matId: 'vapor_barrier_pe', thickMm: 1 },
      { matId: 'eps_floor_200', thickMm: 200 },
      { matId: 'gravel_subbase_150', thickMm: 150 },
      { matId: 'subsoil_ground', thickMm: 60 },
    ],
  },
  ground_slab_tile: {
    id: 'ground_slab_tile',
    name: 'Plaaditud vannitoa/esiku põrand küttega (U ~ 0.13)',
    type: 'floor',
    desc: 'Keraamiline plaat hüdroisolatsiooniga, betoonplaat ja soojustus',
    layers: [
      { matId: 'floor_tile_10', thickMm: 10 },
      { matId: 'concrete_slab_80', thickMm: 80 },
      { matId: 'vapor_barrier_pe', thickMm: 1 },
      { matId: 'eps_floor_200', thickMm: 200 },
      { matId: 'gravel_subbase_150', thickMm: 150 },
      { matId: 'subsoil_ground', thickMm: 60 },
    ],
  },
  terrace_paver_ground: {
    id: 'terrace_paver_ground',
    name: 'Unikivi terrassi / sillutise aluskonstruktsioon',
    type: 'floor',
    desc: 'Betoonist unikivi, sängitusliiv ja kandev tihendatud killustikalus',
    layers: [
      { matId: 'paver_block_60', thickMm: 60 },
      { matId: 'sand_bedding_30', thickMm: 30 },
      { matId: 'gravel_subbase_150', thickMm: 150 },
      { matId: 'subsoil_ground', thickMm: 60 },
    ],
  },
};

// Arvutab koostu kogupaksuse (mm ja m), soojusjuhtivuse takistuse R ja U-arvu
export function calculateAssemblyPhysics(assembly, isFloor = false) {
  const layers = assembly.layers || [];
  let totalMm = 0;
  let totalR = 0;

  layers.forEach(l => {
    const mat = LAYER_MATERIALS[l.matId];
    const thickMm = l.thickMm || mat?.defaultThickMm || 10;
    totalMm += thickMm;

    const thickM = thickMm / 1000;
    const lambda = mat?.lambda || 0.1;
    totalR += thickM / lambda;
  });

  // Pinnaüleminekutakistused (EVS-EN ISO 6946)
  const Rsi = isFloor ? 0.17 : 0.13;
  const Rse = 0.04;
  const totalR_with_surfaces = totalR + Rsi + Rse;
  const uValue = totalR_with_surfaces > 0 ? +(1 / totalR_with_surfaces).toFixed(3) : 0;

  let energyClass = 'A';
  if (uValue <= 0.13) energyClass = 'A+ (Passiivmaja / Liginullenergia)';
  else if (uValue <= 0.16) energyClass = 'A (Energiatõhus)';
  else if (uValue <= 0.22) energyClass = 'B (Hea soojapidavus)';
  else if (uValue <= 0.28) energyClass = 'C (Standardne)';
  else energyClass = 'D / Vahesein';

  return {
    totalMm,
    totalM: +(totalMm / 1000).toFixed(3),
    R: +totalR.toFixed(2),
    R_total: +totalR_with_surfaces.toFixed(2),
    uValue,
    energyClass,
  };
}

// Genereerib täpse arhitektuurse SVG ristlõike (Cross-section schematic drawing)
export function renderAssemblySvg(assembly, options = {}) {
  const isFloor = options.isFloor ?? (assembly.type === 'floor');
  const width = options.width || 680;
  const height = options.height || 360;
  const layers = assembly.layers || [];
  const physics = calculateAssemblyPhysics(assembly, isFloor);

  const paddingLeft = 140;
  const paddingRight = 140;
  const paddingTop = 45;
  const paddingBottom = 45;

  const drawW = width - paddingLeft - paddingRight;
  const drawH = height - paddingTop - paddingBottom;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="assembly-cad-svg" style="background:#ffffff; border-radius:8px; font-family:'Segoe UI',Roboto,Helvetica,sans-serif;">`;

  // CAD Defs: luugitused ja mustrid
  svg += `
    <defs>
      <!-- Soojustuse siksakk-muster (Wool hatch) -->
      <pattern id="hatch-wool" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 0,10 Q 5,0 10,10 T 20,10" fill="none" stroke="#ca8a04" stroke-width="1.2" />
        <path d="M 0,20 Q 5,10 10,20 T 20,20" fill="none" stroke="#eab308" stroke-width="0.8" opacity="0.6" />
      </pattern>
      <!-- Puidu kiujooned (Wood hatch) -->
      <pattern id="hatch-wood" width="30" height="12" patternUnits="userSpaceOnUse">
        <line x1="0" y1="3" x2="30" y2="3" stroke="#b45309" stroke-width="0.75" opacity="0.4" />
        <line x1="0" y1="9" x2="30" y2="9" stroke="#b45309" stroke-width="0.75" opacity="0.3" />
        <circle cx="15" cy="6" r="3" fill="none" stroke="#b45309" stroke-width="0.5" opacity="0.4" />
      </pattern>
      <!-- Ploki 45 kraadi diagonaal (Diagonal block hatch) -->
      <pattern id="hatch-diagonal" width="10" height="10" patternUnits="userSpaceOnUse">
        <line x1="0" y1="10" x2="10" y2="0" stroke="#475569" stroke-width="1" />
      </pattern>
      <!-- Betooni täpp ja kolmnurkade muster -->
      <pattern id="hatch-concrete" width="18" height="18" patternUnits="userSpaceOnUse">
        <polygon points="3,3 6,3 4.5,6" fill="#475569" />
        <polygon points="12,11 15,11 13.5,14" fill="#334155" />
        <circle cx="8" cy="14" r="1" fill="#475569" />
        <circle cx="14" cy="5" r="1.2" fill="#475569" />
      </pattern>
      <!-- EPS vahtsoojustuse täppmuster -->
      <pattern id="hatch-foam" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.5" fill="#71717a" />
        <circle cx="11" cy="11" r="1.5" fill="#71717a" />
      </pattern>
      <!-- Tellise muster -->
      <pattern id="hatch-brick" width="24" height="12" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="24" y2="0" stroke="#7f1d1d" stroke-width="1" />
        <line x1="0" y1="6" x2="24" y2="6" stroke="#7f1d1d" stroke-width="1" />
        <line x1="6" y1="0" x2="6" y2="6" stroke="#7f1d1d" stroke-width="1" />
        <line x1="18" y1="6" x2="18" y2="12" stroke="#7f1d1d" stroke-width="1" />
      </pattern>
    </defs>
  `;

  // Tausta ruudustik (kerge arhitektuurne taust)
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#fafbfe" stroke="#e2e8f0" stroke-width="1"/>`;

  if (!isFloor) {
    // --- SEINA VERTIKAALNE VÕI HORISONTAALNE RISTLÕIGE ---
    // Vasakult paremale: VÄLISKÜLG -> SISEKÜLG
    let curX = paddingLeft;
    const totalMm = physics.totalMm || 1;
    const mmScale = drawW / totalMm;

    // Päis
    svg += `<text x="${paddingLeft}" y="24" font-size="11" font-weight="700" fill="#0284c7" letter-spacing="1">← HOONE VÄLISKÜLG (VÄLJAS)</text>`;
    svg += `<text x="${width - paddingRight}" y="24" font-size="11" font-weight="700" fill="#16a34a" letter-spacing="1" text-anchor="end">HOONE SISEKÜLG (SEES) →</text>`;

    layers.forEach((layer, idx) => {
      const mat = LAYER_MATERIALS[layer.matId] || { name: 'Muu kiht', color: '#cbd5e1', hatch: 'solid' };
      const layerMm = layer.thickMm || mat.defaultThickMm || 10;
      const layerW = Math.max(4, layerMm * mmScale);

      // Kihi värv ja täide
      let fillStyle = mat.color;
      let patternOverlay = '';
      if (mat.hatch === 'wool' || mat.hatch === 'wool_stud') patternOverlay = 'url(#hatch-wool)';
      else if (mat.hatch === 'wood') patternOverlay = 'url(#hatch-wood)';
      else if (mat.hatch === 'diagonal') patternOverlay = 'url(#hatch-diagonal)';
      else if (mat.hatch === 'concrete') patternOverlay = 'url(#hatch-concrete)';
      else if (mat.hatch === 'foam') patternOverlay = 'url(#hatch-foam)';
      else if (mat.hatch === 'brick') patternOverlay = 'url(#hatch-brick)';

      svg += `<g class="cad-layer" data-layer-idx="${idx}" style="cursor:pointer;">`;
      // Aluspõhi värv
      svg += `<rect x="${curX}" y="${paddingTop}" width="${layerW}" height="${drawH}" fill="${fillStyle}" stroke="#334155" stroke-width="1.2"/>`;
      // Muster peal
      if (patternOverlay) {
        svg += `<rect x="${curX}" y="${paddingTop}" width="${layerW}" height="${drawH}" fill="${patternOverlay}" opacity="0.75" pointer-events="none"/>`;
      }

      // Keskjoone mõõduketi viik alla
      const midX = curX + layerW / 2;
      const labelY = height - 12 - (idx % 2 === 0 ? 0 : 16);

      // Kihi paksuse märgis all
      svg += `<line x1="${curX}" y1="${paddingTop + drawH}" x2="${curX}" y2="${paddingTop + drawH + 8}" stroke="#475569" stroke-width="1" />`;
      svg += `<text x="${midX}" y="${labelY}" font-size="10" font-weight="700" fill="#1e293b" text-anchor="middle">${layerMm} mm</text>`;

      // Kihi nimetuse viiknool üles või küljele
      const calloutY = paddingTop + (idx * (drawH / Math.max(1, layers.length - 1)));
      svg += `<circle cx="${midX}" cy="${calloutY}" r="3" fill="#0f172a" />`;

      curX += layerW;
      svg += `</g>`;
    });

    // Mõõdukett ja koondmõõt ülaosas
    svg += `
      <g stroke="#0f172a" stroke-width="1.5">
        <line x1="${paddingLeft}" y1="${paddingTop - 10}" x2="${paddingLeft + drawW}" y2="${paddingTop - 10}" />
        <line x1="${paddingLeft}" y1="${paddingTop - 16}" x2="${paddingLeft}" y2="${paddingTop - 4}" />
        <line x1="${paddingLeft + drawW}" y1="${paddingTop - 16}" x2="${paddingLeft + drawW}" y2="${paddingTop - 4}" />
      </g>
      <rect x="${paddingLeft + drawW/2 - 65}" y="${paddingTop - 22}" width="130" height="20" rx="4" fill="#0f172a"/>
      <text x="${paddingLeft + drawW/2}" y="${paddingTop - 8}" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">KOKKU: ${physics.totalMm} mm (${physics.totalM} m)</text>
    `;

    // Külgmised selgitavad viited kihtidele (Legend)
    svg += `<g font-size="10" fill="#334155">`;
    layers.forEach((l, i) => {
      const mat = LAYER_MATERIALS[l.matId] || { name: 'Kiht' };
      const yPos = paddingTop + 16 + (i * 24);
      svg += `
        <circle cx="${width - paddingRight + 12}" cy="${yPos - 3}" r="4" fill="${mat.color}" stroke="#334155" stroke-width="0.8"/>
        <text x="${width - paddingRight + 22}" y="${yPos}" font-weight="600">${i + 1}. ${mat.name.slice(0, 26)} (${l.thickMm} mm)</text>
      `;
    });
    svg += `</g>`;

  } else {
    // --- PÕRANDA HORISONTAALNE KIHILINE RISTLÕIGE ---
    // Ülalt alla: PÕRANDAPIND (SEES) -> ALUSPINNAS (ALL)
    let curY = paddingTop;
    const totalMm = physics.totalMm || 1;
    const mmScale = drawH / totalMm;

    // Päis
    svg += `<text x="24" y="${paddingTop - 12}" font-size="11" font-weight="700" fill="#16a34a" letter-spacing="1">▲ RUUMI PÕRANDAPIND (SEES)</text>`;
    svg += `<text x="24" y="${height - 12}" font-size="11" font-weight="700" fill="#78716c" letter-spacing="1">▼ KANDVAD PINNASEKIHID (ALL)</text>`;

    layers.forEach((layer, idx) => {
      const mat = LAYER_MATERIALS[layer.matId] || { name: 'Kiht', color: '#cbd5e1' };
      const layerMm = layer.thickMm || mat.defaultThickMm || 10;
      const layerH = Math.max(6, layerMm * mmScale);

      let patternOverlay = '';
      if (mat.hatch === 'wool') patternOverlay = 'url(#hatch-wool)';
      else if (mat.hatch === 'wood') patternOverlay = 'url(#hatch-wood)';
      else if (mat.hatch === 'concrete') patternOverlay = 'url(#hatch-concrete)';
      else if (mat.hatch === 'foam') patternOverlay = 'url(#hatch-foam)';
      else if (mat.hatch === 'brick') patternOverlay = 'url(#hatch-brick)';
      else if (mat.hatch === 'diagonal') patternOverlay = 'url(#hatch-diagonal)';

      svg += `<g class="cad-layer" data-layer-idx="${idx}">`;
      svg += `<rect x="${paddingLeft}" y="${curY}" width="${drawW}" height="${layerH}" fill="${mat.color}" stroke="#334155" stroke-width="1.2"/>`;
      if (patternOverlay) {
        svg += `<rect x="${paddingLeft}" y="${curY}" width="${drawW}" height="${layerH}" fill="${patternOverlay}" opacity="0.75" pointer-events="none"/>`;
      }

      // Mõõt vasakul
      const midY = curY + layerH / 2;
      svg += `<text x="${paddingLeft - 12}" y="${midY + 4}" font-size="10" font-weight="700" fill="#1e293b" text-anchor="end">${layerMm} mm</text>`;
      svg += `<line x1="${paddingLeft - 8}" y1="${curY}" x2="${paddingLeft}" y2="${curY}" stroke="#94a3b8" stroke-width="1"/>`;

      // Nimetus paremal
      svg += `<text x="${paddingLeft + drawW + 16}" y="${midY + 4}" font-size="11" font-weight="600" fill="#0f172a">${idx + 1}. ${mat.name}</text>`;

      curY += layerH;
      svg += `</g>`;
    });

    // Paksus kokku paremal üleval
    svg += `
      <rect x="${width - paddingRight - 10}" y="${paddingTop - 30}" width="140" height="24" rx="5" fill="#0f172a"/>
      <text x="${width - paddingRight + 60}" y="${paddingTop - 14}" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">KOKKU: ${physics.totalMm} mm</text>
    `;
  }

  // Energiatõhususe ja U-arvu infokast all nurgas
  svg += `
    <g transform="translate(18, ${height - 75})">
      <rect width="180" height="60" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
      <text x="12" y="20" font-size="10" font-weight="bold" fill="#64748b" letter-spacing="0.5">SOOJUSJUHTIVUS (U-ARV)</text>
      <text x="12" y="42" font-size="18" font-weight="800" fill="${physics.uValue <= 0.16 ? '#16a34a' : '#d97706'}">U = ${physics.uValue} W/m²K</text>
      <text x="12" y="54" font-size="9" font-weight="600" fill="#475569">${physics.energyClass}</text>
    </g>
  `;

  svg += `</svg>`;
  return svg;
}

// Genereerib kompaktse eelvaate ikooni/diagrammi inspektori jaoks
export function renderAssemblyMiniPreview(assembly, isFloor = false) {
  const layers = assembly.layers || [];
  const physics = calculateAssemblyPhysics(assembly, isFloor);
  const totalMm = physics.totalMm || 1;

  let out = `
    <div class="assembly-mini-box">
      <div class="assembly-mini-header">
        <strong>${assembly.name}</strong>
        <span class="u-badge ${physics.uValue <= 0.16 ? 'good' : 'warn'}">U = ${physics.uValue} W/m²K</span>
      </div>
      <div class="assembly-mini-bar">
  `;

  layers.forEach((l, idx) => {
    const mat = LAYER_MATERIALS[l.matId] || { name: 'Kiht', color: '#cbd5e1' };
    const pct = Math.max(4, ((l.thickMm || 10) / totalMm) * 100);
    out += `
      <div class="assembly-mini-segment" style="width:${pct}%; background:${mat.color};" title="${mat.name} (${l.thickMm} mm)"></div>
    `;
  });

  out += `
      </div>
      <div class="assembly-mini-footer">
        <span>Kogupaksus: <b>${physics.totalMm} mm (${physics.totalM} m)</b></span>
        <span>${layers.length} kihti</span>
      </div>
    </div>
  `;
  return out;
}
