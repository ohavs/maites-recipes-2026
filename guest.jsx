// guest.jsx — the app without an account.
//
// Signing in is no longer the door you have to walk through to see the
// kitchen. Without an account the app keeps a notebook on this device
// alone: recipes are written to local storage and never reach Firestore,
// which would refuse them anyway.
//
// The two notebooks never mix. Nothing written here can touch, overwrite
// or delete what is in the account, and signing in never quietly swallows
// what was written here — it offers to upload it, and waits to be asked.

const GUEST_KEY = 'maites.guest.recipes';

function guestRead() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function guestWrite(recipes) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(recipes || []));
    return true;
  } catch (err) {
    // Out of room, or storage blocked. The caller has to know: a save that
    // silently did nothing is the one thing this app must never do.
    if (typeof reportError === 'function') reportError('guest-save', err);
    return false;
  }
}

function guestSave(recipe) {
  const all = guestRead();
  const i = all.findIndex(r => r.id === recipe.id);
  const now = Date.now();
  const row = { ...recipe, updatedAt: now, createdAt: recipe.createdAt || now };
  if (i >= 0) all[i] = { ...all[i], ...row };
  else all.unshift(row);
  return guestWrite(all);
}

function guestDelete(id) {
  return guestWrite(guestRead().filter(r => r.id !== id));
}

function guestCount() {
  return guestRead().length;
}

function guestClear() {
  try { localStorage.removeItem(GUEST_KEY); } catch {}
}

// Copies the on-device notebook into the signed-in account. Only ever
// adds: a recipe whose id already exists in the account is left alone,
// because the account's copy is the one with history behind it.
async function guestUpload(userId, existingIds) {
  const mine = guestRead();
  const have = new Set(existingIds || []);
  const fresh = mine.filter(r => !have.has(r.id));
  let done = 0;
  for (const r of fresh) {
    await db_saveRecipe({ ...r, userId });
    done++;
  }
  return { uploaded: done, skipped: mine.length - fresh.length };
}

Object.assign(window, {
  guestRead, guestWrite, guestSave, guestDelete, guestCount, guestClear, guestUpload,
});
