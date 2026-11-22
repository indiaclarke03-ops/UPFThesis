import * as d3 from 'd3'
import { CiPlot, DidExplainer } from '../charts/a34_Did'
import { RegSpread, statusIn } from '../charts/a34_RegSpread'
import { SwimlaneSet } from '../charts/a34_Swimlane'
import { Info } from '../components/Info'
import { ScrollStory } from '../components/ScrollStory'
import { ActEnd, ChartFrame, CountUp } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import type { SiteData } from '../lib/data'
import { useInView, useIsPhone, useSize } from '../lib/hooks'
import { Link } from 'react-router-dom'
import './a34.css'

const SPREAD_YEARS = [2005, 2012, 2019, 2025]

/** Act 4 · H3: does regulation change the flow? */
export default function Act4Regulation({ data }: { data: SiteData }) {
  const c = data.results.computed
  const r = data.results.h3_did_main
  const gdp = data.results.h3_did_gdp
  const lev = data.results.h3_did_levels
  const nBind = (y: number) => data.countries.filter((k) => statusIn(k.first_binding, k.first_voluntary, y) === 'binding').length
  const sampleNew = data.countries.filter((k) => k.h4_group === '2 binding').length
  const [ciRef, ciSeen] = useInView<HTMLDivElement>(0.45)
  const phone = useIsPhone()

  const spreadSteps = [
    <p key="0">
      Governments have plenty of tools: <strong>sugary-drink taxes, warning labels, limits on marketing to children, salt and trans-fat limits</strong>. In 2005, {nBind(2005)} countries had a binding one.
    </p>,
    <p key="1">
      By 2012 the number reached <strong>{nBind(2012)}</strong>. Mexico’s soda tax and Chile’s warning labels were still to come.
    </p>,
    <p key="2">
      2013–2019 is the wave our test uses: <strong>{sampleNew} countries</strong> where lenders made food deals brought in their first binding rule.
    </p>,
    <p key="3">
      By 2025, <strong>{nBind(2025)} countries</strong> had at least one binding UPF rule. Regulating these products is now ordinary policy.
    </p>,
  ]

  const didSteps = [
    <p key="0">
      The test asks one question: <strong>after a country brought in binding rules, did public lending to UPF firms fall</strong>, compared with
      countries that never regulated?
    </p>,
    <p key="1">
      Two groups. <strong>{c.did_groups.binding} countries</strong> brought in a first binding rule in 2013–19; <strong>{c.did_groups.none}</strong> had
      none at any point. Each is measured before and after.
      <Info id="did_main" />
    </p>,
    <p key="2">
      The averages. Lending in no-rule countries stayed flat. In countries that regulated, it <strong>rose</strong>. Each faint line is one
      country; most sit at zero.
    </p>,
    <p key="3">
      If regulation steered lenders away, the teal line would bend down, below the dashed path. It does the opposite. The gap is the
      estimate: <strong>+{r.value.toFixed(2)} log points</strong>.
    </p>,
  ]

  return (
    <section className="act" id="act-4" aria-labelledby="act-4-title">
      <div className="act-header">
        <span className="act-num">Act 4 · Hypothesis 3, the main test</span>
        <h2 id="act-4-title">Does regulation change the flow?</h2>
        <p className="lede">
          If binding health rules signal that a market is turning against ultra-processed food, public lenders might lend less there. We
          tested it.
        </p>
      </div>

      {/* ---------------------------------------------------- 1. spread */}
      <ScrollStory
        id="act-4-spread"
        steps={spreadSteps}
        graphic={(step, progress) => {
          const i = Math.min(step, SPREAD_YEARS.length - 1)
          const year = i < SPREAD_YEARS.length - 1 ? Math.round(SPREAD_YEARS[i] + (SPREAD_YEARS[i + 1] - SPREAD_YEARS[i]) * Math.min(1, progress * 1.15)) : 2025
          return (
            <ChartFrame
              title="Regulation spreads"
              sub={phone ? undefined : 'First binding or voluntary UPF rule in force (sugary-drink taxes, front-of-pack labels, marketing limits, salt and trans-fat limits, UPF taxes)'}
              summary={`Countries with a binding UPF rule in force: ${nBind(2005)} in 2005, ${nBind(2012)} in 2012, ${nBind(2019)} in 2019 and ${nBind(2025)} in 2025.`}
              table={{ head: ['Year', 'Countries with a binding rule'], rows: d3.range(2000, 2026).map((y) => [y, nBind(y)]) }}
              source="H4-core regulation events, one designated source per domain (Reg_Events)."
            >
              <RegSpread data={data} year={year} />
            </ChartFrame>
          )
        }}
      />

      {/* ---------------------------------------------------- 2. swimlanes */}
      <div className="a34-block">
        <div className="a34-block-head">
          <div className="kicker">Lending under the law</div>
          <h3 className="a34-subhead">
            <span className="copper">
              <CountUp value={c.binding_share * 100} format={(v) => `${Math.round(v)}%`} />
            </span>{' '}
            of Tier 1 deals with a country were approved where a binding UPF rule was already in force.
            <Info id="binding_share" />
          </h3>
          <p>
            {c.binding_share_n.binding} of {c.binding_share_n.deals} core deals. Each lane is one country: its rules, and the public money that
            kept arriving. Hover a circle for the deal; add any country.
          </p>
        </div>
        <SwimlaneSet data={data} />
      </div>

      {/* ---------------------------------------------------- 3. the test */}
      <div className="a34-block" style={{ marginBottom: 0 }}>
        <div className="a34-block-head">
          <div className="kicker">The test, step by step</div>
          <h3 className="a34-subhead">A difference-in-differences design</h3>
          <p>Compare how lending changed in countries that regulated with how it changed in countries that did not.</p>
        </div>
      </div>
      <ScrollStory
        id="act-4-did"
        steps={didSteps}
        graphic={(step) => (
          <ChartFrame
            title="Tier 1 money per 1,000 people, before and after"
            sub={phone ? undefined : 'Group means of ln(1 + US$ per 1,000 people), 52 countries'}
            summary={`Group means of the logged outcome. Binding-rule countries: ${data.did.means.find((m) => m.binding === 1 && m.post === 0)!.ln_y.toFixed(2)} before, ${data.did.means.find((m) => m.binding === 1 && m.post === 1)!.ln_y.toFixed(2)} after. No-rule countries: ${data.did.means.find((m) => m.binding === 0 && m.post === 0)!.ln_y.toFixed(2)} before, ${data.did.means.find((m) => m.binding === 0 && m.post === 1)!.ln_y.toFixed(2)} after.`}
            table={{
              head: ['Country', 'Group', 'Before ln(1+Y)', 'After ln(1+Y)'],
              rows: data.did.countries.map((k) => [k.name, k.binding ? 'Binding' : 'None', k.pre.toFixed(2), k.post.toFixed(2)]),
            }}
            source="did_long.dta (Stata Part A). Means are display averages; the estimate is from the regression."
          >
            <DidExplainer did={data.did} step={step} estimate={r.value} />
          </ChartFrame>
        )}
      />

      {/* ---------------------------------------------------- 4. the result */}
      <div className="result-hero" id="act-4-result">
        <div className="kicker">The result</div>
        <p className="result-statement">
          No sign that binding rules reduced public lending to UPF firms. The interval is wide, so a modest effect either way cannot be ruled
          out.
          <Info id="did_main" />
        </p>
        <div className="result-stats tabular">
          <span>Estimate <b>+{r.value.toFixed(2)}</b> log points</span>
          <span>95% CI <b>−{Math.abs(r.ci[0]).toFixed(2)} to +{r.ci[1].toFixed(2)}</b></span>
          <span>p = <b>{r.p.toFixed(3)}</b></span>
          <span>N = <b>{r.n}</b> ({r.groups.binding} binding, {r.groups.none} none; errors clustered by country)</span>
        </div>
        <div ref={ciRef}>
        <ChartFrame
          summary={`Difference-in-differences estimate +${r.value} log points with a 95% confidence interval from ${r.ci[0]} to ${r.ci[1]}. The interval includes zero.`}
          source={`do-file §4c · decision D066 · ${r.model}`}
        >
          <CiPlot b={r.value} lo={r.ci[0]} hi={r.ci[1]} p={r.p} n={r.n} play={ciSeen} />
        </ChartFrame>
        </div>

        <div className="result-grid">
          <div className="card">
            <div className="kicker">Why this still matters</div>
            <p style={{ marginBottom: 0 }}>
              A null result is informative (Abadie 2020). Binding national rules are the strongest signal a government can send about a
              product. If even they leave public lending unchanged, nothing else in the lenders’ process is likely to redirect it.
            </p>
          </div>
          <div className="card">
            <span className="argument-flag">Interpretation · argument</span>
            <p style={{ margin: '0.6rem 0 0' }}>
              Lenders price credit risk, not health risk. The evidence from Chile’s labelling law shows no clear financial harm to
              manufacturers, so nothing in a credit appraisal flags a regulated firm as a worse borrower.
            </p>
          </div>
        </div>

        <details className="a34-drawer">
          <summary>Robustness checks and methods notes</summary>
          <div className="a34-drawer-body">
            <table className="data-table" style={{ marginBottom: '1rem' }}>
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col" className="n">Estimate</th>
                  <th scope="col" className="n">p</th>
                  <th scope="col" className="n">N</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Main: ln(1 + Y), clustered by country <Info id="did_main" /></td>
                  <td className="n">+{r.value.toFixed(3)} log points</td>
                  <td className="n">{r.p.toFixed(3)}</td>
                  <td className="n">{r.n}</td>
                </tr>
                <tr>
                  <td>+ log GDP per person <Info id="did_gdp" /></td>
                  <td className="n">+{gdp.value.toFixed(3)} log points</td>
                  <td className="n">{gdp.p.toFixed(3)}</td>
                  <td className="n">{gdp.n}</td>
                </tr>
                <tr>
                  <td>Y in levels (US$ per 1,000 people) <Info id="did_levels" /></td>
                  <td className="n">−{Math.abs(lev.value).toFixed(1)} US$ per 1,000</td>
                  <td className="n">{lev.p.toFixed(3)}</td>
                  <td className="n">{r.n}</td>
                </tr>
              </tbody>
            </table>
            <p>None is significant; even the sign changes with the units, which is why the site reports the null and its interval, not a size.</p>
            <ul>
              <li><b>ln(1 + Y) with zeros.</b> Most country-periods have no Tier 1 money, so the size of a log effect depends on the units chosen (Chen &amp; Roth 2024). Read the sign and the interval, never a percentage.</li>
              <li><b>Two periods, not sixteen years.</b> Averaging each country into one “before” and one “after” avoids serial-correlation problems (Bertrand, Duflo &amp; Mullainathan 2004) and the bias of staggered timing (Goodman-Bacon 2021).</li>
              <li><b>Clustered errors.</b> Standard errors are clustered by country; with 52 clusters this is adequate but not generous (Cameron &amp; Miller 2015).</li>
              <li><b>Parallel trends.</b> The design assumes both groups would have moved together without the rules. Pre-trend tests have low power, so treat this with caution (Roth 2022).</li>
            </ul>
            <TrendMini data={data} />
            <p className="small muted" style={{ marginTop: '0.75rem' }}>
              Full methods, sources and references: <Link to="/methods">Methods &amp; data</Link>.
            </p>
          </div>
        </details>
      </div>

      <ActEnd to={exploreHref({ binding: 'yes' })} label="Explore this: deals approved under binding rules" />
    </section>
  )
}

/** Yearly group means (Figure 6.2 equivalent). Noisy: most country-years are zero. */
function TrendMini({ data }: { data: SiteData }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const H = 200
  const mg = { t: 14, r: 92, b: 24, l: 34 }
  const x = d3.scaleLinear().domain([2010, 2025]).range([mg.l, Math.max(mg.l + 10, width - mg.r)])
  const yMax = d3.max(data.did.trend, (d) => d.ln_y) ?? 1
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([H - mg.b, mg.t])
  const line = d3.line<{ year: number; ln_y: number }>().x((d) => x(d.year)).y((d) => y(d.ln_y))
  const series = [0, 1].map((b) => data.did.trend.filter((d) => d.binding === b))
  return (
    <div ref={ref}>
      <div className="small" style={{ fontWeight: 650 }}>Yearly averages by group (parallel-trends check)</div>
      <div className="small muted">Mean ln(1 + US$ per 1,000 people). Noisy: most country-years are zero.</div>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Yearly mean of logged Tier 1 money per 1,000 people for binding and no-rule countries, 2010 to 2025">
          <rect x={x(2012.5)} width={x(2019.5) - x(2012.5)} y={mg.t} height={H - mg.t - mg.b} fill="#EFEBE3" />
          {y.ticks(3).map((v) => (
            <g key={v}>
              <line x1={mg.l} x2={width - mg.r} y1={y(v)} y2={y(v)} stroke="#E7E1D6" strokeDasharray="2 3" />
              <text x={mg.l - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={10} fill="#5E6472">{v}</text>
            </g>
          ))}
          {series.map((s, b) => (
            <g key={b}>
              <path d={line(s) ?? ''} fill="none" stroke={b ? '#0F6E6E' : '#6B7485'} strokeWidth={2} />
              <text x={width - mg.r + 6} y={y(s[s.length - 1].ln_y)} dy="0.32em" fontSize={11} fontWeight={650} fill={b ? '#0F6E6E' : '#6B7485'}>
                {b ? 'Binding' : 'No rule'}
              </text>
            </g>
          ))}
          {[2010, 2013, 2016, 2019, 2022, 2025].map((yr) => (
            <text key={yr} x={x(yr)} y={H - 6} fontSize={10} textAnchor="middle" fill="#5E6472">{yr}</text>
          ))}
        </svg>
      )}
    </div>
  )
}
