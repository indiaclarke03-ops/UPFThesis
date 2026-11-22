/**
 * Act 3 · Screen simulator: "What would a tobacco-style screen have caught?"
 * Recomputed live from deals.json via screenCaught(); display aggregation only.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Info } from '../components/Info'
import { Tooltip, Toggle, useTooltip } from '../components/ui'
import { exploreHref, screenCaught } from '../lib/aggregate'
import type { Deal } from '../lib/data'
import { usdAxis, usdBn, usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { LENDERS, lenderColor, type Lender } from '../lib/tokens'
import { ExploreLink } from '../components/ui'
import { useTween } from './a34_util'

export function ScreenSim({ deals }: { deals: Deal[] }) {
  const [threshold, setThreshold] = useState<20 | 50>(20)
  const [from, setFrom] = useState(2010)
  const [lenders, setLenders] = useState<Lender[]>([...LENDERS])
  const reduce = useReducedMotion()
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()

  const res = useMemo(() => screenCaught(deals, { threshold, fromYear: from, lenders }), [deals, threshold, from, lenders])
  const all = useMemo(() => screenCaught(deals, { threshold: 20, fromYear: 2010, lenders }), [deals, lenders])
  const total = all.pool
  const caughtT = useTween(res.caught)

  const years = d3.range(2010, 2026)
  const byYear = years.map((y) => {
    const pool = deals.filter((d) => d.tier1 && d.year === y && lenders.includes(d.lender))
    const sumT = d3.sum(pool, (d) => d.t1 ?? 0)
    const caught = y >= from ? d3.sum(pool.filter((d) => (threshold === 20 ? ['A', 'B'] : ['A']).includes(d.band ?? '')), (d) => d.t1 ?? 0) : 0
    return { y, total: sumT, caught, n: pool.length }
  })

  const h = 260
  const mg = { t: 16, r: 8, b: 26, l: 44 }
  const iw = Math.max(0, width - mg.l - mg.r)
  const ih = h - mg.t - mg.b
  const x = d3.scaleBand<number>().domain(years).range([0, iw]).padding(0.18)
  const yMax = d3.max(byYear, (d) => d.total) || 1
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([ih, 0])
  const dur = reduce ? 0 : 0.55

  const toggleLender = (l: Lender) =>
    setLenders((cur) => (cur.includes(l) ? (cur.length > 1 ? cur.filter((x) => x !== l) : cur) : [...cur, l]))

  return (
    <div className="sim">
      <div className="sim-controls">
        <div>
          <span className="sim-label">Screen threshold (NOVA 4 share of sales)</span>
          <Toggle
            label="Screen threshold"
            value={threshold}
            onChange={setThreshold}
            options={[
              { value: 20, label: '20% · main (A + B)' },
              { value: 50, label: '50% · strict (A)' },
            ]}
          />
        </div>
        <div>
          <label htmlFor="sim-year">
            Screen adopted in <span style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{from}</span>
          </label>
          <input id="sim-year" className="sim-range" type="range" min={2010} max={2025} step={1} value={from} onChange={(e) => setFrom(Number(e.target.value))} />
          <div className="small muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>2010</span>
            <span>2025</span>
          </div>
        </div>
        <div>
          <span className="sim-label">Lenders</span>
          <div className="sim-chips" role="group" aria-label="Lenders">
            {LENDERS.map((l) => (
              <button key={l} type="button" className="sim-chip" aria-pressed={lenders.includes(l)} onClick={() => toggleLender(l)}>
                <span className="sw" style={{ background: lenderColor[l] }} />
                {l}
              </button>
            ))}
          </div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          The 20% line is the IFC’s own materiality threshold for tobacco-type exposure. Banding is a coding judgement: band B firms sit
          closer to the line, and agreement between coders was moderate.
        </p>
      </div>

      <div>
        <div className="sim-label">
          Money the screen would have caught <Info id="screen" />
        </div>
        <div className="sim-big" aria-live="polite" aria-atomic="true">
          <span className="sr-only">{usdBn(res.caught)}</span>
          <span aria-hidden="true">{usdBn(caughtT)}</span>
        </div>
        <div className="small" style={{ marginTop: '0.35rem' }}>
          <b>{res.deals}</b> deals, {from === 2010 ? '2010–2025' : `${from}–2025`}. That is{' '}
          <b>{total ? ((res.caught / total) * 100).toFixed(0) : 0}%</b> of the {usdBn(total)} of Tier 1 money from{' '}
          {lenders.length === 4 ? 'all four lenders' : lenders.join(', ')}.
        </div>
        <div className="sim-meter" aria-hidden="true">
          <div style={{ width: `${total ? (res.caught / total) * 100 : 0}%` }} />
        </div>

        <div ref={ref} style={{ width: '100%', marginTop: '1rem' }}>
          {width > 0 && (
            <svg width={width} height={h} role="img" aria-label={`Tier 1 money by year; copper shows what a ${threshold}% screen adopted in ${from} would have caught.`}>
              <g transform={`translate(${mg.l},${mg.t})`}>
                {y.ticks(4).map((t) => (
                  <g key={t} transform={`translate(0,${y(t)})`}>
                    <line x2={iw} stroke="#E7E1D6" strokeDasharray={t ? '2 3' : undefined} />
                    <text x={-6} dy="0.32em" textAnchor="end" fontSize={10.5} fill="#5E6472">
                      {t ? usdAxis(t) : '0'}
                    </text>
                  </g>
                ))}
                {from > 2010 && (
                  <m.g initial={false} animate={{ opacity: 1 }}>
                    <rect x={0} y={0} width={(x(from) ?? 0) - x.step() * x.padding() * 0.5} height={ih} fill="#EFEBE3" opacity={0.7} />
                    <text x={4} y={12} fontSize={10.5} fill="#5E6472">
                      before the screen
                    </text>
                  </m.g>
                )}
                {byYear.map((d) => {
                  const bx = x(d.y) ?? 0
                  return (
                    <g
                      key={d.y}
                      onPointerEnter={(e) =>
                        show(
                          e,
                          <>
                            <div className="tt-title">{d.y}</div>
                            <div className="tt-row"><span>Tier 1 money</span><span>{usdM(d.total)}</span></div>
                            <div className="tt-row"><span>Caught by the screen</span><span>{usdM(d.caught)}</span></div>
                            <div className="tt-row"><span>Deals</span><span>{d.n}</span></div>
                          </>,
                        )
                      }
                      onPointerMove={move}
                      onPointerLeave={hide}
                    >
                      <rect x={bx} width={x.bandwidth()} y={y(d.total)} height={ih - y(d.total)} fill="none" stroke="#9AA0A6" strokeDasharray="2 2" />
                      <m.rect
                        x={bx}
                        width={x.bandwidth()}
                        initial={false}
                        animate={{ y: y(d.caught), height: ih - y(d.caught) }}
                        transition={{ duration: dur, ease: [0.22, 0.61, 0.36, 1] }}
                        fill="#B05A2B"
                      />
                      <rect x={bx - 2} width={x.bandwidth() + 4} y={0} height={ih} fill="transparent" />
                      {(width > 560 || d.y % 5 === 0) && (
                        <text x={bx + x.bandwidth() / 2} y={ih + 16} textAnchor="middle" fontSize={10} fill="#5E6472">
                          {width > 560 ? `’${String(d.y).slice(2)}` : d.y}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          )}
        </div>
        <div className="chart-foot">
          <span>
            <span style={{ display: 'inline-block', width: 10, height: 10, background: '#B05A2B', marginRight: 5, verticalAlign: -1 }} />
            caught · <span style={{ display: 'inline-block', width: 10, height: 10, border: '1px dashed #9AA0A6', marginRight: 5, verticalAlign: -1 }} />
            all Tier 1 money. Core commitments, US$ at 2024 prices.
          </span>
          <ExploreLink to={exploreHref({ lenders: lenders.length === 4 ? [] : lenders, y0: from, bands: threshold === 50 ? ['A'] : [] })} label="See these deals" />
        </div>
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}
