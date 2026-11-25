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
        <SplitBar caught={res.caught} total={total} from={from} threshold={threshold} />

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
        <Cumulative rows={byYear} from={from} />
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

/** Caught vs missed, as one labelled bar. */
function SplitBar({ caught, total, from, threshold }: { caught: number; total: number; from: number; threshold: 20 | 50 }) {
  const share = total ? caught / total : 0
  const missed = Math.max(0, total - caught)
  const why = from > 2010 && threshold === 50 ? 'before the screen, or band B' : from > 2010 ? 'approved before the screen' : threshold === 50 ? 'band B firms (20–50% NOVA 4)' : ''
  return (
    <div className="sim-split" aria-hidden="true">
      <div className="sim-split-bar">
        <m.div className="sim-split-caught" initial={false} animate={{ width: `${share * 100}%` }} transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}>
          {share > 0.18 && <span>Caught {usdBn(caught)}</span>}
        </m.div>
        <div className="sim-split-missed">{share < 0.82 && <span>Missed {usdBn(missed)}</span>}</div>
      </div>
      <div className="sim-split-legend">
        <span><b className="copper">{(share * 100).toFixed(0)}%</b> caught</span>
        {missed > 0.5 && <span className="muted">{(100 - share * 100).toFixed(0)}% missed{why ? `: ${why}` : ''}</span>}
      </div>
    </div>
  )
}

/** Cumulative money over time: everything lent vs what the screen would have stopped. */
function Cumulative({ rows, from }: { rows: { y: number; total: number; caught: number }[]; from: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  let a = 0
  let c = 0
  const cum = rows.map((r) => ({ y: r.y, all: (a += r.total), caught: (c += r.caught) }))
  const H = 170
  const mg = { t: 22, r: width < 520 ? 10 : 118, b: 22, l: 44 }
  const x = d3.scaleLinear().domain([2010, 2025]).range([mg.l, Math.max(mg.l + 20, width - mg.r)])
  const y = d3.scaleLinear().domain([0, d3.max(cum, (d) => d.all) || 1]).nice().range([H - mg.b, mg.t])
  const areaAll = d3.area<(typeof cum)[number]>().x((d) => x(d.y)).y0(y(0)).y1((d) => y(d.all)).curve(d3.curveMonotoneX)
  const areaC = d3.area<(typeof cum)[number]>().x((d) => x(d.y)).y0(y(0)).y1((d) => y(d.caught)).curve(d3.curveMonotoneX)
  const last = cum[cum.length - 1]
  const midMiss = last.all - last.caught
  return (
    <div ref={ref} style={{ marginTop: '0.75rem' }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={`Cumulative Tier 1 money reached ${usdBn(last.all)} by 2025; a screen adopted in ${from} would have caught ${usdBn(last.caught)}.`}>
          <text x={mg.l} y={11} fontSize={11} fill="#5E6472">Cumulative money, 2010–2025</text>
          {y.ticks(3).map((t) => (
            <g key={t}>
              <line x1={mg.l} x2={width - mg.r} y1={y(t)} y2={y(t)} stroke="#E7E1D6" strokeDasharray={t ? '2 3' : undefined} />
              <text x={mg.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill="#5E6472">{t ? usdAxis(t) : '0'}</text>
            </g>
          ))}
          <path d={areaAll(cum) ?? ''} fill="url(#sim-hatch)" stroke="#9AA0A6" strokeWidth={1} />
          <defs>
            <pattern id="sim-hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={6} height={6} fill="#F1EEE8" />
              <line x1={0} y1={0} x2={0} y2={6} stroke="#C9C3B7" strokeWidth={1.4} />
            </pattern>
          </defs>
          <m.path initial={false} animate={{ d: areaC(cum) ?? '' }} transition={{ duration: reduce ? 0 : 0.55 }} fill="#B05A2B" opacity={0.92} />
          {from > 2010 && <line x1={x(from)} x2={x(from)} y1={mg.t} y2={H - mg.b} stroke="#14213D" strokeDasharray="3 3" />}
          {from > 2010 && (
            <text x={x(from) + 4} y={mg.t + 8} fontSize={10.5} fill="#14213D">screen starts {from}</text>
          )}
          {width >= 520 && (
            <>
              <text x={width - mg.r + 8} y={y(last.all)} dy="0.32em" fontSize={11.5} fontWeight={650} fill="#5E6472">All {usdBn(last.all)}</text>
              <text x={width - mg.r + 8} y={Math.max(y(last.caught), y(last.all) + 16)} dy="0.32em" fontSize={11.5} fontWeight={700} fill="#9A4A1F">Caught {usdBn(last.caught)}</text>
              {midMiss > 200 && (
                <text x={width - mg.r + 8} y={(y(last.all) + y(last.caught)) / 2 + 14} dy="0.32em" fontSize={10.5} fill="#5E6472">missed {usdBn(midMiss)}</text>
              )}
            </>
          )}
          {[2010, 2015, 2020, 2025].map((t) => (
            <text key={t} x={x(t)} y={H - 5} fontSize={10} textAnchor="middle" fill="#5E6472">{t}</text>
          ))}
        </svg>
      )}
    </div>
  )
}
