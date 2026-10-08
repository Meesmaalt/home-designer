/** Validate a project before replacing the current scene. Shared by import and recovery. */
export function validateProject(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Projekt peab olema JSON objekt.');
  if (!Array.isArray(data.walls) && !Array.isArray(data.objects) && !Array.isArray(data.layout)) {
    throw new Error('Fail ei sisalda KoduDisaini projekti.');
  }
  for (const key of ['walls', 'rooms', 'measurements', 'objects', 'layout']) {
    if (data[key] !== undefined && (!Array.isArray(data[key]) || data[key].length > 10000)) {
      throw new Error('Vigane või liiga suur projekt: ' + key);
    }
  }
  const finite = (v, label) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 100000) throw new Error('Vigane mõõt: ' + label);
  };
  for (const w of data.walls || []) {
    if (!w || typeof w.id !== 'string') throw new Error('Vigane sein.');
    for (const key of ['x1', 'z1', 'x2', 'z2']) finite(w[key], key);
    for (const key of ['h', 't']) if (w[key] !== undefined) { finite(w[key], key); if (w[key] <= 0) throw new Error('Seina mõõt peab olema positiivne.'); }
    if (w.openings !== undefined) {
      if (!Array.isArray(w.openings) || w.openings.length > 1000) throw new Error('Vigased avatäited.');
      for (const o of w.openings) {
        if (!o || !['door', 'window'].includes(o.type)) throw new Error('Vigane avatäide.');
        for (const key of ['along', 'width', 'height']) finite(o[key], key);
        if (o.sill !== undefined) finite(o.sill, 'sill');
      }
    }
  }
  for (const o of data.objects || data.layout || []) {
    if (!o || typeof o.type !== 'string') throw new Error('Vigane objekt.');
    for (const key of ['x', 'z']) finite(o[key], key);
    for (const key of ['y', 'ry', 's']) if (o[key] !== undefined) finite(o[key], key);
  }
  for (const r of data.rooms || []) {
    if (!r || typeof r.id !== 'string') throw new Error('Vigane ruum.');
    for (const key of ['x', 'z']) finite(r[key], key);
    for (const key of ['w', 'd', 'area']) if (r[key] !== undefined) finite(r[key], key);
  }
  for (const m of data.measurements || []) {
    if (!m) throw new Error('Vigane mõõdujoon.');
    for (const key of ['x1', 'z1', 'x2', 'z2']) finite(m[key], key);
  }
  if (data.roofConfig) {
    if (!['gable', 'shed', 'flat', 'none'].includes(data.roofConfig.type)) throw new Error('Vigane katusetüüp.');
    for (const key of ['pitch', 'overhang']) if (data.roofConfig[key] !== undefined) finite(data.roofConfig[key], key);
  }
  if (data.trace && (typeof data.trace !== 'object' || typeof data.trace.dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(data.trace.dataUrl))) {
    throw new Error('Alusplaan peab olema kohalik PNG, JPEG või WebP pilt.');
  }
  if (data.plotConfig) {
    for (const key of ['width', 'depth']) {
      finite(data.plotConfig[key], key);
      if (data.plotConfig[key] <= 0 || data.plotConfig[key] > 1000) throw new Error('Vigane krundi suurus.');
    }
  }
  return data;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
