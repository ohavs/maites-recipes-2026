// screens.jsx — full screen views

const { useState: uS, useRef: uR, useEffect: uE, useMemo: uM, useLayoutEffect: uLE } = React;

// ───────────────────────────────────────────────────────────
// HomeScreen — Maites brand bar + inline search + density
// toggle + categories + stacked cards (with bigger circles
// poking out of each card edge).
// ───────────────────────────────────────────────────────────
// One shape for every action on the home screen's toolbar: the same
// height as the category dropdown beside them, so the row reads as a row
// rather than as a dropdown with three circles stuck on the end.
function HomeAction({ children, label, onClick, on = false, pressed, disabled = false }) {
  return (
    <button type="button" onClick={onClick}
      aria-label={label} title={label}
      aria-pressed={pressed}
      disabled={disabled}
      style={{
        width: 52, height: 52, flexShrink: 0,
        borderRadius: 'var(--r-md)', border: 'none', padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? .4 : 1,
        background: on ? 'var(--ink)' : 'var(--surface-raised)',
        color: on ? 'var(--bg)' : 'var(--ink)',
        display: 'grid', placeItems: 'center',
        transition: 'background var(--dur-fast), color var(--dur-fast), transform var(--dur-fast)',
      }}
      onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.92)'; }}
      onPointerUp={e => { e.currentTarget.style.transform = ''; }}
      onPointerLeave={e => { e.currentTarget.style.transform = ''; }}
    >{children}</button>
  );
}

function HomeScreen({ recipes, recipesLoaded = true, loadError = null, onRetryLoad, onOpen, onToggleFav, density, onDensity, variant, category, onCategory, onClearCategory, sharedKey, categories, onAddCategory, onManageCategories, onEditCategory, currentUser, onOpenAccount, sharedWithMe, onOpenShared, onRemoveShared }) {
  const [q, setQ] = uS('');
  const [searching, setSearching] = uS(false);
  // Favourites used to be a screen of its own, which meant leaving home to
  // see a subset of home. It is a filter, like the categories next to it.
  const [favOnly, setFavOnly] = uS(false);
  const selectedCats = Array.isArray(category) ? category : (category && category !== 'all' ? [category] : []);
  const favCount = recipes.filter(r => r.favorite).length;

  const filtered = uM(() => {
    const qq = q.trim().toLowerCase();
    let r = recipes;
    if (favOnly) r = r.filter(x => x.favorite);
    if (selectedCats.length) r = r.filter(x => selectedCats.includes(x.category));
    if (!qq) return r;
    return r.filter(x =>
      x.title.toLowerCase().includes(qq)
      || (x.description || '').toLowerCase().includes(qq)
      || (x.ingredients || []).some(i => (i.name || '').toLowerCase().includes(qq))
    );
  }, [recipes, selectedCats.join(','), q, favOnly]);

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
      {/* The top of the screen used to be two crowded rows: a title with an
          avatar, then a dropdown and three floating circles beside it, all
          different shapes. It is one row of actions under the title now,
          each the same shape as the other, and the search field is one of
          them rather than a circle that unfolds into one. */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h1 className="display" data-comment-anchor="home-brand" style={{
              margin: 0, fontSize: 'var(--t-display)', fontWeight: 800, letterSpacing: '-.01em',
              color: 'var(--ink)', fontFamily: 'var(--font-display)',
            }}>Maites</h1>
            <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 2 }}>
              {recipes.length ? `${recipes.length} מתכונים` : 'ספר המתכונים שלך'}
            </div>
          </div>
          <button onClick={onOpenAccount} aria-label="חשבון"
            style={{
              width: 46, height: 46, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
              background: 'var(--surface-raised)', padding: 0, overflow: 'hidden',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
            {currentUser && currentUser.photoURL
              ? <img src={currentUser.photoURL} style={{ width: 46, height: 46, objectFit: 'cover' }} alt="" referrerPolicy="no-referrer"/>
              : <span style={{ fontSize: 'var(--t-body)', fontWeight: 700, color: 'var(--ink)' }}>
                  {currentUser ? (currentUser.displayName || currentUser.email || '?')[0].toUpperCase() : '⚙'}
                </span>
            }
          </button>
        </div>
      </div>

      {/* One row: what you are looking at, and the three ways to change it. */}
      <div style={{
        padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 8,
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
          onEditCategory={onEditCategory}
        />
        <HomeAction label="חיפוש" on={searching || !!q} onClick={() => setSearching(s => !s)}>
          <IconSearch size={19} strokeWidth={2.2}/>
        </HomeAction>
        <HomeAction label={favOnly ? 'הצגת כל המתכונים' : 'רק מועדפים'}
          on={favOnly} pressed={favOnly}
          disabled={!favCount && !favOnly}
          onClick={() => setFavOnly(v => !v)}>
          <IconHeart filled={favOnly} size={19} strokeWidth={2.2}/>
        </HomeAction>
        <HomeAction label={density === 'grid' ? 'מעבר לכרטיסים' : 'מעבר לגריד'}
          on={density === 'grid'}
          onClick={() => onDensity(density === 'grid' ? 'comfy' : 'grid')}>
          {density === 'grid' ? <IconRows size={19} strokeWidth={2.2}/> : <IconGrid size={19} strokeWidth={2.2}/>}
        </HomeAction>
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
                category={(categories || []).find(c => c.id === r.category) || (typeof CATEGORY_SEED !== 'undefined' ? CATEGORY_SEED[r.category] : null)}
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
function DetailScreen({ recipe, onClose, onToggleFav, onOpenSteps, onEdit, onDelete, onDuplicate, onUpdateNotes, onShare, onShareText, onShareImage, readOnly = false, openMs = 380 }) {
  const p = paletteOf(recipe.palette);
  const [menu, setMenu] = uS(null);   // 'more' | 'share'
  // Quantities in the recipe's own measures, or turned into grams and
  // millilitres where the ingredient is one we know the weight of.
  const [metric, setMetric] = uS(false);
  const canConvert = uM(() => (recipe.ingredients || []).some(i => typeof convertQuantity === 'function'
    && convertQuantity(i.qty, i.name, 'metric') !== (i.qty || '')), [recipe.ingredients]);
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
  // With a photograph the hero IS the photograph: it fills the whole band,
  // edge to edge, so it needs the height a picture deserves. Without one
  // the band shrinks to just the top bar.
  const HERO_H = heroPhoto ? 306 : 116;
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
          {/* the scattered dots are the backdrop for a hero with no
              picture; over a photograph they are only litter */}
          {!heroPhoto && (
            <div style={{ opacity: decorOpacity, transition: 'opacity .2s' }}>
              <DecorScatter palette={p}/>
            </div>
          )}
          {heroPhoto && (
            <div style={{
              position: 'absolute', inset: 0,
              transform: `translateY(${-imgTranslate}px)`,
              transition: 'transform .05s linear',
              opacity: imgOpacity,
            }}>
              <ImageGallery recipeId={recipe.id}
                slots={recipe.gallery && recipe.gallery.length ? recipe.gallery : ['main']}
                palette={p}
              />
              {/* the round buttons float straight on the picture, so the
                  top of it gets a floor dark enough to hold them */}
              <div aria-hidden="true" style={{
                position: 'absolute', insetInline: 0, top: 0, height: 120,
                pointerEvents: 'none',
                background: 'linear-gradient(to bottom, rgba(0,0,0,.34) 0%, rgba(0,0,0,.12) 55%, rgba(0,0,0,0) 100%)',
              }}/>
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
          // Down to the bottom of the screen however short the recipe is —
          // a short one used to end in mid-air, its shadow on the page below.
          minHeight: `calc(100% - ${HERO_H - BODY_OVERLAP}px)`,
          boxShadow: 'var(--e3)',
        }}>
          <h1 className="display" data-comment-anchor="detail-title" style={{
            margin: 0, fontSize: 'var(--t-hero)', fontWeight: 700, color: 'var(--ink)',
            lineHeight: 1.15, textWrap: 'balance',
          }}>{recipe.title}</h1>

          {/* Only what the recipe actually says. A time nobody wrote down
              used to read "0 דקות", and a recipe that never said how many
              it feeds read "1 מנות" — both made up by the screen. */}
          {(() => {
            const minutes = recipeMinutes(recipe);
            const stated = +recipe.servings > 0;
            if (!minutes && !stated && !recipe.cuisine) return null;
            return (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {minutes > 0 && <Chip tone="palette" palette={p}><IconClock size={13} strokeWidth={2.4}/> {formatMinutes(minutes)}</Chip>}
                {stated && <Chip tone="palette" palette={p}><IconUsers size={13} strokeWidth={2.4}/> {countLabel(servings, 'מנה אחת', 'מנות')}</Chip>}
                {recipe.cuisine && <Chip tone="palette" palette={p}><IconCuisine size={13} strokeWidth={2.4}/> {recipe.cuisine}</Chip>}
              </div>
            );
          })()}

          {recipe.description && (
            <p style={{
              marginTop: 18, fontSize: 'var(--t-body)', lineHeight: 1.55, color: 'var(--ink-soft)',
              fontWeight: 400,
            }}>{typeof stripHTML === 'function' ? stripHTML(recipe.description) : recipe.description}</p>
          )}

          {/* Ingredients, part by part when the recipe has parts */}
          {(() => {
            const groups = ingredientGroups(recipe.ingredients);
            if (!groups.length) return null;
            return (
              <div style={{ marginTop: 26 }}>
                <SectionLabel ink={p.accent}>מצרכים</SectionLabel>
                <div style={{ marginTop: 12 }}>
                  <ServingScaler base={baseServings} servings={servings} onChange={setServings} palette={p}/>
                </div>
                {canConvert && (
                  <div style={{ marginTop: 10 }}>
                    <SegmentedControl label="יחידות מידה" value={metric ? 'metric' : 'orig'}
                      onChange={(v) => setMetric(v === 'metric')}
                      options={[{ value: 'orig', label: 'כמו במתכון' }, { value: 'metric', label: 'גרם ומ״ל' }]}/>
                  </div>
                )}
                {groups.map((g, gi) => (
                  <div key={gi} style={{ marginTop: g.name ? 22 : 12 }}>
                    {g.name && (
                      <div style={{
                        ...TYPE.heading, color: 'var(--ink)',
                        display: 'flex', alignItems: 'center', gap: 10, paddingInline: 4,
                      }}>
                        <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 'var(--r-pill)', background: p.bg }}/>
                        {g.name}
                      </div>
                    )}
                    <div style={{ marginTop: g.name ? 4 : 0, display: 'flex', flexDirection: 'column' }}>
                      {g.items.map(({ ing, index }) => (
                        <IngredientRow key={index} ing={ing} palette={p} index={index} factor={factor} metric={metric}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Notes — only when there are some */}
          {(() => {
            const notes = typeof stripHTML === 'function' ? stripHTML(recipe.notes || '') : (recipe.notes || '');
            if (!notes.trim()) return null;
            return (
              <div style={{ marginTop: 26 }}>
                <SectionLabel ink={p.accent}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconNote size={14} strokeWidth={2.2}/>
                    הערות אישיות
                  </span>
                </SectionLabel>
                <p style={{
                  margin: '10px 0 0', fontSize: 'var(--t-small)', lineHeight: 1.65, color: 'var(--ink)',
                  whiteSpace: 'pre-line', padding: '14px 16px', borderRadius: 'var(--r-md)',
                  background: 'var(--glass)',
                  boxShadow: 'var(--e1)',
                }}>{notes}</p>
              </div>
            );
          })()}

          {/* CTA — the way into the steps, when there are steps */}
          {(() => {
            const s = recipe.steps || [];
            const isAuto = s.length > 0 && s.every(x => /^שלב\s*\d+$/.test((x.title || '').trim()));
            const hasContent = !!(recipe.instructions?.trim())
              || (s.length > 0 && !isAuto)
              || (isAuto && s.some(x => (x.body || '').trim()));
            if (!hasContent) return null;
            const label = (s.length > 0 && !isAuto) ? `בואו נכין יחד · ${countLabel(s.length, 'שלב אחד', 'שלבים')}` : 'הוראות הכנה';
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
          <RoundBtn onClick={onClose} title="חזרה" size={44}>
            <IconForward size={20} strokeWidth={2.4}/>
          </RoundBtn>
        </div>

        {readOnly ? (
          recipe._sharedBy ? (
            <div style={{
              pointerEvents: 'auto',
              background: 'var(--glass)', borderRadius: 'var(--r-pill)', padding: '8px 14px',
              fontSize: 'var(--t-caption)', fontWeight: 700, color: 'var(--ink)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IconUsers size={14} strokeWidth={2.4}/> שותף ע״י {recipe._sharedBy}
            </div>
          ) : <div/>
        ) : (
          // Three things you do often stay on the picture; the rest —
          // editing, copying, deleting — wait behind ⋯, so deleting a
          // recipe is never one stray tap away.
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RoundBtn onClick={() => onToggleFav(recipe.id)} title="מועדפים" size={44}
              ink={recipe.favorite ? 'var(--brand-strong)' : 'var(--ink)'}>
              <FavHeart filled={recipe.favorite}/>
            </RoundBtn>
            <RoundBtn onClick={() => setMenu('share')} title="שיתוף" size={44}>
              <IconShare size={19} strokeWidth={2.2}/>
            </RoundBtn>
            <RoundBtn onClick={() => setMenu('more')} title="עוד פעולות" size={44}>
              <IconMore size={20}/>
            </RoundBtn>
          </div>
        )}
      </div>

      {menu === 'more' && (
        <Sheet title={recipe.title} onClose={() => setMenu(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
            <SheetAction icon={<IconEdit size={21}/>} label="עריכה"
              onClick={() => { setMenu(null); onEdit(recipe); }}/>
            {onDuplicate && (
              <SheetAction icon={<IconCopy size={21}/>} label="שכפול — ליצירת גרסה אחרת"
                onClick={() => { setMenu(null); onDuplicate(recipe); }}/>
            )}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 6 }}/>
            <SheetAction icon={<IconTrash size={21}/>} label="מחיקת המתכון" danger
              onClick={() => { setMenu(null); onDelete(recipe); }}/>
          </div>
        </Sheet>
      )}

      {menu === 'share' && (
        <Sheet title="שיתוף" subtitle={recipe.title} onClose={() => setMenu(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
            <SheetAction icon={<IconText size={21}/>} label="שליחה כטקסט — לוואטסאפ ולכל מקום"
              onClick={() => { setMenu(null); onShareText && onShareText(recipe); }}/>
            <SheetAction icon={<IconImage size={21}/>} label="שליחה כתמונה של עמוד המתכון"
              onClick={() => { setMenu(null); onShareImage && onShareImage(recipe); }}/>
            {onShare && (
              <SheetAction icon={<IconUsers size={21}/>} label="שיתוף עם חשבון Maites אחר"
                onClick={() => { setMenu(null); onShare(recipe); }}/>
            )}
          </div>
        </Sheet>
      )}
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


function IngredientRow({ ing, palette, index, factor = 1, metric = false }) {
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
        width: 44, height: 44, borderRadius: 'var(--r-lg)', background: palette.tag,
        display: 'grid', placeItems: 'center', color: palette.accent, flexShrink: 0,
      }}>
        <IngredientIcon size={20} kind={
          (ing.icon && ing.icon !== 'chef')
            ? ing.icon
            : ((typeof guessIngredientIcon === 'function' && guessIngredientIcon(ing.name)) || 'chef')
        }/>
      </span>
      <span style={{
        fontSize: 'var(--t-body)', fontWeight: 600, color: 'var(--ink)', flex: 1,
      }}>
        <span style={{ color: palette.accent, fontVariantNumeric: 'tabular-nums', marginInlineEnd: 8 }}>
          {(() => {
            const q = typeof scaleQuantity === 'function' ? scaleQuantity(ing.qty, factor) : ing.qty;
            return metric && typeof convertQuantity === 'function' ? convertQuantity(q, ing.name, 'metric') : q;
          })()}
        </span>
        {ing.name}
      </span>
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
  { id: 'what',  label: 'המתכון',  hint: 'שם, תמונה, איך ייראה' },
  { id: 'ings',  label: 'מצרכים',  hint: 'מה נכנס, ובאיזו כמות' },
  { id: 'how',   label: 'הכנה',    hint: 'זמנים, שלבים, הערות' },
];

function RecipeFormScreen({ existing, onSave, onCancel, mode = 'add', categories: catsProp, cuisines = [], onAddCategory, onEditCategory, onDeleteCategory, onRenameCuisine, onCountCuisine, onDirtyChange, step: stepProp, onStepChange }) {
  const [title, setTitle] = uS(existing?.title || '');
  const [desc, setDesc] = uS(existing?.description || '');
  const [cuisine, setCuisine] = uS(existing?.cuisine || '');
  // Empty until somebody says otherwise. These used to start at 15 and
  // 15, so every recipe nobody timed claimed to take half an hour.
  const [prepTime, setPrepTime] = uS(existing?.prepTime > 0 ? String(existing.prepTime) : '');
  const [cookTime, setCookTime] = uS(existing?.cookTime > 0 ? String(existing.cookTime) : '');
  const [servings, setServings] = uS(existing?.servings > 0 ? String(existing.servings) : '');
  const [paletteKey, setPaletteKey] = uS(existing?.palette || 'peach');
  // 'pop' = photo circle pokes out of the card, 'inside' = photo contained in it
  const [imageMode, setImageMode] = uS(existing?.imageMode || 'pop');
  const [category, setCategory] = uS(existing?.category || 'mains');
  const [notes, setNotes] = uS(existing?.notes || '');
  // The ingredients, part by part. A recipe with no parts is one section
  // with no name, and the form shows it as a plain list.
  const [sections, setSections] = uS(() => ingredientSections(existing?.ingredients));
  // The one ingredient open for editing; the rest read as finished lines.
  const [activeIng, setActiveIng] = uS(() => (existing?.ingredients?.length ? null : FIRST_ING_KEY));
  const [focusIng, setFocusIng] = uS(null);
  const [ingMenu, setIngMenu] = uS(null);       // { s, i } — the ingredient whose menu is open
  const [groupMenu, setGroupMenu] = uS(null);   // the section whose menu is open
  const [focusGroup, setFocusGroup] = uS(null);  // a new section, waiting for its name
  const [stepsArr, setStepsArr] = uS(existing?.steps?.length ? existing.steps : [{ title: '', body: '' }]);
  const [gallery, setGallery] = uS(existing?.gallery?.length ? existing.gallery : (defaultGallery ? defaultGallery() : ['main']));
  const [mainSlot, setMainSlot] = uS(existing?.mainSlot || gallery[0] || 'main');
  // Stable ID for image slots — persists across re-renders so photos survive form edits
  const [recipeId] = uS(existing?.id || `new-${Date.now().toString(36)}`);
  const [isDirty, setIsDirty] = uS(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = uS(false);
  const [catSheet, setCatSheet] = uS(false);
  const [confirmNode, confirm] = useConfirm();
  // The step lives in App when it is mounted there, so the phone's back
  // gesture walks back through the four instead of throwing the form away.
  const [ownStep, setOwnStep] = uS(0);
  const step = typeof stepProp === 'number' ? stepProp : ownStep;
  const setStep = (i) => {
    const n = Math.min(FORM_STEPS.length - 1, Math.max(0, i));
    if (onStepChange) onStepChange(n); else setOwnStep(n);
  };
  const mountedRef = uR(false);
  const ingsKey = sections.map(sc => (sc.name || '') + ':' +
    sc.items.map(i => (i.name || '') + (i.qty || '') + (i.icon || '')).join(',')).join('|');
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

  // ── the ingredients, by section ───────────────────────
  const editSection = (sk, fn) => setSections(ss => ss.map(sc => sc._k === sk ? fn(sc) : sc));

  const updateIng = (sk, ik, k, v) => editSection(sk, sc => ({
    ...sc,
    items: sc.items.map(x => {
      if (x._k !== ik) return x;
      const next = { ...x, [k]: v };
      // Typing a name picks the icon, so a recipe written in a hurry does
      // not arrive as twenty identical plates. Choosing one by hand sticks.
      if (k === 'name' && !x.iconPicked && typeof guessIngredientIcon === 'function') {
        next.icon = guessIngredientIcon(v) || 'chef';
      }
      if (k === 'icon') next.iconPicked = true;
      return next;
    }),
  }));

  // Opening one ingredient closes the last, and a row that was opened and
  // left empty goes with it rather than staying behind as a blank line.
  const openIng = (ik, focus = true) => {
    setSections(ss => ss.map(sc => ({
      ...sc,
      items: sc.items.filter(x => x._k === ik || !isBlankIng(x)),
    })));
    setActiveIng(ik);
    setFocusIng(focus ? ik : null);
  };

  const addIng = (sk) => {
    const item = blankIng();
    setSections(ss => ss.map(sc => ({
      ...sc,
      items: [...sc.items.filter(x => !isBlankIng(x)), ...(sc._k === sk ? [item] : [])],
    })));
    setActiveIng(item._k);
    setFocusIng(item._k);
  };

  const dropIng = (sk, ik) => {
    editSection(sk, sc => ({ ...sc, items: sc.items.filter(x => x._k !== ik) }));
    if (activeIng === ik) setActiveIng(null);
  };

  // Removing a row that has something written in it throws that writing
  // away, so it asks first. An untouched row has nothing to lose and goes
  // quietly — a dialog for an empty row is just a dialog in the way.
  const removeIng = (sk, ik) => {
    const row = (sections.find(sc => sc._k === sk)?.items || []).find(x => x._k === ik) || {};
    if (isBlankIng(row)) return dropIng(sk, ik);
    confirm({
      title: 'למחוק את המצרך?',
      body: <><strong style={{ color: 'var(--ink)' }}>{(row.qty ? row.qty + ' ' : '') + (row.name || '')}</strong> יימחק מהרשימה.</>,
      onConfirm: () => dropIng(sk, ik),
    });
  };

  const moveIng = (sk, ik, dir) => editSection(sk, sc => {
    const items = [...sc.items];
    const at = items.findIndex(x => x._k === ik);
    const to = at + dir;
    if (at < 0 || to < 0 || to >= items.length) return sc;
    [items[at], items[to]] = [items[to], items[at]];
    return { ...sc, items };
  });

  // Moves an ingredient into another part of the recipe — or into a new
  // part, which is how a list written flat gets split up afterwards.
  const moveIngTo = (sk, ik, target) => {
    const item = sections.find(sc => sc._k === sk)?.items.find(x => x._k === ik);
    if (!item) return;
    let next = sections.map(sc => sc._k === sk ? { ...sc, items: sc.items.filter(x => x._k !== ik) } : sc);
    let into = target;
    if (target === 'new') {
      const sec = { _k: nextIngKey(), name: '', named: true, items: [item] };
      into = sec._k;
      next = [...next, sec];
      setFocusGroup(sec._k);
    } else {
      next = next.map(sc => sc._k === target ? { ...sc, items: [...sc.items, item] } : sc);
    }
    // A section left with nothing in it and no name has no reason to stay.
    setSections(next.filter(sc => sc.items.length || sc.name.trim() || sc._k === into));
    if (typeof hapticTap === 'function') hapticTap();
  };

  const addGroup = () => {
    if (typeof hapticTap === 'function') hapticTap();
    // A list that has nothing in it yet does not need a nameless part
    // above the new one: the empty list simply gets a name.
    const only = sections.length === 1 ? sections[0] : null;
    if (only && !only.named && !only.name && only.items.every(isBlankIng)) {
      setSections([{ ...only, named: true }]);
      setFocusGroup(only._k);
      return;
    }
    const item = blankIng();
    const sec = { _k: nextIngKey(), name: '', named: true, items: [item] };
    setSections([...sections.map(sc => ({ ...sc, items: sc.items.filter(x => !isBlankIng(x)) })), sec]);
    setFocusGroup(sec._k);
    setActiveIng(item._k);
    setFocusIng(null);
  };

  const renameGroup = (sk, name) => editSection(sk, sc => ({ ...sc, name }));

  const moveGroup = (sk, dir) => setSections(ss => {
    const next = [...ss];
    const at = next.findIndex(sc => sc._k === sk);
    const to = at + dir;
    if (at < 0 || to < 0 || to >= next.length) return ss;
    [next[at], next[to]] = [next[to], next[at]];
    return next;
  });

  const removeGroup = (sk) => {
    const sec = sections.find(sc => sc._k === sk);
    if (!sec) return;
    const filled = sec.items.filter(x => !isBlankIng(x)).length;
    const drop = () => setSections(ss => {
      const left = ss.filter(sc => sc._k !== sk);
      return left.length ? left : ingredientSections([]);
    });
    if (!filled && !sec.name.trim()) return drop();
    confirm({
      title: 'למחוק את הקבוצה?',
      body: <>
        <strong style={{ color: 'var(--ink)' }}>{sec.name.trim() || 'הקבוצה'}</strong>
        {filled ? <> ו־{countLabel(filled, 'המצרך שבה', 'המצרכים שבה')} יימחקו.</> : ' תימחק.'}
      </>,
      onConfirm: drop,
    });
  };

  // Dissolving a part keeps what is in it: the ingredients join the part
  // above, or the first part when it was the first.
  const ungroup = (sk) => setSections(ss => {
    const at = ss.findIndex(sc => sc._k === sk);
    if (at < 0) return ss;
    const into = at > 0 ? at - 1 : 1;
    if (!ss[into]) return ss.map(sc => sc._k === sk ? { ...sc, name: '', named: false } : sc);
    const items = ss[at].items.filter(x => !isBlankIng(x));
    return ss
      .map((sc, i) => i === into ? { ...sc, items: [...sc.items, ...items] } : sc)
      .filter((_, i) => i !== at);
  });

  const updateStep = (i, k, v) => setStepsArr(arr => arr.map((x,idx) => idx===i ? {...x, [k]: v} : x));
  const addStep = () => setStepsArr(arr => [...arr, { title: '', body: '' }]);
  const dropStep = (i) => setStepsArr(arr => arr.filter((_,idx) => idx !== i));

  const removeStep = (i) => {
    const st = stepsArr[i] || {};
    if (!(st.title || '').trim() && !(st.body || '').trim()) return dropStep(i);
    confirm({
      title: `למחוק את שלב ${i + 1}?`,
      body: 'מה שנכתב בשלב הזה יימחק.',
      onConfirm: () => dropStep(i),
    });
  };

  const p = paletteOf(paletteKey);
  const canSave = !!title.trim();
  const cats = (catsProp || []).filter(c => c.id !== 'all');
  // A new recipe starts in "mains", which is created the moment it is
  // saved — so the row says so rather than showing a dash until then.
  const currentCat = cats.find(c => c.id === category)
    || (typeof CATEGORY_SEED !== 'undefined' ? CATEGORY_SEED[category] : null);

  const done = [
    !!title.trim(),
    sections.some(sc => sc.items.some(i => (i.name || '').trim())),
    stepsArr.some(s => (s.title || '').trim() || (s.body || '').trim()),
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
      // An old recipe that only ever had a total keeps it; one that was
      // timed in halves says exactly what the halves say, nothing at all
      // included.
      time: total || ((existing && existing.prepTime == null && existing.cookTime == null) ? (existing.time || 0) : 0),
      servings: Math.max(0, parseInt(servings, 10) || 0),   // 0 = not stated
      level: existing?.level || 'קל',
      favorite: existing?.favorite || false,
      notes: notes,
      gallery, mainSlot,
      ingredients: flattenSections(sections),
      steps: stepsArr.filter(s => (s.title || '').trim() || (s.body || '').trim()),
    });
  };

  const pane  = { display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 16px 8px' };
  const group = { ...TYPE.label, color: 'var(--ink-faint)', paddingInline: 6, marginTop: 8 };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      // The same ground as every other screen; the fields and cards on it
      // are white, as the cards on the home screen are.
      background: 'var(--ground)', backgroundColor: 'var(--bg)',
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

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <FormPager step={step} onStep={setStep} count={FORM_STEPS.length}>
          <div style={pane}>

            <NField label="שם המתכון" value={title} onChange={setTitle}
              placeholder="עוגת אגוזים של סבתא"/>
            <NField label="תיאור" value={desc} onChange={setDesc} multiline rows={3}
              placeholder="במה זה מיוחד?" hint="שורה אחת שתופיע על הכרטיס"/>
            <NRow label="קטגוריה"
              value={currentCat ? `${currentCat.emoji || ''} ${currentCat.label}`.trim() : '—'}
              onClick={() => setCatSheet(true)}/>
            <NPickOrType label="סוג מטבח" value={cuisine} onChange={setCuisine}
              options={cuisines} emoji="🍽"
              sheetTitle="סוג מטבח"
              onRenameOption={onRenameCuisine}
              onCountOption={onCountCuisine}
              placeholder="איטלקית, אסייתית…" hint="לא חובה"/>
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
            <PreviewCard p={p} title={title} desc={desc} prepTime={prepTime} cookTime={cookTime}
              servings={servings} cuisine={cuisine}/>
          </div>
          <div style={pane}>
            <NStepper label="מספר מנות" value={servings} onChange={setServings}
              hint={+servings > 0 ? 'הכמויות כתובות לכמות הזו' : 'לא חובה'}/>
            {sections.map((sc, si) => (
              <IngredientSection key={sc._k}
                section={sc}
                showHeader={sections.length > 1 || sc.named || !!sc.name.trim()}
                focusName={focusGroup === sc._k}
                onNameFocused={() => setFocusGroup(null)}
                onRename={(v) => renameGroup(sc._k, v)}
                onMenu={() => setGroupMenu(sc._k)}
                activeKey={activeIng}
                focusKey={focusIng}
                onOpenItem={(ik) => openIng(ik)}
                onChangeItem={(ik, k, v) => updateIng(sc._k, ik, k, v)}
                onItemMenu={(ik) => setIngMenu({ s: sc._k, i: ik })}
                onAddItem={() => addIng(sc._k)}
                onDone={() => { setActiveIng(null); setFocusIng(null); }}
              />
            ))}
            <button type="button" onClick={addGroup} style={addGroupBtn}>
              <IconLayers size={19} strokeWidth={2.1}/>
              <span style={{ display: 'grid', textAlign: 'start' }}>
                <span>הוספת קבוצה</span>
                <span style={{ ...TYPE.caption, fontWeight: 500, color: 'var(--ink-faint)' }}>
                  למנה מכמה חלקים — בצק, מלית, ציפוי
                </span>
              </span>
            </button>
          </div>
          <div style={pane}>

            <div style={{ display: 'flex', gap: 12 }}>
              <NField label="הכנה (דק׳)" value={prepTime} onChange={setPrepTime} placeholder="—"
                type="number" inputMode="numeric" style={{ flex: 1 }}/>
              <NField label="בישול (דק׳)" value={cookTime} onChange={setCookTime} placeholder="—"
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
            <NField label="הערות אישיות" value={notes} onChange={setNotes} multiline rows={3}
              placeholder="טיפים, שדרוגים, תזכורות לפעם הבאה…"
              hint="רק בשבילך — לא מופיע על הכרטיס"/>
          </div>
        </FormPager>
      </div>

      {/* ── the bar that moves you along ───────────────── */}
      <div style={{
        flexShrink: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
        background: 'transparent', borderTop: '1px solid var(--line)',
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

      {ingMenu && (() => {
        const sec = sections.find(sc => sc._k === ingMenu.s);
        const at = sec ? sec.items.findIndex(x => x._k === ingMenu.i) : -1;
        if (!sec || at < 0) return null;
        const item = sec.items[at];
        const close = () => setIngMenu(null);
        const others = sections.filter(sc => sc._k !== sec._k);
        const title = [item.qty, item.name].filter(Boolean).join(' ').trim() || 'מצרך';
        return (
          <Sheet title={title} onClose={close}>
            <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
              <SheetAction icon={<IconEdit size={21}/>} label="עריכה"
                onClick={() => { close(); openIng(item._k); }}/>
              <SheetAction icon={<IconChevronUp size={22}/>} label="הזזה למעלה" disabled={at === 0}
                onClick={() => { moveIng(sec._k, item._k, -1); }}/>
              <SheetAction icon={<IconChevronDown size={22}/>} label="הזזה למטה" disabled={at === sec.items.length - 1}
                onClick={() => { moveIng(sec._k, item._k, 1); }}/>
              {others.length > 0 && (
                <div style={{ ...TYPE.caption, color: 'var(--ink-faint)', fontWeight: 700, padding: '14px 18px 4px', borderTop: '1px solid var(--line)', marginTop: 6 }}>
                  העברה לקבוצה
                </div>
              )}
              {others.map(o => (
                <SheetAction key={o._k} icon={<IconLayers size={21}/>}
                  label={o.name.trim() || 'ללא שם'}
                  onClick={() => { close(); moveIngTo(sec._k, item._k, o._k); }}/>
              ))}
              <SheetAction icon={<IconPlus size={22}/>} label="לקבוצה חדשה"
                onClick={() => { close(); moveIngTo(sec._k, item._k, 'new'); }}/>
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 6 }}/>
              <SheetAction icon={<IconTrash size={21}/>} label="מחיקת המצרך" danger
                onClick={() => { close(); removeIng(sec._k, item._k); }}/>
            </div>
          </Sheet>
        );
      })()}

      {groupMenu && (() => {
        const at = sections.findIndex(sc => sc._k === groupMenu);
        if (at < 0) return null;
        const sec = sections[at];
        const close = () => setGroupMenu(null);
        return (
          <Sheet title={sec.name.trim() || 'קבוצה'} onClose={close}>
            <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
              <SheetAction icon={<IconChevronUp size={22}/>} label="הזזה למעלה" disabled={at === 0}
                onClick={() => moveGroup(sec._k, -1)}/>
              <SheetAction icon={<IconChevronDown size={22}/>} label="הזזה למטה" disabled={at === sections.length - 1}
                onClick={() => moveGroup(sec._k, 1)}/>
              {sections.length > 1 && (
                <SheetAction icon={<IconLayers size={21}/>}
                  label="ביטול הקבוצה — המצרכים נשארים"
                  onClick={() => { close(); ungroup(sec._k); }}/>
              )}
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 6 }}/>
              <SheetAction icon={<IconTrash size={21}/>} label="מחיקת הקבוצה ומה שבה" danger
                onClick={() => { close(); removeGroup(sec._k); }}/>
            </div>
          </Sheet>
        );
      })()}

      {catSheet && (
        <CategoryPickSheet
          value={category}
          categories={cats}
          onPick={setCategory}
          onClose={() => setCatSheet(false)}
          onAdd={onAddCategory}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
        />
      )}

      {showLeaveConfirm && (
        <UnsavedChangesDialog
          onStay={() => setShowLeaveConfirm(false)}
          onLeave={() => { setIsDirty(false); setShowLeaveConfirm(false); if (onCancel) onCancel(); }}
        />
      )}
      {confirmNode}
    </div>
  );
}

// A button for the bar at the bottom of the form. Square-ish, flat, and
// as tall as a thumb — the form has no floating pills in it.
function BarButton({ tone = 'quiet', grow, disabled, onClick, children }) {
  const tones = {
    primary: { background: disabled ? 'var(--field-fill)' : 'var(--brand-strong)', color: disabled ? 'var(--ink-faint)' : 'var(--on-brand)' },
    quiet:   { background: 'var(--surface-raised)', color: 'var(--ink)' },
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
        {((+prepTime||0)+(+cookTime||0)) > 0 && <Chip tone="raised" palette={p}><IconClock size={13} strokeWidth={2.4}/> {formatMinutes((+prepTime||0)+(+cookTime||0))}</Chip>}
        {+servings > 0 && <Chip tone="raised" palette={p}><IconUsers size={13} strokeWidth={2.4}/> {servings}</Chip>}
        {cuisine && <Chip tone="raised" palette={p}><IconCuisine size={13} strokeWidth={2.4}/> {cuisine}</Chip>}
      </div>
    </div>
  );
}

// Backwards-compat aliases so old call sites work:
function AddRecipeScreen({ onAdd, onCancel, categories, cuisines, onAddCategory, onEditCategory, onDeleteCategory, onRenameCuisine, onCountCuisine, onDirtyChange, step, onStepChange }) {
  return <RecipeFormScreen mode="add" onSave={onAdd} onCancel={onCancel} categories={categories} cuisines={cuisines}
    onAddCategory={onAddCategory} onEditCategory={onEditCategory} onDeleteCategory={onDeleteCategory}
    onRenameCuisine={onRenameCuisine} onCountCuisine={onCountCuisine}
    onDirtyChange={onDirtyChange} step={step} onStepChange={onStepChange}/>;
}

function EditRecipeScreen({ recipe, onSave, onCancel, categories, cuisines, onAddCategory, onEditCategory, onDeleteCategory, onRenameCuisine, onCountCuisine, step, onStepChange }) {
  return <RecipeFormScreen mode="edit" existing={recipe} onSave={onSave} onCancel={onCancel}
    categories={categories} cuisines={cuisines} onAddCategory={onAddCategory}
    onEditCategory={onEditCategory} onDeleteCategory={onDeleteCategory}
    onRenameCuisine={onRenameCuisine} onCountCuisine={onCountCuisine} step={step} onStepChange={onStepChange}/>;
}

// ───────────────────────────────────────────────────────────
// The ingredients in the form, part by part.
//
// The form keeps them as sections — one per part of the dish — and saves
// them as one flat list where each ingredient names its part (see
// ingredientGroups in data.jsx). A recipe with no parts is a single
// section with no name, and nothing about it looks like a group.
// ───────────────────────────────────────────────────────────
let ingKeySeq = 0;
const nextIngKey = () => `ing${++ingKeySeq}`;
// The very first row of a new recipe, so it can start out open.
const FIRST_ING_KEY = 'ing0';

const blankIng = (key) => ({ _k: key || nextIngKey(), qty: '', name: '', icon: 'chef' });
const isBlankIng = (x) => !(x.name || '').trim() && !(x.qty || '').trim();

function ingredientSections(list) {
  const sections = [];
  const byName = new Map();
  (list || []).forEach(ing => {
    const name = String(ing.group || '').trim();
    let sec = byName.get(name);
    if (!sec) {
      sec = { _k: nextIngKey(), name, named: !!name, items: [] };
      byName.set(name, sec);
      sections.push(sec);
    }
    const { group, ...rest } = ing;
    sec.items.push({ ...rest, _k: nextIngKey() });
  });
  if (!sections.length) sections.push({ _k: nextIngKey(), name: '', named: false, items: [blankIng(FIRST_ING_KEY)] });
  return sections;
}

function flattenSections(sections) {
  const out = [];
  sections.forEach(sc => {
    const group = (sc.name || '').trim();
    sc.items.forEach(i => {
      const name = (i.name || '').trim();
      if (!name) return;
      const row = { qty: (i.qty || '').trim(), name, icon: i.icon || 'chef' };
      if (i.iconPicked) row.iconPicked = true;
      if (group) row.group = group;
      out.push(row);
    });
  });
  return out;
}

function IngredientSection({ section, showHeader, focusName, onNameFocused, onRename, onMenu,
                             activeKey, focusKey, onOpenItem, onChangeItem, onItemMenu, onAddItem, onDone }) {
  const nameRef = uR(null);
  uE(() => {
    if (!focusName || !nameRef.current) return;
    nameRef.current.focus();
    onNameFocused && onNameFocused();
  }, [focusName]);

  return (
    // One card per part, the rows inside it divided by hairlines — a list,
    // not a stack of boxes inside boxes.
    <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--r-lg)', padding: '6px 12px' }}>
      {showHeader && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 0 10px', borderBottom: '1px solid var(--line)',
        }}>
          <span aria-hidden="true" style={{ color: 'var(--brand-strong)', display: 'grid', placeItems: 'center', paddingInlineStart: 4 }}>
            <IconLayers size={20} strokeWidth={2.2}/>
          </span>
          <input ref={nameRef} value={section.name} onChange={e => onRename(e.target.value)}
            aria-label="שם הקבוצה"
            placeholder={section.named ? 'שם הקבוצה — למשל: לבצק' : 'קבוצה ללא שם'}
            enterKeyHint="next"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            style={{
              flex: 1, minWidth: 0, height: 44, border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--font-display)',
              fontSize: 'var(--t-heading)', fontWeight: 700, textAlign: 'right', padding: '0 4px',
            }}/>
          <button type="button" onClick={onMenu} aria-label="פעולות על הקבוצה" style={rowMoreBtn}>
            <IconMore size={20}/>
          </button>
        </div>
      )}

      {section.items.map((ing, idx) => (
        <IngredientFormRow key={ing._k} ing={ing}
          divided={idx > 0}
          open={activeKey === ing._k}
          autoFocus={focusKey === ing._k}
          last={idx === section.items.length - 1}
          onOpen={() => onOpenItem(ing._k)}
          onChange={(k, v) => onChangeItem(ing._k, k, v)}
          onMenu={() => onItemMenu(ing._k)}
          onNext={onAddItem}
          onDone={onDone}
        />
      ))}

      <button type="button" onClick={onAddItem}
        style={{
          width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right',
          padding: '0 4px', minHeight: 56, color: 'var(--brand-strong)',
          borderTop: section.items.length ? '1px solid var(--line)' : 'none',
        }}>
        <span style={{ width: 44, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <IconPlus size={22} strokeWidth={2.4}/>
        </span>
        <span style={{ ...TYPE.body, fontWeight: 700 }}>הוספת מצרך</span>
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// IngredientFormRow — one ingredient.
//
// Closed, it is the line as the recipe will print it: the symbol, the
// amount, the name. Tapped, it opens into the two fields that make it,
// with the amounts dropdown beside the amount. Only one is open at a
// time, so the list stays a list you can read while you write it.
// ───────────────────────────────────────────────────────────
function IngredientFormRow({ ing, divided, open, autoFocus, last, onOpen, onChange, onMenu, onNext, onDone }) {
  const [pickerOpen, setPickerOpen] = uS(false);
  const [qtyOpen, setQtyOpen] = uS(false);
  const qtyRef = uR(null);
  const emoji = (typeof ING_KEY_EMOJI !== 'undefined' && ING_KEY_EMOJI[ing.icon]) || ing.icon || '🍽️';
  uE(() => { if (!open) setQtyOpen(false); }, [open]);

  const symbol = (
    <button type="button" onClick={() => setPickerOpen(true)}
      aria-label="בחירת סמל"
      style={{
        width: 44, height: 44, borderRadius: 'var(--r-md)', border: 'none', flexShrink: 0,
        background: 'var(--field-fill)', cursor: 'pointer',
        display: 'grid', placeItems: 'center', fontSize: 22, padding: 0,
      }}>{emoji}</button>
  );

  const field = {
    width: '100%', height: 48, border: 'none', outline: 'none',
    background: 'var(--field-fill)', color: 'var(--ink)',
    borderRadius: 'var(--r-md)', padding: '0 14px',
    fontFamily: 'inherit', fontSize: 'var(--t-body)', textAlign: 'right',
  };

  return (
    <div style={{
      position: 'relative',
      borderTop: divided ? '1px solid var(--line)' : 'none',
    }}>
      {!open ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '6px 0' }}>
          <div style={{ paddingInlineStart: 0 }}>{symbol}</div>
          <button type="button" onClick={onOpen}
            style={{
              flex: 1, minWidth: 0, alignSelf: 'stretch', border: 'none', background: 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', padding: '0 2px',
              ...TYPE.body, fontWeight: 600, color: 'var(--ink)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
            {ing.qty && (
              <span style={{ color: 'var(--brand-strong)', fontWeight: 700, marginInlineEnd: 8, fontVariantNumeric: 'tabular-nums' }}>
                {ing.qty}
              </span>
            )}
            {ing.name || <span style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>מצרך חדש</span>}
          </button>
          <button type="button" onClick={onMenu} aria-label="פעולות על המצרך" style={rowMoreBtn}>
            <IconMore size={20}/>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 40px', columnGap: 12, rowGap: 8, padding: '10px 0 12px' }}>
          <div style={{ gridRow: '1 / span 2' }}>{symbol}</div>
          <input value={ing.name || ''} onChange={e => onChange('name', e.target.value)}
            aria-label="מצרך" placeholder="מצרך — למשל: קמח"
            autoFocus={autoFocus}
            enterKeyHint="next"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); qtyRef.current && qtyRef.current.focus(); } }}
            style={{ ...field, fontWeight: 600 }}/>
          <button type="button" onClick={onMenu} aria-label="פעולות על המצרך" style={{ ...rowMoreBtn, alignSelf: 'center' }}>
            <IconMore size={20}/>
          </button>
          <div style={{ position: 'relative' }}>
            <input ref={qtyRef} value={ing.qty || ''} onChange={e => onChange('qty', e.target.value)}
              aria-label="כמות" placeholder="כמות"
              enterKeyHint={last ? 'next' : 'done'}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                // Enter on the amount of the last line starts the next one,
                // so a list can be typed without reaching for the screen.
                if (last && (ing.name || '').trim()) onNext(); else onDone();
              }}
              style={{ ...field, paddingInlineEnd: 46 }}/>
            <button type="button" data-qty-toggle="true"
              onClick={() => { setQtyOpen(o => !o); if (typeof hapticTap === 'function') hapticTap(); }}
              aria-label="כמויות מוכנות" aria-expanded={qtyOpen}
              style={{
                position: 'absolute', insetInlineEnd: 6, top: 6,
                width: 36, height: 36, borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                background: qtyOpen ? 'var(--ink)' : 'transparent',
                color: qtyOpen ? 'var(--bg)' : 'var(--ink-soft)',
                display: 'grid', placeItems: 'center', padding: 0,
                transition: 'background var(--dur-fast), color var(--dur-fast)',
              }}>
              <span style={{
                display: 'grid', placeItems: 'center',
                transform: qtyOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--dur) var(--ease-out)',
              }}><IconChevronDown size={16} strokeWidth={2.6}/></span>
            </button>
          </div>
          {qtyOpen && (
            <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
              <QtyPicker value={ing.qty || ''}
                onPick={v => onChange('qty', v)}
                onClose={() => setQtyOpen(false)}/>
            </div>
          )}
        </div>
      )}

      {pickerOpen && (
        <EmojiPickerPopover current={emoji}
          onPick={(e) => { onChange('icon', e); setPickerOpen(false); }}
          onType={(e) => onChange('icon', e)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

const rowMoreBtn = {
  width: 40, height: 40, borderRadius: 'var(--r-pill)', border: 'none', flexShrink: 0,
  background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer',
  display: 'grid', placeItems: 'center', padding: 0,
};

const addGroupBtn = {
  border: '1.5px dashed var(--line-strong)', background: 'transparent',
  borderRadius: 'var(--r-lg)', padding: '12px 18px', minHeight: 64, cursor: 'pointer',
  fontFamily: 'inherit', ...TYPE.body, fontWeight: 700, color: 'var(--ink)',
  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right',
};

function EmojiPickerPopover({ current, onPick, onType, onClose }) {
  return (
    <Sheet title="סמל המצרך" onClose={onClose}>
      <div style={{ paddingBottom: 8 }}>
        <EmojiGrid value={current}
          onPick={onPick}
          onType={onType}
          onConfirm={onClose} confirmLabel="סיום"/>
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
  display: 'grid', placeItems: 'center',
  flexShrink: 0,
};

function ExportRow({ icon, bg, label, sub, onClick }) {
  return (
    <button onClick={onClick} style={{ ...exportRowStyle, background: 'var(--glass)', color: 'var(--ink)' }}>
      {/* Excel green and Word blue are those products' own colours and stay
          dark in either theme, so the glyph on them is always light. */}
      <span style={{ ...exportIconStyle, background: bg, color: '#ffffff' }}>{icon}</span>
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
      cancelLabel="יציאה בלי שמירה"
      danger={false}
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
      body={<>בטוח למחוק את<br/><strong style={{ color: 'var(--ink)' }}>"{recipe.title}"</strong>?<br/><span style={{ fontSize: 'var(--t-small)', color: 'var(--danger)', fontWeight: 700 }}>לא ניתן לשחזר אחרי המחיקה</span></>}
      confirmLabel="מחק מתכון"
      cancelLabel="ביטול"
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
          confirmLabel="הסרה"
          cancelLabel="ביטול"
          onConfirm={() => { onRemove(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
      <div style={{
        padding: '0 22px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <SectionLabel>שותפו איתי</SectionLabel>
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
                  <IconUsers size={13} strokeWidth={2.4}/> {r._sharedBy}
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
      background: 'var(--ground)', backgroundColor: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp .32s cubic-bezier(.2,1.1,.35,1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px 10px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--line)', flexShrink: 0,
        background: 'var(--glass)',
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
          {allInFilterSelected ? 'ניקוי הבחירה' : 'בחירת הכל'}
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
            background: canSend ? 'var(--brand-strong)' : 'var(--line)',
            color: canSend ? 'var(--on-brand)' : 'var(--ink-soft)',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-small)',
            cursor: canSend ? 'pointer' : 'default',
            flexShrink: 0, opacity: sharing ? .7 : 1, whiteSpace: 'nowrap',
          }}>
            {sharing ? '…' : selectedIds.size > 0 ? `שיתוף ${selectedIds.size}` : 'שיתוף'}
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
          fontFamily: 'inherit', fontSize: 'var(--t-body)', fontWeight: 700, color: 'var(--ink)',
          opacity: loading ? .7 : 1,
          transition: 'transform .15s, box-shadow .15s',
        }}
          onMouseDown={e => e.currentTarget.style.transform='scale(.98)'}
          onMouseUp={e => e.currentTarget.style.transform=''}
          onMouseLeave={e => e.currentTarget.style.transform=''}
        >
          {loading ? <Spinner size={20}/> : (
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.7-2.1 5-4.4 6.5v5.4h7.1c4.2-3.8 6.6-9.5 6.6-15.9z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.1-5.5c-2.1 1.4-4.7 2.2-8.1 2.2-6.2 0-11.5-4.2-13.4-9.9H3.3v5.7C7 42.6 15 48 24 48z"/>
              <path fill="#FBBC05" d="M10.6 29.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3v-5.7H3.3C1.2 18.6 0 21.2 0 24s1.2 5.4 3.3 7l7.3-5.7z"/>
              <path fill="#EA4335" d="M24 9.6c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.4 2.4 30.1 0 24 0 15 0 7 5.4 3.3 13.3l7.3 5.7C12.5 13.8 17.8 9.6 24 9.6z"/>
            </svg>
          )}
          {loading ? 'מתחברים…' : 'כניסה עם Google'}
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
function AccountPanel({ user, recipes, sharesInfo, pendingInvites, onClose, onSignOut, onSignIn, onUploadLocal, localCount = 0, themeMode = 'auto', onThemeChange, onExport, onImport, onInvite, onCancelInvite, onRevokeShare }) {
  const [confirmNode, confirm] = useConfirm();
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
    <Page
      title={user ? (user.displayName || 'משתמש') : 'ללא חשבון'}
      subtitle={user ? user.email : 'המתכונים נשמרים על המכשיר הזה'}
      onClose={onClose}
      header={(
        <>
        {user && (
          <NTabs
            tabs={[{ id: 'profile', label: 'פרופיל' }, { id: 'share', label: 'שיתוף' }]}
            index={tab === 'share' ? 1 : 0}
            onIndex={(i) => setTab(i === 1 ? 'share' : 'profile')}
          />
        )}
        </>
      )}>

        <div style={{ padding: '4px 16px 40px' }}>

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
                    borderInlineEnd: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
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

              {typeof UpdateBlock === 'function' && <UpdateBlock/>}

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
                        <span style={{ ...exportIconStyle, background: 'var(--ink)', color: 'var(--bg)' }}><IconUpload size={20}/></span>
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
                <Button tone="quiet" full style={{
                  background: 'var(--danger-soft)', color: 'var(--danger)', marginTop: 4,
                }}
                  onClick={() => confirm({
                    emoji: '👋',
                    title: 'לצאת מהחשבון?',
                    body: 'המתכונים נשארים בענן. אפשר להיכנס שוב בכל זמן.',
                    confirmLabel: 'יציאה',
                    cancelLabel: 'ביטול',
                    onConfirm: onSignOut,
                  })}>
                  <IconLogout size={18} strokeWidth={2.2}/> יציאה מהחשבון
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
                <SectionLabel style={{ marginBottom: 10 }}>שיתוף חשבון</SectionLabel>
                <div style={{
                  background: 'var(--glass)', borderRadius: 'var(--r-md)', padding: '14px 16px',
                  fontSize: 'var(--t-small)', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 10,
                }}>
                  אפשר להזמין מישהו לראות את כל המתכונים שלך — גם את אלה שיתווספו בעתיד. הגישה נפתחת ברגע שנכנסים לאפליקציה עם הג׳ימייל שהוזמן.
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
                            <div style={{ fontSize: 'var(--t-caption)', color: 'var(--p-lavender-accent)', fontWeight: 700, marginTop: 1 }}>הדדי</div>
                          )}
                        </div>
                        <button onClick={() => confirm({
                          emoji: '🤝',
                          title: 'לבטל את השיתוף?',
                          body: <><strong style={{ color: 'var(--ink)' }}>{s.guestEmail}</strong> לא יוכל/תוכל יותר לראות את המתכונים שלך.</>,
                          confirmLabel: 'ביטול שיתוף',
                          cancelLabel: 'ביטול',
                          onConfirm: () => onRevokeShare(s.id),
                        })} style={{
                          border: 'none', background: 'var(--danger-soft)', color: 'var(--danger)',
                          borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 'var(--t-caption)', fontWeight: 700, flexShrink: 0,
                        }}>ביטול</button>
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
                        <span style={{ color: 'var(--warning)', display: 'grid', placeItems: 'center' }}><IconClock size={18} strokeWidth={2.2}/></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--t-small)', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.guestEmail}
                          </div>
                          {inv.mutual && (
                            <div style={{ fontSize: 'var(--t-caption)', color: 'var(--p-lavender-accent)', fontWeight: 700, marginTop: 1 }}>הדדי</div>
                          )}
                        </div>
                        <button onClick={() => confirm({
                          emoji: '✉️',
                          title: 'לבטל את ההזמנה?',
                          body: <>ההזמנה ל<strong style={{ color: 'var(--ink)' }}>{inv.guestEmail}</strong> תבוטל.</>,
                          confirmLabel: 'ביטול הזמנה',
                          cancelLabel: 'ביטול',
                          onConfirm: () => onCancelInvite(inv.id),
                        })} style={{
                          border: 'none', background: 'var(--surface-sunken)', color: 'var(--ink-soft)',
                          borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 'var(--t-caption)', fontWeight: 700, flexShrink: 0,
                        }}>ביטול</button>
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
                        <span style={{ color: 'var(--success)', display: 'grid', placeItems: 'center' }}><IconCheck size={18} strokeWidth={2.6}/></span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 'var(--t-small)', fontWeight: 700, color: 'var(--ink)' }}>{s.ownerDisplayName || s.ownerEmail}</div>
                          <div style={{ fontSize: 'var(--t-caption)', color: 'var(--ink-soft)' }}>{s.ownerEmail}</div>
                        </div>
                        <button onClick={() => confirm({
                          emoji: '🤝',
                          title: 'לבטל את השיתוף?',
                          body: <><strong style={{ color: 'var(--ink)' }}>{s.guestEmail}</strong> לא יוכל/תוכל יותר לראות את המתכונים שלך.</>,
                          confirmLabel: 'ביטול שיתוף',
                          cancelLabel: 'ביטול',
                          onConfirm: () => onRevokeShare(s.id),
                        })} style={{
                          border: 'none', background: 'var(--surface-sunken)', color: 'var(--ink-soft)',
                          borderRadius: 'var(--r-sm)', padding: '6px 10px', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 'var(--t-caption)', fontWeight: 700, flexShrink: 0,
                        }}>הסרה</button>
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
                    background: inviteEmail.trim() ? 'var(--brand-strong)' : 'var(--line)',
                    color: inviteEmail.trim() ? 'var(--on-brand)' : 'var(--ink-soft)',
                    fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--t-small)', flexShrink: 0,
                    opacity: inviting ? .7 : 1,
                  }}>{inviting ? '…' : 'הזמנה'}</button>
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
      {confirmNode}
    </Page>
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
          {busy ? 'מתחברים…' : 'התחברות עם Google'}
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
          {busy ? 'מעלים…' : `העלאת ${count} מתכונים לחשבון`}
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
  HomeScreen, DetailScreen,
  AddRecipeScreen, EditRecipeScreen, RecipeFormScreen,
  DeleteConfirm, UnsavedChangesDialog, LoginScreen, AccountPanel,
  SharedRecipesSection, RecipeSelectSheet, DiagnosticsBlock, SignInBlock, LocalNotebookBlock,
});
