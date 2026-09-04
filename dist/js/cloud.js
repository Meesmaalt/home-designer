/**
 * Projektide pilvesalvestus + jagamine (PocketBase projects)
 */
import { getPb, isLoggedIn, currentUser } from './auth.js';

function token() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function listMyProjects() {
  if (!isLoggedIn()) return [];
  const uid = currentUser().id;
  return getPb().collection('projects').getFullList({
    filter: `owner = "${uid}"`,
    sort: '-updated',
  });
}

export async function saveProject(payload, existingId = null) {
  if (!isLoggedIn()) throw new Error('Logi sisse');
  const uid = currentUser().id;
  const body = {
    name: payload.name || 'Projekt',
    owner: uid,
    data: payload,
    notes: payload.notes || '',
  };
  if (existingId) {
    return getPb().collection('projects').update(existingId, body);
  }
  body.share_token = token();
  body.is_public = false;
  return getPb().collection('projects').create(body);
}

export async function loadProject(id) {
  return getPb().collection('projects').getOne(id);
}

export async function deleteProject(id) {
  return getPb().collection('projects').delete(id);
}

export async function setShare(id, enabled) {
  const rec = await getPb().collection('projects').getOne(id);
  const share_token = rec.share_token || token();
  return getPb().collection('projects').update(id, {
    is_public: !!enabled,
    share_token,
  });
}

export async function loadByShareToken(tok) {
  // Public list may include is_public; token filter on view
  const pb = getPb();
  const list = await pb.collection('projects').getList(1, 1, {
    filter: `share_token = "${tok}" && is_public = true`,
  });
  if (list.items.length) return list.items[0];
  // try direct if rule allows query token
  try {
    return await pb.collection('projects').getFirstListItem(`share_token = "${tok}"`, {
      // some PB versions need auth or public
    });
  } catch {
    throw new Error('Jagatud projekti ei leitud');
  }
}

export function shareUrl(rec) {
  if (!rec?.share_token) return '';
  const u = new URL(location.href);
  u.searchParams.set('share', rec.share_token);
  return u.toString();
}
