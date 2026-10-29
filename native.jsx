// native.jsx — the seam between the web app and the Android app.
//
// Exactly one copy of the app exists. On a phone it runs inside Capacitor
// and these functions reach the real camera, the real vibration motor and
// the real Google sign-in; in a browser each one falls back to what the
// web can do. Nothing above this file asks which it is running on.

const CAP = () => (typeof window !== 'undefined' ? window.Cap : null);

function isNative() {
  const c = CAP();
  return !!(c && c.Capacitor && c.Capacitor.isNativePlatform());
}

function nativePlugin(name) {
  const C = window.Capacitor;
  return C && C.Plugins ? C.Plugins[name] : null;
}

// ── touch ─────────────────────────────────────────────────────
// A short tick on anything that changed something. On the web this is
// navigator.vibrate, which most desktop browsers ignore — as they should.
function hapticTap() {
  const c = CAP();
  if (isNative() && c.Haptics) { c.Haptics.impact({ style: c.ImpactStyle.Light }).catch(() => {}); return; }
  try { navigator.vibrate && navigator.vibrate(10); } catch {}
}

function hapticDone() {
  const c = CAP();
  if (isNative() && c.Haptics) { c.Haptics.notification({ type: c.NotificationType.Success }).catch(() => {}); return; }
  try { navigator.vibrate && navigator.vibrate([12, 40, 12]); } catch {}
}

function hapticWarn() {
  const c = CAP();
  if (isNative() && c.Haptics) { c.Haptics.notification({ type: c.NotificationType.Warning }).catch(() => {}); return; }
  try { navigator.vibrate && navigator.vibrate([20, 60, 20]); } catch {}
}

// ── photographs ───────────────────────────────────────────────
// Returns a data URL, or null if the person backed out. `source` is
// 'camera' or 'library'. On the web this is a file input, which is what
// PhotoStage falls back to on its own.
async function pickPhotoNative(source) {
  const c = CAP();
  if (!isNative() || !c.Camera) return null;
  try {
    const shot = await c.Camera.getPhoto({
      source: source === 'camera' ? c.CameraSource.Camera : c.CameraSource.Photos,
      resultType: c.CameraResultType.DataUrl,
      quality: 90,
      width: 1600,
      correctOrientation: true,
      allowEditing: false,
      promptLabelHeader: 'תמונה',
      promptLabelCancel: 'ביטול',
      promptLabelPhoto: 'מהגלריה',
      promptLabelPicture: 'צילום',
    });
    return shot && shot.dataUrl ? shot.dataUrl : null;
  } catch (err) {
    // Backing out of the camera throws; that is not a fault worth logging.
    const msg = String((err && err.message) || err);
    if (!/cancel/i.test(msg) && typeof reportError === 'function') reportError('camera', err);
    return null;
  }
}

// ── signing in ────────────────────────────────────────────────
// Google refuses OAuth inside an embedded browser, so the popup the web
// uses cannot work in the app. The native plugin runs the real Google
// sheet and hands back a credential, which Firebase then accepts.
async function signInWithGoogleNative() {
  const plugin = nativePlugin('FirebaseAuthentication');
  if (!plugin) {
    throw new Error('native-sign-in-missing: the FirebaseAuthentication plugin is not registered');
  }
  // Android's Credential Manager answers "No credentials available" on
  // plenty of ordinary phones — a device with no Google account picker it
  // is willing to use, a work profile, a ROM without the newer services.
  // The older account chooser still works there, so it is the fallback.
  let res;
  try {
    res = await plugin.signInWithGoogle({ scopes: ['email', 'profile'] });
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (!/no credential|credential manager|GetCredential/i.test(msg)) throw err;
    res = await plugin.signInWithGoogle({ scopes: ['email', 'profile'], useCredentialManager: false });
  }
  if (!res || !res.credential) {
    // Almost always skipNativeAuth being off: the plugin then signs in on
    // the native layer and keeps the credential, and there is nothing to
    // hand the JavaScript SDK.
    throw new Error('no-credential: Google returned no credential to pass on'
      + (res && res.user ? ' (a native session was created instead)' : ''));
  }
  const idToken = res.credential.idToken;
  if (!idToken) throw new Error('no-id-token: the credential carried no ID token');
  const cred = firebase.auth.GoogleAuthProvider.credential(idToken);
  return firebase.auth().signInWithCredential(cred);
}

// ── the frame around the app ──────────────────────────────────
// Keeps the system bars in step with the theme, so the top of the screen
// is never a white strip above a dark app.
async function paintSystemBars(dark) {
  const c = CAP();
  if (!isNative() || !c.StatusBar) return;
  try {
    // The app must sit below the status bar, not behind it. Drawing behind
    // it puts the title under the clock and the tab bar under the phone's
    // own navigation, which is what "covered edge to edge" looks like.
    await c.StatusBar.setOverlaysWebView({ overlay: false });
    await c.StatusBar.setStyle({ style: dark ? c.Style.Dark : c.Style.Light });
    await c.StatusBar.setBackgroundColor({ color: dark ? '#191218' : '#fbeef2' });
  } catch {}
}

let navWired = false;

// Called once, after React has put something on the screen.
function startNative() {
  const c = CAP();
  if (!isNative()) return;

  if (c.SplashScreen) c.SplashScreen.hide().catch(() => {});

  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.getAttribute('data-theme')
        && window.matchMedia('(prefers-color-scheme: dark)').matches);
  paintSystemBars(dark);

  if (!navWired && c.App) {
    navWired = true;
    // The app already mirrors every overlay into the history stack, so the
    // system back gesture pops one layer. At the root it leaves.
    c.App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else c.App.exitApp();
    });
  }
}

// ── sending a recipe somewhere else ───────────────────────────
// The phone's own share sheet: WhatsApp, messages, mail, whatever is
// installed. Resolves to 'shared', 'copied' (no share sheet, so the text
// went to the clipboard) or 'cancelled'.
async function shareText(title, text) {
  const c = CAP();
  try {
    if (isNative() && c.Share) {
      await c.Share.share({ title, text, dialogTitle: 'שליחת המתכון' });
      return 'shared';
    }
    if (navigator.share) { await navigator.share({ title, text }); return 'shared'; }
  } catch (e) {
    // Backing out of the share sheet is not a failure.
    if (/cancel|abort/i.test(String(e && (e.name || e.message)))) return 'cancelled';
    throw e;
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

// An image, from a data URL. On the phone it is written to the app's cache
// and handed to the share sheet as a file; in a browser it is shared as a
// file where that is possible and downloaded where it is not.
async function shareImage(dataUrl, fileName, title) {
  const c = CAP();
  const base64 = String(dataUrl).split(',')[1] || '';
  try {
    if (isNative() && c.Share && c.Filesystem) {
      const out = await c.Filesystem.writeFile({ path: fileName, data: base64, directory: c.Directory.Cache });
      await c.Share.share({ title, files: [out.uri], dialogTitle: 'שליחת המתכון' });
      return 'shared';
    }
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return 'shared';
    }
    const a = document.createElement('a');
    a.href = dataUrl; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    return 'downloaded';
  } catch (e) {
    if (/cancel|abort/i.test(String(e && (e.name || e.message)))) return 'cancelled';
    throw e;
  }
}

Object.assign(window, {
  isNative, hapticTap, hapticDone, hapticWarn,
  pickPhotoNative, signInWithGoogleNative, paintSystemBars, startNative,
  shareText, shareImage,
});
