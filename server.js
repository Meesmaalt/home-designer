import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const scrypt = promisify(crypto.scrypt);
const fail = (res, code, message) => res.status(code).json({ code, message, data: {} });

export function createApp({ dataFile = process.env.DATA_FILE || path.join(root, '.storage.json'), secret = process.env.SESSION_SECRET } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16mb' }));
  app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
  let store = { users: [], projects: [] };
  if (fs.existsSync(dataFile)) {
    store = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    if (!Array.isArray(store.users) || !Array.isArray(store.projects)) throw new Error('Invalid storage');
  }
  if (!secret) {
    const keyFile = dataFile + '.session-key';
    if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
    secret = fs.readFileSync(keyFile, 'utf8').trim();
  }
  function persist() {
    fs.writeFileSync(dataFile + '.tmp', JSON.stringify(store, null, 2), { mode: 0o600 });
    fs.renameSync(dataFile + '.tmp', dataFile);
  }
  const sign = input => crypto.createHmac('sha256', secret).update(input).digest('base64url');
  function token(user) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ id: user.id, type: 'authRecord', collectionId: '_pb_users_auth_', exp: Math.floor(Date.now()/1000) + 7*86400 })).toString('base64url');
    return `${header}.${body}.${sign(header + '.' + body)}`;
  }
  function auth(req) {
    try {
      const parts = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').split('.');
      if (parts.length !== 3) return null;
      const expected = Buffer.from(sign(parts[0] + '.' + parts[1]));
      const received = Buffer.from(parts[2]);
      if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url'));
      if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()/1000) return null;
      return store.users.find(u => u.id === payload.id) || null;
    } catch { return null; }
  }
  const cleanUser = u => ({ id:u.id, collectionId:'_pb_users_auth_', collectionName:'users', username:u.name, name:u.name, email:u.email, verified:false, emailVisibility:false, created:u.created, updated:u.updated });
  const emailOf = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
  async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return salt + ':' + Buffer.from(await scrypt(password, salt, 64)).toString('hex');
  }
  async function matches(password, hash) {
    if (typeof password !== 'string' || password.length > 1024 || !hash) return false;
    const [salt, digest] = hash.split(':');
    const expected = Buffer.from(digest || '', 'hex');
    const actual = Buffer.from(await scrypt(password, salt, 64));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  // Upgrade existing local accounts; don't retain plaintext passwords on disk.
  const ready = (async () => {
    let changed = false;
    for (const user of store.users) {
      if (typeof user.password === 'string') {
        user.passwordHash = await hashPassword(user.password);
        delete user.password; changed = true;
      }
      user.email = emailOf(user.email);
    }
    if (changed) persist();
  })();
  const route = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
  const router = express.Router();
  router.use((req,res,next) => { res.setHeader('Cache-Control','no-store'); ready.then(() => next(), next); });
  router.get('/health', (req,res) => res.json({ code:200, message:'API is healthy.', data:{} }));
  const attempts = new Map();
  router.use('/collections/users', (req,res,next) => {
    if (req.method !== 'POST') return next();
    const now = Date.now();
    for (const [ip,entry] of attempts) if (entry.until <= now) attempts.delete(ip);
    const entry = attempts.get(req.ip) || { count:0, until:now + 15*60000 };
    attempts.set(req.ip,entry);
    if (++entry.count > 40) return fail(res,429,'Liiga palju katseid. Proovi 15 minuti pärast.');
    next();
  });
  router.post('/collections/users/auth-with-password', route(async (req,res) => {
    const user = store.users.find(u => u.email === emailOf(req.body.identity));
    if (!user || !await matches(req.body.password,user.passwordHash)) return fail(res,400,'Vale e-post või parool.');
    res.json({ token:token(user), record:cleanUser(user) });
  }));
  router.post('/collections/users/records', route(async (req,res) => {
    const email = emailOf(req.body.email), password = req.body.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string' || password.length < 8 || password.length > 1024 || password !== req.body.passwordConfirm) return fail(res,400,'Sisesta korrektne e-post ja vähemalt 8 märgiga parool.');
    if (store.users.some(u => u.email === email)) return fail(res,400,'Selle e-postiga konto on juba olemas.');
    const passwordHash = await hashPassword(password);
    if (store.users.some(u => u.email === email)) return fail(res,400,'Selle e-postiga konto on juba olemas.');
    const now = new Date().toISOString();
    const user = { id:crypto.randomUUID(), email, name:String(req.body.name || email.split('@')[0]).slice(0,120), passwordHash, created:now, updated:now };
    store.users.push(user);
    try { persist(); } catch (error) { store.users.pop(); throw error; }
    res.json(cleanUser(user));
  }));
  router.get('/collections/users/records/:id', (req,res) => {
    const user = auth(req);
    if (!user) return fail(res,401,'Logi sisse.');
    if (user.id !== req.params.id) return fail(res,404,'Kontot ei leitud.');
    res.json(cleanUser(user));
  });
  router.get('/collections/projects/records', (req,res) => {
    const user = auth(req);
    const share = String(req.query.filter || '').match(/share_token\s*=\s*["']([a-zA-Z0-9_-]+)["']/)?.[1];
    if (!user && !share) return fail(res,401,'Logi sisse.');
    let items = share ? store.projects.filter(p => p.is_public && p.share_token === share) : store.projects.filter(p => p.owner === user.id);
    if (req.query.sort === '-updated') items.sort((a,b) => b.updated.localeCompare(a.updated));
    const page = Math.max(1,parseInt(req.query.page) || 1), perPage = Math.min(500,Math.max(1,parseInt(req.query.perPage) || 100));
    res.json({ page, perPage, totalItems:items.length, totalPages:Math.ceil(items.length/perPage), items:items.slice((page-1)*perPage,page*perPage) });
  });
  function fields(body) {
    const allowed = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.length > 200) throw Object.assign(new Error('Vigane projekti nimi.'),{ status:400 });
      allowed.name = body.name.trim() || 'Projekt';
    }
    if (body.data !== undefined) {
      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw Object.assign(new Error('Vigane projekti sisu.'),{ status:400 });
      allowed.data = body.data;
    }
    if (body.notes !== undefined) allowed.notes = String(body.notes).slice(0,10000);
    if (body.is_public !== undefined) {
      if (typeof body.is_public !== 'boolean') throw Object.assign(new Error('Vigane jagamise seade.'),{ status:400 });
      allowed.is_public = body.is_public;
    }
    return allowed;
  }
  router.post('/collections/projects/records', route(async (req,res) => {
    const user = auth(req);
    if (!user) return fail(res,401,'Logi sisse.');
    const now = new Date().toISOString();
    const record = { id:crypto.randomUUID(), collectionId:'projects', collectionName:'projects', created:now, updated:now, name:'Projekt', notes:'', data:{}, is_public:false, ...fields(req.body), owner:user.id, share_token:crypto.randomBytes(24).toString('base64url') };
    store.projects.push(record);
    try { persist(); } catch (error) { store.projects.pop(); throw error; }
    res.json(record);
  }));
  router.use('/collections/projects/records/:id', (req,res,next) => {
    const user = auth(req);
    if (!user) return fail(res,401,'Logi sisse.');
    req.project = store.projects.find(p => p.id === req.params.id && p.owner === user.id);
    if (!req.project) return fail(res,404,'Projekti ei leitud.');
    next();
  });
  router.get('/collections/projects/records/:id', (req,res) => res.json(req.project));
  router.patch('/collections/projects/records/:id', route(async (req,res) => {
    const previous = { ...req.project };
    Object.assign(req.project,fields(req.body),{ updated:new Date().toISOString() });
    try { persist(); } catch (error) { Object.assign(req.project,previous); throw error; }
    res.json(req.project);
  }));
  router.delete('/collections/projects/records/:id', route(async (req,res) => {
    const previous = store.projects;
    store.projects = store.projects.filter(p => p.id !== req.project.id);
    try { persist(); } catch (error) { store.projects = previous; throw error; }
    res.status(204).end();
  }));
  router.use((req,res) => fail(res,404,'API toimingut ei leitud.'));
  app.use('/api',router); app.use('/pb/api',router);
  app.use(express.static(path.join(root,'frontend')));
  app.get('*',(req,res) => res.sendFile(path.join(root,'frontend/index.html')));
  app.use((error,req,res,next) => {
    const status = error.status || 500;
    if (status >= 500) console.error('Request failed:',error.message);
    fail(res,status,status >= 500 ? 'Salvestamine ebaõnnestus. Proovi uuesti.' : error.message);
  });
  return app;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000, host = process.env.HOST || '127.0.0.1';
  createApp().listen(port,host,() => console.log(`KoduDisain: http://${host}:${port}`));
}
