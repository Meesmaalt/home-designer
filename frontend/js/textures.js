import * as THREE from 'three';

/**
 * Protseduurilised CanvasTexture tekstuurid
 * Genereerivad kerge ja kõrgekvaliteedilise PBR-visuaali ilma väliste failideta.
 */

const textureCache = new Map();

function createProceduralCanvas(width, height, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 1. Murutekstuur (elav muruvaip peente toonide ja faktuuriga)
export function getGrassTexture() {
  if (textureCache.has('grass')) return textureCache.get('grass');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#497e38';
    ctx.fillRect(0, 0, w, h);

    // Orgaaniline rohumuster ja toonierinevused
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 3 + Math.random() * 5;
      const angle = (Math.random() - 0.5) * 0.8;
      const shade = Math.random();
      if (shade < 0.35) {
        ctx.strokeStyle = 'rgba(102, 168, 70, 0.45)'; // hele roheline
      } else if (shade < 0.7) {
        ctx.strokeStyle = 'rgba(54, 98, 42, 0.4)'; // sügavroheline
      } else {
        ctx.strokeStyle = 'rgba(125, 178, 85, 0.3)'; // kollakasroheline sälg
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(angle) * len, y - Math.cos(angle) * len);
      ctx.stroke();
    }

    // Peened varjulaigud
    for (let i = 0; i < 60; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 4 + Math.random() * 12;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(38, 70, 28, 0.18)');
      grad.addColorStop(1, 'rgba(38, 70, 28, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  tex.repeat.set(24, 24);
  textureCache.set('grass', tex);
  return tex;
}

// 2. Puitlaudise tekstuur (fassaad, terrass, mööbel)
export function getWoodPlankTexture(isDark = false) {
  const key = isDark ? 'wood_dark' : 'wood_light';
  if (textureCache.has(key)) return textureCache.get(key);

  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const baseColor = isDark ? '#634735' : '#c9a173';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    const plankCount = 8;
    const plankH = h / plankCount;

    for (let p = 0; p < plankCount; p++) {
      const py = p * plankH;
      // Laudise toonierinevus
      const delta = (Math.random() - 0.5) * 0.15;
      ctx.fillStyle = isDark
        ? `rgba(${Math.floor(100 + delta * 50)}, ${Math.floor(70 + delta * 40)}, ${Math.floor(50 + delta * 30)}, 0.4)`
        : `rgba(${Math.floor(210 + delta * 40)}, ${Math.floor(170 + delta * 35)}, ${Math.floor(125 + delta * 30)}, 0.4)`;
      ctx.fillRect(0, py, w, plankH);

      // Puidusüüd
      for (let s = 0; s < 18; s++) {
        const sy = py + Math.random() * plankH;
        ctx.strokeStyle = isDark ? 'rgba(45, 30, 20, 0.25)' : 'rgba(150, 110, 75, 0.25)';
        ctx.lineWidth = 0.8 + Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.bezierCurveTo(w * 0.3, sy + (Math.random() - 0.5) * 4, w * 0.7, sy + (Math.random() - 0.5) * 4, w, sy);
        ctx.stroke();
      }

      // Laudade vaheline vuugijoon (varjuga)
      ctx.fillStyle = isDark ? '#2b1c14' : '#684d34';
      ctx.fillRect(0, py + plankH - 2, w, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, py, w, 1);
    }
  });
  tex.repeat.set(3, 3);
  textureCache.set(key, tex);
  return tex;
}

// 3. Tammeparkett (ruumi siseviimistlus)
export function getParquetTexture() {
  if (textureCache.has('parquet')) return textureCache.get('parquet');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#be8d58';
    ctx.fillRect(0, 0, w, h);

    const cols = 4;
    const rows = 8;
    const colW = w / cols;
    const rowH = h / rows;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 0) ? 0 : colW / 2;
      for (let c = -1; c <= cols; c++) {
        const bx = c * colW + offsetX;
        const by = r * rowH;

        // Iga parketilaua kerge unikaalne soojus/variatsioon
        const rand = (Math.random() - 0.5) * 20;
        ctx.fillStyle = `rgb(${190 + rand}, ${140 + rand * 0.8}, ${88 + rand * 0.6})`;
        ctx.fillRect(bx + 1, by + 1, colW - 2, rowH - 2);

        // Puidusüü
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = 'rgba(120, 80, 45, 0.18)';
          ctx.lineWidth = 1;
          const ly = by + 3 + i * (rowH / 4);
          ctx.beginPath();
          ctx.moveTo(bx + 2, ly);
          ctx.lineTo(bx + colW - 2, ly);
          ctx.stroke();
        }

        // Vuuk
        ctx.strokeStyle = '#6b4c2b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx + 0.5, by + 0.5, colW - 1, rowH - 1);
      }
    }
  });
  tex.repeat.set(4, 4);
  textureCache.set('parquet', tex);
  return tex;
}

// 4. Keraamiline plaat (vannituba / esik / saun)
export function getTileTexture(isLight = false) {
  const key = isLight ? 'tile_light' : 'tile_gray';
  if (textureCache.has(key)) return textureCache.get(key);

  const tex = createProceduralCanvas(128, 128, (ctx, w, h) => {
    const tileColor = isLight ? '#eae8e3' : '#636c78';
    const groutColor = isLight ? '#c8c4bb' : '#3c424a';
    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, w, h);

    const tileW = w / 2;
    const tileH = h / 2;
    const pad = 2.5;

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = tileColor;
        ctx.fillRect(c * tileW + pad, r * tileH + pad, tileW - pad * 2, tileH - pad * 2);

        // Pehme marmorjas/kivine kuma plaadi keskel
        const grad = ctx.createRadialGradient(
          c * tileW + tileW / 2, r * tileH + tileH / 2, 2,
          c * tileW + tileW / 2, r * tileH + tileH / 2, tileW / 1.5
        );
        grad.addColorStop(0, isLight ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)');
        grad.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(c * tileW + pad, r * tileH + pad, tileW - pad * 2, tileH - pad * 2);
      }
    }
  });
  tex.repeat.set(6, 6);
  textureCache.set(key, tex);
  return tex;
}

// 5. Unikivi / tänavakivi (jalgteed, sissesõidud, platsid)
export function getPaverTexture() {
  if (textureCache.has('paver')) return textureCache.get('paver');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4a4f55'; // vuugitäide
    ctx.fillRect(0, 0, w, h);

    const cols = 6;
    const rows = 12;
    const cw = w / cols;
    const rh = h / rows;

    for (let r = 0; r < rows; r++) {
      const shift = (r % 2 === 0) ? 0 : cw / 2;
      for (let c = -1; c <= cols; c++) {
        const px = c * cw + shift;
        const py = r * rh;
        const shade = Math.floor(125 + (Math.random() - 0.5) * 35);
        ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 5})`;
        ctx.fillRect(px + 1.5, py + 1.5, cw - 3, rh - 3);

        // Kivi teraline struktuur
        for (let k = 0; k < 12; k++) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
          ctx.fillRect(px + 3 + Math.random() * (cw - 6), py + 3 + Math.random() * (rh - 6), 2, 2);
        }
      }
    }
  });
  tex.repeat.set(4, 4);
  textureCache.set('paver', tex);
  return tex;
}

// 6. Veetekstuur basseinile ja tiigile
export function getWaterTexture() {
  if (textureCache.has('water')) return textureCache.get('water');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a8ca8');
    grad.addColorStop(1, '#0e657c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Kaustika/lainetusmustrid
    ctx.strokeStyle = 'rgba(215, 245, 255, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const rx = 15 + Math.random() * 25;
      const ry = 8 + Math.random() * 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, Math.PI / 4 + (Math.random() - 0.5) * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  tex.repeat.set(3, 3);
  textureCache.set('water', tex);
  return tex;
}

// 7. Villane modernne vaip (geomeetriline skandinaavia muster)
export function getRugTexture() {
  if (textureCache.has('rug')) return textureCache.get('rug');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e5dfd5';
    ctx.fillRect(0, 0, w, h);

    // Pehme beež ja tumehall geomeetriline muster
    ctx.strokeStyle = '#4a4843';
    ctx.lineWidth = 3;
    const step = 32;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + step, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + step, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // Raam
    ctx.strokeRect(8, 8, w - 16, h - 16);
  });
  textureCache.set('rug', tex);
  return tex;
}

// 8. Bouclé kangas (luksuslik pehme tekstuur diivanitele ja tugitoolidele)
export function getBoucleTexture() {
  if (textureCache.has('boucle')) return textureCache.get('boucle');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, w, h);

    // Bouclé villatutikesed ja pehmed silmused
    for (let i = 0; i < 3000; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 1.2 + Math.random() * 2.2;
      const shade = Math.random();
      ctx.fillStyle = shade > 0.5 ? 'rgba(255, 255, 255, 0.45)' : 'rgba(215, 207, 195, 0.55)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  tex.repeat.set(6, 6);
  textureCache.set('boucle', tex);
  return tex;
}

// 9. Pähklipuu tekstuur (luksuslik soe tume puit)
export function getWalnutTexture() {
  if (textureCache.has('walnut')) return textureCache.get('walnut');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4c3528';
    ctx.fillRect(0, 0, w, h);

    // Peened lainjad pähklisüüd
    for (let i = 0; i < 30; i++) {
      const y = Math.random() * h;
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(56, 38, 27, 0.4)' : 'rgba(92, 68, 52, 0.35)';
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.35, y + (Math.random() - 0.5) * 12, w * 0.7, y + (Math.random() - 0.5) * 12, w, y);
      ctx.stroke();
    }
  });
  tex.repeat.set(2, 2);
  textureCache.set('walnut', tex);
  return tex;
}

// 10. Konjaki tooni nahktekstuur
export function getLeatherTexture() {
  if (textureCache.has('leather')) return textureCache.get('leather');
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#874c27';
    ctx.fillRect(0, 0, w, h);

    // Nahapoorid ja mikrostruktuur
    for (let i = 0; i < 2500; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(80, 42, 18, 0.3)' : 'rgba(160, 98, 54, 0.25)';
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  });
  tex.repeat.set(4, 4);
  textureCache.set('leather', tex);
  return tex;
}

// 11. Arhitektuurne valtsplekk / katusekivi tekstuur
export function getRoofTileTexture(isRed = false) {
  const key = isRed ? 'roof_red' : 'roof_dark';
  if (textureCache.has(key)) return textureCache.get(key);
  const tex = createProceduralCanvas(256, 256, (ctx, w, h) => {
    const baseCol = isRed ? '#8a3a2a' : '#2b3038';
    ctx.fillStyle = baseCol;
    ctx.fillRect(0, 0, w, h);

    // Klassik-profiili valtsisooned püstisuunas (seams)
    const seamCount = 6;
    const seamDist = w / seamCount;
    for (let i = 0; i <= seamCount; i++) {
      const sx = i * seamDist;
      // Valtsisoone vari ja esiletõst
      ctx.fillStyle = isRed ? '#551f15' : '#14181c';
      ctx.fillRect(sx - 2, 0, 3, h);
      ctx.fillStyle = isRed ? 'rgba(255, 160, 140, 0.35)' : 'rgba(160, 185, 210, 0.35)';
      ctx.fillRect(sx + 1, 0, 2, h);
    }

    // Horisontaalsed peened paneelipinnad & metalli mikropeegeldus
    for (let y = 0; y < h; y += 32) {
      ctx.fillStyle = isRed ? 'rgba(60, 20, 15, 0.25)' : 'rgba(15, 20, 25, 0.25)';
      ctx.fillRect(0, y, w, 1);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, y + 1, w, 1);
    }
  });
  tex.repeat.set(6, 6);
  textureCache.set(key, tex);
  return tex;
}

