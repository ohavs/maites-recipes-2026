// book.jsx — "ספר מתכונים" tab: a printable recipe book.
//
// Three layers:
//   BookScreen  — cover + clickable table of contents + single page view
//   BookPage    — one A4 page (design units: 794 × 1123 px @96dpi = A4)
//   PdfBook     — renders the same A4 pages off-screen, rasterises them
//                 and saves a real .pdf file (no print dialog).
//
// The A4 page is authored once at full size and scaled down on screen with
// a CSS transform, so what you see is exactly what gets printed.

const { useState: bS, useRef: bR, useEffect: bE, useMemo: bM } = React;

const A4_W = 794;
const A4_H = 1123;

// #rrggbb + alpha → rgba(), because the PDF rasteriser does not parse
// 8-digit hex colours.
function rgba(hex, a) {
  const h = String(hex || '').replace('#', '');
  if (h.length < 6) return `rgba(0,0,0,${a})`;
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ───────────────────────────────────────────────────────────
// BookPage — a single, fully designed A4 recipe page.
// ───────────────────────────────────────────────────────────
function BookPage({ recipe, pageNo, categories, forPrint = false }) {
  const p = paletteHexOf(recipe.palette);
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
      backgroundImage: `radial-gradient(circle at 12% 8%, ${rgba(p.bg2, .33)} 0%, ${rgba(p.bg2, 0)} 42%),
                        radial-gradient(circle at 92% 96%, ${rgba(p.bg2, .27)} 0%, ${rgba(p.bg2, 0)} 38%)`,
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

        {/* header — title block, with a small photo pushed to the
            outer (left) edge. No photo means no block at all. */}
        <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', marginTop: 30 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0, fontSize: 42, lineHeight: 1.1, fontWeight: 800,
              fontFamily: "'Rubik','Heebo',sans-serif", letterSpacing: '-.02em',
              textWrap: 'balance',
            }}>{recipe.title}</h1>

            {desc && (
              <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.6, color: '#5b4452' }}>{desc}</p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                ['⏱', `${(recipe.prepTime || 0) + (recipe.cookTime || 0) || recipe.time || 0} דקות`],
                ['👥', `${recipe.servings || '—'} מנות`],
                recipe.cuisine ? ['🍽', recipe.cuisine] : null,
                ings.length ? ['🧺', `${ings.length} מצרכים`] : null,
              ].filter(Boolean).map(([e, t], i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: p.tag, color: p.ink, fontWeight: 700, fontSize: 13,
                  padding: '6px 13px', borderRadius: 'var(--r-pill)',
                }}>{e} {t}</span>
              ))}
            </div>
          </div>

          {photo && (
            <div style={{
              width: 208, height: 168, flexShrink: 0, borderRadius: 'var(--r-md)', overflow: 'hidden',
              boxShadow: `0 12px 26px -16px ${rgba(p.accent, .6)}`,
            }}>
              <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
          )}
        </div>

        {/* body — ingredients (right) + method (left) */}
        <div style={{ display: 'flex', gap: 34, marginTop: 30, alignItems: 'flex-start', flex: 1 }}>
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
                  width: 7, height: 7, borderRadius: 'var(--r-pill)', background: p.accent,
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
                  width: 30, height: 30, borderRadius: 'var(--r-pill)', flexShrink: 0,
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
            minWidth: 34, height: 34, borderRadius: 'var(--r-pill)', background: p.bg, color: p.ink,
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
          width: 120, height: 4, borderRadius: 'var(--r-pill)', background: '#f7a8b8',
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
      <div style={{ width: 90, height: 4, borderRadius: 'var(--r-pill)', background: '#f7a8b8', marginBottom: 30 }}/>
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
  const inner = bR(null);
  const [scale, setScale] = bS(0.4);
  const [h, setH] = bS(A4_H * 0.4);

  bE(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const w = el.clientWidth - pad * 2;
      if (w <= 0) return;
      const s = w / A4_W;
      setScale(s);
      // offsetHeight is the untransformed layout height — using the
      // transformed rect here would compound the scale and leave a gap.
      const realH = inner.current ? inner.current.offsetHeight : A4_H;
      setH(Math.round(realH * s));
    };
    measure();
    const t1 = setTimeout(measure, 250);
    const t2 = setTimeout(measure, 1000);
    window.addEventListener('resize', measure);
    let ro;
    if (window.ResizeObserver && inner.current) {
      ro = new ResizeObserver(measure);
      ro.observe(inner.current);
    }
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [children]);

  return (
    <div ref={ref} style={{ width: '100%', height: h, position: 'relative' }}>
      <div ref={inner} style={{
        width: A4_W, transform: `scale(${scale})`, transformOrigin: 'top right',
        position: 'absolute', top: 0, insetInlineStart: 0,
        borderRadius: 6 / scale, overflow: 'hidden', boxShadow: 'var(--e3)',
      }}>{children}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// PdfBook — renders the pages off-screen, rasterises each one
// and writes a real .pdf file the browser downloads. No print
// dialog, no printer picker.
// ───────────────────────────────────────────────────────────
const PDF_LIBS = [
  ['html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'],
  ['jspdf',       'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js'],
];

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-lib="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src; el.async = true; el.dataset.lib = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('load failed: ' + src));
    document.head.appendChild(el);
  });
}

async function ensurePdfLibs() {
  for (const [global, src] of PDF_LIBS) {
    if (global === 'html2canvas' && window.html2canvas) continue;
    if (global === 'jspdf' && window.jspdf) continue;
    await loadScriptOnce(src);
  }
  if (!window.html2canvas || !window.jspdf) throw new Error('pdf libs unavailable');
}

// A4 at 72dpi in jsPDF points.
const PT_W = 595.28, PT_H = 841.89;

async function pagesToPdfFile(pageEls, filename, onProgress) {
  await ensurePdfLibs();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });

  for (let i = 0; i < pageEls.length; i++) {
    if (onProgress) onProgress(i + 1, pageEls.length);
    // Yield to the browser so the progress text actually paints.
    await new Promise(r => setTimeout(r, 16));
    const canvas = await window.html2canvas(pageEls[i], {
      scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
      width: A4_W, height: pageEls[i].offsetHeight, windowWidth: A4_W,
    });
    const img = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) doc.addPage();
    // Keep the page proportions: a taller-than-A4 page is scaled to width.
    const ratio = canvas.height / canvas.width;
    const h = Math.min(PT_H, PT_W * ratio);
    doc.addImage(img, 'JPEG', 0, 0, PT_W, h, undefined, 'FAST');
    canvas.width = canvas.height = 0;   // release the bitmap
  }
  doc.save(filename);
}

function PdfBook({ recipes, categories, onDone, onError }) {
  const stageRef = bR(null);
  const [progress, setProgress] = bS({ page: 0, total: recipes.length });

  bE(() => {
    let cancelled = false;
    const run = async () => {
      // let the images and fonts settle before rasterising
      await new Promise(r => setTimeout(r, 350));
      try {
        const els = stageRef.current ? Array.from(stageRef.current.querySelectorAll('.book-page')) : [];
        if (!els.length) throw new Error('no pages');
        const name = recipes.length === 1
          ? `${(recipes[0].title || 'מתכון').replace(/[\\/:*?"<>|]/g, '')}.pdf`
          : `ספר-המתכונים-${new Date().toISOString().slice(0, 10)}.pdf`;
        await pagesToPdfFile(els, name, (page, total) => {
          if (!cancelled) setProgress({ page, total });
        });
        if (!cancelled) onDone();
      } catch (e) {
        if (!cancelled) onError(e);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const withFrontMatter = recipes.length > 1;
  return ReactDOM.createPortal(
    <>
      {/* off-screen stage: rendered (so it can be rasterised) but never seen */}
      <div ref={stageRef} className="pdf-stage" aria-hidden="true">
        {withFrontMatter && <BookCover count={recipes.length} forPrint/>}
        {withFrontMatter && <BookTOCPage recipes={recipes} categories={categories} forPrint/>}
        {recipes.map((r, i) => (
          <BookPage key={r.id} recipe={r} pageNo={i + 1} categories={categories} forPrint/>
        ))}
      </div>

      <div role="status" aria-live="polite" style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center',
        background: 'var(--overlay)', backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          background: 'var(--surface)', color: 'var(--ink)', borderRadius: 'var(--r-lg)',
          padding: '30px 34px', textAlign: 'center', boxShadow: 'var(--e3)', minWidth: 220,
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }} aria-hidden="true">📄</div>
          <div style={{ ...TYPE.heading }}>מכין PDF…</div>
          <div style={{ ...TYPE.caption, color: 'var(--ink-soft)', marginTop: 6 }}>
            {progress.page ? `עמוד ${progress.page} מתוך ${progress.total}` : 'רגע אחד'}
          </div>
          <div style={{
            marginTop: 14, height: 6, borderRadius: 'var(--r-pill)',
            background: 'var(--surface-sunken)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 'var(--r-pill)', background: 'var(--brand-strong)',
              width: `${Math.round((progress.page / Math.max(1, progress.total)) * 100)}%`,
              transition: 'width var(--dur)',
            }}/>
          </div>
        </div>
      </div>
    </>,
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
        boxShadow: 'var(--e3)', animation: 'slideUp .3s cubic-bezier(.2,1.1,.4,1)',
      }}>
        <div style={{ padding: '18px 22px 10px' }}>
          <div style={{
            width: 42, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--line)',
            margin: '0 auto 14px',
          }}/>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              אילו מתכונים להדפיס?
            </h3>
            <button onClick={() => setSel(all ? [] : recipes.map(r => r.id))} style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
              padding: '8px 14px', borderRadius: 'var(--r-pill)', background: 'var(--surface-sunken)', color: 'var(--ink)',
            }}>{all ? 'ניקוי הכל' : 'בחירת הכל'}</button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            נבחרו {sel.length} מתוך {recipes.length} · יודפס עמוד A4 לכל מתכון
          </p>
        </div>

        <div className="scroll-y" style={{ flex: 1, padding: '6px 16px 10px' }}>
          {recipes.map(r => {
            const on = sel.includes(r.id);
            const p = paletteOf(r.palette);
            const cat = (categories || []).find(c => c.id === r.category);
            return (
              <button key={r.id} onClick={() => toggle(r.id)} style={{
                width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start',
                padding: '10px 12px', borderRadius: 16, marginBottom: 6,
                background: on ? 'var(--surface-raised)' : 'var(--glass)',
                boxShadow: on ? 'var(--e1)' : 'none',
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
                  background: on ? 'var(--ink)' : 'transparent', color: 'var(--bg)',
                  boxShadow: on ? 'none' : 'inset 0 0 0 2px rgba(0,0,0,.15)',
                }}>{on && <IconCheck size={13} strokeWidth={3}/>}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '12px 18px 26px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flexShrink: 0, padding: '15px 20px', border: 'none', cursor: 'pointer', borderRadius: 18,
            background: 'var(--surface-sunken)', color: 'var(--ink)', fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
          }}>ביטול</button>
          <button disabled={!sel.length}
            onClick={() => onPrint(recipes.filter(r => sel.includes(r.id)))}
            style={{
              flex: 1, padding: '15px', border: 'none', borderRadius: 18,
              cursor: sel.length ? 'pointer' : 'default',
              background: sel.length ? 'var(--ink)' : 'var(--line)', color: 'var(--bg)',
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
            padding: '10px 15px', borderRadius: 'var(--r-pill)', background: 'var(--ink)', color: 'var(--bg)',
            fontSize: 13, fontWeight: 700, boxShadow: 'var(--e1)',
          }}>
            <IconFilePdf size={15} strokeWidth={2.2}/> PDF
          </button>
        </div>

        <div style={{ padding: '0 16px 18px' }}>
          <PageScaler>
            <BookPage recipe={r} pageNo={openIndex + 1} categories={categories}/>
          </PageScaler>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 16px 96px' }}>
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
                padding: '12px 18px', borderRadius: 'var(--r-pill)', background: 'var(--ink)', color: 'var(--bg)',
                fontSize: 13.5, fontWeight: 700, boxShadow: 'var(--e1)',
                opacity: ordered.length ? 1 : .5,
              }}>
                <IconFilePdf size={16} strokeWidth={2.2}/> ייצוא הספר
              </button>
              <button onClick={onSelectPrint} disabled={!ordered.length} style={{
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '12px 18px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
                fontSize: 13.5, fontWeight: 700, boxShadow: 'var(--e1)',
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
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
          </div>
          <div style={{
            background: 'var(--glass)', borderRadius: 'var(--r-md)', overflow: 'hidden',
            boxShadow: 'var(--e1)',
          }}>
            {g.items.map((it, i) => {
              const p = paletteOf(it.recipe.palette);
              return (
                <button key={it.recipe.id} onClick={() => onOpenPage(it.recipe.id)} style={{
                  width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'start',
                  padding: '12px 14px', background: 'transparent',
                  borderTop: i ? '1px solid rgba(0,0,0,.06)' : 'none',
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 'var(--r-pill)', background: p.bg, flexShrink: 0,
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
  width: 40, height: 40, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', flexShrink: 0,
  background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
  display: 'grid', placeItems: 'center', boxShadow: 'var(--e1)',
};

const pagerBtn = {
  flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '14px 0', borderRadius: 18, background: 'rgba(255,255,255,.9)', color: 'var(--ink)',
  fontSize: 14, fontWeight: 700, boxShadow: 'var(--e1)',
};

Object.assign(window, {
  BookScreen, BookPage, BookCover, BookTOCPage, PdfBook, PrintSelectSheet, PageScaler,
  groupByCategory, pagesToPdfFile, ensurePdfLibs,
});
