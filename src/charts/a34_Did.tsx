/**
 * Act 4 · The difference-in-differences test, explained visually.
 * step 0: the windows (pre 2010–12, treatment 2013–19 dropped, post 2020–25)
 * step 1: the groups (18 binding vs 34 none), one dot per country
 * step 2: the four group means as a slope chart, countries faint behind
 * step 3: zoom in; the dashed "no difference" ghost and where a reduction would sit
 * Means are display aggregates of did_long; the estimate shown is the Stata result.
 */
import * as d3 from 'd3'
import { AnimatePresence, motion as m } from 'framer-motion'
import { useMemo } from 'react'
import type { DidData } from '../lib/data'
import { countryName } from '../lib/data'
import { useReducedMotion, useSize } from '../lib/hooks'
import { Tooltip, useTooltip } from '../components/ui'

const TEAL = '#0F6E6E'
const GREY = '#6B7485'
const INK = '#14213D'
const MUTED = '#5E6472'
const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1]

function jitter(i: number) {
  // deterministic pseudo-random in [-1, 1]
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

export function DidExplainer({ did, step, estimate }: { did: DidData; step: number; estimate: number }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const W = width
  const H = W < 520 ? 330 : Math.max(380, Math.min(560, W * 0.72))
  const dur = reduce ? 0 : 0.7
  const t = (delay = 0) => ({ duration: dur, delay: reduce ? 0 : delay, ease: EASE })

  const mean = (b: 0 | 1, p: 0 | 1) => did.means.find((x) => x.binding === b && x.post === p)!.ln_y
  const bPre = mean(1, 0), bPost = mean(1, 1), nPre = mean(0, 0), nPost = mean(0, 1)
  const ghost = bPre + (nPost - nPre) // parallel-trend counterfactual (no-difference)

  const countries = useMemo(
    () => [...did.countries].sort((a, b) => b.binding - a.binding || a.name.localeCompare(b.name)),
    [did.countries],
  )
  const nB = countries.filter((c) => c.binding === 1).length
  const nN = countries.length - nB

  // layout
  const top = 70 // compact timeline strip
  const bottom = 34
  const left = W < 520 ? 34 : 56
  const right = W < 520 ? 70 : 150
  const plotH = H - top - bottom
  const xPre = left + (W - left - right) * 0.18
  const xPost = left + (W - left - right) * 0.82
  const zoom = step >= 3
  const y = d3.scaleLinear().domain(zoom ? [0, 3.6] : [0, 9.6]).range([top + plotH, top + 10])

  // grid positions for step 1
  const gridPos = (i: number) => {
    const isB = i < nB
    const k = isB ? i : i - nB
    const cols = W < 520 ? (isB ? 5 : 7) : isB ? 6 : 9
    const cell = W < 520 ? 18 : 24
    const gx = isB ? left + 10 : left + (W - left - right) * 0.48
    const gy = top + 70
    return { x: gx + (k % cols) * cell + cell / 2, y: gy + Math.floor(k / cols) * cell + cell / 2 }
  }

  // timeline geometry
  const tx = d3.scaleLinear().domain([2010, 2026]).range([left, W - (W < 520 ? 12 : 40)])
  const big = step === 0
  const tlY = big ? top + plotH * 0.42 : 26
  const tlH = big ? 64 : 16
  const windows = [
    { k: 'pre', a: 2010, b: 2013, label: 'Before', sub: '2010–12', fill: INK },
    { k: 'mid', a: 2013, b: 2020, label: 'Rules arrive (dropped)', sub: '2013–19', fill: '#C9C3B7' },
    { k: 'post', a: 2020, b: 2026, label: 'After', sub: '2020–25', fill: INK },
  ]

  const seriesLines = [
    { k: 'b', pre: bPre, post: bPost, color: TEAL, label: `Binding rule (${nB})` },
    { k: 'n', pre: nPre, post: nPost, color: GREY, label: `No rule (${nN})` },
  ]

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label="Difference-in-differences design and group means">
          <defs>
            <pattern id="a34-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#E7E1D6" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#CFC7B8" strokeWidth="2" />
            </pattern>
          </defs>

          {/* ------------------------------------------------ timeline */}
          {windows.map((w, i) => (
            <g key={w.k}>
              <m.rect
                initial={false}
                animate={{ x: tx(w.a) + 1, y: tlY, width: tx(w.b) - tx(w.a) - 2, height: tlH, opacity: 1 }}
                transition={t()}
                rx={big ? 6 : 3}
                fill={w.k === 'mid' ? 'url(#a34-hatch)' : w.fill}
              />
              <m.text
                initial={false}
                animate={{ x: (tx(w.a) + tx(w.b)) / 2, y: big ? tlY + tlH / 2 - 4 : tlY + tlH / 2 + 1, opacity: 1 }}
                transition={t()}
                textAnchor="middle"
                fontSize={big ? (W < 520 ? 11 : 14) : 10}
                fontWeight={650}
                fill={w.k === 'mid' ? '#5E6472' : '#F7F5F1'}
                dominantBaseline="middle"
              >
                {big || W >= 520 ? w.label : w.k === 'mid' ? 'dropped' : w.label}
              </m.text>
              {big && (
                <m.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={t(0.2 + i * 0.15)} x={(tx(w.a) + tx(w.b)) / 2} y={tlY + tlH / 2 + 14} textAnchor="middle" fontSize={11.5} fill={w.k === 'mid' ? '#5E6472' : '#E9E4DA'}>
                  {w.sub}
                </m.text>
              )}
            </g>
          ))}
          {big && (
            <m.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={t(0.5)}>
              {[2010, 2013, 2020, 2025].map((yr) => (
                <text key={yr} x={tx(yr === 2025 ? 2026 : yr)} y={tlY + tlH + 18} fontSize={11} textAnchor="middle" fill={MUTED}>
                  {yr === 2025 ? '2025' : yr}
                </text>
              ))}
              <text x={left} y={tlY - 42} fontSize={W < 520 ? 13 : 15} fontWeight={650} fill={INK}>
                Two snapshots per country, one average each
              </text>
              <text x={left} y={tlY - 22} fontSize={12} fill={MUTED}>
                Y = Tier 1 money per 1,000 people, logged: ln(1 + Y)
              </text>
              <text x={left} y={tlY + tlH + 52} fontSize={12} fill={MUTED}>
                <tspan x={left}>The years when rules arrive are left out, so “before” and</tspan>
                <tspan x={left} dy="1.3em">“after” are clean comparisons (Bertrand et al. 2004).</tspan>
              </text>
            </m.g>
          )}

          {/* ------------------------------------------------ groups (step 1) */}
          <AnimatePresence>
            {step === 1 && (
              <m.g key="glabels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t()}>
                <text x={left + 10} y={top + 52} fontSize={W < 520 ? 12 : 14} fontWeight={700} fill={TEAL}>
                  {nB} binding
                </text>
                <text x={left + 10} y={top + 52 + 0} dy={W < 520 ? 0 : 0} fontSize={11} fill={MUTED} transform={`translate(0,${(W < 520 ? 18 : 24) * 4 + 30})`}>
                  <tspan x={left + 10}>First binding rule</tspan>
                  <tspan x={left + 10} dy="1.25em">in force 2013–19</tspan>
                </text>
                <text x={left + (W - left - right) * 0.48} y={top + 52} fontSize={W < 520 ? 12 : 14} fontWeight={700} fill={GREY}>
                  {nN} no rule
                </text>
                <text x={left + (W - left - right) * 0.48} y={top + 52} fontSize={11} fill={MUTED} transform={`translate(0,${(W < 520 ? 18 : 24) * 5 + 30})`}>
                  <tspan x={left + (W - left - right) * 0.48}>No UPF measure at any</tspan>
                  <tspan x={left + (W - left - right) * 0.48} dy="1.25em">point, 2010–2025</tspan>
                </text>
                <text x={left} y={H - 10} fontSize={11} fill={MUTED}>
                  Left out: 28 bound before 2013, 12 adopters from 2020, 3 voluntary only.
                </text>
              </m.g>
            )}
          </AnimatePresence>

          {/* ------------------------------------------------ slope axes */}
          <AnimatePresence>
            {step >= 2 && (
              <m.g key="axes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t()}>
                {y.ticks(zoom ? 4 : 5).map((v) => (
                  <m.g key={`tick-${v}`} initial={{ opacity: 0 }} animate={{ opacity: 1, y: y(v) }} transition={t()}>
                    <line x1={left} x2={W - right + 40} stroke="#E7E1D6" strokeDasharray={v === 0 ? undefined : '2 3'} />
                    <text x={left - 8} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
                      {v}
                    </text>
                  </m.g>
                ))}
                <text x={left - (W < 520 ? 30 : 50)} y={top - 8} fontSize={11} fill={MUTED}>
                  Log points: ln(1 + US$ per 1,000 people)
                </text>
                <text x={xPre} y={H - 10} textAnchor="middle" fontSize={12} fontWeight={650} fill={INK}>
                  Before (2010–12)
                </text>
                <text x={xPost} y={H - 10} textAnchor="middle" fontSize={12} fontWeight={650} fill={INK}>
                  After (2020–25)
                </text>
              </m.g>
            )}
          </AnimatePresence>

          {/* ------------------------------------------------ country dots + faint lines */}
          {countries.map((c, i) => {
            const isB = c.binding === 1
            const col = isB ? TEAL : GREY
            const off = jitter(i) * (W < 520 ? 10 : 18)
            const g = gridPos(i)
            const visible = step >= 1
            const inSlope = step >= 2
            const fade = zoom ? 0.08 : 0.32
            const postY = Math.min(y(c.post), top + plotH + 4)
            const preY = y(c.pre)
            const showDot = visible && !(zoom && c.post > 3.6)
            return (
              <g key={c.iso3}>
                <m.line
                  initial={false}
                  animate={{ x1: xPre + off, y1: preY, x2: xPost + off, y2: postY, opacity: inSlope && !(zoom && (c.post > 3.6 || c.pre > 3.6)) ? fade : 0 }}
                  transition={t()}
                  stroke={col}
                  strokeWidth={1}
                />
                <m.circle
                  initial={false}
                  animate={{
                    cx: inSlope ? xPost + off : visible ? g.x : (isB ? xPre : xPost),
                    cy: inSlope ? postY : visible ? g.y : top + plotH / 2,
                    r: inSlope ? 3 : W < 520 ? 6 : 8,
                    opacity: showDot ? (inSlope ? (zoom ? 0.15 : 0.55) : 0.9) : 0,
                  }}
                  transition={{ duration: dur, delay: reduce ? 0 : (step === 1 ? i * 0.012 : 0), ease: EASE }}
                  fill={col}
                  onPointerEnter={(e) =>
                    show(
                      e,
                      <>
                        <div className="tt-title">{countryName(c.name)}</div>
                        <div className="tt-row"><span>Group</span><span>{isB ? 'Binding rule 2013–19' : 'No rule'}</span></div>
                        <div className="tt-row"><span>Before (US$/1,000 people/yr)</span><span>{c.pre_y.toFixed(1)}</span></div>
                        <div className="tt-row"><span>After (US$/1,000 people/yr)</span><span>{c.post_y.toFixed(1)}</span></div>
                        <div className="tt-row"><span>ln(1+Y): before → after</span><span>{c.pre.toFixed(2)} → {c.post.toFixed(2)}</span></div>
                      </>,
                    )
                  }
                  onPointerMove={move}
                  onPointerLeave={hide}
                />
                {inSlope && (
                  <m.circle initial={false} animate={{ cx: xPre + off, cy: preY, opacity: zoom && c.pre > 3.6 ? 0 : zoom ? 0.12 : 0.45 }} transition={t()} r={3} fill={col} pointerEvents="none" />
                )}
              </g>
            )
          })}

          {/* ------------------------------------------------ group means */}
          <AnimatePresence>
            {step >= 2 &&
              seriesLines.map((s, i) => (
                <m.g key={`mean-${s.k}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t(0.3 + i * 0.2)}>
                  <m.line initial={false} animate={{ x1: xPre, y1: y(s.pre), x2: xPost, y2: y(s.post) }} transition={t()} stroke={s.color} strokeWidth={4} strokeLinecap="round" />
                  <m.circle initial={false} animate={{ cx: xPre, cy: y(s.pre) }} transition={t()} r={7} fill={s.color} stroke="#F7F5F1" strokeWidth={2} />
                  <m.circle initial={false} animate={{ cx: xPost, cy: y(s.post) }} transition={t()} r={7} fill={s.color} stroke="#F7F5F1" strokeWidth={2} />
                  <m.text initial={false} animate={{ x: xPre - 12, y: y(s.pre) }} transition={t()} dy="0.32em" textAnchor="end" fontSize={12} fontWeight={700} fill={s.color}>
                    {s.pre.toFixed(2)}
                  </m.text>
                  <m.text initial={false} animate={{ x: xPost + 12, y: y(s.post) }} transition={t()} dy="0.32em" fontSize={12} fontWeight={700} fill={s.color}>
                    {s.post.toFixed(2)}
                    {W >= 520 && <tspan fontWeight={550} fill={s.color}>{`  ${s.label}`}</tspan>}
                  </m.text>
                </m.g>
              ))}
          </AnimatePresence>

          {/* ------------------------------------------------ counterfactual (step 3) */}
          <AnimatePresence>
            {zoom && (
              <m.g key="ghost" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t(0.4)}>
                {/* region where a reduction would put binding countries */}
                <path d={`M${xPre},${y(bPre)} L${xPost},${y(ghost)} L${xPost},${y(0)} L${xPre},${y(0)} Z`} fill={TEAL} opacity={0.07} />
                <m.line
                  x1={xPre}
                  y1={y(bPre)}
                  x2={xPost}
                  y2={y(ghost)}
                  stroke={TEAL}
                  strokeWidth={2.5}
                  strokeDasharray="7 6"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.5 }}
                />
                <circle cx={xPost} cy={y(ghost)} r={6} fill="#F7F5F1" stroke={TEAL} strokeWidth={2} strokeDasharray="3 2" />
                <text x={xPost + 12} y={y(ghost)} dy="0.32em" fontSize={11.5} fill={TEAL} fontWeight={600}>
                  {ghost.toFixed(2)}{W >= 520 ? '  if rules made no difference' : ''}
                </text>
                <text x={(xPre + xPost) / 2} y={y(0.35)} textAnchor="middle" fontSize={W < 520 ? 11 : 12.5} fill={TEAL} fontWeight={600}>
                  {W < 520 ? 'A reduction would land down here' : 'If binding rules cut lending, the teal line would end down here'}
                </text>
                {/* estimate bracket */}
                <m.g initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 1.5 }}>
                  <path d={`M${xPost - 22},${y(ghost)} h-6 V${y(bPost)} h6`} fill="none" stroke={INK} strokeWidth={1.2} />
                  <text x={xPost - 34} y={(y(ghost) + y(bPost)) / 2} dy="0.32em" textAnchor="end" fontSize={W < 520 ? 12 : 14} fontWeight={700} fill={INK}>
                    {estimate > 0 ? '+' : '−'}{Math.abs(estimate).toFixed(2)}
                  </text>
                  <text x={xPost - 34} y={(y(ghost) + y(bPost)) / 2 + 16} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
                    the DiD estimate
                  </text>
                </m.g>
              </m.g>
            )}
          </AnimatePresence>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

/* ====================================================================== CI */
export function CiPlot({ b, lo, hi, p, n, play }: { b: number; lo: number; hi: number; p: number; n: number; play: boolean }) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const W = width
  const H = W < 520 ? 210 : 250
  const mg = { l: 16, r: 16 }
  const x = d3.scaleLinear().domain([-2.5, 4]).range([mg.l, W - mg.r])
  const cy = H * 0.46
  const go = play || reduce
  const d = reduce ? 0 : 1
  return (
    <div ref={ref} style={{ width: '100%' }}>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label={`Estimate ${b.toFixed(2)} log points, 95% confidence interval ${lo} to ${hi}, which includes zero. p = ${p}, N = ${n}.`}>
          <rect x={x(-2.5)} y={22} width={x(0) - x(-2.5)} height={H - 64} fill="#0F6E6E" opacity={0.08} rx={4} />
          <text x={x(-1.25)} y={42} textAnchor="middle" fontSize={W < 520 ? 11 : 13} fontWeight={650} fill="#0F6E6E">
            A reduction would sit here
          </text>
          <text x={x(-1.25)} y={58} textAnchor="middle" fontSize={11} fill="#0F6E6E">
            (binding rules cut lending)
          </text>
          {d3.range(-2, 4.01, 1).map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={22} y2={H - 42} stroke={v === 0 ? '#14213D' : '#E7E1D6'} strokeWidth={v === 0 ? 1.5 : 1} strokeDasharray={v === 0 ? undefined : '2 3'} />
              <text x={x(v)} y={H - 26} textAnchor="middle" fontSize={11} fill="#5E6472" fontWeight={v === 0 ? 700 : 400}>
                {v === 0 ? '0' : v > 0 ? `+${v}` : `−${Math.abs(v)}`}
              </text>
            </g>
          ))}
          <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#5E6472">
            Estimated change, log points of ln(1 + US$ per 1,000 people)
          </text>
          {/* CI bar grows from the point */}
          <m.line
            y1={cy}
            y2={cy}
            stroke="#14213D"
            strokeWidth={6}
            strokeLinecap="round"
            initial={false}
            animate={{ x1: go ? x(lo) : x(b), x2: go ? x(hi) : x(b) }}
            transition={{ duration: 1.4 * d, delay: 0.3 * d, ease: EASE }}
          />
          {[lo, hi].map((v, i) => (
            <m.text
              key={i}
              x={x(v)}
              y={cy - 16}
              textAnchor="middle"
              fontSize={13}
              fontWeight={650}
              fill="#14213D"
              initial={false}
              animate={{ opacity: go ? 1 : 0 }}
              transition={{ duration: 0.4 * d, delay: 1.5 * d }}
            >
              {v < 0 ? `−${Math.abs(v).toFixed(2)}` : `+${v.toFixed(2)}`}
            </m.text>
          ))}
          <m.circle cx={x(b)} cy={cy} fill="#B05A2B" stroke="#F7F5F1" strokeWidth={3} initial={false} animate={{ r: go ? 13 : 0 }} transition={{ duration: 0.5 * d, ease: EASE }} />
          <m.text x={x(b)} y={cy + 34} textAnchor="middle" fontSize={15} fontWeight={700} fill="#9A4A1F" initial={false} animate={{ opacity: go ? 1 : 0 }} transition={{ duration: 0.4 * d, delay: 0.3 * d }}>
            +{b.toFixed(2)}
          </m.text>
          {/* crossing zero pulse */}
          <m.circle
            cx={x(0)}
            cy={cy}
            fill="none"
            stroke="#B05A2B"
            strokeWidth={2}
            initial={false}
            animate={go && !reduce ? { r: [6, 22, 6], opacity: [0, 1, 0] } : { r: 14, opacity: 0 }}
            transition={{ duration: 1.6, delay: 1.8, repeat: 2 }}
          />
          <m.text x={x(0) - 10} y={cy + 34} fontSize={11.5} fontWeight={600} fill="#14213D" textAnchor="end" initial={false} animate={{ opacity: go ? 1 : 0 }} transition={{ delay: 2 * d }}>
            {W >= 520 ? 'the interval crosses zero →' : 'crosses 0 →'}
          </m.text>
        </svg>
      )}
    </div>
  )
}
