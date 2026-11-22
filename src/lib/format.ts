import { format } from 'd3'

const f1 = format(',.1f')
const f0 = format(',.0f')

/** US$m with one decimal: "US$1,027.7m" */
export const usdM = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : `US$${digits === 0 ? f0(v) : f1(v)}m`

/** Plain number with thousands separator, one decimal. */
export const num1 = (v: number | null | undefined) => (v == null ? '—' : f1(v))
export const num0 = (v: number | null | undefined) => (v == null ? '—' : f0(v))

/** Billions from US$m: 6432.6 → "US$6.43bn" */
export const usdBn = (vM: number | null | undefined, digits = 2) =>
  vM == null ? '—' : `US$${(vM / 1000).toFixed(digits)}bn`

/** Compact money for axes: 1500 → "1.5bn", 250 → "250m" */
export const usdAxis = (vM: number) =>
  Math.abs(vM) >= 1000 ? `${format('.2~f')(vM / 1000)}bn` : `${format(',.0f')(vM)}m`

/** Share 0.428 → "42.8%" */
export const pct = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : `${(v * 100).toFixed(digits)}%`

/** Signed with a true minus sign: -0.69 → "−0.69" */
export const signed = (v: number, digits = 2) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}`

export const minus = (s: string) => s.replace(/-/g, '−')

export const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`
