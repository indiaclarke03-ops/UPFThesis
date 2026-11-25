import { useState } from 'react'
import { FogBars, GapGrid, NamedShareBar, ParentPack } from '../charts/a012_Act2'
import { ConditionMap } from '../charts/a012_ConditionMap'
import { LenderStream } from '../charts/LenderStream'
import { Info } from '../components/Info'
import { ScrollStory } from '../components/ScrollStory'
import { ActEnd, ChartFrame } from '../components/ui'
import { exploreHref, filterDeals, DEFAULT_FILTERS, byYearLender } from '../lib/aggregate'
import type { SiteData } from '../lib/data'
import { countryName, parentName } from '../lib/data'
import { pct, usdBn, usdM } from '../lib/format'
import { LENDERS } from '../lib/tokens'
import './a012_acts.css'

/** Act 2 · H1: how much, and how visible. */
export default function Act2Scale({ data }: { data: SiteData }) {
  const c = data.results.computed
  const t1 = filterDeals(data.deals, DEFAULT_FILTERS)
  const rows = byYearLender(t1)
  const [parents, setParents] = useState(false)
  const h1 = c.h1

  /* ---------------------------------------------------------------- 1 scale */
  const scaleSteps = [
    <p key="0">
      Between 2010 and 2025, four public development lenders committed <strong>at least {usdBn(c.t1_core_usd_m)}</strong>
      <Info id="t1_total" /> to manufacturers whose sales are mostly ultra-processed.
    </p>,
    <p key="1">
      Two lenders dominate: the World Bank’s <strong>IFC ({usdM(c.by_lender.IFC.usd_m, 0)})</strong> and the{' '}
      <strong>EBRD ({usdM(c.by_lender.EBRD.usd_m, 0)})</strong>. The EIB and IDB Invest add {usdM(c.by_lender.EIB.usd_m + c.by_lender['IDB Invest'].usd_m, 0)}.
      <Info id="by_lender" />
    </p>,
    <p key="2">
      The flow is not shrinking. Four-year totals roughly doubled, from <strong>{usdBn(c.by_period['2010-13'].usd_m)}</strong> in 2010–13 to{' '}
      <strong>{usdBn(c.by_period['2022-25'].usd_m)}</strong> in 2022–25.
      <Info id="by_period" />
    </p>,
    <p key="3">
      One deal does not explain the rise. Drop the 2024 Coca-Cola İçecek loan and 2022–25 is still <strong>{usdBn(c.period_2022_25_without_cci)}</strong>.
    </p>,
  ]

  /* ------------------------------------------------------------- 2 gap reveal */
  const gapSteps = [
    <p key="0">
      Who could see this money? Of {c.t1_deals} Tier 1 deals, only <strong>{h1.All.deals_named}</strong> name a borrower that appears on the list of
      30 global UPF companies.
      <Info id="named_deals" />
    </p>,
    <p key="1">
      The rest are UPF manufacturers too. They just do not carry a famous name, so a reader of the lenders’ disclosures would not recognise them.
    </p>,
    <p key="2">
      In money: <strong>{usdM(h1.All.m1, 0)}</strong> went to named firms, out of <strong>{usdM(h1.All.m2, 0)}</strong>. The pooled gap is{' '}
      <strong>{h1.All.gap?.toFixed(2)}</strong>.
      <Info id="h1_gap" />
    </p>,
    <p key="3">
      The gap holds at every lender with a named recipient: EBRD’s is largest. IDB Invest named none at all. Counting researched parent companies,
      the pooled gap is still <strong>{h1.All.gap_parent?.toFixed(1)}</strong>.
      <Info id="h1_gap_lender" />
    </p>,
  ]

  /* ---------------------------------------------------------------- 4 parents */
  const top3 = c.top_parents.slice(0, 3)
  const packSteps = [
    <p key="0">
      The money went to <strong>{c.n_parent_groups} parent groups</strong>. Each circle is one, sized by Tier 1 money. Hover to see who they are.
    </p>,
    <p key="1">
      Three stand out: the <strong>{parentName(top3[0].parent)}</strong> ({usdM(top3[0].usd_m)}, {pct(top3[0].share)}),{' '}
      <strong>{parentName(top3[1].parent)}</strong> ({usdM(top3[1].usd_m)}) and <strong>{parentName(top3[2].parent)}</strong> ({usdM(top3[2].usd_m)}).
      <Info id="top_parents" />
    </p>,
    <p key="2">
      It is concentrated. The top five groups take <strong>{pct(c.top5_share)}</strong> of the money; the top ten take <strong>{pct(c.top10_share)}</strong>.
    </p>,
    <p key="3">
      The twist: only about <strong>{pct(c.named_list_share, 0)}</strong> goes to groups on the global top-30 list. Most goes to regional and
      national champions, which is why screening by famous names misses it.
      <Info id="named_share" />
    </p>,
  ]

  return (
    <section className="act" id="act-2" aria-labelledby="act-2-title">
      <div className="act-header">
        <span className="act-num">Act 2 · Hypothesis 1</span>
        <h2 id="act-2-title">How much, and how visible</h2>
        <p className="lede">The money is large, it is growing, and most of it goes to firms the public would never recognise.</p>
      </div>

      {/* 1 · Scale */}
      <ScrollStory
        id="act-2-scale"
        steps={scaleSteps}
        stepLabels={['Total', 'By lender', 'The trend', 'One deal?']}
        graphic={(step) => (
          <ChartFrame
            title="Public money to ultra-processed food manufacturers"
            sub="Core Tier 1 commitments by approval year and lender, US$ at 2024 prices"
            summary={`Core Tier 1 money by year, 2010–2025, stacked by lender. Total at least ${usdBn(c.t1_core_usd_m)}. Four-year totals: 2010–13 ${usdBn(c.by_period['2010-13'].usd_m)}, 2014–17 ${usdBn(c.by_period['2014-17'].usd_m)}, 2018–21 ${usdBn(c.by_period['2018-21'].usd_m)}, 2022–25 ${usdBn(c.by_period['2022-25'].usd_m)}.`}
            table={{ head: ['Year', ...LENDERS, 'Total'], rows: rows.map((r) => [r.year, ...LENDERS.map((l) => r[l].toFixed(1)), LENDERS.reduce((s, l) => s + r[l], 0).toFixed(1)]) }}
            explore={{ to: exploreHref({}), label: 'Explore every deal' }}
          >
            <LenderStream deals={t1} mode={step === 0 ? 'total' : step === 1 ? 'lenders' : 'periods'} showCci={step >= 3} trend={step === 2} peaks={step === 0} />
          </ChartFrame>
        )}
      />

      {/* 2 · Disclosure gap */}
      <div className="a012-section-break">
        <div className="kicker">The disclosure gap</div>
        <h3>Most of the money goes to firms nobody would recognise</h3>
      </div>
      <ScrollStory
        id="act-2-gap"
        steps={gapSteps}
        stepLabels={['Named', 'All deals', 'In money', 'By lender']}
        graphic={(step) => (
          <ChartFrame
            title={step < 2 ? 'The 153 Tier 1 deals, by lender' : 'Named versus all Tier 1 money, by lender'}
            sub={step < 1 ? 'Lit: borrowers whose published name matches the list of 30 global UPF companies' : 'Every square is one Tier 1 deal'}
            summary={`Unit grid of ${c.t1_deals} Tier 1 deals by lender. ${h1.All.deals_named} carry a listed name. Gap ratio (all Tier 1 money ÷ money to named borrowers): pooled ${h1.All.gap}, IFC ${h1.IFC.gap}, EBRD ${h1.EBRD.gap}, EIB ${h1.EIB.gap}, IDB Invest undefined. With parent companies: pooled ${h1.All.gap_parent}.`}
            table={{
              head: ['Lender', 'Tier 1 deals', 'Named deals', 'Named US$m', 'All US$m', 'Gap', 'Gap with parents'],
              rows: [...LENDERS, 'All' as const].map((l) => [l, h1[l].deals, h1[l].deals_named, h1[l].m1.toFixed(1), h1[l].m2.toFixed(1), h1[l].gap?.toFixed(2) ?? 'n/a', h1[l].gap_parent?.toFixed(2) ?? 'n/a']),
            }}
            source="Which deals are lit is not identified: the row-level list matches use licensed data. Counts and sums only."
          >
            <div className="a012-hide-stacked" style={{ minHeight: 120 }}>
              {step >= 2 && (
                <p className="a012-bigtype" style={{ margin: '0 0 1rem' }}>
                  All Tier 1 money is about <em>seven times</em> the money to named firms: for every dollar going to a firm visible by name, about six
                  more go to UPF firms that are not.
                </p>
              )}
              {step === 1 && (
                <p className="a012-bigtype" style={{ margin: '0 0 1rem', color: 'var(--muted)' }}>
                  {c.t1_deals - h1.All.deals_named} more deals develop into view.
                </p>
              )}
              {step === 0 && (
                <p className="a012-bigtype" style={{ margin: '0 0 1rem' }}>
                  <em>{h1.All.deals_named}</em> of {c.t1_deals} deals are visible by name.
                </p>
              )}
            </div>
            <GapGrid data={data} step={step} parents={parents} onParents={setParents} />
            {step >= 3 && (
              <p className="small" style={{ marginTop: 8 }}>
                Pooled gap: <b className="num">{(parents ? h1.All.gap_parent : h1.All.gap)?.toFixed(2)}</b>{' '}
                {parents ? '(counting researched parent companies)' : '(names as published)'}. Rule set in advance: supported if ≥ 2 overall and &gt; 1 at
                every lender.
              </p>
            )}
          </ChartFrame>
        )}
      />

      {/* 3 · Fog */}
      <div className="a012-section-break">
        <div className="kicker">The money you cannot see at all</div>
        <h3>A quarter to over half of each lender’s commitments disappear into intermediaries</h3>
        <p className="muted">
          Loans to banks and investment funds are re-lent to firms the lenders do not name. Whatever reaches UPF manufacturers that way is
          invisible, and is not in the US$6.43bn.
        </p>
      </div>
      <div className="narrow" style={{ maxWidth: 900, marginTop: '2rem' }}>
        <ChartFrame
          summary={`Share of each lender's commitments through financial intermediaries: ${c.intermediated.map((r) => `${r.lender} ${Math.round(r.share * 100)}%`).join(', ')}.`}
          table={{ head: ['Lender', 'Currency', 'Intermediated bn', 'All lending bn', 'Share'], rows: c.intermediated.map((r) => [r.lender, r.currency, r.intermediated_bn, r.all_bn, `${Math.round(r.share * 100)}%`]) }}
          source="Master workbook, sheet H1_Intermediated; lenders’ own portfolio files, 2010–2025, nominal."
        >
          <FogBars data={data} />
        </ChartFrame>
      </div>

      {/* 4 · Who gets it */}
      <div className="a012-section-break">
        <div className="kicker">Who gets it</div>
        <h3>Eighty-two groups, a handful of giants, and many regional champions</h3>
      </div>
      <ScrollStory
        id="act-2-parents"
        side="right"
        steps={packSteps}
        stepLabels={['82 groups', 'Top three', 'Concentration', 'Global names?']}
        graphic={(step) => (
          <ChartFrame
            title="Parent groups receiving Tier 1 money"
            sub="Circle area = core Tier 1 money, 2010–2025"
            summary={`Circle pack of ${c.n_parent_groups} parent groups. Largest: ${c.top_parents.slice(0, 5).map((p) => `${parentName(p.parent)} ${usdM(p.usd_m)}`).join('; ')}. Top 5 share ${pct(c.top5_share)}, top 10 ${pct(c.top10_share)}.`}
            table={{ head: ['Parent group', 'US$m', 'Deals', 'Share'], rows: data.firms.map((f) => [parentName(f.parent), f.t1.toFixed(1), f.n_t1, pct(f.t1 / c.t1_core_usd_m)]) }}
            explore={{ to: exploreHref({}), label: 'Explore the groups' }}
          >
            {step >= 3 ? (
              <div style={{ padding: '1rem 0' }}>
                <p className="a012-bigtype" style={{ marginBottom: '1.2rem' }}>
                  Only about <em>{pct(c.named_list_share, 0)}</em> of the money reaches groups on the global top-30 list.
                </p>
                <NamedShareBar data={data} />
                <p className="small muted" style={{ marginTop: '1rem' }}>
                  {usdM(h1.All.m1b, 0)} of {usdM(h1.All.m2, 0)} (H1 measure 1b ÷ measure 2). A screen built around famous global names would miss most of
                  the money, which goes to groups known mainly in their own region.
                </p>
              </div>
            ) : (
              <>
                <ParentPack data={data} step={step} />
                {step === 2 && (
                  <div className="a012-stat-row a012-hide-stacked">
                    <div className="a012-stat">
                      <b>{pct(c.top5_share)}</b>
                      <span>to the top 5 groups</span>
                    </div>
                    <div className="a012-stat">
                      <b>{pct(c.top10_share)}</b>
                      <span>to the top 10</span>
                    </div>
                    <div className="a012-stat">
                      <b>{usdM(c.median_deal)}</b>
                      <span>
                        median deal <Info id="median_deal" />
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </ChartFrame>
        )}
      />

      {/* 5 · Where it goes */}
      <div className="a012-section-break">
        <div className="kicker">Where it goes</div>
        <h3>The money goes to middle-income markets</h3>
        <p className="muted">
          {c.n_countries} countries received Tier 1 money, plus five regional deals. Two thirds of the money with a country went to middle-income
          markets: the markets where ultra-processed food sales are growing fastest.
        </p>
      </div>
      <div className="container" style={{ marginTop: '2rem' }}>
        <ChartFrame
          title="Tier 1 money by country, 2010–2025"
          sub="Use the buttons to change the conditions; hover a country for its total, deals and income group"
          summary={`Choropleth of Tier 1 money. Top five: ${c.top_countries.slice(0, 5).map((t) => `${countryName(t.name)} ${usdM(t.usd_m)}`).join('; ')}. Middle-income countries took ${Math.round(c.by_income_2010.Middle.share * 100)}% of country money.`}
          table={{
            head: ['Country', 'Tier 1 US$m', 'Deals', 'Per 1,000 people (US$)', 'Income 2010'],
            rows: data.countries
              .filter((k) => k.t1 > 0)
              .sort((a, b) => b.t1 - a.t1)
              .map((k) => [countryName(k.name), k.t1.toFixed(1), k.n_t1, k.t1_per1000?.toFixed(0) ?? '—', k.income2010 ?? '—']),
          }}
          explore={{ to: exploreHref({}), label: 'Explore by country' }}
        >
          <ConditionMap data={data} />
        </ChartFrame>
      </div>

      <ActEnd to={exploreHref({})} label="Explore this: all 153 Tier 1 deals" />
    </section>
  )
}
