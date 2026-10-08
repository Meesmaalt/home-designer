import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../server.js';
const testRoot = path.resolve('.test-data');
fs.mkdirSync(testRoot, { recursive: true });

test('passwords, ownership, signed sessions, sharing and persistence', async () => {
  const dir = fs.mkdtempSync(path.join(testRoot, 'api-'));
  const dataFile = path.join(dir, 'data.json');
  const app = createApp({ dataFile, secret: 'test-only-secret' });
  const api = request(app);
  const password = 'test-password-123';
  async function account(email) {
    await api.post('/api/collections/users/records').send({ email, password, passwordConfirm: password }).expect(200);
    return (await api.post('/api/collections/users/auth-with-password').send({ identity: email, password }).expect(200)).body;
  }
  const alice = await account('alice@example.com');
  const bob = await account('bob@example.com');
  await api.post('/api/collections/users/auth-with-password').send({ identity: 'alice@example.com', password: 'wrong-password' }).expect(400);
  await api.post('/api/collections/users/auth-with-password').send({ identity: 'missing@example.com', password }).expect(400);
  await api.post('/api/collections/users/records').send({ email: 'ALICE@example.com', password, passwordConfirm: password }).expect(400);
  await api.get('/api/collections/projects/records').expect(401);
  const project = (await api.post('/api/collections/projects/records').set('Authorization', alice.token).send({ name: 'Minu kodu', owner: bob.record.id, data: { walls: [], objects: [] } }).expect(200)).body;
  assert.equal(project.owner, alice.record.id);
  const url = '/api/collections/projects/records/' + project.id;
  await api.get(url).set('Authorization', bob.token).expect(404);
  await api.patch(url).set('Authorization', bob.token).send({ name: 'stolen' }).expect(404);
  await api.delete(url).set('Authorization', bob.token).expect(404);
  assert.equal((await api.get('/api/collections/projects/records').set('Authorization', bob.token)).body.items.length, 0);
  const parts = alice.token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ id: bob.record.id, exp: Date.now()/1000 + 1000 })).toString('base64url');
  await api.get('/api/collections/projects/records').set('Authorization', parts.join('.')).expect(401);
  const shared = () => api.get('/api/collections/projects/records').query({ filter: `share_token = "${project.share_token}" && is_public = true` });
  assert.equal((await shared()).body.items.length, 0);
  const updated = (await api.patch(url).set('Authorization', alice.token).send({ is_public: true, owner: bob.record.id, id: 'changed', share_token: 'guessed' }).expect(200)).body;
  assert.equal(updated.id, project.id);
  assert.equal(updated.owner, alice.record.id);
  assert.equal(updated.share_token, project.share_token);
  assert.equal((await shared()).body.items.length, 1);
  await api.patch(url).set('Authorization', alice.token).send({ is_public: false }).expect(200);
  assert.equal((await shared()).body.items.length, 0);
  const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.ok(saved.users.every(u => u.passwordHash && !u.password));
  assert.ok(!JSON.stringify(saved).includes(password));
  const restarted = request(createApp({ dataFile, secret: 'test-only-secret' }));
  await restarted.get(url).set('Authorization', alice.token).expect(200);
  await api.delete(url).set('Authorization', alice.token).expect(204);
  await api.get(url).set('Authorization', alice.token).expect(404);
});

test('legacy local passwords migrate without losing accounts or projects', async () => {
  const dir = fs.mkdtempSync(path.join(testRoot, 'migration-'));
  const dataFile = path.join(dir, 'data.json');
  fs.writeFileSync(dataFile, JSON.stringify({ users: [{ id: 'legacy', email: 'old@example.com', name: 'Old', password: 'legacy-password' }], projects: [{ id: 'kept', owner: 'legacy', data: {} }] }));
  const api = request(createApp({ dataFile, secret: 'test-only-secret' }));
  const login = await api.post('/api/collections/users/auth-with-password').send({ identity: 'old@example.com', password: 'legacy-password' }).expect(200);
  await api.get('/api/collections/projects/records/kept').set('Authorization', login.body.token).expect(200);
  assert.equal(JSON.parse(fs.readFileSync(dataFile)).users[0].password, undefined);
});
