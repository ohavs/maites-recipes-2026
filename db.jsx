// db.jsx — Firebase Firestore database layer + image compression bridge

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyC2cVL1eu6sFRxF5yMIlwmq3WvaLB5NhPQ',
  authDomain:        'bookingapp124.firebaseapp.com',
  projectId:         'bookingapp124',
  storageBucket:     'bookingapp124.firebasestorage.app',
  messagingSenderId: '644282157431',
  appId:             '1:644282157431:web:7dc04bd6e2252417b97972',
};

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const _db   = firebase.firestore();
const _auth = firebase.auth();

// Offline-first: writes are kept locally and replayed when the connection
// comes back, and the last-known data is readable with no network at all.
// (Fails harmlessly when several tabs are open, or in private mode.)
_db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err && err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
    if (typeof reportError === 'function') reportError('persistence', err);
  }
});

// Every write goes through here, so the UI can always say what happened.
const track = (label, promise) =>
  (typeof saveTracker !== 'undefined' ? saveTracker.track(label, promise) : promise);

// ── Auth ──────────────────────────────────────────────────────
async function auth_signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return _auth.signInWithPopup(provider);
}

function auth_signOut() {
  return _auth.signOut();
}

function auth_onAuthStateChanged(cb) {
  return _auth.onAuthStateChanged(cb);
}

// Claim all recipes that have no userId — one-time migration per user.
async function db_claimUnownedRecipes(userId) {
  const snap = await _db.collection('recipes').get();
  const unowned = snap.docs.filter(d => !d.data().userId);
  if (!unowned.length) return 0;
  const batch = _db.batch();
  unowned.forEach(d => batch.update(d.ref, {
    userId,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }));
  await batch.commit();
  return unowned.length;
}

async function db_hasUnownedRecipes() {
  const snap = await _db.collection('recipes').get();
  return snap.docs.some(d => !d.data().userId);
}

// ── Image compression ─────────────────────────────────────────
// Re-compresses a base64 data URL to WebP. Skips if already small.
// image-slot.js already compresses to max 1200px @ q=0.85.
// We re-compress large ones further for Firestore storage.
async function compressDataUrl(dataUrl, maxPx = 1000, quality = 0.65) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  if (dataUrl.length < 200000) return dataUrl; // ~150KB — already small enough
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || maxPx, h = img.naturalHeight || maxPx;
      if (w > maxPx || h > maxPx) {
        if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ── Image slot bridge ─────────────────────────────────────────
// Hooks into image-slot.js so images persist to Firestore.
// image-slot.js checks window.__imageSlotBridge before falling
// back to omelette/fetch.
// Resolves once Firebase has decided whether somebody is signed in. Reads
// must wait for it: the security rules reject anonymous requests, and a
// rejected read used to be cached as "this user has no photos".
let _authReadyPromise = null;
function authReady() {
  if (_authReadyPromise) return _authReadyPromise;
  _authReadyPromise = new Promise((resolve) => {
    let done = false;
    const finish = (u) => { if (!done) { done = true; resolve(u || null); } };
    const unsub = _auth.onAuthStateChanged((u) => { try { unsub(); } catch {} finish(u); });
    setTimeout(() => finish(_auth.currentUser), 10000);
  });
  return _authReadyPromise;
}

(function initImageBridge() {
  // Read the photo store lazily, after sign-in, with a couple of retries —
  // a transient failure must not become a permanent "no photos".
  let slotsPromise = null;

  async function fetchSlots(attempt = 0) {
    try {
      await authReady();
      const snap = await _db.collection('image_slots').get();
      const result = {};
      snap.forEach(doc => { result[doc.id] = doc.data(); });
      return result;
    } catch (err) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
        return fetchSlots(attempt + 1);
      }
      if (typeof reportError === 'function') reportError('load-images', err);
      slotsPromise = null;      // let a later attempt try again
      return {};
    }
  }

  const loadSlots = () => {
    if (!slotsPromise) slotsPromise = fetchSlots();
    return slotsPromise;
  };

  // Re-reads the store and merges what comes back into the live one. Used
  // after sign-in, so photos still arrive even if the first read was too
  // early or failed.
  window.db_refreshImageSlots = async () => {
    slotsPromise = null;
    const fresh = await loadSlots();
    if (fresh && Object.keys(fresh).length && window.__mergeImageSlots) {
      window.__mergeImageSlots(fresh);
    }
    return fresh;
  };

  window.__imageSlotBridge = {
    load: loadSlots,

    save: async (slotsObj) => {
      if (!slotsObj || typeof slotsObj !== 'object') return;
      try {
        const batch = _db.batch();
        for (const [id, val] of Object.entries(slotsObj)) {
          const ref = _db.collection('image_slots').doc(id);
          if (!val || !val.u) {
            batch.delete(ref);
          } else {
            const compressed = await compressDataUrl(val.u);
            // Extract recipeId from slotId (format: "recipeId-slotName")
            const lastDash = id.lastIndexOf('-');
            const recipeId = lastDash > 0 ? id.slice(0, lastDash) : id;
            batch.set(ref, {
              u: compressed,
              s: val.s || 1,
              x: val.x || 0,
              y: val.y || 0,
              recipeId,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        await batch.commit();
      } catch (e) {
        if (typeof reportError === 'function') reportError('save-image', e);
        else console.warn('image_slots save failed:', e);
      }
    },
  };
})();

// ── Recipe CRUD ───────────────────────────────────────────────
// Live view of the recipes. The first callback fires immediately from the
// local cache (so the list is there with no connection), and again whenever
// the server or another device changes something. Writes made offline show
// up straight away and are replayed on reconnect.
function db_watchRecipes(userId, sharedOwnerUids = [], onData, onError) {
  const allUids = [...new Set([userId, ...sharedOwnerUids].filter(Boolean))];
  const byUid = new Map();
  const meta = new Map();

  const emit = () => {
    const seen = new Set();
    const all = [];
    for (const uid of allUids) {
      for (const doc of (byUid.get(uid) || [])) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        all.push(doc);
      }
    }
    all.sort((a, b) => {
      const at = a.createdAt?.seconds ?? (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0);
      const bt = b.createdAt?.seconds ?? (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0);
      return bt - at;
    });
    const states = [...meta.values()];
    onData(all, {
      fromCache: states.some(m => m.fromCache),
      hasPendingWrites: states.some(m => m.hasPendingWrites),
      ready: byUid.size === allUids.length,
    });
  };

  const unsubs = allUids.map(uid =>
    _db.collection('recipes').where('userId', '==', uid)
      .onSnapshot({ includeMetadataChanges: true },
        (snap) => {
          byUid.set(uid, snap.docs.map(d => ({ ...d.data(), id: d.id })));
          meta.set(uid, { fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites });
          emit();
        },
        (err) => { if (onError) onError(err); })
  );
  return () => unsubs.forEach(u => { try { u(); } catch {} });
}

async function db_loadRecipes(userId, sharedOwnerUids = []) {
  const allUids = [...new Set([userId, ...sharedOwnerUids].filter(Boolean))];
  const snapshots = await Promise.all(
    allUids.map(uid => _db.collection('recipes').where('userId', '==', uid).get())
  );
  const seen = new Set();
  const allDocs = [];
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        allDocs.push({ ...doc.data(), id: doc.id });
      }
    }
  }
  return allDocs.sort((a, b) => {
    const at = a.createdAt?.seconds ?? (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0);
    const bt = b.createdAt?.seconds ?? (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0);
    return bt - at;
  });
}

async function db_saveRecipe(recipe) {
  const { id, _catInfo, _shareId, _sharedBy, _sharedByEmail, ...data } = recipe;
  const uid = _auth.currentUser?.uid;
  return track('save-recipe', _db.collection('recipes').doc(id).set({
    ...data,
    ...(uid && !data.userId ? { userId: uid } : {}),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }));
}

async function db_deleteRecipe(id) {
  await track('delete-recipe', _db.collection('recipes').doc(id).delete());
  // Clean up orphaned image slots
  const slotsSnap = await _db.collection('image_slots')
    .where('recipeId', '==', id)
    .get()
    .catch(() => null);
  if (slotsSnap && !slotsSnap.empty) {
    const batch = _db.batch();
    slotsSnap.forEach(doc => batch.delete(doc.ref));
    await batch.commit().catch(() => {});
  }
}

async function db_deleteImageSlot(slotId) {
  await _db.collection('image_slots').doc(slotId).delete()
    .catch(e => console.warn('deleteImageSlot:', e));
}

async function db_seedRecipes(recipes) {
  const now = Date.now();
  const batch = _db.batch();
  recipes.forEach((r, idx) => {
    // Space seeds 1 minute apart so ordering by createdAt preserves original order
    const ms = now - (recipes.length - 1 - idx) * 60000;
    batch.set(_db.collection('recipes').doc(r.id), {
      ...r,
      createdAt: firebase.firestore.Timestamp.fromMillis(ms),
      updatedAt: firebase.firestore.Timestamp.fromMillis(ms),
    });
  });
  await batch.commit();
}

// ── Category CRUD ─────────────────────────────────────────────
async function db_loadCategories() {
  // Offline this resolves from the local cache; only a cold cache fails,
  // and the caller falls back to the copy in localStorage.
  const snap = await _db.collection('categories').orderBy('order', 'asc').get();
  if (snap.empty) return null;
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

async function db_saveCategories(cats) {
  const existing = await _db.collection('categories').get();
  const batch = _db.batch();
  existing.forEach(doc => batch.delete(doc.ref));
  cats.forEach((cat, idx) => {
    batch.set(_db.collection('categories').doc(cat.id), { ...cat, order: idx });
  });
  return track('save-categories', batch.commit());
}

// Error log copy in the cloud — best effort, never blocks anything.
async function db_logError(entry) {
  const uid = _auth.currentUser?.uid || null;
  return _db.collection('error_logs').add({
    ...entry, uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {});
}

// ── Sharing ────────────────────────────────────────────────
async function db_createInvite(ownerUid, ownerEmail, ownerDisplayName, guestEmail, mutual = false) {
  const safe = guestEmail.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  const id = ownerUid + '_' + safe;
  await _db.collection('invites').doc(id).set({
    ownerUid,
    ownerEmail,
    ownerDisplayName: ownerDisplayName || ownerEmail,
    guestEmail: guestEmail.toLowerCase().trim(),
    mutual: !!mutual,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return id;
}

async function db_cancelInvite(inviteId) {
  await _db.collection('invites').doc(inviteId).delete();
}

async function db_getMyInvites(ownerUid) {
  const snap = await _db.collection('invites').where('ownerUid', '==', ownerUid).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function db_checkAndAcceptInvites(guestUid, guestEmail) {
  const snap = await _db.collection('invites')
    .where('guestEmail', '==', guestEmail.toLowerCase().trim())
    .get();
  if (snap.empty) return [];
  const accepted = [];
  const batch = _db.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    const shareRef = _db.collection('shares').doc(data.ownerUid + '_' + guestUid);
    batch.set(shareRef, {
      ownerUid: data.ownerUid,
      ownerEmail: data.ownerEmail,
      ownerDisplayName: data.ownerDisplayName || data.ownerEmail,
      guestUid,
      guestEmail,
      mutual: !!data.mutual,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    if (data.mutual) {
      const reverseRef = _db.collection('shares').doc(guestUid + '_' + data.ownerUid);
      batch.set(reverseRef, {
        ownerUid: guestUid,
        ownerEmail: guestEmail,
        ownerDisplayName: guestEmail,
        guestUid: data.ownerUid,
        guestEmail: data.ownerEmail,
        mutual: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    batch.delete(doc.ref);
    accepted.push(data);
  }
  await batch.commit();
  return accepted;
}

async function db_getMyShares(uid) {
  const [ownerSnap, guestSnap] = await Promise.all([
    _db.collection('shares').where('ownerUid', '==', uid).get(),
    _db.collection('shares').where('guestUid', '==', uid).get(),
  ]);
  return {
    asOwner: ownerSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    asGuest: guestSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  };
}

async function db_revokeShare(shareId) {
  await _db.collection('shares').doc(shareId).delete();
}

// ── Per-recipe sharing ────────────────────────────────────
async function db_shareRecipeWith(fromUser, toEmail, recipe) {
  const { id, _catInfo, ...data } = recipe;
  const ref = _db.collection('recipe_shares').doc();
  await ref.set({
    fromUid: fromUser.uid,
    fromEmail: fromUser.email,
    fromDisplayName: fromUser.displayName || fromUser.email,
    toEmail: toEmail.toLowerCase().trim(),
    recipeId: id,
    recipe: { ...data, id },
    sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function db_getSharedWithMe(myEmail) {
  const snap = await _db.collection('recipe_shares')
    .where('toEmail', '==', myEmail.toLowerCase().trim())
    .get();
  return snap.docs.map(d => ({
    ...d.data().recipe,
    _shareId: d.id,
    _sharedBy: d.data().fromDisplayName || d.data().fromEmail,
    _sharedByEmail: d.data().fromEmail,
  }));
}

async function db_removeSharedRecipe(shareId) {
  await _db.collection('recipe_shares').doc(shareId).delete();
}

// ── Full backup ───────────────────────────────────────────────
// Everything here reads from the server, never from the local cache: a
// backup that quietly copies a stale cache is worse than no backup.
// Nothing in this section deletes or overwrites anything.

const BACKUP_FORMAT  = 'maites-backup';
const BACKUP_VERSION = 1;

async function _getAll(name, source = 'server') {
  const snap = await _db.collection(name).get({ source });
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

// Reads every collection this account can see and returns one plain object.
// `onStep` is called with a Hebrew label so the panel can say where it is.
async function db_exportSnapshot(user, onStep = () => {}) {
  const step = async (label, fn) => { onStep(label); return fn(); };

  const recipes    = await step('מתכונים',  () => _getAll('recipes'));
  const imageSlots = await step('תמונות',   () => _getAll('image_slots'));
  const categories = await step('קטגוריות', () => _getAll('categories').catch(() => []));
  const invites    = await step('שיתופים',  () => _getAll('invites').catch(() => []));
  const shares     = await step('שיתופים',  () => _getAll('shares').catch(() => []));
  const recipeShares = await step('שיתופים', () => _getAll('recipe_shares').catch(() => []));

  onStep('אורז');
  const slotMap = {};
  let photoBytes = 0;
  for (const s of imageSlots) {
    const { id, ...rest } = s;
    slotMap[id] = rest;
    if (rest.u) photoBytes += rest.u.length;
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: { uid: user?.uid || null, email: user?.email || null },
    counts: {
      recipes: recipes.length,
      imageSlots: imageSlots.length,
      photos: Object.values(slotMap).filter(v => v && v.u).length,
      categories: categories.length,
      photoBytes,
    },
    recipes,
    imageSlots: slotMap,
    categories,
    invites,
    shares,
    recipeShares,
  };
}

// Compares a backup file against what is live right now. Reads only.
async function db_inspectAgainstLive(backup) {
  const liveRecipes = await _getAll('recipes').catch(() => null);
  const liveSlots   = await _getAll('image_slots').catch(() => null);
  if (!liveRecipes || !liveSlots) return { offline: true };

  const liveRecipeIds = new Set(liveRecipes.map(r => r.id));
  const liveSlotIds   = new Set(liveSlots.map(s => s.id));
  const livePhotoIds  = new Set(liveSlots.filter(s => s.u).map(s => s.id));

  const backupRecipes = backup.recipes || [];
  const backupSlots   = backup.imageSlots || {};

  const missingRecipes = backupRecipes.filter(r => !liveRecipeIds.has(r.id));
  const missingPhotos  = Object.keys(backupSlots)
    .filter(id => backupSlots[id] && backupSlots[id].u)
    .filter(id => !livePhotoIds.has(id));

  return {
    offline: false,
    live:    { recipes: liveRecipes.length, photos: livePhotoIds.size },
    backup:  { recipes: backupRecipes.length, photos: Object.values(backupSlots).filter(v => v && v.u).length },
    missingRecipes,
    missingPhotos,
    newerLive: backupRecipes.length < liveRecipeIds.size,
    liveSlotIds,
  };
}

// Writes back only what is genuinely absent. Never touches a document that
// already exists, so running it twice changes nothing the second time.
async function db_restoreMissing(backup, onStep = () => {}) {
  const report = await db_inspectAgainstLive(backup);
  if (report.offline) throw new Error('אין חיבור לשרת');

  let recipesWritten = 0;
  let photosWritten  = 0;

  if (report.missingRecipes.length) {
    onStep('מחזיר מתכונים');
    const batch = _db.batch();
    for (const r of report.missingRecipes) {
      const { id, ...data } = r;
      batch.set(_db.collection('recipes').doc(id), data);
      recipesWritten++;
    }
    await batch.commit();
  }

  if (report.missingPhotos.length) {
    onStep('מחזיר תמונות');
    // Photos are heavy — commit them a few at a time.
    const ids = report.missingPhotos;
    for (let i = 0; i < ids.length; i += 4) {
      const batch = _db.batch();
      for (const id of ids.slice(i, i + 4)) {
        batch.set(_db.collection('image_slots').doc(id), backup.imageSlots[id]);
        photosWritten++;
      }
      await batch.commit();
    }
  }

  return { recipesWritten, photosWritten };
}

Object.assign(window, {
  auth_signInWithGoogle, auth_signOut, auth_onAuthStateChanged,
  db_loadRecipes, db_watchRecipes, db_saveRecipe, db_deleteRecipe, db_deleteImageSlot, db_logError,
  db_seedRecipes, db_loadCategories, db_saveCategories,
  db_claimUnownedRecipes, db_hasUnownedRecipes,
  db_createInvite, db_cancelInvite, db_getMyInvites, authReady,
  db_checkAndAcceptInvites, db_getMyShares, db_revokeShare,
  db_shareRecipeWith, db_getSharedWithMe, db_removeSharedRecipe,
  compressDataUrl,
  db_exportSnapshot, db_inspectAgainstLive, db_restoreMissing,
});
