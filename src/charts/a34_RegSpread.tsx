/**
 * Act 4 · Regulation spreads. Equal Earth map coloured by the status of
 * H4-core UPF regulation in a given year (none / voluntary / binding), with a
 * strip of binding measures by year and domain below.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo } from 'react'
import { Tooltip, useTooltip } from '../components/ui'
import type { SiteData } from '../lib/data'
import { countryName } from '../lib/data'
import { useReducedMotion, useSize } from '../lib/hooks'
import { useWorld, SMALL_COUNTRY_CENTROIDS } from './geo'
import { DOMAIN_COLOR, DOMAINS } from './a34_util'

const NONE = '#E4DED2'
const VOL = '#9ED3CF'
const BIND = '#0F6E6E'
const NODATA = '#F1EEE8'

export function statusIn(first_binding: number | null, first_voluntary: number | null, year: number) {
  if (first_binding != null && first_binding <= year) return 'binding'
  if (first_voluntary != null && first_voluntary <= year) return 'voluntary'
  return 'none'
}

export type Strength = 'binding' | 'voluntary' | 'both'
export const ALL_DOMAINS = 'All'

/** First binding / voluntary year per iso3 under a domain filter (H4-core events). */
export function firstYears(data: SiteData, domain: string) {
  const m = new Map<string, { b: number | null; v: number | null }>()
  for (const e of data.regulation) {
    if (e.year == null || (domain !== ALL_DOMAINS && e.domain !== domain)) continue
    const isB = e.strength === 'Binding'
    const isV = e.strength === 'Voluntary'
    if (!isB && !isV) continue
    const cur = m.get(e.iso3) ?? { b: null, v: null }
    if (isB) cur.b = cur.b == null ? e.year : Math.min(cur.b, e.year)
    if (isV) cur.v = cur.v == null ? e.year : Math.min(cur.v, e.year)
    m.set(e.iso3, cur)
  }
  return m
}

export function statusFiltered(fy: { b: number | null; v: number | null } | undefined, year: number, strength: Strength) {
  if (!fy) return 'none'
  const b = fy.b != null && fy.b <= year
  const v = fy.v != null && fy.v <= year
  if (strength === 'binding') return b ? 'binding' : 'none'
  if (strength === 'voluntary') return v ? 'voluntary' : 'none'
  return b ? 'binding' : v ? 'voluntary' : 'none'
}

export function RegSpread({
  data,
  year,
  showStrip = true,
  domain = ALL_DOMAINS,
  strength = 'both',
  money = false,
  maxMapH,
  compact = false,
}: {
  maxMapH?: number
  compact?: boolean
  data: SiteData
  year: number
  showStrip?: boolean
  domain?: string
  strength?: Strength
  money?: boolean
}) {
  const world = useWorld()
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()

  const byNum = useMemo(() => new Map(data.countries.filter((c) => c.num).map((c) => [c.num!.padStart(3, '0'), c])), [data.countries])
  const mapH = Math.round(Math.min(width * 0.47, maxMapH ?? Infinity))
  const projection = useMemo(() => {
    const p = d3.geoEqualEarth()
    if (world && width > 0) {
      const land = { type: 'FeatureCollection', features: world.countries.filter((f) => f.id !== '010') } as unknown as d3.GeoPermissibleObjects
      p.fitExtent([[4, 4], [width - 4, mapH - 4]], land)
    }
    return p
  }, [world, width, mapH])
  const path = d3.geoPath(projection)

  const fy = useMemo(() => firstYears(data, domain), [data, domain])
  const st = (iso3: string) => statusFiltered(fy.get(iso3), year, strength)
  const counts = useMemo(() => {
    let b = 0
    let v = 0
    for (const c of data.countries) {
      const s = statusFiltered(fy.get(c.iso3), year, strength)
      if (s === 'binding') b++
      else if (s === 'voluntary') v++
    }
    return { b, v }
  }, [data.countries, fy, year, strength])

  // Tier 1 money committed up to the selected year, by country (display sums only)
  const moneyBy = useMemo(() => {
    const out = new Map<string, number>()
    if (!money) return out
    for (const d of data.deals) if (d.tier1 && d.iso3 && d.year != null && d.year <= year && (d.t1 ?? 0) > 0) out.set(d.iso3, (out.get(d.iso3) ?? 0) + (d.t1 ?? 0))
    return out
  }, [data.deals, money, year])
  const moneyTotal = d3.sum([...moneyBy.values()])
  const rMoney = d3.scaleSqrt().domain([0, 1030]).range([0, Math.max(8, width / 34)])

  const evts = useMemo(
    () =>
      data.regulation.filter(
        (e) =>
          e.year != null &&
          e.year >= 2000 &&
          e.year <= 2025 &&
          (domain === ALL_DOMAINS || e.domain === domain) &&
          (strength === 'voluntary' ? e.strength === 'Voluntary' : strength === 'binding' ? e.strength === 'Binding' : e.strength === 'Binding' || e.strength === 'Voluntary'),
      ),
    [data.regulation, domain, strength],
  )
  const dur = reduce ? 0 : 0.5

  const onCountry = (e: React.PointerEvent, num: string, fallback: string) => {
    const c = byNum.get(num)
    const s = c ? st(c.iso3) : 'none'
    const domains = c ? [...new Set(data.regulation.filter((r) => r.iso3 === c.iso3 && r.strength === 'Binding' && (domain === ALL_DOMAINS || r.domain === domain)).map((r) => `${r.domain} (${r.year})`))] : []
    const mny = c ? moneyBy.get(c.iso3) : undefined
    show(
      e,
      <>
        <div className="tt-title">{countryName(c?.name ?? fallback)}</div>
        <div className="tt-row"><span>Status in {year}</span><span>{s === 'binding' ? 'Binding rule' : s === 'voluntary' ? 'Voluntary only' : 'None found'}</span></div>
        {c && fy.get(c.iso3)?.b != null && <div className="tt-row"><span>First binding rule{domain !== ALL_DOMAINS ? ` (${domain})` : ''}</span><span>{fy.get(c.iso3)!.b}</span></div>}
        {mny != null && <div className="tt-row"><span>Tier 1 money to {year}</span><span>US${mny.toFixed(1)}m</span></div>}
        {domains.length > 0 && <div style={{ marginTop: 4, opacity: 0.85 }}>{domains.slice(0, 5).join('; ')}{domains.length > 5 ? '…' : ''}</div>}
      </>,
    )
  }

  // strip
  const sx = d3.scaleLinear().domain([2000, 2025.9]).range([10, Math.max(20, width - 10)])
  const stacks = useMemo(() => {
    const byYear = d3.group(evts, (e) => e.year!)
    const out: { x: number; i: number; e: (typeof evts)[number] }[] = []
    for (const [y, list] of byYear) {
      list
        .slice()
        .sort((a, b) => DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain))
        .forEach((e, i) => out.push({ x: y, i, e }))
    }
    return out
  }, [evts])
  const r = Math.max(1.8, Math.min(3, width / 380))
  const maxStack = Math.ceil((d3.max(stacks, (d) => d.i + 1) ?? 1) / 2)
  const stripH = Math.ceil(maxStack * (r * 2 + 0.8) + 4)

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: compact ? '0.2rem 0.8rem' : '1.2rem', flexWrap: 'wrap', marginBottom: compact ? 2 : 6 }}>
        <span className="serif" style={{ fontSize: compact ? 'clamp(1.6rem, 3vw, 2.2rem)' : 'clamp(2rem, 4vw, 3rem)', fontWeight: 650, lineHeight: 1 }}>{year}</span>
        <span className="small">
          {strength !== 'voluntary' && <><b style={{ color: BIND }}>{counts.b}</b> countries with a binding rule</>}
          {strength === 'both' && ' · '}
          {strength !== 'binding' && <><b style={{ color: '#2F7F79' }}>{counts.v}</b> voluntary only</>}
          {domain !== ALL_DOMAINS && <span className="muted"> · {domain}</span>}
          {money && <span className="copper"> · US${(moneyTotal / 1000).toFixed(2)}bn Tier 1 money to {year}</span>}
        </span>
      </div>
      {width > 0 && world && (
        <svg width={width} height={mapH} role="img" aria-label={`Map of UPF regulation in ${year}: ${counts.b} countries with a binding rule, ${counts.v} with voluntary measures only.`}>
          <path d={path({ type: 'Sphere' }) ?? ''} fill="none" stroke="#E7E1D6" />
          {world.countries
            .filter((f) => f.id !== '010')
            .map((f) => {
              const c = byNum.get(f.id)
              const s = c ? st(c.iso3) : null
              const fill = !c ? NODATA : s === 'binding' ? BIND : s === 'voluntary' ? VOL : NONE
              return (
                <m.path
                  key={f.id + f.properties.name}
                  d={path(f as never) ?? ''}
                  initial={false}
                  animate={{ fill }}
                  transition={{ duration: dur }}
                  stroke="#F7F5F1"
                  strokeWidth={0.5}
                  onPointerEnter={(e) => onCountry(e, f.id, f.properties.name)}
                  onPointerMove={move}
                  onPointerLeave={hide}
                />
              )
            })}
          {data.countries
            .filter((c) => SMALL_COUNTRY_CENTROIDS[c.iso3] && fy.has(c.iso3))
            .map((c) => {
              const p = projection(SMALL_COUNTRY_CENTROIDS[c.iso3])
              if (!p) return null
              const s = st(c.iso3)
              return (
                <m.circle
                  key={c.iso3}
                  cx={p[0]}
                  cy={p[1]}
                  r={2.6}
                  initial={false}
                  animate={{ fill: s === 'binding' ? BIND : s === 'voluntary' ? VOL : NONE }}
                  stroke="#F7F5F1"
                  strokeWidth={0.6}
                  onPointerEnter={(e) => c.num && onCountry(e, c.num.padStart(3, '0'), c.name)}
                  onPointerMove={move}
                  onPointerLeave={hide}
                />
              )
            })}
          {money &&
            [...moneyBy.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([iso3, v]) => {
                const c = data.countryByIso.get(iso3)
                const f = c?.num ? world.countries.find((w) => w.id === c.num!.padStart(3, '0')) : undefined
                const p = f ? path.centroid(f as never) : SMALL_COUNTRY_CENTROIDS[iso3] ? projection(SMALL_COUNTRY_CENTROIDS[iso3]) : null
                if (!p || Number.isNaN(p[0])) return null
                const s = st(iso3)
                return (
                  <m.circle
                    key={'m' + iso3}
                    cx={p[0]}
                    cy={p[1]}
                    initial={false}
                    animate={{ r: rMoney(v) }}
                    transition={{ duration: dur }}
                    fill="#B05A2B"
                    fillOpacity={0.72}
                    stroke={s === 'binding' ? '#fff' : '#14213D'}
                    strokeWidth={1}
                    onPointerEnter={(e) => c?.num && onCountry(e, c.num.padStart(3, '0'), c.name)}
                    onPointerMove={move}
                    onPointerLeave={hide}
                  />
                )
              })}
        </svg>
      )}
      {!world && <div className="skeleton" style={{ height: mapH || 300 }} />}
      <div className="lane-legend" style={{ margin: '6px 0 0' }} aria-hidden="true">
        <span><i style={{ width: 12, height: 12, background: BIND, display: 'inline-block', borderRadius: 2 }} /> Binding rule in force</span>
        <span><i style={{ width: 12, height: 12, background: VOL, display: 'inline-block', borderRadius: 2 }} /> Voluntary only</span>
        <span><i style={{ width: 12, height: 12, background: NONE, display: 'inline-block', borderRadius: 2 }} /> None found</span>
        {money && <span><i style={{ width: 12, height: 12, background: '#B05A2B', display: 'inline-block', borderRadius: '50%' }} /> Tier 1 money to {year} (white ring = rule in force)</span>}
      </div>

      {showStrip && width > 0 && (
        <svg width={width} height={stripH + 28} style={{ marginTop: 10 }} role="img" aria-label="Binding UPF measures entering into force each year, 2000 to 2025, coloured by domain">
          <text x={10} y={10} fontSize={11} fill="#5E6472">{strength === 'voluntary' ? 'Voluntary' : strength === 'binding' ? 'Binding' : 'Binding and voluntary'} measures entering into force (one dot each)</text>
          <g transform="translate(0,16)">
            <line x1={sx(year + 0.5)} x2={sx(year + 0.5)} y1={0} y2={stripH} stroke="#14213D" strokeDasharray="2 3" />
            {stacks.map(({ x, i, e }) => (
              <m.circle
                key={e.id}
                cx={sx(x + 0.5) + ((i % 2) - 0.5) * (r * 2 + 0.6)}
                cy={stripH - r - Math.floor(i / 2) * (r * 2 + 0.8)}
                r={r}
                fill={e.strength === 'Voluntary' ? '#9ED3CF' : DOMAIN_COLOR[e.domain]}
                initial={false}
                animate={{ opacity: x <= year ? 1 : 0.15 }}
                transition={{ duration: dur }}
                onPointerEnter={(ev) =>
                  show(
                    ev,
                    <>
                      <div className="tt-title">{countryName(e.country)} · {e.year}</div>
                      <div>{e.domain} · {e.strength}</div>
                      {e.detail && <div style={{ opacity: 0.85, marginTop: 3 }}>{e.detail}</div>}
                    </>,
                  )
                }
                onPointerMove={move}
                onPointerLeave={hide}
              />
            ))}
            {[2000, 2005, 2010, 2015, 2020, 2025].map((y) => (
              <text key={y} x={sx(y + 0.5)} y={stripH + 12} fontSize={10.5} textAnchor="middle" fill="#5E6472">{y}</text>
            ))}
          </g>
        </svg>
      )}
      {showStrip && width >= 520 && (
        <div className="lane-legend" aria-hidden="true">
          {DOMAINS.map((d) => (
            <span key={d}><i style={{ width: 9, height: 9, borderRadius: '50%', background: DOMAIN_COLOR[d], display: 'inline-block' }} /> {d}</span>
          ))}
        </div>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
