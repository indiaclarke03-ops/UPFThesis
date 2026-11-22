/**
 * Act 4 · Regulation × lending swimlanes. One lane per country:
 * regulation band (voluntary pale teal → binding deep teal), H4-core measures
 * as small marks, and Tier 1 deals as copper circles sized by money.
 * `Swimlane` is reusable (country pages); `SwimlaneSet` adds defaults + search.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Tooltip, useTooltip } from '../components/ui'
import { countryName, parentName, type SiteData } from '../lib/data'
import { usdM } from '../lib/format'
import { useInView, useReducedMotion, useSize } from '../lib/hooks'
import { DOMAIN_COLOR } from './a34_util'

const Y0 = 2010
const Y1 = 2025
const rScale = d3.scaleSqrt().domain([0, 450]).range([2.5, 15]).clamp(true)

export function Swimlane({ data, iso3, axis = false, height = 62 }: { data: SiteData; iso3: string; axis?: boolean; height?: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const [vref, seen] = useInView<HTMLDivElement>(0.2)
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const c = data.countryByIso.get(iso3)
  const deals = useMemo(() => data.deals.filter((d) => d.iso3 === iso3 && d.tier1 && d.year != null).sort((a, b) => a.year! - b.year!), [data.deals, iso3])
  const events = useMemo(() => data.regulation.filter((e) => e.iso3 === iso3 && e.year != null).sort((a, b) => a.year! - b.year!), [data.regulation, iso3])
  const h = height + (axis ? 18 : 0)
  const pad = 10
  const x = d3.scaleLinear().domain([Y0, Y1 + 1]).range([pad, Math.max(pad + 10, width - pad)])
  const bandY = height / 2 - 7
  const bandH = 14

  const fb = c?.first_binding ?? null
  const fv = c?.first_voluntary ?? null
  const volStart = fv != null ? Math.max(fv, Y0) : null
  const volEnd = fb != null ? Math.max(fb, Y0) : Y1 + 1
  const bindStart = fb != null ? Math.max(fb, Y0) : null

  // jitter deals in the same year
  const placed = useMemo(() => {
    const seenY = new Map<number, number>()
    return deals.map((d) => {
      const k = seenY.get(d.year!) ?? 0
      seenY.set(d.year!, k + 1)
      return { d, k }
    })
  }, [deals])
  const dur = reduce ? 0 : 0.6
  const grow = seen || reduce

  return (
    <div ref={(el) => { ref.current = el; vref.current = el }} className="lane-svg" style={{ width: '100%', minWidth: 0 }}>
      {width > 0 && (
        <svg width={width} height={h} role="img" aria-label={`${countryName(c?.name ?? iso3)}: ${fb ? `first binding UPF rule in force ${fb}` : 'no binding UPF rule'}; ${deals.length} Tier 1 deals.`}>
          {/* year grid */}
          {d3.range(Y0, Y1 + 1, 5).map((y) => (
            <line key={y} x1={x(y)} x2={x(y)} y1={4} y2={height - 4} stroke="#E7E1D6" strokeDasharray="2 3" />
          ))}
          {/* baseline: no rule */}
          <rect x={x(Y0)} y={bandY} width={x(Y1 + 1) - x(Y0)} height={bandH} fill="#EFEBE3" rx={3} />
          {volStart != null && volStart < volEnd && (
            <m.rect
              x={x(volStart)}
              y={bandY}
              height={bandH}
              fill="#9ED3CF"
              rx={3}
              initial={false}
              animate={{ width: grow ? x(volEnd) - x(volStart) : 0 }}
              transition={{ duration: dur, ease: [0.22, 0.61, 0.36, 1] }}
            />
          )}
          {bindStart != null && (
            <m.rect
              x={x(bindStart)}
              y={bandY}
              height={bandH}
              fill="#0F6E6E"
              rx={3}
              initial={false}
              animate={{ width: grow ? x(Y1 + 1) - x(bindStart) : 0 }}
              transition={{ duration: dur, delay: reduce ? 0 : 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            />
          )}
          {fb != null && fb < Y0 && width >= 500 && (
            <text x={x(Y0) + 6} y={bandY + bandH / 2} dy="0.34em" fontSize={10} fill="#fff" fontWeight={600}>
              binding since {fb}
            </text>
          )}
          {/* regulation measures */}
          {events
            .filter((e) => e.year! >= Y0 && e.year! <= Y1)
            .map((e, i) => (
              <path
                key={e.id}
                d={`M${x(e.year! + 0.5)},${bandY - 3} l-4,-6 h8 z`}
                fill={e.strength === 'Binding' ? DOMAIN_COLOR[e.domain] ?? '#0F6E6E' : '#9ED3CF'}
                stroke="#F7F5F1"
                strokeWidth={0.5}
                transform={`translate(${(i % 2) * 0},0)`}
                onPointerEnter={(ev) =>
                  show(
                    ev,
                    <>
                      <div className="tt-title">{e.domain} · {e.year}</div>
                      <div>{e.strength}</div>
                      {e.detail && <div style={{ opacity: 0.85, marginTop: 3 }}>{e.detail}</div>}
                    </>,
                  )
                }
                onPointerMove={move}
                onPointerLeave={hide}
              />
            ))}
          {/* deals */}
          {placed.map(({ d, k }, i) => {
            const cx = x(d.year! + 0.5) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 7
            const rr = rScale(d.t1 || d.sc_t1 || d.amount || 0)
            return (
              <m.circle
                key={d.id}
                cx={cx}
                cy={bandY + bandH / 2}
                initial={false}
                animate={{ r: grow ? rr : 0 }}
                transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.6 + i * 0.04 }}
                fill="#B05A2B"
                fillOpacity={d.supply_chain ? 0.35 : 0.85}
                stroke={d.binding === 1 ? '#fff' : '#14213D'}
                strokeWidth={1}
                onPointerEnter={(ev) =>
                  show(
                    ev,
                    <>
                      <div className="tt-title">{d.company}</div>
                      <div className="tt-row"><span>{d.year} · {d.lender}</span><span>{usdM(d.t1 || d.sc_t1 || d.amount)}</span></div>
                      <div className="tt-row"><span>Parent</span><span>{parentName(d.parent)}</span></div>
                      <div className="tt-row"><span>Binding rule at approval</span><span>{d.binding === 1 ? 'Yes' : 'No'}</span></div>
                      {d.supply_chain && <div style={{ opacity: 0.8 }}>Supply-chain finance (separate measure)</div>}
                    </>,
                  )
                }
                onPointerMove={move}
                onPointerLeave={hide}
              />
            )
          })}
          {axis &&
            d3.range(Y0, Y1 + 1, width < 500 ? 5 : 1).map((y) => (
              <text key={y} x={x(y + 0.5)} y={h - 4} fontSize={10} textAnchor="middle" fill="#5E6472">
                {width < 500 || y % 5 === 0 ? y : `’${String(y).slice(2)}`}
              </text>
            ))}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

const DEFAULTS = ['MEX', 'TUR', 'CHL', 'EGY', 'BGD']

export function SwimlaneSet({ data }: { data: SiteData }) {
  const [lanes, setLanes] = useState<string[]>(DEFAULTS)
  const [q, setQ] = useState('')
  const options = useMemo(
    () => data.countries.filter((c) => c.in_sample).map((c) => ({ iso3: c.iso3, name: countryName(c.name), n: c.n_t1 })).sort((a, b) => a.name.localeCompare(b.name)),
    [data.countries],
  )
  const add = (val: string) => {
    const v = val.trim().toLowerCase()
    const hit = options.find((o) => o.name.toLowerCase() === v || o.iso3.toLowerCase() === v) ?? options.find((o) => o.name.toLowerCase().startsWith(v))
    if (hit && !lanes.includes(hit.iso3)) setLanes((l) => [...l, hit.iso3])
    setQ('')
  }
  return (
    <div>
      <div className="lanes-head">
        <div className="lane-legend" aria-hidden="true">
          <span><i style={{ width: 18, height: 10, background: '#EFEBE3', display: 'inline-block', borderRadius: 2 }} /> No rule</span>
          <span><i style={{ width: 18, height: 10, background: '#9ED3CF', display: 'inline-block', borderRadius: 2 }} /> Voluntary</span>
          <span><i style={{ width: 18, height: 10, background: '#0F6E6E', display: 'inline-block', borderRadius: 2 }} /> Binding in force</span>
          <span><svg width={10} height={8}><path d="M5,8 l-4,-6 h8 z" fill="#0F6E6E" /></svg> A measure enters into force</span>
          <span><svg width={14} height={14}><circle cx={7} cy={7} r={6} fill="#B05A2B" /></svg> Tier 1 deal (size = money)</span>
        </div>
        <form className="lane-search" onSubmit={(e) => { e.preventDefault(); add(q) }} role="search">
          <label htmlFor="lane-q" className="sr-only">Add a country</label>
          <input id="lane-q" list="lane-opts" placeholder="Add a country…" value={q} onChange={(e) => setQ(e.target.value)} onInput={(e) => { const v = (e.target as HTMLInputElement).value; if (options.some((o) => o.name === v)) add(v) }} />
          <datalist id="lane-opts">
            {options.map((o) => (
              <option key={o.iso3} value={o.name}>{o.n ? `${o.n} Tier 1 deals` : 'no Tier 1 deals'}</option>
            ))}
          </datalist>
          <button type="submit" className="btn" style={{ padding: '0.4rem 0.8rem' }}>Add</button>
        </form>
      </div>
      {lanes.map((iso, i) => {
        const c = data.countryByIso.get(iso)
        return (
          <div className="lane" key={iso}>
            <div className="lane-name">
              <Link to={`/country/${iso}`}>{countryName(c?.name ?? iso)}</Link>
              <span className="muted">
                {c?.first_binding ? `Binding from ${c.first_binding}` : c?.first_voluntary ? `Voluntary from ${c.first_voluntary}` : 'No rule found'} · {c?.n_t1 ?? 0} {c?.n_t1 === 1 ? 'deal' : 'deals'}
              </span>
            </div>
            <Swimlane data={data} iso3={iso} axis={i === lanes.length - 1} />
            <button type="button" className="lane-x" aria-label={`Remove ${countryName(c?.name ?? iso)}`} onClick={() => setLanes((l) => l.filter((x) => x !== iso))}>
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
