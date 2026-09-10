// ui.jsx — the shared design layer.
//
// Every screen builds from these primitives instead of re-declaring its own
// colours, radii and shadows inline. Colours come from the token layer in
// index.html, so light/dark is handled in one place.

const { useState: xS, useEffect: xE, useRef: xR, useCallback: xC } = React;

// ───────────────────────────────────────────────────────────
// Type scale — seven steps, each with a job.
// ───────────────────────────────────────────────────────────
const TYPE = {
  display: { fontFamily: 'var(--font-display)', fontSize: 'var(--t-display)', fontWeight: 800, lineHeight: 1.14, letterSpacing: '-.015em' },
  title:   { fontFamily: 'var(--font-display)', fontSize: 'var(--t-title)',   fontWeight: 700, lineHeight: 1.2 },
  heading: { fontSize: 'var(--t-heading)', fontWeight: 700, lineHeight: 1.3 },
  body:    { fontSize: 'var(--t-body)',    fontWeight: 400, lineHeight: 'var(--lh-body)' },
  small:   { fontSize: 'var(--t-small)',   fontWeight: 500, lineHeight: 1.5 },
  caption: { fontSize: 'var(--t-caption)', fontWeight: 600, lineHeight: 1.45 },
  label:   { fontSize: 'var(--t-label)',   fontWeight: 800, lineHeight: 1.4, letterSpacing: '.14em', textTransform: 'uppercase' },
};

// ───────────────────────────────────────────────────────────
// Theme — 'auto' follows the phone, or the user pins one.
// ───────────────────────────────────────────────────────────
const THEME_KEY = 'maites.theme';

function readTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; }
}

function applyTheme(mode) {
  const el = document.documentElement;
  if (mode === 'light' || mode === 'dark') el.setAttribute('data-theme', mode);
  else el.removeAttribute('data-theme');
  // keep the browser UI (status bar / address bar) in step with the app
  const dark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#191218' : '#f7a8b8');
}

function useTheme() {
  const [mode, setMode] = xS(readTheme);
  xE(() => { applyTheme(mode); }, [mode]);
  xE(() => {
    if (mode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);
  const set = (m) => { setMode(m); try { localStorage.setItem(THEME_KEY, m); } catch {} };
  return [mode, set];
}

// Apply the stored theme before React mounts, so there is no flash.
applyTheme(readTheme());

// ───────────────────────────────────────────────────────────
// Card — one wrapper, three roles.
//   surface : neutral panel        raised : floating white block
//   recipe  : palette-coloured card
// ───────────────────────────────────────────────────────────
function Card({ variant = 'surface', palette, elevation = 2, radius = 'lg', style, children, ...rest }) {
  const bg = variant === 'recipe' ? (palette ? palette.bg : 'var(--brand)')
    : variant === 'raised' ? 'var(--surface-raised)'
    : variant === 'glass' ? 'var(--glass)'
    : 'var(--surface)';
  return (
    <div style={{
      background: bg,
      color: variant === 'recipe' && palette ? palette.ink : 'var(--ink)',
      borderRadius: `var(--r-${radius})`,
      boxShadow: elevation ? `var(--e${elevation})` : 'none',
      ...(variant === 'glass' ? { backdropFilter: 'blur(18px) saturate(160%)' } : {}),
      ...style,
    }} {...rest}>{children}</div>
  );
}

// ───────────────────────────────────────────────────────────
// IconButton — round control. Always at least 40px, `lg` for
// anything that is a primary target.
// ───────────────────────────────────────────────────────────
const ICON_BTN_SIZE = { sm: 36, md: 40, lg: 44 };

function IconButton({ size = 'md', tone = 'glass', label, onClick, disabled, style, children, ...rest }) {
  const px = ICON_BTN_SIZE[size] || ICON_BTN_SIZE.md;
  const tones = {
    glass:  { background: 'var(--glass)',        color: 'var(--ink)',        boxShadow: 'var(--e1)' },
    raised: { background: 'var(--surface-raised)', color: 'var(--ink)',      boxShadow: 'var(--e1)' },
    solid:  { background: 'var(--ink)',          color: 'var(--bg)',         boxShadow: 'var(--e2)' },
    brand:  { background: 'var(--brand-strong)', color: 'var(--on-brand)',   boxShadow: 'var(--e2)' },
    ghost:  { background: 'transparent',         color: 'var(--ink)',        boxShadow: 'none' },
    danger: { background: 'var(--danger-soft)',  color: 'var(--danger)',     boxShadow: 'none' },
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      aria-label={label} title={label}
      style={{
        width: px, height: px, borderRadius: 'var(--r-pill)', border: 'none', padding: 0,
        display: 'grid', placeItems: 'center', flexShrink: 0,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? .45 : 1,
        transition: `transform var(--dur-fast), background var(--dur-fast), color var(--dur-fast)`,
        ...tones[tone], ...style,
      }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.9)'; }}
      onPointerUp={e => { e.currentTarget.style.transform = ''; }}
      onPointerLeave={e => { e.currentTarget.style.transform = ''; }}
      {...rest}
    >{children}</button>
  );
}

// ───────────────────────────────────────────────────────────
// Button — text action.
// ───────────────────────────────────────────────────────────
function Button({ tone = 'primary', size = 'md', full, disabled, onClick, style, children, ...rest }) {
  const tones = {
    primary: { background: 'var(--ink)',           color: 'var(--bg)',       boxShadow: 'var(--e2)' },
    brand:   { background: 'var(--brand-strong)',  color: 'var(--on-brand)', boxShadow: 'var(--e2)' },
    quiet:   { background: 'var(--surface-sunken)', color: 'var(--ink)',     boxShadow: 'none' },
    glass:   { background: 'var(--glass)',         color: 'var(--ink)',      boxShadow: 'var(--e1)' },
    danger:  { background: 'var(--danger)',        color: '#fff',            boxShadow: 'var(--e2)' },
  };
  const pad = size === 'lg' ? '17px 22px' : size === 'sm' ? '9px 14px' : '13px 18px';
  const fs  = size === 'lg' ? 'var(--t-body)' : size === 'sm' ? 'var(--t-caption)' : 'var(--t-small)';
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        border: 'none', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
        borderRadius: 'var(--r-md)', padding: pad, fontSize: fs, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: full ? '100%' : undefined, minHeight: 44,
        opacity: disabled ? .5 : 1,
        transition: 'transform var(--dur-fast), opacity var(--dur-fast)',
        ...tones[tone], ...style,
      }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)'; }}
      onPointerUp={e => { e.currentTarget.style.transform = ''; }}
      onPointerLeave={e => { e.currentTarget.style.transform = ''; }}
      {...rest}
    >{children}</button>
  );
}

// ───────────────────────────────────────────────────────────
// Chip — small pill, for tags, filters and meta.
// ───────────────────────────────────────────────────────────
function Chip({ tone = 'neutral', palette, active, onClick, style, children, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    ...TYPE.caption,
    padding: '6px 11px', borderRadius: 'var(--r-pill)',
    border: 'none', fontFamily: 'inherit', flexShrink: 0,
    transition: 'background var(--dur-fast), color var(--dur-fast)',
  };
  const tones = {
    neutral: { background: 'var(--surface-sunken)', color: 'var(--ink-soft)' },
    glass:   { background: 'var(--glass)', color: 'var(--ink)', boxShadow: 'var(--e1)' },
    palette: { background: palette ? palette.tag : 'var(--brand)', color: palette ? palette.ink : 'var(--ink)' },
    raised:  { background: 'var(--surface-raised)', color: palette ? palette.ink : 'var(--ink)', boxShadow: 'var(--e1)' },
    solid:   { background: 'var(--ink)', color: 'var(--bg)' },
  };
  const tn = active ? tones.solid : tones[tone];
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag {...(onClick ? { type: 'button', onClick, style: { ...base, ...tn, cursor: 'pointer', minHeight: 32, ...style } }
                      : { style: { ...base, ...tn, ...style } })} {...rest}>{children}</Tag>
  );
}

// ───────────────────────────────────────────────────────────
// SectionLabel — uppercase eyebrow above a block.
// ───────────────────────────────────────────────────────────
function SectionLabel({ children, ink = 'var(--ink-soft)', style }) {
  return <div style={{ ...TYPE.label, color: ink, ...style }}>{children}</div>;
}

// ───────────────────────────────────────────────────────────
// Field — label + control + optional hint / error.
// ───────────────────────────────────────────────────────────
function Field({ label, hint, error, htmlFor, children, style }) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'block', ...style }}>
      <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', marginBottom: 6, paddingInlineStart: 4 }}>{label}</div>
      {children}
      {(error || hint) && (
        <div style={{
          ...TYPE.caption, marginTop: 5, paddingInlineStart: 4,
          color: error ? 'var(--danger)' : 'var(--ink-faint)', fontWeight: error ? 700 : 500,
        }}>{error || hint}</div>
      )}
    </label>
  );
}

const inputStyle = {
  width: '100%', border: 'none', outline: 'none',
  background: 'var(--surface-raised)', color: 'var(--ink)',
  borderRadius: 'var(--r-md)', padding: '13px 15px',
  fontFamily: 'inherit', fontSize: 'var(--t-body)', textAlign: 'right',
  boxShadow: 'var(--e1)', minHeight: 46,
};

// ───────────────────────────────────────────────────────────
// ListRow — one line in a list: leading / title+meta / trailing.
// ───────────────────────────────────────────────────────────
function ListRow({ leading, title, meta, trailing, onClick, divider = true, style, ...rest }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag {...(onClick ? { type: 'button', onClick } : {})}
      style={{
        width: '100%', border: 'none', background: 'transparent', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start',
        padding: '12px 14px', minHeight: 56, color: 'var(--ink)',
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: divider ? '1px solid var(--line)' : 'none',
        ...style,
      }} {...rest}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.small, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {meta && <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 500, marginTop: 2 }}>{meta}</div>}
      </div>
      {trailing}
    </Tag>
  );
}

// ───────────────────────────────────────────────────────────
// Sheet — bottom sheet with a backdrop. Escape and backdrop
// both close it; focus is trapped inside while open.
// ───────────────────────────────────────────────────────────
function Sheet({ title, subtitle, onClose, footer, children, maxHeight = '86%', style }) {
  const panelRef = xR(null);
  xE(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'var(--overlay)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn var(--dur) ease',
      }}>
      <div ref={panelRef} onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', color: 'var(--ink)',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0', width: '100%',
          maxHeight, display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--e3)', animation: 'sheetUp var(--dur-slow) var(--ease-out)',
          ...style,
        }}>
        <div style={{ padding: '14px 20px 8px', flexShrink: 0 }}>
          <div style={{
            width: 42, height: 5, borderRadius: 'var(--r-pill)',
            background: 'var(--line-strong)', margin: '0 auto 14px',
          }}/>
          {title && (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, ...TYPE.title }}>{title}</h2>
                {subtitle && <p style={{ margin: '4px 0 0', ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 500 }}>{subtitle}</p>}
              </div>
              {onClose && (
                <IconButton label="סגירה" tone="ghost" size="md" onClick={onClose}
                  style={{ background: 'var(--surface-sunken)' }}>
                  <IconClose size={16} strokeWidth={2.4}/>
                </IconButton>
              )}
            </div>
          )}
        </div>
        <div className="scroll-y" style={{ flex: 1, padding: '4px 16px 8px', minHeight: 0 }}>{children}</div>
        {footer && (
          <div style={{
            padding: '12px 18px calc(22px + env(safe-area-inset-bottom, 0px))',
            display: 'flex', gap: 10, borderTop: '1px solid var(--line)', flexShrink: 0,
          }}>{footer}</div>
        )}
      </div>
      <style>{`
        @keyframes sheetUp{0%{opacity:0;transform:translateY(60px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{0%{opacity:0}100%{opacity:1}}
      `}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// EmptyState / ErrorState / Spinner — the three "nothing to
// show" screens, identical everywhere they appear.
// ───────────────────────────────────────────────────────────
function EmptyState({ emoji = '🍽️', title, text, cta, style }) {
  return (
    <div style={{
      display: 'grid', placeItems: 'center', textAlign: 'center',
      padding: '48px 24px', gap: 6, ...style,
    }}>
      <div style={{ fontSize: 46, lineHeight: 1 }} aria-hidden="true">{emoji}</div>
      {title && <div style={{ ...TYPE.heading, color: 'var(--ink)', marginTop: 6 }}>{title}</div>}
      {text && <div style={{ ...TYPE.small, color: 'var(--ink-soft)', maxWidth: 300, fontWeight: 400 }}>{text}</div>}
      {cta && <div style={{ marginTop: 12 }}>
        <Button tone="primary" onClick={cta.onClick}>{cta.label}</Button>
      </div>}
    </div>
  );
}

function ErrorState({ title = 'משהו השתבש', text, onRetry, style }) {
  return (
    <div style={{
      display: 'grid', placeItems: 'center', textAlign: 'center',
      padding: '40px 24px', gap: 8,
      background: 'var(--danger-soft)', borderRadius: 'var(--r-lg)', ...style,
    }}>
      <div style={{ fontSize: 34, lineHeight: 1 }} aria-hidden="true">⚠️</div>
      <div style={{ ...TYPE.heading, color: 'var(--ink)' }}>{title}</div>
      {text && <div style={{ ...TYPE.small, color: 'var(--ink-soft)', maxWidth: 300, fontWeight: 400 }}>{text}</div>}
      {onRetry && <div style={{ marginTop: 8 }}><Button tone="quiet" onClick={onRetry}>נסו שוב</Button></div>}
    </div>
  );
}

function Spinner({ size = 22, color = 'var(--ink-soft)' }) {
  return (
    <span role="status" aria-label="טוען" style={{
      width: size, height: size, borderRadius: '50%', display: 'inline-block',
      border: `2.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
      borderTopColor: color, animation: 'spin .8s linear infinite',
    }}/>
  );
}

// ───────────────────────────────────────────────────────────
// Toast — transient message, and SaveState — the persistent
// "is my data safe" indicator.
// ───────────────────────────────────────────────────────────
function Toast({ message, tone = 'neutral', onDismiss }) {
  const tones = {
    neutral: { background: 'var(--ink)', color: 'var(--bg)' },
    success: { background: 'var(--success)', color: '#fff' },
    danger:  { background: 'var(--danger)', color: '#fff' },
  };
  return (
    <div role="status" aria-live="polite" onClick={onDismiss}
      style={{
        position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)',
        padding: '12px 18px', borderRadius: 'var(--r-pill)', zIndex: 80,
        ...TYPE.small, fontWeight: 700, boxShadow: 'var(--e3)',
        maxWidth: '88%', display: 'flex', alignItems: 'center', gap: 8,
        animation: 'toastIn var(--dur) var(--ease-out)',
        cursor: onDismiss ? 'pointer' : 'default',
        ...tones[tone],
      }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message}</span>
      <style>{`@keyframes toastIn{0%{opacity:0;transform:translate(-50%,12px)}100%{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}

// Shows what happened to the last write: saving / saved / queued
// offline / failed. Silence is never an answer.
function SaveState({ state, pending = 0, onRetry }) {
  if (!state || state === 'idle') return null;
  const map = {
    saving:  { icon: <Spinner size={13} color="var(--ink-soft)"/>, text: 'שומר…',        bg: 'var(--glass)',        fg: 'var(--ink-soft)' },
    saved:   { icon: <IconCheck size={13} strokeWidth={3}/>,        text: 'נשמר',         bg: 'var(--success-soft)', fg: 'var(--success)' },
    offline: { icon: <span aria-hidden="true">☁️</span>,            text: pending > 1 ? `${pending} שינויים ממתינים לחיבור` : 'ממתין לחיבור', bg: 'var(--glass)', fg: 'var(--ink-soft)' },
    error:   { icon: <span aria-hidden="true">⚠️</span>,            text: 'השמירה נכשלה', bg: 'var(--danger-soft)',  fg: 'var(--danger)' },
  };
  const s = map[state] || map.saving;
  return (
    <div role="status" aria-live="polite" style={{
      position: 'absolute', top: 'calc(10px + env(safe-area-inset-top, 0px))', insetInlineStart: '50%',
      transform: 'translateX(-50%)', zIndex: 70,
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '7px 14px', borderRadius: 'var(--r-pill)',
      background: s.bg, color: s.fg, backdropFilter: 'blur(14px)',
      boxShadow: 'var(--e1)', ...TYPE.caption,
      animation: 'toastIn var(--dur) var(--ease-out)',
      whiteSpace: 'nowrap',
    }}>
      {s.icon}<span>{s.text}</span>
      {state === 'error' && onRetry && (
        <button type="button" onClick={onRetry} style={{
          border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 800, textDecoration: 'underline', padding: 0,
        }}>נסו שוב</button>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// OfflineBanner — says plainly that working offline is fine.
// ───────────────────────────────────────────────────────────
function OfflineBanner({ pending }) {
  return (
    <div role="status" aria-live="polite" style={{
      position: 'absolute', insetInlineStart: 12, insetInlineEnd: 12,
      bottom: 'calc(86px + env(safe-area-inset-bottom, 0px))', zIndex: 65,
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '10px 14px', borderRadius: 'var(--r-pill)',
      background: 'var(--glass-strong)', backdropFilter: 'blur(16px)',
      boxShadow: 'var(--e2)', color: 'var(--ink)',
      animation: 'toastIn var(--dur) var(--ease-out)',
    }}>
      <span aria-hidden="true" style={{ fontSize: 15 }}>☁️</span>
      <span style={{ ...TYPE.caption, flex: 1, minWidth: 0 }}>
        {pending
          ? 'אין חיבור — השינויים שמורים במכשיר ויסונכרנו אוטומטית'
          : 'אין חיבור — אפשר להמשיך לעבוד, הכל יסונכרן כשהרשת תחזור'}
      </span>
      <style>{`@keyframes toastIn{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Switch — accessible on/off control.
// ───────────────────────────────────────────────────────────
function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 50, height: 30, borderRadius: 'var(--r-pill)', border: 'none', padding: 0,
        background: checked ? 'var(--brand-strong)' : 'var(--line-strong)',
        position: 'relative', flexShrink: 0, cursor: 'pointer',
        transition: 'background var(--dur)',
      }}>
      <span style={{
        position: 'absolute', top: 3, insetInlineStart: checked ? 23 : 3,
        width: 24, height: 24, borderRadius: '50%', background: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,.25)', transition: 'inset-inline-start var(--dur)',
      }}/>
    </button>
  );
}

// ───────────────────────────────────────────────────────────
// SegmentedControl — a small set of exclusive options.
// ───────────────────────────────────────────────────────────
function SegmentedControl({ value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} style={{
      display: 'flex', gap: 3, padding: 3, borderRadius: 'var(--r-pill)',
      background: 'var(--surface-sunken)',
    }}>
      {options.map(opt => {
        const on = value === opt.value;
        return (
          <button key={opt.value} type="button" role="radio" aria-checked={on}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              borderRadius: 'var(--r-pill)', padding: '9px 12px', minHeight: 40,
              ...TYPE.caption,
              background: on ? 'var(--surface-raised)' : 'transparent',
              color: on ? 'var(--ink)' : 'var(--ink-soft)',
              boxShadow: on ? 'var(--e1)' : 'none',
              transition: 'background var(--dur-fast), color var(--dur-fast)',
            }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  TYPE, useTheme, applyTheme, readTheme,
  Card, IconButton, Button, Chip, SectionLabel, Field, inputStyle,
  ListRow, Sheet, EmptyState, ErrorState, Spinner, Toast, SaveState, OfflineBanner,
  Switch, SegmentedControl,
});
