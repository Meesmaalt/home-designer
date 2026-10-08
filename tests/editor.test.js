import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { validateProject } from '../frontend/js/project-data.js';

test('studio menus preserve controls and close after actions', async () => {
  const dom = new JSDOM(fs.readFileSync('frontend/index.html', 'utf8'), { runScripts: 'outside-only' });
  const doc = dom.window.document;
  const ids = [...doc.querySelectorAll('[id]')].map(el => el.id);
  dom.window.eval(fs.readFileSync('frontend/js/studio.js', 'utf8'));
  for (const id of ids) assert.equal(doc.querySelectorAll(`[id="${id}"]`).length, 1, id);
  assert.equal(doc.querySelector('#btn-open-energy').closest('details').id, 'tools-menu');
  assert.equal(doc.querySelector('#btn-save').closest('details').id, 'project-menu');
  assert.equal(doc.querySelector('#btn-sun').closest('details').id, 'display-menu');
  const menu = doc.querySelector('#project-menu');
  menu.open = true;
  doc.querySelector('#btn-save').click();
  assert.equal(menu.open, false);
  const modal = doc.querySelector('#auth-modal');
  modal.classList.remove('hidden');
  await Promise.resolve();
  assert.equal(doc.activeElement.id, 'auth-email');
  doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(modal.classList.contains('hidden'));
  dom.window.close();
});

test('undo snapshots stay immutable, redo works, and import resets cloud identity', () => {
  const source = fs.readFileSync('frontend/js/app.js', 'utf8');
  const block = source.slice(source.indexOf('const history = [];'), source.indexOf('// Objekti valimine ja inspektor'));
  const name = { value: 'Esimene' }, buttons = { 'project-name': name, 'btn-undo': {}, 'btn-redo': {} };
  const context = vm.createContext({
    structuredClone, setTimeout, clearTimeout, validateProject,
    document: { getElementById: id => buttons[id] || null, querySelector: () => ({ dataset: {} }) },
    walls: [], rooms: [], measurements: [], roofConfig: { type: 'gable' }, defaultRoofConfig: { type: 'gable' }, plotConfig: { width: 25, depth: 35 }, PLOT_DEFAULTS: { width: 25, depth: 35, maxCoveragePct: 20 }, traceMeta: null,
    APP: { name: 'KoduDisain', version: 8 },
    allEditable: () => [], clearEditable: () => {}, rebuildAllWalls: () => {}, rebuildRooms: () => {}, rebuildRoof: () => {}, rebuildPlotMesh: () => {}, updateCompassUi: () => {}, rebuildTrace: () => {}, deselect: () => {}, refreshList: () => {}, refreshQuote: () => {}, setStatus: () => {},
  });
  vm.runInContext(block, context);
  vm.runInContext('walls = [{ id:"w", x1:0, z1:0, x2:4, z2:0 }]; pushHist(); walls[0].x2 = 5; pushHist(); undo(); walls[0].x2 = 99;', context);
  assert.equal(vm.runInContext('history[0].walls[0].x2', context), 4);
  vm.runInContext('redo()', context);
  assert.equal(vm.runInContext('walls[0].x2', context), 5);
  vm.runInContext('undo(); walls[0].x2 = 6; pushHist()', context);
  assert.equal(vm.runInContext('future.length', context), 0);
  vm.runInContext('cloudProjectId = "old"; apply({ name:"Teine", walls:[], objects:[], plotConfig:{ width:40, depth:60 } })', context);
  assert.equal(vm.runInContext('cloudProjectId', context), null);
  assert.equal(vm.runInContext('plotConfig.width', context), 40);
  assert.equal(name.value, 'Teine');
  assert.throws(() => vm.runInContext('apply({ walls:[{}] })', context));
  assert.equal(vm.runInContext('plotConfig.width', context), 40);
});
