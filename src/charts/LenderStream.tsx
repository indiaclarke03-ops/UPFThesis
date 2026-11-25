/**
 * Act 2 · Scale. Stacked area of core Tier 1 money by approval year and lender,
 * with four-year period brackets. Sets the visual standard for the site:
 * direct labels, sentence annotations, thin rules, unit on the axis.
 */
import * as d3 from 'd3'
import { motion as m, AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { byYearLender } from '../lib/aggregate'
import type { Deal } from '../lib/data'
import { usdAxis, usdBn, usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { LENDERS, lenderColor, lenderColorOnDark, lenderText, motion, type Lender } from '../lib/tokens'
import { Tooltip, useTooltip } from '../components/ui'

const PERIODS = [
  { key: '2010–13', y0: 2010, y1: 2013 },
  { key: '2014–17', y0: 2014, y1: 2017 },
  { key: '2018–21', y0: 2018, y1: 2021 },
  { key: '2022–25', y0: 2022, y1: 2025 },
]

export interface LenderStreamProps {
  deals: Deal[] // Tier 1 deals
  /** 'total' = single copper area; 'lenders' = stacked by lender; 'periods' = + period brackets */
  mode?: 'total' | 'lenders' | 'periods'
  highlight?: Lender | null
  /** show the "without Coca-Cola İçecek" note */
  showCci?: boolean
  height?: number
  dark?: boolean
  /** overlay period-average steps and the 2010–13 → 2022–25 change arrow */
  trend?: boolean
  /** label the two largest years */
  peaks?: boolean
}

export function LenderStream({ deals, mode = 'periods', highlight = null, showCci = false, height: hProp, dark = false, trend = false, peaks = false }: LenderStreamProps) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const height = hProp ?? Math.max(300, Math.min(520, width * 0.62))
  const margin = { top: 28, right: width < 560 ? 12 : 96, bottom: mode === 'periods' ? 76 : 36, left: 52 }
  const iw = Math.max(0, width - margin.left - margin.right)
  const ih = Math.max(0, height - margin.top - margin.bottom)

  const rows = useMemo(() => byYearLender(deals), [deals])
  const keys = mode === 'total' ? (['total'] as const) : LENDERS
  const series = useMemo(() => {
    const data = rows.map((r) => ({ ...r, total: LENDERS.reduce((s, l) => s + r[l], 0) }))
    return d3.stack<(typeof data)[number], string>().keys(keys as readonly string[]).order(d3.stackOrderNone)(data)
  }, [rows, keys])
  const yMax = d3.max(rows, (r) => LENDERS.reduce((s, l) => s + r[l], 0)) ?? 1

  const x = d3.scaleLinear().domain([2010, 2025]).range([0, iw])
  const y = d3.scaleLinear().domain([0, yMax * 1.08]).nice().range([ih, 0])
  const area = d3
    .area<d3.SeriesPoint<Record<string, number>>>()
    .x((d) => x(d.data.year))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveMonotoneX)

  const periodTotals = PERIODS.map((p) => ({
    ...p,
    usd: rows.filter((r) => r.year >= p.y0 && r.year <= p.y1).reduce((s, r) => s + LENDERS.reduce((a, l) => a + r[l], 0), 0),
  }))
  const dur = reduce ? 0 : motion.base / 1000
  const ink = dark ? '#E9E4DA' : '#14213D'
  const muted = dark ? '#A9B0C0' : '#5E6472'
  const rule = dark ? '#26324D' : '#E7E1D6'

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const bx = (e.currentTarget as SVGRectElement).getBoundingClientRect()
    const yr = Math.round(x.invert(e.clientX - bx.left))
    const r = rows.find((d) => d.year === yr)
    if (!r) return
    setHoverYear(yr)
    const tot = LENDERS.reduce((s, l) => s + r[l], 0)
    show(
      e,
      <>
        <div className="tt-title">{yr}: {usdM(tot)}</div>
        {LENDERS.map((l) => (
          <div className="tt-row" key={l}>
            <span>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: lenderColor[l], marginRight: 6 }} />
              {l}
            </span>
            <span>{usdM(r[l])}</span>
          </div>
        ))}
      </>,
    )
    move(e)
  }

  // label positions: at the year where each lender's band is thickest
  const labels =
    mode === 'total'
      ? []
      : series.map((s) => {
          let best = s[0]
          for (const p of s) if (p[1] - p[0] > best[1] - best[0]) best = p
          return { key: s.key as Lender, x: x(best.data.year), y: y((best[0] + best[1]) / 2), thick: best[1] - best[0] }
        })

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Core Tier 1 money by approval year and lender, 2010 to 2025, US dollars millions at 2024 prices">
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* grid + y axis */}
            {y.ticks(5).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x1={0} x2={iw} stroke={rule} strokeDasharray={t === 0 ? undefined : '2 3'} />
                <text x={-8} dy="0.32em" textAnchor="end" fontSize={11} fill={muted}>
                  {t === 0 ? '0' : usdAxis(t)}
                </text>
              </g>
            ))}
            <text x={-margin.left} y={-12} fontSize={11} fill={muted}>
              US$ per year, 2024 prices
            </text>
            {/* x axis */}
            {d3.range(2010, 2026, width < 560 ? 3 : 1).map((yr) => (
              <text key={yr} x={x(yr)} y={ih + 18} textAnchor="middle" fontSize={11} fill={hoverYear === yr ? ink : muted} fontWeight={hoverYear === yr ? 650 : 400}>
                {width < 560 || yr % 5 === 0 || hoverYear === yr ? yr : `’${String(yr).slice(2)}`}
              </text>
            ))}
            {/* areas */}
            <AnimatePresence initial={false}>
              {series.map((s) => {
                const key = s.key as Lender | 'total'
                const fill = key === 'total' ? '#B05A2B' : lenderColor[key]
                const dim = highlight && key !== highlight
                return (
                  <m.path
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ d: area(s as never) ?? '', opacity: dim ? 0.18 : 0.92 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: dur, ease: motion.ease }}
                    fill={fill}
                    stroke={dark ? '#0B1426' : '#F7F5F1'}
                    strokeWidth={0.75}
                  />
                )
              })}
            </AnimatePresence>
            {/* direct labels */}
            {labels.map((l) =>
              width >= 560 ? (
                <g key={l.key} opacity={highlight && highlight !== l.key ? 0.35 : 1}>
                  <line x1={iw + 4} x2={iw + 12} y1={y(lastMid(series, l.key))} y2={y(lastMid(series, l.key))} stroke={lenderColor[l.key]} />
                  <text x={iw + 16} y={y(lastMid(series, l.key))} dy="0.32em" fontSize={12} fontWeight={650} fill={dark ? lenderColorOnDark[l.key] : lenderText[l.key]}>
                    {l.key}
                  </text>
                </g>
              ) : null,
            )}
            {/* hover rule */}
            {hoverYear != null && <line x1={x(hoverYear)} x2={x(hoverYear)} y1={0} y2={ih} stroke={ink} strokeWidth={0.75} strokeDasharray="3 3" />}
            {/* trend: period-average steps + change arrow */}
            {trend &&
              (() => {
                const avgs = periodTotals.map((p) => ({ ...p, avg: p.usd / (p.y1 - p.y0 + 1) }))
                const first = avgs[0]
                const last = avgs[avgs.length - 1]
                const ratio = first.avg > 0 ? last.avg / first.avg : 0
                const word = ratio >= 1.8 && ratio < 2.3 ? 'roughly doubled' : ratio >= 2.3 ? `about ×${ratio.toFixed(1)}` : ratio > 1 ? `up ×${ratio.toFixed(1)}` : 'down'
                const xa = x(first.y1) - 6
                const xb = x(last.y0) + 6
                const ya = y(first.avg)
                const yb = y(last.avg)
                const midX = (xa + xb) / 2
                const lift = Math.min(ya, yb) - 46
                return (
                  <m.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur, delay: reduce ? 0 : 0.25 }} pointerEvents="none">
                    {avgs.map((p) => (
                      <g key={'avg' + p.key}>
                        <line x1={x(p.y0) - (p.y0 === 2010 ? 0 : 10)} x2={x(p.y1) + (p.y1 === 2025 ? 0 : 10)} y1={y(p.avg)} y2={y(p.avg)} stroke={dark ? '#FFFFFF' : '#14213D'} strokeWidth={2.2} strokeDasharray="6 4" opacity={0.95} />
                        <rect x={(x(p.y0) + x(p.y1)) / 2 - 44} y={y(p.avg) - 22} width={88} height={17} rx={3} fill={dark ? 'rgba(11,20,38,0.8)' : 'rgba(255,253,249,0.92)'} />
                        <text x={(x(p.y0) + x(p.y1)) / 2} y={y(p.avg) - 10} textAnchor="middle" fontSize={10.5} fontWeight={650} fill={ink}>
                          avg {usdAxis(p.avg)}/yr
                        </text>
                      </g>
                    ))}
                    <defs>
                      <marker id="ls-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill="#B05A2B" />
                      </marker>
                    </defs>
                    <path d={`M${xa},${ya - 4} Q${midX},${lift - 20} ${xb},${yb - 26}`} fill="none" stroke="#B05A2B" strokeWidth={2} markerEnd="url(#ls-arrow)" />
                    <rect x={midX - 74} y={lift - 34} width={148} height={22} rx={11} fill="#B05A2B" />
                    <text x={midX} y={lift - 19} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">
                      {`${word} (×${ratio.toFixed(2)})`}
                    </text>
                  </m.g>
                )
              })()}
            {/* peaks */}
            {peaks &&
              [...rows]
                .map((r) => ({ year: r.year, tot: LENDERS.reduce((s2, l) => s2 + r[l], 0) }))
                .sort((a, b) => b.tot - a.tot)
                .slice(0, 2)
                .map((pk) => (
                  <g key={'pk' + pk.year} pointerEvents="none">
                    <circle cx={x(pk.year)} cy={y(pk.tot)} r={3.5} fill={ink} />
                    <text x={x(pk.year)} y={y(pk.tot) - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill={ink}>
                      {pk.year}: {usdAxis(pk.tot)}
                    </text>
                  </g>
                ))}
            {/* period brackets */}
            {mode === 'periods' &&
              periodTotals.map((p, i) => {
                const x0 = x(p.y0) + (i === 0 ? 0 : 4)
                const x1 = x(p.y1) - 4
                const first = i === 0
                const last = i === periodTotals.length - 1
                return (
                  <m.g key={p.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur, delay: reduce ? 0 : i * 0.12 }}>
                    <path d={`M${x0},${ih + 30} v6 H${x1} v-6`} fill="none" stroke={first || last ? '#B05A2B' : muted} strokeWidth={first || last ? 1.5 : 1} />
                    <text x={(x0 + x1) / 2} y={ih + 52} textAnchor="middle" fontSize={width < 560 ? 10.5 : 12.5} fontWeight={first || last ? 700 : 500} fill={first || last ? '#B05A2B' : ink}>
                      {usdBn(p.usd)}
                    </text>
                    <text x={(x0 + x1) / 2} y={ih + 67} textAnchor="middle" fontSize={10.5} fill={muted}>
                      {p.key}
                    </text>
                  </m.g>
                )
              })}
            {/* CCI annotation */}
            {showCci && (
              <m.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur }}>
                <circle cx={x(2024)} cy={y(rows.find((r) => r.year === 2024)!.IFC + rows.find((r) => r.year === 2024)!.EBRD + rows.find((r) => r.year === 2024)!.EIB + rows.find((r) => r.year === 2024)!['IDB Invest'])} r={5} fill="none" stroke={ink} />
                <text x={x(2024) - 10} y={y(yMax) - 2} textAnchor="end" fontSize={12} fill={ink}>
                  <tspan x={x(2024) - 10}>Includes a US$250m Coca-Cola İçecek deal.</tspan>
                  <tspan x={x(2024) - 10} dy="1.25em">Without it, 2022–25 is still US$1.96bn.</tspan>
                </text>
              </m.g>
            )}
            {/* hover capture */}
            <rect width={iw} height={ih} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => { hide(); setHoverYear(null) }} />
          </g>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

function lastMid(series: d3.Series<Record<string, number>, string>[], key: string) {
  const s = series.find((x) => x.key === key)
  if (!s) return 0
  // average midpoint over last 3 years to avoid spikes
  const pts = s.slice(-3)
  return d3.mean(pts, (p) => (p[0] + p[1]) / 2) ?? 0
}
