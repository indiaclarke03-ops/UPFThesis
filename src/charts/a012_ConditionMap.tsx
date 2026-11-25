/**
 * Act 2 · Where it goes. Choropleth of Tier 1 money with direct condition
 * buttons (metric, lender, period, income-group highlight). Everything is
 * recomputed from deals.json (sums only): map colours, legend, numbered
 * top-five markers, the ranked list, the income bar and the regional note.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Country, SiteData } from '../lib/data'
import { countryName } from '../lib/data'
import { usdBn, usdM } from '../lib/format'
import { useIsPhone, useReducedMotion, useSize } from '../lib/hooks'
import { LENDERS, incomeColor, lenderColor, type Lender } from '../lib/tokens'
import { Info } from '../components/Info'
import { ExploreLink, Tooltip, useTooltip } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import { useWorld } from './geo'

type Metric = 'total' | 'pc'
type Period = 'all' | 'early' | 'late'
type Income = 'all' | 'High' | 'Middle' | 'Low'

const PERIODS: Record<Period, { label: string; y0: number; y1: number }> = {
  all: { label: '2010–25', y0: 2010, y1: 2025 },
  early: { label: '2010–17', y0: 2010, y1: 2017 },
  late: { label: '2018–25', y0: 2018, y1: 2025 },
}

const RAMP = ['#F6E3D2', '#E3A57A', '#C46A33', '#8F3F17', '#4A1E0B']

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string; dot?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="a012-seg">
      <span className="a012-seg-label">{label}</span>
      <div className="toggle" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.v} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
            {o.dot && <span className="a012-seg-dot" style={{ background: o.dot }} aria-hidden="true" />}
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ConditionMap({ data }: { data: SiteData }) {
  const world = useWorld()
  const phone = useIsPhone(640)
  const reduce = useReducedMotion()
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()
  const [metric, setMetric] = useState<Metric>('total')
  const [lender, setLender] = useState<Lender | 'all'>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [income, setIncome] = useState<Income>('all')

  // average population 2010–2025 (same denominator as the pipeline)
  const popAvg = useMemo(() => {
    const acc = new Map<string, { s: number; n: number }>()
    for (const r of data.countryYear) {
      if (r.pop == null) continue
      const e = acc.get(r.iso3) ?? { s: 0, n: 0 }
      e.s += r.pop
      e.n += 1
      acc.set(r.iso3, e)
    }
    return new Map([...acc].map(([k, v]) => [k, v.s / v.n]))
  }, [data.countryYear])

  const p = PERIODS[period]
  const pool = useMemo(
    () =>
      data.deals.filter(
        (d) => d.tier1 && (d.t1 ?? 0) > 0 && d.year != null && d.year >= p.y0 && d.year <= p.y1 && (lender === 'all' || d.lender === lender),
      ),
    [data.deals, p.y0, p.y1, lender],
  )
  const byIso = useMemo(() => {
    const mm = new Map<string, { usd: number; n: number }>()
    for (const d of pool) {
      if (!d.iso3) continue
      const e = mm.get(d.iso3) ?? { usd: 0, n: 0 }
      e.usd += d.t1 ?? 0
      e.n += 1
      mm.set(d.iso3, e)
    }
    return mm
  }, [pool])
  const regional = pool.filter((d) => !d.iso3)
  const regionalUsd = d3.sum(regional, (d) => d.t1 ?? 0)
  const cci = regional.find((d) => /coca-cola i[cç]ecek/i.test(d.company ?? ''))

  const val = (iso: string) => {
    const e = byIso.get(iso)
    if (!e) return 0
    if (metric === 'total') return e.usd
    const pop = popAvg.get(iso)
    return pop ? (e.usd * 1e6 * 1000) / pop : 0
  }
  const countries = data.countries.filter((k) => byIso.has(k.iso3))
  const ranked = [...countries].sort((a, b) => val(b.iso3) - val(a.iso3))
  const max = ranked.length ? val(ranked[0].iso3) : 1
  const color = d3.scaleSequentialSqrt().domain([0, max]).interpolator(d3.interpolateRgbBasis(RAMP))
  const top5 = ranked.slice(0, 5)
  const rankOf = new Map(top5.map((k, i) => [k.iso3, i + 1]))
  const fmt = (v: number) => (metric === 'total' ? usdM(v) : `US$${d3.format(',.0f')(v)}`)

  const totalWithCountry = d3.sum([...byIso.values()], (e) => e.usd)
  const incomeShares = (['Middle', 'High', 'Low'] as const).map((g) => {
    const usd = d3.sum(countries.filter((k) => k.income2010 === g), (k) => byIso.get(k.iso3)!.usd)
    return { g, usd, share: totalWithCountry ? usd / totalWithCountry : 0 }
  })

  const height = Math.round(width * 0.5)
  const geo = useMemo(() => {
    if (!world || width === 0) return null
    const land = world.countries.filter((f) => f.id !== '010')
    const proj = d3.geoEqualEarth().fitSize([width, height], { type: 'FeatureCollection', features: land } as never)
    return { path: d3.geoPath(proj), land }
  }, [world, width, height])
  const byNum = useMemo(() => new Map(data.countries.filter((k) => k.num).map((k) => [k.num as string, k])), [data.countries])

  const faded = (k: Country | undefined) => income !== 'all' && k?.income2010 !== income
  const tipFor = (e: React.PointerEvent, k: Country) => {
    const v = byIso.get(k.iso3)
    show(
      e,
      <>
        <div className="tt-title">{countryName(k.name)}</div>
        <div className="tt-row">
          <span>Tier 1 money ({p.label})</span>
          <span>{usdM(v?.usd ?? 0)}</span>
        </div>
        <div className="tt-row">
          <span>Per 1,000 people</span>
          <span>{v ? `US$${d3.format(',.0f')((v.usd * 1e9) / (popAvg.get(k.iso3) ?? Infinity))}` : '—'}</span>
        </div>
        <div className="tt-row">
          <span>Tier 1 deals</span>
          <span>{v?.n ?? 0}</span>
        </div>
        <div className="tt-row">
          <span>Income group 2010</span>
          <span>{k.income2010 ?? '—'}</span>
        </div>
        {lender !== 'all' && <div style={{ color: '#a9b0c0', marginTop: 4 }}>{lender} only</div>}
      </>,
    )
  }

  const condText = `${lender === 'all' ? 'All four lenders' : lender}, ${p.label}${income !== 'all' ? `, ${income.toLowerCase()}-income countries highlighted` : ''}`
  const earlyLate = useMemo(() => {
    const s = (y0: number, y1: number) => d3.sum(data.deals.filter((d) => d.tier1 && d.iso3 && d.year! >= y0 && d.year! <= y1 && (lender === 'all' || d.lender === lender)), (d) => d.t1 ?? 0)
    return { early: s(2010, 2017), late: s(2018, 2025) }
  }, [data.deals, lender])

  return (
    <div className="a012-cmap">
      <div className="a012-cmap-controls" role="group" aria-label="Map conditions">
        <Seg label="Show" value={metric} onChange={setMetric} options={[{ v: 'total', l: 'Total money' }, { v: 'pc', l: 'Per 1,000 people' }]} />
        <Seg
          label="Lender"
          value={lender}
          onChange={setLender}
          options={[{ v: 'all', l: 'All' }, ...LENDERS.map((l) => ({ v: l, l, dot: lenderColor[l] }))]}
        />
        <Seg label="Period" value={period} onChange={setPeriod} options={(Object.keys(PERIODS) as Period[]).map((k) => ({ v: k, l: PERIODS[k].label }))} />
        <Seg
          label="Highlight"
          value={income}
          onChange={setIncome}
          options={[
            { v: 'all', l: 'All countries' },
            { v: 'Middle', l: 'Middle income', dot: incomeColor.Middle },
            { v: 'High', l: 'High', dot: incomeColor.High },
            { v: 'Low', l: 'Low', dot: incomeColor.Low },
          ]}
        />
      </div>

      <div className="a012-cmap-head" aria-live="polite">
        <div>
          <div className="a012-cmap-total num">{usdBn(totalWithCountry + regionalUsd)}</div>
          <div className="small muted">
            Tier 1 money · {condText} · {countries.length} countries
            {regional.length > 0 && ` + ${regional.length} regional deal${regional.length === 1 ? '' : 's'}`}
          </div>
        </div>
        {period === 'all' && (
          <div className="a012-cmap-trend">
            <span className="small muted">2010–17</span>
            <b className="num">{usdBn(earlyLate.early)}</b>
            <span aria-hidden="true" className="a012-cmap-arrow">
              →
            </span>
            <span className="small muted">2018–25</span>
            <b className="num">{usdBn(earlyLate.late)}</b>
            <span className="small" style={{ color: earlyLate.late >= earlyLate.early ? 'var(--copper-text)' : 'var(--muted)' }}>
              {earlyLate.early > 0 ? `${earlyLate.late >= earlyLate.early ? '+' : '−'}${Math.abs(Math.round(((earlyLate.late - earlyLate.early) / earlyLate.early) * 100))}%` : ''} (countries only)
            </span>
          </div>
        )}
      </div>

      <div className="a012-map-grid">
        <div>
          {phone ? (
            <ol className="a012-ranked" aria-label="Countries ranked">
              {ranked.slice(0, 15).map((k, i) => (
                <li key={k.iso3} style={{ opacity: faded(k) ? 0.35 : 1 }}>
                  <span className="muted num">{i + 1}</span>
                  <Link to={`/country/${k.iso3}`}>{countryName(k.name)}</Link>
                  <span className="num" style={{ fontWeight: 650 }}>
                    {fmt(val(k.iso3))}
                  </span>
                  <span className="a012-rbar" style={{ width: `${(val(k.iso3) / max) * 100}%`, background: color(val(k.iso3)) }} />
                </li>
              ))}
            </ol>
          ) : (
            <div ref={ref} style={{ position: 'relative' }}>
              {geo && (
                <svg width={width} height={height} role="group" aria-label={`World map of Tier 1 money, ${condText}`}>
                  {geo.land.map((f) => {
                    const k = byNum.get(f.id)
                    const v = k ? val(k.iso3) : 0
                    const has = !!k && v > 0
                    return (
                      <path
                        key={f.id + f.properties.name}
                        d={geo.path(f as never) ?? ''}
                        fill={has ? color(v) : k?.in_sample ? '#E4DFD6' : '#EFEBE3'}
                        stroke={has && !faded(k) ? '#FFFFFF' : '#F7F5F1'}
                        strokeWidth={has ? 0.7 : 0.5}
                        opacity={faded(k) ? 0.22 : 1}
                        style={{ transition: reduce ? undefined : 'fill 600ms cubic-bezier(0.22,0.61,0.36,1), opacity 500ms', cursor: has ? 'pointer' : 'default' }}
                        onPointerEnter={(e) => k && tipFor(e, k)}
                        onPointerDown={(e) => k && tipFor(e, k)}
                        onPointerMove={move}
                        onPointerLeave={hide}
                      />
                    )
                  })}
                  {top5.map((k) => {
                    const f = geo.land.find((x) => x.id === k.num)
                    if (!f) return null
                    const [x, y] = geo.path.centroid(f as never)
                    return (
                      <m.g key={k.iso3} initial={false} animate={{ x, y, opacity: faded(k) ? 0.3 : 1 }} transition={{ duration: reduce ? 0 : 0.5 }} pointerEvents="none">
                        <circle r={10} fill="#14213D" stroke="#fff" strokeWidth={1.5} />
                        <text textAnchor="middle" dy="0.35em" fontSize={10.5} fontWeight={700} fill="#fff">
                          {rankOf.get(k.iso3)}
                        </text>
                      </m.g>
                    )
                  })}
                </svg>
              )}
              <Tooltip tip={tip} />
            </div>
          )}
          <div className="a012-cmap-legend small muted">
            <span>0</span>
            <span className="a012-cmap-ramp" style={{ background: `linear-gradient(90deg, ${RAMP.join(',')})` }} />
            <span className="num">{fmt(max)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <span style={{ width: 12, height: 10, background: '#E4DFD6', display: 'inline-block' }} /> food deals, no Tier 1 money under these conditions
            </span>
          </div>
          {regional.length > 0 && (
            <p className="small" style={{ marginTop: 6 }}>
              Not on the map: {usdM(regionalUsd)} in {regional.length} regional deal{regional.length === 1 ? '' : 's'}
              {cci ? ', including the US$250m Coca-Cola İçecek deal booked to “Central Asia and Türkiye” (not in Türkiye’s total)' : ''}.
              <Info id="top_countries" />
            </p>
          )}
          {regional.length === 0 && <p className="small muted" style={{ marginTop: 6 }}>No regional deals under these conditions (the US$250m Coca-Cola İçecek deal is excluded).</p>}
        </div>

        <div className="a012-cmap-side">
          <div className="kicker" style={{ marginBottom: 4 }}>
            Top five {metric === 'pc' ? 'per 1,000 people' : 'recipients'}
          </div>
          <ol className="a012-ranked">
            {top5.map((k, i) => (
              <li key={k.iso3} style={{ opacity: faded(k) ? 0.4 : 1 }}>
                <span className="a012-rank-badge num">{i + 1}</span>
                <Link to={`/country/${k.iso3}`} style={{ fontWeight: 600 }}>
                  {countryName(k.name)}
                </Link>
                <span className="num" style={{ fontWeight: 650 }}>
                  {fmt(val(k.iso3))}
                </span>
                <span className="a012-rbar" style={{ width: `${(val(k.iso3) / max) * 100}%`, transition: 'width 500ms' }} />
              </li>
            ))}
          </ol>
          <hr className="rule" style={{ margin: '1.2rem 0' }} />
          <div className="kicker" style={{ marginBottom: 4 }}>
            By income group in 2010 <Info id="income_2010" />
          </div>
          <p className="small" style={{ margin: 0 }}>
            Share of the {usdBn(totalWithCountry)} with a country
          </p>
          <div className="a012-income-bar" role="img" aria-label={incomeShares.map((s) => `${s.g} income ${Math.round(s.share * 100)}%`).join(', ')}>
            {incomeShares.map((s) => (
              <div
                key={s.g}
                style={{
                  background: incomeColor[s.g],
                  color: s.g === 'Low' ? '#14213D' : '#FFFFFF', // light segment needs dark text (AA)
                  width: `${s.share * 100}%`,
                  opacity: income === 'all' || income === s.g ? 1 : 0.3,
                  transition: 'width 600ms, opacity 400ms',
                }}
              >
                {s.share >= 0.07 ? `${Math.round(s.share * 100)}%` : ''}
              </div>
            ))}
          </div>
          <div className="small" style={{ display: 'flex', gap: '0.25rem 1rem', flexWrap: 'wrap' }}>
            {incomeShares.map((s) => (
              <span key={s.g} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: incomeColor[s.g], display: 'inline-block' }} />
                {s.g}: {usdBn(s.usd)}
              </span>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: '0.6rem' }}>
            Descriptive: this shows where the money goes, not what it does to diets.
          </p>
          <ExploreLink
            to={exploreHref({ lenders: lender === 'all' ? [] : [lender], y0: p.y0, y1: p.y1 })}
            label="Open these conditions in the explorer"
          />
        </div>
      </div>
    </div>
  )
}
