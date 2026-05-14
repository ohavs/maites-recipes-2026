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

const _db = firebase.firestore();

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
async function db_loadRecipes() {
  const snap = await _db.collection('recipes').orderBy('createdAt', 'desc').get();
  if (snap.empty) return null;
  return snap.docs.map(doc => {
    const d = doc.data();
    // Convert Firestore Timestamps to plain values
    return { ...d, id: doc.id };
  });
}

async function db_saveRecipe(recipe) {
  const { id, ...data } = recipe;
  await _db.collection('recipes').doc(id).set({
    ...data,
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

Object.assign(window, {
  db_loadRecipes,
  db_saveRecipe,
  db_deleteRecipe,
  db_seedRecipes,
  db_loadCategories,
  db_saveCategories,
  compressDataUrl,
});
