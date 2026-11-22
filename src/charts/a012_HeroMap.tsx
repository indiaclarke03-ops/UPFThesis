/**
 * Act 0 hero background: one copper dot per Tier 1 deal (153), sized by
 * sqrt(money), drifting onto a faint Equal Earth world map. Regional deals
 * cluster near their region. Reduced motion → dots start in place.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo } from 'react'
import type { Deal, SiteData } from '../lib/data'
import { countryName, parentName } from '../lib/data'
import { usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { useWorld, SMALL_COUNTRY_CENTROIDS } from './geo'
import { Tooltip, useTooltip } from '../components/ui'

/** Approximate [lon, lat] for regional / multi-country deals. */
const REGION_LONLAT: Record<string, [number, number]> = {
  'Southern Europe Subregion': [16, 41],
  'Africa Region': [22, 2],
  'Cen Afr, and Anglophne W Africa Region': [4, 7],
  'Central Asia and Turkiye Region': [58, 42],
}

// deterministic pseudo-random
const rand = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export function HeroMap({ data }: { data: SiteData }) {
  const world = useWorld()
  const reduce = useReducedMotion()
  const [ref, { width, height }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()

  const t1 = useMemo(() => data.deals.filter((d) => d.tier1), [data.deals])

  const geo = useMemo(() => {
    if (!world || width === 0 || height === 0) return null
    const proj = d3.geoEqualEarth()
    const wide = width > 760
    // frame the region where the money goes (Americas to East Asia)
    proj.fitExtent(
      [
        [wide ? width * 0.3 : width * 0.02, height * (wide ? 0.1 : 0.06)],
        [width * 0.98, height * (wide ? 0.92 : 0.98)],
      ],
      { type: 'MultiPoint', coordinates: [[-105, -38], [125, 62]] } as d3.GeoPermissibleObjects,
    )
    const path = d3.geoPath(proj)
    const byNum = new Map(world.countries.map((f) => [f.id, f]))
    const centroid = new Map<string, [number, number]>()
    for (const c of data.countries) {
      const f = c.num ? byNum.get(c.num) : undefined
      let p: [number, number] | null = null
      if (f) {
        // largest polygon centroid (avoid e.g. overseas territories)
        const g = f.geometry
        if (g.type === 'MultiPolygon') {
          let best = -1
          for (const poly of g.coordinates) {
            const sub = { type: 'Polygon', coordinates: poly } as d3.GeoPermissibleObjects
            const a = d3.geoArea(sub)
            if (a > best) {
              best = a
              p = proj(d3.geoCentroid(sub)) as [number, number]
            }
          }
        } else p = path.centroid(f as never) as [number, number]
      } else if (SMALL_COUNTRY_CENTROIDS[c.iso3]) p = proj(SMALL_COUNTRY_CENTROIDS[c.iso3]) as [number, number]
      if (p && Number.isFinite(p[0])) centroid.set(c.iso3, p)
    }
    const r = d3
      .scaleSqrt()
      .domain([0, d3.max(t1, (d) => d.t1 ?? 0) ?? 1])
      .range([1.6, Math.max(9, width / 85)])
    // spiral-pack dots of each location
    const counts = new Map<string, number>()
    const sorted = [...t1].sort((a, b) => (b.t1 ?? 0) - (a.t1 ?? 0))
    const dots = sorted.map((d, i) => {
      const key = d.iso3 ?? d.country ?? 'regional'
      const k = counts.get(key) ?? 0
      counts.set(key, k + 1)
      let base: [number, number] | undefined = d.iso3 ? centroid.get(d.iso3) : undefined
      if (!base) {
        const ll = REGION_LONLAT[d.country ?? ''] ?? [20, 30]
        base = proj(ll) as [number, number]
      }
      const ang = k * 2.39996
      const rad = Math.sqrt(k) * Math.max(4, width / 260)
      return {
        d,
        x: base[0] + Math.cos(ang) * rad,
        y: base[1] + Math.sin(ang) * rad,
        r: r(Math.max(0.5, d.t1 ?? d.sc_t1 ?? 0)),
        x0: width * (0.15 + rand(i) * 0.7),
        y0: -40 - rand(i + 500) * height * 0.4,
        delay: 0.4 + rand(i + 1000) * 1.8,
        regional: d.regional,
      }
    })
    return { path, dots, sphere: path({ type: 'Sphere' } as d3.GeoPermissibleObjects) ?? '' }
  }, [world, width, height, data.countries, t1])

  const onDot = (e: React.PointerEvent, d: Deal) => {
    show(
      e,
      <>
        <div className="tt-title">{d.company}</div>
        <div className="tt-row">
          <span>Group</span>
          <span>{parentName(d.parent)}</span>
        </div>
        <div className="tt-row">
          <span>{d.lender}, {d.year}</span>
          <span>{usdM(d.t1 || d.sc_t1)}</span>
        </div>
        <div className="tt-row">
          <span>Where</span>
          <span>{d.regional ? `${d.country} (regional)` : countryName(d.country)}</span>
        </div>
      </>,
    )
  }

  return (
    <div ref={ref} className="a012-hero-map" aria-hidden="true">
      {geo && world && (
        <svg width={width} height={height}>
          <defs>
            <radialGradient id="a012-glow">
              <stop offset="0%" stopColor="#E9B48F" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#B05A2B" stopOpacity={0} />
            </radialGradient>
          </defs>
          <m.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }}>
            {world.countries.map((f) => (
              <path key={f.id + (f.properties?.name ?? '')} d={geo.path(f as never) ?? ''} fill="#15213A" stroke="#1E2C49" strokeWidth={0.5} />
            ))}
          </m.g>
          <g>
            {geo.dots.map((p, i) => (
              <m.circle
                key={p.d.id}
                initial={reduce ? { cx: p.x, cy: p.y, opacity: 0.85 } : { cx: p.x0, cy: p.y0, opacity: 0 }}
                animate={{ cx: p.x, cy: p.y, opacity: 0.85 }}
                transition={reduce ? { duration: 0 } : { duration: 2.4, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
                r={p.r}
                fill={p.regional ? 'none' : '#C8692F'}
                stroke={p.regional ? '#E9B48F' : '#0B1426'}
                strokeWidth={p.regional ? 1.2 : 0.6}
                strokeDasharray={p.regional ? '2 2' : undefined}
                style={{ pointerEvents: 'auto', cursor: 'pointer', mixBlendMode: 'screen' }}
                onPointerEnter={(e) => onDot(e, p.d)}
                onPointerDown={(e) => onDot(e, p.d)}
                onPointerMove={move}
                onPointerLeave={hide}
                data-i={i}
              />
            ))}
          </g>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
