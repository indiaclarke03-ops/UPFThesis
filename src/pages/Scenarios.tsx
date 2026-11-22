/**
 * /scenarios: Illustrative scenarios. NOT part of the thesis analysis.
 * (a) Counterfactual past: real deals, filtered by a hypothetical screen.
 * (b) Possible futures 2026–2030: simple, fully visible, editable arithmetic.
 * No path is called likely. Front-end arithmetic only.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartFrame, Skeleton, Toggle, Tooltip, useTooltip } from '../components/ui'
import { DEFAULT_FILTERS, byYearLender, exploreHref, filterDeals, screenCaught, sum, sumBy } from '../lib/aggregate'
import { countryName, useData, type Deal } from '../lib/data'
import { usdAxis, usdBn, usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { LENDERS, lenderColor, lenderText, type Lender } from '../lib/tokens'
import { FollowTheMoney } from '../charts/Sankey'
import './x_scenarios.css'

export default function Scenarios() {
  const data = useData()
  if (!data)
    return (
      <div className="container" style={{ paddingTop: 110 }}>
        <Skeleton height={60} style={{ maxWidth: 520, marginBottom: 24 }} />
        <Skeleton height={420} />
      </div>
    )
  const t1 = filterDeals(data.deals, DEFAULT_FILTERS)
  return (
    <div className="xs-page">
      <header className="xs-hero">
        <div className="container">
          <div className="scenario-flag" role="note">
            <span aria-hidden="true">◇</span> Illustrative scenarios · Not part of the thesis analysis
          </div>
          <h1>What if, and what next?</h1>
          <p className="lede" style={{ maxWidth: 720 }}>
            Two thought experiments built on the thesis data. The first re-reads the real 2010–2025 deals through a screen that never
            existed. The second sketches 2026–2030 under assumptions you can see and change. Neither is a finding, and neither is a
            forecast.
          </p>
        </div>
      </header>
      <CounterfactualPast deals={t1} />
      <PossibleFutures deals={t1} />
      <section className="xs-section xs-future" id="follow-the-money">
        <div className="container">
          <div className="kicker">Real data · all Tier 1 deals</div>
          <h2>Follow the money</h2>
          <p className="muted" style={{ maxWidth: 680 }}>
            Every Tier 1 dollar from lender, to the income group of the country at approval, to the parent group, to that group’s
            documented record on health regulation. Hover a flow to trace one lender.
          </p>
          <div className="card" style={{ padding: '1.25rem' }}>
            <FollowTheMoney deals={t1} firmByParent={data.firmByParent} />
          </div>
          <p className="small muted" style={{ marginTop: '0.6rem' }}>
            Core Tier 1 commitments, US$ at 2024 prices. Grade 0 means no evidence found, not no obstruction.{' '}
            <Link to={exploreHref({})}>Filter it in the explorer →</Link>
          </p>
        </div>
      </section>
    </div>
  )
}

const tot = (r: Record<Lender, number>) => LENDERS.reduce((s, l) => s + r[l], 0)

/* ------------------------------------------------------------------ (a) */
function CounterfactualPast({ deals }: { deals: Deal[] }) {
  const [threshold, setThreshold] = useState<20 | 50>(20)
  const [fromYear, setFromYear] = useState(2014)
  const [lenders, setLenders] = useState<Lender[]>([])
  const res = useMemo(() => screenCaught(deals, { threshold, fromYear, lenders }), [deals, threshold, fromYear, lenders])
  const pool = lenders.length ? deals.filter((d) => lenders.includes(d.lender)) : deals
  const all = sum(pool)
  const byLender = sumBy(res.rows, (d) => d.lender)
  const byCountry = [...sumBy(res.rows, (d) => (d.iso3 ? countryName(d.country) : 'Regional deals'))].sort((a, b) => b[1].usd - a[1].usd).slice(0, 10)
  const maxC = byCountry[0]?.[1].usd ?? 1
  const rows = byYearLender(pool)
  const caughtYear = byYearLender(res.rows)
  const maxY = d3.max(rows, (r) => tot(r)) ?? 1

  return (
    <section className="xs-section" aria-labelledby="xs-past">
      <div className="container">
        <div className="kicker">Scenario A · Counterfactual past · real deals, hypothetical rule</div>
        <h2 id="xs-past">If a UPF screen had applied from {fromYear}…</h2>
        <div className="xs-controls card">
          <div className="xs-ctrl">
            <span>Screen threshold (NOVA 4 share of sales)</span>
            <Toggle
              label="Threshold"
              value={threshold}
              onChange={setThreshold}
              options={[
                { value: 20, label: '20% (main)' },
                { value: 50, label: '50% (strict, band A)' },
              ]}
            />
          </div>
          <label className="xs-ctrl">
            <span>
              Screen adopted in <strong className="num">{fromYear}</strong>
            </span>
            <input type="range" min={2010} max={2025} value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} />
          </label>
          <div className="xs-ctrl">
            <span>Lenders applying the screen</span>
            <div className="toggle" role="group" aria-label="Lenders">
              <button type="button" aria-pressed={lenders.length === 0} onClick={() => setLenders([])}>
                All four
              </button>
              {LENDERS.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lenders.includes(l)}
                  onClick={() => setLenders((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))}
                  style={lenders.includes(l) ? { background: lenderColor[l], color: '#fff' } : undefined}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="xs-grid">
          <div>
            <div className="xs-big">
              <span className="big-number copper num">{usdBn(res.caught)}</span>
              <p>
                of public money in {res.deals} Tier 1 deals would have fallen under the screen, out of {usdBn(all)} committed 2010–2025 by{' '}
                {lenders.length ? lenders.join(', ') : 'all four lenders'}.
              </p>
            </div>
            <ChartFrame
              title="Year by year"
              sub="Tier 1 money per year; the copper part falls under the screen"
              summary={`Annual Tier 1 money with the part a ${threshold}% screen adopted in ${fromYear} would have caught: ${usdBn(res.caught)}.`}
              table={{ head: ['Year', 'All Tier 1 (US$m)', 'Caught (US$m)'], rows: rows.map((r, i) => [r.year, tot(r).toFixed(1), tot(caughtYear[i]).toFixed(1)]) }}
              source="Real commitments, US$m at 2024 prices; the screen is hypothetical."
            >
              <YearBars rows={rows.map((r, i) => ({ year: r.year, all: tot(r), caught: tot(caughtYear[i]) }))} max={maxY} fromYear={fromYear} />
            </ChartFrame>
          </div>
          <div className="xs-side">
            <h3 className="chart-title">By lender</h3>
            <p className="small muted" style={{ margin: 0 }}>
              Bar = share of that lender’s Tier 1 money caught
            </p>
            <ul className="xs-bars">
              {LENDERS.filter((l) => !lenders.length || lenders.includes(l)).map((l) => {
                const caught = byLender.get(l)?.usd ?? 0
                const lp = sum(deals.filter((d) => d.lender === l))
                return (
                  <li key={l}>
                    <div className="xs-bar-label">
                      <span style={{ color: lenderText[l], fontWeight: 700 }}>{l}</span>
                      <span className="num">{usdM(caught, 0)}</span>
                    </div>
                    <div className="xs-bar-track">
                      <m.div className="xs-bar-fill" style={{ background: lenderColor[l] }} initial={false} animate={{ width: `${lp ? (caught / lp) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <h3 className="chart-title" style={{ marginTop: '1.75rem' }}>
              Where the money would have stopped
            </h3>
            <ul className="xs-bars">
              {byCountry.map(([c, v]) => (
                <li key={c}>
                  <div className="xs-bar-label">
                    <span>{c}</span>
                    <span className="num">{usdM(v.usd, 0)}</span>
                  </div>
                  <div className="xs-bar-track">
                    <m.div className="xs-bar-fill" style={{ background: 'var(--copper)' }} initial={false} animate={{ width: `${(v.usd / maxC) * 100}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </li>
              ))}
              {byCountry.length === 0 && <li className="muted small">Nothing caught for this selection.</li>}
            </ul>
          </div>
        </div>
        <p className="small muted xs-note">
          How it works: every Tier 1 firm already passes the 20% line (bands A and B), so a 20% screen catches all Tier 1 money from the
          adoption year; a 50% screen catches band A only. Banding is a coding judgement (κ for UPF coding 0.35; 0.55 without “Unsure”).
        </p>
      </div>
    </section>
  )
}

function YearBars({ rows, max, fromYear }: { rows: { year: number; all: number; caught: number }[]; max: number; fromYear: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const h = 260
  const mg = { t: 16, r: 8, b: 24, l: 44 }
  const iw = Math.max(0, width - mg.l - mg.r)
  const ih = h - mg.t - mg.b
  const x = d3.scaleBand<number>().domain(rows.map((r) => r.year)).range([0, iw]).padding(0.18)
  const y = d3.scaleLinear().domain([0, max]).nice().range([ih, 0])
  const xf = (x(fromYear) ?? 0) - (x.step() * x.padding()) / 2
  return (
    <div ref={ref}>
      {width > 0 && (
        <svg width={width} height={h} role="img" aria-label="Tier 1 money per year, with the part the screen would catch">
          <g transform={`translate(${mg.l},${mg.t})`}>
            {y.ticks(4).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={iw} stroke="var(--rule)" strokeDasharray={t ? '2 3' : undefined} />
                <text x={-6} dy="0.32em" textAnchor="end" fontSize={10.5} fill="var(--muted)">
                  {t ? usdAxis(t) : '0'}
                </text>
              </g>
            ))}
            {rows.map((r) => (
              <g
                key={r.year}
                onPointerEnter={(e) =>
                  show(
                    e,
                    <>
                      <div className="tt-title">{r.year}</div>
                      <div className="tt-row">
                        <span>All Tier 1</span>
                        <span>{usdM(r.all)}</span>
                      </div>
                      <div className="tt-row">
                        <span>Caught by screen</span>
                        <span>{usdM(r.caught)}</span>
                      </div>
                    </>,
                  )
                }
                onPointerMove={move}
                onPointerLeave={hide}
              >
                <rect x={x(r.year)} width={x.bandwidth()} y={y(r.all)} height={ih - y(r.all)} fill="var(--paper-deep)" stroke="#D8CDBB" />
                <m.rect
                  x={x(r.year)}
                  width={x.bandwidth()}
                  initial={false}
                  animate={{ y: y(r.caught), height: ih - y(r.caught) }}
                  transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 0.61, 0.36, 1] }}
                  fill="var(--copper)"
                />
                {(width > 560 || r.year % 5 === 0) && (
                  <text x={(x(r.year) ?? 0) + x.bandwidth() / 2} y={ih + 15} textAnchor="middle" fontSize={10} fill="var(--muted)">
                    {width > 560 ? `’${String(r.year).slice(2)}` : r.year}
                  </text>
                )}
              </g>
            ))}
            {fromYear > 2010 && (
              <g pointerEvents="none">
                <line x1={xf} x2={xf} y1={-10} y2={ih} stroke="var(--ink)" strokeDasharray="3 3" />
                <text x={xf + 4} y={-4} fontSize={11} fontWeight={650} fill="var(--ink)">
                  screen in force →
                </text>
              </g>
            )}
          </g>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

/* ------------------------------------------------------------------ (b) */
type PathKey = 'growth' | 'flat' | 'screen'
const PATH_META: Record<PathKey, { label: string; color: string; desc: string }> = {
  growth: { label: 'Trend continues', color: '#B05A2B', desc: 'grows each year at the chosen trend rate' },
  flat: { label: 'Flat', color: '#1F3864', desc: 'stays at the starting level' },
  screen: { label: 'Lender screen', color: '#0F6E6E', desc: 'flat, then screened money removed from the adoption year' },
}
const PATHS = Object.keys(PATH_META) as PathKey[]
const FUT = [2026, 2027, 2028, 2029, 2030]

function PossibleFutures({ deals }: { deals: Deal[] }) {
  const rows = useMemo(() => byYearLender(deals).map((r) => ({ year: r.year, v: tot(r) })), [deals])
  const p1 = d3.sum(rows.filter((r) => r.year <= 2013), (r) => r.v) / 4
  const p4 = d3.sum(rows.filter((r) => r.year >= 2022), (r) => r.v) / 4
  const histGrowth = Math.pow(p4 / p1, 1 / 12) - 1 // 2010–13 average → 2022–25 average, 12 years apart
  const vals = rows.map((r) => r.v)
  const cv = (d3.deviation(vals) ?? 0) / (d3.mean(vals) ?? 1)
  const bandAShare = sum(deals.filter((d) => d.band === 'A')) / sum(deals)

  const [growth, setGrowth] = useState(Math.round(histGrowth * 1000) / 10)
  const [base, setBase] = useState(Math.round(p4))
  const [adopt, setAdopt] = useState(2027)
  const [threshold, setThreshold] = useState<20 | 50>(50)
  const [band, setBand] = useState(Math.round(cv * 100))
  const [shown, setShown] = useState<PathKey[]>(PATHS)

  const screenShare = threshold === 20 ? 1 : bandAShare
  const paths: Record<PathKey, number[]> = {
    growth: FUT.map((y) => base * Math.pow(1 + growth / 100, y - 2025)),
    flat: FUT.map(() => base),
    screen: FUT.map((y) => (y >= adopt ? base * (1 - screenShare) : base)),
  }
  const cum = (k: PathKey) => d3.sum(paths[k])
  const b = band / 100
  const maxCum = Math.max(...PATHS.map(cum)) * (1 + b) || 1

  return (
    <section className="xs-section xs-future" aria-labelledby="xs-future">
      <div className="container">
        <div className="kicker">Scenario B · Possible futures 2026–2030 · illustrative arithmetic</div>
        <h2 id="xs-future">Three paths, none of them a forecast</h2>
        <p className="muted" style={{ maxWidth: 740 }}>
          Each path is a few lines of arithmetic on the 2010–2025 history. Change any assumption below. The shaded ribbon is deliberately
          wide (± {band}%, by default the year-to-year variation of the history) because yearly lending is lumpy. No path is presented as
          more likely than another.
        </p>

        <div className="xs-assume card">
          <div className="xs-assume-head">Assumptions · all editable</div>
          <label className="xs-ctrl">
            <span>
              Starting level, US$m a year <em className="muted">(2022–25 average: {Math.round(p4)})</em>
            </span>
            <input type="number" min={0} max={3000} step={10} value={base} onChange={(e) => setBase(Math.max(0, Number(e.target.value) || 0))} />
          </label>
          <label className="xs-ctrl">
            <span>
              Trend growth <strong className="num">{growth.toFixed(1)}%</strong> a year <em className="muted">(2010–13 → 2022–25 average: {(histGrowth * 100).toFixed(1)}%)</em>
            </span>
            <input type="range" min={-10} max={15} step={0.1} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} />
          </label>
          <label className="xs-ctrl">
            <span>
              Screen adopted in <strong className="num">{adopt}</strong>
            </span>
            <input type="range" min={2026} max={2030} value={adopt} onChange={(e) => setAdopt(Number(e.target.value))} />
          </label>
          <div className="xs-ctrl">
            <span>
              Screen threshold <em className="muted">(removes {(screenShare * 100).toFixed(0)}% of Tier 1 money, the 2010–25 share)</em>
            </span>
            <Toggle label="Screen threshold" value={threshold} onChange={setThreshold} options={[{ value: 20, label: '20%' }, { value: 50, label: '50% (band A)' }]} />
          </div>
          <label className="xs-ctrl">
            <span>
              Uncertainty ribbon <strong className="num">± {band}%</strong>
            </span>
            <input type="range" min={0} max={100} value={band} onChange={(e) => setBand(Number(e.target.value))} />
          </label>
          <div className="xs-ctrl">
            <span>Paths shown</span>
            <div className="toggle" role="group" aria-label="Paths shown">
              {PATHS.map((k) => (
                <button key={k} type="button" aria-pressed={shown.includes(k)} onClick={() => setShown((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} style={shown.includes(k) ? { background: PATH_META[k].color, color: '#fff' } : undefined}>
                  {PATH_META[k].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="xs-grid">
          <ChartFrame
            title="Tier 1 lending per year: history and three illustrative paths"
            sub="History solid (real data); scenarios dashed with a ± ribbon. US$ at 2024 prices."
            summary={`History 2010–2025 and three illustrative paths for 2026–2030. Cumulative 2026–30: trend ${usdBn(cum('growth'))}, flat ${usdBn(cum('flat'))}, screen ${usdBn(cum('screen'))}. Not part of the thesis analysis.`}
            table={{ head: ['Year', 'Trend (US$m)', 'Flat (US$m)', 'Screen (US$m)'], rows: FUT.map((y, i) => [y, paths.growth[i].toFixed(0), paths.flat[i].toFixed(0), paths.screen[i].toFixed(0)]) }}
            source="Illustrative scenario · not part of the thesis analysis."
          >
            <FutureChart hist={rows} paths={paths} shown={shown} band={b} />
          </ChartFrame>
          <div className="xs-side">
            <h3 className="chart-title">Cumulative 2026–2030</h3>
            <p className="small muted" style={{ margin: 0 }}>
              Dot = path value; band = the ribbon range
            </p>
            <ul className="xs-cum">
              {PATHS.map((k) => {
                const c = cum(k)
                return (
                  <li key={k} style={{ opacity: shown.includes(k) ? 1 : 0.35 }}>
                    <div className="xs-bar-label">
                      <span style={{ color: PATH_META[k].color === '#B05A2B' ? '#9A4A1F' : PATH_META[k].color, fontWeight: 700 }}>{PATH_META[k].label}</span>
                      <span className="num">{usdBn(c)}</span>
                    </div>
                    <div className="xs-range">
                      <m.div className="xs-range-band" style={{ background: PATH_META[k].color }} initial={false} animate={{ left: `${((c * (1 - b)) / maxCum) * 100}%`, width: `${((c * 2 * b) / maxCum) * 100}%` }} transition={{ duration: 0.4 }} />
                      <m.div className="xs-range-dot" style={{ background: PATH_META[k].color }} initial={false} animate={{ left: `${(c / maxCum) * 100}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <div className="small muted">
                      {usdBn(c * (1 - b))} to {usdBn(c * (1 + b))}: {PATH_META[k].desc}
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="small muted xs-note">
              For scale: 2010–2025 total was at least {usdBn(sum(deals))} over 16 years. These paths ignore everything the thesis cannot
              see: intermediated lending, new lenders, prices and policy shocks.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FutureChart({ hist, paths, shown, band }: { hist: { year: number; v: number }[]; paths: Record<PathKey, number[]>; shown: PathKey[]; band: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const h = Math.max(300, Math.min(440, width * 0.55))
  const mg = { t: 22, r: width < 560 ? 12 : 112, b: 28, l: 48 }
  const iw = Math.max(0, width - mg.l - mg.r)
  const ih = h - mg.t - mg.b
  const allMax = Math.max(d3.max(hist, (d) => d.v) ?? 1, ...shown.flatMap((k) => paths[k].map((v) => v * (1 + band))))
  const x = d3.scaleLinear().domain([2010, 2030]).range([0, iw])
  const y = d3.scaleLinear().domain([0, allMax]).nice().range([ih, 0])
  const line = d3
    .line<{ year: number; v: number }>()
    .x((d) => x(d.year))
    .y((d) => y(d.v))
    .curve(d3.curveMonotoneX)
  const area = d3
    .area<{ year: number; lo: number; hi: number }>()
    .x((d) => x(d.year))
    .y0((d) => y(d.lo))
    .y1((d) => y(d.hi))
    .curve(d3.curveMonotoneX)
  const last = hist[hist.length - 1]
  const dur = reduce ? 0 : 0.5
  // labels: avoid collisions by nudging
  const ends = PATHS.filter((k) => shown.includes(k))
    .map((k) => ({ k, y: y(paths[k][paths[k].length - 1]) }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14
  return (
    <div ref={ref}>
      {width > 0 && (
        <svg width={width} height={h} role="img" aria-label="Tier 1 lending history and illustrative scenario paths">
          <defs>
            <pattern id="xs-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#C99A00" strokeWidth="1" opacity="0.3" />
            </pattern>
          </defs>
          <g transform={`translate(${mg.l},${mg.t})`}>
            <rect x={x(2025.5)} y={0} width={Math.max(0, iw - x(2025.5))} height={ih} fill="url(#xs-hatch)" />
            <text x={x(2025.5) + 6} y={-8} fontSize={10} fontWeight={700} fill="#6B4A00" letterSpacing="0.06em">
              ILLUSTRATIVE
            </text>
            {y.ticks(5).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={iw} stroke="var(--rule)" strokeDasharray={t ? '2 3' : undefined} />
                <text x={-6} dy="0.32em" textAnchor="end" fontSize={10.5} fill="var(--muted)">
                  {t ? usdAxis(t) : '0'}
                </text>
              </g>
            ))}
            {[2010, 2015, 2020, 2025, 2030].map((yr) => (
              <text key={yr} x={x(yr)} y={ih + 18} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {yr}
              </text>
            ))}
            <path d={line(hist) ?? ''} fill="none" stroke="var(--ink)" strokeWidth={2} />
            <text x={x(2010)} y={-8} fontSize={11} fontWeight={650} fill="var(--ink)">
              History, 2010–2025 (real data)
            </text>
            {PATHS.filter((k) => shown.includes(k)).map((k) => {
              const pts = [{ year: 2025, v: last.v }, ...FUT.map((yr, i) => ({ year: yr, v: paths[k][i] }))]
              const rib = [{ year: 2025, lo: last.v, hi: last.v }, ...FUT.map((yr, i) => ({ year: yr, lo: paths[k][i] * (1 - band), hi: paths[k][i] * (1 + band) }))]
              const ly = ends.find((e) => e.k === k)!.y
              return (
                <g key={k}>
                  <m.path initial={false} animate={{ d: area(rib) ?? '' }} transition={{ duration: dur }} fill={PATH_META[k].color} opacity={0.12} />
                  <m.path initial={false} animate={{ d: line(pts) ?? '' }} transition={{ duration: dur }} fill="none" stroke={PATH_META[k].color} strokeWidth={2.25} strokeDasharray="6 4" />
                  {width >= 560 && (
                    <m.text initial={false} animate={{ y: ly }} transition={{ duration: dur }} x={iw + 8} dy="0.32em" fontSize={11.5} fontWeight={700} fill={PATH_META[k].color}>
                      {PATH_META[k].label}
                    </m.text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}
