/**
 * PocketBase auth – sama muster mis õhtu-mängud
 */
import PocketBase from 'https://cdn.jsdelivr.net/npm/pocketbase@0.21.5/+esm';

function resolvePbUrl() {
  const env = (typeof window !== 'undefined' && window.__ENV__) || {};
  if (env.PB_URL) return String(env.PB_URL).replace(/\/$/, '');
  // /pb proksi (nginx)
  if (location.port === '8080' || location.port === '80' || !location.port) {
    // try same-origin /pb first when deployed with proxy
  }
  // Otse: same hostname, port 8090
  const proto = location.protocol === 'https:' ? 'https:' : 'http:';
  if (location.port && location.port !== '80' && location.port !== '443') {
    return `${proto}//${location.hostname}:8090`;
  }
  return `${proto}//${location.hostname}:8090`;
}

export const pb = new PocketBase(resolvePbUrl());
pb.autoCancellation(false);

export function getPb() {
  const url = resolvePbUrl();
  if (pb.baseUrl.replace(/\/$/, '') !== url) pb.baseUrl = url;
  return pb;
}

export function isLoggedIn() {
  return getPb().authStore.isValid;
}

export function currentUser() {
  return getPb().authStore.model;
}

export async function login(email, password) {
  return getPb().collection('users').authWithPassword(email, password);
}

export async function register(email, password, name = '') {
  const data = {
    email,
    password,
    passwordConfirm: password,
    name: name || email.split('@')[0],
  };
  await getPb().collection('users').create(data);
  return login(email, password);
}

export function logout() {
  getPb().authStore.clear();
}

export function onAuthChange(cb) {
  return getPb().authStore.onChange(() => cb(isLoggedIn(), currentUser()));
}

export async function checkHealth() {
  try {
    const r = await fetch(getPb().baseUrl + '/api/health', { cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  }
}
