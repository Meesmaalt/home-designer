export const SITE = {
  sauna: { L: 4.91, W: 3.84, H: 2.35, FRONT_D: 2.84, BACK_D: 2.07 },
  get PESU_W() { return +(2.11 / this.sauna.BACK_D).toFixed(3); },
  get LEILI_W() { return +(this.sauna.W - this.PESU_W).toFixed(3); },
  foundation: { tubeDia: 0.1, depth: 1, aboveGrade: 0.2, beamH: 0.14, spacingX: 1.4, spacingZ: 1.3 },
  get FLOOR_Y() { return this.foundation.aboveGrade + this.foundation.beamH; },
};

export const WALL_PRESETS = [
  { id: 'ext_timber', name: 'Puitkarkass välissein (25 cm)', t: 0.25, h: 2.6, mat: 'wood', isExt: true },
  { id: 'ext_block', name: 'Bauroc/Fibo plokk välissein (30 cm)', t: 0.30, h: 2.6, mat: 'plaster', isExt: true },
  { id: 'int_bearing', name: 'Kandev vahesein (15 cm)', t: 0.15, h: 2.6, mat: 'wood', isExt: false },
  { id: 'int_light', name: 'Kipsplaat vahesein (10 cm)', t: 0.10, h: 2.6, mat: 'plaster', isExt: false },
  { id: 'sauna_timber', name: 'Sauna puitsein (12 cm)', t: 0.12, h: 2.35, mat: 'wood', isExt: false },
];

export const OPENING_PRESETS = {
  door: [
    { id: 'door_std', name: 'Siseuks', width: 0.9, height: 2.1, sill: 0 },
    { id: 'door_entry', name: 'Soojustatud välisuks', width: 1.0, height: 2.1, sill: 0 },
    { id: 'door_glass', name: 'Klaasist terrassiuks', width: 1.4, height: 2.1, sill: 0 },
    { id: 'door_garage', name: 'Garaažiuks', width: 2.5, height: 2.2, sill: 0 },
  ],
  window: [
    { id: 'win_std', name: 'Standardaken', width: 1.2, height: 1.3, sill: 0.9 },
    { id: 'win_pano', name: 'Panoraamaken (maani)', width: 2.0, height: 2.1, sill: 0.05 },
    { id: 'win_narrow', name: 'Kitsas ribaaken', width: 1.6, height: 0.6, sill: 1.7 },
    { id: 'win_small', name: 'Sauna / WC aken', width: 0.6, height: 0.6, sill: 1.4 },
  ],
};

export const MATERIALS = {
  wood: { color: 0xc4a574, name: 'Hele puit (vooder/karkass)', eurM2: 45, r: 0.72 },
  dark: { color: 0x5a4030, name: 'Tume termopuit', eurM2: 58, r: 0.68 },
  plaster: { color: 0xf0ece1, name: 'Valge fassaadikrohv', eurM2: 32, r: 0.85 },
  brick: { color: 0xa85038, name: 'Fassaaditellis', eurM2: 65, r: 0.78 },
  concrete: { color: 0xa4a29a, name: 'Lihvitud betoon', eurM2: 38, r: 0.65 },
  glass: { color: 0xa8d4ed, name: 'Klaas', eurM2: 110, r: 0.1, op: 0.35 },
  tile_gray: { color: 0x767c85, name: 'Hall keraamiline plaat', eurM2: 48, r: 0.4 },
  parquet: { color: 0xb5824c, name: 'Tammeparkett', eurM2: 55, r: 0.5 },
  paver: { color: 0x828588, name: 'Unikivi sillutis', eurM2: 42, r: 0.88 },
  roof_dark: { color: 0x363c44, name: 'Klassik plekk (antratsiit)', eurM2: 40, r: 0.45, m: 0.3 },
  roof_red: { color: 0x8f3c2c, name: 'Punane katusekivi', eurM2: 48, r: 0.7 },
  grass: { color: 0x549442, name: 'Kodu muru', eurM2: 12, r: 0.95 },
  water: { color: 0x3b8ea8, name: 'Vesi / tiik', eurM2: 75, r: 0.1, op: 0.75 },
};

export const CATALOG = [
  {
    cat: 'Elutuba & Sisustus',
    desc: 'Diivanid, teleriseinad, lauad, riiulid, vaibad ja toataimed',
    items: [
      { id: 'sofa', name: 'Nurgadiivan kangaga', icon: '🛋️', eur: 850 },
      { id: 'armchairNordic', name: 'Skandinaavia tugitool', icon: '🪑', eur: 320 },
      { id: 'tvConsole', name: '65" Teler & meediakonsool', icon: '📺', eur: 980 },
      { id: 'coffeeTable', name: 'Ümmargune diivanilaud', icon: '☕', eur: 180 },
      { id: 'fireplace', name: 'Kaasaegne klaaskamin', icon: '🔥', eur: 2400 },
      { id: 'deskOffice', name: 'Kaasaegne töölaud monitoriga', icon: '💻', eur: 480 },
      { id: 'bookshelf', name: 'Skandinaavia raamaturiiul', icon: '📚', eur: 360 },
      { id: 'rugModern', name: 'Geomeetriline villavaip', icon: '🧶', eur: 220 },
      { id: 'floorLamp', name: 'Kaarlamp / põrandavalgusti', icon: '💡', eur: 140 },
      { id: 'indoorPlant', name: 'Toataim keraamilises potis', icon: '🪴', eur: 65 },
    ]
  },
  {
    cat: 'Köök & Söögituba',
    desc: 'Köögisaared, kapid, söögilauad ja baaripukid',
    items: [
      { id: 'kitchenUnit', name: 'Köögisaar kraanikausiga', icon: '🍳', eur: 1800 },
      { id: 'kitchenHighCabinets', name: 'Kõrged kapid ahjuga', icon: '🧑‍🍳', eur: 1450 },
      { id: 'fridge', name: 'Side-by-side külmik', icon: '🧊', eur: 720 },
      { id: 'table', name: 'Söögilaud 6 tooliga', icon: '🪑', eur: 580 },
      { id: 'barStools', name: 'Baaritoolide paar (2 tk)', icon: '🍸', eur: 190 },
      { id: 'diningPendant', name: 'Rippvalgusti söögilauale', icon: '✨', eur: 160 },
    ]
  },
  {
    cat: 'Magamistuba',
    desc: 'Voodid, öökapid, garderoobid ja kummutid',
    items: [
      { id: 'bed', name: 'Kaheinimesevoodi', icon: '🛏️', eur: 680 },
      { id: 'bedNightstands', name: 'Voodi peatsi ja öökappidega', icon: '🛏️', eur: 1100 },
      { id: 'wardrobeModern', name: 'Lükandustega riidekapp', icon: '🚪', eur: 650 },
      { id: 'dresser', name: 'Kummut 4 sahtliga', icon: '🗄️', eur: 310 },
      { id: 'wardrobe', name: 'Standardne riidekapp', icon: '🚪', eur: 420 },
    ]
  },
  {
    cat: 'Vannituba & Saun',
    desc: 'Vannid, dušid, valamud, saunakerised ja lavad',
    items: [
      { id: 'bathroomVanity', name: 'Valamukapp peegliga', icon: '🪞', eur: 520 },
      { id: 'bathTub', name: 'Luksuslik eraldiseisev vann', icon: '🛁', eur: 890 },
      { id: 'shower', name: 'Klaasist dušikabiin', icon: '🚿', eur: 420 },
      { id: 'toilet', name: 'WC-pott seinapealne', icon: '🚽', eur: 240 },
      { id: 'towelWarmer', name: 'Käterätikuivati redel', icon: '🧣', eur: 170 },
      { id: 'washingMachine', name: 'Pesumasin & kuivati torn', icon: '🧺', eur: 980 },
      { id: 'stove', name: 'Sauna puuküttega keris', icon: '🔥', eur: 720 },
      { id: 'lavaLong', name: 'Saunalava (pikk iste)', icon: '🪵', eur: 260 },
      { id: 'lavaShort', name: 'Saunalava (lühike aste)', icon: '🪵', eur: 150 },
    ]
  },
  {
    cat: 'Terrass & Välimööbel',
    desc: 'Terrassid, pergolad, päevavoodid, grillid ja aiamööbel',
    items: [
      { id: 'deckModule', name: 'Puitkarkassil terrass (4x3m)', icon: '🪵', eur: 850 },
      { id: 'pergolaLouvre', name: 'Alumiiniumlamellidega pergola', icon: '🏛️', eur: 1850 },
      { id: 'pergola', name: 'Puitpergola (3x3m)', icon: '🏛️', eur: 720 },
      { id: 'outdoorKitchen', name: 'Väliköök roostevaba grilliga', icon: '🥩', eur: 1650 },
      { id: 'bbqGrill', name: 'Kivist grill & ahi', icon: '🔥', eur: 750 },
      { id: 'outdoorTable', name: 'Aialaud 6 tooliga', icon: '🪑', eur: 480 },
      { id: 'daybedOutdoor', name: 'Terrassi päevavoodi', icon: '🛋️', eur: 680 },
      { id: 'sunLoungerPair', name: 'Päikesetoolide komplekt', icon: '⛱️', eur: 260 },
      { id: 'loungeChair', name: 'Päikesetool varjuga', icon: '⛱️', eur: 190 },
      { id: 'firetable', name: 'Gaasikamin-laud istmetega', icon: '🔥', eur: 640 },
      { id: 'firePit', name: 'Lõkkease kiviistmetega', icon: '🪵', eur: 320 },
      { id: 'hammock', name: 'Rippkiik puitkaarel', icon: '🌴', eur: 280 },
      { id: 'gardenLantern', name: 'Valgusti teerajale (öösel põleb)', icon: '💡', eur: 65 },
      { id: 'gardenLight', name: 'Pollarvalgusti', icon: '💡', eur: 55 },
    ]
  },
  {
    cat: 'Haljastus, Vesi & Aed',
    desc: 'Basseinid, tiigid, puud, hekid, lillekastid ja peenrad',
    items: [
      { id: 'swimmingPool', name: 'Bassein / Suplusala (6x3m)', icon: '🏊', eur: 5200 },
      { id: 'pond', name: 'Aiaveekogu / tiik kividega', icon: '🌊', eur: 750 },
      { id: 'hotTub', name: 'Kümblustünn / aiatünn', icon: '♨️', eur: 1950 },
      { id: 'saunaBarrel', name: 'Tünnsaun terrassiga', icon: '🪵', eur: 2800 },
      { id: 'appleTree', name: 'Õunapuu (viljapuu)', icon: '🍎', eur: 65 },
      { id: 'pine', name: 'Mänd (okaspuu)', icon: '🌲', eur: 85 },
      { id: 'birch', name: 'Kask (lehtpuu)', icon: '🌳', eur: 75 },
      { id: 'hedgeThuja', name: 'Elupuuhekk (Thuja 4m)', icon: '🌲', eur: 140 },
      { id: 'bushLilac', name: 'Sirelipõõsas õitega', icon: '🌸', eur: 45 },
      { id: 'flowerPlanterTrio', name: 'Lillekastide kolmik õitega', icon: '🌺', eur: 130 },
      { id: 'flowerBed', name: 'Lillepeenar kiviservaga', icon: '🌷', eur: 110 },
      { id: 'raisedBed', name: 'Kõrgpeenar (köögivili)', icon: '🥕', eur: 95 },
      { id: 'stonePath', name: 'Unikivi jalgtee (3m)', icon: '🪨', eur: 120 },
      { id: 'gravelPath', name: 'Kruusatee (3m)', icon: '🛣️', eur: 80 },
      { id: 'fenceWood', name: 'Puitlippaed (4m)', icon: '🪵', eur: 90 },
      { id: 'fenceGate', name: 'Aiavärav', icon: '🚪', eur: 220 },
    ]
  },
  {
    cat: 'Ehitised, Sport & Tehnika',
    desc: 'Garaažid, kasvuhooned, mänguväljakud ja autod',
    items: [
      { id: 'greenhouseWalkin', name: 'Musta raamiga kasvuhoone', icon: '🌿', eur: 1380 },
      { id: 'greenhouse', name: 'Klaasist kasvuhoone', icon: '🏡', eur: 1150 },
      { id: 'shed', name: 'Aiatööriistade kuur', icon: '🏚️', eur: 1400 },
      { id: 'carport', name: 'Auto varjualune', icon: '🚗', eur: 1800 },
      { id: 'bicycleRack', name: 'Rattahoidja jalgratastega', icon: '🚲', eur: 240 },
      { id: 'wasteEnclosure', name: 'Prügimaja & rattahoidla', icon: '🚲', eur: 680 },
      { id: 'solarPanel', name: 'Päikesepaneelide rida', icon: '☀️', eur: 1200 },
      { id: 'childrenPlayground', name: 'Laste mänguväljak & liumägi', icon: '🛝', eur: 890 },
      { id: 'trampoline', name: 'Aiatrampliin turvavõrguga', icon: '🎪', eur: 420 },
      { id: 'carModern', name: 'Kaasaegne elektriauto', icon: '🚙', eur: 0 },
      { id: 'humanScale', name: 'Arhitektuurne inimfiguur (1.8m)', icon: '🚶', eur: 0 },
      { id: 'foundationSlab', name: 'Plaatvundament', icon: '🧱', eur: 1200 },
      { id: 'houseMain', name: 'Elumaja maht (näidis)', icon: '🏠', eur: 0 },
      { id: 'houseNeigh', name: 'Naabermaja maht', icon: '🏘️', eur: 0 },
    ]
  }
];

export const CONSTRUCTION_COSTS = {
  foundationM2: 78,
  wallM2Timber: 85,
  wallM2Block: 115,
  roofM2: 68,
  deckM2: 65,
  insulationM2: 24,
  interiorFinishingM2: 38,
  doorStd: 240,
  doorEntry: 750,
  windowStd: 260,
  windowPano: 680,
  laborRatio: 0.38,
};

export const PRICES = {
  wallM2: 90,
  door: 280,
  window: 240,
  laborPct: 35,
};

export const PLOT_DEFAULTS = {
  width: 25,       // m
  depth: 35,       // m
  setback: 4.0,    // m (min distance from boundary)
  maxCoveragePct: 20, // % max building footprint
  northAngle: 0,   // degrees (0 = Up/North, 90 = East, etc.)
};

export const APP = {
  name: 'KoduDisain',
  version: 8,
  phase: 'Ehituse, krundi ja aia täislahendus (Krundi tsoneering, 4m ehitusala, päikese analüüs, SVG joonised)',
};
