/**
 * KoduDisain – 3D Mudeli eksport (OBJ, GLTF, JSON)
 * Võimaldab eksportida loodud maja ja krundi standardsetesse 3D formaatidesse
 * ühildumiseks Blenderi, SketchUpi, Reviti, AutoCADi ja 3D-printeritega.
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/**
 * Genereerib puhta ja standardse Wavefront OBJ faili Three.js stseenist.
 * Toetab alamobjektide grupeerimist, tippe (v), normaale (vn) ja tahke (f).
 */
export function exportSceneToObj(sceneOrGroup, options = {}) {
  const { onlyBuilding = false } = options;
  let output = '# KoduDisain 3D Arhitektuurne Mudel (Wavefront OBJ)\n';
  output += `# Loodud: ${new Date().toISOString()}\n`;
  output += '# Koordinaadid: X=Pikkus, Y=Kõrgus, Z=Sügavus (Meetrites)\n\n';

  let globalVertexOffset = 1;
  let globalNormalOffset = 1;

  sceneOrGroup.updateMatrixWorld(true);

  sceneOrGroup.traverse(child => {
    if (!child.isMesh || !child.geometry) return;

    // Kontrolli filtreerimist (ainult hoone vs kogu krunt)
    if (onlyBuilding) {
      const isBuilding = child.userData.wallMesh ||
                         child.userData.roomFloor ||
                         child.userData.kind === 'wall' ||
                         child.userData.kind === 'room' ||
                         child.userData.kind === 'roof' ||
                         child.userData.isRoof ||
                         child.userData.isOpening ||
                         child.name?.includes('roof') ||
                         child.name?.includes('wall');
      if (!isBuilding) return;
    }

    const name = child.name || child.userData.type || child.userData.kind || 'objekt';
    output += `\ng ${name.replace(/\s+/g, '_')}\n`;

    const geom = child.geometry.clone();
    geom.applyMatrix4(child.matrixWorld);

    // Teisenda vajadusel BufferGeometry indeksiga/indeksita formaati
    const positionAttr = geom.getAttribute('position');
    const normalAttr = geom.getAttribute('normal');
    if (!positionAttr) return;

    // Tipud (vertices)
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i).toFixed(4);
      const y = positionAttr.getY(i).toFixed(4);
      const z = positionAttr.getZ(i).toFixed(4);
      output += `v ${x} ${y} ${z}\n`;
    }

    // Normaalid
    if (normalAttr) {
      for (let i = 0; i < normalAttr.count; i++) {
        const nx = normalAttr.getX(i).toFixed(4);
        const ny = normalAttr.getY(i).toFixed(4);
        const nz = normalAttr.getZ(i).toFixed(4);
        output += `vn ${nx} ${ny} ${nz}\n`;
      }
    }

    // Tahud (faces)
    const index = geom.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i) + globalVertexOffset;
        const b = index.getX(i + 1) + globalVertexOffset;
        const c = index.getX(i + 2) + globalVertexOffset;
        if (normalAttr) {
          const na = index.getX(i) + globalNormalOffset;
          const nb = index.getX(i + 1) + globalNormalOffset;
          const nc = index.getX(i + 2) + globalNormalOffset;
          output += `f ${a}//${na} ${b}//${nb} ${c}//${nc}\n`;
        } else {
          output += `f ${a} ${b} ${c}\n`;
        }
      }
    } else {
      for (let i = 0; i < positionAttr.count; i += 3) {
        const a = i + globalVertexOffset;
        const b = i + 1 + globalVertexOffset;
        const c = i + 2 + globalVertexOffset;
        if (normalAttr) {
          const na = i + globalNormalOffset;
          const nb = i + 1 + globalNormalOffset;
          const nc = i + 2 + globalNormalOffset;
          output += `f ${a}//${na} ${b}//${nb} ${c}//${nc}\n`;
        } else {
          output += `f ${a} ${b} ${c}\n`;
        }
      }
    }

    globalVertexOffset += positionAttr.count;
    if (normalAttr) globalNormalOffset += normalAttr.count;
  });

  return output;
}

/**
 * Eksport glTF / GLB formaati Three.js GLTFExporter abil
 */
export function exportSceneToGltf(sceneOrGroup, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const exporter = new GLTFExporter();
      const exportOptions = {
        binary: options.binary ?? false,
        onlyVisible: true,
        embedImages: true,
      };

      exporter.parse(
        sceneOrGroup,
        result => {
          resolve(result);
        },
        error => {
          reject(error);
        },
        exportOptions
      );
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Käivitab faili allalaadimise brauseris
 */
export function triggerFileDownload(content, filename, mimeType = 'text/plain') {
  const blob = typeof content === 'string'
    ? new Blob([content], { type: mimeType })
    : content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
