export const SITE = {
  sauna: { L: 4.91, W: 3.84, H: 2.35, FRONT_D: 2.84, BACK_D: 2.07 },
  get PESU_W() { return +(2.11 / this.sauna.BACK_D).toFixed(3); },
  get LEILI_W() { return +(this.sauna.W - this.PESU_W).toFixed(3); },
  foundation: { tubeDia: 0.1, depth: 1, aboveGrade: 0.2, beamH: 0.14, spacingX: 1.4, spacingZ: 1.3 },
  get FLOOR_Y() { return this.foundation.aboveGrade + this.foundation.beamH; },
};

export const MATERIALS = {
  wood: { color: 0xc4a574, name: 'Puit', eurM2: 45 },
  plaster: { color: 0xeae4d8, name: 'Krohv', eurM2: 28 },
  brick: { color: 0xa85a3a, name: 'Tellis', eurM2: 55 },
  dark: { color: 0x5a4030, name: 'Tume puit', eurM2: 52 },
  concrete: { color: 0x9a9890, name: 'Betoon', eurM2: 35 },
};

export const CATALOG = [
  { cat: 'Hoone', items: [
    { id: 'saunaPad', name: 'Saunaala', icon: '🟧' },
    { id: 'houseMain', name: 'Elumaja', icon: '🏠' },
    { id: 'houseShed', name: 'Abihoone', icon: '🏚️' },
    { id: 'houseNeigh', name: 'Naabermaja', icon: '🏡' },
  ]},
  { cat: 'Maastik', items: [
    { id: 'pine', name: 'Mänd', icon: '🌲' },
    { id: 'bush', name: 'Põõsas', icon: '🌳' },
    { id: 'fence', name: 'Aed', icon: '🚧' },
    { id: 'road', name: 'Tänav', icon: '🛣' },
    { id: 'stonePath', name: 'Kivitee', icon: '🪨' },
    { id: 'stump', name: 'Känd', icon: '🪵' },
  ]},
  { cat: 'Sisustus', items: [
    { id: 'sofa', name: 'Diivan', icon: '🛋', eur: 400 },
    { id: 'table', name: 'Laud', icon: '🪑', eur: 120 },
    { id: 'chair', name: 'Tool', icon: '💺', eur: 60 },
    { id: 'fridge', name: 'Külmik', icon: '🧊', eur: 350 },
    { id: 'lamp', name: 'Lamp', icon: '💡', eur: 45 },
    { id: 'stove', name: 'Keris', icon: '🔥', eur: 650 },
    { id: 'shower', name: 'Dušš', icon: '🚿', eur: 280 },
    { id: 'lavaLong', name: 'Lava', icon: '🪵', eur: 200 },
    { id: 'lavaShort', name: 'Lava lühike', icon: '🪵', eur: 120 },
  ]},
];

export const PRICES = {
  wallM2: 90,
  door: 280,
  window: 220,
  laborPct: 35,
};

export const APP = {
  name: 'KoduDisain',
  version: 6,
  phase: '6 · disainistuudio, 3D, 2D ja plaanivaade',
};
