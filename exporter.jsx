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

// Strip HTML tags, decode entities, and clean Excel/spreadsheet artifacts.
function stripHTML(s) {
  if (s == null) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(div|p|li|tr|td|th|span|strong|em|b|i|u)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#\d+;/g, ' ')        // other numeric entities → space
    // Excel / Google Sheets formatting artifacts
    .replace(/~/g, '')               // tilde separators used in some spreadsheets
    .replace(/\s*\|\s*/g, '\n')      // pipe separators → newline
    .replace(/[ \t]{2,}/g, ' ')      // collapse multiple spaces/tabs
    .replace(/\n{3,}/g, '\n\n')      // max 2 consecutive newlines
    .replace(/^[\s\-*•]+/gm, '')     // strip leading bullets/dashes per line
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

// Parse time strings like "15 דקות", "10", "" → number of minutes.
function parseTime(s) {
  const m = String(s || '').match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(+m[1]) : 0;
}

// Parse "qty units name" — handles multiple formats:
//   "500 גרם בשר", "2 כפות שמן", "4-5 שיני שום", "1 כוס - קמח", "קמח"
function parseIngredient(raw) {
  const t = String(raw).trim();
  if (!t) return { qty: '', name: '', icon: 'chef' };
  // em/en dash explicit separator
  let m = t.match(/^(.+?)\s*[–—]\s*(.+)$/);
  if (m) return { qty: m[1].trim(), name: m[2].trim(), icon: guessIcon(m[2]) };
  // hyphen surrounded by spaces (not numeric range like "4-5")
  m = t.match(/^(.+?)\s+-\s+(.+)$/);
  if (m) return { qty: m[1].trim(), name: m[2].trim(), icon: guessIcon(m[2]) };
  // number + optional unit + ingredient name
  m = t.match(/^([\d\/\-\.¼-¾⅐-↉]+(?:\s+(?:גרם|ק"ג|מ"ל|ליטר|כוס|כוסות|כפות|כף|כפיות|כפית|יח'|יח׳|יחידות|שיני|שן|ענפי|ענף|חבילה|פרוסות|פרוסה|קמצוץ|טיפות|טיפה|מנות|מנה|גביע|גביעים|חתיכות|עלים|עלי|ראשי|ראש|צרור|פחית|קופסא))?)\s+(.{2,})$/u);
  if (m) return { qty: m[1].trim(), name: m[2].trim(), icon: guessIcon(m[2]) };
  return { qty: '', name: t, icon: guessIcon(t) };
}

// Split steps from a raw cell: newlines first, then inline numbered list.
function splitSteps(raw) {
  if (raw == null) return [];
  const s = stripHTML(String(raw)).trim();
  if (!s) return [];
  const byLines = s.split(/[\r\n;|]+/).map(x => x.trim()).filter(Boolean);
  if (byLines.length > 1) return byLines;
  // Detect "1. text 2. text" or "1) text 2) text" on a single line
  const parts = s.split(/\s+(?=\d+[.)]\s)/).map(x => x.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return [s];
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

// Map free-text cuisine cell back to a predefined category id.
function guessCategory(cuisine) {
  const t = String(cuisine || '').toLowerCase();
  if (/(סלט)/.test(t)) return 'salads';
  if (/(קינוח|עוגה|גבינה|מקרון|מוס|פאי)/.test(t)) return 'desserts';
  if (/(בוקר|שקשוקה|חביתה|ארוחת בוקר)/.test(t)) return 'breakfast';
  if (/(לחם|חלה|מאפה|פיצה|בריוש)/.test(t)) return 'bakery';
  return 'mains';
}

// Convert a raw category label from Excel into {id, label, emoji}.
// Known Hebrew categories map to fixed ids; unknown ones get a slug id.
function parseCategoryLabel(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const tl = t.toLowerCase();
  if (/עיקרי/.test(tl))               return { id: 'mains',     label: 'עיקריות',       emoji: '🥘' };
  if (/סלט/.test(tl))                 return { id: 'salads',    label: 'סלטים',         emoji: '🥗' };
  if (/קינוח|עוג/.test(tl))           return { id: 'desserts',  label: 'קינוחים',       emoji: '🍰' };
  if (/בוקר/.test(tl))                return { id: 'breakfast', label: 'ארוחת בוקר',    emoji: '🥐' };
  if (/מאפ|לחם|פיצ|בריוש/.test(tl))  return { id: 'bakery',    label: 'מאפים',         emoji: '🍞' };
  if (/מרק/.test(tl))                 return { id: 'soups',     label: 'מרקים',         emoji: '🍲' };
  if (/תוספ/.test(tl))               return { id: 'sides',     label: 'תוספות',        emoji: '🥦' };
  if (/רטב|ממרח|דיפ/.test(tl))       return { id: 'sauces',    label: 'רטבים וממרחים', emoji: '🫙' };
  if (/שתי|משק/.test(tl))            return { id: 'drinks',    label: 'משקאות',        emoji: '🥤' };
  if (/חטיף|אמוז/.test(tl))          return { id: 'snacks',    label: 'חטיפים',        emoji: '🥨' };
  if (/פסט|אורז|קינואה|דגן/.test(tl)) return { id: 'grains',    label: 'פסטה ודגנים',   emoji: '🍝' };
  // Unknown — build a stable slug from the Hebrew label
  const id = t.replace(/\s+/g, '-').replace(/[^֐-׿a-zA-Z0-9\-]/g, '').slice(0, 30) || 'other';
  return { id, label: t, emoji: '🍽️' };
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
  cuisine:    ['סוג מטבח','מטבח','cuisine'],
  category:   ['קטגוריה','סוג מנה','category','type'],
  prep:       ['זמן הכנה','זמן הכנה (דקות)','הכנה','prep','prep_time','preptime'],
  cook:       ['זמן בישול','זמן בישול (דקות)','בישול','cook','cook_time','cooktime','זמן'],
  desc:       ['תיאור','description','desc','about'],
  ingredients:['מרכיבים','מצרכים','חומרים','ingredients','ingredient'],
  steps:      ['הוראות הכנה','שלבים','הוראות','אופן ההכנה','אופן הכנה','ביצוע','דרך הכנה','הכנת המנה','instructions','steps','directions','method','preparation'],
  notes:      ['הערות','הערה','notes','remarks','tips'],
  mainImage:  ['תמונות ראשיות','תמונה ראשית','תמונה','main image','image','photo'],
  gallery:    ['גלריית תמונות','גלריה','gallery','images'],
};

function normalizeHeader(h) {
  return stripHTML(String(h || ''))
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/[:\-–—]+$/, '')  // strip trailing colon/dash (common in Hebrew labels)
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
  const catText = stripHTML(String(get('category') || ''));
  const catInfo = catText ? parseCategoryLabel(catText) : parseCategoryLabel(guessCategory(cuisine));
  const prepTime = +String(get('prep') || '').replace(/[^\d.]/g,'') || 0;
  const cookTime = +String(get('cook') || '').replace(/[^\d.]/g,'') || 0;
  const desc  = stripHTML(String(get('desc')  || ''));
  const notes = stripHTML(String(get('notes') || ''));

  const ingredients = splitMulti(get('ingredients')).map(parseIngredient);
  const instructions = stripHTML(String(get('steps') || ''));

  const mainImages = splitMulti(get('mainImage'));
  const galleryUrls = splitMulti(get('gallery'));
  const totalSlots = Math.max(1, mainImages.length + galleryUrls.length);
  const gallery = ['main', ...Array.from({length: totalSlots - 1}, (_, i) => `g${i+1}`)];

  const id = makeId(title);
  return {
    id, title,
    description: desc,
    instructions,
    cuisine,
    palette: pickPalette(title),
    category: catInfo.id,
    _catInfo: catInfo,
    prepTime, cookTime,
    time: prepTime + cookTime,
    servings: 4,
    level: 'קל',
    favorite: false,
    notes,
    gallery,
    ingredients,
    steps: [],
    _importedImageUrls: { main: mainImages, gallery: galleryUrls },
  };
}

// ─── Vertical format: each Sheet = one recipe ─────────────────
// Row 0: title (column A only, no label)
// Rows 1–N: [fieldLabel, value] in cols A+B, OR single-column continuation lines
function sheetToRecipe(sheetName, rows) {
  if (!rows || rows.length === 0) return null;
  const title = stripHTML(String(rows[0] && rows[0][0] != null ? rows[0][0] : sheetName || '')).trim();
  if (!title) return null;

  // All known label patterns for detecting field labels in single-column rows
  const allAliasNorms = Object.values(COL_ALIASES).flat().map(normalizeHeader);
  const looksLikeLabel = (s) => {
    const n = normalizeHeader(s);
    return allAliasNorms.some(a => n === a || n.startsWith(a + ' ') || a.startsWith(n + ' '));
  };

  // Build key→value map — handles [label, value] rows AND single-column continuation lines
  const kv = {};
  let lastKey = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const a = row[0] != null ? String(row[0]).trim() : '';
    const b = row[1] != null ? String(row[1]).trim() : '';
    if (!a && !b) continue;
    if (a && b) {
      // Standard [label, value] row
      const key = normalizeHeader(a);
      if (key) { lastKey = key; kv[key] = kv[key] ? kv[key] + '\n' + b : b; }
    } else if (a) {
      if (looksLikeLabel(a)) {
        lastKey = normalizeHeader(a);
      } else if (lastKey) {
        // Continuation value for previous field
        kv[lastKey] = kv[lastKey] ? kv[lastKey] + '\n' + a : a;
      }
    } else if (b && lastKey) {
      // Empty col A, value in col B — continuation
      kv[lastKey] = kv[lastKey] ? kv[lastKey] + '\n' + b : b;
    }
  }

  // Lookup with exact match then prefix/suffix partial match, always strip HTML
  const get = (...labels) => {
    for (const lbl of labels) {
      const n = normalizeHeader(lbl);
      if (kv[n]) return stripHTML(kv[n]);
    }
    // Partial match pass (key contains label or label contains key)
    for (const lbl of labels) {
      const n = normalizeHeader(lbl);
      for (const k of Object.keys(kv)) {
        if (k.includes(n) || n.includes(k)) return stripHTML(kv[k]);
      }
    }
    return '';
  };

  const cuisine    = get('סוג מטבח','מטבח','cuisine');
  const catRaw     = get('קטגוריה','סוג מנה','סוג','category','type');
  const catInfo    = catRaw ? parseCategoryLabel(catRaw) : parseCategoryLabel(guessCategory(cuisine));
  const level      = get('רמת קושי','רמת קשיים','רמת קשיות') || 'קל';
  const prepTime   = parseTime(get('זמן הכנה','prep','זמן'));
  const cookTime   = parseTime(get('זמן בישול','cook','בישול'));
  const desc       = get('תיאור','description','desc','about','הסבר');
  const ingRaw     = get('מרכיבים','מצרכים','חומרים','ingredients','ingredient','רכיבים');
  const notes      = get('הערות','הערה','notes','remarks','tips','טיפים','הערות שף');
  const mainImgRaw = get('תמונות ראשיות','תמונה ראשית','תמונה','image');
  const galRaw     = get('גלריית תמונות','גלריה','gallery');

  let instrRaw = get(
    'הוראות הכנה','אופן ההכנה','אופן הכנה','שלבי הכנה',
    'הוראות','שלבים','הכנה','שיטת הכנה','תהליך הכנה','הכנת המנה',
    'ביצוע','דרך הכנה','עריכה ובישול','עריכה','בישול',
    'instructions','steps','directions','method','preparation','procedure'
  );

  // Fallback: if still no instructions, use the longest unrecognized text value (>30 chars)
  if (!instrRaw) {
    const knownKeys = new Set([
      'תיאור','description','desc','about','הסבר',
      'סוג מטבח','מטבח','קטגוריה','cuisine','category',
      'רמת קושי','רמת קשיים','רמת קשיות',
      'זמן הכנה','prep','זמן','זמן בישול','cook','בישול',
      'הערות','הערה','notes','remarks','tips','טיפים','הערות שף',
      'תמונות ראשיות','תמונה ראשית','תמונה','image',
      'גלריית תמונות','גלריה','gallery',
      'מרכיבים','מצרכים','חומרים','ingredients','ingredient','רכיבים',
    ].map(normalizeHeader));
    const candidates = Object.entries(kv)
      .filter(([k, v]) => !knownKeys.has(k) && String(v).length > 30)
      .sort(([, a], [, b]) => b.length - a.length);
    if (candidates.length > 0) instrRaw = stripHTML(candidates[0][1]);
    console.log('[import]', title, '— fields:', Object.keys(kv), '— instructions key:', candidates[0]?.[0] || 'not found');
  }

  const ingredients = splitMulti(ingRaw).map(parseIngredient).filter(i => i.name);
  const instructions = instrRaw;

  const mainImages = mainImgRaw.split(/,\s*/).map(u => u.trim()).filter(Boolean);
  const galImages  = galRaw.split(/,\s*/).map(u => u.trim()).filter(Boolean);
  const totalSlots = Math.max(1, mainImages.length + galImages.length);
  const gallery    = ['main', ...Array.from({ length: totalSlots - 1 }, (_, i) => `g${i + 1}`)];

  const id = makeId(title);
  return {
    id, title,
    description: desc, instructions, cuisine,
    palette: pickPalette(title),
    category: catInfo.id,
    _catInfo: catInfo,
    prepTime, cookTime,
    time: prepTime + cookTime,
    servings: 4, level,
    favorite: false, notes,
    gallery, ingredients,
    steps: [],
    _importedImageUrls: { main: mainImages, gallery: galImages },
  };
}

function importFromFile(file, onDone) {
  if (!window.XLSX) { onDone(new Error('SheetJS not loaded'), null); return; }
  const isCSV = /\.csv$/i.test(file.name) || file.type === 'text/csv';

  const fr = new FileReader();
  fr.onload = () => {
    try {
      const wb = isCSV
        ? window.XLSX.read(String(fr.result || ''), { type: 'string' })
        : window.XLSX.read(new Uint8Array(fr.result), { type: 'array' });

      if (!wb || !wb.SheetNames.length) { onDone(null, []); return; }

      // Detect format:
      // "Vertical" = multi-sheet OR single sheet whose first row has only 1 cell
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const firstRows  = window.XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false });
      const isVertical = wb.SheetNames.length > 1 ||
        (firstRows.length > 1 && (firstRows[0] || []).length <= 1 && (firstRows[1] || []).length === 2);

      let recs;
      if (isVertical) {
        // One recipe per sheet — parse vertically
        recs = wb.SheetNames.map(name => {
          const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false });
          return sheetToRecipe(name, rows);
        }).filter(Boolean);
      } else {
        // One recipe per row (horizontal format)
        if (!firstRows || firstRows.length < 2) { onDone(null, []); return; }
        let map = buildHeaderMap(firstRows[0]);
        map = inferTitleColumn(map, firstRows[0]);
        if (map.title == null) {
          onDone(new Error(
            `לא נמצאה עמודת שם המתכון. עמודות שנמצאו: ${(firstRows[0] || []).map(normalizeHeader).filter(Boolean).join(', ') || '(ריק)'}`
          ), null);
          return;
        }
        recs = firstRows.slice(1).map(r => rowToRecipe(r, map)).filter(Boolean);
      }

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
