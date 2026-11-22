/** /country/:iso3: one country's money, deals, regulation and income path. */
import * as d3 from 'd3'
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Tooltip, useTooltip } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import { countryName, parentName, useData, type RegEvent } from '../lib/data'
import { usdBn, usdM } from '../lib/format'
import { useSize } from '../lib/hooks'
import { incomeColor } from '../lib/tokens'
import { DealLine, ProfileLinks, YearBars } from '../explore/profile'
import '../explore/explore.css'
import './profile_pages.css'

const H4_TEXT: Record<string, string> = {
  '0 none': 'Comparison group in the H3 test: no UPF rule at any point 2010–2025.',
  '2 binding': 'Treated group in the H3 test: first binding UPF rule in force 2013–2019.',
  '1 voluntary only': 'Voluntary rules only (first in 2013–2019); a robustness group, not the main test.',
  'dropped: bound by 2012': 'Not in the main H3 test: a binding rule was already in force by 2012.',
  'dropped: bound 2020 or later': 'Not in the main H3 test: late adopter (binding from 2020); used in a robustness check only.',
  'dropped: voluntary outside window': 'Not in the main H3 test: voluntary rules only, outside the 2013–2019 window.',
  'not in sample': 'No food-manufacturing deal 2010–2025, so not in the H3 sample.',
}

export default function Country() {
  const { iso3 = '' } = useParams()
  const data = useData()
  const nav = useNavigate()
  const iso = iso3.toUpperCase()

  const view = useMemo(() => {
    if (!data) return null
    const c = data.countryByIso.get(iso)
    if (!c) return { c: null }
    const deals = data.deals.filter((d) => d.iso3 === iso).sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    const cy = data.countryYear.filter((r) => r.iso3 === iso).sort((a, b) => a.year - b.year)
    const rows = d3.range(2010, 2026).map((y) => {
      const r = cy.find((x) => x.year === y)
      return { year: y, food: r?.food ?? 0, t1: r?.t1 ?? 0 }
    })
    const reg = data.regulation.filter((e) => e.iso3 === iso && e.year != null).sort((a, b) => a.year! - b.year!)
    const incomes = d3.range(2010, 2026).map((y) => ({ y, inc: cy.find((x) => x.year === y)?.income ?? null }))
    return { c, deals, rows, reg, incomes }
  }, [data, iso])

  if (!data || !view)
    return (
      <div className="container pf-page">
        <Skeleton height={120} style={{ marginBottom: 16 }} />
        <Skeleton height={320} />
      </div>
    )
  if (!view.c)
    return (
      <div className="narrow pf-page" style={{ minHeight: '50vh' }}>
        <h1>Country not found</h1>
        <p>
          No country with the code “{iso}”. <Link to="/explore">Open the explorer</Link>.
        </p>
      </div>
    )

  const { c, deals = [], rows = [], reg = [], incomes = [] } = view
  const name = countryName(c.name)
  const t1Deals = deals.filter((d) => d.tier1)
  const parents = d3.rollups(
    t1Deals.filter((d) => (d.t1 ?? 0) > 0),
    (v) => d3.sum(v, (d) => d.t1 ?? 0),
    (d) => d.parent ?? '—',
  ).sort((a, b) => b[1] - a[1])
  const markers = [
    ...(c.first_voluntary && (!c.first_binding || c.first_voluntary < c.first_binding) ? [{ year: c.first_voluntary, label: c.first_voluntary < 2010 ? `Voluntary since ${c.first_voluntary}` : `Voluntary ${c.first_voluntary}`, color: '#3E8F8A' }] : []),
    ...(c.first_binding ? [{ year: c.first_binding, label: c.first_binding < 2010 ? `Binding since ${c.first_binding}` : `Binding ${c.first_binding}`, color: '#0F6E6E' }] : []),
  ]
  const share = c.t1 / data.results.computed.t1_core_usd_m

  const goSwimlane = () => {
    nav('/')
    setTimeout(() => document.getElementById('act-4')?.scrollIntoView({ behavior: 'smooth' }), 400)
  }

  return (
    <div className="container pf-page">
      <Link to="/explore" className="ex-back">
        ← Explorer
      </Link>{' '}
      <span className="muted">·</span>{' '}
      <Link to="/" className="ex-back">
        Back to the story
      </Link>
      <div className="pf-hero">
        <div>
          <div className="kicker" style={{ marginTop: '0.9rem' }}>
            Country profile · {c.region}
          </div>
          <h1>{name}</h1>
          <div className="pf-chips">
            <span className="chip">
              Income: {c.income2010 ?? '—'} (2010) → {c.income2025 ?? '—'} (2025)
            </span>
            <span className="chip" style={{ color: '#0F6E6E', borderColor: '#9ED3CF' }}>
              {c.first_binding ? `First binding UPF rule: ${c.first_binding}` : 'No binding UPF rule to 2025'}
            </span>
            {c.first_voluntary && <span className="chip">First voluntary scheme: {c.first_voluntary}</span>}
          </div>
          <p className="pf-note">{H4_TEXT[c.h4_group] ?? c.h4_group}</p>
        </div>
        <div>
          <div className="pf-big">{c.t1 >= 1000 ? usdBn(c.t1) : usdM(c.t1)}</div>
          <div className="pf-big-sub">
            core Tier 1 money, 2010–2025 · {c.n_t1} Tier 1 deals{c.t1 > 0 ? ` · ${(share * 100).toFixed(1)}% of all Tier 1 money` : ''}
            {c.t1_per1000 ? ` · US$${d3.format(',.0f')(c.t1_per1000)} per 1,000 people over 2010–25` : ''}
          </div>
          <div className="pf-big-sub">
            {c.n_food} food-manufacturing deals worth {usdM(c.food)} in all.
          </div>
        </div>
      </div>

      <div className="pf-grid">
        <div className="panel">
          <h2>Money over time</h2>
          <div className="panel-sub">Commitments by approval year, with the first voluntary and binding UPF rules marked.</div>
          <YearBars rows={rows} markers={markers} />
        </div>
        <div className="panel">
          <h2>Income path</h2>
          <div className="panel-sub">World Bank income group each year, 2010–2025.</div>
          <div className="pf-income" role="img" aria-label={`Income group by year: ${incomes.map((i) => `${i.y} ${i.inc ?? 'unknown'}`).join(', ')}`}>
            {incomes.map((i) => (
              <span key={i.y} title={`${i.y}: ${i.inc ?? 'unknown'}`} style={{ background: i.inc ? incomeColor[i.inc] : '#E7E1D6' }} />
            ))}
          </div>
          <div className="pf-income-axis">
            <span>2010</span>
            <span>2025</span>
          </div>
          <div className="map-legend" style={{ marginTop: 6 }}>
            {['High', 'Middle', 'Low'].map((k) => (
              <span key={k} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <span style={{ width: 10, height: 10, background: incomeColor[k], borderRadius: 2 }} />
                {k}
              </span>
            ))}
          </div>
          <h2 style={{ marginTop: '1.4rem' }}>Who got the Tier 1 money</h2>
          {parents.length ? (
            <ul className="bars" style={{ maxHeight: 260 }}>
              {parents.map(([p, v]) => {
                const f = data.firmByParent.get(p)
                return (
                  <li key={p}>
                    <Link to={f ? `/firm/${f.slug}` : exploreHref({ iso3s: [iso] })} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '0.3rem 0.2rem' }}>
                      <div className="bl-top">
                        <span className="bl-name">{parentName(p)}</span>
                        <span className="bl-val">{usdM(v, 0)}</span>
                      </div>
                      <div className="bl-track">
                        <div className="bl-fill" style={{ width: `${(v / parents[0][1]) * 100}%`, background: '#B05A2B' }} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="small muted">No Tier 1 money in {name}.</p>
          )}
        </div>
      </div>

      <div className="pf-grid even">
        <div className="panel">
          <h2>Regulation timeline</h2>
          <div className="panel-sub">H3-core UPF measures in force (one designated source per domain). Binding in deep teal, voluntary in pale teal.</div>
          <RegTimeline events={reg} deals={t1Deals.filter((d) => d.year != null).map((d) => ({ year: d.year!, v: d.t1 ?? d.sc_t1 ?? 0 }))} />
        </div>
        <div className="panel">
          <h2>The deals</h2>
          <div className="panel-sub">
            {deals.length} food-manufacturing deals, largest first. Tier 1 deals are tagged. Each links to the lender’s disclosure.
          </div>
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            {deals.map((d) => (
              <DealLine key={d.id} d={d} />
            ))}
            {!deals.length && <p className="muted small">No food-manufacturing deals recorded.</p>}
          </div>
        </div>
      </div>

      <ProfileLinks
        links={[
          { to: exploreHref({ iso3s: [iso] }), label: `Explore ${name}’s Tier 1 deals` },
          { to: exploreHref({ iso3s: [iso], scope: 'food' }), label: 'All food-manufacturing deals' },
        ]}
      />
      <p style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn" onClick={goSwimlane}>
          See {name} in the regulation × lending swimlanes (Act 4)
        </button>
      </p>
    </div>
  )
}

function RegTimeline({ events, deals }: { events: RegEvent[]; deals: { year: number; v: number }[] }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()
  const domains = [...new Set(events.map((e) => e.domain))].sort()
  const minY = Math.min(2010, ...events.map((e) => e.year!))
  const x = d3.scaleLinear().domain([minY - 0.5, 2026.5]).range([0, Math.max(0, width - 150)])
  if (!events.length)
    return (
      <div ref={ref}>
        <p className="small muted">No H3-core UPF regulation recorded for this country, 2010–2025.</p>
      </div>
    )
  const rMax = Math.sqrt(Math.max(1, ...deals.map((d) => d.v)))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {width > 0 && (
        <>
          {domains.map((dom) => (
            <div className="pf-reg-row" key={dom}>
              <span>{dom}</span>
              <svg width="100%" height={26} style={{ overflow: 'visible' }} aria-label={`${dom}: ${events.filter((e) => e.domain === dom).map((e) => `${e.strength} ${e.year}`).join(', ')}`}>
                <line x1={0} x2="100%" y1={13} y2={13} stroke="#E7E1D6" />
                {events
                  .filter((e) => e.domain === dom)
                  .map((e) => {
                    const binding = e.strength === 'Binding'
                    const end = e.end ?? 2026
                    return (
                      <g key={e.id} onPointerEnter={(ev) => show(ev, <><div className="tt-title">{e.domain} · {e.year}</div><div>{e.detail}</div><div style={{ color: '#a9b0c0', marginTop: 4 }}>{e.strength}{e.end ? `, ended ${e.end}` : ''}</div></>)} onPointerMove={move} onPointerLeave={hide}>
                        <rect x={x(e.year!)} y={9} width={Math.max(2, x(end) - x(e.year!))} height={8} rx={2} fill={binding ? '#0F6E6E' : '#9ED3CF'} opacity={e.strength.includes('future') || e.strength.includes('not') ? 0.35 : 0.85} />
                        <circle cx={x(e.year!)} cy={13} r={5} fill={binding ? '#0F6E6E' : '#9ED3CF'} stroke="#fff" strokeWidth={1.5} />
                      </g>
                    )
                  })}
              </svg>
            </div>
          ))}
          <div className="pf-reg-row" style={{ borderBottom: 0 }}>
            <span style={{ color: '#9A4A1F', fontWeight: 650 }}>Tier 1 deals</span>
            <svg width="100%" height={30} style={{ overflow: 'visible' }}>
              {deals.map((d, i) => (
                <circle key={i} cx={x(d.year)} cy={15} r={3 + (Math.sqrt(d.v) / rMax) * 9} fill="#B05A2B" opacity={0.75} stroke="#fff" />
              ))}
            </svg>
          </div>
          <svg width={Math.max(0, width - 150)} height={18} style={{ marginLeft: 150 - 2, overflow: 'visible' }}>
            {d3.range(Math.ceil(minY / 5) * 5, 2027, 5).map((y) => (
              <text key={y} x={x(y)} y={12} textAnchor="middle" fontSize={10.5} fill="#5E6472">
                {y}
              </text>
            ))}
          </svg>
        </>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
