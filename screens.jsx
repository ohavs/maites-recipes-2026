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
        {currentUser && (
          <button onClick={onOpenAccount} aria-label="חשבון"
            style={{
              width: 40, height: 40, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
              background: 'var(--glass)', padding: 0, overflow: 'hidden',
              boxShadow: 'var(--e1)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
            {currentUser.photoURL
              ? <img src={currentUser.photoURL} style={{ width: 40, height: 40, objectFit: 'cover' }} alt="" referrerPolicy="no-referrer"/>
              : <span style={{ fontSize: 'var(--t-body)', fontWeight: 700, color: 'var(--ink)' }}>
                  {(currentUser.displayName || currentUser.email || '?')[0].toUpperCase()}
                </span>
            }
          </button>
        )}
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
        <button onClick={() => onDensity(density === 'comfy' ? 'compact' : density === 'compact' ? 'grid' : 'comfy')}
          aria-label="פריסת תצוגה" title="פריסה"
          style={{
            width: 44, height: 44, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', flexShrink: 0,
            background: density !== 'comfy' ? 'var(--ink)' : 'var(--glass)',
            color: density !== 'comfy' ? 'var(--bg)' : 'var(--ink)',
            display: 'grid', placeItems: 'center',
            boxShadow: 'var(--e1)',
            transition: 'all .2s',
          }}>
          {density === 'comfy' ? <IconRows size={18} strokeWidth={2.2}/>
            : density === 'compact' ? <IconGrid size={18} strokeWidth={2.2}/>
            : <IconColumns2 size={18} strokeWidth={2.2}/>}
        </button>
        <button onClick={() => setSearching(s => !s)} aria-label="חיפוש"
          style={{
            width: 44, height: 44, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', flexShrink: 0,
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
        : { display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 12 : 22 })
      }}>
        {!recipesLoaded && (
          [1, 2, 3].map(i => <RecipeCardSkeleton key={i} density={density} />)
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
  const baseServings = +recipe.servings || 0;
  const [servings, setServings] = uS(baseServings);
  uE(() => { setServings(+recipe.servings || 0); }, [recipe.id, recipe.servings]);
  const factor = baseServings > 0 && servings > 0 ? servings / baseServings : 1;

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
            margin: 0, fontSize: 'var(--t-display)', fontWeight: 700, color: 'var(--ink)',
            textWrap: 'balance',
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
            {baseServings > 0 && (recipe.ingredients || []).length > 0 && (
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
        : { display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 12 : 22 })
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
// RecipeFormScreen — used for both "add new" and "edit existing".
// Includes per-ingredient icon picker.
// ───────────────────────────────────────────────────────────
function RecipeFormScreen({ existing, onSave, onCancel, onExport, onImport, mode = 'add', categories: catsProp, onAddCategory, onDirtyChange }) {
  const [title, setTitle] = uS(existing?.title || '');
  const [desc, setDesc] = uS(existing?.description || '');
  const [cuisine, setCuisine] = uS(existing?.cuisine || '');
  const [prepTime, setPrepTime] = uS(existing?.prepTime ?? 15);
  const [cookTime, setCookTime] = uS(existing?.cookTime ?? 15);
  const [servings, setServings] = uS(existing?.servings ?? 4);
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
  const mountedRef = uR(false);
  const ingsKey = ings.map(i => (i.name || '') + (i.qty || '')).join('|');
  const stepsKey = stepsArr.map(s => (s.title || '') + (s.body || '')).join('|');
  uE(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setIsDirty(true);
  }, [title, desc, cuisine, category, paletteKey, imageMode, notes, prepTime, cookTime, servings, ingsKey, stepsKey]);
  uE(() => { if (onDirtyChange) onDirtyChange(isDirty); }, [isDirty]);
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
  const addGallerySlot = () => setGallery(arr => [...arr, `g${Date.now().toString(36)}`]);
  const removeGallerySlot = (slot) => setGallery(arr => arr.length > 1 ? arr.filter(s => s !== slot) : arr);

  const p = paletteOf(paletteKey);
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
      palette: paletteKey, category, imageMode,
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
        <h1 className="display" style={{ margin: 0, fontSize: 'var(--t-title)', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {mode === 'edit' ? 'עריכת מתכון' : 'מתכון חדש'}
        </h1>
        {onCancel && (
          <button onClick={tryCancel} aria-label="ביטול" style={{
            width: 36, height: 36, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--glass)',
            color: 'var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center',
            boxShadow: 'var(--e1)',
          }}><IconClose size={16} strokeWidth={2.2}/></button>
        )}
      </div>

      {/* preview chip */}
      <div style={{
        margin: '18px 18px 22px', padding: '20px',
        borderRadius: 'var(--r-lg)', background: p.bg, color: p.ink,
        boxShadow: 'var(--shadow-card)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ fontSize: 'var(--t-caption)', fontWeight: 700, opacity: .65, letterSpacing: '.12em' }}>תצוגה מקדימה</div>
        <div className="display" style={{ fontSize: 'var(--t-title)', fontWeight: 700, marginTop: 6 }}>
          {title || 'שם המתכון שלי'}
        </div>
        <div style={{ fontSize: 'var(--t-small)', marginTop: 6, opacity: .75 }}>
          {desc || 'תיאור קצר שיופיע בכרטיס המתכון…'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Chip tone="raised" palette={p}><IconClock size={13} strokeWidth={2.4}/> {(+prepTime||0)+(+cookTime||0)} ד׳</Chip>
          <Chip tone="raised" palette={p}><IconUsers size={13} strokeWidth={2.4}/> {servings}</Chip>
          {cuisine && <Chip tone="raised" palette={p}>🍽 {cuisine}</Chip>}
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
                  border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--r-pill)',
                  fontFamily: 'inherit', fontSize: 'var(--t-small)', fontWeight: 700,
                  background: category === c.id ? 'var(--ink)' : 'var(--glass)',
                  color: category === c.id ? 'var(--bg)' : 'var(--ink)',
                  boxShadow: 'var(--e1)',
                }}>{c.emoji} {c.label}</button>
            ))}
            {onAddCategory && (
              <button onClick={onAddCategory} style={{
                border: '1.5px dashed var(--line-strong)', cursor: 'pointer',
                padding: '8px 14px', borderRadius: 'var(--r-pill)', background: 'transparent',
                fontFamily: 'inherit', fontSize: 'var(--t-small)', fontWeight: 700, color: 'var(--ink-soft)',
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
                  width: 36, height: 36, borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                  background: PALETTES[k].bg,
                  boxShadow: paletteKey === k
                    ? '0 0 0 3px var(--ink), var(--e1)'
                    : 'var(--e1)',
                  transform: paletteKey === k ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all .18s',
                }}/>
            ))}
          </div>
        </Field>

        <Field label="סגנון התמונה בכרטיס">
          <div style={{ display: 'flex', gap: 10, flexDirection: 'row-reverse' }}>
            {[
              { id: 'pop',    label: 'בולטת מהכרטיס', hint: 'עיגול שיוצא מהמסגרת' },
              { id: 'inside', label: 'בתוך הכרטיס',   hint: 'תמונה מלבנית בתוך המסגרת' },
            ].map(opt => {
              const on = imageMode === opt.id;
              return (
                <button key={opt.id} onClick={() => setImageMode(opt.id)} style={{
                  flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  borderRadius: 'var(--r-md)', padding: '12px 10px 11px', textAlign: 'center',
                  background: on ? 'var(--ink)' : 'var(--glass)',
                  color: on ? 'var(--bg)' : 'var(--ink)',
                  boxShadow: on ? 'var(--e1)' : 'var(--e1)',
                  transition: 'all .18s',
                }}>
                  {/* mini preview of the card layout */}
                  <div style={{
                    position: 'relative', height: 40, borderRadius: 'var(--r-sm)',
                    background: on ? 'rgba(255,255,255,.14)' : p.bg2,
                    marginBottom: 8, overflow: opt.id === 'inside' ? 'hidden' : 'visible',
                  }}>
                    <div style={{
                      position: 'absolute', top: opt.id === 'inside' ? 6 : '50%',
                      insetInlineStart: opt.id === 'inside' ? 6 : -9,
                      transform: opt.id === 'inside' ? 'none' : 'translateY(-50%)',
                      width: 28, height: 28,
                      borderRadius: opt.id === 'inside' ? 8 : 999,
                      background: on ? 'var(--bg)' : 'var(--surface-raised)',
                      boxShadow: 'var(--e1)',
                    }}/>
                    <div style={{
                      position: 'absolute', insetInlineEnd: 8, top: 12, width: '45%', height: 5,
                      borderRadius: 'var(--r-pill)', background: on ? 'rgba(255,255,255,.55)' : 'var(--line-strong)',
                    }}/>
                    <div style={{
                      position: 'absolute', insetInlineEnd: 8, top: 22, width: '32%', height: 4,
                      borderRadius: 'var(--r-pill)', background: on ? 'rgba(255,255,255,.35)' : 'var(--line)',
                    }}/>
                  </div>
                  <div style={{ fontSize: 'var(--t-small)', fontWeight: 800 }}>{opt.label}</div>
                  <div style={{ fontSize: 10.5, opacity: .7, marginTop: 2 }}>{opt.hint}</div>
                </button>
              );
            })}
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
                background: 'var(--surface-raised)', borderRadius: 'var(--r-md)', padding: 12,
                boxShadow: 'var(--e1)', position: 'relative',
              }}>
                <input value={s.title} onChange={e => updateStep(i, 'title', e.target.value)}
                  placeholder={`כותרת שלב ${i+1}`} style={{...inputStyle, marginBottom: 6}}/>
                <textarea value={s.body} onChange={e => updateStep(i, 'body', e.target.value)} rows={2}
                  placeholder="תיאור..." style={{...inputStyle, resize: 'vertical', minHeight: 56}}/>
                {stepsArr.length > 1 && (
                  <button onClick={() => removeStep(i)} aria-label="מחיקה" style={{
                    position: 'absolute', top: 6, insetInlineEnd: 6,
                    width: 26, height: 26, borderRadius: 'var(--r-pill)', border: 'none',
                    background: 'var(--surface-sunken)', color: 'var(--ink-soft)', cursor: 'pointer',
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

        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          {onCancel && (
            <button onClick={tryCancel} style={{
              flexShrink: 0, padding: '18px 20px', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--r-lg)', background: 'var(--surface-sunken)',
              color: 'var(--ink)', fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-body)',
            }}>ביטול</button>
          )}
          <button onClick={save} disabled={!canSave} style={{
            flex: 1, padding: '18px', border: 'none',
            cursor: canSave ? 'pointer' : 'default',
            borderRadius: 'var(--r-lg)', background: canSave ? 'var(--ink)' : 'var(--line)',
            color: 'var(--bg)', fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-body)',
            boxShadow: canSave ? 'var(--e1)' : 'none',
            opacity: canSave ? 1 : .7,
          }}>{mode === 'edit' ? 'שמירת שינויים' : 'שמירת המתכון'}</button>
        </div>

        {/* Export / Import — only shown in add mode */}
        {mode === 'add' && onExport && (
          <div style={{
            marginTop: 22, padding: 16, borderRadius: 'var(--r-md)',
            background: 'var(--glass)', backdropFilter: 'blur(10px)',
            boxShadow: 'var(--e1)',
          }}>
            <SectionLabel ink="var(--ink-soft)">ייצוא וייבוא</SectionLabel>
            <p style={{ margin: '8px 0 12px', fontSize: 'var(--t-small)', lineHeight: 1.55, color: 'var(--ink-soft)' }}>
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
                ...exportRowStyle, background: 'var(--glass)', color: 'var(--ink)', cursor: 'pointer',
              }}>
                <span style={{ ...exportIconStyle, background: '#5b4452' }}><IconUpload size={20}/></span>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 'var(--t-small)' }}>ייבוא מקובץ Excel</span>
                  <span style={{ fontSize: 'var(--t-caption)', opacity: .7 }}>קובץ .xlsx · עמודות בעברית</span>
                </div>
                <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={onImport} style={{ display: 'none' }}/>
              </label>
            </div>
          </div>
        )}
      </div>
      {showLeaveConfirm && (
        <UnsavedChangesDialog
          onStay={() => setShowLeaveConfirm(false)}
          onLeave={() => { setIsDirty(false); setShowLeaveConfirm(false); if (onCancel) onCancel(); }}
        />
      )}
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
  const [confirmRemoveSlot, setConfirmRemoveSlot] = uS(null);
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
    // Delete from Firestore image_slots
    const slotId = `food-${recipeId}-${slot}`;
    if (typeof db_deleteImageSlot !== 'undefined') db_deleteImageSlot(slotId);
    if (window.__setImageSlot) window.__setImageSlot(slotId, null);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      {confirmRemoveSlot && (
        <ConfirmDialog
          emoji="🖼️"
          title="הסרת תמונה"
          body="בטוח להסיר את התמונה הזו?"
          confirmLabel="הסר תמונה"
          cancelLabel="ביטול"
          confirmColor="#e34466"
          onConfirm={() => { removeSlot(confirmRemoveSlot); setConfirmRemoveSlot(null); }}
          onCancel={() => setConfirmRemoveSlot(null)}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, flexDirection: 'row-reverse' }}>
        {gallery.map(slot => {
          const isMain = slot === mainSlot;
          const preview = previews[slot];
          return (
            <div key={slot} style={{ position: 'relative' }}>
              <button type="button" onClick={() => openPicker(slot)} style={{
                width: 84, height: 84, borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
                background: preview ? 'transparent' : 'var(--surface-sunken)',
                overflow: 'hidden', padding: 0,
                boxShadow: isMain ? `0 0 0 3px ${p.accent}` : 'var(--e1)',
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
                  width: 22, height: 22, borderRadius: 'var(--r-pill)',
                  background: p.accent, color: 'var(--surface-raised)',
                  display: 'grid', placeItems: 'center', fontSize: 'var(--t-caption)',
                  pointerEvents: 'none', boxShadow: 'var(--e1)',
                }}>★</div>
              )}
              {!isMain && preview && (
                <button type="button" onClick={() => setMainSlot(slot)} title="הגדר כתמונה ראשית" style={{
                  position: 'absolute', top: -7, insetInlineStart: -7,
                  width: 22, height: 22, borderRadius: 'var(--r-pill)',
                  background: 'var(--glass-strong)', color: 'var(--ink-soft)',
                  border: 'none', cursor: 'pointer', fontSize: 'var(--t-caption)',
                  display: 'grid', placeItems: 'center',
                  boxShadow: 'var(--e1)',
                }}>☆</button>
              )}
              {gallery.length > 1 && (
                <button type="button" onClick={() => setConfirmRemoveSlot(slot)} style={{
                  position: 'absolute', top: -7, insetInlineEnd: -7,
                  width: 22, height: 22, borderRadius: 'var(--r-pill)',
                  background: 'var(--glass-strong)', color: 'var(--brand-strong)',
                  border: 'none', cursor: 'pointer', fontSize: 'var(--t-body)', lineHeight: 1,
                  display: 'grid', placeItems: 'center',
                  boxShadow: 'var(--e1)',
                }}>×</button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={addSlot} style={{
          width: 84, height: 84, borderRadius: 'var(--r-md)',
          border: '1.5px dashed var(--line-strong)', background: 'transparent',
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
function AddRecipeScreen({ onAdd, onExport, onImport, categories, onAddCategory, onDirtyChange }) {
  return <RecipeFormScreen mode="add" onSave={onAdd} onExport={onExport} onImport={onImport} categories={categories} onAddCategory={onAddCategory} onDirtyChange={onDirtyChange}/>;
}

function EditRecipeScreen({ recipe, onSave, onCancel, categories, onAddCategory }) {
  return <RecipeFormScreen mode="edit" existing={recipe} onSave={onSave} onCancel={onCancel} categories={categories} onAddCategory={onAddCategory}/>;
}

// ───────────────────────────────────────────────────────────
// IngredientFormRow — qty + name + icon picker per row
// ───────────────────────────────────────────────────────────
function IngredientFormRow({ ing, onChange, onRemove, canRemove }) {
  const [pickerOpen, setPickerOpen] = uS(false);
  const emoji = (typeof ING_KEY_EMOJI !== 'undefined' && ING_KEY_EMOJI[ing.icon]) || ing.icon || '🍽️';

  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: 'row-reverse', alignItems: 'stretch' }}>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setPickerOpen(o => !o)}
          aria-label="בחר אמוג׳י"
          style={{
            width: 44, height: '100%', minHeight: 44, borderRadius: 'var(--r-sm)', border: 'none',
            background: 'var(--glass)', color: 'var(--ink)',
            cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 'var(--t-title)',
            boxShadow: 'var(--e1)',
          }}>{emoji}</button>
        {pickerOpen && (
          <EmojiPickerPopover current={emoji}
            onPick={(e) => { onChange('icon', e); setPickerOpen(false); }}
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
          width: 36, borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
          background: 'var(--surface-sunken)', color: 'var(--ink-soft)',
          display: 'grid', placeItems: 'center',
        }}><IconTrash size={14}/></button>
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
  uE(() => {
    const onDown = (e) => {
      if (!e.target.closest?.('[data-emoji-pop]')) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  return (
    <div data-emoji-pop="1" style={{
      position: 'absolute', top: '100%', insetInlineEnd: 0, marginTop: 6,
      background: 'var(--surface-raised)', borderRadius: 'var(--r-md)', padding: 10,
      boxShadow: 'var(--e2)',
      width: 260, zIndex: 20,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {FOOD_EMOJIS.map(e => (
          <button key={e} onClick={() => onPick(e)}
            style={{
              height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 'var(--t-heading)',
              background: e === current ? 'var(--ink)' : 'var(--surface-sunken)',
              transition: 'all .12s',
            }}>{e}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={custom} onChange={e => setCustom(e.target.value)}
          placeholder="הקלד/י אמוג׳י…"
          style={{
            flex: 1, border: 'none', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 'var(--t-body)',
            background: 'var(--surface-sunken)', fontFamily: 'inherit', outline: 'none', textAlign: 'right',
          }}/>
        <button onClick={() => { if (custom.trim()) onPick(custom.trim()); }}
          disabled={!custom.trim()}
          style={{
            border: 'none', borderRadius: 'var(--r-sm)', padding: '8px 12px', cursor: 'pointer',
            background: custom.trim() ? 'var(--ink)' : 'var(--line)',
            color: custom.trim() ? 'var(--bg)' : 'var(--ink-soft)', fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-small)',
          }}>בחר</button>
      </div>
    </div>
  );
}

const addRowBtn = {
  border: '1.5px dashed var(--line-strong)', background: 'transparent',
  borderRadius: 'var(--r-sm)', padding: '10px', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 'var(--t-small)', fontWeight: 600, color: 'var(--ink-soft)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
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

  const handleSignIn = async () => {
    setLoading(true); setErr('');
    try { await onSignIn(); }
    catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setErr('ההתחברות נכשלה, נסי שוב');
      setLoading(false);
    }
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
        {err && <p style={{ marginTop: 14, color: 'var(--brand-strong)', fontSize: 'var(--t-small)' }}>{err}</p>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// AccountPanel — bottom sheet: profile, sharing, sign out
// ───────────────────────────────────────────────────────────
function AccountPanel({ user, recipes, sharesInfo, pendingInvites, onClose, onSignOut, onInvite, onCancelInvite, onRevokeShare, themeMode = 'auto', onThemeChange }) {
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
                  {(user?.displayName || user?.email || '?')[0].toUpperCase()}
                </span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--t-body)', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.displayName || 'משתמש'}
            </div>
            <div style={{ fontSize: 'var(--t-small)', color: 'var(--ink-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
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
          {[['profile', 'פרופיל'], ['share', 'שיתוף']].map(([id, label]) => (
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

              {/* Diagnostics */}
              <DiagnosticsBlock/>

              {/* Sign out */}
              <Button tone="quiet" full onClick={onSignOut} style={{
                background: 'var(--danger-soft)', color: 'var(--danger)', marginTop: 4,
              }}>
                <span style={{ fontSize: 'var(--t-heading)' }} aria-hidden="true">🚪</span> יציאה מהחשבון
              </Button>
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
      <style>{`@keyframes slideUp{0%{opacity:0;transform:translateY(60px)}100%{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// Shows recorded failures so a problem on the phone leaves a trace.
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
  PhotoManager, DeleteConfirm, UnsavedChangesDialog, LoginScreen, AccountPanel,
  SharedRecipesSection, RecipeSelectSheet, DiagnosticsBlock,
});
