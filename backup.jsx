// backup.jsx — a full copy of everything, in one file, in your hands.
//
// The rule this module exists to serve: no step of any migration may ever
// cost a recipe or a photo. Before anything moves, you hold the whole thing
// as a file. And if something ever does go missing, the restore here puts
// back only what is absent — it never overwrites what is live.

const { useState: bkS, useRef: bkR } = React;

function formatBytes(n) {
  if (!n) return '0';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

function backupFileName() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `maites-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        if (data.format !== 'maites-backup') throw new Error('זה לא קובץ גיבוי של Maites');
        resolve(data);
      } catch (e) { reject(e); }
    };
    fr.onerror = () => reject(new Error('לא הצלחתי לקרוא את הקובץ'));
    fr.readAsText(file);
  });
}

// Remembers when the last backup was taken, so the panel can nudge.
const BACKUP_STAMP_KEY = 'maites.lastBackup';
function readBackupStamp() {
  try { return JSON.parse(localStorage.getItem(BACKUP_STAMP_KEY) || 'null'); } catch { return null; }
}
function writeBackupStamp(info) {
  try { localStorage.setItem(BACKUP_STAMP_KEY, JSON.stringify(info)); } catch {}
}

function BackupBlock({ user }) {
  const [busy, setBusy]     = bkS('');          // '' | 'export' | 'check' | 'restore'
  const [step, setStep]     = bkS('');
  const [stamp, setStamp]   = bkS(readBackupStamp);
  const [err, setErr]       = bkS('');
  const [file, setFile]     = bkS(null);        // a loaded backup, awaiting action
  const [report, setReport] = bkS(null);
  const [done, setDone]     = bkS('');
  const inputRef            = bkR(null);

  const runExport = async () => {
    setBusy('export'); setErr(''); setDone('');
    try {
      const snap = await db_exportSnapshot(user, setStep);
      const text = JSON.stringify(snap);
      saveBlob(backupFileName(), new Blob([text], { type: 'application/json' }));
      const info = {
        at: new Date().toISOString(),
        recipes: snap.counts.recipes,
        photos: snap.counts.photos,
        bytes: text.length,
      };
      writeBackupStamp(info); setStamp(info);
      setDone(`נשמרו ${info.recipes} מתכונים ו־${info.photos} תמונות · ${formatBytes(info.bytes)}`);
    } catch (e) {
      if (typeof reportError === 'function') reportError('backup-export', e);
      setErr(navigator.onLine === false
        ? 'אין חיבור. גיבוי חייב לקרוא מהשרת, לא מהזיכרון המקומי.'
        : (e.message || 'הגיבוי נכשל'));
    } finally { setBusy(''); setStep(''); }
  };

  const onPick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy('check'); setErr(''); setDone(''); setReport(null); setFile(null);
    try {
      const data = await readBackupFile(f);
      const rep  = await db_inspectAgainstLive(data);
      if (rep.offline) throw new Error('אין חיבור לשרת — אי אפשר להשוות');
      setFile(data); setReport(rep);
    } catch (e2) {
      setErr(e2.message || 'הבדיקה נכשלה');
    } finally { setBusy(''); }
  };

  const runRestore = async () => {
    setBusy('restore'); setErr(''); setDone('');
    try {
      const res = await db_restoreMissing(file, setStep);
      setDone(`הוחזרו ${res.recipesWritten} מתכונים ו־${res.photosWritten} תמונות`);
      setReport(null); setFile(null);
      if (typeof db_refreshImageSlots === 'function') db_refreshImageSlots();
    } catch (e) {
      if (typeof reportError === 'function') reportError('backup-restore', e);
      setErr(e.message || 'השחזור נכשל');
    } finally { setBusy(''); setStep(''); }
  };

  const nothingMissing = report && !report.missingRecipes.length && !report.missingPhotos.length;
  const box = {
    background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)',
    padding: '12px 14px', display: 'grid', gap: 10,
  };

  return (
    <div style={{ marginTop: 4 }}>
      <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>גיבוי</SectionLabel>
      <div style={box}>
        <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 500, lineHeight: 1.55 }}>
          קובץ אחד עם כל המתכונים, כל התמונות והקטגוריות — נקרא מהשרת, לא מהזיכרון
          של הטלפון. שמור אותו אצלך לפני כל שינוי גדול.
        </div>

        {stamp && (
          <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 600 }}>
            הגיבוי האחרון: {new Date(stamp.at).toLocaleString('he-IL')} · {stamp.recipes} מתכונים · {formatBytes(stamp.bytes)}
          </div>
        )}

        <Button tone="glass" full disabled={!!busy} onClick={runExport}>
          {busy === 'export' ? (step ? `מגבה · ${step}…` : 'מגבה…') : '⬇︎ גיבוי מלא לקובץ'}
        </Button>

        <input ref={inputRef} type="file" accept="application/json,.json"
          onChange={onPick} style={{ display: 'none' }} />
        <Button tone="quiet" full disabled={!!busy} onClick={() => inputRef.current && inputRef.current.click()}>
          {busy === 'check' ? 'בודק…' : 'בדיקת קובץ גיבוי'}
        </Button>

        {report && (
          <div style={{
            background: 'var(--surface-raised)', borderRadius: 'var(--r-sm)',
            padding: '11px 13px', display: 'grid', gap: 8,
          }}>
            <div style={{ ...TYPE.caption, color: 'var(--ink)', fontWeight: 700 }}>
              בקובץ: {report.backup.recipes} מתכונים, {report.backup.photos} תמונות<br/>
              באפליקציה עכשיו: {report.live.recipes} מתכונים, {report.live.photos} תמונות
            </div>
            {nothingMissing ? (
              <div style={{ ...TYPE.caption, color: 'var(--success)', fontWeight: 600 }}>
                הכול קיים. אין מה להחזיר ✓
              </div>
            ) : (
              <>
                <div style={{ ...TYPE.caption, color: 'var(--danger)', fontWeight: 700 }}>
                  חסרים כרגע: {report.missingRecipes.length} מתכונים, {report.missingPhotos.length} תמונות
                </div>
                <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 500, lineHeight: 1.5 }}>
                  השחזור מוסיף רק את מה שחסר. שום מתכון ושום תמונה שקיימים עכשיו לא ישתנו.
                </div>
                <Button tone="glass" full disabled={!!busy} onClick={runRestore}>
                  {busy === 'restore' ? (step ? `${step}…` : 'משחזר…') : 'החזרת מה שחסר'}
                </Button>
              </>
            )}
          </div>
        )}

        {done && (
          <div style={{ ...TYPE.caption, color: 'var(--ink)', fontWeight: 700 }}>{done}</div>
        )}
        {err && (
          <div style={{ ...TYPE.caption, color: 'var(--danger)', fontWeight: 700 }}>{err}</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BackupBlock, formatBytes });
