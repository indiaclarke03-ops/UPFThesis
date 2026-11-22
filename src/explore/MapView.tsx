/**
 * Equal Earth choropleth of the filtered money by country. Click to filter.
 * Below 640 px the map becomes a ranked list.
 */
import * as d3 from 'd3'
import { useMemo } from 'react'
import { geoEqualEarth, geoPath } from 'd3'
import { useWorld } from '../charts/geo'
import { Skeleton, Tooltip, useTooltip } from '../components/ui'
import type { Scope } from '../lib/aggregate'
import { countryName, type Deal, type SiteData } from '../lib/data'
import { usdM } from '../lib/format'
import { useIsPhone, useSize } from '../lib/hooks'

interface Props {
  data: SiteData
  deals: Deal[]
  scope: Scope
  selected: string[]
  onToggle: (iso3: string) => void
  perCapita: boolean
}

export function MapView({ data, deals, scope, selected, onToggle, perCapita }: Props) {
  const world = useWorld()
  const phone = useIsPhone()
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()

  const byIso = useMemo(() => {
    const m = new Map<string, { usd: number; n: number }>()
    for (const d of deals) {
      if (!d.iso3) continue
      const v = scope === 't1' ? d.t1 ?? 0 : d.food ?? 0
      const e = m.get(d.iso3) ?? { usd: 0, n: 0 }
      e.usd += v
      e.n += 1
      m.set(d.iso3, e)
    }
    return m
  }, [deals, scope])

  // average population per country (for per-1,000-people view)
  const popAvg = useMemo(() => {
    const m = new Map<string, { s: number; n: number }>()
    for (const r of data.countryYear) {
      if (!r.pop) continue
      const e = m.get(r.iso3) ?? { s: 0, n: 0 }
      e.s += r.pop
      e.n += 1
      m.set(r.iso3, e)
    }
    return new Map([...m].map(([k, v]) => [k, v.s / v.n]))
  }, [data.countryYear])

  const metric = (iso: string) => {
    const e = byIso.get(iso)
    if (!e || e.usd <= 0) return 0
    if (!perCapita) return e.usd
    const p = popAvg.get(iso)
    return p ? (e.usd * 1e6) / p * 1000 : 0
  }
  const fmt = (v: number) => (perCapita ? `US$${d3.format(',.0f')(v)} per 1,000 people` : usdM(v))

  const numToIso = useMemo(() => new Map(data.countries.filter((c) => c.num).map((c) => [c.num!, c.iso3])), [data.countries])
  const max = d3.max([...byIso.keys()].map(metric)) || 1
  const color = d3.scaleSequentialSqrt([0, max], d3.interpolateRgb('#F3DCC9', '#5C1A1B'))
  const regional = deals.filter((d) => !d.iso3).reduce((s, d) => s + (scope === 't1' ? d.t1 ?? 0 : d.food ?? 0), 0)

  const ranked = [...byIso.keys()]
    .map((iso) => ({ iso, v: metric(iso), n: byIso.get(iso)!.n }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)

  if (phone) {
    const top = ranked.slice(0, 15)
    return (
      <div ref={ref}>
        <ol className="rank-list">
          {top.map((r, i) => (
            <li key={r.iso}>
              <button type="button" onClick={() => onToggle(r.iso)} aria-pressed={selected.includes(r.iso)}>
                <span className="muted">{i + 1}</span>
                <span>
                  {countryName(data.countryByIso.get(r.iso)?.name)}
                  <span style={{ display: 'block', height: 4, marginTop: 3, borderRadius: 2, width: `${(r.v / ranked[0].v) * 100}%`, background: color(r.v) }} />
                </span>
                <span className="num" style={{ fontWeight: 600 }}>
                  {perCapita ? d3.format(',.0f')(r.v) : usdM(r.v, 0)}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {regional > 0 && <p className="small muted" style={{ marginTop: 8 }}>Plus {usdM(regional)} in regional deals with no single country.</p>}
      </div>
    )
  }

  const h = Math.max(240, width * 0.5)
  const proj = geoEqualEarth()
  if (world && width > 0) proj.fitExtent([[2, 2], [width - 2, h - 2]], { type: 'Sphere' } as d3.GeoPermissibleObjects)
  const path = geoPath(proj)

  return (
    <div ref={ref} className="map-wrap">
      {!world || width === 0 ? (
        <Skeleton height={300} />
      ) : (
        <svg width={width} height={h} role="group" aria-label={`Map of ${perCapita ? 'money per 1,000 people' : 'money'} by country. Top: ${ranked.slice(0, 3).map((r) => `${countryName(data.countryByIso.get(r.iso)?.name)} ${fmt(r.v)}`).join('; ')}.`}>
          <path d={path({ type: 'Sphere' } as d3.GeoPermissibleObjects) ?? ''} fill="#FBFAF7" stroke="#E7E1D6" />
          <path d={path(d3.geoGraticule10()) ?? ''} fill="none" stroke="#EFEBE3" strokeWidth={0.5} />
          {world.countries.map((c) => {
            const iso = numToIso.get(c.id)
            const v = iso ? metric(iso) : 0
            const sel = iso ? selected.includes(iso) : false
            const dim = selected.length > 0 && !sel
            const clickable = !!iso && !!data.countryByIso.get(iso)?.n_food
            return (
              <path
                key={c.id + c.properties.name}
                className="country"
                d={path(c as unknown as d3.GeoPermissibleObjects) ?? ''}
                fill={v > 0 ? color(v) : '#E9E4DA'}
                stroke={sel ? '#14213D' : '#FBFAF7'}
                strokeWidth={sel ? 1.4 : 0.5}
                opacity={dim && v > 0 ? 0.55 : 1}
                tabIndex={v > 0 ? 0 : -1}
                role={v > 0 ? 'button' : undefined}
                aria-label={v > 0 && iso ? `${countryName(data.countryByIso.get(iso)?.name)}: ${fmt(v)}` : undefined}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
                onClick={() => clickable && iso && onToggle(iso)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && iso && clickable) {
                    e.preventDefault()
                    onToggle(iso)
                  }
                }}
                onPointerEnter={(e) => {
                  if (!iso) return
                  const cc = data.countryByIso.get(iso)
                  const e2 = byIso.get(iso)
                  show(
                    e,
                    <>
                      <div className="tt-title">{countryName(cc?.name ?? c.properties.name)}</div>
                      {e2 ? (
                        <>
                          <div className="tt-row"><span>{scope === 't1' ? 'Tier 1 money' : 'Food mfg money'}</span><span>{usdM(e2.usd)}</span></div>
                          {perCapita && <div className="tt-row"><span>Per 1,000 people</span><span>US${d3.format(',.0f')(v)}</span></div>}
                          <div className="tt-row"><span>Deals</span><span>{e2.n}</span></div>
                        </>
                      ) : (
                        <div className="muted" style={{ color: '#a9b0c0' }}>No deals in the current filter</div>
                      )}
                      {cc?.first_binding && <div className="tt-row"><span>First binding UPF rule</span><span>{cc.first_binding}</span></div>}
                      {clickable && <div style={{ color: '#e9b48f', marginTop: 4 }}>Click to filter</div>}
                    </>,
                  )
                }}
                onPointerMove={move}
                onPointerLeave={hide}
              />
            )
          })}
          <path d={path(world.borders) ?? ''} fill="none" stroke="#FBFAF7" strokeWidth={0.4} pointerEvents="none" />
        </svg>
      )}
      <div className="map-legend" style={{ marginTop: 6 }}>
        <span>{perCapita ? 'US$ per 1,000 people' : 'US$m, 2024 prices'}</span>
        <span>0</span>
        <span className="ramp" style={{ background: `linear-gradient(90deg, ${color(0)}, ${color(max / 4)}, ${color(max)})` }} />
        <span>{perCapita ? d3.format(',.0f')(max) : usdM(max, 0)}</span>
        {regional > 0 && <span style={{ marginLeft: 'auto' }}>+ {usdM(regional)} regional (no single country)</span>}
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}
