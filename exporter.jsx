// exporter.jsx — Excel (.xlsx) import/export + Word (HTML doc) export.
//
// Excel schema for IMPORT (one row per recipe, headers in Hebrew):
//   שם המתכון | סוג מטבח | רמת קושי | זמן הכנה | זמן בישול | תיאור
//   מרכיבים | הוראות הכנה | הערות | תמונות ראשיות | גלריית תמונות | ציבורי
//
// Ingredients / steps / gallery within a single cell are separated by
// newlines OR by ";" / "|". Ingredients can use the form
//   "כמות - שם" or "כמות, שם".
//
// Excel EXPORT writes one sheet, one row per recipe, same Hebrew headers.

// ──────────────────────────────────────────────
// Generic helpers
// ──────────────────────────────────────────────
function saveBlob(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function escapeHTML(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Strip HTML tags and decode entities — handles cells from web apps
// that embed <div>, <br>, &nbsp; etc.
function stripHTML(s) {
  if (s == null) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(div|p|li|tr|td|th)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/^[~\s]+/gm, '')    // strip leading ~ artifacts per line
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Split a multi-value cell into trimmed non-empty items. Strips HTML first.
function splitMulti(s) {
  if (s == null) return [];
  return stripHTML(String(s))
    .split(/[\r\n;|]+/g)
    .map(x => x.trim())
    .filter(Boolean);
}

// Parse "1 כוס - קמח" or "1 כוס, קמח" or just "קמח" into {qty, name}.
function parseIngredient(raw) {
  const t = String(raw).trim();
  // try " - " separator first
  let m = t.match(/^(.+?)\s*[\-–—]\s*(.+)$/);
  if (m) return { qty: m[1].trim(), name: m[2].trim(), icon: guessIcon(m[2]) };
  // fallback to comma
  m = t.match(/^(.+?),\s*(.+)$/);
  if (m) return { qty: m[1].trim(), name: m[2].trim(), icon: guessIcon(m[2]) };
  return { qty: '', name: t, icon: guessIcon(t) };
}

// Parse "כותרת. תיאור" or "כותרת - תיאור" or whole line as body.
function parseStep(raw, idx) {
  const t = String(raw).trim();
  let m = t.match(/^(.+?)\s*[\-–—:]\s*(.+)$/);
  if (m) return { title: m[1].trim(), body: m[2].trim() };
  // first sentence as title if short enough
  m = t.match(/^([^.!?\n]{2,40})[.!?]\s*(.+)$/);
  if (m) return { title: m[1].trim(), body: m[2].trim() };
  return { title: `שלב ${idx + 1}`, body: t };
}

// Heuristically pick an ingredient icon from the name (Hebrew keywords).
function guessIcon(name) {
  const t = String(name).toLowerCase();
  const has = (...words) => words.some(w => t.includes(w));
  if (has('ביצ','ביצה')) return 'egg';
  if (has('חלב','שמנת','חמאה','יוגורט','קוטג','גבינ')) return has('גבינ') ? 'cheese' : 'dairy';
  if (has('לחם','לחמני','חלה','פיתה','בייגל','פרנה')) return 'bread';
  if (has('קמח','שיבולת','שעור','כוסמת','סולת','דגן')) return 'grain';
  if (has('סוכר','דבש','סילן','אבקת סוכר','שוקולד לבן')) return 'sweet';
  if (has('שוקולד','קקאו')) return 'chocolate';
  if (has('בשר','עוף','כבש','בקר','נקני','סטייק','המבורגר')) return 'meat';
  if (has('דג','סלמון','טונה','דגים','שרימפ','פירות ים')) return 'fish';
  if (has('עגבני','מלפפון','בצל','פלפל','שום','קישוא','חציל','גזר','ירק','תפו"א','תפוח אדמה','פטרי','בטטה','עלים')) return 'veg';
  if (has('לימון','תפוז','תפוח','בננה','אגס','אבטיח','ענב','פטל','אוכמני','פרי','תות','דובדבן','משמש','שזיף','אננס','מנגו')) return 'fruit';
  if (has('פפריקה','כמון','כורכום','פלפל שחור','קינמון','הל','זנגביל','מלח','אבקה','תבלין')) return 'spice';
  if (has('פטרוזיל','כוסבר','בזיליק','נענע','מנטה','אורגנו','עירית','טימין','רוזמרין','עשב','עלי')) return 'herb';
  if (has('שמן','מים','מיץ','חומץ','רוטב סויה','יין','בירה','קולה','משקה','נוזל')) return has('שמן','חומץ','יין','בירה','משקה') ? 'bottle' : 'drop';
  if (has('אגוז','שקד','בוטן','פיסטוק','קשיו','פקאן','קוקוס','גרעיני','זרעי')) return 'nuts';
  if (has('קפה','אספרסו','נס','שוקו')) return 'coffee';
  return 'chef';
}

// Map free-text cuisine/category cell back to one of our category ids.
function guessCategory(cuisineOrCat) {
  const t = String(cuisineOrCat || '').toLowerCase();
  if (/(סלט)/.test(t)) return 'salads';
  if (/(קינוח|עוגה|גבינה|מקרון|מוס|פאי)/.test(t)) return 'desserts';
  if (/(בוקר|שקשוקה|חביתה|ארוחת בוקר)/.test(t)) return 'breakfast';
  if (/(לחם|חלה|מאפה|פיצה|בריוש)/.test(t)) return 'bakery';
  return 'mains';
}

// Pick a palette deterministically from a string so colors are spread.
const PALETTE_KEYS = ['peach','sky','mint','lavender','pink','yellow'];
function pickPalette(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE_KEYS[h % PALETTE_KEYS.length];
}

// Make a clean id from a Hebrew title.
function makeId(title) {
  const t = (title || 'recipe').trim().replace(/\s+/g,'-').slice(0, 24);
  return t + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
}

// ──────────────────────────────────────────────
// Excel IMPORT (.xlsx) using SheetJS (XLSX global)
// ──────────────────────────────────────────────
// Column header → recipe field. Both Hebrew and a few aliases accepted.
const COL_ALIASES = {
  title:      ['שם המתכון','שם מתכון','שם','כותרת','מתכון','title','name','recipe'],
  cuisine:    ['סוג מטבח','מטבח','קטגוריה','cuisine','category','type'],
  prep:       ['זמן הכנה','זמן הכנה (דקות)','הכנה','prep','prep_time','preptime'],
  cook:       ['זמן בישול','זמן בישול (דקות)','בישול','cook','cook_time','cooktime','זמן'],
  desc:       ['תיאור','description','desc','about'],
  ingredients:['מרכיבים','מצרכים','חומרים','ingredients','ingredient'],
  steps:      ['הוראות הכנה','שלבים','הוראות','אופן ההכנה','הכנה','instructions','steps','directions'],
  notes:      ['הערות','הערה','notes','remarks','tips'],
  mainImage:  ['תמונות ראשיות','תמונה ראשית','תמונה','main image','image','photo'],
  gallery:    ['גלריית תמונות','גלריה','gallery','images'],
};

function normalizeHeader(h) {
  return stripHTML(String(h || ''))
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (!n) return;
    for (const key of Object.keys(COL_ALIASES)) {
      if (map[key] != null) continue; // already mapped
      const aliases = COL_ALIASES[key].map(a => normalizeHeader(a));
      if (aliases.some(alias => alias === n || n.includes(alias) || alias.includes(n))) {
        map[key] = i;
      }
    }
  });
  // Debug: log what was found (remove later)
  if (map.title == null) {
    console.warn('[import] Headers found:', headerRow.map(normalizeHeader));
  }
  return map;
}

// Fallback: if title column not found, try to use first non-empty column
function inferTitleColumn(map, headerRow) {
  if (map.title != null) return map;
  const firstText = headerRow.findIndex(h => normalizeHeader(h));
  if (firstText >= 0) return { ...map, title: firstText };
  return map;
}

function rowToRecipe(row, map) {
  const get = (key) => {
    const i = map[key];
    return i == null ? '' : (row[i] ?? '');
  };
  const title = String(get('title') || '').trim();
  if (!title) return null;

  const cuisine = stripHTML(String(get('cuisine') || ''));
  const category = guessCategory(cuisine);
  const prepTime = +String(get('prep') || '').replace(/[^\d.]/g,'') || 0;
  const cookTime = +String(get('cook') || '').replace(/[^\d.]/g,'') || 0;
  const desc  = stripHTML(String(get('desc')  || ''));
  const notes = stripHTML(String(get('notes') || ''));

  const ingredients = splitMulti(get('ingredients')).map(parseIngredient);
  const steps = splitMulti(get('steps')).map((s, i) => parseStep(s, i));

  // Image cells: not used to render (we don't fetch external URLs into the
  // image-slot component automatically), but we keep them in a meta field
  // so the user can copy them in. Gallery still seeds slot ids so the user
  // can drop additional photos.
  const mainImages = splitMulti(get('mainImage'));
  const galleryUrls = splitMulti(get('gallery'));
  const totalSlots = Math.max(1, mainImages.length + galleryUrls.length);
  const gallery = ['main', ...Array.from({length: totalSlots - 1}, (_, i) => `g${i+1}`)];

  const id = makeId(title);
  return {
    id, title,
    description: desc,
    cuisine,
    palette: pickPalette(title),
    category,
    prepTime, cookTime,
    time: prepTime + cookTime,
    servings: 4,
    level: 'קל',
    favorite: false,
    notes,
    gallery,
    ingredients,
    steps,
    // metadata only — image-slot images are managed by the user dropping files
    _importedImageUrls: { main: mainImages, gallery: galleryUrls },
  };
}

function importFromFile(file, onDone) {
  const isXLSX = /\.(xlsx|xls)$/i.test(file.name) || file.type.includes('sheet') || file.type.includes('excel');
  const isCSV  = /\.csv$/i.test(file.name) || file.type === 'text/csv';

  if (!window.XLSX && !isCSV) {
    onDone(new Error('SheetJS not loaded'), null);
    return;
  }

  const fr = new FileReader();
  fr.onload = () => {
    try {
      let rows;
      if (isCSV) {
        // Fallback: simple CSV parse with SheetJS (it handles CSV too).
        const text = String(fr.result || '');
        const wb = window.XLSX.read(text, { type: 'string' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      } else {
        const data = new Uint8Array(fr.result);
        const wb = window.XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
      }
      if (!rows || rows.length < 2) {
        onDone(null, []);
        return;
      }
      let map = buildHeaderMap(rows[0]);
      map = inferTitleColumn(map, rows[0]);
      if (map.title == null) {
        onDone(new Error(
          `לא נמצאה עמודת שם המתכון בקובץ. עמודות שנמצאו: ${rows[0].map(normalizeHeader).filter(Boolean).join(', ') || '(ריק)'}`
        ), null);
        return;
      }
      const recs = rows.slice(1)
        .map(r => rowToRecipe(r, map))
        .filter(Boolean);
      onDone(null, recs);
    } catch (e) {
      console.error(e);
      onDone(e, null);
    }
  };
  fr.onerror = () => onDone(fr.error, null);

  if (isCSV) fr.readAsText(file, 'utf-8');
  else       fr.readAsArrayBuffer(file);
}

// ──────────────────────────────────────────────
// Excel EXPORT — single sheet, Hebrew headers, one row per recipe.
// Cells with multiple lines (ingredients/steps) are joined by \n.
// ──────────────────────────────────────────────
function exportExcel(recipes) {
  if (!window.XLSX) {
    alert('Excel library not loaded');
    return;
  }
  const headers = [
    'שם המתכון','סוג מטבח','זמן הכנה','זמן בישול','מנות','קטגוריה',
    'תיאור','מרכיבים','הוראות הכנה','הערות','צבע',
  ];
  const aoa = [headers];
  recipes.forEach(r => {
    aoa.push([
      r.title || '',
      r.cuisine || '',
      r.prepTime ?? '',
      r.cookTime ?? '',
      r.servings ?? '',
      r.category || '',
      r.description || '',
      (r.ingredients || []).map(i => `${i.qty || ''} - ${i.name || ''}`.replace(/^\s*-\s*/, '')).join('\n'),
      (r.steps || []).map((s, i) => `${i+1}. ${s.title ? s.title + ': ' : ''}${s.body || ''}`).join('\n'),
      r.notes || '',
      r.palette || '',
    ]);
  });
  const ws = window.XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
    { wch: 40 }, { wch: 40 }, { wch: 60 }, { wch: 30 }, { wch: 10 },
  ];
  ws['!rows'] = aoa.map(() => ({ hpx: 28 }));
  // RTL hint for Excel
  if (!ws['!sheetViews']) ws['!sheetViews'] = [{ rightToLeft: true }];
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, 'מתכונים');
  const out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveBlob(`receips-${new Date().toISOString().slice(0,10)}.xlsx`,
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

// ──────────────────────────────────────────────
// Word EXPORT (.doc HTML) — one recipe per page,
// HARD page-break between every recipe (no matter how short the
// previous one overflowed).
// ──────────────────────────────────────────────
function recipesToWordHTML(recipes) {
  // We rely on three layered tricks for page breaks because Word's HTML
  // import is fussy:
  //   1) `page-break-after: always` on the recipe block.
  //   2) An explicit empty <br clear="all" style="page-break-before:always"/>
  //      element AFTER each recipe (Word respects this even when block-level
  //      page-break rules fail).
  //   3) The mso-special-character:line-break marker.
  const css = `
    @page { size: A4; margin: 24mm 22mm; }
    body { font-family: 'Calibri','Heebo','Rubik',sans-serif; direction: rtl; color: #2c1d27; }
    .cover { text-align: center; padding: 60px 0 80px; page-break-after: always; break-after: page; }
    .cover h1 { font-size: 56pt; margin: 0; font-weight: 800; letter-spacing: -1px; }
    .cover .sub { font-size: 14pt; opacity: .65; margin-top: 12px; }
    .pb { page-break-before: always; break-before: page; mso-special-character: line-break; }
    .recipe { page-break-after: always; break-after: page; page-break-inside: auto; }
    .recipe:last-of-type { page-break-after: auto; break-after: auto; }
    .hero { padding: 28px 26px; border-radius: 18px; margin-bottom: 22px; }
    .hero h2 { margin: 0 0 8px; font-size: 30pt; font-weight: 800; }
    .hero .desc { font-size: 12pt; opacity: .8; line-height: 1.55; max-width: 520px; }
    .meta { margin: 14px 0 0; font-size: 11pt; }
    .meta span { display: inline-block; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.6); margin-left: 6px; font-weight: 700; }
    h3 { font-size: 13pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #2c1d27; }
    ul { padding-right: 18px; font-size: 12pt; line-height: 1.7; }
    ol { padding-right: 18px; font-size: 12pt; line-height: 1.65; }
    li { margin-bottom: 6px; }
    .step-title { font-weight: 800; }
    .notes { background: #fff7e8; padding: 12px 16px; border-radius: 12px; font-size: 11.5pt; line-height: 1.55; }
  `;
  const colorFor = pk => {
    const p = PALETTES[pk] || PALETTES.peach;
    return { bg: p.bg, bg2: p.bg2, ink: p.ink };
  };
  const recipeHtml = (r, idx) => {
    const c = colorFor(r.palette);
    return `
      <section class="recipe">
        <div class="hero" style="background:${c.bg};color:${c.ink};">
          <h2>${escapeHTML(r.title)}</h2>
          ${r.description ? `<div class="desc">${escapeHTML(r.description)}</div>` : ''}
          <div class="meta">
            <span>⏱️ ${(r.prepTime||0)+(r.cookTime||0)} דקות</span>
            <span>👥 ${r.servings || ''} מנות</span>
            ${r.cuisine ? `<span>🍽 ${escapeHTML(r.cuisine)}</span>` : ''}
          </div>
        </div>
        ${(r.ingredients||[]).length ? `
          <h3>מצרכים</h3>
          <ul>
            ${(r.ingredients||[]).map(i =>
              `<li>${i.qty ? `<strong>${escapeHTML(i.qty)}</strong> · ` : ''}${escapeHTML(i.name)}</li>`).join('')}
          </ul>
        ` : ''}
        ${(r.steps||[]).length ? `
          <h3>הוראות הכנה</h3>
          <ol>
            ${(r.steps||[]).map(s => `
              <li>${s.title ? `<span class="step-title">${escapeHTML(s.title)}</span> — ` : ''}${escapeHTML(s.body || '')}</li>
            `).join('')}
          </ol>
        ` : ''}
        ${r.notes ? `
          <h3>הערות</h3>
          <div class="notes">${escapeHTML(r.notes).replace(/\n/g,'<br/>')}</div>
        ` : ''}
      </section>
      ${idx < recipes.length - 1 ? '<br clear="all" class="pb"/>' : ''}
    `;
  };
  return `
<!DOCTYPE html>
<html lang="he" dir="rtl" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="UTF-8">
<title>ספר המתכונים שלי</title>
<!--[if gte mso 9]><xml>
<w:WordDocument><w:View>Print</w:View></w:WordDocument>
</xml><![endif]-->
<style>${css}</style>
</head>
<body>
<div class="cover">
  <h1>ספר המתכונים שלי</h1>
  <div class="sub">${recipes.length} מתכונים · יוצא מ-Maites · ${new Date().toLocaleDateString('he-IL')}</div>
</div>
${recipes.map(recipeHtml).join('\n')}
</body>
</html>`;
}

function exportWord(recipes) {
  const html = recipesToWordHTML(recipes);
  saveBlob(`receips-${new Date().toISOString().slice(0,10)}.doc`,
    new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' }));
}

Object.assign(window, {
  exportExcel, exportWord, importFromFile,
});
