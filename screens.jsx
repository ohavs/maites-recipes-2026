// screens.jsx — full screen views

const { useState: uS, useRef: uR, useEffect: uE, useMemo: uM, useLayoutEffect: uLE } = React;

// ───────────────────────────────────────────────────────────
// HomeScreen — Maites brand bar + inline search + density
// toggle + categories + stacked cards (with bigger circles
// poking out of each card edge).
// ───────────────────────────────────────────────────────────
function HomeScreen({ recipes, recipesLoaded = true, onOpen, onToggleFav, density, onDensity, variant, category, onCategory, sharedKey, categories, onAddCategory }) {
  const [q, setQ] = uS('');
  const [searching, setSearching] = uS(false);

  const filtered = uM(() => {
    const qq = q.trim().toLowerCase();
    let r = recipes;
    if (category !== 'all') r = r.filter(x => x.category === category);
    if (!qq) return r;
    return r.filter(x =>
      x.title.toLowerCase().includes(qq)
      || (x.description || '').toLowerCase().includes(qq)
      || (x.ingredients || []).some(i => (i.name || '').toLowerCase().includes(qq))
    );
  }, [recipes, category, q]);

  // Only show categories that have at least one recipe
  const activeCats = uM(() => {
    const used = new Set(recipes.map(r => r.category).filter(Boolean));
    const all = categories || CATEGORIES;
    return [
      all.find(c => c.id === 'all') || { id: 'all', label: 'הכל', emoji: '🍽️' },
      ...all.filter(c => c.id !== 'all' && used.has(c.id)),
    ];
  }, [recipes, categories]);

  return (
    <div className="scroll-y" style={{ height: '100%', position: 'relative' }}>
      {/* Brand bar: just "Maites" + density toggle + inline search */}
      <div style={{
        padding: '14px 22px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <h1 className="display" data-comment-anchor="home-brand" style={{
          margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-.01em',
          color: 'var(--ink)', fontFamily: 'var(--font-display)',
        }}>Maites</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onDensity(density === 'compact' ? 'comfy' : 'compact')}
            aria-label="פריסה קומפקטית" title="פריסה"
            style={{
              width: 40, height: 40, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: density === 'compact' ? 'var(--ink)' : 'rgba(255,255,255,.85)',
              color: density === 'compact' ? '#fff' : 'var(--ink)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 6px 18px -6px rgba(64,33,50,.2)',
              transition: 'all .2s',
            }}>
            {density === 'compact' ? <IconGrid size={18} strokeWidth={2.2}/> : <IconRows size={18} strokeWidth={2.2}/>}
          </button>
          <button onClick={() => setSearching(s => !s)} aria-label="חיפוש"
            style={{
              width: 40, height: 40, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: searching ? 'var(--ink)' : 'rgba(255,255,255,.85)',
              color: searching ? '#fff' : 'var(--ink)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 6px 18px -6px rgba(64,33,50,.2)',
              transition: 'all .2s',
            }}>
            <IconSearch size={18} strokeWidth={2.2}/>
          </button>
        </div>
      </div>

      {/* Inline search input — expands when search is on */}
      <div style={{
        padding: '0 22px',
        maxHeight: searching ? 80 : 0,
        opacity: searching ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height .3s ease, opacity .25s ease, padding .25s ease',
        paddingTop: searching ? 10 : 0,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: 'var(--shadow-card)',
        }}>
          <IconSearch size={16} strokeWidth={2.2}/>
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus={searching}
            placeholder="מתכון, מצרך, או מילת מפתח…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', textAlign: 'right',
            }}/>
          {q && (
            <button onClick={() => setQ('')} style={{
              border: 'none', background: 'rgba(0,0,0,.06)', borderRadius: 999, width: 24, height: 24,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }}><IconClose size={12}/></button>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 0 4px' }}>
        <CategoryStrip active={category} onChange={onCategory} categories={activeCats} onAdd={onAddCategory}/>
      </div>

      <div style={{ padding: '0 18px 130px', display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 12 : 22 }}>
        {!recipesLoaded && (
          [1, 2, 3].map(i => <RecipeCardSkeleton key={i} density={density} />)
        )}
        {recipesLoaded && filtered.length === 0 && (
          <EmptyState text={q ? `אין תוצאות עבור "${q}"` : 'אין מתכונים בקטגוריה הזו עדיין'} emoji={q ? "🔍" : "🍽️"} />
        )}
        {recipesLoaded && filtered.map((r, i) => (
          <RecipeCard key={`${sharedKey}-${r.id}`}
            recipe={r} index={i}
            onOpen={onOpen}
            onToggleFav={onToggleFav}
            density={density}
            variant={variant}
            sharedId={r.id}
          />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// DetailScreen — sticky hero image with parallax (image
// "disappears" behind the recipe body as it scrolls up),
// swipeable image gallery, ingredients, notes, edit button.
// ───────────────────────────────────────────────────────────
function DetailScreen({ recipe, onClose, onToggleFav, onOpenSteps, onEdit, onDelete, onUpdateNotes, openMs = 380 }) {
  const p = PALETTES[recipe.palette];
  const scrollRef = uR(null);
  const [scrollY, setScrollY] = uS(0);
  const [mounted, setMounted] = uS(false);

  uE(() => { setMounted(true); }, []);

  const onScroll = (e) => setScrollY(e.target.scrollTop);

  const HERO_H = 360;          // hero panel height
  const BODY_OVERLAP = 32;     // how much body covers the hero by default

  // Parallax: as user scrolls up, the image translates up faster than the
  // hero (which is sticky), so the image appears to slide BEHIND the body.
  const imgTranslate = Math.min(scrollY * 0.45, HERO_H);
  const imgOpacity = 1 - Math.min(1, Math.max(0, scrollY - 60) / (HERO_H - 80));
  const decorOpacity = 1 - Math.min(1, scrollY / 180);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#fbeef2',
      transform: mounted ? 'translateY(0)' : 'translateY(40px)',
      opacity: mounted ? 1 : 0,
      transition: `transform ${openMs}ms cubic-bezier(.2,.9,.25,1.1), opacity ${Math.round(openMs*.6)}ms ease-out`,
    }}>
      {/* Single scrollable container. Hero is sticky so it stays in place
          while the body slides up over it via a negative top margin. */}
      <div ref={scrollRef} className="scroll-y" onScroll={onScroll}
        style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>

        {/* HERO — sticky at top of scroll, body slides over it */}
        <div style={{
          position: 'sticky', top: 0, height: HERO_H,
          background: p.bg,
          borderRadius: '0 0 36px 36px',
          overflow: 'hidden',
          zIndex: 1,
        }}>
          <div style={{ opacity: decorOpacity, transition: 'opacity .2s' }}>
            <DecorScatter palette={p}/>
          </div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 40,
            transform: `translateY(${-imgTranslate}px)`,
            transition: 'transform .05s linear',
            opacity: imgOpacity,
          }}>
            <ImageGallery recipeId={recipe.id}
              slots={recipe.gallery && recipe.gallery.length ? recipe.gallery : ['main']}
              size={250}
            />
          </div>
        </div>

        {/* BODY — slides up over the sticky hero */}
        <div style={{
          background: '#fbeef2',
          borderRadius: '32px 32px 0 0',
          position: 'relative',
          marginTop: -BODY_OVERLAP,
          zIndex: 2,
          padding: '26px 22px 180px',
          minHeight: '70vh',
          boxShadow: '0 -16px 32px -16px rgba(0,0,0,.12)',
        }}>
          <h1 className="display" data-comment-anchor="detail-title" style={{
            margin: 0, fontSize: 32, fontWeight: 700, color: 'var(--ink)',
            textWrap: 'balance',
          }}>{recipe.title}</h1>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Pill color={p.tag} ink={p.ink}><IconClock size={13} strokeWidth={2.4}/> {recipe.time} דקות</Pill>
            <Pill color={p.tag} ink={p.ink}><IconUsers size={13} strokeWidth={2.4}/> {recipe.servings} מנות</Pill>
            {recipe.cuisine && <Pill color={p.tag} ink={p.ink}>🍽 {recipe.cuisine}</Pill>}
          </div>

          {recipe.description && (
            <p style={{
              marginTop: 18, fontSize: 15.5, lineHeight: 1.55, color: 'var(--ink-soft)',
              fontWeight: 400,
            }}>{recipe.description}</p>
          )}

          {/* Ingredients */}
          <div style={{ marginTop: 26 }}>
            <SectionLabel ink={p.accent}>מצרכים</SectionLabel>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' }}>
              {(recipe.ingredients || []).map((ing, i) => (
                <IngredientRow key={i} ing={ing} palette={p} index={i}/>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 26 }}>
            <SectionLabel ink={p.accent}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconNote size={14} strokeWidth={2.2}/>
                הערות אישיות
              </span>
            </SectionLabel>
            <NotesEditor
              value={recipe.notes || ''}
              palette={p}
              onChange={(v) => onUpdateNotes(recipe.id, v)}
            />
          </div>

          {/* CTA */}
          <button onClick={() => onOpenSteps(recipe)}
            style={{
              marginTop: 28, width: '100%',
              border: 'none', cursor: 'pointer',
              padding: '20px 22px', borderRadius: 22,
              background: p.bg,
              color: p.ink,
              fontFamily: 'inherit', fontWeight: 700, fontSize: 17,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
            }}>
            <span>{(() => {
              const s = recipe.steps || [];
              const isAuto = s.length > 0 && s.every(x => /^שלב\s*\d+$/.test((x.title || '').trim()));
              return (s.length > 0 && !isAuto) ? `בואו נכין יחד · ${s.length} שלבים` : 'הוראות הכנה';
            })()}</span>
            <span style={{
              width: 36, height: 36, borderRadius: 999, background: p.ink, color: p.bg,
              display: 'grid', placeItems: 'center',
            }}><IconBack size={18} strokeWidth={2.4}/></span>
          </button>
        </div>
      </div>

      {/* Top bar — back / fav / edit / delete */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '14px 18px', display: 'flex', justifyContent: 'space-between',
        zIndex: 5, pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', gap: 8, marginInlineStart: 'auto', pointerEvents: 'auto' }}>
          <RoundBtn onClick={() => onToggleFav(recipe.id)} title="מועדפים" color="#fff" ink={recipe.favorite ? '#e34466' : p.ink}>
            <FavHeart filled={recipe.favorite}/>
          </RoundBtn>
          <RoundBtn onClick={() => onEdit(recipe)} title="עריכה" color="#fff" ink={p.ink}>
            <IconEdit size={18} strokeWidth={2.2}/>
          </RoundBtn>
          <RoundBtn onClick={() => onDelete(recipe)} title="מחיקה" color="#fff" ink="#e34466">
            <IconTrash size={18} strokeWidth={2.2}/>
          </RoundBtn>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <RoundBtn onClick={onClose} title="חזרה" color="#1c1620" ink="#fff">
            <IconForward size={18} strokeWidth={2.4}/>
          </RoundBtn>
        </div>
      </div>
    </div>
  );
}

// Inline-editable notes textarea
function NotesEditor({ value, onChange, palette }) {
  const [v, setV] = uS(value || '');
  const [focused, setFocused] = uS(false);
  uE(() => { setV(value || ''); }, [value]);

  const commit = () => { if (v !== value) onChange(v); };

  return (
    <div style={{ marginTop: 10 }}>
      <textarea value={v}
        onChange={e => setV(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit(); }}
        placeholder="הוסיפו טיפים, שדרוגים, תזכורות לפעם הבאה…"
        rows={3}
        style={{
          width: '100%', resize: 'vertical', minHeight: 60,
          fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.55,
          color: 'var(--ink)',
          background: focused ? '#fff' : 'rgba(255,255,255,.7)',
          border: 'none', outline: 'none',
          padding: '14px 16px', borderRadius: 16,
          boxShadow: focused
            ? `0 0 0 2px ${palette.accent}, 0 4px 12px rgba(0,0,0,.05)`
            : '0 2px 8px rgba(0,0,0,.06), inset 0 0 0 1px rgba(0,0,0,.05)',
          textAlign: 'right', boxSizing: 'border-box',
          transition: 'box-shadow .2s, background .2s',
        }}/>
    </div>
  );
}

// Small decorative scatter behind hero
function DecorScatter({ palette }) {
  const dots = [
    { x: '8%',  y: '12%', size: 8,  c: palette.bg2 },
    { x: '22%', y: '78%', size: 14, c: palette.bg2 },
    { x: '85%', y: '20%', size: 12, c: palette.bg2 },
    { x: '92%', y: '70%', size: 7,  c: palette.bg2 },
    { x: '14%', y: '54%', size: 5,  c: palette.bg2 },
    { x: '78%', y: '88%', size: 9,  c: palette.bg2 },
  ];
  return (
    <>
      {dots.map((d,i) => (
        <span key={i} style={{
          position: 'absolute', left: d.x, top: d.y, width: d.size, height: d.size,
          borderRadius: '50%', background: d.c, opacity: .7,
        }}/>
      ))}
    </>
  );
}

function RoundBtn({ children, onClick, title, color = '#fff', ink = '#000', size = 40 }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      style={{
        width: size, height: size, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: color, color: ink,
        display: 'grid', placeItems: 'center',
        boxShadow: '0 8px 18px -6px rgba(0,0,0,.25)',
        transition: 'transform .18s',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(.92)'}
      onMouseUp={e => e.currentTarget.style.transform = ''}
      onMouseLeave={e => e.currentTarget.style.transform = ''}
    >{children}</button>
  );
}

function SectionLabel({ children, ink = '#222' }) {
  return (
    <div style={{
      fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase',
      fontWeight: 800, color: ink,
    }}>{children}</div>
  );
}

function IngredientRow({ ing, palette, index }) {
  const ms = useAnimMs(420);
  const enabled = useAnimEnabled();
  const [shown, setShown] = uS(false);
  uE(() => {
    const t = setTimeout(() => setShown(true), enabled ? index * 50 : 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 14, padding: '12px 4px',
      borderBottom: '1px solid rgba(0,0,0,.06)',
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateX(0)' : 'translateX(20px)',
      transition: `opacity ${ms}ms ease, transform ${ms}ms cubic-bezier(.2,.9,.25,1.1)`,
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: 999, background: palette.tag,
        display: 'grid', placeItems: 'center', color: palette.accent, flexShrink: 0,
        boxShadow: '0 4px 10px rgba(0,0,0,.06)',
      }}>
        <IngredientIcon kind={ing.icon || 'chef'} size={20}/>
      </span>
      <span style={{
        fontSize: 15, fontWeight: 600, color: 'var(--ink)', flex: 1,
      }}>
        <span style={{ color: palette.accent, fontVariantNumeric: 'tabular-nums', marginInlineEnd: 8 }}>{ing.qty}</span>
        {ing.name}
      </span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// StepsScreen — scrollable vertical list of all steps
// ───────────────────────────────────────────────────────────
function StepsScreen({ recipe, onClose }) {
  const p = PALETTES[recipe.palette];
  const steps = recipe.steps || [];

  const isAutoGenerated = steps.length > 0 && steps.every(s => /^שלב\s*\d+$/.test((s.title || '').trim()));
  const showPlainText = steps.length === 0 || isAutoGenerated;
  const plainText = recipe.instructions
    || (isAutoGenerated ? steps.map(s => s.body).filter(Boolean).join('\n\n') : '')
    || recipe.description
    || '';

  if (showPlainText) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#fbeef2', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: p.bg, padding: '18px 22px 26px', borderRadius: '0 0 32px 32px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: p.ink, opacity: .8 }}>הוראות הכנה</div>
            <RoundBtn onClick={onClose} title="חזרה" color="rgba(255,255,255,.85)" ink={p.ink} size={36}>
              <IconClose size={18} strokeWidth={2.4}/>
            </RoundBtn>
          </div>
          <h2 className="display" style={{ margin: '14px 0 0', fontSize: 28, fontWeight: 700, color: p.ink }}>{recipe.title}</h2>
        </div>
        <div className="scroll-y" style={{ flex: 1, padding: '24px 22px 40px' }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.9, color: 'var(--ink)', whiteSpace: 'pre-line' }}>
            {plainText || 'אין הוראות הכנה למתכון זה.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fbeef2', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{
        background: p.bg, padding: '18px 22px 22px',
        borderRadius: '0 0 32px 32px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: p.ink, opacity: .8 }}>{steps.length} שלבים</div>
          <RoundBtn onClick={onClose} title="חזרה" color="rgba(255,255,255,.85)" ink={p.ink} size={36}>
            <IconClose size={18} strokeWidth={2.4}/>
          </RoundBtn>
        </div>
        <h2 className="display" style={{ margin: '14px 0 0', fontSize: 28, fontWeight: 700, color: p.ink }}>{recipe.title}</h2>
      </div>

      {/* Scrollable step cards */}
      <div className="scroll-y" style={{ flex: 1, padding: '30px 18px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {steps.map((step, i) => (
          <StepCard key={i} step={step} index={i} palette={p} />
        ))}
      </div>
    </div>
  );
}

function StepCard({ step, index, palette }) {
  const [shown, setShown] = uS(false);
  const enabled = useAnimEnabled();
  const ms = useAnimMs(400);
  uE(() => {
    const t = setTimeout(() => setShown(true), enabled ? index * 70 : 0);
    return () => clearTimeout(t);
  }, [index]);
  return (
    <div style={{
      background: '#fff',
      borderRadius: 26, padding: '22px 20px 22px',
      boxShadow: 'var(--shadow-card)',
      position: 'relative',
      opacity: enabled ? (shown ? 1 : 0) : 1,
      transform: enabled ? (shown ? 'translateY(0)' : 'translateY(18px)') : 'none',
      transition: `opacity ${ms}ms ease, transform ${ms}ms cubic-bezier(.2,.9,.25,1.1)`,
    }}>
      <div style={{
        position: 'absolute', top: -18, insetInlineStart: 18,
        width: 48, height: 48, borderRadius: 999, background: palette.bg,
        color: palette.ink, display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
        boxShadow: '0 8px 18px -6px rgba(0,0,0,.2)',
      }}>{index + 1}</div>
      <p style={{
        margin: '22px 0 0', fontSize: 15.5, lineHeight: 1.8, color: 'var(--ink)',
      }}>{step.body || step.title}</p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FavoritesScreen
// ───────────────────────────────────────────────────────────
function FavoritesScreen({ recipes, onOpen, onToggleFav, density, variant, onNav }) {
  const favs = recipes.filter(r => r.favorite);
  return (
    <div className="scroll-y" style={{ height: '100%', padding: '14px 0 130px' }}>
      <h1 className="display" style={{
        margin: '0 22px', fontSize: 30, fontWeight: 700, color: 'var(--ink)',
      }}>המועדפים שלי</h1>
      <p style={{ margin: '4px 22px 18px', color: 'var(--ink-soft)', fontSize: 14 }}>
        {favs.length} {favs.length === 1 ? 'מתכון שמור' : 'מתכונים שמורים'}
      </p>

      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 12 : 22 }}>
        {favs.length === 0 && (
          <EmptyState text="עוד לא הוספת מתכונים למועדפים — לבחור לבך על כל כרטיס" emoji="💝"
            cta={{ label: 'לרשימת המתכונים', onClick: () => onNav('home') }}/>
        )}
        {favs.map((r, i) => (
          <RecipeCard key={r.id} recipe={r} index={i} onOpen={onOpen} onToggleFav={onToggleFav}
            density={density} variant={variant}/>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// RecipeFormScreen — used for both "add new" and "edit existing".
// Includes per-ingredient icon picker.
// ───────────────────────────────────────────────────────────
function RecipeFormScreen({ existing, onSave, onCancel, onExport, onImport, mode = 'add', categories: catsProp, onAddCategory }) {
  const [title, setTitle] = uS(existing?.title || '');
  const [desc, setDesc] = uS(existing?.description || '');
  const [cuisine, setCuisine] = uS(existing?.cuisine || '');
  const [prepTime, setPrepTime] = uS(existing?.prepTime ?? 15);
  const [cookTime, setCookTime] = uS(existing?.cookTime ?? 15);
  const [servings, setServings] = uS(existing?.servings ?? 4);
  const [paletteKey, setPaletteKey] = uS(existing?.palette || 'peach');
  const [category, setCategory] = uS(existing?.category || 'mains');
  const [notes, setNotes] = uS(existing?.notes || '');
  const [ings, setIngs] = uS(existing?.ingredients?.length ? existing.ingredients : [{ qty: '', name: '', icon: 'chef' }]);
  const [stepsArr, setStepsArr] = uS(existing?.steps?.length ? existing.steps : [{ title: '', body: '' }]);
  const [gallery, setGallery] = uS(existing?.gallery?.length ? existing.gallery : (defaultGallery ? defaultGallery() : ['main']));
  const [mainSlot, setMainSlot] = uS(existing?.mainSlot || gallery[0] || 'main');
  // Stable ID for image slots — persists across re-renders so photos survive form edits
  const [recipeId] = uS(existing?.id || `new-${Date.now().toString(36)}`);

  const updateIng = (i, k, v) => setIngs(arr => arr.map((x,idx) => idx===i ? {...x, [k]: v} : x));
  const addIng = () => setIngs(arr => [...arr, { qty: '', name: '', icon: 'chef' }]);
  const removeIng = (i) => setIngs(arr => arr.filter((_,idx) => idx !== i));
  const updateStep = (i, k, v) => setStepsArr(arr => arr.map((x,idx) => idx===i ? {...x, [k]: v} : x));
  const addStep = () => setStepsArr(arr => [...arr, { title: '', body: '' }]);
  const removeStep = (i) => setStepsArr(arr => arr.filter((_,idx) => idx !== i));
  const addGallerySlot = () => setGallery(arr => [...arr, `g${Date.now().toString(36)}`]);
  const removeGallerySlot = (slot) => setGallery(arr => arr.length > 1 ? arr.filter(s => s !== slot) : arr);

  const p = PALETTES[paletteKey];
  const canSave = title.trim();

  const save = () => {
    if (!canSave) return;
    const id = existing?.id || recipeId;
    const total = (+prepTime || 0) + (+cookTime || 0);
    onSave({
      ...(existing || {}),
      id, title: title.trim(),
      description: desc.trim(),
      cuisine: cuisine.trim(),
      palette: paletteKey, category,
      prepTime: +prepTime || 0,
      cookTime: +cookTime || 0,
      time: total || (existing?.time || 0),
      servings: +servings || 0,
      level: existing?.level || 'קל',
      favorite: existing?.favorite || false,
      notes: notes,
      gallery, mainSlot,
      ingredients: ings.filter(i => i.name.trim()).map(i => ({ qty: i.qty || '', name: i.name, icon: i.icon || 'chef' })),
      steps: stepsArr.filter(s => (s.title || '').trim() || (s.body || '').trim()),
    });
  };

  return (
    <div className="scroll-y" style={{ height: '100%', padding: '14px 0 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}>
        <h1 className="display" style={{ margin: 0, fontSize: 28, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {mode === 'edit' ? 'עריכת מתכון' : 'מתכון חדש'}
        </h1>
        {onCancel && (
          <button onClick={onCancel} aria-label="ביטול" style={{
            width: 36, height: 36, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,.85)',
            color: 'var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,.1)',
          }}><IconClose size={16} strokeWidth={2.2}/></button>
        )}
      </div>

      {/* preview chip */}
      <div style={{
        margin: '18px 18px 22px', padding: '20px',
        borderRadius: 24, background: p.bg, color: p.ink,
        boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: .65, letterSpacing: '.12em' }}>תצוגה מקדימה</div>
        <div className="display" style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
          {title || 'שם המתכון שלי'}
        </div>
        <div style={{ fontSize: 14, marginTop: 6, opacity: .75 }}>
          {desc || 'תיאור קצר שיופיע בכרטיס המתכון…'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Pill color="#fff" ink={p.ink}><IconClock size={13} strokeWidth={2.4}/> {(+prepTime||0)+(+cookTime||0)} ד׳</Pill>
          <Pill color="#fff" ink={p.ink}><IconUsers size={13} strokeWidth={2.4}/> {servings}</Pill>
          {cuisine && <Pill color="#fff" ink={p.ink}>🍽 {cuisine}</Pill>}
        </div>
      </div>

      <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="שם המתכון">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="לדוגמה: עוגת אגוזים של סבתא"
            style={inputStyle}/>
        </Field>
        <Field label="סוג מטבח">
          <input value={cuisine} onChange={e => setCuisine(e.target.value)} placeholder="לדוגמה: איטלקית, אסייתית"
            style={inputStyle}/>
        </Field>
        <Field label="תיאור">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="במה זה מיוחד?"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}/>
        </Field>

        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="הכנה (דק׳)" style={{ flex: 1 }}>
            <input type="number" min="0" value={prepTime} onChange={e => setPrepTime(e.target.value)} style={inputStyle}/>
          </Field>
          <Field label="בישול (דק׳)" style={{ flex: 1 }}>
            <input type="number" min="0" value={cookTime} onChange={e => setCookTime(e.target.value)} style={inputStyle}/>
          </Field>
          <Field label="מנות" style={{ flex: 1 }}>
            <input type="number" min="1" value={servings} onChange={e => setServings(e.target.value)} style={inputStyle}/>
          </Field>
        </div>

        <Field label="קטגוריה">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexDirection: 'row-reverse' }}>
            {(catsProp || []).filter(c => c.id !== 'all').map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{
                  border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 999,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  background: category === c.id ? 'var(--ink)' : 'rgba(255,255,255,.85)',
                  color: category === c.id ? '#fff' : 'var(--ink)',
                  boxShadow: '0 4px 10px rgba(0,0,0,.07)',
                }}>{c.emoji} {c.label}</button>
            ))}
            {onAddCategory && (
              <button onClick={onAddCategory} style={{
                border: '1.5px dashed rgba(0,0,0,.2)', cursor: 'pointer',
                padding: '8px 14px', borderRadius: 999, background: 'transparent',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)',
              }}>+ קטגוריה חדשה</button>
            )}
          </div>
        </Field>

        <Field label="צבע הכרטיס">
          <div style={{ display: 'flex', gap: 10, flexDirection: 'row-reverse' }}>
            {Object.keys(PALETTES).map(k => (
              <button key={k} onClick={() => setPaletteKey(k)}
                aria-label={k}
                style={{
                  width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: PALETTES[k].bg,
                  boxShadow: paletteKey === k
                    ? '0 0 0 3px var(--ink), 0 6px 14px rgba(0,0,0,.14)'
                    : '0 4px 10px rgba(0,0,0,.1)',
                  transform: paletteKey === k ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all .18s',
                }}/>
            ))}
          </div>
        </Field>

        <Field label="תמונות המתכון">
          <PhotoManager
            recipeId={recipeId}
            gallery={gallery}
            setGallery={setGallery}
            mainSlot={mainSlot}
            setMainSlot={setMainSlot}
            palette={p}
          />
        </Field>

        <Field label="מצרכים">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ings.map((ing, i) => (
              <IngredientFormRow key={i} ing={ing}
                onChange={(k, v) => updateIng(i, k, v)}
                onRemove={() => removeIng(i)}
                canRemove={ings.length > 1}
              />
            ))}
            <button onClick={addIng} style={addRowBtn}>
              <IconPlus size={16}/> הוספת מצרך
            </button>
          </div>
        </Field>

        <Field label="שלבי הכנה">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stepsArr.map((s, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: 12,
                boxShadow: '0 4px 10px rgba(0,0,0,.06)', position: 'relative',
              }}>
                <input value={s.title} onChange={e => updateStep(i, 'title', e.target.value)}
                  placeholder={`כותרת שלב ${i+1}`} style={{...inputStyle, marginBottom: 6}}/>
                <textarea value={s.body} onChange={e => updateStep(i, 'body', e.target.value)} rows={2}
                  placeholder="תיאור..." style={{...inputStyle, resize: 'vertical', minHeight: 56}}/>
                {stepsArr.length > 1 && (
                  <button onClick={() => removeStep(i)} aria-label="מחיקה" style={{
                    position: 'absolute', top: 6, insetInlineEnd: 6,
                    width: 26, height: 26, borderRadius: 999, border: 'none',
                    background: 'rgba(0,0,0,.06)', color: 'var(--ink-soft)', cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}><IconTrash size={14}/></button>
                )}
              </div>
            ))}
            <button onClick={addStep} style={addRowBtn}>
              <IconPlus size={16}/> הוספת שלב
            </button>
          </div>
        </Field>

        <Field label="הערות אישיות">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="טיפים, שדרוגים, תזכורות לפעם הבאה…"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}/>
        </Field>

        <button onClick={save} disabled={!canSave} style={{
          marginTop: 14, padding: '18px', border: 'none',
          cursor: canSave ? 'pointer' : 'default',
          borderRadius: 22, background: canSave ? 'var(--ink)' : 'rgba(0,0,0,.2)',
          color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
          boxShadow: canSave ? '0 14px 30px -10px rgba(0,0,0,.4)' : 'none',
          opacity: canSave ? 1 : .7,
        }}>{mode === 'edit' ? 'שמירת שינויים' : 'שמירת המתכון'}</button>

        {/* Export / Import — only shown in add mode */}
        {mode === 'add' && onExport && (
          <div style={{
            marginTop: 22, padding: 16, borderRadius: 20,
            background: 'rgba(255,255,255,.6)', backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,.05)',
          }}>
            <SectionLabel ink="var(--ink-soft)">ייצוא וייבוא</SectionLabel>
            <p style={{ margin: '8px 0 12px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft)' }}>
              גיבוי ספריית המתכונים, או ייבוא מקובץ Excel.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ExportRow icon={<IconExcel size={20}/>} bg="#1d6f42" label="ייצוא ל-Excel"
                sub="קובץ XLSX עם כל המתכונים"
                onClick={() => onExport('excel')}/>
              <ExportRow icon={<IconWord size={20}/>} bg="#2b579a" label="ייצוא לוורד"
                sub="ספר מתכונים מעוצב להדפסה · עמוד נפרד לכל מתכון"
                onClick={() => onExport('word')}/>
              <label style={{
                ...exportRowStyle, background: 'rgba(255,255,255,.85)', color: 'var(--ink)', cursor: 'pointer',
              }}>
                <span style={{ ...exportIconStyle, background: '#5b4452' }}><IconUpload size={20}/></span>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>ייבוא מקובץ Excel</span>
                  <span style={{ fontSize: 12, opacity: .7 }}>קובץ .xlsx · עמודות בעברית</span>
                </div>
                <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={onImport} style={{ display: 'none' }}/>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// PhotoManager — simple grid of upload slots for the form
// ───────────────────────────────────────────────────────────
function PhotoManager({ recipeId, gallery, setGallery, mainSlot, setMainSlot, palette }) {
  const [previews, setPreviews] = uS({});
  const inputRef = uR(null);
  const [pickingSlot, setPickingSlot] = uS(null);
  const p = palette;

  // Load existing images from bridge on mount (may already be loaded if card was rendered)
  uE(() => {
    const tryLoad = () => {
      if (!window.__getImageSlot) return;
      const next = {};
      let any = false;
      gallery.forEach(slot => {
        const data = window.__getImageSlot(`food-${recipeId}-${slot}`);
        if (data && data.u) { next[slot] = data.u; any = true; }
      });
      if (any) setPreviews(prev => ({ ...prev, ...next }));
    };
    tryLoad();
    const t = setTimeout(tryLoad, 700);
    return () => clearTimeout(t);
  }, [recipeId]);

  const openPicker = (slot) => {
    setPickingSlot(slot);
    setTimeout(() => inputRef.current?.click(), 0);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    const slot = pickingSlot;
    e.target.value = '';
    setPickingSlot(null);
    if (!file || !slot) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 900;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/webp', 0.85);
        if (window.__setImageSlot) window.__setImageSlot(`food-${recipeId}-${slot}`, { u: dataUrl, s: 1, x: 0, y: 0 });
        setPreviews(prev => {
          if (!Object.values(prev).some(Boolean)) setMainSlot(slot);
          return { ...prev, [slot]: dataUrl };
        });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const addSlot = () => setGallery(g => [...g, `g${Date.now().toString(36)}`]);

  const removeSlot = (slot) => {
    if (gallery.length <= 1) return;
    const next = gallery.filter(s => s !== slot);
    setGallery(next);
    if (mainSlot === slot) setMainSlot(next[0]);
    setPreviews(prev => { const n = { ...prev }; delete n[slot]; return n; });
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, flexDirection: 'row-reverse' }}>
        {gallery.map(slot => {
          const isMain = slot === mainSlot;
          const preview = previews[slot];
          return (
            <div key={slot} style={{ position: 'relative' }}>
              <button type="button" onClick={() => openPicker(slot)} style={{
                width: 84, height: 84, borderRadius: 18, border: 'none', cursor: 'pointer',
                background: preview ? 'transparent' : 'rgba(0,0,0,.07)',
                overflow: 'hidden', padding: 0,
                boxShadow: isMain ? `0 0 0 3px ${p.accent}` : '0 2px 10px rgba(0,0,0,.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'box-shadow .2s',
              }}>
                {preview
                  ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                  : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--ink-soft)' }}>
                      <IconPlus size={22} strokeWidth={2} />
                      <span style={{ fontSize: 10, fontWeight: 700 }}>תמונה</span>
                    </div>
                }
              </button>
              {isMain && (
                <div style={{
                  position: 'absolute', top: -7, insetInlineStart: -7,
                  width: 22, height: 22, borderRadius: 999,
                  background: p.accent, color: '#fff',
                  display: 'grid', placeItems: 'center', fontSize: 12,
                  pointerEvents: 'none', boxShadow: '0 2px 6px rgba(0,0,0,.25)',
                }}>★</div>
              )}
              {!isMain && preview && (
                <button type="button" onClick={() => setMainSlot(slot)} title="הגדר כתמונה ראשית" style={{
                  position: 'absolute', top: -7, insetInlineStart: -7,
                  width: 22, height: 22, borderRadius: 999,
                  background: 'rgba(255,255,255,.95)', color: 'var(--ink-soft)',
                  border: 'none', cursor: 'pointer', fontSize: 12,
                  display: 'grid', placeItems: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,.15)',
                }}>☆</button>
              )}
              {gallery.length > 1 && (
                <button type="button" onClick={() => removeSlot(slot)} style={{
                  position: 'absolute', top: -7, insetInlineEnd: -7,
                  width: 22, height: 22, borderRadius: 999,
                  background: 'rgba(255,255,255,.95)', color: '#e34466',
                  border: 'none', cursor: 'pointer', fontSize: 17, lineHeight: 1,
                  display: 'grid', placeItems: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,.15)',
                }}>×</button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={addSlot} style={{
          width: 84, height: 84, borderRadius: 18,
          border: '1.5px dashed rgba(0,0,0,.2)', background: 'transparent',
          cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--ink-soft)',
        }}>
          <IconPlus size={18} strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>הוסיפי</span>
        </button>
      </div>
    </div>
  );
}

// Backwards-compat aliases so old call sites work:
function AddRecipeScreen({ onAdd, onExport, onImport, categories, onAddCategory }) {
  return <RecipeFormScreen mode="add" onSave={onAdd} onExport={onExport} onImport={onImport} categories={categories} onAddCategory={onAddCategory}/>;
}

function EditRecipeScreen({ recipe, onSave, onCancel, categories, onAddCategory }) {
  return <RecipeFormScreen mode="edit" existing={recipe} onSave={onSave} onCancel={onCancel} categories={categories} onAddCategory={onAddCategory}/>;
}

// ───────────────────────────────────────────────────────────
// IngredientFormRow — qty + name + icon picker per row
// ───────────────────────────────────────────────────────────
function IngredientFormRow({ ing, onChange, onRemove, canRemove }) {
  const [pickerOpen, setPickerOpen] = uS(false);
  const Entry = ING_ICONS[ing.icon || 'chef'] || ING_ICONS.chef;
  const I = Entry.I;

  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse', alignItems: 'stretch' }}>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setPickerOpen(o => !o)}
          aria-label="בחר אייקון"
          style={{
            width: 44, height: '100%', minHeight: 44, borderRadius: 14, border: 'none',
            background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,.07), inset 0 0 0 1px rgba(0,0,0,.04)',
          }}>
          <I size={20}/>
        </button>
        {pickerOpen && (
          <IconPickerPopover current={ing.icon || 'chef'}
            onPick={(k) => { onChange('icon', k); setPickerOpen(false); }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
      <input value={ing.qty || ''} onChange={e => onChange('qty', e.target.value)}
        placeholder="כמות" style={{ ...inputStyle, width: 100, flex: 'none' }}/>
      <input value={ing.name || ''} onChange={e => onChange('name', e.target.value)}
        placeholder="מצרך" style={{ ...inputStyle, flex: 1 }}/>
      {canRemove && (
        <button onClick={onRemove} aria-label="מחיקה" style={{
          width: 36, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,.06)', color: 'var(--ink-soft)',
          display: 'grid', placeItems: 'center',
        }}><IconTrash size={14}/></button>
      )}
    </div>
  );
}

function IconPickerPopover({ current, onPick, onClose }) {
  uE(() => {
    const onDown = (e) => {
      if (!e.target.closest?.('[data-icon-pop]')) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const keys = Object.keys(ING_ICONS);
  return (
    <div data-icon-pop="1" style={{
      position: 'absolute', top: '100%', insetInlineEnd: 0, marginTop: 6,
      background: '#fff', borderRadius: 16, padding: 10,
      boxShadow: '0 16px 40px -10px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.7) inset',
      display: 'grid', gridTemplateColumns: 'repeat(6, 36px)', gap: 6,
      zIndex: 20,
    }}>
      {keys.map(k => {
        const E = ING_ICONS[k];
        const Ic = E.I;
        const sel = k === current;
        return (
          <button key={k} onClick={() => onPick(k)} title={E.label}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: sel ? 'var(--ink)' : 'rgba(0,0,0,.04)',
              color: sel ? '#fff' : 'var(--ink)',
              display: 'grid', placeItems: 'center',
              transition: 'all .15s',
            }}>
            <Ic size={18}/>
          </button>
        );
      })}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 14, border: 'none',
  background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
  fontFamily: 'inherit', fontSize: 15, outline: 'none',
  boxShadow: '0 2px 6px rgba(0,0,0,.05), inset 0 0 0 1px rgba(0,0,0,.04)',
  textAlign: 'right', boxSizing: 'border-box',
};
const addRowBtn = {
  border: '1.5px dashed rgba(0,0,0,.2)', background: 'transparent',
  borderRadius: 14, padding: '10px', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
};

function Field({ label, children, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, ...style }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em' }}>{label}</span>
      {children}
    </label>
  );
}

const exportRowStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 16,
  border: 'none', cursor: 'pointer', textAlign: 'right',
  fontFamily: 'inherit',
};
const exportIconStyle = {
  width: 40, height: 40, borderRadius: 12,
  display: 'grid', placeItems: 'center', color: '#fff',
  flexShrink: 0,
};

function ExportRow({ icon, bg, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={{ ...exportRowStyle, background: 'rgba(255,255,255,.85)', color: 'var(--ink)' }}>
      <span style={{ ...exportIconStyle, background: bg }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'flex-end' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 12, opacity: .7 }}>{sub}</span>
      </div>
      <IconBack size={18} strokeWidth={2.2}/>
    </button>
  );
}

function EmptyState({ text, emoji, cta }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>{emoji}</div>
      <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 15, fontWeight: 500, textWrap: 'balance' }}>{text}</p>
      {cta && (
        <button onClick={cta.onClick} style={{
          marginTop: 8, padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'var(--ink)', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
        }}>{cta.label}</button>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// DeleteConfirm — styled fullscreen confirmation dialog
// ───────────────────────────────────────────────────────────
function DeleteConfirm({ recipe, onConfirm, onCancel }) {
  const p = PALETTES[recipe.palette];
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 25,
      background: 'rgba(28,22,32,.65)',
      backdropFilter: 'blur(14px)',
      display: 'grid', placeItems: 'center',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--cream)',
        borderRadius: 36, padding: '36px 28px 28px',
        margin: '0 24px', maxWidth: 340, width: '100%',
        boxShadow: '0 40px 100px -20px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.7) inset',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
        textAlign: 'center',
        animation: 'delPop .38s cubic-bezier(.2,1.35,.4,1)',
      }}>
        {/* Icon badge */}
        <div style={{
          width: 76, height: 76, borderRadius: 999,
          background: p.bg,
          display: 'grid', placeItems: 'center',
          boxShadow: `0 14px 30px -8px ${p.bg}cc, 0 1px 0 rgba(255,255,255,.6) inset`,
        }}>
          <IconTrash size={32} strokeWidth={1.8} color={p.ink}/>
        </div>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="display" style={{
            margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--ink)',
          }}>מחיקת מתכון</h2>
          <p style={{ margin: 0, fontSize: 15.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            בטוח למחוק את<br/>
            <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>"{recipe.title}"</strong>?
          </p>
          <span style={{
            display: 'inline-block', padding: '5px 14px',
            borderRadius: 999,
            background: 'rgba(227,68,102,.1)',
            color: '#c0304f', fontSize: 12.5, fontWeight: 700,
          }}>לא ניתן לשחזר אחרי המחיקה</span>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '16px', border: 'none', borderRadius: 20,
            background: 'rgba(0,0,0,.07)', color: 'var(--ink)',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            transition: 'background .15s',
          }}>ביטול</button>
          <button onClick={onConfirm} style={{
            flex: 1.5, padding: '16px', border: 'none', borderRadius: 20,
            background: '#e34466', color: '#fff',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 10px 24px -8px rgba(227,68,102,.55)',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(.97)'}
          onMouseUp={e => e.currentTarget.style.transform = ''}
          onMouseLeave={e => e.currentTarget.style.transform = ''}
          >מחק מתכון</button>
        </div>
      </div>
      <style>{`@keyframes delPop{0%{transform:scale(.82);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

Object.assign(window, {
  HomeScreen, DetailScreen, StepsScreen, FavoritesScreen,
  AddRecipeScreen, EditRecipeScreen, RecipeFormScreen,
  PhotoManager, DeleteConfirm,
});
