// updates.jsx — getting the next version without leaving the app.
//
// Maites is not on the Play Store, so nothing updates it on your behalf.
// The releases page is public, which means the app can ask it what the
// newest version is, download that APK, and hand it to Android's
// installer — all from the settings screen, with a progress bar.
//
// Android still asks you to confirm the install. That prompt is not ours
// to skip, and would not be worth skipping if it were.

const RELEASES_API = 'https://api.github.com/repos/ohavs/maites-recipes-2026/releases/latest';

// "1.2.10" beats "1.2.9" — which string comparison gets wrong.
function versionNewer(candidate, current) {
  const parts = (v) => String(v || '0').split('.').map(n => parseInt(n, 10) || 0);
  const a = parts(candidate), b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

async function installedVersion() {
  const c = window.Cap;
  if (!c || !c.App || !isNative()) return null;
  try {
    const info = await c.App.getInfo();
    return { version: info.version, build: info.build };
  } catch { return null; }
}

// What the releases page is offering. Returns null when there is nothing
// newer, so the caller can say "up to date" without special-casing.
async function latestRelease(currentVersion) {
  const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error('release check failed: ' + res.status);
  const j = await res.json();
  const version = String(j.tag_name || '').replace(/^v/, '');
  const apk = (j.assets || []).find(a => /\.apk$/i.test(a.name || ''));
  if (!version || !apk) throw new Error('no APK in the latest release');
  return {
    version,
    notes: j.body || '',
    url: apk.browser_download_url,
    size: apk.size || 0,
    newer: versionNewer(version, currentVersion),
  };
}

// Downloads the APK and opens it. `onProgress` gets 0..1, or null while
// the size is still unknown.
async function downloadAndInstall(rel, onProgress) {
  const c = window.Cap;
  if (!c || !c.Filesystem || !c.FileOpener) throw new Error('updates are only available in the app');

  const name = `maites-${rel.version}.apk`;
  let sub = null;
  if (onProgress) {
    sub = await c.Filesystem.addListener('progress', (p) => {
      const total = p.contentLength || rel.size || 0;
      onProgress(total ? Math.min(1, p.bytes / total) : null);
    });
  }
  try {
    const out = await c.Filesystem.downloadFile({
      url: rel.url,
      path: name,
      directory: c.Directory.Cache,
      progress: !!onProgress,
      // GitHub answers the asset URL with a redirect to its CDN.
      headers: { Accept: 'application/octet-stream' },
    });
    const path = out && (out.path || out.uri);
    if (!path) throw new Error('the download produced no file');
    await c.FileOpener.open({
      filePath: path,
      contentType: 'application/vnd.android.package-archive',
      openWithDefault: true,
    });
    return path;
  } finally {
    if (sub) { try { await sub.remove(); } catch {} }
  }
}

// ───────────────────────────────────────────────────────────
// UpdateBlock — the settings row that does all of the above.
// ───────────────────────────────────────────────────────────
function UpdateBlock() {
  const { useState: uS2, useEffect: uE2 } = React;
  const [here, setHere]   = uS2(null);      // the installed version
  const [rel, setRel]     = uS2(null);      // what is on offer
  const [state, setState] = uS2('idle');    // idle | checking | ready | downloading | opening | error
  const [pct, setPct]     = uS2(null);
  const [err, setErr]     = uS2('');

  uE2(() => { installedVersion().then(setHere); }, []);

  const check = async () => {
    setState('checking'); setErr('');
    try {
      const v = here || await installedVersion();
      if (!here && v) setHere(v);
      const r = await latestRelease(v ? v.version : '0');
      setRel(r);
      setState('ready');
    } catch (e) {
      if (typeof reportError === 'function') reportError('update-check', e);
      setErr(navigator.onLine === false ? 'אין חיבור לאינטרנט' : (e.message || 'הבדיקה נכשלה'));
      setState('error');
    }
  };

  const install = async () => {
    setState('downloading'); setPct(0); setErr('');
    try {
      await downloadAndInstall(rel, setPct);
      setState('opening');
      if (typeof hapticDone === 'function') hapticDone();
    } catch (e) {
      if (typeof reportError === 'function') reportError('update-install', e);
      setErr(e.message || 'ההורדה נכשלה');
      setState('error');
    }
  };

  // In a browser there is nothing to install — the page is already the
  // newest version by the time it has loaded.
  if (typeof isNative === 'function' && !isNative()) return null;

  const mb = (n) => (n / 1024 / 1024).toFixed(1) + 'MB';

  return (
    <div style={{ marginTop: 4 }}>
      <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>עדכונים</SectionLabel>
      <div style={{
        background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)',
        padding: '14px 16px', display: 'grid', gap: 12,
      }}>
        <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 600 }}>
          מותקן: {here ? `${here.version}` : '—'}
          {rel && rel.newer && <> · חדש: <b style={{ color: 'var(--brand-strong)' }}>{rel.version}</b></>}
        </div>

        {state === 'ready' && rel && !rel.newer && (
          <div style={{ ...TYPE.caption, color: 'var(--success)', fontWeight: 700 }}>
            זו הגרסה העדכנית ✓
          </div>
        )}

        {state === 'downloading' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{
              height: 8, borderRadius: 99, background: 'var(--line)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99, background: 'var(--brand-strong)',
                width: pct == null ? '35%' : `${Math.round(pct * 100)}%`,
                transition: 'width .2s linear',
              }}/>
            </div>
            <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 600 }}>
              {pct == null ? 'מוריד…' : `מוריד… ${Math.round(pct * 100)}%`}
              {rel && rel.size ? ` · ${mb(rel.size)}` : ''}
            </div>
          </div>
        )}

        {state === 'opening' && (
          <div style={{ ...TYPE.caption, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.5 }}>
            ההורדה הסתיימה. אנדרואיד מבקש אישור להתקנה — לאשר, והאפליקציה
            תיפתח מחדש בגרסה החדשה. המתכונים לא מושפעים.
          </div>
        )}

        {state !== 'downloading' && state !== 'opening' && (
          rel && rel.newer
            ? <Button tone="primary" size="lg" full onClick={install}>
                התקנת גרסה {rel.version}{rel.size ? ` · ${mb(rel.size)}` : ''}
              </Button>
            : <Button tone="glass" full disabled={state === 'checking'} onClick={check}>
                {state === 'checking' ? 'בודק…' : 'בדיקת עדכונים'}
              </Button>
        )}

        {err && (
          <div style={{ ...TYPE.caption, color: 'var(--danger)', fontWeight: 700 }}>{err}</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  versionNewer, installedVersion, latestRelease, downloadAndInstall, UpdateBlock,
});
