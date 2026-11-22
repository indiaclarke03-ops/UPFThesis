/**
 * Number provenance: every headline figure on the site carries an ⓘ that
 * opens one of these entries (dataset, filter, do-file section, decision, caveat).
 * Use <Info id="t1_total" /> next to a number.
 */
export interface Provenance {
  label: string
  value: string
  dataset: string
  filter: string
  source: string // do-file section / sheet
  decision?: string
  caveat?: string
}

const DEALS = 'Data/Stata/data/deals.dta → public/data/deals.json'
const T1 = 'tier == "T1" & money_measure == "core"; sum of core_t1_usd_m_2024'

export const PROVENANCE: Record<string, Provenance> = {
  t1_total: {
    label: 'Core Tier 1 money, 2010–2025',
    value: 'at least US$6,432.6m (2024 US$)',
    dataset: DEALS,
    filter: T1,
    source: 'Master do-file Part B §1 (tabstat core_t1_usd_m_2024 by lender)',
    caveat: 'A lower bound: commitments, not disbursements; excludes intermediated lending and band C firms.',
  },
  t1_deals: {
    label: 'Tier 1 deals',
    value: '153 (151 core + 2 supply-chain finance)',
    dataset: DEALS,
    filter: 'tier == "T1" (role == Manufacturer & upf_firm == Yes)',
    source: 'Do-file §1',
    decision: 'D001 (supply-chain finance counted separately)',
  },
  t1_sc: {
    label: 'Tier 1 supply-chain finance',
    value: 'US$135.3m (separate measure, not in the US$6.43bn)',
    dataset: DEALS,
    filter: 'tier == "T1" & money_measure == "supply-chain"',
    source: 'Do-file §1',
    decision: 'D001',
  },
  by_lender: {
    label: 'Tier 1 money by lender',
    value: 'IFC 2,501.3; EBRD 2,428.9; EIB 1,116.9; IDB Invest 385.5 (US$m)',
    dataset: DEALS,
    filter: T1 + ', by lender',
    source: 'Do-file §1b',
  },
  by_period: {
    label: 'Tier 1 money by four-year period',
    value: '2010–13 US$1,070.3m (30 deals) → 2022–25 US$2,212.9m (50 deals)',
    dataset: DEALS,
    filter: T1 + ', grouped by approval year',
    source: 'Do-file §1c',
    caveat: 'Without the 2024 Coca-Cola İçecek deal, 2022–25 is still US$1,962.9m.',
  },
  h1_gap: {
    label: 'H1 disclosure gap',
    value: '6.95 pooled (4.64 counting researched parents)',
    dataset: DEALS + ' (row-level list matches are licensed and not published)',
    filter: 'Measure 2 (all Tier 1 money) ÷ measure 1 (Tier 1 money to borrowers whose published name is on the frozen list of 30 global UPF companies)',
    source: 'Do-file §2a; H1_Measures sheet',
    caveat: 'The list is the frozen ATNi/Lancet top-30; the row-level match flags are not published on this site.',
  },
  h1_gap_lender: {
    label: 'H1 gap by lender',
    value: 'IFC 4.9 (4.2); EBRD 20.4 (5.0); EIB 3.7 (3.7); IDB Invest undefined',
    dataset: DEALS,
    filter: 'Measure 2 ÷ measure 1 within each lender (with parents in brackets)',
    source: 'Do-file §2a',
    caveat: 'IDB Invest has no Tier 1 borrower named on the list, so the ratio is undefined.',
  },
  named_deals: {
    label: 'Deals carrying a listed name',
    value: '12 of 153 Tier 1 deals',
    dataset: DEALS,
    filter: 'h1_list_match_disclosed != "" (aggregate only)',
    source: 'Do-file §2a',
  },
  intermediated: {
    label: 'Share of commitments through financial intermediaries',
    value: 'IFC 52%; EBRD 56%; EIB 29%; IDB Invest 25%',
    dataset: 'Master workbook, sheet H1_Intermediated',
    filter: 'Intermediated (FI + funds) ÷ all lending, 2010–2025, nominal, lender currency',
    source: 'H1_Intermediated (computed 16 Nov 2026 from raw lender files, log S01–S05)',
    caveat: 'Not claimed to reach UPF firms: it is the part of the portfolio where that cannot be checked.',
  },
  top_parents: {
    label: 'Top parent groups',
    value: 'Coca-Cola system US$1,027.7m (16.0%); Yıldız/Ülker 681.5; PRAN-RFL 382.3; top 5 41.3%; top 10 60.4%',
    dataset: 'Data/Stata/data/coi_firms.dta',
    filter: 'public_money_t1_core_usd_m_2024, ranked',
    source: 'Do-file §2c; H1_Context',
  },
  named_share: {
    label: 'Share to groups on the global top-30 list',
    value: 'about 22% (US$1,387.4m of 6,432.6m)',
    dataset: DEALS,
    filter: 'H1 measure 1b ÷ measure 2',
    source: 'Do-file §2a; H1_Measures',
  },
  top_countries: {
    label: 'Top recipient countries',
    value: 'Türkiye 1,027.9; Egypt 426.1; Bangladesh 403.5; Serbia 342.8; Poland 330.9 (US$m)',
    dataset: 'Data/Stata/data/countries.dta',
    filter: 'core_t1_usd_m_2024 by iso3 (regional deals excluded)',
    source: 'Do-file §2c',
    caveat: 'Türkiye also hosts a US$250m regional Coca-Cola İçecek deal, counted as regional.',
  },
  income_2010: {
    label: 'Country Tier 1 money by income group in 2010',
    value: 'Middle 4,015.8 (67%); High 1,465.3 (24%); Low 526.8 (9%)',
    dataset: 'Data/Stata/data/countries.dta',
    filter: 'income3_start; countries with Tier 1 money; regional US$424.6m excluded',
    source: 'Do-file §6b-ii / §7',
    caveat: 'Descriptive: where the money goes, not what it causes.',
  },
  h2_lists: {
    label: 'Exclusion lists',
    value: '10 of 10 lender lists name tobacco; 0 of 10 name UPF or unhealthy food',
    dataset: 'Master workbook, sheet H3_Exclusion_Lists',
    filter: 'Current list of each lender, downloaded 15 Nov 2026; keyword search then read by hand',
    source: 'H3_Exclusion_Lists',
  },
  screen: {
    label: 'What a tobacco-style screen would have caught',
    value: 'US$6,432.6m at 20%; about US$4,270m at 50% (band A)',
    dataset: DEALS,
    filter: 'Tier 1 deals with nova4_band in {A, B} (20%) or {A} (50%)',
    source: 'Do-file §1 (band split); thesis Ch. 5',
    caveat: 'Band A share is a coding judgement; band B firms sit closer to the threshold.',
  },
  did_main: {
    label: 'H3 difference-in-differences (main)',
    value: 'b = +1.221 log points, SE 0.951, p = 0.205, 95% CI −0.69 to 3.13, N = 104',
    dataset: 'Data/Stata/data/did_long.dta (52 countries × 2 periods)',
    filter: 'binding (first binding rule 2013–2019, 18 countries) vs none (34); pre 2010–12, post 2020–25',
    source: 'Do-file §4c: reg ln_y i.binding##i.post, vce(cluster countryid)',
    decision: 'D066 (windows, logged Y, groups; agreed 21 Nov 2026)',
    caveat: 'A null result. Do not read the coefficient as a percentage: with many zeros its size depends on the units.',
  },
  did_gdp: {
    label: 'H3 with log GDP per person',
    value: '+1.292, p = 0.183, N = 102',
    dataset: 'did_long.dta',
    filter: 'Main model + loggdp',
    source: 'Do-file §4d (i)',
  },
  did_levels: {
    label: 'H3 with Y in levels',
    value: '−465.6 US$ per 1,000 people, p = 0.451',
    dataset: 'did_long.dta',
    filter: 'reg y_t1_per1000 i.binding##i.post',
    source: 'Do-file §4d (ii)',
  },
  binding_share: {
    label: 'Deals approved under binding regulation',
    value: '52% (76 of 146 core Tier 1 deals with a country)',
    dataset: DEALS,
    filter: 'binding_in_force_at_approval == 1 among core Tier 1 deals with an iso3',
    source: 'Methods v7, H1 context (recomputed)',
    caveat: 'H1_Context reports 51.7% using deals with positive money (145); see DATA_QUESTIONS Q1.',
  },
  coi_share: {
    label: 'Tier 1 money to groups graded 2 or 3',
    value: '42.8% (32.2% without Yıldız)',
    dataset: 'Data/Stata/data/coi_firms.dta',
    filter: 'Money-weighted mean of coi_flag over the 82 funded parent groups',
    source: 'Do-file §6',
    caveat: 'Yıldız’s grade rests on its UK arm pladis while its deals are mostly in Türkiye; always shown with 32.2%. Grade 0 means no evidence found, not no obstruction.',
  },
  coi_nine: {
    label: 'The nine groups graded 2 or 3',
    value: 'US$2,754.2m in total',
    dataset: 'coi_firms.dta',
    filter: 'obstruction_grade_0_3 >= 2 & public money > 0',
    source: 'Do-file §6',
  },
  kappa: {
    label: 'Second-coder agreement',
    value: 'κ role 0.51; κ UPF 0.35 (0.55 without "Unsure")',
    dataset: 'Processed/validation/Second_Coder_Comparison_2026-11-18.xlsx',
    filter: 'kap claude vs second coder',
    source: 'Do-file §9',
    caveat: 'Moderate agreement: banding is a coding judgement.',
  },
  turkiye: {
    label: 'Türkiye case box',
    value: '20 Tier 1 deals, US$1,027.9m; Yıldız/Ülker US$625.6m in Türkiye',
    dataset: DEALS,
    filter: 'iso3 == "TUR" & tier == "T1"',
    source: 'Do-file §8 (case boxes)',
  },
  mexico_lawsuits: {
    label: 'Lawsuits against health regulation in Mexico',
    value: 'count from the Lighthouse Reports dataset',
    dataset: 'Data/Stata/source/coi_litigation.csv (Lighthouse Reports)',
    filter: 'country == "Mexico"',
    source: 'COI_Litigation sheet',
  },
  baker: {
    label: 'UPF sales per person, 2019',
    value: 'High 109.3 kg; upper-middle 32.3 kg; lower-middle 9.7 kg',
    dataset: 'Literature (not thesis data)',
    filter: '—',
    source: 'Baker et al. 2020, Obesity Reviews 21(12): e13126',
    caveat: 'Context only. Not Euromonitor data from this thesis.',
  },
  median_deal: {
    label: 'Median Tier 1 deal',
    value: 'US$28.6m',
    dataset: DEALS,
    filter: 'core Tier 1 deals with money > 0',
    source: 'H1_Context; do-file §1 (deal size)',
  },
}
