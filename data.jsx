// data.jsx — recipes seed data

const CATEGORIES = [
  { id: 'all',       label: 'הכל',        emoji: '🍽️' },
  { id: 'mains',     label: 'עיקריות',     emoji: '🥘' },
  { id: 'salads',    label: 'סלטים',       emoji: '🥗' },
  { id: 'desserts',  label: 'קינוחים',      emoji: '🍰' },
  { id: 'breakfast', label: 'ארוחת בוקר',  emoji: '🥐' },
  { id: 'bakery',    label: 'מאפים',       emoji: '🍞' },
];

// Palette per recipe. Each has a primary block color + a softer secondary
// for the detail view body section.
const PALETTES = {
  yellow:   { bg: '#ffd255', bg2: '#fff1c2', ink: '#3a2a0a', tag: '#ffefb8', accent: '#c98a14' },
  sky:      { bg: '#8fd6e7', bg2: '#dbf3f8', ink: '#0f3641', tag: '#cdedf3', accent: '#1d7d92' },
  pink:     { bg: '#f7a8b8', bg2: '#ffe2e8', ink: '#3a1622', tag: '#ffd2db', accent: '#b3445a' },
  mint:     { bg: '#9adfb1', bg2: '#dff3e6', ink: '#0e3b25', tag: '#c8ecd4', accent: '#2c8a52' },
  lavender: { bg: '#c9b8e8', bg2: '#e9e0f8', ink: '#2a1e4a', tag: '#dccdf3', accent: '#6b50a6' },
  peach:    { bg: '#ffb494', bg2: '#ffdfcd', ink: '#3d1a0a', tag: '#ffd2bd', accent: '#c2552a' },
};

const defaultGallery = () => ['main'];

const RECIPES = [];

Object.assign(window, { CATEGORIES, PALETTES, RECIPES, defaultGallery });
