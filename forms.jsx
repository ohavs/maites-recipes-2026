// forms.jsx — form controls that behave like an app's, not a web page's.
//
// What made the old form feel like a site on a phone was not the fields
// it asked for, it was what they were made of: white rounded cards with
// drop shadows, floating on a gradient, each with a tiny caption hovering
// above it, and every choice offered as a scatter of pills.
//
// These are built the other way round. A field is a filled container with
// a line under it and its label living inside it, rising out of the way
// when you type. A choice is a row you tap, which opens a sheet from the
// bottom of the screen. Nothing floats and nothing casts a shadow.

const { useState: fS, useRef: fR, useEffect: fE, useId: fId } = React;

// ───────────────────────────────────────────────────────────
// NField — one line of text, with its label inside it.
// ───────────────────────────────────────────────────────────
function NField({ value, onChange, label, hint, type = 'text', inputMode, placeholder,
                  multiline = false, rows = 3, autoFocus, hideLabel = false, style, after }) {
  const [focused, setFocused] = fS(false);
  const id = fId();
  const Tag = multiline ? 'textarea' : 'input';

  return (
    <div style={style}>
      {label && !hideLabel && (
        <label htmlFor={id} style={{
          display: 'block',
          ...TYPE.small, fontWeight: 700, marginBottom: 8, paddingInlineStart: 6,
          color: focused ? 'var(--brand-strong)' : 'var(--ink-soft)',
          transition: 'color var(--dur-fast)',
        }}>{label}</label>
      )}
      <div style={{ position: 'relative' }}>
      <Tag
        id={id}
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        {...(multiline ? { rows } : { type, inputMode })}
        placeholder={placeholder}
        style={{
          width: '100%', outline: 'none',
          // Solid, generous and squared-off at the same radius as the
          // buttons — the label sits above it in plain sight rather than
          // floating inside and moving about while you type.
          background: 'var(--surface-raised)', color: 'var(--ink)',
          border: `2px solid ${focused ? 'var(--brand-strong)' : 'transparent'}`,
          borderRadius: 'var(--r-lg)',
          fontFamily: 'inherit', fontSize: 'var(--t-body)', fontWeight: 500,
          textAlign: 'right', direction: 'rtl',
          padding: multiline ? '16px 18px' : '0 18px',
          height: multiline ? undefined : 'var(--field-h)',
          minHeight: multiline ? 112 : 'var(--field-h)',
          lineHeight: multiline ? 1.6 : undefined,
          resize: 'none', display: 'block',
          paddingInlineEnd: after && !multiline ? 42 : undefined,
          transition: 'border-color var(--dur-fast)',
        }}/>
      {after && !multiline && (
        <div style={{
          position: 'absolute', insetInlineEnd: 4, top: 0, height: 'var(--field-h)',
          display: 'grid', placeItems: 'center',
        }}>{after}</div>
      )}
      </div>
      {hint && (
        <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 500,
                      marginTop: 7, paddingInlineStart: 6 }}>{hint}</div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// QtyPicker — the amounts you write over and over.
//
// A quantity is a number and a measure, and almost all of them come from
// a short list. This used to be two strips you scrolled sideways, which
// was the worst of both: you could not see what was on offer without
// dragging, and the drag fought the swipe between the form's passes.
//
// It is a dropdown now, the width of the row, with everything on screen
// at once. The two halves are separate: a number replaces the number, a
// measure replaces the measure. Tapping does not append text, it edits
// the part you tapped — so picking "כוס" after "2 כף" gives "2 כוסות",
// not "2 כף כוס".
// ───────────────────────────────────────────────────────────
const QTY_NUMBERS = ['¼', '⅓', '½', '⅔', '¾', '1', '2', '3', '4', '6', '8', '10'];

// Only the singular is offered. Hebrew wants the plural above one, so the
// picker says it for you rather than making you pick the right form.
const QTY_UNITS  = ['כוס', 'כף', 'כפית', 'גרם', 'ק״ג', 'מ״ל', 'ליטר', 'יח׳', 'חבילה', 'קורט', 'חופן', 'צרור'];
const QTY_PLURAL = { 'כוס': 'כוסות', 'כף': 'כפות', 'כפית': 'כפיות', 'חבילה': 'חבילות', 'יח׳': 'יח׳', 'צרור': 'צרורות' };

// Written plural back to the singular the grid shows, so the right cell
// lights up for a quantity that was typed rather than tapped.
const QTY_SINGULAR = Object.fromEntries(
  Object.entries(QTY_PLURAL).map(([one, many]) => [many, one])
);

// More than one? Hebrew pluralises from two up; a half cup is a cup.
function plural(num, unit) {
  const n = parseFloat(String(num || '').replace(',', '.'));
  const many = Number.isFinite(n) && n >= 2;
  return many ? (QTY_PLURAL[unit] || unit) : unit;
}

// Split "2 כפות סוכר" into its number, its measure and whatever is left,
// so each can be replaced on its own.
function splitQty(value) {
  const t = String(value || '').trim();
  const m = t.match(/^([\d¼⅓½⅔¾.,/\s-]+)?\s*(.*)$/);
  const num = (m && m[1] ? m[1].trim() : '');
  const rest = (m && m[2] ? m[2].trim() : '');
  const words = [...QTY_UNITS, ...Object.values(QTY_PLURAL)].sort((a, b) => b.length - a.length);
  let unit = '', tail = rest;
  for (const w of words) {
    if (rest === w || rest.startsWith(w + ' ')) {
      unit = QTY_SINGULAR[w] || w;
      tail = rest.slice(w.length).trim();
      break;
    }
  }
  return { num, unit, tail };
}

function joinQty({ num, unit, tail }) {
  return [num, unit ? plural(num, unit) : '', tail].filter(Boolean).join(' ').trim();
}

function QtyPicker({ value, onPick, onClose }) {
  const cur = splitQty(value);
  const ref = fR(null);

  // Tapping anywhere else puts it away, the way a menu does.
  fE(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)
          && !(e.target.closest && e.target.closest('[data-qty-toggle]'))) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const cell = (t, kind) => {
    const on = kind === 'num' ? cur.num === t : cur.unit === t;
    return (
      <button key={t} type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={() => {
          // Tapping the one already chosen clears that half.
          const next = kind === 'num'
            ? { ...cur, num: on ? '' : t }
            : { ...cur, unit: on ? '' : t };
          onPick(joinQty(next));
          if (typeof hapticTap === 'function') hapticTap();
        }}
        style={{
          height: 46, padding: 0,
          borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
          background: on ? 'var(--ink)' : 'var(--field-fill)',
          color: on ? 'var(--bg)' : 'var(--ink)',
          fontFamily: kind === 'num' ? 'var(--font-display)' : 'inherit',
          fontSize: kind === 'num' ? 'var(--t-heading)' : 'var(--t-small)',
          fontWeight: kind === 'num' ? 800 : 700,
          whiteSpace: 'nowrap', overflow: 'hidden',
          transition: 'background var(--dur-fast), color var(--dur-fast)',
        }}>{t}</button>
    );
  };

  const heading = (t) => (
    <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 700,
                  paddingInlineStart: 4, marginBottom: 6 }}>{t}</div>
  );

  return (
    <div ref={ref}
      data-qty-panel="true"
      // The pager swipes between passes on a horizontal drag; this panel is
      // not part of that, so it keeps its own gestures to itself.
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{
        position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 'calc(100% + 8px)',
        zIndex: 40,
        background: 'var(--surface-raised)', borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--e3)', padding: 14,
        display: 'grid', gap: 14,
        animation: 'qtyIn var(--dur) var(--ease-out)',
      }}>
      <div>
        {heading('כמה')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {QTY_NUMBERS.map(t => cell(t, 'num'))}
        </div>
      </div>
      <div>
        {heading('יחידה')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {QTY_UNITS.map(t => cell(t, 'unit'))}
        </div>
      </div>
      <style>{`@keyframes qtyIn{0%{opacity:0;transform:translateY(-8px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// NRow — a setting you tap. The value sits where you read it,
// and a sheet comes up from the bottom to change it.
// ───────────────────────────────────────────────────────────
function NRow({ label, value, hint, onClick, leading }) {
  const [down, setDown] = fS(false);
  return (
    <button type="button" onClick={onClick}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={{
        width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: 'var(--surface-raised)',
        boxShadow: down ? '0 0 0 2px var(--brand-strong) inset' : 'none',
        borderRadius: 'var(--r-lg)', padding: '14px 18px', minHeight: 68,
        display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right',
        transition: 'background var(--dur-fast)',
      }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 700 }}>{label}</div>
        <div style={{ ...TYPE.body, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
          {value || '—'}
        </div>
        {hint && <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', marginTop: 3, fontWeight: 500 }}>{hint}</div>}
      </div>
      <span style={{ color: 'var(--ink-faint)', flexShrink: 0, display: 'grid', placeItems: 'center' }}>
        <IconBack size={20} strokeWidth={2.2}/>
      </span>
    </button>
  );
}

// ───────────────────────────────────────────────────────────
// NPickSheet — the list that a row opens. One tap picks and
// closes; there is no confirm button to hunt for.
// ───────────────────────────────────────────────────────────
function NPickSheet({ title, options, value, onPick, onClose, footer }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {options.map(opt => {
          const on = opt.value === value;
          return (
            <button key={opt.value} type="button"
              onClick={() => { onPick(opt.value); onClose(); }}
              style={{
                border: 'none', background: on ? 'var(--field-fill)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', minHeight: 60, borderRadius: 'var(--r-md)',
              }}>
              <Radio on={on}/>
              {opt.emoji && <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">{opt.emoji}</span>}
              <span style={{ ...TYPE.body, fontWeight: on ? 700 : 500, color: 'var(--ink)', flex: 1 }}>
                {opt.label}
              </span>
            </button>
          );
        })}
        {footer}
      </div>
    </Sheet>
  );
}

function Radio({ on }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 999, flexShrink: 0,
      border: `2px solid ${on ? 'var(--brand-strong)' : 'var(--field-line)'}`,
      display: 'grid', placeItems: 'center',
      transition: 'border-color var(--dur-fast)',
    }}>
      <span style={{
        width: 11, height: 11, borderRadius: 999,
        background: on ? 'var(--brand-strong)' : 'transparent',
        transform: on ? 'scale(1)' : 'scale(.3)',
        transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast)',
      }}/>
    </span>
  );
}

// ───────────────────────────────────────────────────────────
// NStepper — a count. Two big targets and the number between
// them, on one row with its label.
// ───────────────────────────────────────────────────────────
function NStepper({ label, hint, value, onChange, min = 0, max = 99, empty = 'לא צוין' }) {
  const n = parseInt(value, 10) || 0;
  const set = (v) => onChange(v <= 0 ? '' : String(Math.min(max, Math.max(min, v))));
  const btn = (dis) => ({
    width: 52, height: 52, borderRadius: 'var(--r-md)', border: 'none', flexShrink: 0,
    background: 'var(--field-fill)', color: dis ? 'var(--ink-faint)' : 'var(--ink)',
    cursor: dis ? 'default' : 'pointer', opacity: dis ? .4 : 1,
    display: 'grid', placeItems: 'center', fontFamily: 'inherit',
    fontSize: 26, fontWeight: 500, lineHeight: 1,
  });
  return (
    <div style={{
      background: 'var(--surface-raised)', borderRadius: 'var(--r-lg)', padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0, ...TYPE.body, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" aria-label="פחות" onClick={() => set(n - 1)} disabled={n <= min} style={btn(n <= min)}>−</button>
          <div style={{
            minWidth: 72, textAlign: 'center', fontFamily: 'var(--font-display)',
            fontSize: n > 0 ? 'var(--t-title)' : 'var(--t-caption)',
            fontWeight: n > 0 ? 800 : 600,
            color: n > 0 ? 'var(--ink)' : 'var(--ink-faint)',
          }}>{n > 0 ? n : empty}</div>
          <button type="button" aria-label="עוד" onClick={() => set(n + 1)} disabled={n >= max} style={btn(n >= max)}>+</button>
        </div>
      </div>
      {hint && <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 500, marginTop: 10, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// NCards — two or three choices you can see. Picked is marked
// by a ring and a filled radio, not by turning black.
// ───────────────────────────────────────────────────────────
function NCards({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexDirection: 'row-reverse' }}>
      {options.map(opt => {
        const on = opt.value === value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: 'var(--r-lg)', padding: 14, textAlign: 'center',
              background: 'var(--field-fill)',
              boxShadow: on ? '0 0 0 2px var(--brand-strong) inset' : '0 0 0 1px var(--line) inset',
              transition: 'box-shadow var(--dur-fast)',
            }}>
            {opt.preview}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              <Radio on={on}/>
              <span style={{ ...TYPE.small, fontWeight: 700, color: 'var(--ink)' }}>{opt.label}</span>
            </div>
            {opt.hint && (
              <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', marginTop: 4, fontWeight: 500 }}>{opt.hint}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// NSwatches — the card's colour. Circles, with a tick on the
// one in use.
// ───────────────────────────────────────────────────────────
function NSwatches({ keys, palettes, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
      {keys.map(k => {
        const on = k === value;
        return (
          <button key={k} type="button" onClick={() => onChange(k)} aria-label={k}
            aria-pressed={on}
            style={{
              width: 52, height: 52, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: palettes[k].bg, display: 'grid', placeItems: 'center',
              boxShadow: on ? '0 0 0 3px var(--ink)' : '0 0 0 1px var(--line)',
              transition: 'box-shadow var(--dur-fast)',
            }}>
            {on && <IconCheck size={22} strokeWidth={3} style={{ color: palettes[k].ink }}/>}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// NTabs — the four passes of the form. A label and an
// underline, the way a phone marks where you are.
// ───────────────────────────────────────────────────────────
function NTabs({ tabs, index, onIndex, done = [] }) {
  return (
    <div style={{ padding: '4px 16px 14px' }}>
      <div style={{
        // A segmented control, not a row of thin underlines: the same solid,
        // generous shape as the buttons. In an RTL box a plain `row` already
        // puts the first tab on the right, where the first thing belongs.
        display: 'flex', gap: 4, padding: 4,
        background: 'var(--field-fill)', borderRadius: 'var(--r-lg)',
      }} role="tablist">
        {tabs.map((t, i) => {
          const on = i === index;
          return (
            <button key={t.id} type="button" onClick={() => onIndex(i)}
              role="tab" aria-selected={on}
              aria-current={on ? 'step' : undefined}
              style={{
                flex: 1, minWidth: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                borderRadius: 'var(--r-md)', minHeight: 48, padding: '0 8px',
                background: on ? 'var(--surface-raised)' : 'transparent',
                color: on ? 'var(--ink)' : 'var(--ink-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background var(--dur-fast), color var(--dur-fast)',
              }}>
              {done[i] && !on && (
                <span style={{
                  width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                  background: 'var(--success)',
                }}/>
              )}
              <span style={{
                ...TYPE.small, fontWeight: on ? 800 : 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FormPager — the passes of the form, side by side.
//
// Tapping a tab still works, but a form you can only move through by
// aiming at a small target is a form that fights you. Swiping sideways
// moves between the passes, and each pass keeps its own vertical scroll.
// ───────────────────────────────────────────────────────────
function FormPager({ step, onStep, count, children }) {
  const start = fR(null);
  const [drag, setDrag] = fS(0);

  // A sideways drag that begins on something which itself scrolls
  // sideways — the photo strip, a menu — belongs to that thing, not to the
  // pager. Without this the two fight: scrolling the strip also turned the
  // page.
  const ownsSideways = (node) => {
    for (let n = node; n && n !== document.body; n = n.parentElement) {
      if (n.dataset && n.dataset.qtyPanel) return true;
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
    }
    return false;
  };

  const onDown = (e) => {
    const t = e.touches ? e.touches[0] : e;
    if (ownsSideways(e.target)) { start.current = null; return; }
    start.current = { x: t.clientX, y: t.clientY, decided: null };
  };

  const onMove = (e) => {
    const st = start.current;
    if (!st) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - st.x;
    const dy = t.clientY - st.y;
    if (st.decided === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // Sideways only when it is clearly sideways: the passes scroll too.
      st.decided = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
    }
    if (st.decided !== 'x') return;
    // Right to left: the next pass sits to the left of this one, so it is
    // pulled in by dragging rightwards, the way a Hebrew page turns.
    const blocked = (dx > 0 && step >= count - 1) || (dx < 0 && step <= 0);
    setDrag(blocked ? dx * 0.18 : dx);
  };

  const onUp = () => {
    const st = start.current;
    start.current = null;
    if (!st || st.decided !== 'x') { setDrag(0); return; }
    const w = window.innerWidth || 400;
    if (Math.abs(drag) > Math.min(90, w * 0.22)) {
      const next = drag > 0 ? step + 1 : step - 1;
      if (next >= 0 && next < count) {
        onStep(next);
        if (typeof hapticTap === 'function') hapticTap();
      }
    }
    setDrag(0);
  };

  // The track reads right to left, so the first pass is the rightmost one
  // and moving forward slides the track rightwards. A transform is not
  // affected by direction, so this sign is the screen's, not the language's.
  const pct = step * 100;
  return (
    <div
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} onTouchCancel={onUp}
      style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        display: 'flex', direction: 'rtl', height: '100%',
        transform: `translateX(calc(${pct}% + ${drag}px))`,
        transition: drag ? 'none' : 'transform var(--dur) var(--ease-out)',
      }}>
        {React.Children.map(children, (child, i) => (
          <div key={i} className="scroll-y" style={{
            width: '100%', flexShrink: 0, height: '100%', direction: 'rtl',
            overflowY: 'auto', overscrollBehaviorY: 'contain',
            // Only the pass you are on takes taps, so a half-visible one
            // beside it cannot swallow them.
            pointerEvents: i === step ? 'auto' : 'none',
          }}>{child}</div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// NAppBar — a title, and one action at the far side. The bar
// a phone puts at the top of a screen you are inside.
// ───────────────────────────────────────────────────────────
function NAppBar({ title, subtitle, onClose, closeLabel = 'סגירה' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 8px 10px 14px', minHeight: 64,
    }}>
      <div style={{ flex: 1, minWidth: 0, paddingInlineStart: 10 }}>
        <div className="display" style={{ ...TYPE.title, color: 'var(--ink)' }}>{title}</div>
        {subtitle && (
          <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label={closeLabel}
          style={{
            width: 48, height: 48, borderRadius: 999, border: 'none', flexShrink: 0,
            background: 'transparent', color: 'var(--ink)', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}>
          <IconClose size={22} strokeWidth={2.2}/>
        </button>
      )}
    </div>
  );
}

Object.assign(window, {
  NField, NRow, NPickSheet, NStepper, NCards, NSwatches, NTabs, NAppBar, Radio, FormPager, QtyPicker, splitQty, joinQty,
});

// ───────────────────────────────────────────────────────────
// PhotoStage — the photo area, rebuilt.
//
// It was a row of small dashed squares with a plus in them, which is how
// a website asks you to upload a file. A phone shows you the picture at
// the size you will see it, and puts the camera one tap away.
// ───────────────────────────────────────────────────────────
const PHOTO_MAX_PX = 900;

// Downscales whatever came in — a file, or a photograph straight from the
// camera — and puts it in the slot.
function storeImageDataUrl(dataUrl, slotId, done) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let { width: w, height: h } = img;
    if (w > PHOTO_MAX_PX || h > PHOTO_MAX_PX) {
      if (w > h) { h = Math.round(h * PHOTO_MAX_PX / w); w = PHOTO_MAX_PX; }
      else { w = Math.round(w * PHOTO_MAX_PX / h); h = PHOTO_MAX_PX; }
    }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL('image/webp', 0.85);
    if (window.__setImageSlot) window.__setImageSlot(slotId, { u: out, s: 1, x: 0, y: 0 });
    done(out);
  };
  img.onerror = () => done(null);
  img.src = dataUrl;
}

function readImageToSlot(file, slotId, done) {
  const reader = new FileReader();
  reader.onload = ev => storeImageDataUrl(ev.target.result, slotId, done);
  reader.onerror = () => done(null);
  reader.readAsDataURL(file);
}

function PhotoStage({ recipeId, gallery, setGallery, mainSlot, setMainSlot, palette }) {
  const [shots, setShots] = fS({});          // slot → data URL
  const [sheetFor, setSheetFor] = fS(null);  // slot whose sheet is open
  const [confirmSlot, setConfirmSlot] = fS(null);
  const camRef = fR(null);
  const libRef = fR(null);
  const targetRef = fR(null);

  // Photos already on this recipe, once the store has them.
  fE(() => {
    const read = () => {
      if (!window.__getImageSlot) return;
      const next = {};
      let any = false;
      gallery.forEach(slot => {
        const d = window.__getImageSlot(`food-${recipeId}-${slot}`);
        if (d && d.u) { next[slot] = d.u; any = true; }
      });
      if (any) setShots(prev => ({ ...prev, ...next }));
    };
    read();
    const t = setTimeout(read, 700);
    return () => clearTimeout(t);
  }, [recipeId, gallery.length]);

  const landed = (slot, url) => {
    if (!url) return;
    setShots(prev => {
      if (!Object.values(prev).some(Boolean)) setMainSlot(slot);
      return { ...prev, [slot]: url };
    });
    if (typeof hapticTap === 'function') hapticTap();
  };

  const pick = async (which, slot) => {
    targetRef.current = slot;
    setSheetFor(null);
    // On a phone this is the real camera roll. In a browser it is the
    // file input below, which is the same two choices by another road.
    if (typeof isNative === 'function' && isNative()) {
      const dataUrl = await pickPhotoNative(which);
      if (dataUrl) storeImageDataUrl(dataUrl, `food-${recipeId}-${slot}`, (url) => landed(slot, url));
      return;
    }
    setTimeout(() => (which === 'camera' ? camRef : libRef).current?.click(), 60);
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    const slot = targetRef.current;
    e.target.value = '';
    if (!file || !slot) return;
    readImageToSlot(file, `food-${recipeId}-${slot}`, (url) => landed(slot, url));
  };

  const addAndPick = (which) => {
    const slot = `g${Date.now().toString(36)}`;
    setGallery(g => [...g, slot]);
    return pick(which, slot);
  };

  const remove = (slot) => {
    const slotId = `food-${recipeId}-${slot}`;
    if (typeof db_deleteImageSlot !== 'undefined') db_deleteImageSlot(slotId);
    if (window.__setImageSlot) window.__setImageSlot(slotId, null);
    setShots(prev => { const n = { ...prev }; delete n[slot]; return n; });
    if (gallery.length > 1) {
      const next = gallery.filter(s => s !== slot);
      setGallery(next);
      if (mainSlot === slot) setMainSlot(next[0]);
    }
  };

  const withPhoto = gallery.filter(s => shots[s]);
  const main = shots[mainSlot] ? mainSlot : withPhoto[0];
  const hasAny = withPhoto.length > 0;

  return (
    <div>
      <input ref={camRef} type="file" accept="image/*" capture="environment"
        onChange={onFile} style={{ display: 'none' }}/>
      <input ref={libRef} type="file" accept="image/*"
        onChange={onFile} style={{ display: 'none' }}/>

      {/* the picture, at the size you will see it */}
      <button type="button"
        onClick={() => setSheetFor(hasAny ? main : (gallery[0] || 'main'))}
        style={{
          width: '100%', aspectRatio: '4 / 3', border: 'none', cursor: 'pointer', padding: 0,
          borderRadius: 'var(--r-lg)', overflow: 'hidden', position: 'relative',
          background: hasAny ? 'var(--surface-sunken)' : 'var(--field-fill)',
          boxShadow: hasAny ? 'none' : '0 0 0 1px var(--line) inset',
          display: 'grid', placeItems: 'center', fontFamily: 'inherit',
        }}>
        {hasAny ? (
          <img src={shots[main]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', gap: 10, padding: 24 }}>
            <span style={{
              width: 64, height: 64, borderRadius: 999, display: 'grid', placeItems: 'center',
              background: palette ? palette.bg : 'var(--brand)', color: palette ? palette.ink : 'var(--ink)',
            }}>
              <IconCamera size={30} strokeWidth={1.9}/>
            </span>
            <span style={{ ...TYPE.body, fontWeight: 700, color: 'var(--ink)' }}>הוספת תמונה</span>
            <span style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 500 }}>
              צילום עכשיו, או בחירה מהגלריה
            </span>
          </div>
        )}
      </button>

      {/* the rest of them */}
      {hasAny && (
      <div className="scroll-x" style={{
        display: 'flex', flexDirection: 'row-reverse', gap: 10, marginTop: 12,
        overflowX: 'auto', paddingBottom: 4,
      }}>
        <button type="button" onClick={() => setSheetFor('new')}
          aria-label="הוספת תמונה"
          style={{
            width: 76, height: 76, flexShrink: 0, borderRadius: 'var(--r-md)',
            border: 'none', cursor: 'pointer', background: 'var(--field-fill)',
            boxShadow: '0 0 0 1px var(--line) inset',
            display: 'grid', placeItems: 'center', color: 'var(--ink-soft)',
          }}>
          <IconPlus size={24} strokeWidth={2.2}/>
        </button>
        {withPhoto.map(slot => {
          const on = slot === main;
          return (
            <button key={slot} type="button" onClick={() => setMainSlot(slot)}
              aria-label={on ? 'התמונה הראשית' : 'הפיכה לתמונה הראשית'}
              style={{
                width: 76, height: 76, flexShrink: 0, borderRadius: 'var(--r-md)',
                border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden',
                position: 'relative', background: 'var(--surface-sunken)',
                boxShadow: on ? '0 0 0 3px var(--brand-strong)' : '0 0 0 1px var(--line) inset',
                transition: 'box-shadow var(--dur-fast)',
              }}>
              <img src={shots[slot]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              {on && (
                <span style={{
                  position: 'absolute', insetInlineEnd: 4, top: 4,
                  width: 22, height: 22, borderRadius: 999, background: 'var(--brand-strong)',
                  color: 'var(--on-brand)', display: 'grid', placeItems: 'center',
                }}><IconCheck size={14} strokeWidth={3}/></span>
              )}
            </button>
          );
        })}
      </div>
      )}
      <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 500, marginTop: 10, paddingInline: 4 }}>
        {hasAny ? 'הקשה על תמונה הופכת אותה לראשית' : 'התמונה הראשונה תהיה זו שמופיעה על הכרטיס'}
      </div>

      {sheetFor && (
        <Sheet title="תמונה" onClose={() => setSheetFor(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
            <PhotoAction icon={<IconCamera size={22}/>} label="צילום תמונה"
              onClick={() => (sheetFor === 'new' ? addAndPick('camera') : pick('camera', sheetFor))}/>
            <PhotoAction icon={<IconImage size={22}/>} label="בחירה מהגלריה"
              onClick={() => (sheetFor === 'new' ? addAndPick('library') : pick('library', sheetFor))}/>
            {sheetFor !== 'new' && shots[sheetFor] && (
              <PhotoAction icon={<IconTrash size={22}/>} label="הסרת התמונה" danger
                onClick={() => { const s = sheetFor; setSheetFor(null); setConfirmSlot(s); }}/>
            )}
          </div>
        </Sheet>
      )}

      {confirmSlot && (
        <ConfirmDialog
          emoji="🖼️"
          title="הסרת תמונה"
          body="התמונה תימחק מהמתכון. אי אפשר לבטל."
          confirmLabel="הסרה"
          cancelLabel="ביטול"
          onConfirm={() => { remove(confirmSlot); setConfirmSlot(null); }}
          onCancel={() => setConfirmSlot(null)}
        />
      )}
    </div>
  );
}

function PhotoAction({ icon, label, onClick, danger }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 16, textAlign: 'right',
        padding: '16px 18px', minHeight: 60, borderRadius: 'var(--r-md)',
        color: danger ? 'var(--danger)' : 'var(--ink)',
      }}>
      <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center' }}>{icon}</span>
      <span style={{ ...TYPE.body, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

Object.assign(window, { PhotoStage, PhotoAction, readImageToSlot, storeImageDataUrl });
