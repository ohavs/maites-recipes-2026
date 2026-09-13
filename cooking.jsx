// cooking.jsx — the two things you do with a recipe in the kitchen:
//   1. scale it to the number of people at the table
//   2. cook it, one step at a time, without the screen going dark

const { useState: cS, useEffect: cE, useRef: cR, useMemo: cM, useCallback: cCB } = React;

// ═══════════════════════════════════════════════════════════
// Quantity scaling
// ═══════════════════════════════════════════════════════════

const VULGAR = { '½': .5, '¼': .25, '¾': .75, '⅓': 1/3, '⅔': 2/3, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875 };

// "2", "1/2", "½", "1.5", "4-5" → number (a range takes its middle).
function parseQtyNumber(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  for (const [g, v] of Object.entries(VULGAR)) {
    if (t.startsWith(g)) return { value: v, rest: t.slice(g.length) };
  }
  // mixed number: "1½" or "1 1/2"
  let m = t.match(/^(\d+)\s*([½¼¾⅓⅔⅛⅜⅝⅞])/);
  if (m) return { value: +m[1] + VULGAR[m[2]], rest: t.slice(m[0].length) };
  m = t.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (m) return { value: +m[1] + (+m[2] / +m[3]), rest: t.slice(m[0].length) };
  m = t.match(/^(\d+)\/(\d+)/);
  if (m) return { value: +m[1] / +m[2], rest: t.slice(m[0].length) };
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/);
  if (m) return { value: (parseFloat(m[1].replace(',', '.')) + parseFloat(m[2].replace(',', '.'))) / 2, rest: t.slice(m[0].length), wasRange: true };
  m = t.match(/^(\d+(?:[.,]\d+)?)/);
  if (m) return { value: parseFloat(m[1].replace(',', '.')), rest: t.slice(m[0].length) };
  return null;
}

// 0.5 → "½", 1.25 → "1¼", 2 → "2", 0.7 → "0.7"
function formatQtyNumber(n) {
  if (!isFinite(n) || n <= 0) return '';
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  const near = Object.entries(VULGAR).find(([, v]) => Math.abs(frac - v) < 0.02);
  if (near) return (whole ? String(whole) : '') + near[0];
  if (Math.abs(frac) < 0.02) return String(whole);
  return String(Math.round(n * 10) / 10);
}

// Scales the numeric part of a quantity string and leaves the units alone.
function scaleQuantity(qty, factor) {
  if (!factor || factor === 1) return qty || '';
  const parsed = parseQtyNumber(qty);
  if (!parsed) return qty || '';
  return (formatQtyNumber(parsed.value * factor) + (parsed.rest || '')).trim();
}

// ───────────────────────────────────────────────────────────
// ServingScaler — "how many are we cooking for?"
// ───────────────────────────────────────────────────────────
function ServingScaler({ base, servings, onChange, palette }) {
  const p = palette;
  const step = (dir) => {
    const next = Math.max(1, Math.min(48, servings + dir));
    onChange(next);
  };
  const factor = base > 0 ? servings / base : 1;
  const changed = Math.abs(factor - 1) > 0.001;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: p.bg2, borderRadius: 'var(--r-md)', padding: '10px 12px',
      color: p.ink,
    }}>
      <span style={{ ...TYPE.caption, fontWeight: 700, flex: 1, minWidth: 0 }}>
        התאמת כמויות
        {changed && (
          <span style={{ color: p.accent, marginInlineStart: 6 }}>
            ×{formatQtyNumber(factor) || factor.toFixed(1)}
          </span>
        )}
      </span>
      {changed && (
        <button type="button" onClick={() => onChange(base)} style={{
          border: 'none', background: 'transparent', color: p.accent, cursor: 'pointer',
          fontFamily: 'inherit', ...TYPE.caption, textDecoration: 'underline', padding: '4px 6px',
        }}>איפוס</button>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--surface-raised)', borderRadius: 'var(--r-pill)', padding: 3,
      }}>
        <button type="button" onClick={() => step(-1)} aria-label="פחות מנות" style={scalerBtn}>−</button>
        <span aria-live="polite" style={{
          minWidth: 42, textAlign: 'center', ...TYPE.small, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
        }}>{servings}</span>
        <button type="button" onClick={() => step(1)} aria-label="עוד מנות" style={scalerBtn}>+</button>
      </div>
    </div>
  );
}

const scalerBtn = {
  width: 34, height: 34, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
  background: 'transparent', color: 'var(--ink)', fontSize: 20, fontWeight: 700,
  fontFamily: 'inherit', display: 'grid', placeItems: 'center', lineHeight: 1,
};

// ═══════════════════════════════════════════════════════════
// Cook mode
// ═══════════════════════════════════════════════════════════

// Finds cooking times inside a step ("20 דקות", "שעה וחצי", "10-12 דק׳").
function parseDurations(text) {
  const out = [];
  const s = String(text || '');
  const push = (mins, label) => {
    if (!mins || mins <= 0 || mins > 1440) return;
    if (out.some(o => o.minutes === mins)) return;
    out.push({ minutes: Math.round(mins), label });
  };

  const hourHalf = /(?:שעה\s+ו?חצי)/g;
  if (hourHalf.test(s)) push(90, 'שעה וחצי');
  const halfHour = /(?:חצי\s+שעה)/g;
  if (halfHour.test(s)) push(30, 'חצי שעה');
  const quarter = /(?:רבע\s+שעה)/g;
  if (quarter.test(s)) push(15, 'רבע שעה');

  const re = /(\d+)(?:\s*[-–]\s*(\d+))?\s*(שעות|שעה|דקות|דקה|דק['׳]?|שניות|שנייה)/g;
  let m;
  while ((m = re.exec(s))) {
    const n = m[2] ? +m[2] : +m[1];           // a range offers the longer time
    const unit = m[3];
    if (/שע/.test(unit)) push(n * 60, `${m[0]}`);
    else if (/שנ/.test(unit)) push(Math.max(1, Math.round(n / 60)), `${m[0]}`);
    else push(n, `${m[0]}`);
  }
  return out.slice(0, 3);
}

// Keeps the screen awake while cooking; releases on unmount or tab switch.
function useWakeLock(active) {
  const lockRef = cR(null);
  cE(() => {
    let cancelled = false;
    const request = async () => {
      if (!active || !('wakeLock' in navigator)) return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) { l.release().catch(() => {}); return; }
        lockRef.current = l;
      } catch { /* denied or unsupported — cooking still works */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (lockRef.current) { lockRef.current.release().catch(() => {}); lockRef.current = null; }
    };
  }, [active]);
}

// A short chime + a buzz when a timer finishes.
function ringAlarm() {
  try { if (navigator.vibrate) navigator.vibrate([220, 120, 220, 120, 320]); } catch {}
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, .28, .56].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i === 2 ? 1046 : 784;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + t); osc.stop(now + t + 0.25);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {}
}

const mmss = (secs) => {
  const s = Math.max(0, Math.round(secs));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

// ───────────────────────────────────────────────────────────
// StepTimer — one countdown, tied to a time found in the text
// ───────────────────────────────────────────────────────────
function StepTimer({ minutes, label, palette, onDone }) {
  const [left, setLeft] = cS(minutes * 60);
  const [running, setRunning] = cS(false);
  const [done, setDone] = cS(false);
  const endRef = cR(0);

  cE(() => {
    if (!running) return;
    endRef.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remain = (endRef.current - Date.now()) / 1000;
      if (remain <= 0) {
        clearInterval(id);
        setLeft(0); setRunning(false); setDone(true);
        ringAlarm();
        if (onDone) onDone(label);
      } else setLeft(remain);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const pct = minutes > 0 ? 1 - left / (minutes * 60) : 0;
  const tone = done ? 'var(--success)' : palette.accent;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--surface-raised)', borderRadius: 'var(--r-md)',
      padding: '10px 12px', boxShadow: 'var(--e1)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
        width: `${Math.min(100, pct * 100)}%`,
        background: done ? 'var(--success-soft)' : `color-mix(in srgb, ${palette.bg} 45%, transparent)`,
        transition: 'width .3s linear',
      }}/>
      <span aria-hidden="true" style={{ fontSize: 17, position: 'relative' }}>{done ? '✅' : '⏱'}</span>
      <span style={{
        ...TYPE.small, fontWeight: 800, color: tone, position: 'relative',
        fontVariantNumeric: 'tabular-nums', minWidth: 56,
      }}>{done ? 'מוכן!' : mmss(left)}</span>
      <span style={{ ...TYPE.caption, color: 'var(--ink-soft)', flex: 1, position: 'relative', fontWeight: 500 }}>
        {label}
      </span>
      {!done && (
        <Button size="sm" tone={running ? 'quiet' : 'primary'} onClick={() => setRunning(r => !r)}
          style={{ position: 'relative', minHeight: 36 }}>
          {running ? 'עצירה' : 'הפעלה'}
        </Button>
      )}
      {(done || (!running && left < minutes * 60)) && (
        <IconButton size="sm" tone="ghost" label="אתחול"
          onClick={() => { setLeft(minutes * 60); setDone(false); setRunning(false); }}
          style={{ position: 'relative' }}>
          <span aria-hidden="true" style={{ fontSize: 15 }}>↺</span>
        </IconButton>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// CookScreen — full-screen, one step at a time.
// ───────────────────────────────────────────────────────────
function CookScreen({ recipe, onClose, servings }) {
  const p = paletteOf(recipe.palette);
  const clean = typeof stripHTML === 'function' ? stripHTML : (x => x);

  const steps = cM(() => {
    const raw = (recipe.steps || []).filter(s => (s.title || '').trim() || (s.body || '').trim());
    const isAuto = raw.length > 0 && raw.every(s => /^שלב\s*\d+$/.test((s.title || '').trim()));
    if (raw.length && !isAuto) {
      return raw.map(s => ({ title: clean(s.title || ''), body: clean(s.body || '') }));
    }
    const text = clean(recipe.instructions || raw.map(s => s.body).filter(Boolean).join('\n') || '');
    const parts = text.split(/\n+/).map(t => t.trim()).filter(Boolean);
    return parts.length ? parts.map(t => ({ title: '', body: t })) : [];
  }, [recipe]);

  const [i, setI] = cS(0);
  const [checked, setChecked] = cS(() => new Set());
  const [showIngredients, setShowIngredients] = cS(false);
  const [alert, setAlert] = cS(null);
  useWakeLock(true);

  const baseServings = Math.max(1, +recipe.servings || 1);
  const factor = servings ? servings / baseServings : 1;

  const step = steps[i];
  const durations = cM(() => (step ? parseDurations(`${step.title} ${step.body}`) : []), [step]);

  const go = (dir) => setI(v => Math.max(0, Math.min(steps.length - 1, v + dir)));
  const touch = cR(null);
  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    go(dx > 0 ? 1 : -1);   // RTL: swipe right → next step
  };

  cE(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(1);
      if (e.key === 'ArrowRight') go(-1);
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [steps.length]);

  if (!steps.length) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 30, display: 'grid', placeItems: 'center', padding: 24 }}>
        <div>
          <EmptyState emoji="📝" title="אין הוראות הכנה למתכון הזה"
            text="אפשר להוסיף שלבים דרך עריכת המתכון, ואז לבשל צעד־צעד."
            cta={{ label: 'סגירה', onClick: onClose }}/>
        </div>
      </div>
    );
  }

  const ings = (recipe.ingredients || []).filter(x => (x.name || '').trim());
  const progress = (i + 1) / steps.length;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* header */}
      <div style={{ background: p.bg, color: p.ink, padding: '14px 16px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconButton label="סיום בישול" tone="glass" size="lg" onClick={onClose}>
            <IconClose size={18} strokeWidth={2.4}/>
          </IconButton>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...TYPE.caption, opacity: .75 }}>מצב בישול</div>
            <div style={{
              ...TYPE.heading, color: p.ink,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{recipe.title}</div>
          </div>
          <Button size="sm" tone="glass" onClick={() => setShowIngredients(true)}>
            🧺 מצרכים
          </Button>
        </div>

        {/* progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <div style={{
            flex: 1, height: 6, borderRadius: 'var(--r-pill)',
            background: 'rgba(255,255,255,.35)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${progress * 100}%`, background: p.accent,
              borderRadius: 'var(--r-pill)', transition: 'width var(--dur)',
            }}/>
          </div>
          <span style={{ ...TYPE.caption, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {i + 1}/{steps.length}
          </span>
        </div>
      </div>

      {/* the step */}
      <div className="scroll-y" style={{ flex: 1, padding: '26px 20px 20px' }}>
        <div key={i} style={{ animation: 'stepIn var(--dur) var(--ease-out)' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 'var(--r-pill)', background: p.bg, color: p.ink,
            display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20,
            marginBottom: 16, boxShadow: 'var(--e1)',
          }}>{i + 1}</div>

          {step.title && !/^שלב\s*\d+$/.test(step.title.trim()) && (
            <h2 style={{ margin: '0 0 10px', ...TYPE.title, color: 'var(--ink)' }}>{step.title}</h2>
          )}
          <p style={{
            margin: 0, fontSize: 20, lineHeight: 1.75, color: 'var(--ink)',
            whiteSpace: 'pre-line', fontWeight: 400,
          }}>{step.body}</p>

          {durations.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginTop: 20 }}>
              {durations.map((d, k) => (
                <StepTimer key={`${i}-${k}`} minutes={d.minutes} label={d.label} palette={p}
                  onDone={(lbl) => setAlert(`הטיימר (${lbl}) הסתיים`)}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* step navigation */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 10, padding: '12px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--line)', background: 'var(--glass)', backdropFilter: 'blur(16px)',
      }}>
        <Button tone="quiet" disabled={i === 0} onClick={() => go(-1)} style={{ flex: 1 }}>
          <IconForward size={16} strokeWidth={2.4}/> הקודם
        </Button>
        {i === steps.length - 1 ? (
          <Button tone="brand" onClick={onClose} style={{ flex: 2 }}>סיימתי! 🎉</Button>
        ) : (
          <Button tone="primary" onClick={() => go(1)} style={{ flex: 2 }}>
            הבא <IconBack size={16} strokeWidth={2.4}/>
          </Button>
        )}
      </div>

      {/* ingredients drawer */}
      {showIngredients && (
        <Sheet title="מצרכים" subtitle={factor !== 1 ? `הכמויות מותאמות ל-${servings} מנות` : undefined}
          onClose={() => setShowIngredients(false)}>
          <div style={{ paddingBottom: 12 }}>
            {ings.map((ing, k) => {
              const on = checked.has(k);
              return (
                <button key={k} type="button"
                  onClick={() => setChecked(prev => {
                    const n = new Set(prev);
                    if (n.has(k)) n.delete(k); else n.add(k);
                    return n;
                  })}
                  style={{
                    width: '100%', border: 'none', background: 'transparent', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start',
                    padding: '11px 6px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                    opacity: on ? .45 : 1,
                  }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 'var(--r-sm)', flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    background: on ? 'var(--success)' : 'transparent',
                    boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--line-strong)',
                    color: '#fff',
                  }}>{on && <IconCheck size={13} strokeWidth={3}/>}</span>
                  <span style={{
                    ...TYPE.body, color: 'var(--ink)', flex: 1,
                    textDecoration: on ? 'line-through' : 'none',
                  }}>
                    <strong style={{ color: p.accent, marginInlineEnd: 6 }}>
                      {scaleQuantity(ing.qty, factor)}
                    </strong>
                    {ing.name}
                  </span>
                </button>
              );
            })}
            {!ings.length && <div style={{ ...TYPE.small, color: 'var(--ink-soft)', padding: 12 }}>לא הוזנו מצרכים</div>}
          </div>
        </Sheet>
      )}

      {alert && <Toast message={alert} tone="success" onDismiss={() => setAlert(null)} />}
      <style>{`@keyframes stepIn{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

Object.assign(window, {
  scaleQuantity, parseQtyNumber, formatQtyNumber, ServingScaler,
  parseDurations, useWakeLock, ringAlarm, StepTimer, CookScreen,
});
