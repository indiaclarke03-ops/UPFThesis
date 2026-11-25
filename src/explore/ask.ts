/**
 * "Ask the data": deterministic, pre-written questions. Each handler returns
 * explorer filters plus a plain-language answer computed from the public data.
 *
 * The interface is deliberately the shape an LLM assistant could later sit
 * behind (free text in, { filters, answer } out). There is NO network call and
 * NO API key here: every answer is a sum, count or share of deals.json.
 */
import { DEFAULT_FILTERS, filterDeals, screenCaught, sum, sumBy, type Filters } from '../lib/aggregate'
import { countryName, parentName, type SiteData } from '../lib/data'
import { pct, usdBn, usdM } from '../lib/format'

export interface AskResult {
  filters: Partial<Filters>
  answer: string
  /** optional keys the linked views may highlight */
  highlight?: { lender?: string; parent?: string; iso3?: string; parents?: string[] }
}

export type AskHandler = (q: string, data: SiteData) => AskResult

export const ASK_GROUPS = ['Money & lenders', 'Over time', 'Countries & regulation', 'Firms & conflict of interest', 'Visibility & screening'] as const
export type AskGroup = (typeof ASK_GROUPS)[number]

export interface AskQuestion {
  id: string
  group: AskGroup
  q: string
  run: (data: SiteData) => AskResult
}

const T1 = (d: SiteData, f: Partial<Filters> = {}) => filterDeals(d.deals, { ...DEFAULT_FILTERS, ...f }, d.firmByParent)
const top = <K extends string>(m: Map<K, { usd: number; n: number }>) => [...m.entries()].sort((a, b) => b[1].usd - a[1].usd)

export const QUESTIONS: AskQuestion[] = [
  {
    id: 'litigated-lender',
    group: 'Firms & conflict of interest',
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
    group: 'Countries & regulation',
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
    group: 'Firms & conflict of interest',
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
    group: 'Countries & regulation',
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
    group: 'Firms & conflict of interest',
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
    group: 'Visibility & screening',
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
    group: 'Countries & regulation',
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
    group: 'Countries & regulation',
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
    group: 'Over time',
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
    group: 'Visibility & screening',
    q: 'How much would a strict 50% screen have caught?',
    run: (d) => {
      const a = T1(d, { bands: ['A'] })
      return {
        filters: { bands: ['A'] },
        answer: `About ${usdBn(sum(a))} in ${a.length} band A deals (NOVA 4 at least 50% of sales). At the IFC’s 20% threshold, a screen would catch all ${usdBn(sum(T1(d)))}.`,
      }
    },
  },
  /* ------------------------------------------------------------ added */
  {
    id: 'by-lender',
    group: 'Money & lenders',
    q: 'How much did each lender give?',
    run: (d) => {
      const all = T1(d)
      const rows = top(sumBy(all, (x) => x.lender))
      return {
        filters: {},
        answer: rows.map(([l, v]) => `${l} ${usdM(v.usd, 0)} (${pct(v.usd / sum(all), 0)}, ${v.n} deals)`).join('; ') + `. Together: at least ${usdBn(sum(all))}.`,
      }
    },
  },
  {
    id: 'biggest-deal',
    group: 'Money & lenders',
    q: 'What was the biggest single Tier 1 deal?',
    run: (d) => {
      const x = [...T1(d)].sort((a, b) => (b.t1 ?? 0) - (a.t1 ?? 0))[0]
      return {
        filters: { q: x.id },
        answer: `${x.lender} ${x.year}: ${usdM(x.t1)} to ${x.company ?? parentName(x.parent)} (${parentName(x.parent)}), ${x.country ?? 'regional'}. The table shows that deal; clear the search to see all.`,
        highlight: { lender: x.lender, parent: x.parent ?? undefined },
      }
    },
  },
  {
    id: 'median-deal',
    group: 'Money & lenders',
    q: 'How big is a typical Tier 1 deal?',
    run: (d) => {
      const v = T1(d).filter((x) => x.measure === 'core' && (x.t1 ?? 0) > 0).map((x) => x.t1!).sort((a, b) => a - b)
      const med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2
      return { filters: {}, answer: `The median core Tier 1 deal is ${usdM(med)}; the largest is ${usdM(v[v.length - 1])} and the smallest ${usdM(v[0])}. A few large deals carry much of the total.` }
    },
  },
  {
    id: 'supply-chain',
    group: 'Money & lenders',
    q: 'How much supply-chain finance went to UPF firms?',
    run: (d) => {
      const sc = d.deals.filter((x) => x.supply_chain)
      return {
        filters: { iso3s: ['MEX'] },
        answer: `${usdM(sc.reduce((s2, x) => s2 + (x.sc_t1 ?? 0), 0))} in ${sc.length} supply-chain finance deals (${sc.map((x) => `${x.company ?? parentName(x.parent)} ${x.year}`).join('; ')}). It is a separate measure, not part of the US$6.43bn.`,
      }
    },
  },
  {
    id: 'growth',
    group: 'Over time',
    q: 'Has lending grown since 2010?',
    run: (d) => {
      const a = sum(T1(d, { y0: 2010, y1: 2013 }))
      const b = sum(T1(d, { y0: 2022, y1: 2025 }))
      return {
        filters: { y0: 2022, y1: 2025 },
        answer: `Yes: from ${usdBn(a)} in 2010–13 to ${usdBn(b)} in 2022–25, about ${(b / a).toFixed(1)}× as much. Dropping the 2024 Coca-Cola İçecek deal, 2022–25 is still ${usdBn(d.results.computed.period_2022_25_without_cci)}.`,
      }
    },
  },
  {
    id: 'since-2020',
    group: 'Over time',
    q: 'How much has been committed since 2020?',
    run: (d) => {
      const g = T1(d, { y0: 2020 })
      return { filters: { y0: 2020 }, answer: `${usdBn(sum(g))} in ${g.length} Tier 1 deals from 2020 to 2025: ${pct(sum(g) / sum(T1(d)), 0)} of the 16-year total in six years.` }
    },
  },
  {
    id: 'region-lac',
    group: 'Countries & regulation',
    q: 'How much went to Latin America and the Caribbean?',
    run: (d) => regionAnswer(d, 'Latin America & Caribbean'),
  },
  {
    id: 'region-ssa',
    group: 'Countries & regulation',
    q: 'How much went to Sub-Saharan Africa?',
    run: (d) => regionAnswer(d, 'Sub-Saharan Africa'),
  },
  {
    id: 'region-eca',
    group: 'Countries & regulation',
    q: 'How much went to Europe and Central Asia?',
    run: (d) => regionAnswer(d, 'Europe & Central Asia'),
  },
  {
    id: 'fop-label',
    group: 'Countries & regulation',
    q: 'How much went to countries after they adopted front-of-pack labels?',
    run: (d) => afterRule(d, 'Front-of-pack label', 'front-of-pack label'),
  },
  {
    id: 'marketing',
    group: 'Countries & regulation',
    q: 'How much went to countries after they restricted marketing to children?',
    run: (d) => afterRule(d, 'Marketing to children', 'limit on marketing to children'),
  },
  {
    id: 'top-ten',
    group: 'Firms & conflict of interest',
    q: 'Who are the ten biggest recipients?',
    run: (d) => {
      const c = d.results.computed
      return {
        filters: {},
        answer: `${c.top_parents.map((p, i) => `${i + 1}. ${parentName(p.parent)} ${usdM(p.usd_m, 0)}`).join('; ')}. Together they took ${pct(c.top10_share)} of Tier 1 money.`,
        highlight: { parents: c.top_parents.map((p) => p.parent) },
      }
    },
  },
  {
    id: 'coca-cola',
    group: 'Firms & conflict of interest',
    q: 'How much went to the Coca-Cola system?',
    run: (d) => {
      const g = T1(d, { parent: 'Coca-Cola system' })
      const cs = [...new Set(g.map((x) => x.country).filter(Boolean))]
      return {
        filters: { parent: 'Coca-Cola system' },
        answer: `${usdM(sum(g))} (${pct(sum(g) / sum(T1(d)))} of Tier 1 money) in ${g.length} deals to Coca-Cola bottlers in ${cs.length} countries or regions. The group is graded 3: litigation against health regulation.`,
        highlight: { parent: 'Coca-Cola system' },
      }
    },
  },
  {
    id: 'grade-zero',
    group: 'Firms & conflict of interest',
    q: 'How much went to groups with no evidence of obstruction found?',
    run: (d) => {
      const g = T1(d, { grades: [0] })
      const n = d.firms.filter((f) => f.grade === 0).length
      return {
        filters: { grades: [0] },
        answer: `${usdBn(sum(g))} to ${n} groups graded 0. Grade 0 means no evidence was found, not that there was no obstruction: many are regional firms that were not individually researched.`,
      }
    },
  },
  {
    id: 'multi-lender',
    group: 'Firms & conflict of interest',
    q: 'Which firms got money from more than one lender?',
    run: (d) => {
      const fs = d.firms.filter((f) => Object.keys(f.lenders).length > 1).sort((a, b) => b.t1 - a.t1)
      return {
        filters: {},
        answer: fs.length ? `${fs.length} groups: ${fs.map((f) => `${parentName(f.parent)} (${Object.keys(f.lenders).join(' + ')})`).join('; ')}.` : 'None.',
        highlight: { parents: fs.map((f) => f.parent) },
      }
    },
  },
  {
    id: 'named-list',
    group: 'Visibility & screening',
    q: 'How much went to the big global UPF companies?',
    run: (d) => {
      const c = d.results.computed
      return {
        filters: {},
        answer: `About ${pct(c.named_list_share, 0)} (${usdM(c.h1.All.m1b, 0)}) went to groups on the list of 30 global UPF companies, counting their subsidiaries. The other ${pct(1 - c.named_list_share, 0)} went to regional and national firms that name-based screening would miss.`,
      }
    },
  },
  {
    id: 'screen-2015',
    group: 'Visibility & screening',
    q: 'What would a tobacco-style screen adopted in 2015 have caught?',
    run: (d) => {
      const r20 = screenCaught(d.deals, { threshold: 20, fromYear: 2015 })
      const r50 = screenCaught(d.deals, { threshold: 50, fromYear: 2015 })
      return {
        filters: { y0: 2015 },
        answer: `${usdBn(r20.caught)} at the 20% threshold (every Tier 1 deal from 2015), or about ${usdBn(r50.caught)} at a strict 50% threshold. An illustration of scale, not a forecast.`,
      }
    },
  },
]

function regionAnswer(d: SiteData, region: string): AskResult {
  const isos = d.countries.filter((c) => c.region === region && c.t1 > 0).map((c) => c.iso3)
  const g = T1(d, { iso3s: isos })
  const topC = top(sumBy(g, (x) => x.iso3))[0]
  return {
    filters: { iso3s: isos },
    answer: isos.length
      ? `${usdM(sum(g))} (${pct(sum(g) / sum(T1(d)))} of Tier 1 money) in ${g.length} deals across ${isos.length} countries. Largest: ${countryName(d.countryByIso.get(topC[0])?.name)} (${usdM(topC[1].usd, 0)}). Regional deals are not included.`
      : `No Tier 1 money went to countries in ${region}.`,
  }
}

function afterRule(d: SiteData, domain: string, label: string): AskResult {
  const first = new Map<string, number>()
  for (const e of d.regulation)
    if (e.domain === domain && e.strength === 'Binding' && e.year != null) first.set(e.iso3, Math.min(first.get(e.iso3) ?? 9999, e.year))
  const all = T1(d)
  const after = all.filter((x) => x.iso3 && first.has(x.iso3) && x.year != null && x.year >= first.get(x.iso3)!)
  const countries = [...new Set(after.map((x) => x.iso3!))]
  return {
    filters: { iso3s: countries },
    answer: `${usdM(sum(after))} (${pct(sum(after) / sum(all))} of Tier 1 money) in ${after.length} deals was approved in ${countries.length} countries after a binding ${label} was in force. The filter shows all Tier 1 deals in those countries.`,
  }
}


/** Free-text entry point (deterministic keyword match today; an LLM later). */
export const ask: AskHandler = (q, data) => {
  const s = q.toLowerCase()
  const hit = QUESTIONS.find((x) => x.q.toLowerCase() === s) ?? QUESTIONS.find((x) => s.split(/\W+/).filter((w) => w.length > 4).some((w) => x.q.toLowerCase().includes(w)))
  return hit ? hit.run(data) : { filters: {}, answer: 'No pre-written answer matches that question yet. Try one of the chips.' }
}
