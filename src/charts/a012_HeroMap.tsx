/**
 * Act 0 hero background: a full-bleed Equal Earth map with one glowing copper
 * dot per Tier 1 deal (153), sized by sqrt(money). Dots drift in and settle on
 * their country; the largest deals pulse gently. Regional / multi-country
 * deals are dashed rings near their region. Reduced motion → static.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo } from 'react'
import type { Deal, SiteData } from '../lib/data'
import { countryName, parentName } from '../lib/data'
import { usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { heroRadius } from './a012_heroScale'
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


const SPAN = { type: 'MultiPoint', coordinates: [[-125, -40], [150, 70]] } as d3.GeoPermissibleObjects

export function HeroMap({ data }: { data: SiteData }) {
  const world = useWorld()
  const reduce = useReducedMotion()
  const [ref, { width, height }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()

  const t1 = useMemo(() => data.deals.filter((d) => d.tier1), [data.deals])

  const geo = useMemo(() => {
    if (!world || width === 0 || height === 0) return null
    const phone = width < 700
    const proj = d3.geoEqualEarth().rotate([-12, 0])
    if (phone) {
      // crop to where most of the money goes: Europe, MENA, South Asia
      proj.fitExtent(
        [
          [0, height * 0.04],
          [width, height * 0.98],
        ],
        { type: 'MultiPoint', coordinates: [[-12, 8], [95, 56]] } as d3.GeoPermissibleObjects,
      )
    } else {
      // fill the viewport: fit the inhabited world, then scale up to cover
      proj.fitExtent(
        [
          [0, 0],
          [width, height],
        ],
        SPAN,
      )
      const b = d3.geoPath(proj).bounds(SPAN)
      const k = Math.max(width / (b[1][0] - b[0][0]), (height * 0.92) / (b[1][1] - b[0][1]))
      if (k > 1) proj.scale(proj.scale() * k)
      // centre horizontally on 12°E; lift so the southern ocean sits behind the headline
      const b2 = d3.geoPath(proj).bounds(SPAN)
      const [tx, ty] = proj.translate()
      proj.translate([tx + (width - (b2[0][0] + b2[1][0])) / 2, ty - b2[0][1] + height * 0.04])
    }
    const path = d3.geoPath(proj)
    const byNum = new Map(world.countries.map((f) => [f.id, f]))
    const centroid = new Map<string, [number, number]>()
    const funded = new Set(t1.map((d) => d.iso3).filter(Boolean) as string[])
    const fundedNums = new Set<string>()
    for (const c of data.countries) {
      const f = c.num ? byNum.get(c.num) : undefined
      if (f && funded.has(c.iso3)) fundedNums.add(f.id)
      let p: [number, number] | null = null
      if (f) {
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
    const maxUsd = d3.max(t1, (d) => d.t1 ?? 0) ?? 1
    const scaleW = phone ? width * 1.6 : width
    const r = heroRadius(scaleW, maxUsd)
    const counts = new Map<string, number>()
    const sorted = [...t1].sort((a, b) => (b.t1 ?? 0) - (a.t1 ?? 0))
    const top = new Set(sorted.slice(0, 6).map((d) => d.id))
    const dots = sorted.map((d, i) => {
      const key = d.iso3 ?? d.country ?? 'regional'
      const k = counts.get(key) ?? 0
      counts.set(key, k + 1)
      let base: [number, number] | undefined = d.iso3 ? centroid.get(d.iso3) : undefined
      if (!base) base = proj(REGION_LONLAT[d.country ?? ''] ?? [20, 30]) as [number, number]
      const ang = k * 2.39996
      const rad = Math.sqrt(k) * Math.max(5, scaleW / 190)
      return {
        d,
        x: base[0] + Math.cos(ang) * rad,
        y: base[1] + Math.sin(ang) * rad,
        r: r(Math.max(0.5, d.t1 ?? d.sc_t1 ?? 0)),
        x0: base[0] + (rand(i) - 0.5) * width * 0.5,
        y0: base[1] - height * (0.25 + rand(i + 500) * 0.5),
        delay: 0.3 + rand(i + 1000) * 1.6,
        regional: d.regional,
        top: top.has(d.id),
      }
    })
    const graticule = path(d3.geoGraticule10()) ?? ''
    return { path, dots, graticule, fundedNums }
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
          <span>
            {d.lender}, {d.year}
          </span>
          <span>{usdM(d.t1 || d.sc_t1)}</span>
        </div>
        <div className="tt-row">
          <span>Where</span>
          <span>{d.regional ? `${d.country} (regional)` : countryName(d.country)}</span>
        </div>
      </>,
    )
  }

  const settle = (p: { x: number; y: number; x0: number; y0: number; delay: number }, opacity: number) =>
    reduce
      ? { initial: { cx: p.x, cy: p.y, opacity }, transition: { duration: 0 } }
      : { initial: { cx: p.x0, cy: p.y0, opacity: 0 }, transition: { duration: 2.4, delay: p.delay, ease: [0.16, 1, 0.3, 1] as const } }

  return (
    <div ref={ref} className="a012-hero-map" aria-hidden="true">
      {geo && world && (
        <svg width={width} height={height}>
          <defs>
            <filter id="a012-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <radialGradient id="a012-dotfill" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#F6CBA6" />
              <stop offset="55%" stopColor="#DC7638" />
              <stop offset="100%" stopColor="#A9501F" />
            </radialGradient>
          </defs>
          <m.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}>
            <path d={geo.graticule} fill="none" stroke="#18264A" strokeWidth={0.5} />
            {world.countries.map((f) => {
              const fundedC = geo.fundedNums.has(f.id)
              return (
                <path
                  key={f.id + (f.properties?.name ?? '')}
                  d={geo.path(f as never) ?? ''}
                  fill={fundedC ? '#23375F' : '#17253F'}
                  stroke={fundedC ? '#3C5486' : '#253759'}
                  strokeWidth={fundedC ? 0.8 : 0.5}
                />
              )
            })}
          </m.g>
          {/* soft halo under the dots */}
          <g filter="url(#a012-glow)" opacity={0.6} style={{ pointerEvents: 'none' }}>
            {geo.dots
              .filter((p) => !p.regional)
              .map((p) => {
                const s = settle(p, 1)
                return <m.circle key={'h' + p.d.id} r={p.r * 1.2} fill="#E07A3C" initial={s.initial} animate={{ cx: p.x, cy: p.y, opacity: 1 }} transition={s.transition} />
              })}
          </g>
          {/* pulse rings on the six largest deals */}
          {!reduce &&
            geo.dots
              .filter((p) => p.top && !p.regional)
              .map((p, i) => (
                <circle
                  key={'p' + p.d.id}
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  className="a012-pulse"
                  style={{ animationDelay: `${4 + i * 0.7}s`, transformOrigin: `${p.x}px ${p.y}px` }}
                />
              ))}
          <g>
            {geo.dots.map((p) => {
              const s = settle(p, 0.96)
              return (
                <m.circle
                  key={p.d.id}
                  initial={s.initial}
                  animate={{ cx: p.x, cy: p.y, opacity: 0.96 }}
                  transition={s.transition}
                  r={p.r}
                  fill={p.regional ? 'rgba(233,180,143,0.08)' : 'url(#a012-dotfill)'}
                  stroke={p.regional ? '#F0C7A6' : 'rgba(11,20,38,0.55)'}
                  strokeWidth={p.regional ? 1.6 : 0.6}
                  strokeDasharray={p.regional ? '3 2.5' : undefined}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onPointerEnter={(e) => onDot(e, p.d)}
                  onPointerDown={(e) => onDot(e, p.d)}
                  onPointerMove={move}
                  onPointerLeave={hide}
                />
              )
            })}
          </g>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
