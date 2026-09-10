// book.jsx — "ספר מתכונים" tab: a printable recipe book.
//
// Three layers:
//   BookScreen  — cover + clickable table of contents + single page view
//   BookPage    — one A4 page (design units: 794 × 1123 px @96dpi = A4)
//   PrintBook   — portals the same A4 pages outside #root and calls
//                 window.print(), so "Save as PDF" produces the book.
//
// The A4 page is authored once at full size and scaled down on screen with
// a CSS transform, so what you see is exactly what gets printed.

const { useState: bS, useRef: bR, useEffect: bE, useMemo: bM } = React;

const A4_W = 794;
const A4_H = 1123;

// ───────────────────────────────────────────────────────────
// BookPage — a single, fully designed A4 recipe page.
// ───────────────────────────────────────────────────────────
function BookPage({ recipe, pageNo, categories, forPrint = false }) {
  const p = PALETTES[recipe.palette] || PALETTES.peach;
  const photo = useRecipePhoto(recipe);
  const cat = (categories || []).find(c => c.id === recipe.category);
  const clean = typeof stripHTML === 'function' ? stripHTML : (x => x);

  const steps = (recipe.steps || []).filter(s => (s.title || '').trim() || (s.body || '').trim());
  const isAuto = steps.length > 0 && steps.every(s => /^שלב\s*\d+$/.test((s.title || '').trim()));
  const plain = clean(recipe.instructions || '');
  const stepList = (!steps.length || isAuto)
    ? (plain ? plain.split(/\n+/).map(t => ({ title: '', body: t })).filter(s => s.body.trim()) : [])
    : steps;

  const ings = (recipe.ingredients || []).filter(i => (i.name || '').trim());
  const notes = clean(recipe.notes || '').trim();
  const desc = clean(recipe.description || '').trim();

  return (
    <div className="book-page" style={{
      width: A4_W, minHeight: A4_H, position: 'relative',
      background: '#fffdf7',
      backgroundImage: `radial-gradient(circle at 12% 8%, ${p.bg2}55 0%, transparent 42%),
                        radial-gradient(circle at 92% 96%, ${p.bg2}44 0%, transparent 38%)`,
      color: '#2c1d27', direction: 'rtl',
      fontFamily: "'Heebo','Rubik',system-ui,sans-serif",
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      breakAfter: forPrint ? 'page' : 'auto',
      pageBreakAfter: forPrint ? 'always' : 'auto',
    }}>
      {/* colored spine band on the start (right) edge */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0, width: 16,
        background: `linear-gradient(180deg, ${p.bg} 0%, ${p.bg2} 100%)`,
      }}/>

      <div style={{ padding: '54px 74px 40px 58px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* running head */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          fontSize: 12, letterSpacing: '.22em', fontWeight: 700, color: p.accent,
          textTransform: 'uppercase', paddingBottom: 12,
          borderBottom: `2px solid ${p.bg}`,
        }}>
          <span>{cat ? `${cat.emoji} ${cat.label}` : '🍽️ מתכון'}</span>
          <span style={{ color: 'rgba(44,29,39,.45)', letterSpacing: '.3em' }}>MAITES</span>
        </div>

        {/* title */}
        <h1 style={{
          margin: '30px 0 0', fontSize: 46, lineHeight: 1.1, fontWeight: 800,
          fontFamily: "'Rubik','Heebo',sans-serif", letterSpacing: '-.02em',
          textWrap: 'balance',
        }}>{recipe.title}</h1>

        {desc && (
          <p style={{
            margin: '14px 0 0', fontSize: 16, lineHeight: 1.6, color: '#5b4452',
            maxWidth: 560,
          }}>{desc}</p>
        )}

        {/* meta */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            ['⏱', `${(recipe.prepTime || 0) + (recipe.cookTime || 0) || recipe.time || 0} דקות`],
            ['👥', `${recipe.servings || '—'} מנות`],
            recipe.cuisine ? ['🍽', recipe.cuisine] : null,
            ings.length ? ['🧺', `${ings.length} מצרכים`] : null,
          ].filter(Boolean).map(([e, t], i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: p.tag, color: p.ink, fontWeight: 700, fontSize: 14,
              padding: '8px 15px', borderRadius: 999,
            }}>{e} {t}</span>
          ))}
        </div>

        {/* hero photo */}
        <div style={{
          marginTop: 26, height: 296, borderRadius: 26, overflow: 'hidden',
          background: `linear-gradient(140deg, ${p.bg} 0%, ${p.bg2} 100%)`,
          display: 'grid', placeItems: 'center', position: 'relative',
          boxShadow: `0 18px 40px -22px ${p.accent}99`,
        }}>
          {photo
            ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            : <span style={{ fontSize: 92, opacity: .55 }}>{cat?.emoji || '🍽️'}</span>}
        </div>

        {/* body — ingredients (right) + method (left) */}
        <div style={{ display: 'flex', gap: 34, marginTop: 34, alignItems: 'flex-start', flex: 1 }}>
          <div style={{
            width: 252, flexShrink: 0, background: `${p.bg2}`, borderRadius: 22,
            padding: '22px 20px', boxShadow: `inset 0 0 0 1.5px ${p.bg}`,
          }}>
            <div style={{
              fontSize: 12.5, letterSpacing: '.18em', fontWeight: 800, color: p.accent,
              textTransform: 'uppercase', marginBottom: 14,
            }}>מצרכים</div>
            {ings.length ? ings.map((ing, i) => (
              <div key={i} style={{
                display: 'flex', gap: 9, alignItems: 'flex-start',
                fontSize: 14.5, lineHeight: 1.5, padding: '7px 0',
                borderBottom: i < ings.length - 1 ? '1px solid rgba(44,29,39,.08)' : 'none',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: 999, background: p.accent,
                  marginTop: 8, flexShrink: 0,
                }}/>
                <span>
                  {ing.qty && <strong style={{ color: p.accent, marginInlineEnd: 5 }}>{ing.qty}</strong>}
                  {ing.name}
                </span>
              </div>
            )) : <div style={{ fontSize: 14, color: '#5b4452', fontStyle: 'italic' }}>לא הוזנו מצרכים</div>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12.5, letterSpacing: '.18em', fontWeight: 800, color: p.accent,
              textTransform: 'uppercase', marginBottom: 16,
            }}>אופן ההכנה</div>
            {stepList.length ? stepList.map((st, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, breakInside: 'avoid' }}>
                <span style={{
                  width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                  background: p.bg, color: p.ink, fontWeight: 800, fontSize: 14,
                  display: 'grid', placeItems: 'center', marginTop: 1,
                }}>{i + 1}</span>
                <div style={{ fontSize: 15, lineHeight: 1.62 }}>
                  {st.title && !/^שלב\s*\d+$/.test(st.title.trim()) && (
                    <div style={{ fontWeight: 800, marginBottom: 3 }}>{clean(st.title)}</div>
                  )}
                  <div style={{ color: '#3b2b35' }}>{clean(st.body || '')}</div>
                </div>
              </div>
            )) : (
              <div style={{ fontSize: 14.5, color: '#5b4452', fontStyle: 'italic' }}>
                לא נוספו הוראות הכנה למתכון זה.
              </div>
            )}

            {notes && (
              <div style={{
                marginTop: 22, background: '#fff7e8', borderRadius: 18,
                padding: '16px 18px', fontSize: 14, lineHeight: 1.6,
                boxShadow: 'inset 0 0 0 1.5px rgba(255,210,85,.5)', whiteSpace: 'pre-line',
                breakInside: 'avoid',
              }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: '#8a6a12' }}>✎ הערות</div>
                {notes}
              </div>
            )}
          </div>
        </div>

        {/* folio */}
        <div style={{
          marginTop: 28, paddingTop: 14, borderTop: '1.5px solid rgba(44,29,39,.12)',
          display: 'flex', justifyContent: 'center',
        }}>
          <span style={{
            minWidth: 34, height: 34, borderRadius: 999, background: p.bg, color: p.ink,
            display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, padding: '0 10px',
          }}>{pageNo}</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// BookCover / BookTOCPage — printed front matter
// ───────────────────────────────────────────────────────────
function BookCover({ count, forPrint = false }) {
  return (
    <div className="book-page" style={{
      width: A4_W, minHeight: A4_H, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg,#fbeef2 0%,#f3e6f6 45%,#ffe9d8 100%)',
      display: 'grid', placeItems: 'center', textAlign: 'center', direction: 'rtl',
      fontFamily: "'Rubik','Heebo',sans-serif", color: '#2c1d27',
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      breakAfter: forPrint ? 'page' : 'auto', pageBreakAfter: forPrint ? 'always' : 'auto',
    }}>
      {[['12%', '14%', 120, '#f7a8b8'], ['82%', '20%', 74, '#ffd255'],
        ['16%', '82%', 92, '#b3e4c3'], ['86%', '76%', 118, '#c9b8e8']].map(([l, t, s, c], i) => (
        <span key={i} style={{
          position: 'absolute', left: l, top: t, width: s, height: s,
          borderRadius: '50%', background: c, opacity: .35,
        }}/>
      ))}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 76, marginBottom: 10 }}>🍳</div>
        <div style={{
          fontSize: 15, letterSpacing: '.5em', fontWeight: 700,
          color: 'rgba(44,29,39,.5)', marginBottom: 18,
        }}>MAITES</div>
        <h1 style={{ margin: 0, fontSize: 68, fontWeight: 800, letterSpacing: '-.03em' }}>
          ספר המתכונים שלי
        </h1>
        <div style={{
          width: 120, height: 4, borderRadius: 99, background: '#f7a8b8',
          margin: '26px auto',
        }}/>
        <div style={{ fontSize: 18, color: '#5b4452' }}>
          {count} {count === 1 ? 'מתכון' : 'מתכונים'} · {new Date().toLocaleDateString('he-IL')}
        </div>
      </div>
    </div>
  );
}

function BookTOCPage({ recipes, categories, forPrint = false }) {
  const groups = groupByCategory(recipes, categories);
  return (
    <div className="book-page" style={{
      width: A4_W, minHeight: A4_H, background: '#fffdf7', direction: 'rtl',
      fontFamily: "'Heebo','Rubik',sans-serif", color: '#2c1d27',
      padding: '70px 74px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      breakAfter: forPrint ? 'page' : 'auto', pageBreakAfter: forPrint ? 'always' : 'auto',
    }}>
      <h2 style={{
        margin: '0 0 6px', fontSize: 40, fontWeight: 800,
        fontFamily: "'Rubik','Heebo',sans-serif",
      }}>תוכן העניינים</h2>
      <div style={{ width: 90, height: 4, borderRadius: 99, background: '#f7a8b8', marginBottom: 30 }}/>
      {groups.map(g => (
        <div key={g.id} style={{ marginBottom: 26, breakInside: 'avoid' }}>
          <div style={{
            fontSize: 13, letterSpacing: '.2em', fontWeight: 800, color: '#b3445a',
            marginBottom: 10,
          }}>{g.emoji} {g.label}</div>
          {g.items.map(it => (
            <div key={it.recipe.id} style={{
              display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 15.5, padding: '5px 0',
            }}>
              <span style={{ fontWeight: 600 }}>{it.recipe.title}</span>
              <span style={{
                flex: 1, borderBottom: '2px dotted rgba(44,29,39,.25)', transform: 'translateY(-4px)',
              }}/>
              <span style={{ fontWeight: 800, color: '#5b4452' }}>{it.pageNo}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Group recipes by category, preserving a stable page numbering.
function groupByCategory(recipes, categories) {
  const numbered = recipes.map((r, i) => ({ recipe: r, pageNo: i + 1 }));
  const cats = (categories || []).filter(c => c.id !== 'all');
  const groups = [];
  cats.forEach(c => {
    const items = numbered.filter(n => n.recipe.category === c.id);
    if (items.length) groups.push({ id: c.id, label: c.label, emoji: c.emoji, items });
  });
  const rest = numbered.filter(n => !cats.some(c => c.id === n.recipe.category));
  if (rest.length) groups.push({ id: '_other', label: 'נוספים', emoji: '🍽️', items: rest });
  return groups;
}

// ───────────────────────────────────────────────────────────
// PageScaler — shows an A4 page scaled to the available width.
// ───────────────────────────────────────────────────────────
function PageScaler({ children, pad = 0 }) {
  const ref = bR(null);
  const [scale, setScale] = bS(0.4);
  const [h, setH] = bS(A4_H * 0.4);
  const inner = bR(null);

  bE(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const w = el.clientWidth - pad * 2;
      const s = Math.max(0.1, w / A4_W);
      setScale(s);
      const realH = inner.current ? inner.current.scrollHeight : A4_H;
      setH(Math.max(A4_H, realH) * s);
    };
    measure();
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1200);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', measure); };
  }, [children]);

  return (
    <div ref={ref} style={{ width: '100%', height: h, position: 'relative' }}>
      <div ref={inner} style={{
        width: A4_W, transform: `scale(${scale})`, transformOrigin: 'top right',
        position: 'absolute', top: 0, insetInlineStart: 0,
        borderRadius: 6 / scale, overflow: 'hidden',
        boxShadow: `0 ${24 / scale}px ${60 / scale}px -${20 / scale}px rgba(64,33,50,.45)`,
      }}>{children}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// PrintBook — renders pages outside #root and triggers printing.
// ───────────────────────────────────────────────────────────
function PrintBook({ recipes, categories, onDone }) {
  bE(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; onDone(); } };
    const t = setTimeout(() => {
      try { window.print(); } catch {}
      // afterprint is unreliable on mobile — also settle on a timer.
      setTimeout(finish, 1500);
    }, 450);
    window.addEventListener('afterprint', finish);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', finish); };
  }, []);

  const withFrontMatter = recipes.length > 1;
  return ReactDOM.createPortal(
    <div className="print-root">
      {withFrontMatter && <BookCover count={recipes.length} forPrint/>}
      {withFrontMatter && <BookTOCPage recipes={recipes} categories={categories} forPrint/>}
      {recipes.map((r, i) => (
        <BookPage key={r.id} recipe={r} pageNo={i + 1} categories={categories} forPrint/>
      ))}
    </div>,
    document.body
  );
}

// ───────────────────────────────────────────────────────────
// PrintSelectSheet — pick which recipes go into the PDF
// ───────────────────────────────────────────────────────────
function PrintSelectSheet({ recipes, categories, onPrint, onClose }) {
  const [sel, setSel] = bS(() => recipes.map(r => r.id));
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const all = sel.length === recipes.length;

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(28,22,32,.5)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--cream)', borderRadius: '30px 30px 0 0', width: '100%',
        maxHeight: '86%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 60px rgba(0,0,0,.3)', animation: 'slideUp .3s cubic-bezier(.2,1.1,.4,1)',
      }}>
        <div style={{ padding: '18px 22px 10px' }}>
          <div style={{
            width: 42, height: 5, borderRadius: 99, background: 'rgba(0,0,0,.15)',
            margin: '0 auto 14px',
          }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              אילו מתכונים להדפיס?
            </h3>
            <button onClick={() => setSel(all ? [] : recipes.map(r => r.id))} style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
              padding: '8px 14px', borderRadius: 999, background: 'rgba(0,0,0,.06)', color: 'var(--ink)',
            }}>{all ? 'ניקוי הכל' : 'בחירת הכל'}</button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            נבחרו {sel.length} מתוך {recipes.length} · יודפס עמוד A4 לכל מתכון
          </p>
        </div>

        <div className="scroll-y" style={{ flex: 1, padding: '6px 16px 10px' }}>
          {recipes.map(r => {
            const on = sel.includes(r.id);
            const p = PALETTES[r.palette] || PALETTES.peach;
            const cat = (categories || []).find(c => c.id === r.category);
            return (
              <button key={r.id} onClick={() => toggle(r.id)} style={{
                width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start',
                padding: '10px 12px', borderRadius: 16, marginBottom: 6,
                background: on ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.5)',
                boxShadow: on ? '0 4px 12px rgba(0,0,0,.08)' : 'none',
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 11, background: p.bg, flexShrink: 0,
                  display: 'grid', placeItems: 'center', fontSize: 16,
                }}>{cat?.emoji || '🍽️'}</span>
                <span style={{
                  flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--ink)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{r.title}</span>
                <span style={{
                  width: 22, height: 22, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: on ? 'var(--ink)' : 'transparent', color: '#fff',
                  boxShadow: on ? 'none' : 'inset 0 0 0 2px rgba(0,0,0,.15)',
                }}>{on && <IconCheck size={13} strokeWidth={3}/>}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '12px 18px 26px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flexShrink: 0, padding: '15px 20px', border: 'none', cursor: 'pointer', borderRadius: 18,
            background: 'rgba(0,0,0,.07)', color: 'var(--ink)', fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
          }}>ביטול</button>
          <button disabled={!sel.length}
            onClick={() => onPrint(recipes.filter(r => sel.includes(r.id)))}
            style={{
              flex: 1, padding: '15px', border: 'none', borderRadius: 18,
              cursor: sel.length ? 'pointer' : 'default',
              background: sel.length ? 'var(--ink)' : 'rgba(0,0,0,.2)', color: '#fff',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 15.5,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <IconFilePdf size={17} strokeWidth={2.2}/> ייצוא PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// BookScreen — the tab itself
// ───────────────────────────────────────────────────────────
function BookScreen({ recipes, categories, openId, onOpenPage, onClosePage, onPrint, onSelectPrint }) {
  const ordered = bM(() => {
    const cats = (categories || []).filter(c => c.id !== 'all');
    const idx = (r) => {
      const i = cats.findIndex(c => c.id === r.category);
      return i === -1 ? 999 : i;
    };
    return [...recipes].sort((a, b) => idx(a) - idx(b) || a.title.localeCompare(b.title, 'he'));
  }, [recipes, categories]);

  const openIndex = ordered.findIndex(r => r.id === openId);
  const groups = bM(() => groupByCategory(ordered, categories), [ordered, categories]);

  // swipe between pages
  const touch = bR(null);
  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    // RTL: swipe right → next page, swipe left → previous
    const next = dx > 0 ? openIndex + 1 : openIndex - 1;
    if (next >= 0 && next < ordered.length) onOpenPage(ordered[next].id);
  };

  if (openIndex >= 0) {
    const r = ordered[openIndex];
    return (
      <div className="scroll-y" style={{ height: '100%' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(180deg, rgba(251,238,242,.97) 60%, rgba(251,238,242,0))',
        }}>
          <button onClick={onClosePage} aria-label="חזרה לתוכן העניינים" style={roundBarBtn}>
            <IconForward size={18} strokeWidth={2.4}/>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 800, color: 'var(--ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{r.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
              עמוד {openIndex + 1} מתוך {ordered.length}
            </div>
          </div>
          <button onClick={() => onPrint([r])} style={{
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 15px', borderRadius: 999, background: 'var(--ink)', color: '#fff',
            fontSize: 13, fontWeight: 700, boxShadow: '0 8px 20px -8px rgba(64,33,50,.6)',
          }}>
            <IconFilePdf size={15} strokeWidth={2.2}/> PDF
          </button>
        </div>

        <div style={{ padding: '0 16px 24px' }}>
          <PageScaler>
            <BookPage recipe={r} pageNo={openIndex + 1} categories={categories}/>
          </PageScaler>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 16px 140px' }}>
          <button disabled={openIndex === 0} onClick={() => onOpenPage(ordered[openIndex - 1].id)}
            style={{ ...pagerBtn, opacity: openIndex === 0 ? .35 : 1 }}>
            <IconForward size={16} strokeWidth={2.4}/> הקודם
          </button>
          <button disabled={openIndex === ordered.length - 1} onClick={() => onOpenPage(ordered[openIndex + 1].id)}
            style={{ ...pagerBtn, opacity: openIndex === ordered.length - 1 ? .35 : 1 }}>
            הבא <IconBack size={16} strokeWidth={2.4}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-y" style={{ height: '100%', padding: '14px 0 140px' }}>
      {/* cover */}
      <div style={{ padding: '0 18px' }}>
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 28, padding: '30px 24px 26px',
          background: 'linear-gradient(150deg,#ffe9d8 0%,#fbeef2 48%,#e9e0f8 100%)',
          boxShadow: 'var(--shadow-card)', textAlign: 'center',
        }}>
          {[['8%', '12%', 54, '#f7a8b8'], ['84%', '18%', 34, '#ffd255'], ['80%', '74%', 46, '#b3e4c3']]
            .map(([l, t, s, c], i) => (
              <span key={i} style={{
                position: 'absolute', left: l, top: t, width: s, height: s,
                borderRadius: '50%', background: c, opacity: .35,
              }}/>
            ))}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 40 }}>📖</div>
            <h1 className="display" style={{
              margin: '6px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--ink)',
            }}>ספר המתכונים שלי</h1>
            <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 6 }}>
              {recipes.length} {recipes.length === 1 ? 'מתכון' : 'מתכונים'} · עמוד A4 מעוצב לכל מתכון
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'center' }}>
              <button onClick={() => onPrint(ordered)} disabled={!ordered.length} style={{
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '12px 18px', borderRadius: 999, background: 'var(--ink)', color: '#fff',
                fontSize: 13.5, fontWeight: 700, boxShadow: '0 10px 24px -10px rgba(64,33,50,.7)',
                opacity: ordered.length ? 1 : .5,
              }}>
                <IconPrinter size={16} strokeWidth={2.2}/> הדפסת הספר
              </button>
              <button onClick={onSelectPrint} disabled={!ordered.length} style={{
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '12px 18px', borderRadius: 999, background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
                fontSize: 13.5, fontWeight: 700, boxShadow: '0 6px 16px -8px rgba(64,33,50,.5)',
                opacity: ordered.length ? 1 : .5,
              }}>
                <IconCheck size={16} strokeWidth={2.4}/> בחירת מתכונים
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* table of contents */}
      <div style={{ padding: '24px 22px 0' }}>
        <div style={{
          fontSize: 12.5, letterSpacing: '.18em', fontWeight: 800, color: 'var(--ink-soft)',
          textTransform: 'uppercase',
        }}>תוכן העניינים</div>
      </div>

      {!ordered.length && (
        <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <div style={{ fontSize: 46, marginBottom: 10 }}>📚</div>
          <div style={{ fontSize: 15 }}>הספר עוד ריק — הוסיפו מתכון ראשון</div>
        </div>
      )}

      {groups.map(g => (
        <div key={g.id} style={{ padding: '18px 18px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 8px',
          }}>
            <span style={{ fontSize: 18 }}>{g.emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{g.label}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
              {g.items.length === 1 ? 'מתכון אחד' : `${g.items.length} מתכונים`}
            </span>
            <span style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.10)' }}/>
          </div>
          <div style={{
            background: 'rgba(255,255,255,.72)', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 6px 18px -10px rgba(64,33,50,.35)',
          }}>
            {g.items.map((it, i) => {
              const p = PALETTES[it.recipe.palette] || PALETTES.peach;
              return (
                <button key={it.recipe.id} onClick={() => onOpenPage(it.recipe.id)} style={{
                  width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'start',
                  padding: '12px 14px', background: 'transparent',
                  borderTop: i ? '1px solid rgba(0,0,0,.06)' : 'none',
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 999, background: p.bg, flexShrink: 0,
                    boxShadow: `0 0 0 3px ${p.bg2}`,
                  }}/>
                  <span style={{
                    fontSize: 14.5, fontWeight: 700, color: 'var(--ink)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%',
                  }}>{it.recipe.title}</span>
                  <span style={{
                    flex: 1, borderBottom: '2px dotted rgba(44,29,39,.22)', transform: 'translateY(-3px)',
                  }}/>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-soft)' }}>{it.pageNo}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const roundBarBtn = {
  width: 40, height: 40, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
  background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
  display: 'grid', placeItems: 'center', boxShadow: '0 6px 18px -6px rgba(64,33,50,.3)',
};

const pagerBtn = {
  flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '14px 0', borderRadius: 18, background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
  fontSize: 14, fontWeight: 700, boxShadow: '0 6px 16px -8px rgba(64,33,50,.4)',
};

Object.assign(window, {
  BookScreen, BookPage, BookCover, BookTOCPage, PrintBook, PrintSelectSheet, PageScaler, groupByCategory,
});
