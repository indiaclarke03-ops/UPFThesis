/**
 * Display aggregation only: filters, sums, counts and shares over deals.json.
 * No statistics are estimated here (rule 6). Tested in aggregate.test.ts
 * against the canonical thesis numbers.
 */
import type { Deal, Firm } from './data'
import { LENDERS, type Lender } from './tokens'

export type Scope = 't1' | 'food'

export interface Filters {
  lenders: Lender[] // empty = all
  y0: number
  y1: number
  iso3s: string[] // empty = all; 'REGIONAL' = regional/multi-country deals
  income: string[] // income at approval: High | Middle | Low | Regional
  scope: Scope
  bands: string[]
  binding: 'any' | 'yes' | 'no'
  grades: number[] // COI grade of parent group
  parent: string | null
  q: string
}

export const DEFAULT_FILTERS: Filters = {
  lenders: [],
  y0: 2010,
  y1: 2025,
  iso3s: [],
  income: [],
  scope: 't1',
  bands: [],
  binding: 'any',
  grades: [],
  parent: null,
  q: '',
}

/** Money a deal contributes under the chosen scope (US$m 2024). */
export const money = (d: Deal, scope: Scope = 't1') => (scope === 't1' ? d.t1 ?? 0 : d.food ?? 0)

export const incomeOf = (d: Deal) => d.income ?? 'Regional'

export function filterDeals(deals: Deal[], f: Filters, firmByParent?: Map<string, Firm>): Deal[] {
  const q = f.q.trim().toLowerCase()
  return deals.filter((d) => {
    if (f.scope === 't1' && !d.tier1) return false
    if (f.lenders.length && !f.lenders.includes(d.lender)) return false
    if (d.year == null || d.year < f.y0 || d.year > f.y1) return false
    if (f.iso3s.length) {
      const key = d.iso3 ?? 'REGIONAL'
      if (!f.iso3s.includes(key)) return false
    }
    if (f.income.length && !f.income.includes(incomeOf(d))) return false
    if (f.bands.length && !f.bands.includes(d.band ?? '')) return false
    if (f.binding === 'yes' && d.binding !== 1) return false
    if (f.binding === 'no' && d.binding !== 0) return false
    if (f.parent && d.parent !== f.parent) return false
    if (f.grades.length) {
      const g = d.parent ? firmByParent?.get(d.parent)?.grade : undefined
      if (g == null || !f.grades.includes(g)) return false
    }
    if (q) {
      const hay = `${d.company ?? ''} ${d.parent ?? ''} ${d.country ?? ''} ${d.title ?? ''} ${d.sector ?? ''} ${d.id}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export const sum = (deals: Deal[], scope: Scope = 't1') => deals.reduce((s, d) => s + money(d, scope), 0)

export function sumBy<K extends string>(deals: Deal[], key: (d: Deal) => K | null, scope: Scope = 't1') {
  const m = new Map<K, { usd: number; n: number }>()
  for (const d of deals) {
    const k = key(d)
    if (k == null) continue
    const e = m.get(k) ?? { usd: 0, n: 0 }
    e.usd += money(d, scope)
    e.n += 1
    m.set(k, e)
  }
  return m
}

/** Year × lender matrix for stacked charts. */
export function byYearLender(deals: Deal[], scope: Scope = 't1', y0 = 2010, y1 = 2025) {
  const rows: ({ year: number } & Record<Lender, number>)[] = []
  for (let y = y0; y <= y1; y++) {
    const r = { year: y } as { year: number } & Record<Lender, number>
    for (const l of LENDERS) r[l] = 0
    rows.push(r)
  }
  for (const d of deals) {
    if (d.year == null || d.year < y0 || d.year > y1) continue
    rows[d.year - y0][d.lender] += money(d, scope)
  }
  return rows
}

export function kpis(deals: Deal[], scope: Scope = 't1') {
  const counted = deals.filter((d) => money(d, scope) > 0 || (scope === 't1' && d.tier1))
  return {
    usd: sum(deals, scope),
    deals: counted.length,
    countries: new Set(counted.filter((d) => d.iso3).map((d) => d.iso3)).size,
    parents: new Set(counted.filter((d) => d.parent && money(d, scope) > 0).map((d) => d.parent)).size,
  }
}

/** Screen simulator: money a tobacco-style screen would have caught. */
export function screenCaught(
  deals: Deal[],
  opts: { threshold: 20 | 50; fromYear: number; toYear?: number; lenders?: Lender[] },
) {
  const to = opts.toYear ?? 2025
  const bands = opts.threshold === 20 ? ['A', 'B'] : ['A']
  const pool = deals.filter(
    (d) =>
      d.tier1 &&
      d.year != null &&
      d.year >= opts.fromYear &&
      d.year <= to &&
      (!opts.lenders?.length || opts.lenders.includes(d.lender)),
  )
  const caught = pool.filter((d) => bands.includes(d.band ?? ''))
  return { caught: sum(caught), pool: sum(pool), deals: caught.length, rows: caught }
}

/* --------------------------------------------------------- URL round-trip */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.lenders.length) p.set('lender', f.lenders.join(','))
  if (f.y0 !== DEFAULT_FILTERS.y0) p.set('from', String(f.y0))
  if (f.y1 !== DEFAULT_FILTERS.y1) p.set('to', String(f.y1))
  if (f.iso3s.length) p.set('country', f.iso3s.join(','))
  if (f.income.length) p.set('income', f.income.join(','))
  if (f.scope !== 't1') p.set('scope', f.scope)
  if (f.bands.length) p.set('band', f.bands.join(','))
  if (f.binding !== 'any') p.set('binding', f.binding)
  if (f.grades.length) p.set('grade', f.grades.join(','))
  if (f.parent) p.set('parent', f.parent)
  if (f.q) p.set('q', f.q)
  return p
}

export function paramsToFilters(p: URLSearchParams): Filters {
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(',').filter(Boolean) : [])
  const scope = p.get('scope') === 'food' ? 'food' : 't1'
  const b = p.get('binding')
  return {
    lenders: list('lender').filter((l): l is Lender => (LENDERS as readonly string[]).includes(l)),
    y0: Number(p.get('from')) || DEFAULT_FILTERS.y0,
    y1: Number(p.get('to')) || DEFAULT_FILTERS.y1,
    iso3s: list('country'),
    income: list('income'),
    scope,
    bands: list('band'),
    binding: b === 'yes' || b === 'no' ? b : 'any',
    grades: list('grade').map(Number).filter((n) => !Number.isNaN(n)),
    parent: p.get('parent'),
    q: p.get('q') ?? '',
  }
}

/** Build an explorer deep link, e.g. exploreHref({ lenders: ['IFC'] }). */
export function exploreHref(partial: Partial<Filters> = {}): string {
  const qs = filtersToParams({ ...DEFAULT_FILTERS, ...partial }).toString()
  return `/explore${qs ? `?${qs}` : ''}`
}
