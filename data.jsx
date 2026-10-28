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

Object.assign(window, {
  CATEGORIES, CATEGORY_SEED, PALETTES, PALETTE_HEX, PALETTE_KEYS,
  paletteOf, paletteHexOf, RECIPES, defaultGallery,
});
