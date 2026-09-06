/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        display: ['PlusJakartaSans_700Bold', 'PlusJakartaSans_600SemiBold', 'System'],
        heading: ['PlusJakartaSans_600SemiBold', 'PlusJakartaSans_500Medium', 'System'],
        sans: ['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'System'],
        body: ['Inter_400Regular', 'System'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Crisp Mint Accent
          600: '#059669', // Emerald Primary
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        surface: {
          light: '#FAF8F5',          // Warm Alabaster canvas
          'light-card': '#FFFFFF',    // Crisp elevated card
          'light-subtle': '#F3EFEA',  // Subtle inputs/chips
          'light-border': '#E7E1D8',  // Soft warm border
          dark: '#0B0F14',           // Rich Obsidian canvas
          'dark-card': '#131A22',     // Obsidian card
          'dark-subtle': '#1B2430',   // Dark input/chip
          'dark-border': '#222D3D',   // Slate border
        },
        slate: {
          350: '#94a3b8f0',
          450: '#94a3b8d0',
          455: '#64748bd0',
          550: '#475569d0',
          955: '#0B0F14',
        },
        gold: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        success: '#10b981',
      }
    },
  },
  plugins: [],
}
