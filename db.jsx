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
(function initImageBridge() {
  // Promise resolving to { slotId: {u, s, x, y}, ... }
  const loadPromise = _db.collection('image_slots').get()
    .then(snap => {
      const result = {};
      snap.forEach(doc => { result[doc.id] = doc.data(); });
      return result;
    })
    .catch(() => ({}));

  window.__imageSlotBridge = {
    load: () => loadPromise,

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
        console.warn('image_slots save failed:', e);
      }
    },
  };
})();

// ── Recipe CRUD ───────────────────────────────────────────────
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
  const { id, ...data } = recipe;
  const uid = _auth.currentUser?.uid;
  await _db.collection('recipes').doc(id).set({
    ...data,
    ...(uid && !data.userId ? { userId: uid } : {}),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function db_deleteRecipe(id) {
  await _db.collection('recipes').doc(id).delete();
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
  await batch.commit();
}

// ── Sharing ────────────────────────────────────────────────
async function db_createInvite(ownerUid, ownerEmail, ownerDisplayName, guestEmail) {
  const safe = guestEmail.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  const id = ownerUid + '_' + safe;
  await _db.collection('invites').doc(id).set({
    ownerUid,
    ownerEmail,
    ownerDisplayName: ownerDisplayName || ownerEmail,
    guestEmail: guestEmail.toLowerCase().trim(),
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
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

Object.assign(window, {
  auth_signInWithGoogle, auth_signOut, auth_onAuthStateChanged,
  db_loadRecipes, db_saveRecipe, db_deleteRecipe, db_deleteImageSlot,
  db_seedRecipes, db_loadCategories, db_saveCategories,
  db_claimUnownedRecipes, db_hasUnownedRecipes,
  db_createInvite, db_cancelInvite, db_getMyInvites,
  db_checkAndAcceptInvites, db_getMyShares, db_revokeShare,
  db_shareRecipeWith, db_getSharedWithMe, db_removeSharedRecipe,
  compressDataUrl,
});
