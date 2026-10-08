import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProject, escapeHtml } from '../frontend/js/project-data.js';
test('projects validate before replacing the scene', () => {
  const valid = { walls: [{ id: 'wall', x1: 0, z1: 0, x2: 4, z2: 0, h: 2.4, t: .2 }], objects: [{ type: 'sofa', x: 1, z: 2 }], plotConfig: { width: 25, depth: 35 } };
  assert.equal(validateProject(valid), valid);
  assert.throws(() => validateProject({ arbitrary: true }));
  assert.throws(() => validateProject({ walls: [{}] }));
  assert.throws(() => validateProject({ objects: [{ type: 'sofa', x: Infinity, z: 0 }] }));
  assert.throws(() => validateProject({ walls: [], plotConfig: { width: -1, depth: 2 } }));
  assert.throws(() => validateProject({ walls: new Array(10001) }));
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
