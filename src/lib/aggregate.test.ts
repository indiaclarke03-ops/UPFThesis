/**
 * The front-end aggregation must reproduce the canonical thesis numbers
 * (build prompt §4) from deals.json alone.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, byYearLender, filterDeals, kpis, paramsToFilters, filtersToParams, screenCaught, sum, sumBy } from './aggregate'
import type { Deal, Firm } from './data'

const load = <T>(f: string): T => JSON.parse(readFileSync(resolve(__dirname, '../../public/data', f), 'utf8'))
const deals = load<Deal[]>('deals.json')
const firms = load<Firm[]>('firms.json')
const firmByParent = new Map(firms.map((f) => [f.parent, f]))
const t1 = filterDeals(deals, DEFAULT_FILTERS)
const close = (a: number, b: number, tol = 0.1) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol + 1e-9)

describe('canonical numbers from deals.json', () => {
  it('Tier 1 totals', () => {
    expect(t1.length).toBe(153)
    close(sum(t1), 6432.6)
    close(t1.reduce((s, d) => s + (d.sc_t1 ?? 0), 0), 135.3)
  })
  it('by lender', () => {
    const m = sumBy(t1, (d) => d.lender)
    close(m.get('IFC')!.usd, 2501.3)
    close(m.get('EBRD')!.usd, 2428.9)
    close(m.get('EIB')!.usd, 1116.9)
    close(m.get('IDB Invest')!.usd, 385.5)
  })
  it('by period', () => {
    const per = (y: number) => (y <= 2013 ? 'a' : y <= 2017 ? 'b' : y <= 2021 ? 'c' : 'd')
    const m = sumBy(t1, (d) => per(d.year!))
    close(m.get('a')!.usd, 1070.3)
    expect(m.get('a')!.n).toBe(30)
    close(m.get('b')!.usd, 1859.1)
    close(m.get('c')!.usd, 1290.3)
    close(m.get('d')!.usd, 2212.9)
    expect(m.get('d')!.n).toBe(50)
  })
  it('by income at approval', () => {
    const m = sumBy(t1, (d) => d.income ?? 'Regional')
    close(m.get('Middle')!.usd, 4270.5)
    close(m.get('High')!.usd, 1640.7)
    close(m.get('Low')!.usd, 96.8)
    close(m.get('Regional')!.usd, 424.6)
  })
  it('top countries', () => {
    const m = sumBy(t1, (d) => d.iso3)
    close(m.get('TUR')!.usd, 1027.9)
    close(m.get('EGY')!.usd, 426.1)
    close(m.get('BGD')!.usd, 403.5)
    close(m.get('SRB')!.usd, 342.8)
    close(m.get('POL')!.usd, 330.9)
  })
  it('kpis', () => {
    const k = kpis(t1)
    expect(k.countries).toBe(45)
    expect(k.parents).toBe(82)
  })
  it('year × lender sums to the total', () => {
    const rows = byYearLender(t1)
    const tot = rows.reduce((s, r) => s + r.IFC + r.EBRD + r.EIB + r['IDB Invest'], 0)
    close(tot, 6432.6)
  })
  it('screen simulator', () => {
    close(screenCaught(deals, { threshold: 20, fromYear: 2010 }).caught, 6432.6)
    close(screenCaught(deals, { threshold: 50, fromYear: 2010 }).caught, 4270.6)
  })
  it('COI share 42.8% and 32.2% without Yıldız', () => {
    const tot = sum(t1)
    const coi = sum(t1.filter((d) => d.parent && firmByParent.get(d.parent)?.coi))
    const noY = sum(t1.filter((d) => d.parent && d.parent !== 'Yildiz Holding (Ulker/pladis)' && firmByParent.get(d.parent)?.coi))
    close((coi / tot) * 100, 42.8)
    close((noY / tot) * 100, 32.2)
  })
  it('binding share 52%', () => {
    const c = t1.filter((d) => d.iso3 && d.measure === 'core')
    close((c.filter((d) => d.binding === 1).length / c.length) * 100, 52.1)
  })
  it('URL filters round-trip', () => {
    const f = { ...DEFAULT_FILTERS, lenders: ['IFC' as const], y0: 2014, grades: [2, 3], q: 'cola' }
    expect(paramsToFilters(filtersToParams(f))).toEqual(f)
  })
})
