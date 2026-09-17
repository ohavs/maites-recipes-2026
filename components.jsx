// components.jsx — reusable building blocks
const { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useContext, createContext } = React;

// ───────────────────────────────────────────────────────────
// Animation speed context (slow / normal / fast / off)
// ───────────────────────────────────────────────────────────
const AnimSpeedContext = createContext('normal');
const SPEED_MULTIPLIER = { slow: 1.7, normal: 1, fast: 0.55, off: 0 };
function useAnimMs(base) {
  const speed = useContext(AnimSpeedContext);
  const enabled = useAnimEnabled();
  if (!enabled) return 0;
  const m = SPEED_MULTIPLIER[speed] ?? 1;
  return Math.round(base * m);
}
// The OS "reduce motion" setting wins over the in-app animation speed.
const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
};
function useAnimEnabled() {
  const speed = useContext(AnimSpeedContext);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return speed !== 'off' && !reduced;
}

// ───────────────────────────────────────────────────────────
// FoodImage — circular slot the user can drag a real photo into.
// Falls back to FoodArt SVG when empty.
// ───────────────────────────────────────────────────────────
function FoodImage({ recipeId, size = 200, slotIdSuffix = '', readonly = false,
                    shape = 'circle', radius = 20, fit = 'contain', width, height }) {
  const slotRef = useRef(null);
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const inject = () => {
      const sr = el.shadowRoot;
      if (!sr) return;
      const existing = sr.querySelector('#__art_override');
      if (existing) existing.remove();
      const s = document.createElement('style');
      s.id = '__art_override';
      s.textContent = `
        .frame { background: transparent !important; }
        .ring { display: none !important; }
        .empty svg { display: none !important; }
        .cap { display: none !important; }
        .sub { display: none !important; }
        ${readonly ? '.empty { pointer-events: none !important; cursor: default !important; }' : ''}
      `;
      sr.appendChild(s);
    };
    inject();
    const t = setTimeout(inject, 80);
    return () => clearTimeout(t);
  }, [readonly, shape, fit]);

  const w = width || size, h = height || size;
  return (
    <div style={{
      position: 'relative', width: w, height: h, flexShrink: 0,
      ...(readonly ? { pointerEvents: 'none', touchAction: 'pan-y' } : {}),
    }}>
      <image-slot ref={slotRef}
        id={`food-${recipeId}${slotIdSuffix}`}
        shape={shape}
        radius={radius}
        fit={fit}
        placeholder=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      ></image-slot>
    </div>
  );
}

// Returns the stored data-URL for a recipe's main photo, or null.
// Used by the recipe book / print views, which need a plain <img>.
// ───────────────────────────────────────────────────────────
// RecipePhoto — one treatment for every photograph.
//
// The pictures are never alike. Some are wide, some tall, some square.
// Some are photographs with a background, some are cut-outs on nothing at
// all. Cropping them to a common shape ruins half of them: a cut-out cake
// gets its edges sliced off, a wide pan loses the pan.
//
// So nothing is cropped. Every photo is shown whole, centred, at the
// largest size that fits — and the space left around it is filled by a
// blurred, enlarged copy of the photo itself, over the recipe's own
// colour. A wide photo gets soft bands above and below in its own tones; a
// tall one gets them at the sides; a cut-out sits on the recipe's colour
// because a transparent picture has nothing to blur. Every card ends up
// the same shape and the same weight, and no photo is cut.
// ───────────────────────────────────────────────────────────
function RecipePhoto({ url, palette, radius = 'var(--r-lg)', alt = '', style, dim = false }) {
  if (!url) return null;
  const tint = palette ? palette.bg2 || palette.bg : 'var(--surface-sunken)';
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: radius,
      background: tint, ...style,
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '-12%',
        backgroundImage: `url("${url}")`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(22px) saturate(1.5)',
        opacity: .85,
        transform: 'scale(1.1)',
      }}/>
      <img src={url} alt={alt} loading="lazy" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'contain', display: 'block',
      }}/>
      {dim && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.35) 100%)',
        }}/>
      )}
    </div>
  );
}

function getRecipePhoto(recipe, slot) {
  if (!recipe || !window.__getImageSlot) return null;
  const s = slot || recipe.mainSlot || (recipe.gallery && recipe.gallery[0]) || 'main';
  const d = window.__getImageSlot(`food-${recipe.id}-${s}`);
  return d && d.u ? d.u : null;
}

// Live view of a recipe's photo. The store hydrates asynchronously, so this
// subscribes to it rather than guessing when it has arrived — a card that
// hides itself when there is no photo must never be the reason the store
// was never read.
function useRecipePhoto(recipe, slot) {
  const [url, setUrl] = useState(() => getRecipePhoto(recipe, slot));
  useEffect(() => {
    let alive = true;
    const read = () => { if (alive) setUrl(getRecipePhoto(recipe, slot)); };
    if (window.__loadImageSlots) window.__loadImageSlots().then(read).catch(read);
    read();
    if (window.__onImageSlots) return () => { alive = false; };
    // Older image-slot.js without a subscription: fall back to a few probes.
    const ts = [200, 700, 1800, 4000].map(ms => setTimeout(read, ms));
    return () => { alive = false; ts.forEach(clearTimeout); };
  }, [recipe && recipe.id, slot]);

  useEffect(() => {
    if (!window.__onImageSlots) return undefined;
    return window.__onImageSlots(() => setUrl(getRecipePhoto(recipe, slot)));
  }, [recipe && recipe.id, slot]);

  return url;
}

// True once the photo store has been read, so a view can tell "no photo"
// apart from "not loaded yet".
function useImageSlotsReady() {
  const [ready, setReady] = useState(() => !!(window.__imageSlotsReady && window.__imageSlotsReady()));
  useEffect(() => {
    if (ready) return undefined;
    let alive = true;
    const check = () => {
      if (alive && window.__imageSlotsReady && window.__imageSlotsReady()) setReady(true);
    };
    if (window.__loadImageSlots) window.__loadImageSlots().then(check).catch(check);
    const off = window.__onImageSlots ? window.__onImageSlots(check) : null;
    const t = setTimeout(check, 2500);
    return () => { alive = false; clearTimeout(t); if (off) off(); };
  }, [ready]);
  return ready;
}

// ───────────────────────────────────────────────────────────
// useScrollPhysics — attaches to nearest .scroll-y ancestor and writes
// a transform / opacity to the ref element on every scroll, based on its
// distance from the viewport center + the parent's scroll velocity. All
// updates go straight to `el.style` via rAF — zero React re-renders.
// ───────────────────────────────────────────────────────────
function useScrollPhysics(ref, opts = {}) {
  const enabled = useAnimEnabled();
  const {
    tiltDeg     = 10,    // rotateX magnitude (degrees) at viewport edges
    scaleAmt    = 0.06,  // how much to scale down at edges (0–1)
    fadeAmt     = 0.18,  // how much to fade at edges (0–1)
    skewMax     = 4,     // max skew (deg) from scroll velocity
  } = opts;

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const scroller = el.closest('.scroll-y');
    if (!scroller) return;

    let raf = 0;
    let lastScroll = scroller.scrollTop;
    let lastTime = performance.now();
    let velocity = 0;
    let velTarget = 0;
    let pressedScale = 1;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const apply = () => {
      raf = 0;
      const r  = el.getBoundingClientRect();
      const sR = scroller.getBoundingClientRect();
      const center = sR.top + sR.height / 2;
      const cardCenter = r.top + r.height / 2;
      const norm = clamp((cardCenter - center) / (sR.height * 0.55), -1, 1);

      const rotX  = -norm * tiltDeg;
      const scale = (1 - Math.abs(norm) * scaleAmt) * pressedScale;
      const op    = 1 - Math.abs(norm) * fadeAmt;
      // Velocity decays toward 0 — ease the displayed skew toward velTarget
      velocity += (velTarget - velocity) * 0.18;
      const skew  = clamp(velocity * 0.025, -skewMax, skewMax);

      el.style.transform =
        `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) ` +
        `skewY(${skew.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
      el.style.willChange = 'transform, opacity';

      // Keep ticking while velocity is non-trivial so the skew decays smoothly
      if (Math.abs(velocity - velTarget) > 0.02 || Math.abs(velocity) > 0.05) {
        velTarget *= 0.86;
        raf = requestAnimationFrame(apply);
      }
    };

    const onScroll = () => {
      const now = performance.now();
      const dt  = Math.max(1, now - lastTime);
      const dy  = scroller.scrollTop - lastScroll;
      velTarget = clamp((dy / dt) * 16, -180, 180);
      lastScroll = scroller.scrollTop;
      lastTime = now;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    // Press handlers — satisfying bounce on tap
    const onDown = () => { pressedScale = 0.965; if (!raf) raf = requestAnimationFrame(apply); };
    const onUp   = () => { pressedScale = 1;     if (!raf) raf = requestAnimationFrame(apply); };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointerdown',   onDown);
    el.addEventListener('pointerup',     onUp);
    el.addEventListener('pointerleave',  onUp);
    el.addEventListener('pointercancel', onUp);

    apply(); // initial positioning

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointerdown',   onDown);
      el.removeEventListener('pointerup',     onUp);
      el.removeEventListener('pointerleave',  onUp);
      el.removeEventListener('pointercancel', onUp);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
}

// ───────────────────────────────────────────────────────────
// RecipeCard — colorful card with a circular food image that
// PROTRUDES from the card edge (like the reference video).
// Three variants via Tweaks: 'block' (TikTok), 'bleed', 'soft'.
// ───────────────────────────────────────────────────────────
function RecipeCard({ recipe, onOpen, index, density = 'comfy', variant = 'block', onToggleFav, sharedId }) {
  const p = paletteOf(recipe.palette);
  const enterMs = useAnimMs(550);
  const enabled = useAnimEnabled();
  const cardRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), enabled ? index * 70 : 0);
    return () => clearTimeout(t);
  }, []);
  // Scroll-based physics (tilt / scale / fade / velocity-skew + tap bounce)
  useScrollPhysics(cardRef);

  // Card geometry — tall, with the circle poking out hard.
  // Per-recipe choice: 'inside' keeps the photo within the card bounds,
  // anything else (default) lets the circle poke out past the edge.
  // With no photo at all we simply leave the space to the text — but only
  // once the photo store has actually been read, so a slow load can never
  // masquerade as "this recipe has no picture".
  const photo = useRecipePhoto(recipe);
  const slotsReady = useImageSlotsReady();
  const hasPhoto = !!photo || !slotsReady;
  const inside   = recipe.imageMode === 'inside';
  const cardH    = 168;
  const padY     = 18;
  const imgSize  = inside ? cardH - padY * 2 : 146;
  const titleSize= 26;
  const descClamp= 2;
  const padX     = 24;
  // How far the circle reaches past the card's start edge (RTL = right).
  const imgPokeOut = inside ? 0 : Math.round(imgSize * 0.18);

  const wrapperStyle = {
    position: 'relative',
    width: '100%',
    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(40px) scale(.96)',
    opacity: mounted ? 1 : 0,
    transition: `transform ${enterMs}ms cubic-bezier(.2,.9,.25,1.1), opacity ${enterMs}ms ease-out`,
  };

  const cardBg = variant === 'soft'
    ? `linear-gradient(135deg, ${p.bg2} 0%, ${p.bg} 100%)`
    : p.bg;

  return (
    <div style={wrapperStyle}>
      <div ref={cardRef} onClick={() => onOpen(recipe)}
        data-comment-anchor={`recipe-card-${recipe.id}`}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-card)',
          minHeight: cardH,
          cursor: 'pointer',
          background: cardBg,
          boxShadow: 'var(--shadow-card)',
          overflow: 'visible', // CRITICAL — lets the circle escape
          transformStyle: 'preserve-3d',
          // Smooth out the scroll-physics transform between rAF frames
          transition: 'transform .18s cubic-bezier(.2,.8,.2,1.05), opacity .25s ease-out, box-shadow .25s ease',
        }}>
        {/* shine — clipped to card so it doesn't bleed onto the protruding image */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 'var(--radius-card)',
          background: 'linear-gradient(160deg, var(--sheen) 0%, transparent 38%, rgba(0,0,0,.04) 100%)',
          pointerEvents: 'none',
          overflow: 'hidden',
        }} />

        {/* RTL row: text on right, big circle photo on left poking out */}
        <div style={{
          position: 'relative', height: cardH, display: 'flex', flexDirection: 'row-reverse',
          padding: `${padY}px ${padX}px`, gap: inside ? 14 : 8, alignItems: 'center',
        }}>
          {/* text */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="display" style={{
              fontWeight: 700, fontSize: titleSize, lineHeight: 1.1, color: p.ink,
              textWrap: 'balance',
            }}>{recipe.title}</div>
            {(
              <div style={{
                fontSize: 'var(--t-small)', lineHeight: 1.45,
                color: p.ink, opacity: .75, fontWeight: 400,
                display: '-webkit-box', WebkitLineClamp: descClamp, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{recipe.description}</div>
            )}
          </div>

          {/* photo — 'inside' keeps a rounded thumbnail within the card,
             otherwise the circle sits on the inline-START side (RTL → right)
             and pokes OUT past that edge. */}
          {hasPhoto && <div style={{
            position: 'relative',
            width: imgSize - imgPokeOut, // space the row reserves
            height: imgSize,
            flexShrink: 0,
          }} data-shared-img={sharedId}>
            <div style={{
              position: 'absolute',
              top: '50%', insetInlineStart: -imgPokeOut,
              transform: 'translateY(-50%)',
              width: imgSize, height: imgSize,
              borderRadius: inside ? 'var(--r-md)' : 'var(--r-pill)',
              overflow: 'hidden', boxShadow: 'var(--e2)',
            }}>
              <RecipePhoto url={photo} palette={p}
                radius={inside ? 'var(--r-md)' : 'var(--r-pill)'} alt=""/>
            </div>
          </div>}
        </div>

        {/* favorite button — anchored to the OPPOSITE side (left in RTL = inline-end) */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(recipe.id); }}
          aria-label="הוסף למועדפים"
          style={{
            position: 'absolute', top: 12, insetInlineEnd: 12,
            width: 36, height: 36, borderRadius: 'var(--r-pill)',
            display: 'grid', placeItems: 'center',
            background: 'var(--glass)', backdropFilter: 'blur(6px)',
            border: 'none', boxShadow: 'var(--e1)',
            cursor: 'pointer', color: recipe.favorite ? 'var(--brand-strong)' : p.ink,
            zIndex: 2,
          }}>
          <FavHeart filled={recipe.favorite} />
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// ImageGallery — horizontal swipeable carousel of FoodImage
// circles. Shows dots underneath. Used on the recipe detail.
// ───────────────────────────────────────────────────────────
function ImageGallery({ recipeId, slots = ['main'], size = 260, onAddSlot }) {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [slotsWithImages, setSlotsWithImages] = useState(new Set());

  useEffect(() => {
    const check = () => {
      if (!window.__getImageSlot) return;
      const withImgs = new Set(
        slots.filter(slot => {
          const d = window.__getImageSlot(`food-${recipeId}-${slot}`);
          return d && d.u;
        })
      );
      setSlotsWithImages(withImgs);
    };
    check();
    const t1 = setTimeout(check, 500);
    const t2 = setTimeout(check, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [recipeId, slots]);

  const onScroll = (e) => {
    const el = e.target;
    const w = el.clientWidth;
    if (!w) return;
    const i = Math.round(el.scrollLeft / w);
    if (i !== index) setIndex(i);
  };

  const goTo = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const slotsWithDots = slots.filter(slot => slotsWithImages.has(slot));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={scrollRef} onScroll={onScroll} style={{
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
        msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {slots.map((slot, i) => (
          <div key={slot} style={{
            flex: '0 0 100%', display: 'grid', placeItems: 'center',
            scrollSnapAlign: 'center', padding: '8px 0',
          }}>
            <FoodImage recipeId={recipeId} size={size} slotIdSuffix={`-${slot}`} readonly />
          </div>
        ))}
        {onAddSlot && (
          <div style={{
            flex: '0 0 100%', display: 'grid', placeItems: 'center',
            scrollSnapAlign: 'center', padding: '8px 0',
          }}>
            <button onClick={onAddSlot} style={{
              width: size, height: size, borderRadius: '50%',
              border: '2px dashed var(--line-strong)',
              background: 'var(--surface-sunken)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', gap: 8,
              fontFamily: 'inherit', color: 'var(--ink-soft)',
            }}>
              <IconPlus size={28} strokeWidth={2.2}/>
              <span style={{ fontSize: 'var(--t-caption)', fontWeight: 700 }}>הוסיפו תמונה</span>
            </button>
          </div>
        )}
      </div>
      {/* dots — only when more than 1 slot actually has an image */}
      {slotsWithDots.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center',
          marginTop: 4,
        }}>
          {slots.map((slot, i) => slotsWithImages.has(slot) ? (
            <button key={i} onClick={() => goTo(i)} aria-label={`תמונה ${i+1}`}
              style={{
                width: i === index ? 22 : 7, height: 7, borderRadius: 'var(--r-pill)',
                background: i === index ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.5)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'width .25s, background .25s',
              }}/>
          ) : null)}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FavHeart — heart with pop/burst animation when toggled
// ───────────────────────────────────────────────────────────
function FavHeart({ filled }) {
  const [burst, setBurst] = useState(false);
  const prev = useRef(filled);
  useEffect(() => {
    if (filled && !prev.current) {
      setBurst(true);
      const t = setTimeout(() => setBurst(false), 700);
      return () => clearTimeout(t);
    }
    prev.current = filled;
  }, [filled]);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <IconHeart filled={filled} size={20} strokeWidth={2.2} style={{
        transition: 'transform .25s cubic-bezier(.2,1.4,.4,1)',
        transform: burst ? 'scale(1.35)' : (filled ? 'scale(1.05)' : 'scale(1)'),
      }} />
      {burst && (
        <span style={{
          position: 'absolute', inset: -10, pointerEvents: 'none',
        }}>
          {[0,1,2,3,4,5].map(i => {
            const angle = (i * 60) * Math.PI / 180;
            return (
              <span key={i} style={{
                position: 'absolute', left: '50%', top: '50%',
                width: 4, height: 4, borderRadius: 'var(--r-pill)', background: 'var(--brand-strong)',
                transform: `translate(-50%,-50%) translate(${Math.cos(angle)*22}px,${Math.sin(angle)*22}px) scale(0)`,
                animation: 'pop .6s cubic-bezier(.2,.9,.4,1) forwards',
              }} />
            );
          })}
        </span>
      )}
      <style>{`@keyframes pop{0%{transform:translate(-50%,-50%) scale(0);opacity:1}100%{transform:translate(calc(-50% + var(--dx,0px)), calc(-50% + var(--dy,0px))) scale(1);opacity:0}}`}</style>
    </span>
  );
}

// ───────────────────────────────────────────────────────────
// BottomNav — three pill buttons floating above content
// ───────────────────────────────────────────────────────────
function BottomNav({ active, onChange, onAdd, accent = 'var(--brand-strong)' }) {
  const items = [
    { id: 'home', icon: IconHome, label: 'בית' },
    { id: 'book', icon: IconBook, label: 'ספר' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 18, left: 18, right: 18, zIndex: 5,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
    <div style={{
      flex: 1,
      background: 'var(--glass)',
      backdropFilter: 'blur(20px) saturate(160%)',
      borderRadius: 'var(--r-pill)',
      boxShadow: 'var(--e3)',
      padding: 6,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    }}>
      {items.map(it => {
        const isActive = active === it.id;
        const I = it.icon;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} aria-label={it.label}
            style={{
              flex: 1, height: 46, border: 'none', cursor: 'pointer', background: 'transparent',
              borderRadius: 'var(--r-pill)', position: 'relative', minWidth: 0, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              color: isActive ? 'var(--bg)' : 'var(--ink)',
              fontWeight: 700, fontSize: 'var(--t-small)',
              transition: 'color .2s',
            }}>
            {isActive && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 'var(--r-pill)', background: accent, zIndex: -1,
                boxShadow: `0 8px 18px -6px ${accent}`,
                animation: 'navPop .35s cubic-bezier(.2,1.4,.4,1)',
              }} />
            )}
            <I size={20} strokeWidth={isActive ? 2.4 : 2}/>
            {isActive && <span style={{ whiteSpace: 'nowrap' }}>{it.label}</span>}
          </button>
        );
      })}
      <style>{`@keyframes navPop{0%{transform:scale(.6);opacity:.4}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
    <button onClick={onAdd} aria-label="מתכון חדש"
      style={{
        width: 58, height: 58, flexShrink: 0, borderRadius: 'var(--r-pill)',
        border: 'none', cursor: 'pointer', background: accent, color: 'var(--on-brand)',
        boxShadow: 'var(--e3)', display: 'grid', placeItems: 'center',
      }}>
      <IconPlus size={26} strokeWidth={2.6}/>
    </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// CategoryDropdown — multi-select filter menu.
// `selected` is an array of category ids; an empty array means
// "all". Opens a styled popover with checkable rows.
// ───────────────────────────────────────────────────────────
function CategoryDropdown({ selected = [], onToggle, onClear, categories: catsProp, counts = {}, onAdd, onManage, total = 0 }) {
  const cats = (catsProp || CATEGORIES).filter(c => c.id !== 'all');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const chosen = cats.filter(c => selected.includes(c.id));
  const label = chosen.length === 0
    ? 'כל הקטגוריות'
    : chosen.length === 1
      ? chosen[0].label
      : `${chosen[0].label} +${chosen.length - 1}`;
  const emojis = chosen.length ? chosen.slice(0, 3).map(c => c.emoji).join(' ') : '🍽️';

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: '1 1 auto', minWidth: 0 }}>
      <button onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox" aria-expanded={open}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '0 14px 0 12px', height: 44, borderRadius: 'var(--r-pill)',
          background: open || chosen.length ? 'var(--ink)' : 'var(--glass)',
          color: open || chosen.length ? 'var(--bg)' : 'var(--ink)',
          boxShadow: open ? 'var(--e2)' : 'var(--e1)',
          transition: 'background .2s, color .2s, box-shadow .2s',
        }}>
        <span style={{ fontSize: 'var(--t-body)', lineHeight: 1, flexShrink: 0 }}>{emojis}</span>
        <span style={{
          fontSize: 'var(--t-small)', fontWeight: 700, flex: 1, textAlign: 'start',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</span>
        {chosen.length > 1 && (
          <span style={{
            fontSize: 'var(--t-caption)', fontWeight: 800, borderRadius: 'var(--r-pill)', padding: '2px 7px',
            background: 'var(--surface-sunken)', flexShrink: 0,
          }}>{chosen.length}</span>
        )}
        <span style={{
          display: 'grid', placeItems: 'center', flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .22s',
        }}><IconChevronDown size={16} strokeWidth={2.4}/></span>
      </button>

      {open && (
        <div role="listbox" style={{
          position: 'absolute', top: 52, insetInlineStart: 0, minWidth: '100%', width: 'max(100%, 230px)',
          background: 'var(--glass-strong)', backdropFilter: 'blur(18px) saturate(160%)',
          borderRadius: 'var(--r-lg)', zIndex: 40, overflow: 'hidden',
          boxShadow: 'var(--e3)',
          animation: 'ddIn .2s cubic-bezier(.2,1.1,.4,1)', transformOrigin: 'top center',
        }}>
          <div className="scroll-y" style={{ maxHeight: 300, padding: 6 }}>
            <DropRow emoji="🍽️" label="הכל" count={total} checked={selected.length === 0}
              onClick={() => { onClear(); }} />
            <div style={{ height: 1, background: 'var(--surface-sunken)', margin: '5px 12px' }}/>
            {cats.map(c => (
              <DropRow key={c.id} emoji={c.emoji} label={c.label} count={counts[c.id] || 0}
                checked={selected.includes(c.id)} onClick={() => onToggle(c.id)}/>
            ))}
            {cats.length === 0 && (
              <div style={{ padding: '14px 14px', fontSize: 'var(--t-small)', color: 'var(--ink-soft)', textAlign: 'center' }}>
                אין עדיין קטגוריות
              </div>
            )}
          </div>
          {(onAdd || onManage) && (
            <div style={{
              display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--line)',
              background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
            }}>
              {onAdd && (
                <button onClick={() => { setOpen(false); onAdd(); }} style={ddFootBtn}>
                  <IconPlus size={14} strokeWidth={2.6}/> קטגוריה
                </button>
              )}
              {onManage && (
                <button onClick={() => { setOpen(false); onManage(); }} style={ddFootBtn}>
                  <IconEdit size={13} strokeWidth={2.4}/> ניהול
                </button>
              )}
            </div>
          )}
          <style>{`@keyframes ddIn{0%{opacity:0;transform:translateY(-8px) scale(.97)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      )}
    </div>
  );
}

const ddFootBtn = {
  flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  padding: '9px 10px', borderRadius: 'var(--r-pill)', background: 'var(--glass)',
  color: 'var(--ink)', fontSize: 'var(--t-caption)', fontWeight: 700,
  boxShadow: 'var(--e1)',
};

function DropRow({ emoji, label, count, checked, onClick }) {
  return (
    <button role="option" aria-selected={checked} onClick={onClick}
      style={{
        width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'start',
        padding: '9px 10px', borderRadius: 'var(--r-sm)', background: checked ? 'color-mix(in srgb, var(--brand) 24%, transparent)' : 'transparent',
        color: 'var(--ink)', transition: 'background .15s',
      }}>
      <span style={{
        width: 30, height: 30, borderRadius: 'var(--r-sm)', flexShrink: 0,
        display: 'grid', placeItems: 'center', fontSize: 'var(--t-body)',
        background: checked ? 'var(--surface-raised)' : 'var(--surface-sunken)',
      }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 'var(--t-small)', fontWeight: checked ? 800 : 600, minWidth: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink-soft)', flexShrink: 0 }}>{count}</span>
      <span style={{
        width: 20, height: 20, borderRadius: 7, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: checked ? 'var(--ink)' : 'transparent',
        boxShadow: checked ? 'none' : 'inset 0 0 0 2px var(--line-strong)',
        color: 'var(--bg)', transition: 'background var(--dur-fast)',
      }}>{checked && <IconCheck size={12} strokeWidth={3}/>}</span>
    </button>
  );
}

// ───────────────────────────────────────────────────────────
// ManageCategoriesSheet — edit emoji/name + add + delete
// ───────────────────────────────────────────────────────────
const CAT_EMOJIS_ALL = [
  '🥩','🐟','🥕','🥑','🍝','🍲','🌮','🍕','🥞','🍜','🥘','🧆','🥙','🍳',
  '🍰','🍪','🧁','🍞','🥗','🫐','🧀','🥨','🍱','🥦','🍅','🧅','🧄','🥔',
  '🌽','🥒','🍄','🌿','🥬','🫑','🍠','🥚','🍳','🥛','🧈','🥓','🍗','🍖',
  '🦐','🍣','🍱','🌯','🫔','🥫','🍛','🫕','🌭','🍔','🍟','🫓','🍿','🍦',
  '🎂','🍮','🍭','🍫','🍩','🍯','🧂','🫙','🍷','☕','🍵','🧋','🥤','🍺',
  '🥜','🌰','🍋','🍊','🍎','🍇','🍓','🍒','🍌','🍉','🥝','🍈','🍐','🥭',
];

function ManageCategoriesSheet({ categories, onEdit, onDelete, onAdd, onClose }) {
  const { useState: uS } = React;
  const [editingEmoji, setEditingEmoji] = uS(null); // catId whose emoji picker is open
  const [addMode, setAddMode] = uS(false);
  const [newName, setNewName] = uS('');
  const [newEmoji, setNewEmoji] = uS('🍽️');

  const confirmAdd = () => {
    const n = newName.trim();
    if (!n) return;
    onAdd({ id: `cat_${Date.now().toString(36)}`, label: n, emoji: newEmoji });
    setNewName(''); setNewEmoji('🍽️'); setAddMode(false);
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 55,
      background: 'var(--overlay)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--surface)',
        borderRadius: '28px 28px 0 0',
        padding: '24px 22px 40px',
        boxShadow: 'var(--e3)',
        maxHeight: '80vh', overflowY: 'auto',
        animation: 'catSlide .35s cubic-bezier(.2,1.2,.4,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--t-heading)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>ניהול קטגוריות</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 'var(--t-title)', color: 'var(--ink-soft)', cursor: 'pointer' }}>×</button>
        </div>

        {/* Existing categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, flexDirection: 'row-reverse',
                background: 'var(--glass)', borderRadius: 'var(--r-md)', padding: '12px 14px',
                boxShadow: 'var(--e1)',
              }}>
                {/* Emoji button — opens picker */}
                <button onClick={() => setEditingEmoji(editingEmoji === cat.id ? null : cat.id)}
                  style={{
                    width: 44, height: 44, borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                    background: editingEmoji === cat.id ? 'var(--ink)' : 'var(--surface-sunken)',
                    fontSize: 'var(--t-title)', display: 'grid', placeItems: 'center',
                    flexShrink: 0, transition: 'all .15s',
                  }}>{cat.emoji}</button>
                <span style={{ flex: 1, fontSize: 'var(--t-body)', fontWeight: 700, color: 'var(--ink)', textAlign: 'right' }}>{cat.label}</span>
                <button onClick={() => onDelete(cat.id)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                    background: 'var(--danger-soft)', color: 'var(--danger)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
              {/* Inline emoji picker */}
              {editingEmoji === cat.id && (
                <div style={{
                  marginTop: 8, background: 'var(--surface-raised)', borderRadius: 'var(--r-md)', padding: 12,
                  boxShadow: 'var(--e2)',
                  display: 'flex', flexWrap: 'wrap', gap: 6, flexDirection: 'row-reverse',
                }}>
                  {CAT_EMOJIS_ALL.map(e => (
                    <button key={e} onClick={() => { onEdit(cat.id, { emoji: e }); setEditingEmoji(null); }}
                      style={{
                        width: 40, height: 40, border: 'none', borderRadius: 'var(--r-sm)', fontSize: 'var(--t-title)',
                        cursor: 'pointer', background: e === cat.emoji ? 'var(--ink)' : 'var(--surface-sunken)',
                        transition: 'all .12s',
                      }}>{e}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        {!addMode ? (
          <button onClick={() => setAddMode(true)} style={{
            width: '100%', border: '1.5px dashed var(--line-strong)', borderRadius: 'var(--r-md)',
            padding: '12px 0', cursor: 'pointer', background: 'transparent',
            fontFamily: 'inherit', fontSize: 'var(--t-small)', fontWeight: 700, color: 'var(--ink-soft)',
          }}>+ קטגוריה חדשה</button>
        ) : (
          <div style={{ background: 'var(--glass)', borderRadius: 'var(--r-md)', padding: 16 }}>
            <div style={{ fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 10, letterSpacing: '.08em' }}>בחרי אמוג׳י</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexDirection: 'row-reverse', marginBottom: 14 }}>
              {CAT_EMOJIS_ALL.slice(0, 24).map(e => (
                <button key={e} onClick={() => setNewEmoji(e)} style={{
                  width: 38, height: 38, border: 'none', borderRadius: 'var(--r-sm)', fontSize: 'var(--t-heading)',
                  cursor: 'pointer', background: newEmoji === e ? 'var(--ink)' : 'var(--surface-sunken)',
                  transition: 'all .12s',
                }}>{e}</button>
              ))}
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmAdd()}
              placeholder="שם הקטגוריה" autoFocus
              style={{
                width: '100%', border: 'none', borderRadius: 'var(--r-sm)', padding: '10px 14px',
                fontSize: 'var(--t-body)', background: 'var(--surface-sunken)', color: 'var(--ink)',
                fontFamily: 'inherit', outline: 'none', textAlign: 'right',
                marginBottom: 10, boxSizing: 'border-box',
              }}/>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmAdd} disabled={!newName.trim()} style={{
                flex: 1, border: 'none', borderRadius: 'var(--r-sm)', padding: '11px 0', cursor: 'pointer',
                background: newName.trim() ? 'var(--ink)' : 'var(--line)',
                color: newName.trim() ? 'var(--bg)' : 'var(--ink-soft)', fontFamily: 'inherit', fontWeight: 700,
              }}>הוסיפי</button>
              <button onClick={() => setAddMode(false)} style={{
                flex: 1, border: 'none', borderRadius: 'var(--r-sm)', padding: '11px 0', cursor: 'pointer',
                background: 'var(--surface-sunken)', color: 'var(--ink-soft)', fontFamily: 'inherit', fontWeight: 700,
              }}>ביטול</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// AddCategorySheet — bottom sheet for creating a new category
// ───────────────────────────────────────────────────────────
const CAT_EMOJIS = ['🥩','🐟','🥕','🥑','🍝','🍲','🌮','🍕','🥞','🍜','🥘','🧆','🥙','🍳','🍰','🍪','🧁','🍞','🥗','🫐','🧀','🥨','🍱','🥦'];

function AddCategorySheet({ onAdd, onCancel }) {
  const { useState: uS } = React;
  const [name, setName] = uS('');
  const [emoji, setEmoji] = uS('🍽️');

  const confirm = () => {
    const n = name.trim();
    if (!n) return;
    onAdd({ id: `cat_${Date.now().toString(36)}`, label: n, emoji });
  };

  return (
    <div onClick={onCancel} style={{
      position: 'absolute', inset: 0, zIndex: 55,
      background: 'var(--overlay)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--surface)',
        borderRadius: '28px 28px 0 0',
        padding: '24px 22px 40px',
        boxShadow: 'var(--e3)',
        animation: 'catSlide .35s cubic-bezier(.2,1.2,.4,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 'var(--t-heading)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>קטגוריה חדשה</h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 'var(--t-title)', color: 'var(--ink-soft)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 10, letterSpacing: '.08em' }}>בחרי אמוג׳י</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexDirection: 'row-reverse' }}>
            {CAT_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{
                width: 42, height: 42, border: 'none', borderRadius: 'var(--r-sm)', fontSize: 'var(--t-title)',
                cursor: 'pointer',
                background: emoji === e ? 'var(--ink)' : 'var(--surface-sunken)',
                boxShadow: emoji === e ? 'var(--e1)' : 'none',
                transition: 'all .15s',
              }}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8, letterSpacing: '.08em' }}>שם הקטגוריה</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirm()}
            placeholder="לדוגמה: נשנושים, ממרחים…"
            autoFocus
            style={{
              width: '100%', border: 'none', borderRadius: 'var(--r-md)',
              padding: '12px 16px', fontSize: 'var(--t-body)',
              background: 'var(--surface-sunken)', color: 'var(--ink)',
              fontFamily: 'inherit', outline: 'none', textAlign: 'right',
            }}
          />
        </div>

        <button onClick={confirm} disabled={!name.trim()} style={{
          width: '100%', border: 'none', borderRadius: 'var(--r-md)',
          padding: '14px 0',
          background: name.trim() ? 'var(--ink)' : 'var(--line)',
          color: name.trim() ? 'var(--bg)' : 'var(--ink-soft)',
          fontSize: 'var(--t-body)', fontWeight: 700,
          fontFamily: 'var(--font-display)', cursor: name.trim() ? 'pointer' : 'default',
          transition: 'all .2s',
        }}>הוסיפי קטגוריה</button>
      </div>
      <style>{`@keyframes catSlide{0%{opacity:0;transform:translateY(60px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// RecipeCardSkeleton — placeholder while recipes load
// ───────────────────────────────────────────────────────────
function RecipeCardSkeleton() {
  const cardH   = 168;
  const imgSize = 198;
  const imgPoke = Math.round(imgSize * 0.22);
  return (
    <div style={{ position: 'relative', width: '100%', animation: 'skelPulse 1.4s ease-in-out infinite' }}>
      <div style={{
        borderRadius: 'var(--radius-card)', minHeight: cardH,
        background: 'var(--glass)',
        boxShadow: 'var(--shadow-card)', overflow: 'visible',
      }}>
        <div style={{
          position: 'relative', height: cardH, display: 'flex', flexDirection: 'row-reverse',
          padding: '18px 24px', gap: 8, alignItems: 'center',
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 24, width: '55%', borderRadius: 8, background: 'var(--surface-sunken)' }}/>
            <div style={{ height: 13, width: '75%', borderRadius: 6, background: 'var(--surface-sunken)' }}/>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ height: 26, width: 64, borderRadius: 'var(--r-pill)', background: 'var(--surface-sunken)' }}/>
              <div style={{ height: 26, width: 44, borderRadius: 'var(--r-pill)', background: 'var(--surface-sunken)' }}/>
            </div>
          </div>
          <div style={{ width: imgSize - imgPoke, height: imgSize, flexShrink: 0, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '50%', insetInlineStart: -imgPoke,
              transform: 'translateY(-50%)',
              width: imgSize, height: imgSize, borderRadius: '50%',
              background: 'var(--surface-sunken)',
            }}/>
          </div>
        </div>
      </div>
      <style>{`@keyframes skelPulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// RecipeCardGrid — 2-column square card with image poking out
// from the top center. Used in 'grid' density mode.
// ───────────────────────────────────────────────────────────
// Every tile in the grid is the same size, whether or not the recipe has a
// photo and whatever shape that photo is — a grid of different-sized cards
// reads as clutter.
const GRID_TILE_H = 178;
const GRID_CAPTION_H = 56;

function RecipeCardGrid({ recipe, onOpen, onToggleFav, index = 0 }) {
  const p = paletteOf(recipe.palette);
  const enabled = useAnimEnabled();
  const enterMs = useAnimMs(500);
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), enabled ? index * 55 : 0);
    return () => clearTimeout(t);
  }, []);
  useScrollPhysics(cardRef, { tiltDeg: 5, scaleAmt: 0.03, fadeAmt: 0.1, skewMax: 2 });

  const photo = useRecipePhoto(recipe);
  const slotsReady = useImageSlotsReady();
  const hasPhoto = !!photo || !slotsReady;
  const slotSuffix = `-${recipe.mainSlot || (recipe.gallery && recipe.gallery[0]) || 'main'}`;

  return (
    <div style={{
      height: GRID_TILE_H,
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0) scale(1)' : 'translateY(22px) scale(.96)',
      transition: `opacity ${enterMs}ms ease, transform ${enterMs}ms cubic-bezier(.2,.9,.25,1.1)`,
    }}>
      <div ref={cardRef} onClick={() => onOpen(recipe)} style={{
        height: '100%', position: 'relative', cursor: 'pointer',
        borderRadius: 'var(--r-lg)', overflow: 'hidden',
        boxShadow: 'var(--e2)',
        background: `linear-gradient(160deg, ${p.bg} 0%, ${p.bg2 || p.bg} 100%)`,
        display: 'flex', flexDirection: 'column',
        transition: 'transform var(--dur-fast) cubic-bezier(.2,.8,.2,1.05)',
      }}>
        {hasPhoto && (
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <RecipePhoto url={photo} palette={p} radius={0} alt=""/>
          </div>
        )}

        {/* With a photo the title is a caption strip under it; with no photo
            it is the whole tile, so it gets to be large and centred. */}
        <div style={{
          height: hasPhoto ? GRID_CAPTION_H : '100%',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: hasPhoto ? '0 12px' : '36px 14px',
          fontWeight: 700, color: p.ink,
          fontSize: hasPhoto ? 'var(--t-small)' : 'var(--t-heading)',
          lineHeight: hasPhoto ? 1.28 : 1.3,
        }}>
          <span style={{
            display: '-webkit-box', WebkitLineClamp: hasPhoto ? 2 : 4,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
            textAlign: 'center', width: '100%', textWrap: 'balance',
          }}>{recipe.title}</span>
        </div>

        <button type="button" onClick={e => { e.stopPropagation(); onToggleFav(recipe.id); }}
          aria-label="מועדפים"
          style={{
            position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 3,
            width: 32, height: 32, borderRadius: 'var(--r-pill)', padding: 0, lineHeight: 0,
            background: 'var(--glass)', border: 'none', backdropFilter: 'blur(6px)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            color: recipe.favorite ? 'var(--brand-strong)' : p.ink,
            boxShadow: 'var(--e1)',
          }}>
          <FavHeart filled={recipe.favorite}/>
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// ConfirmDialog — reusable destructive-action confirmation
// emoji: big icon shown in badge, confirmColor: button color
// ───────────────────────────────────────────────────────────
function ConfirmDialog({ emoji = '🗑️', title, body, confirmLabel = 'אישור', cancelLabel = 'ביטול', danger = true, onConfirm, onCancel }) {
  // The colour comes from the tone, never from a caller passing a hex — a
  // hardcoded white on a state colour is unreadable the moment the theme
  // flips, which is exactly what happened here.
  const confirmColor = danger ? 'var(--danger)' : 'var(--brand-strong)';
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'var(--overlay)',
      backdropFilter: 'blur(14px)',
      display: 'grid', placeItems: 'center',
      padding: 24,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)',
        borderRadius: 36, padding: '36px 28px 28px',
        maxWidth: 340, width: '100%',
        boxShadow: 'var(--e3)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
        textAlign: 'center',
        animation: 'delPop .38s cubic-bezier(.2,1.35,.4,1)',
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: 'var(--r-pill)',
          background: `${confirmColor}18`,
          display: 'grid', placeItems: 'center',
          fontSize: 36,
          boxShadow: 'var(--e2)',
        }}>{emoji}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-title)', fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
          {body && <p style={{ margin: 0, fontSize: 'var(--t-body)', color: 'var(--ink-soft)', lineHeight: 1.6 }}>{body}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <Button tone="quiet" size="lg" onClick={onCancel} style={{ flex: 1 }}>{cancelLabel}</Button>
          <Button tone={danger ? 'danger' : 'primary'} size="lg" onClick={onConfirm} style={{ flex: 1.5 }}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AnimSpeedContext, useAnimMs, useAnimEnabled, useScrollPhysics,
  FoodImage, RecipePhoto, getRecipePhoto, useRecipePhoto, useImageSlotsReady, ImageGallery, RecipeCardSkeleton,
  RecipeCard, RecipeCardGrid, FavHeart, prefersReducedMotion,
  BottomNav, CategoryDropdown, AddCategorySheet, ManageCategoriesSheet,
  ConfirmDialog,
});
