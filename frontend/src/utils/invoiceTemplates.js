// ============================================
// utils/invoiceTemplates.js — Template & Theme Definitions
// ============================================
// 6 pre-built invoice templates + 8 color themes.
// Each template defines layout style; each theme defines colors.
// Stored in localStorage for persistence.
// ============================================

// ---- COLOR THEMES ----

export const THEMES = [
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    emoji: '🔵',
    colors: {
      primary: '#1e40af',
      primaryLight: '#3b82f6',
      primaryDark: '#1e3a8a',
      accent: '#60a5fa',
      headerBg: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
      headerText: '#ffffff',
      tableBg: '#eff6ff',
      borderColor: '#bfdbfe',
      totalBg: '#1e40af',
    },
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    emoji: '🟣',
    colors: {
      primary: '#6d28d9',
      primaryLight: '#8b5cf6',
      primaryDark: '#5b21b6',
      accent: '#a78bfa',
      headerBg: 'linear-gradient(135deg, #5b21b6, #7c3aed)',
      headerText: '#ffffff',
      tableBg: '#f5f3ff',
      borderColor: '#c4b5fd',
      totalBg: '#6d28d9',
    },
  },
  {
    id: 'emerald-green',
    name: 'Emerald Green',
    emoji: '🟢',
    colors: {
      primary: '#047857',
      primaryLight: '#10b981',
      primaryDark: '#065f46',
      accent: '#34d399',
      headerBg: 'linear-gradient(135deg, #065f46, #059669)',
      headerText: '#ffffff',
      tableBg: '#ecfdf5',
      borderColor: '#a7f3d0',
      totalBg: '#047857',
    },
  },
  {
    id: 'ruby-red',
    name: 'Ruby Red',
    emoji: '🔴',
    colors: {
      primary: '#b91c1c',
      primaryLight: '#ef4444',
      primaryDark: '#991b1b',
      accent: '#f87171',
      headerBg: 'linear-gradient(135deg, #991b1b, #dc2626)',
      headerText: '#ffffff',
      tableBg: '#fef2f2',
      borderColor: '#fecaca',
      totalBg: '#b91c1c',
    },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    emoji: '🟠',
    colors: {
      primary: '#c2410c',
      primaryLight: '#f97316',
      primaryDark: '#9a3412',
      accent: '#fb923c',
      headerBg: 'linear-gradient(135deg, #9a3412, #ea580c)',
      headerText: '#ffffff',
      tableBg: '#fff7ed',
      borderColor: '#fed7aa',
      totalBg: '#c2410c',
    },
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    emoji: '🩷',
    colors: {
      primary: '#be185d',
      primaryLight: '#ec4899',
      primaryDark: '#9d174d',
      accent: '#f472b6',
      headerBg: 'linear-gradient(135deg, #9d174d, #db2777)',
      headerText: '#ffffff',
      tableBg: '#fdf2f8',
      borderColor: '#fbcfe8',
      totalBg: '#be185d',
    },
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    emoji: '⚫',
    colors: {
      primary: '#1f2937',
      primaryLight: '#4b5563',
      primaryDark: '#111827',
      accent: '#6b7280',
      headerBg: 'linear-gradient(135deg, #111827, #374151)',
      headerText: '#ffffff',
      tableBg: '#f3f4f6',
      borderColor: '#d1d5db',
      totalBg: '#1f2937',
    },
  },
  {
    id: 'teal-breeze',
    name: 'Teal Breeze',
    emoji: '🌊',
    colors: {
      primary: '#0f766e',
      primaryLight: '#14b8a6',
      primaryDark: '#115e59',
      accent: '#2dd4bf',
      headerBg: 'linear-gradient(135deg, #115e59, #0d9488)',
      headerText: '#ffffff',
      tableBg: '#f0fdfa',
      borderColor: '#99f6e4',
      totalBg: '#0f766e',
    },
  },
  {
    id: 'coral-blush',
    name: 'Coral Blush',
    emoji: '🍑',
    colors: {
      primary: '#e11d48',
      primaryLight: '#f43f5e',
      primaryDark: '#be123c',
      accent: '#fb7185',
      headerBg: 'linear-gradient(135deg, #be123c, #e11d48)',
      headerText: '#ffffff',
      tableBg: '#fff1f2',
      borderColor: '#fecdd3',
      totalBg: '#e11d48',
    },
  },
  {
    id: 'slate-gray',
    name: 'Slate Gray',
    emoji: '🪨',
    colors: {
      primary: '#334155',
      primaryLight: '#64748b',
      primaryDark: '#0f172a',
      accent: '#94a3b8',
      headerBg: 'linear-gradient(135deg, #0f172a, #334155)',
      headerText: '#ffffff',
      tableBg: '#f8fafc',
      borderColor: '#cbd5e1',
      totalBg: '#334155',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    emoji: '🌲',
    colors: {
      primary: '#15803d',
      primaryLight: '#22c55e',
      primaryDark: '#14532d',
      accent: '#4ade80',
      headerBg: 'linear-gradient(135deg, #14532d, #166534)',
      headerText: '#ffffff',
      tableBg: '#f0fdf4',
      borderColor: '#bbf7d0',
      totalBg: '#15803d',
    },
  },
  {
    id: 'gold-black',
    name: 'Gold & Black',
    emoji: '🪙',
    colors: {
      primary: '#92400e',
      primaryLight: '#d97706',
      primaryDark: '#78350f',
      accent: '#fbbf24',
      headerBg: 'linear-gradient(135deg, #1c1917, #292524)',
      headerText: '#fbbf24',
      tableBg: '#fffbeb',
      borderColor: '#fde68a',
      totalBg: '#78350f',
    },
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Dream',
    emoji: '🪻',
    colors: {
      primary: '#7e22ce',
      primaryLight: '#a855f7',
      primaryDark: '#581c87',
      accent: '#c084fc',
      headerBg: 'linear-gradient(135deg, #a855f7, #d8b4fe)',
      headerText: '#ffffff',
      tableBg: '#faf5ff',
      borderColor: '#e9d5ff',
      totalBg: '#7e22ce',
    },
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    emoji: '🌿',
    colors: {
      primary: '#059669',
      primaryLight: '#34d399',
      primaryDark: '#064e3b',
      accent: '#6ee7b7',
      headerBg: 'linear-gradient(135deg, #10b981, #6ee7b7)',
      headerText: '#064e3b',
      tableBg: '#f0fdf4',
      borderColor: '#a7f3d0',
      totalBg: '#059669',
    },
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    emoji: '⚡',
    colors: {
      primary: '#ec4899',
      primaryLight: '#f472b6',
      primaryDark: '#831843',
      accent: '#06b6d4',
      headerBg: 'linear-gradient(135deg, #111827, #374151)',
      headerText: '#22d3ee',
      tableBg: '#1f2937',
      borderColor: '#374151',
      totalBg: '#ec4899',
    },
  },
  {
    id: 'crimson-black',
    name: 'Crimson Black',
    emoji: '🩸',
    colors: {
      primary: '#991b1b',
      primaryLight: '#dc2626',
      primaryDark: '#450a0a',
      accent: '#ef4444',
      headerBg: 'linear-gradient(135deg, #000000, #450a0a)',
      headerText: '#ffffff',
      tableBg: '#fef2f2',
      borderColor: '#fca5a5',
      totalBg: '#991b1b',
    },
  },
  {
    id: 'mustard-yellow',
    name: 'Mustard Yellow',
    emoji: '🌻',
    colors: {
      primary: '#b45309',
      primaryLight: '#d97706',
      primaryDark: '#78350f',
      accent: '#f59e0b',
      headerBg: 'linear-gradient(135deg, #d97706, #fcd34d)',
      headerText: '#78350f',
      tableBg: '#fffbeb',
      borderColor: '#fde68a',
      totalBg: '#b45309',
    },
  },
];

// ---- TEMPLATE DEFINITIONS ----

export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional professional layout with gradient header',
    icon: '📄',
    badge: 'Default',
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, spacious design with a colored side accent',
    icon: '✨',
    badge: null,
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'Large header block with bold typography',
    icon: '💪',
    badge: 'Popular',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Thin borders with refined, sophisticated feel',
    icon: '🎩',
    badge: null,
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Dense layout optimized for brevity',
    icon: '📋',
    badge: null,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Vibrant accents with a unique visual style',
    icon: '🎨',
    badge: 'New',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, corporate, structured with clear dividing lines',
    icon: '💼',
    badge: null,
  },
  {
    id: 'geometric',
    name: 'Geometric',
    description: 'Modern shapes and structured blocks',
    icon: '📐',
    badge: null,
  },
  {
    id: 'startup',
    name: 'Startup',
    description: 'Playful layout with soft shadows and rounded elements',
    icon: '🚀',
    badge: null,
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Sharp high-contrast black and white style',
    icon: '🎹',
    badge: null,
  },
  {
    id: 'receipt',
    name: 'POS Receipt',
    description: 'Looks like a classic thermal printer receipt',
    icon: '🧾',
    badge: 'New',
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    description: 'Large typography and soft rounded cards',
    icon: '🛋️',
    badge: null,
  },
  {
    id: 'blocky',
    name: 'Blocky',
    description: 'Grid-based design with solid color blocks',
    icon: '🧱',
    badge: null,
  },
  {
    id: 'elegant-serif',
    name: 'Elegant Serif',
    description: 'Traditional editorial feel using serif fonts',
    icon: '🖋️',
    badge: null,
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Dark base styling with bright neon accents',
    icon: '🛸',
    badge: null,
  },
  {
    id: 'premium-gold',
    name: 'Royal Gold (Premium)',
    description: 'Luxurious gold accents with deep elegant styling',
    icon: '👑',
    badge: 'Premium',
    isPremium: true,
    price: 10
  },
  {
    id: 'premium-glass',
    name: 'Glassmorphism (Premium)',
    description: 'Stunning modern frosted glass effect',
    icon: '🪞',
    badge: 'Premium',
    isPremium: true,
    price: 10
  },
  {
    id: 'premium-corporate',
    name: 'Enterprise Pro (Premium)',
    description: 'Ultra-professional, data-heavy enterprise layout',
    icon: '🏢',
    badge: 'Premium',
    isPremium: true,
    price: 10
  },
  {
    id: 'premium-wave',
    name: 'Ocean Wave (Premium)',
    description: 'Beautiful flowing wave graphics for header and footer',
    icon: '🌊',
    badge: 'Premium',
    isPremium: true,
    price: 10
  },
  {
    id: 'premium-retro',
    name: 'Retro Pop (Premium)',
    description: 'Funky 80s inspired vivid design with bold contrasts',
    icon: '📼',
    badge: 'Premium',
    isPremium: true,
    price: 10
  },
];

// ---- PERSISTENCE HELPERS ----

const STORAGE_KEY = 'frellancer_invoice_prefs';

export const getStoredPrefs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { templateId: 'classic', themeId: 'ocean-blue' };
};

export const savePrefs = (templateId, themeId) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ templateId, themeId }));
  } catch { /* ignore */ }
};

export const getThemeById = (id) =>
  THEMES.find((t) => t.id === id) || THEMES[0];

export const getTemplateById = (id) =>
  TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
