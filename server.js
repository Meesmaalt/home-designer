import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '32mb' }));
app.use(express.urlencoded({ extended: true, limit: '32mb' }));

// In-memory data store with optional local file backup
const DATA_FILE = path.join(__dirname, '.storage.json');
let store = {
  users: [
    {
      id: 'demo_user_1',
      email: 'demo@kodu.local',
      name: 'Kasutaja',
      password: 'password',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
  ],
  projects: []
};

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    store = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not load local storage file:', e.message);
}

function persistStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    // Ignore storage write errors on read-only environments
  }
}

function makeToken(user) {
  // PocketBase client parses base64 payload: JSON.parse(atob(token.split('.')[1]))
  // exp must be in future seconds
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    type: 'authRecord',
    collectionId: '_pb_users_auth_',
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 3600
  })).toString('base64url');
  const signature = 'local_sig';
  return `${header}.${payload}.${signature}`;
}

function sanitizeUser(u) {
  return {
    id: u.id,
    collectionId: '_pb_users_auth_',
    collectionName: 'users',
    username: u.name || u.email.split('@')[0],
    verified: true,
    emailVisibility: false,
    email: u.email,
    created: u.created || new Date().toISOString(),
    updated: u.updated || new Date().toISOString(),
    name: u.name || ''
  };
}

// PocketBase API router
const pbRouter = express.Router();

pbRouter.get('/health', (req, res) => {
  res.json({ code: 200, message: 'API is healthy.', data: {} });
});

// Auth with password
pbRouter.post('/collections/users/auth-with-password', (req, res) => {
  const { identity, password } = req.body || {};
  let user = store.users.find(u => u.email === identity);
  if (!user) {
    // Auto-create or accept for convenience
    user = {
      id: 'u_' + Math.random().toString(36).slice(2, 11),
      email: identity || 'kasutaja@kodu.local',
      name: (identity || 'kasutaja').split('@')[0],
      password: password || '123456',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    store.users.push(user);
    persistStore();
  }
  const token = makeToken(user);
  res.json({
    token,
    record: sanitizeUser(user)
  });
});

// Create user
pbRouter.post('/collections/users/records', (req, res) => {
  const { email, password, name } = req.body || {};
  let user = store.users.find(u => u.email === email);
  if (!user) {
    user = {
      id: 'u_' + Math.random().toString(36).slice(2, 11),
      email: email || 'kasutaja@kodu.local',
      name: name || (email ? email.split('@')[0] : 'Kasutaja'),
      password: password || '123456',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    store.users.push(user);
    persistStore();
  }
  res.json(sanitizeUser(user));
});

// Get user record
pbRouter.get('/collections/users/records/:id', (req, res) => {
  const user = store.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(sanitizeUser(user));
});

// Projects collection list
pbRouter.get('/collections/projects/records', (req, res) => {
  let items = [...store.projects];
  const filter = req.query.filter || '';

  // Handle owner filter e.g. owner = "xyz"
  const ownerMatch = filter.match(/owner\s*=\s*["']([^"']+)["']/);
  if (ownerMatch) {
    const ownerId = ownerMatch[1];
    items = items.filter(p => p.owner === ownerId);
  }

  // Handle share_token filter e.g. share_token = "abc"
  const tokenMatch = filter.match(/share_token\s*=\s*["']([^"']+)["']/);
  if (tokenMatch) {
    const tok = tokenMatch[1];
    items = items.filter(p => p.share_token === tok);
  }

  // Sort
  if (req.query.sort === '-updated') {
    items.sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));
  }

  res.json({
    page: 1,
    perPage: 500,
    totalItems: items.length,
    totalPages: 1,
    items
  });
});

// Create project
pbRouter.post('/collections/projects/records', (req, res) => {
  const now = new Date().toISOString();
  const id = 'proj_' + Math.random().toString(36).slice(2, 11);
  const record = {
    id,
    collectionId: 'projects',
    collectionName: 'projects',
    created: now,
    updated: now,
    name: req.body.name || 'Projekt',
    owner: req.body.owner || '',
    data: req.body.data || {},
    notes: req.body.notes || '',
    share_token: req.body.share_token || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    is_public: !!req.body.is_public,
  };
  store.projects.push(record);
  persistStore();
  res.status(200).json(record);
});

// Get single project
pbRouter.get('/collections/projects/records/:id', (req, res) => {
  const record = store.projects.find(p => p.id === req.params.id);
  if (!record) return res.status(404).json({ message: 'Project not found' });
  res.json(record);
});

// Update project
pbRouter.patch('/collections/projects/records/:id', (req, res) => {
  const idx = store.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Project not found' });
  const existing = store.projects[idx];
  const updated = {
    ...existing,
    ...req.body,
    updated: new Date().toISOString(),
  };
  store.projects[idx] = updated;
  persistStore();
  res.json(updated);
});

// Delete project
pbRouter.delete('/collections/projects/records/:id', (req, res) => {
  store.projects = store.projects.filter(p => p.id !== req.params.id);
  persistStore();
  res.status(204).end();
});

// Mount PB router on both /api and /pb/api
app.use('/api', pbRouter);
app.use('/pb/api', pbRouter);

// Static frontend serving
const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Fallback for HTML5 navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KoduDisain server running on http://0.0.0.0:${PORT}`);
});
