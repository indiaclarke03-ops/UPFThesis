/**
 * "Ask the data": deterministic, pre-written questions. Each handler returns
 * explorer filters plus a plain-language answer computed from the public data.
 *
 * The interface is deliberately the shape an LLM assistant could later sit
 * behind (free text in, { filters, answer } out). There is NO network call and
 * NO API key here: every answer is a sum, count or share of deals.json.
 */
import { DEFAULT_FILTERS, filterDeals, sum, sumBy, type Filters } from '../lib/aggregate'
import { countryName, parentName, type SiteData } from '../lib/data'
import { pct, usdBn, usdM } from '../lib/format'

export interface AskResult {
  filters: Partial<Filters>
  answer: string
  /** optional keys the linked views may highlight */
  highlight?: { lender?: string; parent?: string; iso3?: string; parents?: string[] }
}

export type AskHandler = (q: string, data: SiteData) => AskResult

export interface AskQuestion {
  id: string
  q: string
  run: (data: SiteData) => AskResult
}

const T1 = (d: SiteData, f: Partial<Filters> = {}) => filterDeals(d.deals, { ...DEFAULT_FILTERS, ...f }, d.firmByParent)
const top = <K extends string>(m: Map<K, { usd: number; n: number }>) => [...m.entries()].sort((a, b) => b[1].usd - a[1].usd)

export const QUESTIONS: AskQuestion[] = [
  {
    id: 'litigated-lender',
    q: 'Which lender gave the most to firms that litigated?',
    run: (d) => {
      const deals = T1(d, { grades: [3] })
      const [[l, v]] = top(sumBy(deals, (x) => x.lender))
      return {
        filters: { grades: [3] },
        answer: `${l}: ${usdM(v.usd)} across ${v.n} deals to groups that litigated against health regulation (grade 3), out of ${usdM(sum(deals))} in total to such groups.`,
        highlight: { lender: l },
      }
    },
  },
  {
    id: 'ssb-tax',
    q: 'How much went to countries after they adopted a sugary-drink tax?',
    run: (d) => {
      const first = new Map<string, number>()
      for (const e of d.regulation)
        if (e.domain === 'Sugary drink tax' && e.strength === 'Binding' && e.year != null)
          first.set(e.iso3, Math.min(first.get(e.iso3) ?? 9999, e.year))
      const all = T1(d)
      const after = all.filter((x) => x.iso3 && first.has(x.iso3) && x.year != null && x.year >= first.get(x.iso3)!)
      const countries = [...new Set(after.map((x) => x.iso3!))]
      return {
        filters: { iso3s: countries },
        answer: `${usdM(sum(after))} (${pct(sum(after) / sum(all))} of Tier 1 money) in ${after.length} deals was approved in ${countries.length} countries after their sugary-drink tax was in force. The filter shows all Tier 1 deals in those countries, before and after.`,
      }
    },
  },
  {
    id: 'multi-country',
    q: 'Which firms got money in more than three countries?',
    run: (d) => {
      const fs = d.firms.filter((f) => f.iso3s.length > 3).sort((a, b) => b.iso3s.length - a.iso3s.length)
      return {
        filters: {},
        answer: fs.length
          ? `${fs.map((f) => `${parentName(f.parent)} (${f.iso3s.length} countries, ${usdM(f.t1, 0)})`).join('; ')}.`
          : 'No parent group received Tier 1 money in more than three countries.',
        highlight: { parents: fs.map((f) => f.parent) },
      }
    },
  },
  {
    id: 'top-country',
    q: 'Which country received the most?',
    run: (d) => {
      const [[iso, v]] = top(sumBy(T1(d), (x) => x.iso3))
      return {
        filters: { iso3s: [iso] },
        answer: `${countryName(d.countryByIso.get(iso)?.name)}: ${usdM(v.usd)} in ${v.n} Tier 1 deals. A further US$250m regional Coca-Cola İçecek deal is counted as regional, not as Türkiye.`,
        highlight: { iso3: iso },
      }
    },
  },
  {
    id: 'coi',
    q: 'How much went to groups documented as lobbying or litigating?',
    run: (d) => {
      const all = sum(T1(d))
      const g = T1(d, { grades: [2, 3] })
      const noY = g.filter((x) => x.parent !== 'Yildiz Holding (Ulker/pladis)')
      return {
        filters: { grades: [2, 3] },
        answer: `${usdBn(sum(g))}: ${pct(sum(g) / all)} of Tier 1 money (${pct(sum(noY) / all)} without Yıldız, whose grade rests on its UK arm pladis).`,
      }
    },
  },
  {
    id: 'idb',
    q: 'What did IDB Invest fund, and is any of it visible by name?',
    run: (d) => {
      const g = T1(d, { lenders: ['IDB Invest'] })
      return {
        filters: { lenders: ['IDB Invest'] },
        answer: `${usdM(sum(g))} in ${g.length} Tier 1 deals. None of the borrowers is named on the list of 30 global UPF companies, so IDB Invest’s disclosure gap is undefined.`,
        highlight: { lender: 'IDB Invest' },
      }
    },
  },
  {
    id: 'low-income',
    q: 'How much went to low-income countries?',
    run: (d) => {
      const g = T1(d, { income: ['Low'] })
      const mid = T1(d, { income: ['Middle'] })
      return {
        filters: { income: ['Low'] },
        answer: `${usdM(sum(g))} in ${g.length} deals to countries that were low-income at approval, against ${usdBn(sum(mid))} to middle-income countries. The money goes to middle-income markets.`,
      }
    },
  },
  {
    id: 'binding',
    q: 'How much was approved where binding UPF rules were already in force?',
    run: (d) => {
      const withC = T1(d).filter((x) => x.iso3 && x.measure === 'core')
      const yes = withC.filter((x) => x.binding === 1)
      return {
        filters: { binding: 'yes' },
        answer: `${yes.length} of ${withC.length} core Tier 1 deals with a country (${pct(yes.length / withC.length, 0)}) were approved where a binding UPF rule was already in force: ${usdM(sum(yes))}.`,
      }
    },
  },
  {
    id: 'peak-year',
    q: 'Which year saw the most Tier 1 lending?',
    run: (d) => {
      const [[y, v]] = top(sumBy(T1(d), (x) => String(x.year)))
      return {
        filters: { y0: Number(y), y1: Number(y) },
        answer: `${y}: ${usdM(v.usd)} in ${v.n} deals.`,
      }
    },
  },
  {
    id: 'band-a',
    q: 'How much would a strict 50% screen have caught?',
    run: (d) => {
      const a = T1(d, { bands: ['A'] })
      return {
        filters: { bands: ['A'] },
        answer: `About ${usdBn(sum(a))} in ${a.length} band A deals (NOVA 4 at least 50% of sales). At the IFC’s 20% threshold, a screen would catch all ${usdBn(sum(T1(d)))}.`,
      }
    },
  },
]

/** Free-text entry point (deterministic keyword match today; an LLM later). */
export const ask: AskHandler = (q, data) => {
  const s = q.toLowerCase()
  const hit = QUESTIONS.find((x) => x.q.toLowerCase() === s) ?? QUESTIONS.find((x) => s.split(/\W+/).filter((w) => w.length > 4).some((w) => x.q.toLowerCase().includes(w)))
  return hit ? hit.run(data) : { filters: {}, answer: 'No pre-written answer matches that question yet. Try one of the chips.' }
}
