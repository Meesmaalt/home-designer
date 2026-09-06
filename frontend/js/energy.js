/**
 * KoduDisain – Energiamärgis, soojusbilanss ja küttekalkulaator
 * Arvutab hoone soojuserikaod, aastase küttevajaduse, kaalutud energiatõhususarvu (ETA)
 * ning ametliku Eesti energiaklassi (A+, A, B, C, D, E, F) vastavalt MKM määrusele.
 */

// Kütteallikate tehnilised parameetrid ja primaarenergia tegurid (Eesti standard)
export const HEATING_SYSTEMS = {
  ground_heat_pump: {
    name: 'Maasoojuspump (Maa-vesi)',
    cop: 4.2,
    primaryFactor: 1.2,
    fuelCostPerKwh: 0.16, // Elektri hind €/kWh
    desc: 'Väga kõrge efektiivsus maapinnast võetava soojusega (SPF 4.2)',
  },
  air_water_heat_pump: {
    name: 'Õhk-vesi soojuspump',
    cop: 3.2,
    primaryFactor: 1.2,
    fuelCostPerKwh: 0.16,
    desc: 'Populaarne ja ökonoomne tänapäevane küttelahendus (COP 3.2)',
  },
  district_heating: {
    name: 'Kaugküte (Tõhus soojusvõrk)',
    cop: 0.98,
    primaryFactor: 0.9,
    fuelCostPerKwh: 0.085, // Kaugkütte soojuse hind €/kWh
    desc: 'Stabiilne ja madala primaarenergia koefitsiendiga võrguküte',
  },
  pellet: {
    name: 'Pelletikatel (Biokütus)',
    cop: 0.88,
    primaryFactor: 0.65,
    fuelCostPerKwh: 0.075,
    desc: 'Taastuv kohalik puitbiomassi kütus, väga soodne primaarenergia tegur',
  },
  electric: {
    name: 'Otsene elektriküte (Põrandakaablid / radiaatorid)',
    cop: 1.0,
    primaryFactor: 1.2,
    fuelCostPerKwh: 0.16,
    desc: 'Madal investeering, kuid suur elektrikulu ja madal energiaklass',
  },
};

// Eesti energiaklasside piirväärtused väikeelamutele (ETA kWh/m² aastas)
export const ENERGY_CLASSES = [
  { class: 'A+', max: 80, color: '#00875a', label: 'Liginullenergiahoone (A+ Tippklass)' },
  { class: 'A',  max: 105, color: '#16a34a', label: 'Liginullenergiahoone (A - Nõue alates 2020)' },
  { class: 'B',  max: 160, color: '#84cc16', label: 'Madalenergiahoone (B)' },
  { class: 'C',  max: 210, color: '#eab308', label: 'Tänapäevane standardhoone (C)' },
  { class: 'D',  max: 260, color: '#f97316', label: 'Rahuldav energiatõhusus (D)' },
  { class: 'E',  max: 320, color: '#ef4444', label: 'Vähesoojustatud hoone (E)' },
  { class: 'F',  max: 400, color: '#b91c1c', label: 'Ebaökonoomne vana hoone (F)' },
  { class: 'G',  max: 9999, color: '#7f1d1d', label: 'Väga suur soojuskadu (G)' },
];

/**
 * Arvutab hoone täieliku soojusbilansi ja energiatõhususe
 */
export function calculateBuildingEnergy({
  walls = [],
  rooms = [],
  openings = [],
  roofConfig = { pitch: 25, type: 'gable' },
  heatingSystemKey = 'air_water_heat_pump',
  heatRecovery = true, // Soojustagastusega ventilatsioon (80% tagastus)
  tripleGlazing = true, // Kolmekordsed aknad U=0.85 vs kahekordsed U=1.30
  solarPanelsKw = 0, // Paigaldatav PV võimsus kWp
}) {
  const heatingSystem = HEATING_SYSTEMS[heatingSystemKey] || HEATING_SYSTEMS.air_water_heat_pump;

  // 1. Pindalad
  let netFloorArea = 0;
  rooms.forEach(r => { netFloorArea += Number(r.area || 0); });
  if (netFloorArea <= 0) netFloorArea = 50; // Baasminimaal kui tuba pole veel määratud

  const roomHeight = 2.6; // Keskmine sisekõrgus
  const buildingVolume = netFloorArea * roomHeight;

  // Seinte pindala ja avad
  let totalWallGrossArea = 0;
  let totalWallLength = 0;
  walls.forEach(w => {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const h = w.h || 2.7;
    totalWallLength += len;
    totalWallGrossArea += len * h;
  });

  // Välisuste ja akende pindala
  let windowsArea = 0;
  let doorsArea = 0;
  walls.forEach(w => {
    (w.openings || []).forEach(op => {
      const wArea = (op.width || 1.2) * (op.height || 1.4);
      if (op.type === 'door') doorsArea += wArea;
      else windowsArea += wArea;
    });
  });

  // Kui seintel pole veel eraldi aknaid märgitud, arvestame tüüpilise 15% fassaadipinnast
  if (windowsArea === 0 && doorsArea === 0 && totalWallGrossArea > 0) {
    windowsArea = totalWallGrossArea * 0.14;
    doorsArea = 4.2;
  }

  // Välisseina netopindala (ainult välispiire)
  const extWallGrossArea = Math.max(totalWallGrossArea * 0.75, 40);
  const extWallNetArea = Math.max(extWallGrossArea - windowsArea - doorsArea, 20);

  // Katuse pindala (kaldeteguriga)
  const pitchRad = ((roofConfig.pitch || 25) * Math.PI) / 180;
  const roofArea = (netFloorArea * 1.15) / Math.cos(pitchRad);

  // Põrand pinnasel
  const groundFloorArea = netFloorArea;

  // 2. Piirete U-väärtused (Soojusläbivused W/m²K)
  const uWall = 0.14; // Moodne energiatõhus puitkarkass/vill või soe plokk
  const uRoof = 0.11; // Laepealne paks puhurvill 400-500 mm
  const uFloor = 0.16; // 150-200mm EPS soojustus plaadi all
  const uWindow = tripleGlazing ? 0.85 : 1.30;
  const uDoor = 1.05;

  // 3. Piirete erisoojuskaod (Transmission heat loss, W/K)
  const H_wall = extWallNetArea * uWall;
  const H_roof = roofArea * uRoof;
  const H_floor = groundFloorArea * uFloor;
  const H_window = windowsArea * uWindow;
  const H_door = doorsArea * uDoor;
  const H_transmission = H_wall + H_roof + H_floor + H_window + H_door;

  // Külmasillad (~7% piirete kaost)
  const H_thermalBridges = H_transmission * 0.07;

  // 4. Ventilatsiooni ja infiltratsiooni soojuskadu (W/K)
  // Õhuvahetuskordus 0.5 1/h, õhu erisoojusmahtuvus 0.34 Wh/(m³K)
  const airVolumeRate = buildingVolume * 0.5; // m³/h
  const ventilationEfficiency = heatRecovery ? 0.82 : 0.0; // 82% soojustagastus
  const H_ventilation = airVolumeRate * 0.34 * (1 - ventilationEfficiency);
  const H_infiltration = buildingVolume * 0.08 * 0.34; // q50 õhupidavus

  const totalHeatLossCoeff = H_transmission + H_thermalBridges + H_ventilation + H_infiltration; // W/K

  // 5. Aastane küttevajadus (Eesti kliima: ~4050 kraadpäeva)
  const degreeDays = 4050; // K·d
  const annualTransmissionLossKwh = (H_transmission * degreeDays * 24) / 1000;
  const annualVentilationLossKwh = ((H_ventilation + H_infiltration) * degreeDays * 24) / 1000;
  const grossHeatingDemand = (totalHeatLossCoeff * degreeDays * 24) / 1000;

  // Vabasoojused (päike läbi akende + inimesed ja seadmed ~25 kWh/m²a)
  const solarGains = windowsArea * 180 * 0.65; // kWh/a
  const internalGains = netFloorArea * 25; // kWh/a
  const totalFreeGains = Math.min(solarGains + internalGains, grossHeatingDemand * 0.45);

  // Netoküttevajadus ruumide kütmiseks (kWh/a)
  const netSpaceHeating = Math.max(grossHeatingDemand - totalFreeGains, 800);

  // Sooja tarbevee vajadus (25 kWh/m²a)
  const dhwEnergyDemand = netFloorArea * 25;

  // Seadmete ja valgustuse elektrikulu (20 kWh/m²a)
  const electricityDemand = netFloorArea * 20;

  // 6. Tarnitav energia vastavalt kütteallikale (COP arvestus)
  const deliveredSpaceHeating = netSpaceHeating / heatingSystem.cop;
  const deliveredDhw = dhwEnergyDemand / Math.min(heatingSystem.cop, 2.5); // Tarbevesi soojendatakse kõrgemale temp-le
  const deliveredTotal = deliveredSpaceHeating + deliveredDhw + electricityDemand;

  // 7. Päikesepaneelide tootlus (PV)
  // Kui paneelid määratud või katusepõhine potentsiaal
  const defaultPvKw = Math.min(12, Math.max(3, (roofArea * 0.45) / 6.5)); // ~6.5m² per kWp
  const effectivePvKw = solarPanelsKw > 0 ? solarPanelsKw : 0;
  const pvAnnualProduction = effectivePvKw * 1020; // Eestis keskmiselt 1020 kWh / kWp aastas
  const pvSelfConsumption = pvAnnualProduction * 0.65; // 65% omatarve

  // Arvutuslik tarnitud energia millest lahutatakse omatarbitud päikeseelekter
  const netDeliveredEnergy = Math.max(deliveredTotal - pvSelfConsumption, 200);

  // 8. Kaalutud energiakasutus (ETA, kWh/m²a)
  // Kaalutud primaarenergia teguriga
  const weightedEnergy = (deliveredSpaceHeating + deliveredDhw) * heatingSystem.primaryFactor +
                        electricityDemand * 1.2 -
                        pvSelfConsumption * 1.2;

  const eta = Math.max(15, Math.round(weightedEnergy / netFloorArea));

  // 9. Energiaklassi määramine
  let energyClass = ENERGY_CLASSES[ENERGY_CLASSES.length - 1];
  for (const ec of ENERGY_CLASSES) {
    if (eta <= ec.max) {
      energyClass = ec;
      break;
    }
  }

  // 10. Aastased küttekulud eurodes
  const annualHeatingCost = (deliveredSpaceHeating + deliveredDhw) * heatingSystem.fuelCostPerKwh;
  const annualElectricityCost = electricityDemand * 0.16;
  const annualPvSavings = (pvSelfConsumption * 0.16) + ((pvAnnualProduction - pvSelfConsumption) * 0.05);
  const totalAnnualEnergyCost = Math.max(annualHeatingCost + annualElectricityCost - annualPvSavings, 50);

  return {
    netFloorArea: Math.round(netFloorArea),
    buildingVolume: Math.round(buildingVolume),
    extWallNetArea: Math.round(extWallNetArea),
    windowsArea: Math.round(windowsArea),
    doorsArea: Math.round(doorsArea),
    roofArea: Math.round(roofArea),
    uValues: { wall: uWall, roof: uRoof, floor: uFloor, window: uWindow, door: uDoor },
    heatLosses: {
      walls: Math.round((H_wall * degreeDays * 24) / 1000),
      roof: Math.round((H_roof * degreeDays * 24) / 1000),
      floor: Math.round((H_floor * degreeDays * 24) / 1000),
      windows: Math.round((H_window * degreeDays * 24) / 1000),
      doors: Math.round((H_door * degreeDays * 24) / 1000),
      ventilation: Math.round(annualVentilationLossKwh),
    },
    totalHeatLossCoeff: Math.round(totalHeatLossCoeff),
    netSpaceHeating: Math.round(netSpaceHeating),
    dhwEnergyDemand: Math.round(dhwEnergyDemand),
    deliveredTotal: Math.round(deliveredTotal),
    eta,
    energyClass,
    heatingSystem,
    annualHeatingCost: Math.round(annualHeatingCost),
    totalAnnualEnergyCost: Math.round(totalAnnualEnergyCost),
    pvPotential: {
      recommendedKw: Math.round(defaultPvKw * 10) / 10,
      annualProductionKwh: Math.round(defaultPvKw * 1020),
      annualSavingsEur: Math.round(defaultPvKw * 1020 * 0.12),
    },
    recommendations: generateEnergyTips({
      eta,
      energyClass: energyClass.class,
      heatRecovery,
      tripleGlazing,
      heatingSystemKey,
      windowsArea,
      extWallNetArea,
    }),
  };
}

/**
 * Genereerib praktilised soovitused energiaklassi parandamiseks
 */
function generateEnergyTips({
  eta,
  energyClass,
  heatRecovery,
  tripleGlazing,
  heatingSystemKey,
  windowsArea,
  extWallNetArea,
}) {
  const tips = [];

  if (!heatRecovery) {
    tips.push({
      priority: 'high',
      icon: '🔄',
      title: 'Soojustagastusega ventilatsioon',
      text: 'Paigalda plaatsoojusvahetiga ventilatsiooniseade (tagastus ≥80%). See vähendab ventilatsiooni soojuskadu kuni 75% ja tõstab energiaklassi terve taseme võrra.',
    });
  }

  if (!tripleGlazing) {
    tips.push({
      priority: 'high',
      icon: '🪟',
      title: 'Kolmekordsed selektiivklaasiga aknad',
      text: 'Vaheta 2-kordsed aknad (U=1.3) 3-kordsete vastu (U=0.85). Akende soojuskadu väheneb 35%, paraneb klaasipinna soojusmugavus ja puudub talvine külmahoovus.',
    });
  }

  if (heatingSystemKey === 'electric') {
    tips.push({
      priority: 'critical',
      icon: '🌡️',
      title: 'Soojuspumba lisamine',
      text: 'Otsene elektriküte tekitab kõrge energiatõhususarvu. Maasoojuspump või õhk-vesi soojuspump vähendab elektrikulu 3–4 korda ning langetab ETA klassi B või A tasemele.',
    });
  }

  if (windowsArea / (extWallNetArea + windowsArea) > 0.32) {
    tips.push({
      priority: 'medium',
      icon: '☀️',
      title: 'Suur klaasipind lõunasuunas',
      text: 'Suured aknad annavad head päikesesoojust, kuid vajavad suveks päikesekaitseklaasi või räästa varjestust, et vältida suvel jahutuskoormust.',
    });
  }

  tips.push({
    priority: 'good',
    icon: '⚡',
    title: 'Katuse päikesepaneelid (PV)',
    text: '5–8 kWp päikesepaneelide süsteem toodab aastas 5000–8000 kWh rohelist elektrit, kattes eramaja aastase soojuspumba ja tarbevee elektrivajaduse.',
  });

  return tips;
}
