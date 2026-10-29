// data.jsx — recipes seed data

const CATEGORIES = [
  { id: 'all', label: 'הכל', emoji: '🍽️' },
];

// Seed definitions used when auto-creating categories from imports
const CATEGORY_SEED = {
  mains:     { id: 'mains',     label: 'עיקריות',    emoji: '🥘' },
  salads:    { id: 'salads',    label: 'סלטים',      emoji: '🥗' },
  desserts:  { id: 'desserts',  label: 'קינוחים',    emoji: '🍰' },
  breakfast: { id: 'breakfast', label: 'ארוחת בוקר', emoji: '🥐' },
  bakery:    { id: 'bakery',    label: 'מאפים',      emoji: '🍞' },
};

// Palette per recipe. The app reads the themed CSS variables (so cards
// follow light/dark automatically); PALETTE_HEX keeps the raw paper
// values for the printed recipe book, which is always on white paper.
const PALETTE_KEYS = ['yellow', 'sky', 'pink', 'mint', 'lavender', 'peach'];

const PALETTES = PALETTE_KEYS.reduce((acc, k) => {
  acc[k] = {
    bg:     `var(--p-${k}-bg)`,
    bg2:    `var(--p-${k}-bg2)`,
    ink:    `var(--p-${k}-ink)`,
    tag:    `var(--p-${k}-tag)`,
    accent: `var(--p-${k}-accent)`,
  };
  return acc;
}, {});

const PALETTE_HEX = {
  yellow:   { bg: '#ffd255', bg2: '#fff1c2', ink: '#3a2a0a', tag: '#ffefb8', accent: '#a8730e' },
  sky:      { bg: '#8fd6e7', bg2: '#dbf3f8', ink: '#0f3641', tag: '#cdedf3', accent: '#186c7e' },
  pink:     { bg: '#f7a8b8', bg2: '#ffe2e8', ink: '#3a1622', tag: '#ffd2db', accent: '#a83d52' },
  mint:     { bg: '#9adfb1', bg2: '#dff3e6', ink: '#0e3b25', tag: '#c8ecd4', accent: '#26794a' },
  lavender: { bg: '#c9b8e8', bg2: '#e9e0f8', ink: '#2a1e4a', tag: '#dccdf3', accent: '#61489a' },
  peach:    { bg: '#ffb494', bg2: '#ffdfcd', ink: '#3d1a0a', tag: '#ffd2bd', accent: '#b34c24' },
};

// Never return undefined for an unknown/missing palette key.
const paletteOf = (key) => PALETTES[key] || PALETTES.peach;
const paletteHexOf = (key) => PALETTE_HEX[key] || PALETTE_HEX.peach;

const defaultGallery = () => ['main'];

const RECIPES = [];

// A recipe's ingredients are one flat list, and an ingredient that belongs
// to a part of the dish — the dough, the filling, the glaze — carries that
// part's name in `group`. Flat on purpose: anything that never heard of
// groups (an older copy of the app, a shared recipe, the importer) still
// reads a correct list, it just reads it without the headings.
//
// This turns the list back into its parts, in the order each part first
// appears. Every item keeps its index in the flat list, because that index
// is what the cooking screen's ticks are keyed by.
function ingredientGroups(ingredients) {
  const groups = [];
  const byName = new Map();
  (ingredients || []).forEach((ing, index) => {
    if (!ing || !String(ing.name || '').trim()) return;
    const name = String(ing.group || '').trim();
    let g = byName.get(name);
    if (!g) { g = { name, items: [] }; byName.set(name, g); groups.push(g); }
    g.items.push({ ing, index });
  });
  return groups;
}

// Minutes as a person would say them: "45 דקות", "שעה ו־15 דק׳".
function formatMinutes(total) {
  const m = Math.round(+total || 0);
  if (m <= 0) return '';
  if (m < 60) return `${m} דקות`;
  const h = Math.floor(m / 60), r = m % 60;
  const hours = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`;
  return r ? `${hours} ו־${r} דק׳` : hours;
}

// A recipe's total time, or 0 when it never said. Older recipes have only
// `time`; newer ones have the two halves.
function recipeMinutes(r) {
  if (!r) return 0;
  return ((+r.prepTime || 0) + (+r.cookTime || 0)) || (+r.time || 0);
}

// Hebrew counts: one is said differently from many ("מנה אחת", not "1 מנות").
function countLabel(n, one, many) {
  return +n === 1 ? one : `${n} ${many}`;
}

Object.assign(window, {
  CATEGORIES, CATEGORY_SEED, PALETTES, PALETTE_HEX, PALETTE_KEYS,
  paletteOf, paletteHexOf, RECIPES, defaultGallery,
  ingredientGroups, formatMinutes, recipeMinutes, countLabel,
});
