/**
 * Act 2 charts: disclosure-gap unit grid, intermediated "fog" bars, parent-group
 * circle pack and the Tier 1 choropleth. Display aggregation only.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Country, SiteData } from '../lib/data'
import { countryName, parentName } from '../lib/data'
import { num1, pct, usdBn, usdM } from '../lib/format'
import { useIsPhone, useReducedMotion, useSize } from '../lib/hooks'
import { LENDERS, incomeColor, lenderColor, lenderText, motion, type Lender } from '../lib/tokens'
import { Info } from '../components/Info'
import { Toggle, Tooltip, useTooltip } from '../components/ui'
import { useWorld } from './geo'
import { PackDownload } from './a012_PackExport'

const rand = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/* ====================================================== disclosure-gap grid */
export function GapGrid({ data, step, parents, onParents }: { data: SiteData; step: number; parents: boolean; onParents: (v: boolean) => void }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const h1 = data.results.computed.h1
  const phone = width < 520
  const cols = 7
  const blockGap = phone ? 8 : 22
  const cell = Math.min(21, Math.max(6, Math.floor((width - blockGap * 3) / (cols * 4))))
  const pad = Math.max(1.5, cell * 0.14)
  const maxRows = Math.max(...LENDERS.map((l) => Math.ceil(h1[l].deals / cols)))
  const gridH = maxRows * cell
  const developed = step >= 1
  const showMoney = step >= 2

  const blocks = LENDERS.map((l, bi) => {
    const n = h1[l].deals
    const lit = h1[l].deals_named
    const x0 = bi * (cols * cell + blockGap)
    const units = d3.range(n).map((i) => ({
      i,
      x: x0 + (i % cols) * cell,
      y: Math.floor(i / cols) * cell,
      lit: i < lit,
      delay: 0.1 + rand(i + bi * 97) * 1.1,
    }))
    return { l, n, lit, x0, units }
  })

  const fmtGap = (l: Lender) => {
    const g = parents ? h1[l].gap_parent : h1[l].gap
    return g == null ? 'n/a' : `${g.toFixed(1)}×`
  }
  const filterId = useId().replace(/:/g, '')

  return (
    <div ref={ref} className="a012-grid-wrap">
      {width > 0 && (
        <svg width={width} height={gridH + 34 + (showMoney ? 104 : 0)} role="img" aria-label={`Unit grid of 153 Tier 1 deals by lender. ${h1.All.deals_named} carry the name of a listed global UPF company.`} style={{ transition: 'height 500ms' }}>
          <defs>
            <filter id={`blur-${filterId}`}>
              <feGaussianBlur stdDeviation={cell * 0.18} />
            </filter>
          </defs>
          {blocks.map((b) => (
            <g key={b.l}>
              <text x={b.x0} y={12} fontSize={12} fontWeight={700} fill={lenderText[b.l]}>
                {b.l}
              </text>
              {!phone && (
                <text x={b.x0 + cols * cell - pad} y={12} fontSize={11} textAnchor="end" fill="var(--muted)">
                  {developed ? `${b.n} deals` : `${b.lit} named`}
                </text>
              )}
              <g transform="translate(0,22)">
                {b.units.map((u) => {
                  const on = u.lit || developed
                  return (
                    <rect
                      key={u.i}
                      className="a012-unit"
                      x={u.x + pad / 2}
                      y={u.y + pad / 2}
                      width={cell - pad}
                      height={cell - pad}
                      rx={Math.min(3, cell * 0.12)}
                      fill={u.lit ? '#14213D' : on ? '#C8692F' : '#E9E3D8'}
                      stroke={u.lit ? '#F2C9A8' : 'none'}
                      strokeWidth={u.lit ? 1.2 : 0}
                      opacity={on ? 1 : 0.55}
                      filter={!u.lit && !on ? `url(#blur-${filterId})` : undefined}
                      style={{ transitionDelay: reduce || u.lit ? '0ms' : `${developed ? u.delay * 1000 : 0}ms` }}
                    />
                  )
                })}
              </g>
              {showMoney && (
                <g transform={`translate(${b.x0},${gridH + 40})`}><m.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                  {(() => {
                    const w = cols * cell - pad
                    const m2 = h1[b.l].m2
                    const m1 = parents ? h1[b.l].m1b : h1[b.l].m1
                    const max = d3.max(LENDERS, (l) => h1[l].m2) ?? 1
                    const bw = (m2 / max) * w
                    return (
                      <>
                        <rect width={bw} height={14} fill="#C8692F" rx={2} />
                        <m.rect animate={{ width: (m1 / max) * w }} transition={{ duration: 0.6 }} height={14} fill="#14213D" rx={2} />
                        {!phone && (
                          <text y={28} fontSize={10.5} fill="var(--muted)">
                            <tspan x={0}>{usdM(m1, 0)} named</tspan>
                            <tspan x={0} dy="1.2em">of {usdM(m2, 0)}</tspan>
                          </text>
                        )}
                        <text y={72} style={{ fontFamily: 'var(--serif)' }} fontSize={phone ? 20 : 30} fontWeight={700} fill={h1[b.l].gap == null ? 'var(--muted)' : b.l === 'EBRD' && !parents ? '#9A4A1F' : 'var(--ink)'}>
                          {fmtGap(b.l)}
                        </text>
                        <text y={88} fontSize={10.5} fill="var(--muted)">
                          {h1[b.l].gap == null ? (phone ? 'none named' : 'no named recipient') : 'gap ratio'}
                        </text>
                      </>
                    )
                  })()}
                </m.g></g>
              )}
            </g>
          ))}
        </svg>
      )}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }} className="small">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 11, height: 11, background: '#14213D', borderRadius: 2 }} /> Visible: borrower named like a global top-30 UPF company
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: developed ? 1 : 0.75 }}>
          <span style={{ width: 11, height: 11, background: '#C8692F', borderRadius: 2 }} /> Hidden: UPF firm not visible by name
        </span>
        {showMoney && (
          <Toggle
            label="Count researched parent companies"
            value={parents ? 'p' : 'n'}
            onChange={(v) => onParents(v === 'p')}
            options={[
              { value: 'n', label: 'Names as published' },
              { value: 'p', label: 'With parent companies' },
            ]}
          />
        )}
      </div>
    </div>
  )
}

/* =============================================================== fog bars */
export function FogBars({ data }: { data: SiteData }) {
  const reduce = useReducedMotion()
  const rows = data.results.computed.intermediated
  const fid = useId().replace(/:/g, '')
  return (
    <div>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id={`fog-${fid}`} x="-10%" y="-40%" width="120%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.09" numOctaves={3} seed={4}>
              {!reduce && <animate attributeName="baseFrequency" dur="14s" values="0.018 0.09;0.024 0.07;0.018 0.09" repeatCount="indefinite" />}
            </feTurbulence>
            <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.63  0 0 0 0 0.66  0 0 0 1.3 -0.15" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>
      {rows.map((r, i) => {
        const direct = 1 - r.share
        return (
          <div key={r.lender} className="a012-fog-row">
            <div>
              <div style={{ fontWeight: 700, color: lenderText[r.lender] }}>{r.lender}</div>
              <div className="small muted num">
                {r.currency} {num1(r.all_bn)}bn
              </div>
            </div>
            <div className="a012-fog-bar" role="img" aria-label={`${r.lender}: ${Math.round(r.share * 100)}% of commitments through financial intermediaries; end borrowers not disclosed.`}>
              <m.div
                initial={{ width: reduce ? `${direct * 100}%` : '0%' }}
                whileInView={{ width: `${direct * 100}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: motion.ease }}
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: lenderColor[r.lender], opacity: 0.9 }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${direct * 100}%`,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, rgba(154,160,166,0.95), rgba(154,160,166,0.55) 55%, rgba(247,245,241,0) 100%)',
                }}
              >
                <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                  <rect width="100%" height="100%" fill="#fff" filter={`url(#fog-${fid})`} opacity={0.9} />
                </svg>
                <span className="a012-fog-label" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 650, color: '#14213D', whiteSpace: 'nowrap', textShadow: '0 0 6px #fff' }}>
                  {r.share > 0.4 ? 'end borrowers not disclosed' : 'not disclosed'}
                </span>
              </div>
            </div>
            <div className="a012-fog-pct num">{Math.round(r.share * 100)}%</div>
          </div>
        )
      })}
      <p className="small muted" style={{ marginTop: '0.4rem' }}>
        Share of all commitments 2010–2025 routed through banks, funds and other financial intermediaries, in each lender’s own currency, nominal
        <Info id="intermediated" />. This money is not claimed to reach UPF firms: it is the part of the portfolio where that cannot be checked.
      </p>
    </div>
  )
}

/* ============================================================ parent pack */
export function ParentPack({ data, step }: { data: SiteData; step: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()
  const c = data.results.computed
  const size = Math.min(width, 620)
  const nodes = useMemo(() => {
    if (size <= 0) return []
    const root = d3
      .hierarchy({ children: data.firms } as { children: typeof data.firms })
      .sum((d) => (d as unknown as { t1?: number }).t1 ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    d3.pack<{ children: typeof data.firms }>().size([size, size]).padding(2.5)(root)
    return (root.leaves() as unknown as d3.HierarchyCircularNode<(typeof data.firms)[number]>[]).map((n, rank) => ({ n, rank }))
  }, [data.firms, size])

  const vmax = nodes.length ? nodes[0].n.data.t1 : 1
  const ramp = d3.scaleSequentialSqrt([0, vmax], d3.interpolateRgbBasis(['#F1DCC9', '#DB9563', '#B05A2B', '#6E2F12']))
  const n2v = (rank: number) => nodes[rank]?.n.data.t1 ?? 0
  const highlight = (rank: number) => {
    if (step === 0) return 'all'
    if (step === 1) return rank < 3 ? 'on' : 'off'
    if (step === 2) return rank < 5 ? 'on' : rank < 10 ? 'mid' : 'off'
    return 'all'
  }
  const fill = (rank: number) => {
    const h = highlight(rank)
    if (h === 'on') return '#B05A2B'
    if (h === 'mid') return '#D98A55'
    if (h === 'off') return '#EAE2D5'
    return ramp(n2v(rank))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {size > 0 && (
        <svg width={width} height={size} role="img" aria-label={`Circle pack of ${c.n_parent_groups} parent groups sized by Tier 1 money.`}>
          <g transform={`translate(${(width - size) / 2},0)`}>
            {nodes.map(({ n, rank }) => {
              const fsz = Math.max(8.5, Math.min(14, n.r / 4.2))
              const longest = Math.max(...shortName(n.data.parent).split('\n').map((t) => t.length), 7)
              const fits = longest * fsz * 0.56 < n.r * 1.8
              const label = fits && n.r > (step === 0 ? 24 : 30) && (step === 0 || highlight(rank) !== 'off')
              const dark = step === 0 ? n.data.t1 > vmax * 0.12 : highlight(rank) !== 'off'
              return (
                <g key={n.data.slug} transform={`translate(${n.x},${n.y})`}>
                  <m.circle
                    r={n.r}
                    animate={{ fill: fill(rank) }}
                    transition={{ duration: 0.5 }}
                    stroke="#F7F5F1"
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                    onPointerEnter={(e) =>
                      show(
                        e,
                        <>
                          <div className="tt-title">{parentName(n.data.parent)}</div>
                          <div className="tt-row">
                            <span>Tier 1 money</span>
                            <span>{usdM(n.data.t1)}</span>
                          </div>
                          <div className="tt-row">
                            <span>Share of total</span>
                            <span>{pct(n.data.t1 / c.t1_core_usd_m)}</span>
                          </div>
                          <div className="tt-row">
                            <span>Deals</span>
                            <span>{n.data.n_t1}</span>
                          </div>
                          <div style={{ opacity: 0.8, marginTop: 4 }}>{n.data.countries.slice(0, 5).map(countryName).join(', ')}{n.data.countries.length > 5 ? '…' : ''}</div>
                        </>,
                      )
                    }
                    onPointerDown={(e) => show(e, <div className="tt-title">{parentName(n.data.parent)}: {usdM(n.data.t1)}</div>)}
                    onPointerMove={move}
                    onPointerLeave={hide}
                  />
                  {label && (
                    <text textAnchor="middle" pointerEvents="none" fill={dark ? '#fff' : '#5C2A12'} fontSize={fsz} fontWeight={650}>
                      {shortName(n.data.parent)
                        .split('\n')
                        .map((t, i, arr) => (
                          <tspan key={i} x={0} dy={i === 0 ? `${-(arr.length - 1) * 0.55 - 0.2}em` : '1.1em'}>
                            {t}
                          </tspan>
                        ))}
                      <tspan x={0} dy="1.25em" fontWeight={500} opacity={0.9}>
                        {usdM(n.data.t1, 0)}
                      </tspan>
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      )}
      <Tooltip tip={tip} />
      <PackDownload data={data} />
    </div>
  )
}

function shortName(p: string) {
  const map: Record<string, string> = {
    'Coca-Cola system': 'Coca-Cola\nsystem',
    'Yildiz Holding (Ulker/pladis)': 'Yıldız/Ülker',
    'PRAN-RFL Group': 'PRAN-RFL',
    'CMI (Corporacion Multi Inversiones)': 'CMI',
    'Muller Group': 'Müller',
    FrieslandCampina: 'Friesland-\nCampina',
    'Danube Foods': 'Danube\nFoods',
    'Atlantic Grupa': 'Atlantic\nGrupa',
  }
  return map[p] ?? parentName(p)
}

/** "Global top-30" share bar: about 22% vs 78%. */
export function NamedShareBar({ data }: { data: SiteData }) {
  const s = data.results.computed.named_list_share
  return (
    <div>
      <div className="a012-income-bar" style={{ height: 46 }} role="img" aria-label={`${pct(s, 0)} to groups on the global top-30 list; ${pct(1 - s, 0)} to other groups.`}>
        <m.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ background: '#14213D', width: `${s * 100}%` }}>
          {pct(s, 0)}
        </m.div>
        <div style={{ flex: 1, background: '#D98A55' }}>{pct(1 - s, 0)}</div>
      </div>
      <div className="small" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <span>Groups on the global top-30 UPF list</span>
        <span style={{ textAlign: 'right' }}>Regional and national champions</span>
      </div>
    </div>
  )
}

/* ============================================================= choropleth */
export function Choropleth({ data }: { data: SiteData }) {
  const world = useWorld()
  const phone = useIsPhone(640)
  const [ref, { width }] = useSize<HTMLDivElement>()
  const [metric, setMetric] = useState<'t1' | 'pc'>('t1')
  const { tip, show, move, hide } = useTooltip()
  const c = data.results.computed

  const byNum = useMemo(() => new Map(data.countries.filter((k) => k.num).map((k) => [k.num as string, k])), [data.countries])
  const val = (k: Country | undefined) => (!k ? 0 : metric === 't1' ? k.t1 : k.t1_per1000 ?? 0)
  const funded = data.countries.filter((k) => k.t1 > 0)
  const max = d3.max(funded, (k) => val(k)) ?? 1
  const color = d3
    .scaleSequentialSqrt()
    .domain([0, max])
    .interpolator(d3.interpolateRgbBasis(['#F3DCC8', '#D98A55', '#B05A2B', '#5C2A12']))

  const height = Math.round(width * 0.5)
  const geo = useMemo(() => {
    if (!world || width === 0) return null
    const land = world.countries.filter((f) => f.id !== '010')
    const proj = d3.geoEqualEarth().fitSize([width, height], { type: 'FeatureCollection', features: land } as never)
    return { path: d3.geoPath(proj), proj, land }
  }, [world, width, height])

  const top5 = c.top_countries.slice(0, 5)
  const rankOf = new Map(top5.map((t, i) => [t.iso3, i + 1]))
  const tipFor = (e: React.PointerEvent, k: Country) =>
    show(
      e,
      <>
        <div className="tt-title">{countryName(k.name)}</div>
        <div className="tt-row">
          <span>Tier 1 money</span>
          <span>{usdM(k.t1)}</span>
        </div>
        <div className="tt-row">
          <span>Per 1,000 people</span>
          <span>{k.t1_per1000 == null ? '—' : `US$${d3.format(',.0f')(k.t1_per1000)}`}</span>
        </div>
        <div className="tt-row">
          <span>Tier 1 deals</span>
          <span>{k.n_t1}</span>
        </div>
        <div className="tt-row">
          <span>Income group 2010</span>
          <span>{k.income2010 ?? '—'}</span>
        </div>
      </>,
    )

  const ranked = [...funded].sort((a, b) => val(b) - val(a))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: 8 }}>
        <Toggle
          label="Map metric"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 't1', label: 'Tier 1 money' },
            { value: 'pc', label: 'Per 1,000 people' },
          ]}
        />
        <span className="small muted">{metric === 't1' ? 'US$m, 2010–2025 total, 2024 prices' : 'US$ per 1,000 people (2010–25 money ÷ average population)'}</span>
      </div>
      {phone ? (
        <ol className="a012-ranked" aria-label="Countries ranked by Tier 1 money">
          {ranked.slice(0, 15).map((k, i) => (
            <li key={k.iso3}>
              <span className="muted num">{i + 1}</span>
              <Link to={`/country/${k.iso3}`}>{countryName(k.name)}</Link>
              <span className="num" style={{ fontWeight: 650 }}>
                {metric === 't1' ? usdM(k.t1, 1) : `US$${d3.format(',.0f')(val(k))}`}
              </span>
              <span className="a012-rbar" style={{ width: `${(val(k) / val(ranked[0])) * 100}%`, background: color(val(k)) }} />
            </li>
          ))}
        </ol>
      ) : (
        <div ref={ref} style={{ position: 'relative' }}>
          {geo && (
            <svg width={width} height={height} role="img" aria-label="World map of Tier 1 money by country">
              {geo.land.map((f) => {
                const k = byNum.get(f.id)
                const v = val(k)
                return (
                  <path
                    key={f.id + f.properties.name}
                    d={geo.path(f as never) ?? ''}
                    fill={k && v > 0 ? color(v) : k?.in_sample ? '#E4DFD6' : '#EFEBE3'}
                    stroke="#F7F5F1"
                    strokeWidth={0.5}
                    style={{ transition: 'fill 500ms', cursor: k && k.t1 > 0 ? 'pointer' : 'default' }}
                    onPointerEnter={(e) => k && tipFor(e, k)}
                    onPointerDown={(e) => k && tipFor(e, k)}
                    onPointerMove={move}
                    onPointerLeave={hide}
                  />
                )
              })}
              {metric === 't1' &&
                top5.map((t) => {
                  const k = data.countryByIso.get(t.iso3)
                  const f = geo.land.find((x) => x.id === k?.num)
                  if (!f) return null
                  const [x, y] = geo.path.centroid(f as never)
                  const ccc = t.iso3 === 'TUR'
                  return (
                    <g key={t.iso3} transform={`translate(${x},${y})`} pointerEvents="none">
                      <circle r={9} fill="#14213D" stroke="#fff" strokeWidth={1.5} />
                      <text textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={700} fill="#fff">
                        {rankOf.get(t.iso3)}
                      </text>
                      {ccc && <circle r={15} fill="none" stroke="#14213D" strokeDasharray="2 2" />}
                    </g>
                  )
                })}
            </svg>
          )}
          <Tooltip tip={tip} />
        </div>
      )}
      <MapLegend color={color} max={max} metric={metric} />
    </div>
  )
}

function MapLegend({ color, max, metric }: { color: (v: number) => string; max: number; metric: 't1' | 'pc' }) {
  const stops = d3.range(0, 1.0001, 0.1).map((t) => t * t * max)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }} className="small muted">
      <span>0</span>
      <span style={{ display: 'flex', height: 10, width: 180, borderRadius: 2, overflow: 'hidden' }}>
        {stops.map((s, i) => (
          <span key={i} style={{ flex: 1, background: color(s) }} />
        ))}
      </span>
      <span className="num">{metric === 't1' ? usdM(max, 0) : `US$${d3.format(',.0f')(max)}`}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
        <span style={{ width: 12, height: 10, background: '#E4DFD6', display: 'inline-block' }} /> food deals but no Tier 1 money
      </span>
    </div>
  )
}

export function TopCountries({ data }: { data: SiteData }) {
  const c = data.results.computed
  const max = c.top_countries[0].usd_m
  return (
    <div>
      <ol className="a012-ranked">
        {c.top_countries.slice(0, 5).map((t, i) => (
          <li key={t.iso3}>
            <span className="num" style={{ display: 'inline-grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', background: '#14213D', color: '#fff', fontSize: 11, fontWeight: 700 }}>
              {i + 1}
            </span>
            <Link to={`/country/${t.iso3}`} style={{ fontWeight: 600 }}>
              {countryName(t.name)}
            </Link>
            <span className="num" style={{ fontWeight: 650 }}>
              {usdM(t.usd_m)}
            </span>
            <span className="a012-rbar" style={{ width: `${(t.usd_m / max) * 100}%` }} />
          </li>
        ))}
      </ol>
      <p className="small" style={{ marginTop: '0.6rem' }}>
        <b>Plus</b> a US$250m regional Coca-Cola İçecek deal booked to “Central Asia and Türkiye”, counted as regional, not in Türkiye’s total
        <Info id="top_countries" />.
      </p>
    </div>
  )
}

export function IncomeBar({ data }: { data: SiteData }) {
  const inc = data.results.computed.by_income_2010
  const order = ['Middle', 'High', 'Low'] as const
  return (
    <div>
      <div className="a012-income-bar" role="img" aria-label={order.map((k) => `${k} income ${Math.round(inc[k].share * 100)}%`).join(', ')}>
        {order.map((k) => (
          <m.div key={k} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ background: incomeColor[k], width: `${inc[k].share * 100}%` }}>
            {Math.round(inc[k].share * 100)}%
          </m.div>
        ))}
      </div>
      <div className="small" style={{ display: 'flex', gap: '0.25rem 1rem', flexWrap: 'wrap' }}>
        {order.map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: incomeColor[k], display: 'inline-block' }} />
            {k} income: {usdBn(inc[k].usd_m)}
          </span>
        ))}
      </div>
    </div>
  )
}
