// screens.jsx — full screen views

const { useState: uS, useRef: uR, useEffect: uE, useMemo: uM, useLayoutEffect: uLE } = React;

// ───────────────────────────────────────────────────────────
// HomeScreen — Maites brand bar + inline search + density
// toggle + categories + stacked cards (with bigger circles
// poking out of each card edge).
// ───────────────────────────────────────────────────────────
function HomeScreen({ recipes, recipesLoaded = true, loadError = null, onRetryLoad, onOpen, onToggleFav, density, onDensity, variant, category, onCategory, onClearCategory, sharedKey, categories, onAddCategory, onManageCategories, currentUser, onOpenAccount, sharedWithMe, onOpenShared, onRemoveShared }) {
  const [q, setQ] = uS('');
  const [searching, setSearching] = uS(false);
  const selectedCats = Array.isArray(category) ? category : (category && category !== 'all' ? [category] : []);

  const filtered = uM(() => {
    const qq = q.trim().toLowerCase();
    let r = recipes;
    if (selectedCats.length) r = r.filter(x => selectedCats.includes(x.category));
    if (!qq) return r;
    return r.filter(x =>
      x.title.toLowerCase().includes(qq)
      || (x.description || '').toLowerCase().includes(qq)
      || (x.ingredients || []).some(i => (i.name || '').toLowerCase().includes(qq))
    );
  }, [recipes, selectedCats.join(','), q]);

  // Only show categories that have at least one recipe, with per-category counts
  const { activeCats, counts } = uM(() => {
    const counts = {};
    recipes.forEach(r => { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1; });
    const all = categories || CATEGORIES;
    return {
      counts,
      activeCats: all.filter(c => c.id !== 'all' && counts[c.id] > 0),
    };
  }, [recipes, categories]);

  return (
    <div className="scroll-y" style={{ height: '100%', position: 'relative' }}>
      {/* Brand bar */}
      <div style={{
        padding: '14px 22px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <h1 className="display" data-comment-anchor="home-brand" style={{
          margin: 0, fontSize: 'var(--t-display)', fontWeight: 800, letterSpacing: '-.01em',
          color: 'var(--ink)', fontFamily: 'var(--font-display)',
        }}>Maites</h1>
        <button onClick={onOpenAccount} aria-label="חשבון"
          style={{
            width: 44, height: 44, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            background: 'var(--glass)', padding: 0, overflow: 'hidden',
            boxShadow: 'var(--e1)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
          {currentUser && currentUser.photoURL
            ? <img src={currentUser.photoURL} style={{ width: 44, height: 44, objectFit: 'cover' }} alt="" referrerPolicy="no-referrer"/>
            : <span style={{ fontSize: 'var(--t-body)', fontWeight: 700, color: 'var(--ink)' }}>
                {currentUser ? (currentUser.displayName || currentUser.email || '?')[0].toUpperCase() : '⚙'}
              </span>
          }
        </button>
      </div>

      {/* Filter toolbar — dropdown (start) + layout & search (end) */}
      <div style={{
        padding: '12px 22px 0', display: 'flex', alignItems: 'center', gap: 8,
        position: 'relative', zIndex: 4,
      }}>
        <CategoryDropdown
          selected={selectedCats}
          onToggle={onCategory}
          onClear={onClearCategory}
          categories={activeCats}
          counts={counts}
          total={recipes.length}
          onAdd={onAddCategory}
          onManage={onManageCategories}
        />
        <button onClick={() => onDensity(density === 'grid' ? 'comfy' : 'grid')}
          aria-label={density === 'grid' ? 'מעבר לכרטיסים' : 'מעבר לגריד'}
          title={density === 'grid' ? 'כרטיסים' : 'גריד'}
          style={{
            width: 48, height: 48, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', flexShrink: 0,
            background: density === 'grid' ? 'var(--ink)' : 'var(--glass)',
            color: density === 'grid' ? 'var(--bg)' : 'var(--ink)',
            display: 'grid', placeItems: 'center',
            boxShadow: 'var(--e1)',
            transition: 'all .2s',
          }}>
          {density === 'grid' ? <IconRows size={19} strokeWidth={2.2}/> : <IconGrid size={19} strokeWidth={2.2}/>}
        </button>
        <button onClick={() => setSearching(s => !s)} aria-label="חיפוש"
          style={{
            width: 48, height: 48, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', flexShrink: 0,
            background: searching || q ? 'var(--ink)' : 'var(--glass)',
            color: searching || q ? 'var(--bg)' : 'var(--ink)',
            display: 'grid', placeItems: 'center',
            boxShadow: 'var(--e1)',
            transition: 'all .2s',
          }}>
          <IconSearch size={18} strokeWidth={2.2}/>
        </button>
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
          background: 'var(--surface-raised)', borderRadius: 'var(--r-md)', padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: 'var(--shadow-card)',
        }}>
          <IconSearch size={16} strokeWidth={2.2}/>
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus={searching}
            placeholder="מתכון, מצרך, או מילת מפתח…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'inherit', fontSize: 'var(--t-body)', color: 'var(--ink)', textAlign: 'right',
            }}/>
          {q && (
            <button onClick={() => setQ('')} style={{
              border: 'none', background: 'var(--surface-sunken)', borderRadius: 'var(--r-pill)', width: 24, height: 24,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
            }}><IconClose size={12}/></button>
          )}
        </div>
      </div>

      {/* Active filter chips — quick removal without opening the menu */}
      {selectedCats.length > 0 && (
        <div className="scroll-y" style={{
          display: 'flex', gap: 8, padding: '12px 22px 0', overflowX: 'auto',
        }}>
          {selectedCats.map(id => {
            const c = (categories || []).find(x => x.id === id);
            if (!c) return null;
            return (
              <button key={id} onClick={() => onCategory(id)} style={{
                flex: '0 0 auto', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 10px 6px 8px', borderRadius: 'var(--r-pill)',
                background: 'var(--glass)', color: 'var(--ink)',
                fontSize: 'var(--t-caption)', fontWeight: 700, boxShadow: 'var(--e1)',
              }}>
                <span>{c.emoji}</span>{c.label}
                <span style={{
                  width: 16, height: 16, borderRadius: 'var(--r-pill)', background: 'var(--surface-sunken)',
                  display: 'grid', placeItems: 'center',
                }}><IconClose size={9} strokeWidth={3}/></span>
              </button>
            );
          })}
          <button onClick={onClearCategory} style={{
            flex: '0 0 auto', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '6px 12px', borderRadius: 'var(--r-pill)', background: 'transparent',
            color: 'var(--ink-soft)', fontSize: 'var(--t-caption)', fontWeight: 700, textDecoration: 'underline',
          }}>ניקוי</button>
        </div>
      )}

      <div style={{ height: 14 }}/>

      {sharedWithMe && sharedWithMe.length > 0 && !q && (
        <SharedRecipesSection items={sharedWithMe} onOpen={onOpenShared} onRemove={onRemoveShared}/>
      )}

      <div style={{ padding: '0 18px 130px', ...(density === 'grid'
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }
        : { display: 'flex', flexDirection: 'column', gap: 22 })
      }}>
        {!recipesLoaded && (
          [1, 2, 3].map(i => <RecipeCardSkeleton key={i} />)
        )}
        {recipesLoaded && loadError && (
          <ErrorState
            title="לא הצלחנו לטעון את המתכונים"
            text={navigator.onLine
              ? 'הבעיה מצד השרת. המתכונים ששמורים במכשיר עדיין כאן.'
              : 'אין חיבור לאינטרנט כרגע.'}
            onRetry={onRetryLoad}
          />
        )}
        {recipesLoaded && !loadError && filtered.length === 0 && (
          q
            ? <EmptyState emoji="🔍" title={`אין תוצאות עבור "${q}"`} text="אפשר לחפש לפי שם מתכון, מצרך או מילה מתוך התיאור."/>
            : selectedCats.length
              ? <EmptyState emoji="🗂️" title="אין מתכונים בקטגוריות שנבחרו"
                  text="אפשר לבחור קטגוריה אחרת או לנקות את הסינון."
                  cta={{ label: 'ניקוי הסינון', onClick: onClearCategory }}/>
              : <EmptyState emoji="🍽️" title="עוד אין מתכונים" text="הוסיפו את המתכון הראשון, או ייבאו קובץ אקסל מסך ההוספה."/>
        )}
        {recipesLoaded && filtered.map((r, i) => (
          density === 'grid'
            ? <RecipeCardGrid key={`${sharedKey}-${r.id}-grid`}
                recipe={r} index={i} onOpen={onOpen} onToggleFav={onToggleFav} />
            : <RecipeCard key={`${sharedKey}-${r.id}`}
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
function DetailScreen({ recipe, onClose, onToggleFav, onOpenSteps, onEdit, onDelete, onUpdateNotes, onShare, readOnly = false, openMs = 380 }) {
  const p = paletteOf(recipe.palette);
  const scrollRef = uR(null);
  const [scrollY, setScrollY] = uS(0);
  const [mounted, setMounted] = uS(false);
  // How many people are we cooking for right now — scales the quantities.
  // The recipe says how many people its quantities are written for; a
  // recipe that never said gets one portion, so scaling still works.
  const baseServings = Math.max(1, +recipe.servings || 1);
  const [servings, setServings] = uS(baseServings);
  uE(() => { setServings(Math.max(1, +recipe.servings || 1)); }, [recipe.id, recipe.servings]);
  const factor = servings > 0 ? servings / baseServings : 1;

  uE(() => { setMounted(true); }, []);

  const onScroll = (e) => setScrollY(e.target.scrollTop);

  // No photo → no empty hero: the colour band shrinks to just the top bar.
  // Until the photo store has been read we assume there is one, so a slow
  // load never hides a picture that exists.
  const heroPhotoUrl = useRecipePhoto(recipe);
  const slotsReady = useImageSlotsReady();
  const heroPhoto = !!heroPhotoUrl || !slotsReady;
  const HERO_H = heroPhoto ? 258 : 116;
  const BODY_OVERLAP = 30;     // how much body covers the hero by default

  // Parallax: as user scrolls up, the image translates up faster than the
  // hero (which is sticky), so the image appears to slide BEHIND the body.
  const imgTranslate = Math.min(scrollY * 0.45, HERO_H);
  const imgOpacity = 1 - Math.min(1, Math.max(0, scrollY - 60) / (HERO_H - 80));
  const decorOpacity = 1 - Math.min(1, scrollY / 180);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 20,
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
          {heroPhoto && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 58,
              transform: `translateY(${-imgTranslate}px)`,
              transition: 'transform .05s linear',
              opacity: imgOpacity,
            }}>
              <ImageGallery recipeId={recipe.id}
                slots={recipe.gallery && recipe.gallery.length ? recipe.gallery : ['main']}
                size={168}
              />
            </div>
          )}
        </div>

        {/* BODY — slides up over the sticky hero */}
        <div style={{
          background: 'var(--bg)',
          borderRadius: '32px 32px 0 0',
          position: 'relative',
          marginTop: -BODY_OVERLAP,
          zIndex: 2,
          padding: '26px 22px 180px',
          minHeight: '70vh',
          boxShadow: 'var(--e3)',
        }}>
          <h1 className="display" data-comment-anchor="detail-title" style={{
            margin: 0, fontSize: 'var(--t-hero)', fontWeight: 700, color: 'var(--ink)',
            lineHeight: 1.15, textWrap: 'balance',
          }}>{recipe.title}</h1>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Chip tone="palette" palette={p}><IconClock size={13} strokeWidth={2.4}/> {recipe.time} דקות</Chip>
            <Chip tone="palette" palette={p}><IconUsers size={13} strokeWidth={2.4}/> {servings || recipe.servings} מנות</Chip>
            {recipe.cuisine && <Chip tone="palette" palette={p}>🍽 {recipe.cuisine}</Chip>}
          </div>

          {recipe.description && (
            <p style={{
              marginTop: 18, fontSize: 'var(--t-body)', lineHeight: 1.55, color: 'var(--ink-soft)',
              fontWeight: 400,
            }}>{typeof stripHTML === 'function' ? stripHTML(recipe.description) : recipe.description}</p>
          )}

          {/* Ingredients */}
          <div style={{ marginTop: 26 }}>
            <SectionLabel ink={p.accent}>מצרכים</SectionLabel>
            {(recipe.ingredients || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <ServingScaler base={baseServings} servings={servings} onChange={setServings} palette={p}/>
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' }}>
              {(recipe.ingredients || []).map((ing, i) => (
                <IngredientRow key={i} ing={ing} palette={p} index={i} factor={factor}/>
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
            {(() => {
              const notes = typeof stripHTML === 'function' ? stripHTML(recipe.notes || '') : (recipe.notes || '');
              return notes.trim() ? (
                <p style={{
                  margin: '10px 0 0', fontSize: 'var(--t-small)', lineHeight: 1.65, color: 'var(--ink)',
                  whiteSpace: 'pre-line', padding: '14px 16px', borderRadius: 'var(--r-md)',
                  background: 'var(--glass)',
                  boxShadow: 'var(--e1)',
                }}>{notes}</p>
              ) : (
                <p style={{ margin: '10px 0 0', padding: '4px 0', fontSize: 'var(--t-small)', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                  לא נוספו הערות
                </p>
              );
            })()}
          </div>

          {/* CTA — instructions button or "no instructions" message */}
          {(() => {
            const s = recipe.steps || [];
            const isAuto = s.length > 0 && s.every(x => /^שלב\s*\d+$/.test((x.title || '').trim()));
            const hasContent = !!(recipe.instructions?.trim())
              || (s.length > 0 && !isAuto)
              || (isAuto && s.some(x => (x.body || '').trim()));
            if (!hasContent) {
              return (
                <div style={{
                  marginTop: 28, padding: '18px 22px', borderRadius: 'var(--r-lg)',
                  background: 'var(--surface-sunken)', textAlign: 'center',
                  color: 'var(--ink-soft)', fontSize: 'var(--t-small)', fontWeight: 500,
                }}>
                  אין הוראות הכנה למתכון זה
                </div>
              );
            }
            const label = (s.length > 0 && !isAuto) ? `בואו נכין יחד · ${s.length} שלבים` : 'הוראות הכנה';
            return (
              <button onClick={() => onOpenSteps(recipe, servings)}
                style={{
                  marginTop: 28, width: '100%',
                  border: 'none', cursor: 'pointer',
                  padding: '20px 22px', borderRadius: 'var(--r-lg)',
                  background: p.bg, color: p.ink,
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-card)',
                }}>
                <span>{label}</span>
                <span style={{
                  width: 36, height: 36, borderRadius: 'var(--r-pill)', background: p.ink, color: p.bg,
                  display: 'grid', placeItems: 'center',
                }}><IconBack size={18} strokeWidth={2.4}/></span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Top bar — back on the start edge (RTL: right), actions grouped
          in one capsule on the end edge so they read as a single control. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '14px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 10,
        zIndex: 5, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <RoundBtn onClick={onClose} title="חזרה" color="var(--ink)" ink="var(--bg)" size={42}>
            <IconForward size={19} strokeWidth={2.4}/>
          </RoundBtn>
        </div>

        {readOnly ? (
          recipe._sharedBy ? (
            <div style={{
              pointerEvents: 'auto',
              background: 'var(--glass)', borderRadius: 'var(--r-pill)', padding: '8px 14px',
              fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink)',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: 'var(--e1)',
            }}>
              <span>👤</span> שותף ע״י {recipe._sharedBy}
            </div>
          ) : <div/>
        ) : (
          <div style={{
            pointerEvents: 'auto',
            display: 'flex', alignItems: 'center', gap: 2, padding: 4,
            borderRadius: 'var(--r-pill)', background: 'var(--glass-strong)',
            backdropFilter: 'blur(14px) saturate(160%)',
            boxShadow: 'var(--e2)',
          }}>
            <BarBtn onClick={() => onToggleFav(recipe.id)} title="מועדפים"
              ink={recipe.favorite ? 'var(--brand-strong)' : p.ink}>
              <FavHeart filled={recipe.favorite}/>
            </BarBtn>
            {onShare && (
              <BarBtn onClick={() => onShare(recipe)} title="שיתוף" ink={p.ink}>
                <IconShare size={18} strokeWidth={2.2}/>
              </BarBtn>
            )}
            <BarBtn onClick={() => onEdit(recipe)} title="עריכה" ink={p.ink}>
              <IconEdit size={18} strokeWidth={2.2}/>
            </BarBtn>
            <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 3px' }}/>
            <BarBtn onClick={() => onDelete(recipe)} title="מחיקה" ink="#e34466">
              <IconTrash size={18} strokeWidth={2.2}/>
            </BarBtn>
          </div>
        )}
      </div>
    </div>
  );
}

// A single action inside the detail-screen capsule bar.
function BarBtn({ children, onClick, title, ink = '#000' }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      style={{
        width: 38, height: 38, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
        background: 'transparent', color: ink,
        display: 'grid', placeItems: 'center', transition: 'background .18s, transform .18s',
      }}
      onPointerDown={e => { e.currentTarget.style.background = 'var(--surface-sunken)'; e.currentTarget.style.transform = 'scale(.9)'; }}
      onPointerUp={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = ''; }}
      onPointerLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = ''; }}
    >{children}</button>
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
          fontFamily: 'inherit', fontSize: 'var(--t-small)', lineHeight: 1.55,
          color: 'var(--ink)',
          background: focused ? 'var(--surface-raised)' : 'var(--glass)',
          border: 'none', outline: 'none',
          padding: '14px 16px', borderRadius: 'var(--r-md)',
          boxShadow: focused
            ? `0 0 0 2px ${palette.accent}, var(--e1)`
            : 'var(--e1)',
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

function RoundBtn({ children, onClick, title, color = 'var(--surface-raised)', ink = 'var(--ink)', size = 40 }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      style={{
        width: size, height: size, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
        background: color, color: ink,
        display: 'grid', placeItems: 'center',
        boxShadow: 'var(--e2)',
        transition: 'transform .18s',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(.92)'}
      onMouseUp={e => e.currentTarget.style.transform = ''}
      onMouseLeave={e => e.currentTarget.style.transform = ''}
    >{children}</button>
  );
}


function IngredientRow({ ing, palette, index, factor = 1 }) {
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
      borderBottom: '1px solid var(--line)',
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateX(0)' : 'translateX(20px)',
      transition: `opacity ${ms}ms ease, transform ${ms}ms cubic-bezier(.2,.9,.25,1.1)`,
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: 'var(--r-pill)', background: palette.tag,
        display: 'grid', placeItems: 'center', color: palette.accent, flexShrink: 0,
        boxShadow: 'var(--e1)',
      }}>
        <IngredientIcon kind={ing.icon || 'chef'} size={20}/>
      </span>
      <span style={{
        fontSize: 'var(--t-body)', fontWeight: 600, color: 'var(--ink)', flex: 1,
      }}>
        <span style={{ color: palette.accent, fontVariantNumeric: 'tabular-nums', marginInlineEnd: 8 }}>
          {typeof scaleQuantity === 'function' ? scaleQuantity(ing.qty, factor) : ing.qty}
        </span>
        {ing.name}
      </span>
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
        margin: '0 22px', fontSize: 'var(--t-display)', fontWeight: 700, color: 'var(--ink)',
      }}>המועדפים שלי</h1>
      <p style={{ margin: '4px 22px 18px', color: 'var(--ink-soft)', fontSize: 'var(--t-small)' }}>
        {favs.length} {favs.length === 1 ? 'מתכון שמור' : 'מתכונים שמורים'}
      </p>

      <div style={{ padding: '0 18px', ...(density === 'grid'
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }
        : { display: 'flex', flexDirection: 'column', gap: 22 })
      }}>
        {favs.length === 0 && (
          <EmptyState emoji="💝" title="אין עדיין מועדפים"
            text="נגיעה בלב שעל כל כרטיס תשמור אותו כאן, כדי למצוא אותו מהר בפעם הבאה."
            cta={{ label: 'לרשימת המתכונים', onClick: () => onNav('home') }}/>
        )}
        {favs.map((r, i) => (
          density === 'grid'
            ? <RecipeCardGrid key={r.id} recipe={r} index={i} onOpen={onOpen} onToggleFav={onToggleFav} />
            : <RecipeCard key={r.id} recipe={r} index={i} onOpen={onOpen} onToggleFav={onToggleFav}
                density={density} variant={variant}/>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// RecipeFormScreen — writing a recipe down, in four passes.
//
// It used to be one page with thirteen fields on it: a wall to look at,
// impossible to fill in on a phone without losing your place, and built
// out of white cards with drop shadows floating on a gradient — which is
// what a web page looks like, not an app.
//
// The same thirteen fields are here, grouped the way you think about a
// recipe: what it is, what goes in, what you do, how it looks. They are
// made of the controls in forms.jsx: filled fields with the label inside
// them, rows that open a sheet, a stepper for a count, a photo area the
// size of the photo.
//
// Nothing is gated. The tabs move between the four in any order, and you
// can save from anywhere the moment the recipe has a name.
// ───────────────────────────────────────────────────────────
const FORM_STEPS = [
  { id: 'what',  label: 'המתכון',  hint: 'שם, תיאור, קטגוריה' },
  { id: 'ings',  label: 'מצרכים',  hint: 'לכמה אנשים, ומה נכנס' },
  { id: 'how',   label: 'הכנה',    hint: 'זמנים ושלבים' },
  { id: 'look',  label: 'מראה',    hint: 'תמונות, צבע, הערות' },
];

function RecipeFormScreen({ existing, onSave, onCancel, mode = 'add', categories: catsProp, onAddCategory, onDirtyChange, step: stepProp, onStepChange }) {
  const [title, setTitle] = uS(existing?.title || '');
  const [desc, setDesc] = uS(existing?.description || '');
  const [cuisine, setCuisine] = uS(existing?.cuisine || '');
  const [prepTime, setPrepTime] = uS(existing?.prepTime ?? 15);
  const [cookTime, setCookTime] = uS(existing?.cookTime ?? 15);
  const [servings, setServings] = uS(existing?.servings > 0 ? String(existing.servings) : '');
  const [paletteKey, setPaletteKey] = uS(existing?.palette || 'peach');
  // 'pop' = photo circle pokes out of the card, 'inside' = photo contained in it
  const [imageMode, setImageMode] = uS(existing?.imageMode || 'pop');
  const [category, setCategory] = uS(existing?.category || 'mains');
  const [notes, setNotes] = uS(existing?.notes || '');
  const [ings, setIngs] = uS(existing?.ingredients?.length ? existing.ingredients : [{ qty: '', name: '', icon: 'chef' }]);
  const [stepsArr, setStepsArr] = uS(existing?.steps?.length ? existing.steps : [{ title: '', body: '' }]);
  const [gallery, setGallery] = uS(existing?.gallery?.length ? existing.gallery : (defaultGallery ? defaultGallery() : ['main']));
  const [mainSlot, setMainSlot] = uS(existing?.mainSlot || gallery[0] || 'main');
  // Stable ID for image slots — persists across re-renders so photos survive form edits
  const [recipeId] = uS(existing?.id || `new-${Date.now().toString(36)}`);
  const [isDirty, setIsDirty] = uS(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = uS(false);
  const [catSheet, setCatSheet] = uS(false);
  // The step lives in App when it is mounted there, so the phone's back
  // gesture walks back through the four instead of throwing the form away.
  const [ownStep, setOwnStep] = uS(0);
  const step = typeof stepProp === 'number' ? stepProp : ownStep;
  const setStep = (i) => {
    const n = Math.min(FORM_STEPS.length - 1, Math.max(0, i));
    if (onStepChange) onStepChange(n); else setOwnStep(n);
  };
  const scrollRef = uR(null);
  const mountedRef = uR(false);
  const ingsKey = ings.map(i => (i.name || '') + (i.qty || '')).join('|');
  const stepsKey = stepsArr.map(s => (s.title || '') + (s.body || '')).join('|');
  uE(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setIsDirty(true);
  }, [title, desc, cuisine, category, paletteKey, imageMode, notes, prepTime, cookTime, servings, ingsKey, stepsKey]);
  uE(() => { if (onDirtyChange) onDirtyChange(isDirty); }, [isDirty]);
  // A new pass starts at the top of itself, not halfway down the last one.
  uE(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [step]);

  const tryCancel = () => {
    if (isDirty) { setShowLeaveConfirm(true); }
    else if (onCancel) { onCancel(); }
  };

  const updateIng = (i, k, v) => setIngs(arr => arr.map((x,idx) => idx===i ? {...x, [k]: v} : x));
  const addIng = () => setIngs(arr => [...arr, { qty: '', name: '', icon: 'chef' }]);
  const removeIng = (i) => setIngs(arr => arr.filter((_,idx) => idx !== i));
  const updateStep = (i, k, v) => setStepsArr(arr => arr.map((x,idx) => idx===i ? {...x, [k]: v} : x));
  const addStep = () => setStepsArr(arr => [...arr, { title: '', body: '' }]);
  const removeStep = (i) => setStepsArr(arr => arr.filter((_,idx) => idx !== i));

  const p = paletteOf(paletteKey);
  const canSave = !!title.trim();
  const cats = (catsProp || []).filter(c => c.id !== 'all');
  const currentCat = cats.find(c => c.id === category);

  const done = [
    !!title.trim(),
    ings.some(i => (i.name || '').trim()),
    stepsArr.some(s => (s.title || '').trim() || (s.body || '').trim()),
    (gallery || []).some(slot => {
      const d = window.__getImageSlot && window.__getImageSlot(`food-${recipeId}-${slot}`);
      return !!(d && d.u);
    }),
  ];

  const save = () => {
    if (!canSave) return;
    const id = existing?.id || recipeId;
    const total = (+prepTime || 0) + (+cookTime || 0);
    onSave({
      ...(existing || {}),
      id, title: title.trim(),
      description: desc.trim(),
      cuisine: cuisine.trim(),
      palette: paletteKey, category, imageMode,
      prepTime: +prepTime || 0,
      cookTime: +cookTime || 0,
      time: total || (existing?.time || 0),
      servings: Math.max(0, parseInt(servings, 10) || 0),   // 0 = not stated
      level: existing?.level || 'קל',
      favorite: existing?.favorite || false,
      notes: notes,
      gallery, mainSlot,
      ingredients: ings.filter(i => i.name.trim()).map(i => ({ qty: i.qty || '', name: i.name, icon: i.icon || 'chef' })),
      steps: stepsArr.filter(s => (s.title || '').trim() || (s.body || '').trim()),
    });
  };

  const pane  = { display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 16px 8px' };
  const group = { ...TYPE.label, color: 'var(--ink-faint)', paddingInline: 6, marginTop: 8 };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      // A form sits on a calm surface, not on the app's gradient: the
      // fields are what you are looking at.
      background: 'var(--surface)',
    }}>

      <div style={{ flexShrink: 0 }}>
        <NAppBar
          title={mode === 'edit' ? 'עריכת מתכון' : 'מתכון חדש'}
          subtitle={FORM_STEPS[step].hint}
          onClose={onCancel ? tryCancel : null}
          closeLabel="ביטול"
        />
        <NTabs tabs={FORM_STEPS} index={step} onIndex={setStep} done={done}/>
      </div>

      <div ref={scrollRef} className="scroll-y" style={{ flex: 1, minHeight: 0 }}>

        {step === 0 && (
          <div style={pane}>
            <NField label="שם המתכון" value={title} onChange={setTitle}
              placeholder="עוגת אגוזים של סבתא" autoFocus={mode === 'add'}/>
            <NField label="תיאור" value={desc} onChange={setDesc} multiline rows={3}
              placeholder="במה זה מיוחד?" hint="שורה אחת שתופיע על הכרטיס"/>
            <NRow label="קטגוריה"
              value={currentCat ? `${currentCat.emoji || ''} ${currentCat.label}`.trim() : '—'}
              onClick={() => setCatSheet(true)}/>
            <NField label="סוג מטבח" value={cuisine} onChange={setCuisine}
              placeholder="איטלקית, אסייתית…" hint="לא חובה"/>
            <PreviewCard p={p} title={title} desc={desc} prepTime={prepTime} cookTime={cookTime}
              servings={servings} cuisine={cuisine}/>
          </div>
        )}

        {step === 1 && (
          <div style={pane}>
            <NStepper label="לכמה אנשים" value={servings} onChange={setServings}
              hint="זו נקודת ההתחלה לחישוב הכמויות. אפשר להשאיר ריק אם לא ידוע."/>
            <div style={group}>מצרכים</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ings.map((ing, i) => (
                <IngredientFormRow key={i} ing={ing}
                  onChange={(k, v) => updateIng(i, k, v)}
                  onRemove={() => removeIng(i)}
                  canRemove={ings.length > 1}
                />
              ))}
              <button onClick={addIng} style={addRowBtn}>
                <IconPlus size={18}/> הוספת מצרך
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={pane}>
            <div style={{ display: 'flex', gap: 12 }}>
              <NField label="הכנה (דק׳)" value={prepTime} onChange={setPrepTime}
                type="number" inputMode="numeric" style={{ flex: 1 }}/>
              <NField label="בישול (דק׳)" value={cookTime} onChange={setCookTime}
                type="number" inputMode="numeric" style={{ flex: 1 }}/>
            </div>
            <div style={group}>שלבי הכנה</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stepsArr.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--field-fill)', borderRadius: 'var(--r-lg)', padding: 14,
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                      background: p.bg, color: p.ink, display: 'grid', placeItems: 'center',
                      ...TYPE.small, fontWeight: 800,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0, ...TYPE.small, fontWeight: 700, color: 'var(--ink-soft)' }}>
                      שלב {i + 1}
                    </div>
                    {stepsArr.length > 1 && (
                      <button type="button" onClick={() => removeStep(i)} aria-label="מחיקת שלב"
                        style={{
                          width: 44, height: 44, borderRadius: 999, border: 'none', flexShrink: 0,
                          background: 'transparent', color: 'var(--ink-faint)', cursor: 'pointer',
                          display: 'grid', placeItems: 'center',
                        }}><IconTrash size={18}/></button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <NField label="כותרת השלב" value={s.title} onChange={v => updateStep(i, 'title', v)}/>
                    <NField label="מה עושים" value={s.body} onChange={v => updateStep(i, 'body', v)}
                      multiline rows={3}/>
                  </div>
                </div>
              ))}
              <button onClick={addStep} style={addRowBtn}>
                <IconPlus size={18}/> הוספת שלב
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={pane}>
            <PhotoStage
              recipeId={recipeId}
              gallery={gallery}
              setGallery={setGallery}
              mainSlot={mainSlot}
              setMainSlot={setMainSlot}
              palette={p}
            />
            <div style={group}>צבע הכרטיס</div>
            <NSwatches keys={Object.keys(PALETTES)} palettes={PALETTES} value={paletteKey} onChange={setPaletteKey}/>
            <div style={group}>איך התמונה יושבת בכרטיס</div>
            <NCards value={imageMode} onChange={setImageMode} options={[
              { value: 'pop',    label: 'בולטת',  hint: 'עיגול שיוצא מהמסגרת', preview: <CardShapePreview mode="pop" p={p}/> },
              { value: 'inside', label: 'בפנים',  hint: 'מלבן בתוך המסגרת',    preview: <CardShapePreview mode="inside" p={p}/> },
            ]}/>
            <NField label="הערות אישיות" value={notes} onChange={setNotes} multiline rows={3}
              placeholder="טיפים, שדרוגים, תזכורות לפעם הבאה…"
              hint="רק בשבילך — לא מופיע על הכרטיס"/>
            <PreviewCard p={p} title={title} desc={desc} prepTime={prepTime} cookTime={cookTime}
              servings={servings} cuisine={cuisine}/>
          </div>
        )}
      </div>

      {/* ── the bar that moves you along ───────────────── */}
      <div style={{
        flexShrink: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
        background: 'var(--surface)', borderTop: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <BarButton tone="quiet" onClick={() => (step === 0 ? tryCancel() : setStep(step - 1))}>
          {step === 0 ? 'ביטול' : 'חזרה'}
        </BarButton>
        {step < FORM_STEPS.length - 1 ? (
          <>
            {canSave && <BarButton tone="quiet" onClick={save}>שמירה</BarButton>}
            <BarButton tone="primary" grow onClick={() => setStep(step + 1)}>
              {FORM_STEPS[step + 1].label}
            </BarButton>
          </>
        ) : (
          <BarButton tone="primary" grow disabled={!canSave} onClick={save}>
            {mode === 'edit' ? 'שמירת שינויים' : 'שמירת המתכון'}
          </BarButton>
        )}
      </div>

      {catSheet && (
        <NPickSheet
          title="קטגוריה"
          value={category}
          options={cats.map(c => ({ value: c.id, label: c.label, emoji: c.emoji }))}
          onPick={setCategory}
          onClose={() => setCatSheet(false)}
          footer={onAddCategory ? (
            <button type="button" onClick={() => { setCatSheet(false); onAddCategory(); }}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right',
                padding: '16px 18px', minHeight: 60, color: 'var(--brand-strong)',
              }}>
              <IconPlus size={22} strokeWidth={2.2}/>
              <span style={{ ...TYPE.body, fontWeight: 700 }}>קטגוריה חדשה</span>
            </button>
          ) : null}
        />
      )}

      {showLeaveConfirm && (
        <UnsavedChangesDialog
          onStay={() => setShowLeaveConfirm(false)}
          onLeave={() => { setIsDirty(false); setShowLeaveConfirm(false); if (onCancel) onCancel(); }}
        />
      )}
    </div>
  );
}

// A button for the bar at the bottom of the form. Square-ish, flat, and
// as tall as a thumb — the form has no floating pills in it.
function BarButton({ tone = 'quiet', grow, disabled, onClick, children }) {
  const tones = {
    primary: { background: disabled ? 'var(--field-fill)' : 'var(--ink)', color: disabled ? 'var(--ink-faint)' : 'var(--bg)' },
    quiet:   { background: 'var(--field-fill)', color: 'var(--ink)' },
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        border: 'none', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
        borderRadius: 'var(--r-md)', minHeight: 'var(--field-h)',
        padding: '0 24px', flex: grow ? 1 : '0 0 auto',
        ...TYPE.body, fontWeight: 700,
        transition: 'background var(--dur-fast)',
        ...tones[tone],
      }}>{children}</button>
  );
}

// The little diagram on the two "how the photo sits" choices.
function CardShapePreview({ mode, p }) {
  const inside = mode === 'inside';
  return (
    <div style={{
      position: 'relative', height: 52, borderRadius: 'var(--r-sm)',
      background: p.bg2, overflow: inside ? 'hidden' : 'visible',
    }}>
      <div style={{
        position: 'absolute', top: inside ? 7 : '50%',
        insetInlineStart: inside ? 7 : -10,
        transform: inside ? 'none' : 'translateY(-50%)',
        width: 34, height: 34, borderRadius: inside ? 9 : 999,
        background: p.bg, boxShadow: '0 0 0 2px var(--surface)',
      }}/>
      <div style={{
        position: 'absolute', insetInlineEnd: 9, top: 15, width: '44%', height: 6,
        borderRadius: 99, background: 'var(--line-strong)',
      }}/>
      <div style={{
        position: 'absolute', insetInlineEnd: 9, top: 28, width: '30%', height: 5,
        borderRadius: 99, background: 'var(--line)',
      }}/>
    </div>
  );
}

// The card as it will look on the home screen.
function PreviewCard({ p, title, desc, prepTime, cookTime, servings, cuisine }) {
  return (
    <div style={{
      padding: 22, borderRadius: 'var(--r-lg)', background: p.bg, color: p.ink,
      position: 'relative', overflow: 'hidden', marginTop: 8,
    }}>
      <div style={{ ...TYPE.label, opacity: .6 }}>תצוגה מקדימה</div>
      <div className="display" style={{ ...TYPE.title, marginTop: 8 }}>
        {title || 'שם המתכון שלי'}
      </div>
      <div style={{ ...TYPE.small, marginTop: 8, opacity: .75 }}>
        {desc || 'תיאור קצר שיופיע בכרטיס המתכון…'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <Chip tone="raised" palette={p}><IconClock size={13} strokeWidth={2.4}/> {(+prepTime||0)+(+cookTime||0)} ד׳</Chip>
        {+servings > 0 && <Chip tone="raised" palette={p}><IconUsers size={13} strokeWidth={2.4}/> {servings}</Chip>}
        {cuisine && <Chip tone="raised" palette={p}>🍽 {cuisine}</Chip>}
      </div>
    </div>
  );
}

// Backwards-compat aliases so old call sites work:
function AddRecipeScreen({ onAdd, onCancel, categories, onAddCategory, onDirtyChange, step, onStepChange }) {
  return <RecipeFormScreen mode="add" onSave={onAdd} onCancel={onCancel} categories={categories} onAddCategory={onAddCategory}
    onDirtyChange={onDirtyChange} step={step} onStepChange={onStepChange}/>;
}

function EditRecipeScreen({ recipe, onSave, onCancel, categories, onAddCategory, step, onStepChange }) {
  return <RecipeFormScreen mode="edit" existing={recipe} onSave={onSave} onCancel={onCancel}
    categories={categories} onAddCategory={onAddCategory} step={step} onStepChange={onStepChange}/>;
}

// ───────────────────────────────────────────────────────────
// IngredientFormRow — qty + name + icon picker per row
// ───────────────────────────────────────────────────────────
function IngredientFormRow({ ing, onChange, onRemove, canRemove }) {
  const [pickerOpen, setPickerOpen] = uS(false);
  const emoji = (typeof ING_KEY_EMOJI !== 'undefined' && ING_KEY_EMOJI[ing.icon]) || ing.icon || '🍽️';

  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse', alignItems: 'center' }}>
      <div style={{ flexShrink: 0 }}>
        <button type="button" onClick={() => setPickerOpen(o => !o)}
          aria-label="בחירת סמל"
          style={{
            width: 56, height: 56, borderRadius: 'var(--r-md)', border: 'none',
            background: 'var(--field-fill)', color: 'var(--ink)',
            cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 26,
          }}>{emoji}</button>
        {pickerOpen && (
          <EmojiPickerPopover current={emoji}
            onPick={(e) => { onChange('icon', e); setPickerOpen(false); }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
      <NField label="כמות" value={ing.qty || ''} onChange={v => onChange('qty', v)}
        style={{ width: 104, flex: 'none' }}/>
      <NField label="מצרך" value={ing.name || ''} onChange={v => onChange('name', v)}
        style={{ flex: 1, minWidth: 0 }}/>
      {canRemove && (
        <button type="button" onClick={onRemove} aria-label="מחיקת מצרך" style={{
          width: 44, height: 56, borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--ink-faint)', flexShrink: 0,
          display: 'grid', placeItems: 'center',
        }}><IconTrash size={18}/></button>
      )}
    </div>
  );
}

const FOOD_EMOJIS = [
  '🍽️','🥕','🍎','🥚','🥛','🧀','🍞','🌾','🧂','🌿','🍯','🥩','🐟','🫙','🍾','🍫','☕','🥜',
  '🍅','🥦','🧅','🧄','🥔','🌽','🥒','🍄','🥬','🫑','🥑','🍋','🍊','🍇','🍓','🫐','🍒','🍌',
  '🥞','🧇','🥓','🍗','🍖','🦐','🦞','🍣','🍱','🌮','🍕','🫓','🍜','🍝','🥘','🍲','🌯','🥗',
  '🧆','🍳','🥘','🫕','🍛','🧁','🍰','🎂','🍮','🍭','🍬','🍩','🍪','🌰','🍺','🍷','🍵','🧋',
];

function EmojiPickerPopover({ current, onPick, onClose }) {
  const [custom, setCustom] = uS('');
  return (
    <Sheet title="סמל המצרך" onClose={onClose}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8,
        padding: '4px 4px 16px',
      }}>
        {FOOD_EMOJIS.map(e => (
          <button key={e} type="button" onClick={() => onPick(e)}
            style={{
              height: 56, border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 26,
              background: e === current ? 'var(--field-fill-focus)' : 'var(--field-fill)',
              boxShadow: e === current ? '0 0 0 2px var(--brand-strong) inset' : 'none',
              transition: 'box-shadow var(--dur-fast)',
            }}>{e}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingBottom: 8 }}>
        <NField label="סמל משלך" value={custom} onChange={setCustom} style={{ flex: 1 }}/>
        <button type="button" onClick={() => { if (custom.trim()) onPick(custom.trim()); }}
          disabled={!custom.trim()}
          style={{
            border: 'none', borderRadius: 'var(--r-md)', padding: '0 22px', minHeight: 'var(--field-h)',
            cursor: custom.trim() ? 'pointer' : 'default', flexShrink: 0,
            background: custom.trim() ? 'var(--ink)' : 'var(--field-fill)',
            color: custom.trim() ? 'var(--bg)' : 'var(--ink-faint)',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-body)',
          }}>בחירה</button>
      </div>
    </Sheet>
  );
}

const addRowBtn = {
  border: 'none', background: 'var(--field-fill)',
  borderRadius: 'var(--r-md)', padding: '0 18px', minHeight: 'var(--field-h)', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 'var(--t-body)', fontWeight: 700, color: 'var(--ink)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};


const exportRowStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 'var(--r-md)',
  border: 'none', cursor: 'pointer', textAlign: 'right',
  fontFamily: 'inherit',
};
const exportIconStyle = {
  width: 40, height: 40, borderRadius: 'var(--r-sm)',
  display: 'grid', placeItems: 'center', color: 'var(--bg)',
  flexShrink: 0,
};

function ExportRow({ icon, bg, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={{ ...exportRowStyle, background: 'var(--glass)', color: 'var(--ink)' }}>
      <span style={{ ...exportIconStyle, background: bg }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'flex-end' }}>
        <span style={{ fontWeight: 700, fontSize: 'var(--t-small)' }}>{label}</span>
        <span style={{ fontSize: 'var(--t-caption)', opacity: .7 }}>{sub}</span>
      </div>
      <IconBack size={18} strokeWidth={2.2}/>
    </button>
  );
}

// ───────────────────────────────────────────────────────────
// UnsavedChangesDialog — warning when leaving with unsaved edits
// ───────────────────────────────────────────────────────────
function UnsavedChangesDialog({ onStay, onLeave }) {
  return (
    <ConfirmDialog
      emoji="✏️"
      title="שינויים לא נשמרו"
      body="יש שינויים שטרם נשמרו. לצאת בלי לשמור?"
      confirmLabel="המשך עריכה"
      cancelLabel="צא בלי לשמור"
      confirmColor="var(--ink)"
      onConfirm={onStay}
      onCancel={onLeave}
    />
  );
}

// ───────────────────────────────────────────────────────────
// DeleteConfirm — styled fullscreen confirmation dialog
// ───────────────────────────────────────────────────────────
function DeleteConfirm({ recipe, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      emoji="🗑️"
      title="מחיקת מתכון"
      body={<>בטוח למחוק את<br/><strong style={{ color: 'var(--ink)' }}>"{recipe.title}"</strong>?<br/><span style={{ fontSize: 'var(--t-small)', color: '#c0304f', fontWeight: 700 }}>לא ניתן לשחזר אחרי המחיקה</span></>}
      confirmLabel="מחק מתכון"
      cancelLabel="ביטול"
      confirmColor="#e34466"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

// ───────────────────────────────────────────────────────────
// SharedRecipesSection — horizontal strip of recipes shared with me
// ───────────────────────────────────────────────────────────
function SharedRecipesSection({ items, onOpen, onRemove }) {
  const [confirmId, setConfirmId] = uS(null);
  const confirmItem = items.find(r => r._shareId === confirmId);
  return (
    <div style={{ padding: '4px 0 8px' }}>
      {confirmItem && (
        <ConfirmDialog
          emoji="🤝"
          title="הסרת מתכון משותף"
          body={`להסיר את "${confirmItem.title}" ששותף איתך ע״י ${confirmItem._sharedBy}?`}
          confirmLabel="הסר"
          cancelLabel="ביטול"
          confirmColor="#e34466"
          onConfirm={() => { onRemove(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <div style={{
        padding: '0 22px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 'var(--t-small)', fontWeight: 800, color: 'var(--ink-soft)', letterSpacing: '.06em' }}>
          שותפו איתי
        </span>
        <span style={{
          fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink-soft)',
          background: 'var(--surface-sunken)', borderRadius: 'var(--r-pill)', padding: '2px 8px',
        }}>{items.length}</span>
      </div>
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto',
        padding: '2px 22px 8px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {items.map(r => {
          const p = paletteOf(r.palette);
          return (
            <div key={r._shareId} style={{
              flexShrink: 0, width: 148, position: 'relative',
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              background: p.bg, boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
            }}>
              <div onClick={() => onOpen(r)} style={{ padding: '14px 14px 10px' }}>
                <div style={{ fontSize: 'var(--t-small)', fontWeight: 700, color: p.ink, lineHeight: 1.35, marginBottom: 6 }}>
                  {r.title}
                </div>
                <div style={{
                  fontSize: 'var(--t-caption)', color: p.ink, opacity: .65, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span>👤</span> {r._sharedBy}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setConfirmId(r._shareId); }}
                style={{
                  position: 'absolute', top: 6, insetInlineEnd: 6,
                  width: 22, height: 22, borderRadius: 'var(--r-pill)', border: 'none',
                  background: 'var(--line)', color: p.ink,
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  fontSize: 'var(--t-small)', lineHeight: 1,
                }}>×</button>
            </div>
          );
        })}
      </div>
      <div style={{ height: 1, margin: '4px 22px 0', background: 'var(--surface-sunken)' }}/>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// RecipeSelectSheet — full-screen multi-recipe selector for sharing
// ───────────────────────────────────────────────────────────
function RecipeSelectSheet({ initialRecipe, recipes, categories, onShare, onClose }) {
  const [selectedIds, setSelectedIds] = uS(() => new Set(initialRecipe ? [initialRecipe.id] : []));
  const [catFilter, setCatFilter] = uS('all');
  const [email, setEmail] = uS('');
  const [sharing, setSharing] = uS(false);

  const activeCats = uM(() => {
    const used = new Set(recipes.map(r => r.category).filter(Boolean));
    const all = categories || CATEGORIES;
    return [
      all.find(c => c.id === 'all') || { id: 'all', label: 'הכל', emoji: '🍽️' },
      ...all.filter(c => c.id !== 'all' && used.has(c.id)),
    ];
  }, [recipes, categories]);

  const filtered = uM(() =>
    catFilter === 'all' ? recipes : recipes.filter(r => r.category === catFilter),
    [recipes, catFilter]
  );

  const allInFilterSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

  const toggleRecipe = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSelectAll = () => setSelectedIds(prev => {
    const next = new Set(prev);
    if (allInFilterSelected) filtered.forEach(r => next.delete(r.id));
    else filtered.forEach(r => next.add(r.id));
    return next;
  });

  const handleShare = async () => {
    if (!email.trim() || selectedIds.size === 0) return;
    setSharing(true);
    const selected = recipes.filter(r => selectedIds.has(r.id));
    await onShare(email.trim(), selected);
    setSharing(false);
  };

  const canSend = email.trim() && selectedIds.size > 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 55,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp .32s cubic-bezier(.2,1.1,.35,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 10px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--line)', flexShrink: 0,
        background: 'var(--glass)', backdropFilter: 'blur(8px)',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 'var(--r-pill)', border: 'none',
          background: 'var(--surface-sunken)', cursor: 'pointer',
          display: 'grid', placeItems: 'center', color: 'var(--ink)', flexShrink: 0,
        }}><IconClose size={16} strokeWidth={2.2}/></button>
        <h2 className="display" style={{ margin: 0, fontSize: 'var(--t-heading)', fontWeight: 700, flex: 1 }}>
          שיתוף מתכונים
        </h2>
        <button onClick={toggleSelectAll} style={{
          border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: 'var(--r-sm)',
          background: allInFilterSelected ? 'var(--ink)' : 'var(--surface-sunken)',
          color: allInFilterSelected ? 'var(--bg)' : 'var(--ink)',
          fontFamily: 'inherit', fontSize: 'var(--t-caption)', fontWeight: 700, flexShrink: 0,
        }}>
          {allInFilterSelected ? 'בטל הכל' : 'בחר הכל'}
        </button>
      </div>

      {/* Category filter strip */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 18px 6px',
        overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0,
      }}>
        {activeCats.map(cat => (
          <button key={cat.id} onClick={() => setCatFilter(cat.id)} style={{
            padding: '7px 14px', border: 'none', borderRadius: 'var(--r-pill)', cursor: 'pointer',
            background: catFilter === cat.id ? 'var(--ink)' : 'var(--glass)',
            color: catFilter === cat.id ? 'var(--bg)' : 'var(--ink)',
            fontFamily: 'inherit', fontSize: 'var(--t-small)', fontWeight: 700,
            flexShrink: 0, whiteSpace: 'nowrap',
            boxShadow: 'var(--e1)',
            transition: 'all .15s',
          }}>{cat.emoji} {cat.label}</button>
        ))}
      </div>

      {/* Recipe list */}
      <div className="scroll-y" style={{ flex: 1, padding: '6px 14px 8px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-soft)', fontSize: 'var(--t-small)' }}>
            אין מתכונים בקטגוריה זו
          </div>
        )}
        {filtered.map(r => {
          const checked = selectedIds.has(r.id);
          const p = paletteOf(r.palette);
          return (
            <div key={r.id} onClick={() => toggleRecipe(r.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', marginBottom: 8,
              background: checked ? p.bg : 'var(--glass)',
              borderRadius: 'var(--r-md)',
              boxShadow: checked ? 'var(--shadow-card)' : 'var(--e1)',
              cursor: 'pointer', transition: 'all .15s',
              border: `2px solid ${checked ? (p.accent || p.ink) : 'transparent'}`,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                background: checked ? 'var(--ink)' : 'var(--line)',
                display: 'grid', placeItems: 'center', transition: 'background .15s',
              }}>
                {checked && <span style={{ color: p.ink, fontSize: 'var(--t-small)', lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 'var(--t-small)',
                  color: checked ? p.ink : 'var(--ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{r.title}</div>
                {r.description && (
                  <div style={{
                    fontSize: 'var(--t-caption)', color: 'var(--ink-soft)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '12px 16px 38px', flexShrink: 0,
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleShare()}
            placeholder="gmail של המקבל/ת..."
            type="email" autoFocus
            style={{
              flex: 1, padding: '13px 16px', borderRadius: 'var(--r-md)', border: 'none',
              background: 'var(--glass)', color: 'var(--ink)',
              fontFamily: 'inherit', fontSize: 'var(--t-body)', outline: 'none',
              boxShadow: 'var(--e1)', textAlign: 'right',
            }}/>
          <button onClick={handleShare} disabled={!canSend || sharing} style={{
            padding: '13px 18px', border: 'none', borderRadius: 'var(--r-md)',
            background: canSend ? 'var(--ink)' : 'var(--line)',
            color: canSend ? 'var(--bg)' : 'var(--ink-soft)',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-small)',
            cursor: canSend ? 'pointer' : 'default',
            flexShrink: 0, opacity: sharing ? .7 : 1, whiteSpace: 'nowrap',
          }}>
            {sharing ? '…' : selectedIds.size > 0 ? `שתף ${selectedIds.size}` : 'שתף'}
          </button>
        </div>
        {selectedIds.size > 0 && (
          <div style={{ marginTop: 8, fontSize: 'var(--t-caption)', color: 'var(--ink-soft)', textAlign: 'center' }}>
            {selectedIds.size} מתכונים נבחרו · יופיעו אצל המקבל/ת תחת "שותפו איתי"
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// LoginScreen
// ───────────────────────────────────────────────────────────
function LoginScreen({ onSignIn }) {
  const [loading, setLoading] = uS(false);
  const [err, setErr] = uS('');
  // What actually went wrong. The screen before the sign-in is the one
  // place the diagnostics panel cannot be reached from, so a failure here
  // has to say what it was rather than "try again".
  const [detail, setDetail] = uS('');
  const [showDetail, setShowDetail] = uS(false);

  const handleSignIn = async () => {
    setLoading(true); setErr(''); setDetail('');
    try { await onSignIn(); }
    catch (e) {
      const code = (e && e.code) || '';
      if (code !== 'auth/popup-closed-by-user') {
        setErr('ההתחברות נכשלה');
        setDetail([code, (e && e.message) || String(e)].filter(Boolean).join(' · '));
        if (typeof reportError === 'function') reportError('sign-in', e);
      }
      setLoading(false);
    }
  };

  const copyDetail = async () => {
    try { await navigator.clipboard.writeText(detail); } catch {}
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(900px 600px at 30% 20%, var(--bg-grad-1) 0%, transparent 60%),
                   radial-gradient(800px 600px at 70% 80%, var(--bg-grad-2) 0%, transparent 55%),
                   linear-gradient(180deg, var(--bg-grad-3) 0%, var(--bg-grad-4) 100%)`,
      fontFamily: 'var(--font-body)', padding: 32,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <img src="/maites-logo.png" alt="Maites"
          style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: 8, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,.18))' }}/>
        <p style={{ margin: '0 0 40px', fontSize: 'var(--t-body)', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          ספר המתכונים האישי שלך
        </p>
        <button onClick={handleSignIn} disabled={loading} style={{
          width: '100%', border: 'none', borderRadius: 'var(--r-md)',
          padding: '16px 20px', cursor: loading ? 'wait' : 'pointer',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--e2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontFamily: 'inherit', fontSize: 'var(--t-body)', fontWeight: 700, color: '#1f1f1f',
          opacity: loading ? .7 : 1,
          transition: 'transform .15s, box-shadow .15s',
        }}
          onMouseDown={e => e.currentTarget.style.transform='scale(.98)'}
          onMouseUp={e => e.currentTarget.style.transform=''}
          onMouseLeave={e => e.currentTarget.style.transform=''}
        >
          {loading ? <span style={{ fontSize: 'var(--t-heading)' }}>⏳</span> : (
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.7-2.1 5-4.4 6.5v5.4h7.1c4.2-3.8 6.6-9.5 6.6-15.9z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2.1 1.4-4.7 2.2-8.1 2.2-6.2 0-11.5-4.2-13.4-9.9H3.3v5.7C7 42.6 15 48 24 48z"/>
              <path fill="#FBBC05" d="M10.6 29.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3v-5.7H3.3C1.2 18.6 0 21.2 0 24s1.2 5.4 3.3 7l7.3-5.7z"/>
              <path fill="#EA4335" d="M24 9.6c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.4 2.4 30.1 0 24 0 15 0 7 5.4 3.3 13.3l7.3 5.7C12.5 13.8 17.8 9.6 24 9.6z"/>
            </svg>
          )}
          {loading ? 'מתחברת…' : 'כניסה עם Google'}
        </button>
        {err && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: 0, color: 'var(--brand-strong)', fontSize: 'var(--t-small)', fontWeight: 700 }}>{err}</p>
            {detail && (
              <>
                <button type="button" onClick={() => setShowDetail(v => !v)}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                    color: 'var(--ink-soft)', fontSize: 'var(--t-caption)', fontWeight: 700,
                    padding: '10px 4px', minHeight: 44, textDecoration: 'underline',
                  }}>{showDetail ? 'הסתרת הפרטים' : 'מה נכשל?'}</button>
                {showDetail && (
                  <div style={{
                    background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)', padding: '12px 14px',
                    fontSize: 'var(--t-caption)', color: 'var(--ink)', lineHeight: 1.5,
                    wordBreak: 'break-word', textAlign: 'start', direction: 'ltr',
                  }}>
                    {detail}
                    <button type="button" onClick={copyDetail}
                      style={{
                        display: 'block', marginTop: 10, border: 'none', cursor: 'pointer',
                        background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r-sm)',
                        padding: '10px 16px', minHeight: 44, fontFamily: 'inherit',
                        fontSize: 'var(--t-caption)', fontWeight: 700, direction: 'rtl',
                      }}>העתקת הפרטים</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// AccountPanel — bottom sheet: profile, sharing, sign out
// ───────────────────────────────────────────────────────────
function AccountPanel({ user, recipes, sharesInfo, pendingInvites, onClose, onSignOut, onSignIn, onUploadLocal, localCount = 0, themeMode = 'auto', onThemeChange, onResetServings, onExport, onImport, onInvite, onCancelInvite, onRevokeShare }) {
  const [confirmReset, setConfirmReset] = uS(false);
  const withServings = recipes.filter(r => +r.servings > 0).length;
  const [inviteEmail, setInviteEmail] = uS('');
  const [inviting, setInviting] = uS(false);
  const [mutual, setMutual] = uS(false);
  const [tab, setTab] = uS('profile'); // 'profile' | 'share'

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await onInvite(inviteEmail.trim(), mutual);
    setInviteEmail('');
    setMutual(false);
    setInviting(false);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 55,
      background: 'var(--overlay)', backdropFilter: 'blur(12px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)',
        borderRadius: '32px 32px 0 0',
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: 'var(--e3)',
        animation: 'slideUp .36s cubic-bezier(.2,1.1,.35,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 'var(--r-pill)', background: 'var(--line)' }}/>
        </div>

        {/* User header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 24px 16px',
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 'var(--r-pill)', flexShrink: 0,
            background: 'linear-gradient(135deg,#f7a8b8,#c9b8e8)',
            overflow: 'hidden', display: 'grid', placeItems: 'center',
            boxShadow: 'var(--e1)',
          }}>
            {user?.photoURL
              ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" referrerPolicy="no-referrer"/>
              : <span style={{ fontSize: 'var(--t-title)', fontWeight: 700, color: 'var(--ink)' }}>
                  {user ? (user.displayName || user.email || '?')[0].toUpperCase() : '⚙'}
                </span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--t-body)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? (user.displayName || 'משתמש') : 'ללא חשבון'}
            </div>
            <div style={{ fontSize: 'var(--t-small)', color: 'var(--ink-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? user.email : 'המתכונים נשמרים על המכשיר הזה'}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            background: 'var(--surface-sunken)', color: 'var(--ink-soft)',
            display: 'grid', placeItems: 'center', fontSize: 'var(--t-heading)', flexShrink: 0,
          }}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '0 20px 0', gap: 8, borderBottom: '1px solid var(--line)' }}>
          {(user ? [['profile', 'פרופיל'], ['share', 'שיתוף']] : [['profile', 'פרופיל']]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-small)',
              color: tab === id ? 'var(--ink)' : 'var(--ink-soft)',
              borderBottom: tab === id ? '2.5px solid var(--ink)' : '2.5px solid transparent',
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        <div style={{ padding: '20px 20px 40px' }}>

          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Stats */}
              <div style={{
                background: 'var(--glass)', borderRadius: 'var(--r-md)', padding: '16px 20px',
                display: 'flex', gap: 0,
              }}>
                {[
                  { num: recipes.length, label: 'מתכונים' },
                  { num: recipes.filter(r => r.favorite).length, label: 'מועדפים' },
                  { num: (sharesInfo.asGuest || []).length, label: 'שיתופים' },
                ].map((s, i, arr) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center',
                    borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    padding: '4px 0',
                  }}>
                    <div style={{ fontSize: 'var(--t-title)', fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{s.num}</div>
                    <div style={{ fontSize: 'var(--t-caption)', color: 'var(--ink-soft)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {!user && <SignInBlock onSignIn={onSignIn} localCount={localCount}/>}

              {/* Appearance */}
              <div style={{ marginTop: 4 }}>
                <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>מראה</SectionLabel>
                <SegmentedControl
                  label="ערכת נושא"
                  value={themeMode}
                  onChange={onThemeChange}
                  options={[
                    { value: 'auto',  label: 'לפי המכשיר' },
                    { value: 'light', label: 'בהיר' },
                    { value: 'dark',  label: 'כהה' },
                  ]}
                />
              </div>

              {/* Quantities */}
              {onResetServings && withServings > 0 && (
                <div style={{ marginTop: 4 }}>
                  <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>כמויות</SectionLabel>
                  <div style={{
                    background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)', padding: '12px 14px',
                    display: 'grid', gap: 10,
                  }}>
                    <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 500, lineHeight: 1.5 }}>
                      מתכונים שיובאו מאקסל קיבלו בעבר "4 מנות" אוטומטית, גם אם הקובץ לא אמר כלום.
                      אפשר לאפס את המספר בכל המתכונים ולהגדיר אותו מחדש רק היכן שהוא באמת ידוע.
                    </div>
                    <Button size="sm" tone="glass" onClick={() => setConfirmReset(true)}>
                      איפוס מספר המנות ({withServings} מתכונים)
                    </Button>
                  </div>
                </div>
              )}

              {/* Backup */}
              {typeof BackupBlock === 'function' && <BackupBlock user={user}/>}

              {/* Files — Excel and Word. This used to sit at the bottom of
                  "new recipe", which is not where anyone looks for it. */}
              {onExport && (
                <div style={{ marginTop: 4 }}>
                  <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>קבצים</SectionLabel>
                  <div style={{
                    background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)',
                    padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <ExportRow icon={<IconExcel size={20}/>} bg="#1d6f42" label="ייצוא ל-Excel"
                      sub="קובץ XLSX עם כל המתכונים"
                      onClick={() => onExport('excel')}/>
                    <ExportRow icon={<IconWord size={20}/>} bg="#2b579a" label="ייצוא לוורד"
                      sub="ספר מתכונים מעוצב להדפסה · עמוד נפרד לכל מתכון"
                      onClick={() => onExport('word')}/>
                    {onImport && (
                      <label style={{ ...exportRowStyle, background: 'var(--glass)', color: 'var(--ink)', cursor: 'pointer' }}>
                        <span style={{ ...exportIconStyle, background: '#5b4452' }}><IconUpload size={20}/></span>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: 'var(--t-small)' }}>ייבוא מקובץ Excel</span>
                          <span style={{ fontSize: 'var(--t-caption)', opacity: .7 }}>קובץ .xlsx · עמודות בעברית</span>
                        </div>
                        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                          onChange={onImport} style={{ display: 'none' }}/>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Diagnostics */}
              <DiagnosticsBlock/>

              {/* The account */}
              {user ? (
                <Button tone="quiet" full onClick={onSignOut} style={{
                  background: 'var(--danger-soft)', color: 'var(--danger)', marginTop: 4,
                }}>
                  <span style={{ fontSize: 'var(--t-heading)' }} aria-hidden="true">🚪</span> יציאה מהחשבון
                </Button>
              ) : null}

              {/* Recipes written before signing in, still on this device */}
              {user && localCount > 0 && onUploadLocal && (
                <LocalNotebookBlock count={localCount} onUpload={onUploadLocal}/>
              )}
            </div>
          )}

          {tab === 'share' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Advanced account sharing */}
              <div>
                <div style={{ fontSize: 'var(--t-caption)', fontWeight: 800, color: 'var(--ink-soft)', letterSpacing: '.1em', marginBottom: 10 }}>
                  שיתוף חשבון
                </div>
                <div style={{
                  background: 'var(--glass)', borderRadius: 'var(--r-md)', padding: '14px 16px',
                  fontSize: 'var(--t-small)', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 10,
                }}>
                  הזמן/י מישהו לראות את כל המתכונים שלך — כולל עתידיים. הם יקבלו גישה ברגע שיכנסו לאפליקציה עם הג׳ימייל שלהם.
                </div>

                {/* People I shared with (as owner) */}
                {(sharesInfo.asOwner || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>שיתפת עם:</div>
                    {sharesInfo.asOwner.map(s => (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: 'var(--glass)', borderRadius: 'var(--r-sm)',
                        marginBottom: 6, boxShadow: 'var(--e1)',
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--r-pill)',
                          background: 'linear-gradient(135deg,#f7a8b8,#c9b8e8)',
                          display: 'grid', placeItems: 'center', fontSize: 'var(--t-body)', flexShrink: 0,
                        }}>{(s.guestEmail || '?')[0].toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--t-small)', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.guestEmail}
                          </div>
                          {s.mutual && (
                            <div style={{ fontSize: 'var(--t-caption)', color: '#6b48a0', fontWeight: 700, marginTop: 1 }}>הדדי</div>
                          )}
                        </div>
                        <button onClick={() => onRevokeShare(s.id)} style={{
                          border: 'none', background: 'rgba(227,68,102,.1)', color: '#c0304f',
                          borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 'var(--t-caption)', fontWeight: 700, flexShrink: 0,
                        }}>בטל</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending invites I sent */}
                {(pendingInvites || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>הזמנות שלחתי (ממתינות):</div>
                    {pendingInvites.map(inv => (
                      <div key={inv.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: 'rgba(255,213,85,.15)', borderRadius: 'var(--r-sm)',
                        marginBottom: 6, border: '1px dashed var(--line-strong)',
                      }}>
                        <span style={{ fontSize: 'var(--t-body)' }}>⏳</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--t-small)', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.guestEmail}
                          </div>
                          {inv.mutual && (
                            <div style={{ fontSize: 'var(--t-caption)', color: '#6b48a0', fontWeight: 700, marginTop: 1 }}>הדדי</div>
                          )}
                        </div>
                        <button onClick={() => onCancelInvite(inv.id)} style={{
                          border: 'none', background: 'var(--surface-sunken)', color: 'var(--ink-soft)',
                          borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 'var(--t-caption)', fontWeight: 700, flexShrink: 0,
                        }}>בטל</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Accounts I have access to (as guest) */}
                {(sharesInfo.asGuest || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>יש לי גישה ל:</div>
                    {sharesInfo.asGuest.map(s => (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: 'rgba(179,228,195,.25)', borderRadius: 'var(--r-sm)',
                        marginBottom: 6, border: '1px solid var(--line)',
                      }}>
                        <span style={{ fontSize: 'var(--t-body)' }}>✅</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--t-small)', fontWeight: 700, color: 'var(--ink)' }}>{s.ownerDisplayName || s.ownerEmail}</div>
                          <div style={{ fontSize: 'var(--t-caption)', color: 'var(--ink-soft)' }}>{s.ownerEmail}</div>
                        </div>
                        <button onClick={() => onRevokeShare(s.id)} style={{
                          border: 'none', background: 'var(--surface-sunken)', color: 'var(--ink-soft)',
                          borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 'var(--t-caption)', fontWeight: 700, flexShrink: 0,
                        }}>הסר</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Invite input */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    placeholder="gmail של מישהו..."
                    type="email"
                    style={{
                      flex: 1, padding: '12px 14px', borderRadius: 'var(--r-sm)', border: 'none',
                      background: 'var(--glass)', color: 'var(--ink)',
                      fontFamily: 'inherit', fontSize: 'var(--t-small)', outline: 'none',
                      boxShadow: 'var(--e1)',
                      textAlign: 'right',
                    }}/>
                  <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} style={{
                    padding: '12px 18px', border: 'none', borderRadius: 'var(--r-sm)', cursor: inviteEmail.trim() ? 'pointer' : 'default',
                    background: inviteEmail.trim() ? 'var(--ink)' : 'var(--line)',
                    color: inviteEmail.trim() ? 'var(--bg)' : 'var(--ink-soft)',
                    fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-small)', flexShrink: 0,
                    opacity: inviting ? .7 : 1,
                  }}>{inviting ? '…' : 'הזמן'}</button>
                </div>

                {/* Mutual toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0 2px', gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 'var(--t-small)', fontWeight: 700, color: 'var(--ink)' }}>שיתוף הדדי</div>
                    <div style={{ fontSize: 'var(--t-caption)', color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.4 }}>
                      גם המוזמן/ת יראו את כל המתכונים שלך, כולל עתידיים
                    </div>
                  </div>
                  <button onClick={() => setMutual(m => !m)} aria-label="שיתוף הדדי" style={{
                    width: 48, height: 28, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
                    background: mutual ? '#6b48a0' : 'var(--line)',
                    position: 'relative', flexShrink: 0, transition: 'background .22s', padding: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: 3, width: 22, height: 22, borderRadius: 'var(--r-pill)',
                      background: 'var(--surface-raised)', boxShadow: 'var(--e1)',
                      transition: 'left .22s',
                      left: mutual ? 23 : 3,
                    }}/>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {confirmReset && (
        <ConfirmDialog
          emoji="👥"
          title="איפוס מספר המנות"
          body={`המספר יימחק מ-${withServings} מתכונים, וכל מתכון יתחיל ממנה אחת עד שתגדירו לו מספר. הכמויות עצמן לא משתנות.`}
          confirmLabel="איפוס"
          cancelLabel="ביטול"
          confirmColor="var(--ink)"
          onConfirm={() => { setConfirmReset(false); onResetServings(); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      <style>{`@keyframes slideUp{0%{opacity:0;transform:translateY(60px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// Shows recorded failures so a problem on the phone leaves a trace.
// ───────────────────────────────────────────────────────────
// SignInBlock — the account, offered rather than demanded.
// The app opens without one; this is where you add one.
// ───────────────────────────────────────────────────────────
function SignInBlock({ onSignIn, localCount = 0 }) {
  const [busy, setBusy] = uS(false);
  const [err, setErr] = uS('');
  const [detail, setDetail] = uS('');
  const [showDetail, setShowDetail] = uS(false);

  const go = async () => {
    setBusy(true); setErr(''); setDetail('');
    try { await onSignIn(); }
    catch (e) {
      const code = (e && e.code) || '';
      if (code !== 'auth/popup-closed-by-user') {
        setErr('ההתחברות נכשלה');
        setDetail([code, (e && e.message) || String(e)].filter(Boolean).join(' · '));
        if (typeof reportError === 'function') reportError('sign-in', e);
      }
    } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 4 }}>
      <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>חשבון</SectionLabel>
      <div style={{
        background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)',
        padding: '14px 16px', display: 'grid', gap: 12,
      }}>
        <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 500, lineHeight: 1.55 }}>
          {localCount > 0
            ? `${localCount} מתכונים שמורים על המכשיר הזה בלבד. התחברות מעלה אותם לענן, מסנכרנת בין מכשירים, ומאפשרת שיתוף.`
            : 'התחברות מסנכרנת את המתכונים בין מכשירים, שומרת אותם בענן ומאפשרת שיתוף. בלעדיה הכל נשמר על המכשיר הזה בלבד.'}
        </div>
        <Button tone="primary" size="lg" full disabled={busy} onClick={go}>
          {busy ? 'מתחבר…' : 'התחברות עם Google'}
        </Button>
        {err && (
          <div>
            <div style={{ ...TYPE.caption, color: 'var(--danger)', fontWeight: 700 }}>{err}</div>
            {detail && (
              <>
                <button type="button" onClick={() => setShowDetail(v => !v)}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                    color: 'var(--ink-soft)', ...TYPE.caption, fontWeight: 700,
                    padding: '10px 2px', minHeight: 44, textDecoration: 'underline',
                  }}>{showDetail ? 'הסתרה' : 'מה נכשל?'}</button>
                {showDetail && (
                  <div style={{
                    background: 'var(--surface-raised)', borderRadius: 'var(--r-sm)', padding: '10px 12px',
                    ...TYPE.caption, color: 'var(--ink)', direction: 'ltr', textAlign: 'start',
                    wordBreak: 'break-word', lineHeight: 1.5,
                  }}>
                    {detail}
                    <button type="button"
                      onClick={() => { try { navigator.clipboard.writeText(detail); } catch {} }}
                      style={{
                        display: 'block', marginTop: 10, border: 'none', cursor: 'pointer',
                        background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r-sm)',
                        padding: '10px 16px', minHeight: 44, fontFamily: 'inherit',
                        ...TYPE.caption, fontWeight: 700, direction: 'rtl',
                      }}>העתקת הפרטים</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// LocalNotebookBlock — recipes written before there was an
// account. Uploading is offered, never done behind your back.
// ───────────────────────────────────────────────────────────
function LocalNotebookBlock({ count, onUpload }) {
  const [busy, setBusy] = uS(false);
  return (
    <div style={{ marginTop: 4 }}>
      <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>על המכשיר</SectionLabel>
      <div style={{
        background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)',
        padding: '14px 16px', display: 'grid', gap: 12,
      }}>
        <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', fontWeight: 500, lineHeight: 1.55 }}>
          {count} מתכונים נכתבו לפני שהתחברת והם עדיין רק כאן. אפשר להעלות אותם לחשבון —
          מתכון שכבר קיים בחשבון לא ייגע.
        </div>
        <Button tone="glass" full disabled={busy}
          onClick={async () => { setBusy(true); try { await onUpload(); } finally { setBusy(false); } }}>
          {busy ? 'מעלה…' : `העלאת ${count} מתכונים לחשבון`}
        </Button>
      </div>
    </div>
  );
}

function DiagnosticsBlock() {
  const [log, setLog] = uS(() => (typeof readErrorLog === 'function' ? readErrorLog() : []));
  const [open, setOpen] = uS(false);
  uE(() => (typeof onErrorLogChange === 'function' ? onErrorLogChange(setLog) : undefined), []);

  const copy = async () => {
    const text = log.map(e => `${e.at} · ${e.context} · ${e.message}`).join('\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div style={{ marginTop: 4 }}>
      <SectionLabel style={{ marginBottom: 8, paddingInlineStart: 2 }}>תקלות</SectionLabel>
      {log.length === 0 ? (
        <div style={{
          ...TYPE.small, color: 'var(--ink-soft)', fontWeight: 500,
          background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)', padding: '12px 14px',
        }}>לא נרשמו תקלות ✓</div>
      ) : (
        <div style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--r-md)', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 10 : 0 }}>
            <span style={{ ...TYPE.small, fontWeight: 700, color: 'var(--danger)', flex: 1 }}>
              {log.length} תקלות נרשמו
            </span>
            <Button size="sm" tone="glass" onClick={() => setOpen(o => !o)}>{open ? 'הסתרה' : 'הצגה'}</Button>
          </div>
          {open && (
            <>
              <div className="scroll-y" style={{ maxHeight: 180, display: 'grid', gap: 8 }}>
                {log.slice(0, 12).map((e, i) => (
                  <div key={i} style={{
                    background: 'var(--surface-raised)', borderRadius: 'var(--r-sm)', padding: '9px 11px',
                  }}>
                    <div style={{ ...TYPE.caption, color: 'var(--ink-faint)' }}>
                      {new Date(e.at).toLocaleString('he-IL')} · {e.context}{e.online ? '' : ' · לא מקוון'}
                    </div>
                    <div style={{ ...TYPE.caption, color: 'var(--ink)', marginTop: 3, wordBreak: 'break-word', fontWeight: 500 }}>
                      {e.message}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button size="sm" tone="glass" onClick={copy} style={{ flex: 1 }}>העתקת הפירוט</Button>
                <Button size="sm" tone="quiet" onClick={() => clearErrorLog()} style={{ flex: 1 }}>ניקוי</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  HomeScreen, DetailScreen, FavoritesScreen,
  AddRecipeScreen, EditRecipeScreen, RecipeFormScreen,
  DeleteConfirm, UnsavedChangesDialog, LoginScreen, AccountPanel,
  SharedRecipesSection, RecipeSelectSheet, DiagnosticsBlock, SignInBlock, LocalNotebookBlock,
});
