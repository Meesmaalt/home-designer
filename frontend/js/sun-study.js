/**
 * sun-study.js - Päikese ja varjude reaalajas simulatsioon (Sun & Shadow Study)
 * Astronoomiline päikese asendi arvutus Eesti laiuskraadil (58.5° N),
 * varjude liikumise aegluup, insolatsioonianalüüs terrassile ja katusele.
 */

// Hooajalised päikese deklinatsioonid (kraadides)
export const SEASONS = {
  summer: { id: 'summer', name: 'Suvine pööripäev (21. juuni)', dec: 23.45, dayLength: '18h 20min', maxAlt: 55 },
  spring: { id: 'spring', name: 'Kevadine võrdpäevsus (21. märts)', dec: 0.0, dayLength: '12h 10min', maxAlt: 31.5 },
  autumn: { id: 'autumn', name: 'Sügisene võrdpäevsus (23. september)', dec: 0.0, dayLength: '12h 05min', maxAlt: 31.5 },
  winter: { id: 'winter', name: 'Talvine pööripäev (21. detsember)', dec: -23.45, dayLength: '6h 05min', maxAlt: 8.0 },
};

const LATITUDE = 58.5; // Eesti keskmine laiuskraad (Tallinn/Tartu)

/**
 * Arvuta päikese kõrgusnurk (altitude) ja asimuut (azimuth)
 * @param {number} hour - 0..24 kellaaeg (nt 14.5 = 14:30)
 * @param {string} seasonKey - 'summer' | 'spring' | 'autumn' | 'winter'
 * @param {number} northAngleDeg - Krundi põhjanurk kraadides (0 = vaikimisi)
 */
export function calculateSolarPosition(hour, seasonKey = 'summer', northAngleDeg = 0) {
  const season = SEASONS[seasonKey] || SEASONS.summer;
  const phi = (LATITUDE * Math.PI) / 180;
  const delta = (season.dec * Math.PI) / 180;
  // Päikese tunninurk H: keskpäev 12:00 = 0°, iga tund on 15°
  const H = ((hour - 12) * 15 * Math.PI) / 180;

  // 1. Kõrgusnurk (altitude) horisondist
  const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
  const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const altDeg = (altRad * 180) / Math.PI;

  // 2. Asimuut (päripäeva põhjast 0° -> Ida 90° -> Lõuna 180° -> Lääs 270°)
  const cosAz = (Math.sin(delta) - Math.sin(phi) * sinAlt) / (Math.cos(phi) * Math.cos(altRad));
  let azRad = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(H) > 0) {
    azRad = 2 * Math.PI - azRad; // Pärastlõunal päike läänes
  }
  const azDeg = (azRad * 180) / Math.PI;

  // 3. Ruumiline suund Three.js koordinaadistikus:
  // Three.js: X = Ida/Lääs, Y = Kõrgus, Z = Lõuna/Põhi
  // Arvesta krundi põhjanurka (northAngleDeg)
  const effectiveAzRad = azRad - (northAngleDeg * Math.PI) / 180;
  const dist = 42; // sfääri raadius
  const clampedAlt = Math.max(-0.2, altRad);

  const x = -Math.sin(effectiveAzRad) * Math.cos(clampedAlt) * dist;
  const z = Math.cos(effectiveAzRad) * Math.cos(clampedAlt) * dist;
  const y = Math.sin(clampedAlt) * dist;

  // 4. Atmosfääri valguse toon ja temperatuur
  const isNight = altDeg < -2.0;
  const isDusk = altDeg >= -2.0 && altDeg < 8.0;
  const isGolden = altDeg >= 8.0 && altDeg < 18.0;

  let color = 0xfffaed;
  let intensity = 1.25;
  let sky = 0x7ebfe8;
  let fog = 0xadd6ee;
  let hemiSky = 0xd8edff;
  let hemiGround = 0x4d7535;

  if (isNight) {
    color = 0x1a2634;
    intensity = 0.15;
    sky = 0x08101a;
    fog = 0x0a1420;
    hemiSky = 0x121e2b;
    hemiGround = 0x060c0e;
  } else if (isDusk) {
    // Punakas-kuldne loojang / koidik
    color = 0xff8844;
    intensity = 0.75;
    sky = 0x486b99;
    fog = 0x6e7e96;
    hemiSky = 0xffa477;
    hemiGround = 0x24331e;
  } else if (isGolden) {
    // Soe kuldne valgus, madalad pehmed varjud
    color = 0xffd290;
    intensity = 1.05;
    sky = 0x68b3e8;
    fog = 0x9ec7e4;
    hemiSky = 0xffe2c4;
    hemiGround = 0x3d5a28;
  } else {
    // Keskpäev
    const noonFactor = Math.min(1, altDeg / 50);
    intensity = 1.15 + 0.25 * noonFactor;
  }

  // 5. Terrassi ja katuse insolatsiooni arvutused
  const insolation = getInsolationSummary(hour, seasonKey, altDeg, azDeg);

  return {
    hour,
    seasonKey,
    seasonName: season.name,
    altitudeDeg: Math.round(altDeg * 10) / 10,
    azimuthDeg: Math.round(azDeg),
    azimuthCompass: getCompassDirection(azDeg),
    pos: [x, Math.max(0.5, y), z],
    color,
    intensity,
    sky,
    fog,
    hemiSky,
    hemiGround,
    isNight,
    isDusk,
    isGolden,
    insolation,
  };
}

function getCompassDirection(deg) {
  const dirs = ['Põhi (N)', 'Kirre (NE)', 'Ida (E)', 'Kagu (SE)', 'Lõuna (S)', 'Edel (SW)', 'Lääs (W)', 'Loe (NW)', 'Põhi (N)'];
  const idx = Math.round(((deg % 360) / 45));
  return dirs[idx];
}

function getInsolationSummary(hour, seasonKey, altDeg, azDeg) {
  const isSummer = seasonKey === 'summer';
  const isSpringAutumn = seasonKey === 'spring' || seasonKey === 'autumn';

  // Terrass sauna ees ja kümblustünn
  let terraceStatus = 'Varjus';
  let terracePct = 0;
  if (altDeg > 2) {
    // Kui päike on idas, lõunas või läänes (asimuut 90..280°)
    if (azDeg >= 95 && azDeg <= 290) {
      terraceStatus = '☀️ Päikeseline (otsene insolatsioon)';
      terracePct = Math.min(100, Math.round((altDeg / 50) * 100));
    } else {
      terraceStatus = '🌤️ Osaline vari hoone nurgast';
      terracePct = 35;
    }
  } else {
    terraceStatus = '🌙 Öö / Hämarduv';
    terracePct = 0;
  }

  // Tünnisauna tsoon
  let tubAdvice = '';
  if (isSummer) {
    tubAdvice = 'Suvel on kümblustünn päikeseline alates kl 12:30 kuni 21:00 (otsene soe õhtupäike!).';
  } else if (isSpringAutumn) {
    tubAdvice = 'Kevadel/sügisel naudib tünnisaun parimat päikesepaistet kl 13:00 - 18:30.';
  } else {
    tubAdvice = 'Talvel madal päike valgustab tünni kl 11:30 - 15:00.';
  }

  // Päikesepaneelide tootlikkus hetkel
  let pvFactor = 0;
  if (altDeg > 5) {
    const angleEfficiency = Math.sin((altDeg * Math.PI) / 180);
    pvFactor = Math.round(angleEfficiency * 100);
  }

  return {
    terraceStatus,
    terracePct,
    tubAdvice,
    pvFactor,
    dayHours: isSummer ? '18.4 h' : (isSpringAutumn ? '12.1 h' : '6.2 h'),
    sunRise: isSummer ? '04:10' : (isSpringAutumn ? '06:15' : '09:05'),
    sunSet: isSummer ? '22:35' : (isSpringAutumn ? '18:25' : '15:10'),
  };
}

// Time-lapse animatsiooni kontroller
let animTimer = null;
let currentSimHour = 13.0;
let currentSimSeason = 'summer';

export function startSunTimelapse(onUpdate, speed = 1.0) {
  stopSunTimelapse();
  animTimer = setInterval(() => {
    currentSimHour += 0.15 * speed;
    if (currentSimHour > 22.5) {
      currentSimHour = 5.5; // Korda hommikust
    }
    if (onUpdate) onUpdate(currentSimHour, currentSimSeason);
  }, 75);
}

export function stopSunTimelapse() {
  if (animTimer) {
    clearInterval(animTimer);
    animTimer = null;
  }
}

export function isSunTimelapseRunning() {
  return animTimer !== null;
}
