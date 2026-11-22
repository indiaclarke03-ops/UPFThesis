/**
 * Design tokens: the single source of truth for colour, type and motion.
 * CSS custom properties in src/styles/global.css mirror these values.
 * Contrast pairs used for text are checked in src/lib/tokens.test.ts (WCAG AA).
 */
export const color = {
  ink: '#14213D',
  navy: '#1F3864',
  paper: '#F7F5F1',
  paperDeep: '#EFEBE3',
  rule: '#E7E1D6',
  muted: '#5E6472', // secondary text on paper (AA)
  copper: '#B05A2B', // public money / Tier 1: the protagonist
  copperLight: '#E9B48F',
  copperText: '#9A4A1F', // copper for small text on paper (AA)
  otherFood: '#3B6EA5',
  context: '#9AA0A6',
  regVoluntary: '#9ED3CF',
  regBinding: '#0F6E6E',
  night: '#0B1426', // dark hero / presentation
  nightInk: '#E9E4DA',
  nightMuted: '#A9B0C0',
} as const

/** Lenders: four colour-blind-safe hues (Okabe–Ito derived), used everywhere. */
export const LENDERS = ['IFC', 'EBRD', 'EIB', 'IDB Invest'] as const
export type Lender = (typeof LENDERS)[number]
export const lenderColor: Record<Lender, string> = {
  IFC: '#0072B2',
  EBRD: '#B4518F',
  EIB: '#C99A00',
  'IDB Invest': '#009E73',
}
/** Darker variants for small TEXT on paper (WCAG AA ≥ 4.5:1). */
export const lenderText: Record<Lender, string> = {
  IFC: '#005A8C',
  EBRD: '#9A3F78',
  EIB: '#7A5E00',
  'IDB Invest': '#00704F',
}
/** Lighter tints for dark backgrounds. */
export const lenderColorOnDark: Record<Lender, string> = {
  IFC: '#56B4E9',
  EBRD: '#E08DC0',
  EIB: '#F0D050',
  'IDB Invest': '#4CC9A0',
}
export const lenderLong: Record<Lender, string> = {
  IFC: 'International Finance Corporation (World Bank Group)',
  EBRD: 'European Bank for Reconstruction and Development',
  EIB: 'European Investment Bank',
  'IDB Invest': 'IDB Invest (Inter-American Development Bank Group)',
}

/** COI obstruction grade ramp 0→3: light sand to dark oxblood. */
export const gradeColor = ['#E6DCC8', '#D4A373', '#A4483A', '#5C1A1B'] as const
export const gradeLabel = [
  'No evidence found',
  'Interest-group membership',
  'Lobbying or trade-association opposition',
  'Litigation against regulation',
] as const

/** NOVA bands (codebook definitions). */
export const bandColor: Record<string, string> = {
  A: '#B05A2B',
  B: '#D98A55',
  C: '#C9B79C',
  'C/D': '#D8CDBB',
  D: '#E2DBCF',
  E: '#ECE7DD',
}
export const bandLabel: Record<string, string> = {
  A: 'A: NOVA 4 at least 50% of sales',
  B: 'B: NOVA 4 20–50% of sales',
  C: 'C: some NOVA 4, under 20%',
  'C/D': 'C/D: little or no NOVA 4',
  D: 'D: little or no NOVA 4',
  E: 'E: too little information to band',
}

export const incomeColor: Record<string, string> = {
  High: '#5B6B8C',
  Middle: '#B05A2B',
  Low: '#D9A27A',
  Regional: '#9AA0A6',
}

export const font = {
  serif: "'Fraunces Variable', 'Source Serif 4', Georgia, serif",
  sans: "'Inter Variable', 'IBM Plex Sans', system-ui, -apple-system, sans-serif",
}

export const motion = {
  fast: 400,
  base: 550,
  slow: 700,
  ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  d3Ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
}

export const breakpoints = { phone: 640, tablet: 900, desktop: 1200 }
