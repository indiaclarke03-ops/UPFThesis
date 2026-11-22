/**
 * Data layer: types for the public JSON files and a single cached loader.
 * Every JSON file is produced by pipeline/export_site_data.py and asserted by
 * pipeline/check_numbers.py. The front end only aggregates (sums, counts, shares).
 */
import { useEffect, useState } from 'react'
import type { Lender } from './tokens'

export interface Deal {
  id: string
  lender: Lender
  project_id: string | null
  company: string | null
  parent: string | null
  iso3: string | null
  country: string | null
  regional: boolean
  year: number | null
  status: string | null
  sector: string | null
  title: string | null
  role: string | null
  band: string | null
  upf_firm: string | null
  measure: string | null
  tier1: boolean
  supply_chain: boolean
  /** commitment, US$m 2024 */
  amount: number | null
  /** core Tier 1 money, US$m 2024 (0 if not core Tier 1) */
  t1: number | null
  /** core food-manufacturing money, US$m 2024 */
  food: number | null
  /** supply-chain Tier 1 money, US$m 2024 */
  sc_t1: number | null
  income: string | null
  binding: 0 | 1 | null
  confidence: number | null
  reason: string | null
  source_url: string | null
}

export interface Country {
  iso3: string
  num: string | null
  name: string
  region: string | null
  income2010: string | null
  income2025: string | null
  first_binding: number | null
  first_voluntary: number | null
  n_food: number
  n_t1: number
  t1: number
  food: number
  t1_by_lender: Record<Lender, number>
  t1_per1000: number | null
  in_sample: boolean
  h4_group: string
}

export interface CountryYear {
  iso3: string
  year: number
  t1: number
  food: number
  t1_per1000: number | null
  income: string | null
  pop: number | null
}

export interface RegEvent {
  id: string
  iso3: string
  country: string
  domain: string
  detail: string | null
  strength: string
  year: number | null
  end: number | null
  source: string | null
}

export interface Firm {
  parent: string
  slug: string
  t1: number
  n_t1: number
  countries: string[]
  iso3s: string[]
  lenders: Partial<Record<Lender, number>>
  grade: 0 | 1 | 2 | 3
  coi: boolean
  n_lawsuits: number
  interest_groups: number | null
  trade_assoc: string | null
  lobbying: string | null
  confidence: string | null
  evidence: string | null
  links: string[]
}

export interface Lawsuit {
  id: number
  country: string
  plaintiff: string | null
  plaintiff_type: string | null
  defendant: string | null
  case: string | null
  court: string | null
  filed: number | null
  resolved: number | null
  law: string | null
  parent: string | null
}

export interface ExclusionList {
  institution: string
  kind: 'lender' | 'comparator' | 'benchmark'
  document: string
  version: string
  url: string
  excludes_tobacco: number | null
  excludes_alcohol: number | null
  excludes_weapons: number | null
  excludes_UPF_or_unhealthy_food: number | null
  excludes_sugary_drinks: number | null
  mentions_BMS_Code: number | null
  nutrition_criteria: number | null
}

export interface DidData {
  means: { binding: 0 | 1; post: 0 | 1; ln_y: number }[]
  countries: { iso3: string; name: string; binding: 0 | 1; pre: number; post: number; pre_y: number; post_y: number }[]
  trend: { binding: 0 | 1; year: number; ln_y: number }[]
  group_counts: { binding: number; none: number }
}

type UsdDeals = { usd_m: number; deals: number }
export interface Computed {
  t1_deals: number
  t1_core_deals: number
  t1_sc_deals: number
  t1_core_usd_m: number
  t1_sc_usd_m: number
  by_lender: Record<Lender, UsdDeals>
  by_period: Record<string, UsdDeals>
  period_2022_25_without_cci: number
  by_income_at_approval: Record<string, UsdDeals>
  money_with_country: UsdDeals
  regional: UsdDeals
  by_income_2010: Record<string, { usd_m: number; share: number }>
  h1: Record<Lender | 'All', { m2: number; m1: number; m1b: number; gap: number | null; gap_parent: number | null; deals: number; deals_named: number }>
  intermediated: { lender: Lender; currency: string; intermediated_bn: number; all_bn: number; share: number; definition: string }[]
  top_parents: { parent: string; usd_m: number; share: number }[]
  top5_share: number
  top10_share: number
  named_list_share: number
  n_parent_groups: number
  n_countries: number
  median_deal: number
  top_countries: { iso3: string; name: string; usd_m: number; deals: number }[]
  binding_share: number
  binding_share_n: { binding: number; deals: number }
  screen_20: number
  screen_50: number
  coi_share: number
  coi_share_without_yildiz: number
  coi_groups_ge2: { parent: string; usd_m: number; grade: number }[]
  coi_groups_ge2_usd_m: number
  grade_money: Record<string, number>
  grade_n: Record<string, number>
  turkiye: { deals: number; usd_m: number; yildiz_in_tur: number; by_lender: Record<Lender, number> }
  mexico_lawsuits: number
  lawsuits_total: number
  did_groups: { binding: number; none: number; n: number }
}

export interface Results {
  headline_t1: { value: number; unit: string; label: string; source: string }
  h1_gap: { value: number; with_parents: number; by_lender: Record<Lender, [number | null, number | null]>; robust_band_a: number; robust_em_confirmed: number; source: string }
  h3_did_main: { value: number; se: number; p: number; ci: [number, number]; n: number; groups: { binding: number; none: number }; unit: string; model: string; source: string }
  h3_did_gdp: { value: number; p: number; n: number; source: string }
  h3_did_levels: { value: number; p: number; unit: string; source: string }
  h3_any_deal: { value: number; p: number; source: string }
  kappa: { role: number; upf: number; upf_without_unsure: number; source: string }
  h4_coi: { value: number; without_yildiz: number; nine_groups_usd_m: number; source: string }
  baker_2020: { kg_per_capita_2019: Record<string, number>; growth_2009_19: Record<string, number>; source: string }
  computed: Computed
}

export interface Meta {
  data_version: string
  build_date: string
  title: string
  author: string
  institution: string
  citation: string
  notes: string[]
}

export interface SiteData {
  deals: Deal[]
  countries: Country[]
  countryYear: CountryYear[]
  regulation: RegEvent[]
  firms: Firm[]
  lawsuits: Lawsuit[]
  exclusion: ExclusionList[]
  did: DidData
  results: Results
  meta: Meta
  /** convenience lookups */
  countryByIso: Map<string, Country>
  firmBySlug: Map<string, Firm>
  firmByParent: Map<string, Firm>
}

const BASE = `${import.meta.env.BASE_URL}data/`

let cache: Promise<SiteData> | null = null

async function getJSON<T>(name: string): Promise<T> {
  const r = await fetch(BASE + name)
  if (!r.ok) throw new Error(`Failed to load ${name}: ${r.status}`)
  return r.json() as Promise<T>
}

export function loadData(): Promise<SiteData> {
  if (!cache) {
    cache = Promise.all([
      getJSON<Deal[]>('deals.json'),
      getJSON<Country[]>('countries.json'),
      getJSON<CountryYear[]>('country_year.json'),
      getJSON<RegEvent[]>('regulation.json'),
      getJSON<Firm[]>('firms.json'),
      getJSON<Lawsuit[]>('lawsuits.json'),
      getJSON<ExclusionList[]>('exclusion_lists.json'),
      getJSON<DidData>('did.json'),
      getJSON<Results>('results.json'),
      getJSON<Meta>('meta.json'),
    ]).then(([deals, countries, countryYear, regulation, firms, lawsuits, exclusion, did, results, meta]) => ({
      deals,
      countries,
      countryYear,
      regulation,
      firms,
      lawsuits,
      exclusion,
      did,
      results,
      meta,
      countryByIso: new Map(countries.map((c) => [c.iso3, c])),
      firmBySlug: new Map(firms.map((f) => [f.slug, f])),
      firmByParent: new Map(firms.map((f) => [f.parent, f])),
    }))
  }
  return cache
}

/** React hook: returns SiteData once loaded, else null (render a skeleton). */
export function useData(): SiteData | null {
  const [d, setD] = useState<SiteData | null>(null)
  useEffect(() => {
    let alive = true
    loadData().then((x) => alive && setD(x))
    return () => {
      alive = false
    }
  }, [])
  return d
}

/** Display names: the data keeps World Bank / ASCII spellings; show the thesis spellings. */
const PARENT_DISPLAY: Record<string, string> = {
  'Yildiz Holding (Ulker/pladis)': 'Yıldız Holding (Ülker/pladis)',
  Nestle: 'Nestlé',
  'Muller Group': 'Müller Group',
  Uludag: 'Uludağ',
  'CMI (Corporacion Multi Inversiones)': 'CMI (Corporación Multi Inversiones)',
  Dogus: 'Doğuş',
  Ozgorkey: 'Özgörkey',
  Ariztia: 'Ariztía',
  Lantmannen: 'Lantmännen',
  'Societe Agro-Industrie De Cote D\'Ivoire': "Société Agro-Industrie de Côte d'Ivoire",
  'Industrie Des Boissons Du Senegal': 'Industrie des Boissons du Sénégal',
}
export const parentName = (p: string | null | undefined) => (p ? PARENT_DISPLAY[p] ?? p : '—')

const COUNTRY_DISPLAY: Record<string, string> = {
  'Egypt, Arab Rep.': 'Egypt',
  'Korea, Rep.': 'South Korea',
  'Russian Federation': 'Russia',
  'Iran, Islamic Rep.': 'Iran',
  'Venezuela, RB': 'Venezuela',
  'Yemen, Rep.': 'Yemen',
  'Egypt Arab Rep.': 'Egypt',
  'Kyrgyz Republic': 'Kyrgyzstan',
  'Slovak Republic': 'Slovakia',
  'Lao PDR': 'Laos',
  'Viet Nam': 'Vietnam',
  'Turkiye': 'Türkiye',
  "Cote d'Ivoire": "Côte d'Ivoire",
  'Congo, Dem. Rep.': 'DR Congo',
  'Congo, Rep.': 'Congo',
  'Gambia, The': 'The Gambia',
}
export const countryName = (n: string | null | undefined) => (n ? COUNTRY_DISPLAY[n] ?? n : '—')
