// icons.jsx — small stroke icon set
const Icon = ({ d, size = 24, fill = 'none', stroke = 'currentColor', strokeWidth = 2, children, viewBox = '0 0 24 24', style }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d} /> : children}
  </svg>
);

const IconBack = (p) => (
  <Icon {...p}>
    <path d="M14 6l-6 6 6 6" />
  </Icon>
);
const IconForward = (p) => (
  <Icon {...p}>
    <path d="M10 6l6 6-6 6" />
  </Icon>
);
const IconHome = (p) => (
  <Icon {...p}>
    <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-9z" />
  </Icon>
);
const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
);
const IconHeart = ({ filled = false, ...p }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 21s-7-4.534-9.5-9C1 9 2.5 5 6.5 5c2.5 0 3.8 1.5 5.5 3.5C13.7 6.5 15 5 17.5 5 21.5 5 23 9 21.5 12 19 16.466 12 21 12 21z" />
  </Icon>
);
const IconPlus = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
const IconClose = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
const IconClock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const IconUsers = (p) => (
  <Icon {...p}>
    <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z" />
    <path d="M3 21c0-3.866 4.03-6 9-6s9 2.134 9 6" />
  </Icon>
);
const IconFire = (p) => (
  <Icon {...p}>
    <path d="M12 22c4.5 0 8-3 8-7 0-3-2-5-3-7-1.5-3-1-5-1-5s-3 1.5-4.5 5C10 11 8 11 7 14c-.7 2 0 8 5 8z" />
  </Icon>
);
const IconChef = (p) => (
  <Icon {...p} strokeWidth={p.strokeWidth || 2.2}>
    <path d="M7 21h10M8 21v-6M16 21v-6M6 15h12M7 15c-2 0-3-1.5-3-3.5C4 9 6 8 7 8c0-2.5 2-4 5-4s5 1.5 5 4c1 0 3 1 3 3.5 0 2-1 3.5-3 3.5" />
  </Icon>
);
const IconFilter = (p) => (
  <Icon {...p}>
    <path d="M3 5h18M6 12h12M10 19h4" />
  </Icon>
);
const IconDownload = (p) => (
  <Icon {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </Icon>
);
const IconUpload = (p) => (
  <Icon {...p}>
    <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />
  </Icon>
);
const IconCheck = (p) => (
  <Icon {...p}>
    <path d="M5 12l4 4 10-10" />
  </Icon>
);
const IconShare = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M7.7 11l8.6-4M7.7 13l8.6 4" />
  </Icon>
);
const IconBookmark = ({ filled = false, ...p }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6 3h12v18l-6-4-6 4V3z" />
  </Icon>
);
const IconDots = (p) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </Icon>
);
const IconExcel = (p) => (
  <Icon {...p} strokeWidth={p.strokeWidth || 2}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 8l6 8M15 8l-6 8" />
  </Icon>
);
const IconWord = (p) => (
  <Icon {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8l2 8 2-6 2 6 2-8" />
  </Icon>
);
const IconEdit = (p) => (
  <Icon {...p}>
    <path d="M14 4l6 6M3 21l4-1L20 7l-3-3L4 17l-1 4z" />
  </Icon>
);
const IconNote = (p) => (
  <Icon {...p}>
    <path d="M5 4h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM15 4v5h5M8 13h8M8 17h5" />
  </Icon>
);
const IconChevronLeft = (p) => (
  <Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>
);
const IconChevronRight = (p) => (
  <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>
);
const IconImage = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <circle cx="9" cy="10" r="2"/>
    <path d="M21 16l-5-5-9 9"/>
  </Icon>
);
const IconTrash = (p) => (
  <Icon {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v7M14 11v7"/>
  </Icon>
);
const IconGrid = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </Icon>
);
const IconRows = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="5" rx="1.5"/>
    <rect x="3" y="11" width="18" height="3" rx="1"/>
    <rect x="3" y="16" width="18" height="4" rx="1.5"/>
  </Icon>
);
const IconColumns2 = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7.5" height="18" rx="1.5"/>
    <rect x="13.5" y="3" width="7.5" height="18" rx="1.5"/>
  </Icon>
);

// ────────────────────────────────────────────────
// Ingredient category icons (filled, simple)
// ────────────────────────────────────────────────
const IconVeg = (p) => (
  <Icon {...p}>
    <path d="M7 13c0-4 2-7 5-7s5 3 5 7-2 8-5 8-5-4-5-8zM12 6V3M10 4l4 0"/>
  </Icon>
);
const IconFruit = (p) => (
  <Icon {...p}>
    <path d="M8 9c-2 0-4 2-4 6s2 7 5 7c1 0 2-1 3-1s2 1 3 1c3 0 5-3 5-7s-2-6-4-6c-1 0-2 .5-3 1-1-.5-2-1-3-1s-2 0-2 0zM12 9c0-3 1-5 3-6"/>
  </Icon>
);
const IconEgg = (p) => (
  <Icon {...p}>
    <path d="M12 21c-4 0-6-3-6-7s2-12 6-12 6 8 6 12-2 7-6 7z"/>
  </Icon>
);
const IconDairy = (p) => (
  <Icon {...p}>
    <path d="M9 3h6v3l1.5 4.5V20a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-9.5L9 6V3zM7.5 10.5h9"/>
  </Icon>
);
const IconBread = (p) => (
  <Icon {...p}>
    <path d="M4 13c-1-3 1-6 4-6h8c3 0 5 3 4 6-.5 1.5-2 2-3 2v3a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-3c-1 0-2.5-.5-3-2zM8 11v2M12 11v2M16 11v2"/>
  </Icon>
);
const IconGrain = (p) => (
  <Icon {...p}>
    <path d="M12 3v18M9 6c-2 0-3 1-3 3s1 3 3 3M15 6c2 0 3 1 3 3s-1 3-3 3M9 12c-2 0-3 1-3 3s1 3 3 3M15 12c2 0 3 1 3 3s-1 3-3 3"/>
  </Icon>
);
const IconSpice = (p) => (
  <Icon {...p}>
    <path d="M8 8h8v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3zM7 8h10v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8zM10 6h.01M12 6h.01M14 6h.01"/>
  </Icon>
);
const IconHerb = (p) => (
  <Icon {...p}>
    <path d="M12 22V10M12 10c-3 0-6-2-6-7 5 0 6 3 6 7zM12 10c3 0 6-2 6-7-5 0-6 3-6 7z"/>
  </Icon>
);
const IconSweet = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4"/>
    <path d="M8 12c-2 0-4-1-4-3 0-1.5 2-1 2-1l2 2M8 12c-2 0-4 1-4 3 0 1.5 2 1 2 1l2-2M16 12c2 0 4-1 4-3 0-1.5-2-1-2-1l-2 2M16 12c2 0 4 1 4 3 0 1.5-2 1-2 1l-2-2"/>
  </Icon>
);
const IconMeat = (p) => (
  <Icon {...p}>
    <path d="M5 13a7 7 0 0 1 14 0c0 4-3 6-7 6S5 17 5 13zM19 13l3-1M9 13a3 3 0 0 1 6 0"/>
  </Icon>
);
const IconFish = (p) => (
  <Icon {...p}>
    <path d="M3 12c4-6 9-6 13-3M16 9c3-2 5-1 5 3s-2 5-5 3M16 15c-4 3-9 3-13-3M17 12h.01"/>
  </Icon>
);
const IconCheese = (p) => (
  <Icon {...p}>
    <path d="M3 16l9-10 9 6v4H3zM7 13h.01M11 14h.01M15 13h.01"/>
  </Icon>
);
const IconDrop = (p) => (
  <Icon {...p}>
    <path d="M12 3c-2 4-6 7-6 11a6 6 0 0 0 12 0c0-4-4-7-6-11z"/>
  </Icon>
);
const IconBottle = (p) => (
  <Icon {...p}>
    <path d="M10 3h4v3l2 3v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9l2-3V3zM10 14h4"/>
  </Icon>
);
const IconChocolate = (p) => (
  <Icon {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2"/>
    <path d="M5 12h14M12 5v14"/>
  </Icon>
);
const IconCoffee = (p) => (
  <Icon {...p}>
    <path d="M5 8h13v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8zM18 10h2a2 2 0 0 1 0 4h-2M9 4v2M12 3v3M15 4v2"/>
  </Icon>
);
const IconNuts = (p) => (
  <Icon {...p}>
    <path d="M12 3c-3 0-6 2-6 7s3 11 6 11 6-6 6-11-3-7-6-7zM12 6v15"/>
  </Icon>
);

// Legacy key → emoji mapping for backward-compat with old saved recipes
const ING_KEY_EMOJI = {
  chef:'🍽️', veg:'🥕', fruit:'🍎', egg:'🥚', dairy:'🥛',
  cheese:'🧀', bread:'🍞', grain:'🌾', spice:'🧂', herb:'🌿',
  sweet:'🍯', meat:'🥩', fish:'🐟', drop:'🫙', bottle:'🍾',
  chocolate:'🍫', coffee:'☕', nuts:'🥜',
};

// ING_ICONS kept for any legacy references — now emoji-based
const ING_ICONS = {
  chef:       { emoji:'🍽️', label:'כללי' },
  veg:        { emoji:'🥕',  label:'ירק' },
  fruit:      { emoji:'🍎',  label:'פרי' },
  egg:        { emoji:'🥚',  label:'ביצים' },
  dairy:      { emoji:'🥛',  label:'חלב' },
  cheese:     { emoji:'🧀',  label:'גבינה' },
  bread:      { emoji:'🍞',  label:'לחם' },
  grain:      { emoji:'🌾',  label:'קמח / דגנים' },
  spice:      { emoji:'🧂',  label:'תבלין' },
  herb:       { emoji:'🌿',  label:'עשבי תיבול' },
  sweet:      { emoji:'🍯',  label:'מתוק' },
  meat:       { emoji:'🥩',  label:'בשר' },
  fish:       { emoji:'🐟',  label:'דגים' },
  drop:       { emoji:'🫙',  label:'נוזלים' },
  bottle:     { emoji:'🍾',  label:'בקבוק' },
  chocolate:  { emoji:'🍫',  label:'שוקולד' },
  coffee:     { emoji:'☕',  label:'קפה' },
  nuts:       { emoji:'🥜',  label:'אגוזים' },
};

function IngredientIcon({ kind = '🍽️', size = 20 }) {
  const emoji = ING_KEY_EMOJI[kind] || kind || '🍽️';
  return <span style={{ fontSize: Math.round(size * 0.95), lineHeight: 1, display: 'inline-block' }}>{emoji}</span>;
}

Object.assign(window, {
  Icon, IconBack, IconForward, IconHome, IconSearch, IconHeart, IconPlus, IconClose,
  IconClock, IconUsers, IconFire, IconChef, IconFilter, IconDownload, IconUpload,
  IconCheck, IconShare, IconBookmark, IconDots, IconExcel, IconWord,
  IconEdit, IconNote, IconChevronLeft, IconChevronRight, IconImage, IconTrash,
  IconGrid, IconRows, IconColumns2,
  IconVeg, IconFruit, IconEgg, IconDairy, IconBread, IconGrain, IconSpice, IconHerb,
  IconSweet, IconMeat, IconFish, IconCheese, IconDrop, IconBottle, IconChocolate,
  IconCoffee, IconNuts,
  ING_ICONS, ING_KEY_EMOJI, IngredientIcon,
});
