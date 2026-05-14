// components.jsx — reusable building blocks
const { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useContext, createContext } = React;

// ───────────────────────────────────────────────────────────
// Animation speed context (slow / normal / fast / off)
// ───────────────────────────────────────────────────────────
const AnimSpeedContext = createContext('normal');
const SPEED_MULTIPLIER = { slow: 1.7, normal: 1, fast: 0.55, off: 0 };
function useAnimMs(base) {
  const speed = useContext(AnimSpeedContext);
  const m = SPEED_MULTIPLIER[speed] ?? 1;
  return Math.round(base * m);
}
function useAnimEnabled() {
  return useContext(AnimSpeedContext) !== 'off';
}

// ───────────────────────────────────────────────────────────
// Tilt wrapper — perspective tilt on pointer move / scroll
// ───────────────────────────────────────────────────────────
function Tilt({ children, max = 8, scale = 1.0, style, perspective = 1100, ...rest }) {
  const ref = useRef(null);
  const rafRef = useRef(0);
  const enabled = useAnimEnabled();

  const apply = useCallback((rx, ry, s = 1) => {
    if (!ref.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.style.transform =
        `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
    });
  }, [perspective]);

  const onMove = (e) => {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    apply((0.5 - py) * max, (px - 0.5) * max, scale);
  };
  const onLeave = () => apply(0, 0, 1);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{
        transformStyle: 'preserve-3d',
        transition: 'transform .4s cubic-bezier(.2,.8,.2,1)',
        willChange: 'transform',
        ...style,
      }} {...rest}>
      {children}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FoodArt — stylized SVG illustration per recipe (default art
// before user drops a real photo via the slot).
// ───────────────────────────────────────────────────────────
function FoodArt({ id, size = 200 }) {
  const styleBase = { width: size, height: size, display: 'block' };
  switch (id) {
    case 'cheesecake': return (
      <svg viewBox="0 0 200 200" style={styleBase}>
        <defs>
          <radialGradient id="cc-g" cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="#fffbe9"/><stop offset="1" stopColor="#ffe89d"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="86" fill="url(#cc-g)"/>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#e08c2c" strokeWidth="14"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <line key={a} x1="100" y1="100"
            x2={100 + 80*Math.cos(a*Math.PI/180)}
            y2={100 + 80*Math.sin(a*Math.PI/180)}
            stroke="#fff" strokeWidth="4" opacity="0.85"/>
        ))}
        <circle cx="60"  cy="70"  r="6" fill="#fff094" stroke="#e0a83a" strokeWidth="2"/>
        <circle cx="140" cy="135" r="7" fill="#fff094" stroke="#e0a83a" strokeWidth="2"/>
        <path d="M70 130 q4 -8 12 -4" stroke="#7bbb4a" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <path d="M120 60 q6 -4 10 4" stroke="#7bbb4a" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </svg>
    );
    case 'shakshuka': return (
      <svg viewBox="0 0 200 200" style={styleBase}>
        <circle cx="100" cy="100" r="86" fill="#c84a26"/>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#7a2912" strokeWidth="10"/>
        <ellipse cx="78"  cy="80"  rx="20" ry="16" fill="#fff7d9"/>
        <ellipse cx="78"  cy="80"  rx="9"  ry="7"  fill="#ffc34a"/>
        <ellipse cx="130" cy="95"  rx="22" ry="17" fill="#fff7d9"/>
        <ellipse cx="130" cy="95"  rx="10" ry="8"  fill="#ffc34a"/>
        <ellipse cx="95"  cy="135" rx="20" ry="15" fill="#fff7d9"/>
        <ellipse cx="95"  cy="135" rx="9"  ry="7"  fill="#ffc34a"/>
        <path d="M50 50 q5 4 0 10" stroke="#2c8a52" strokeWidth="3" fill="none"/>
        <path d="M155 130 q-5 4 0 10" stroke="#2c8a52" strokeWidth="3" fill="none"/>
      </svg>
    );
    case 'macaroons': return (
      <svg viewBox="0 0 200 200" style={styleBase}>
        <circle cx="100" cy="100" r="86" fill="#f0e8df"/>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#a78b6f" strokeWidth="8"/>
        {[
          {x:65, y:75, c:'#ff7b6e'},
          {x:115,y:65, c:'#b6e07a'},
          {x:140,y:105,c:'#ffd255'},
          {x:75, y:120,c:'#f7a8b8'},
          {x:115,y:125,c:'#c9b8e8'},
        ].map((m, i) => (
          <g key={i}>
            <ellipse cx={m.x} cy={m.y-6} rx="22" ry="9" fill={m.c}/>
            <rect x={m.x-22} y={m.y-6} width="44" height="8" fill="#fff5d8"/>
            <ellipse cx={m.x} cy={m.y+6} rx="22" ry="9" fill={m.c}/>
          </g>
        ))}
      </svg>
    );
    case 'greek-salad': return (
      <svg viewBox="0 0 200 200" style={styleBase}>
        <circle cx="100" cy="100" r="86" fill="#f8f4ea"/>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#7bbb4a" strokeWidth="10"/>
        <rect x="80" y="85" width="40" height="30" fill="#fff" stroke="#cfc7b3" strokeWidth="2"/>
        <circle cx="60"  cy="75"  r="11" fill="#e74c3c"/>
        <circle cx="135" cy="65"  r="10" fill="#e74c3c"/>
        <circle cx="145" cy="125" r="10" fill="#7bbb4a"/>
        <circle cx="55"  cy="125" r="9"  fill="#7bbb4a"/>
        <circle cx="115" cy="140" r="8"  fill="#3a2a4a"/>
        <circle cx="75"  cy="55"  r="7"  fill="#3a2a4a"/>
        <path d="M100 50 q4 4 0 10" stroke="#2c8a52" strokeWidth="3" fill="none"/>
      </svg>
    );
    case 'mushroom-pasta': return (
      <svg viewBox="0 0 200 200" style={styleBase}>
        <circle cx="100" cy="100" r="86" fill="#fff4e0"/>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#a07a4a" strokeWidth="10"/>
        {/* pasta swirls */}
        <g stroke="#f0c060" strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M60 70 q15 20 0 40 q-15 20 0 40"/>
          <path d="M85 60 q15 22 0 45 q-12 18 0 35"/>
          <path d="M115 60 q15 20 0 42 q-12 20 0 40"/>
          <path d="M140 70 q15 22 0 42 q-15 18 0 38"/>
        </g>
        {/* mushrooms */}
        <g>
          <ellipse cx="72" cy="115" rx="14" ry="8" fill="#8b5a3c"/>
          <rect x="68" y="115" width="8" height="9" fill="#e8d4b8"/>
        </g>
        <g>
          <ellipse cx="125" cy="100" rx="16" ry="9" fill="#a07252"/>
          <rect x="121" y="100" width="8" height="11" fill="#e8d4b8"/>
        </g>
        <circle cx="100" cy="140" r="4" fill="#2c8a52"/>
        <circle cx="90" cy="60" r="3" fill="#2c8a52"/>
      </svg>
    );
    case 'cupcakes': return (
      <svg viewBox="0 0 200 200" style={styleBase}>
        <circle cx="100" cy="100" r="86" fill="#3a2a4a"/>
        <circle cx="100" cy="100" r="86" fill="none" stroke="#1f1530" strokeWidth="8"/>
        {[
          {x:65, y:80,  c:'#f7a8b8'},
          {x:105,y:70,  c:'#c9b8e8'},
          {x:140,y:90,  c:'#fff094'},
          {x:75, y:125, c:'#9adfb1'},
          {x:115,y:130, c:'#ffb494'},
          {x:145,y:135, c:'#f7a8b8'},
        ].map((m,i) => (
          <g key={i}>
            <ellipse cx={m.x} cy={m.y+10} rx="14" ry="6" fill="#6e4b2a"/>
            <path d={`M${m.x-12} ${m.y+8} Q${m.x} ${m.y-14} ${m.x+12} ${m.y+8} Z`} fill={m.c}/>
            <circle cx={m.x-4} cy={m.y-6} r="2" fill="#fff" opacity=".6"/>
          </g>
        ))}
      </svg>
    );
    default: return (
      <svg viewBox="0 0 200 200" style={styleBase}>
        <circle cx="100" cy="100" r="86" fill="#fff" stroke="#aaa" strokeWidth="6"/>
      </svg>
    );
  }
}

// ───────────────────────────────────────────────────────────
// FoodImage — circular slot the user can drag a real photo into.
// Falls back to FoodArt SVG when empty.
// ───────────────────────────────────────────────────────────
function FoodImage({ recipeId, size = 200, slotIdSuffix = '' }) {
  const slotRef = useRef(null);
  useEffect(() => {
    // After image-slot mounts, hide its built-in text label so our SVG art
    // shows through cleanly when the slot is empty.
    const el = slotRef.current;
    if (!el || !el.shadowRoot) return;
    const restyle = () => {
      const sr = el.shadowRoot;
      if (!sr) return;
      // inject a style override
      if (!sr.querySelector('#__art_override')) {
        const s = document.createElement('style');
        s.id = '__art_override';
        s.textContent = `
          .empty .ph-label, .empty .ph-icon { display: none !important; }
          .empty .ph { background: transparent !important; border: none !important; }
        `;
        sr.appendChild(s);
      }
    };
    setTimeout(restyle, 50);
  }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        boxShadow: '0 14px 30px -10px rgba(0,0,0,.35), inset 0 -8px 18px rgba(0,0,0,.08)',
        overflow: 'hidden',
      }}>
        <FoodArt id={recipeId} size={size} />
        <image-slot ref={slotRef}
          id={`food-${recipeId}${slotIdSuffix}`}
          shape="circle"
          placeholder=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        ></image-slot>
      </div>
    </div>
  );
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
  const p = PALETTES[recipe.palette];
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

  // Card geometry — comfy: tall, the circle pokes out hard.
  // compact: thinner row, smaller protruding circle.
  const isCompact = density === 'compact';
  const cardH    = isCompact ? 116 : 168;
  const imgSize  = isCompact ? 132 : 198;
  const titleSize= isCompact ? 19 : 26;
  const descClamp= isCompact ? 1 : 2;
  const padX     = isCompact ? 20 : 24;
  // How far the circle reaches past the card's start edge (RTL = right).
  const imgPokeOut = Math.round(imgSize * (isCompact ? 0.18 : 0.22));

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
          background: 'linear-gradient(160deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,.04) 100%)',
          pointerEvents: 'none',
          overflow: 'hidden',
        }} />

        {/* RTL row: text on right, big circle photo on left poking out */}
        <div style={{
          position: 'relative', height: cardH, display: 'flex', flexDirection: 'row-reverse',
          padding: `${isCompact ? 14 : 18}px ${padX}px`, gap: 8, alignItems: 'center',
        }}>
          {/* text */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="display" style={{
              fontWeight: 700, fontSize: titleSize, lineHeight: 1.1, color: p.ink,
              textWrap: 'balance',
            }}>{recipe.title}</div>
            {!isCompact && (
              <div style={{
                fontSize: 13.5, lineHeight: 1.45,
                color: p.ink, opacity: .75, fontWeight: 400,
                display: '-webkit-box', WebkitLineClamp: descClamp, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{recipe.description}</div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: isCompact ? 2 : 4 }}>
              <Pill color={p.tag} ink={p.ink}>
                <IconClock size={12} strokeWidth={2.4} /> {recipe.time} ד׳
              </Pill>
              <Pill color={p.tag} ink={p.ink}>
                <IconUsers size={12} strokeWidth={2.4} /> {recipe.servings}
              </Pill>
            </div>
          </div>

          {/* circle photo — sits on the inline-START side (RTL → right) of
             the card and pokes OUT past that edge. */}
          <div style={{
            position: 'relative',
            width: imgSize - imgPokeOut, // space the row reserves
            height: imgSize,
            flexShrink: 0,
          }} data-shared-img={sharedId}>
            <div style={{
              position: 'absolute',
              top: '50%', insetInlineStart: -imgPokeOut, // poke OUT past the card's inline-start edge
              transform: 'translateY(-50%)',
              filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.22))',
            }}>
              <FoodImage recipeId={recipe.id} size={imgSize} />
            </div>
          </div>
        </div>

        {/* favorite button — anchored to the OPPOSITE side (left in RTL = inline-end) */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(recipe.id); }}
          aria-label="הוסף למועדפים"
          style={{
            position: 'absolute', top: 12, insetInlineEnd: 12,
            width: 36, height: 36, borderRadius: 999,
            display: 'grid', placeItems: 'center',
            background: 'rgba(255,255,255,.75)', backdropFilter: 'blur(6px)',
            border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,.12)',
            cursor: 'pointer', color: recipe.favorite ? '#e34466' : p.ink,
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

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={scrollRef} onScroll={onScroll} style={{
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }} className="scroll-y">
        {slots.map((slot, i) => (
          <div key={slot} style={{
            flex: '0 0 100%', display: 'grid', placeItems: 'center',
            scrollSnapAlign: 'center', padding: '8px 0',
          }}>
            <FoodImage recipeId={recipeId} size={size} slotIdSuffix={`-${slot}`} />
          </div>
        ))}
        {onAddSlot && (
          <div style={{
            flex: '0 0 100%', display: 'grid', placeItems: 'center',
            scrollSnapAlign: 'center', padding: '8px 0',
          }}>
            <button onClick={onAddSlot} style={{
              width: size, height: size, borderRadius: '50%',
              border: '2px dashed rgba(0,0,0,.25)',
              background: 'rgba(255,255,255,.4)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', gap: 8,
              fontFamily: 'inherit', color: 'var(--ink-soft)',
            }}>
              <IconPlus size={28} strokeWidth={2.2}/>
              <span style={{ fontSize: 12, fontWeight: 700 }}>הוסיפו תמונה</span>
            </button>
          </div>
        )}
      </div>
      {/* swipe hint arrows (only when >1) */}
      {slots.length > 1 && (
        <>
          <div style={{
            position: 'absolute', insetInlineStart: 4, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(0,0,0,.4)', pointerEvents: 'none',
          }}>
            <IconChevronLeft size={22} strokeWidth={2.4}/>
          </div>
          <div style={{
            position: 'absolute', insetInlineEnd: 4, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(0,0,0,.4)', pointerEvents: 'none',
          }}>
            <IconChevronRight size={22} strokeWidth={2.4}/>
          </div>
        </>
      )}
      {/* dots */}
      {slots.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, justifyContent: 'center',
          marginTop: 4,
        }}>
          {slots.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`תמונה ${i+1}`}
              style={{
                width: i === index ? 22 : 7, height: 7, borderRadius: 999,
                background: i === index ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.5)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'width .25s, background .25s',
              }}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Pill — small chip with icon
// ───────────────────────────────────────────────────────────
function Pill({ children, color = '#fff', ink = '#222', strong = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12.5, fontWeight: strong ? 700 : 600,
      color: ink,
      background: color,
      padding: '5px 10px', borderRadius: 999,
      boxShadow: '0 1px 0 rgba(255,255,255,.6) inset, 0 2px 4px rgba(0,0,0,.05)',
    }}>{children}</span>
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
                width: 4, height: 4, borderRadius: 999, background: '#e34466',
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
function BottomNav({ active, onChange, accent = '#e34466' }) {
  const items = [
    { id: 'home',      icon: IconHome,     label: 'בית' },
    { id: 'favorites', icon: IconHeart,    label: 'מועדפים' },
    { id: 'add',       icon: IconPlus,     label: 'הוספה' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 18, left: 18, right: 18, zIndex: 5,
      background: 'rgba(255,255,255,.85)',
      backdropFilter: 'blur(20px) saturate(160%)',
      borderRadius: 999,
      boxShadow: '0 12px 40px -10px rgba(64,33,50,.35), 0 1px 0 rgba(255,255,255,.7) inset',
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
              borderRadius: 999, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: isActive ? '#fff' : 'var(--ink)',
              fontWeight: 700, fontSize: 13,
              transition: 'color .2s',
            }}>
            {isActive && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 999, background: accent, zIndex: -1,
                boxShadow: `0 8px 18px -6px ${accent}`,
                animation: 'navPop .35s cubic-bezier(.2,1.4,.4,1)',
              }} />
            )}
            <I size={20} strokeWidth={isActive ? 2.4 : 2}/>
            {isActive && <span>{it.label}</span>}
          </button>
        );
      })}
      <style>{`@keyframes navPop{0%{transform:scale(.6);opacity:.4}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// CategoryStrip — horizontally scrolling pills
// ───────────────────────────────────────────────────────────
function CategoryStrip({ active, onChange }) {
  return (
    <div className="scroll-y" style={{
      display: 'flex', flexDirection: 'row-reverse', gap: 10,
      padding: '4px 22px 18px', overflowX: 'auto', overflowY: 'hidden',
      scrollbarWidth: 'none',
    }}>
      {CATEGORIES.map(c => {
        const isActive = active === c.id;
        return (
          <button key={c.id} onClick={() => onChange(c.id)}
            style={{
              flex: '0 0 auto',
              border: 'none', cursor: 'pointer',
              padding: '10px 16px', borderRadius: 999,
              fontSize: 14, fontWeight: 700,
              fontFamily: 'inherit',
              background: isActive ? 'var(--ink)' : 'rgba(255,255,255,.7)',
              color: isActive ? '#fff' : 'var(--ink)',
              boxShadow: isActive ? '0 8px 18px -6px rgba(0,0,0,.4)' : '0 2px 6px rgba(0,0,0,.07)',
              transition: 'all .2s',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <span style={{ fontSize: 16 }}>{c.emoji}</span>{c.label}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// StatusBar — top of phone screen, dynamic ink color
// ───────────────────────────────────────────────────────────
function StatusBar({ ink = '#2c1d27', time = '9:30' }) {
  return (
    <div style={{
      height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 22px', fontSize: 13, fontWeight: 600, color: ink, position: 'relative', flexShrink: 0,
    }}>
      <span style={{ flex: 1 }}>{time}</span>
      <div style={{
        position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)',
        width: 18, height: 18, borderRadius: '50%', background: '#1b1620',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill={ink}><path d="M8 11L.7 3.7a10.4 10.4 0 0 1 14.6 0L8 11z"/></svg>
        <svg width="14" height="14" viewBox="0 0 14 14" fill={ink}><path d="M13 13V1L1 13h12z"/></svg>
        <span style={{ fontSize: 12 }}>86%</span>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none" stroke={ink} strokeWidth="1.2">
          <rect x="1" y="1" width="18" height="9" rx="2"/>
          <rect x="2.5" y="2.5" width="14" height="6" rx="1" fill={ink} stroke="none"/>
          <rect x="20" y="3.5" width="1.5" height="4" rx=".5" fill={ink} stroke="none"/>
        </svg>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Phone frame — fixed-aspect device shell with status bar
// ───────────────────────────────────────────────────────────
function Phone({ children, statusInk = '#2c1d27', bg = 'transparent', width = 390, height = 844 }) {
  return (
    <div style={{
      width, height, borderRadius: 48,
      background: bg,
      boxShadow: '0 50px 100px -30px rgba(40,15,30,.55), 0 0 0 12px #1c1620, 0 0 0 13px #3a2e36',
      overflow: 'hidden', position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      <StatusBar ink={statusInk} />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 130, height: 5, borderRadius: 999, background: statusInk, opacity: .35,
        zIndex: 100, pointerEvents: 'none',
      }} />
    </div>
  );
}

Object.assign(window, {
  AnimSpeedContext, useAnimMs, useAnimEnabled, useScrollPhysics,
  Tilt, FoodArt, FoodImage, ImageGallery,
  RecipeCard, Pill, FavHeart,
  BottomNav, CategoryStrip, StatusBar, Phone,
});
