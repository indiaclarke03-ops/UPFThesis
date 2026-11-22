/**
 * Act 6 · Mexico. Three lanes on one year axis: regulation in force, public
 * money to food manufacturers, and lawsuits against health regulation filed
 * (Lighthouse Reports). Funded firms that litigated are highlighted.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo } from 'react'
import { Tooltip, useTooltip } from '../components/ui'
import { parentName, type Deal, type Lawsuit, type RegEvent } from '../lib/data'
import { usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { lenderColor, motion } from '../lib/tokens'

export const MEX_MILESTONES = [
  { year: 2014, label: 'Sugary-drink tax' },
  { year: 2020, label: 'Warning labels' },
  { year: 2024, label: 'Supreme Court rulings' },
]

export function MexicoTimeline({
  deals,
  regulation,
  lawsuits,
  stage,
  fundedLitigants,
}: {
  deals: Deal[] // MEX food-manufacturing deals
  regulation: RegEvent[]
  lawsuits: Lawsuit[] // Mexico
  /** 0 regulation · 1 + money · 2 + lawsuits · 3 highlight funded litigants */
  stage: number
  fundedLitigants: string[] // parent groups both funded in Mexico and litigating
}) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const phone = width < 560
  const height = phone ? 360 : 520
  const margin = { left: phone ? 6 : 92, right: 14, top: 14, bottom: 26 }
  const x = d3.scaleLinear().domain([2009.5, 2025.5]).range([margin.left, width - margin.right])
  const lane = {
    reg: { y: margin.top, h: height * 0.24 },
    money: { y: margin.top + height * 0.27, h: height * 0.22 },
    law: { y: margin.top + height * 0.52, h: height * 0.4 },
  }
  const dur = reduce ? 0 : motion.base / 1000

  const regDomains = useMemo(() => Array.from(new Set(regulation.map((e) => e.domain))), [regulation])
  const money = deals.filter((d) => (d.amount ?? 0) > 0 && d.year)
  const rM = d3.scaleSqrt().domain([0, 80]).range([0, phone ? 16 : 22])

  // lawsuit dot cloud: stacked columns per filed year
  const dots = useMemo(() => {
    const byYear = d3.group(
      lawsuits.filter((l) => l.filed),
      (l) => l.filed!,
    )
    const out: { l: Lawsuit; x: number; y: number }[] = []
    const colW = Math.max(6, (x(2011) - x(2010)) * 0.82)
    const s = phone ? 3.6 : 5.2
    const perRow = Math.max(1, Math.floor(colW / s))
    for (const [yr, ls] of byYear) {
      // funded litigants at the bottom so they read first
      const sorted = [...ls].sort((a, b) => Number(fundedLitigants.includes(b.parent ?? '')) - Number(fundedLitigants.includes(a.parent ?? '')))
      sorted.forEach((l, i) => {
        const col = i % perRow
        const row = Math.floor(i / perRow)
        out.push({ l, x: x(yr) - colW / 2 + s / 2 + col * s, y: lane.law.y + lane.law.h - s / 2 - row * s })
      })
    }
    return { out, s }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawsuits, width, height, fundedLitigants])

  const byYear = d3.rollup(lawsuits, (v) => v.length, (l) => l.filed ?? 0)
  const laneLabel = (y: number, t: string, sub: string, color: string, on: boolean) =>
    !phone ? (
      <g opacity={on ? 1 : 0.3}>
        <text x={0} y={y + 12} fontSize={10.5} fontWeight={700} letterSpacing="0.06em" fill={color}>
          {t}
        </text>
        <text x={0} y={y + 26} fontSize={10} fill="#5E6472">
          {sub}
        </text>
      </g>
    ) : (
      <text x={margin.left} y={y + 10} fontSize={10} fontWeight={700} letterSpacing="0.06em" fill={color} opacity={on ? 1 : 0.3}>
        {t}
      </text>
    )

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Mexico: regulation, public money and lawsuits on one timeline, 2010 to 2025">
          {/* year grid */}
          {d3.range(2010, 2026, phone ? 3 : 1).map((yr) => (
            <g key={yr}>
              <line x1={x(yr)} x2={x(yr)} y1={margin.top} y2={height - margin.bottom} stroke="#E7E1D6" strokeDasharray="2 4" />
              <text x={x(yr)} y={height - 8} textAnchor="middle" fontSize={10.5} fill="#5E6472">
                {phone || yr % 5 === 0 ? yr : `’${String(yr).slice(2)}`}
              </text>
            </g>
          ))}
          {/* milestones */}
          {MEX_MILESTONES.map((ms) => (
            <g key={ms.year}>
              <line x1={x(ms.year)} x2={x(ms.year)} y1={margin.top} y2={height - margin.bottom} stroke="#0F6E6E" strokeWidth={1} opacity={0.5} />
            </g>
          ))}

          {/* ------------- regulation lane */}
          {laneLabel(lane.reg.y, 'REGULATION', 'in force (H4 core)', '#0F6E6E', true)}
          {regDomains.map((dm, i) => {
            const h = (lane.reg.h - 38) / regDomains.length
            const y = lane.reg.y + 36 + i * h
            const evs = regulation.filter((e) => e.domain === dm)
            return evs.map((e) => {
              const bind = e.strength === 'Binding'
              const x0 = x(Math.max(2009.5, e.year ?? 2010))
              return (
                <g key={e.id}>
                  <m.rect
                    x={x0}
                    y={y + 1}
                    height={Math.max(4, h - 3)}
                    rx={2}
                    fill={bind ? '#0F6E6E' : '#9ED3CF'}
                    initial={{ width: 0 }}
                    animate={{ width: x(2025.5) - x0 }}
                    transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : i * 0.08 }}
                    onPointerEnter={(ev) => show(ev, <><div className="tt-title">{e.domain} · {e.strength}</div><div>{e.detail}</div><div style={{ opacity: 0.8 }}>In force {e.year}</div></>)}
                    onPointerMove={move}
                    onPointerLeave={hide}
                  />
                  {!phone && h > 11 && (
                    <text x={x0 + 4} y={y + h / 2} dy="0.32em" fontSize={9.5} fill={bind ? '#FFFDF9' : '#14213D'} pointerEvents="none">
                      {e.domain}
                    </text>
                  )}
                </g>
              )
            })
          })}
          {MEX_MILESTONES.map((ms) => (
            <text key={ms.year} x={x(ms.year) + (ms.year >= 2022 ? -4 : 4)} textAnchor={ms.year >= 2022 ? 'end' : 'start'} y={lane.reg.y + (ms.year >= 2022 ? 30 : 14)} fontSize={phone ? 9.5 : 11} fontWeight={650} fill="#0F6E6E">
              {ms.year} {ms.label}
            </text>
          ))}

          {/* ------------- money lane */}
          {laneLabel(lane.money.y, 'PUBLIC MONEY', 'food manufacturers', '#9A4A1F', stage >= 1)}
          <m.g animate={{ opacity: stage >= 1 ? 1 : 0.12 }} transition={{ duration: dur }}>
            {money.map((d) => {
              const same = money.filter((o) => o.year === d.year)
              const idx = same.indexOf(d)
              const off = same.length > 1 ? (idx - (same.length - 1) / 2) * (phone ? 26 : 34) : 0
              const firstNat = money.find((o) => o.parent === 'Naturasol' && o.tier1) === d
              const lit = fundedLitigants.includes(d.parent ?? '')
              const r = Math.max(3.5, rM(d.amount ?? 0))
              const cy = lane.money.y + lane.money.h / 2 + 10 + off
              const sc = d.measure === 'supply-chain'
              const dim = stage >= 3 && !lit
              return (
                <g key={d.id} opacity={dim ? 0.3 : 1} style={{ transition: 'opacity 500ms' }}>
                  <circle
                    cx={x(d.year!)}
                    cy={cy}
                    r={r}
                    fill={sc ? '#FFFDF9' : lenderColor[d.lender]}
                    fillOpacity={0.9}
                    stroke={lenderColor[d.lender]}
                    strokeWidth={sc ? 2.5 : 1}
                    strokeDasharray={sc ? '3 2' : undefined}
                    onPointerEnter={(e) =>
                      show(
                        e,
                        <>
                          <div className="tt-title">{d.company}</div>
                          <div className="tt-row"><span>{d.lender}, {d.year}</span><span>{usdM(d.amount)}</span></div>
                          <div>{sc ? 'Supply-chain finance (separate measure)' : d.tier1 ? 'Core Tier 1' : 'Food manufacturing, not Tier 1'}</div>
                          <div style={{ opacity: 0.8 }}>{parentName(d.parent)}</div>
                        </>,
                      )
                    }
                    onPointerMove={move}
                    onPointerLeave={hide}
                    onPointerDown={(e) => show(e, <div className="tt-title">{d.company}: {usdM(d.amount)}</div>)}
                  />
                  {(lit || firstNat) && (idx === 0 || same.length === 1) && (
                    <text x={x(d.year!)} y={firstNat ? cy + r + 13 : cy - r - 5} textAnchor="middle" fontSize={phone ? 9.5 : 10.5} fontWeight={lit && stage >= 3 ? 700 : 550} fill={lit && stage >= 3 ? '#9A4A1F' : '#14213D'}>
                      {firstNat ? 'Naturasol (3 deals)' : shortCo(d)}
                    </text>
                  )}
                </g>
              )
            })}
          </m.g>

          {/* ------------- lawsuit lane */}
          {laneLabel(lane.law.y, 'LAWSUITS FILED', 'vs health rules (Lighthouse)', '#5C1A1B', stage >= 2)}
          <m.g animate={{ opacity: stage >= 2 ? 1 : 0.08 }} transition={{ duration: dur }}>
            {dots.out.map(({ l, x: cx, y: cy }, i) => {
              const funded = fundedLitigants.includes(l.parent ?? '')
              const hot = stage >= 3 && funded
              return (
                <m.rect
                  key={l.id}
                  x={cx - dots.s / 2 + 0.5}
                  y={cy - dots.s / 2 + 0.5}
                  width={dots.s - 1}
                  height={dots.s - 1}
                  rx={dots.s / 2}
                  fill={hot ? '#B05A2B' : l.parent ? '#A4483A' : '#9AA0A6'}
                  initial={false}
                  animate={{ opacity: stage >= 3 && !funded ? 0.35 : 1, scale: hot ? 1.35 : 1 }}
                  transition={{ duration: dur, delay: reduce || stage < 2 ? 0 : Math.min(i * 0.002, 0.4) }}
                  onPointerEnter={(e) =>
                    show(
                      e,
                      <>
                        <div className="tt-title">{l.case ?? 'Case'} ({l.filed})</div>
                        <div>{l.plaintiff}</div>
                        <div style={{ opacity: 0.8 }}>{l.law}</div>
                        <div style={{ opacity: 0.8 }}>{l.court}</div>
                        {l.parent && <div>Parent group: {parentName(l.parent)}</div>}
                      </>,
                    )
                  }
                  onPointerMove={move}
                  onPointerLeave={hide}
                />
              )
            })}
            {[...byYear].filter(([yr, n]) => yr && n >= 10).map(([yr, n]) => {
              const top = d3.min(dots.out.filter((d) => d.l.filed === yr), (d) => d.y) ?? lane.law.y
              return (
                <text key={yr} x={x(yr)} y={top - 8} textAnchor="middle" fontSize={phone ? 10 : 12} fontWeight={700} fill="#5C1A1B">
                  {n}
                </text>
              )
            })}
          </m.g>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

function shortCo(d: Deal) {
  const p = parentName(d.parent)
  if (/PepsiCo/i.test(p)) return 'PepsiCo Mexico'
  if (/Sigma/i.test(p)) return 'Sigma'
  return p
}
