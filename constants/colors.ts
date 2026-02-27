const Colors = {
  primary: '#020617', // Very deep navy background
  accent: '#06B6D4', // Electric Cyan
  accentLight: 'rgba(6, 182, 212, 0.1)',
  secondary: '#6366F1', // Vivid Indigo
  secondaryLight: 'rgba(99, 102, 241, 0.1)',
  success: '#10B981', // Neon Emerald
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#FBBF24', // Rich Amber
  warningLight: 'rgba(251, 191, 36, 0.15)',
  error: '#F43F5E', // Bright Rose
  errorLight: 'rgba(244, 63, 94, 0.15)',

  // Surfaces & Layout
  background: '#020617', // Deepest Slate/Navy
  surface: '#0F172A', // Elevated Navy
  card: '#0F172A',
  cardBorder: 'rgba(255, 255, 255, 0.06)', // Very subtle white border to pop cards from the deep background

  // Text
  text: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textTertiary: '#64748B', // Slate 500

  // Inputs
  inputBg: 'rgba(255, 255, 255, 0.03)',
  inputBorder: 'rgba(255, 255, 255, 0.08)',
  divider: 'rgba(255, 255, 255, 0.05)',

  // Tabs
  tabActive: '#06B6D4',
  tabInactive: '#64748B',
  overlay: 'rgba(2, 6, 23, 0.8)', // Deep overlay

  // Extraordinary Gradients (used sparingly on CTA buttons and FABs)
  gradients: {
    primary: ['#020617', '#0F172A'],
    accent: ['#06B6D4', '#3B82F6'], // Cyan to Blue glow
    success: ['#10B981', '#059669'],
    warning: ['#FBBF24', '#D97706'],
    purple: ['#6366F1', '#4F46E5'],
    glass: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)'],
    dark: ['#0F172A', '#020617'],
    background: ['#020617', '#0F172A'],
  },

  light: {
    text: '#F8FAFC',
    background: '#020617',
    tint: '#06B6D4',
    tabIconDefault: '#64748B',
    tabIconSelected: '#06B6D4',
  },
};

export default Colors;
