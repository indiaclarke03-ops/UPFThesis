/**
 * Act 5 · Grade ladder. Each funded parent group is a circle sized by core
 * Tier 1 money, placed on a 0–3 obstruction-grade rung (beeswarm by money).
 * Grade 0 means "no evidence found", not "no obstruction".
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Tooltip, useTooltip } from '../components/ui'
import { countryName, parentName, type Firm } from '../lib/data'
import { usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { gradeColor, gradeLabel, motion } from '../lib/tokens'

export const YILDIZ = 'Yildiz Holding (Ulker/pladis)'

interface Node extends d3.SimulationNodeDatum {
  f: Firm
  r: number
  tx: number
  ty: number
}

export function GradeLadder({
  firms,
  withoutYildiz = false,
  focus = 'all',
  height: hProp,
}: {
  firms: Firm[]
  withoutYildiz?: boolean
  /** 'all' | 'coi' (dim grade 0) | 'yildiz' (spotlight Yıldız) */
  focus?: 'all' | 'coi' | 'yildiz'
  height?: number
}) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const phone = width < 560
  const height = hProp ?? (phone ? 330 : 520)
  const margin = { top: 16, right: 12, bottom: 34, left: phone ? 12 : 196 }
  const iw = Math.max(0, width - margin.left - margin.right)
  // grade 3 at the top; rows sized by how crowded they are (grade 0 holds most groups)
  const W = [0.46, 0.1, 0.22, 0.22]
  const avail = height - margin.top - margin.bottom
  const rowHt = (g: number) => W[g] * avail
  const rowTop = (g: number) => margin.top + W.slice(g + 1).reduce((a, b) => a + b, 0) * avail
  const rowY = (g: number) => rowTop(g) + rowHt(g) / 2

  const x = useMemo(
    () =>
      d3
        .scaleLog()
        .domain([d3.min(firms, (f) => f.t1) ?? 1, d3.max(firms, (f) => f.t1) ?? 1000])
        .range([18, Math.max(40, iw - 30)])
        .clamp(true),
    [firms, iw],
  )
  const r = useMemo(() => d3.scaleSqrt().domain([0, d3.max(firms, (f) => f.t1) ?? 1]).range([0, phone ? 22 : 34]), [firms, phone])

  const nodes = useMemo(() => {
    if (iw <= 0) return [] as Node[]
    const ns: Node[] = firms.map((f) => ({
      f,
      r: Math.max(2.5, r(f.t1)),
      tx: x(f.t1),
      ty: rowY(f.grade),
      x: x(f.t1),
      y: rowY(f.grade),
    }))
    const sim = d3
      .forceSimulation(ns)
      .force('x', d3.forceX<Node>((d) => d.tx).strength(0.35))
      .force('y', d3.forceY<Node>((d) => d.ty).strength(0.12))
      .force('c', d3.forceCollide<Node>((d) => d.r + 1.2).iterations(3))
      .stop()
    for (let i = 0; i < 260; i++) sim.tick()
    for (const n of ns) {
      const half = rowHt(n.f.grade) / 2 - 2
      n.y = Math.max(n.ty - half + n.r, Math.min(n.ty + half - n.r, n.y ?? n.ty))
      n.x = Math.max(n.r, Math.min(iw - n.r, n.x ?? n.tx))
    }
    return ns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firms, iw, height, r, x])

  const counts = [0, 1, 2, 3].map((g) => firms.filter((f) => f.grade === g))
  const dur = reduce ? 0 : motion.slow / 1000

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Funded parent groups placed on a 0 to 3 obstruction grade ladder, sized by Tier 1 money">
          {/* rungs */}
          {[3, 2, 1, 0].map((g) => (
            <g key={g}>
              <rect x={0} y={rowTop(g) + 2} width={width} height={rowHt(g) - 4} rx={6} fill={g >= 2 ? 'rgba(164,72,58,0.06)' : 'rgba(20,33,61,0.025)'} />
              <line x1={margin.left} x2={width - margin.right} y1={rowY(g)} y2={rowY(g)} stroke="#E7E1D6" strokeDasharray="2 4" />
              {!phone ? (
                <g transform={`translate(10,${rowY(g)})`}>
                  <circle r={7} cx={8} fill={gradeColor[g]} stroke={g === 0 ? '#C9B79C' : 'none'} />
                  <text x={22} dy="-0.25em" fontSize={12.5} fontWeight={700} fill="#14213D">
                    Grade {g}
                  </text>
                  <text x={22} dy="1.05em" fontSize={11} fill="#5E6472">
                    {wrapLabel(gradeLabel[g])}
                  </text>
                  <text x={22} dy="2.3em" fontSize={10.5} fill="#5E6472">
                    {counts[g].length} {counts[g].length === 1 ? 'group' : 'groups'} · {usdM(d3.sum(counts[g], (f) => f.t1), 0)}
                  </text>
                </g>
              ) : (
                <text x={8} y={rowTop(g) + 15} fontSize={11} fontWeight={650} fill="#14213D">
                  {g} · {gradeLabel[g]} <tspan fill="#5E6472" fontWeight={400}>({counts[g].length})</tspan>
                </text>
              )}
              {counts[g].length === 0 && !phone && (
                <text x={margin.left + iw / 2} y={rowY(g)} dy="0.32em" textAnchor="middle" fontSize={11.5} fontStyle="italic" fill="#5E6472">
                  No funded group is graded 1
                </text>
              )}
            </g>
          ))}
          {/* nodes */}
          <g transform={`translate(${margin.left},0)`}>
            {nodes.map((n, i) => {
              const isY = n.f.parent === YILDIZ
              const demoted = withoutYildiz && isY
              const dim = (focus === 'coi' && n.f.grade < 2) || (focus === 'yildiz' && !isY)
              const fill = demoted ? '#FFFDF9' : gradeColor[n.f.grade]
              return (
                <m.g
                  key={n.f.parent}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: dim ? 0.22 : 1, scale: 1, x: n.x, y: n.y }}
                  transition={{ duration: dur, delay: reduce ? 0 : Math.min(i * 0.008, 0.5), ease: motion.ease }}
                  style={{ cursor: 'pointer' }}
                  onPointerEnter={(e) => show(e, <FirmTip f={n.f} />)}
                  onPointerMove={move}
                  onPointerLeave={hide}
                  onPointerDown={(e) => show(e, <FirmTip f={n.f} />)}
                >
                  <circle
                    r={n.r}
                    fill={fill}
                    stroke={demoted ? '#5C1A1B' : n.f.grade === 0 ? '#C9B79C' : '#FFFDF9'}
                    strokeWidth={demoted ? 1.5 : 0.8}
                    strokeDasharray={demoted ? '3 2' : undefined}
                  />
                  {n.r > (phone ? 15 : 17) && short(n.f.parent).length * 5.6 < n.r * 2 && (
                    <text textAnchor="middle" dy="0.32em" fontSize={phone ? 8.5 : 10} fontWeight={650} fill={n.f.grade >= 2 && !demoted ? '#FFFDF9' : '#14213D'} pointerEvents="none">
                      {short(n.f.parent)}
                    </text>
                  )}
                </m.g>
              )
            })}
          </g>
          {/* axis hint */}
          <text x={margin.left} y={height - 10} fontSize={10.5} fill="#5E6472">
            ← smaller
          </text>
          <text x={width - margin.right} y={height - 10} fontSize={10.5} fill="#5E6472" textAnchor="end">
            larger Tier 1 money (log scale) →
          </text>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

function FirmTip({ f }: { f: Firm }) {
  return (
    <>
      <div className="tt-title">{parentName(f.parent)}</div>
      <div className="tt-row">
        <span>Tier 1 money</span>
        <span>{usdM(f.t1)}</span>
      </div>
      <div className="tt-row">
        <span>Tier 1 deals</span>
        <span>{f.n_t1}</span>
      </div>
      <div className="tt-row">
        <span>Grade</span>
        <span>
          {f.grade}: {gradeLabel[f.grade]}
        </span>
      </div>
      {f.n_lawsuits > 0 && (
        <div className="tt-row">
          <span>Lawsuits (Lighthouse)</span>
          <span>{f.n_lawsuits}</span>
        </div>
      )}
      <div style={{ marginTop: 4, opacity: 0.8 }}>{f.countries.map(countryName).join(', ')}</div>
      <div style={{ marginTop: 4 }}>
        <Link to={`/firm/${f.slug}`}>Firm profile →</Link>
      </div>
    </>
  )
}

const SHORT: Record<string, string> = {
  'Coca-Cola system': 'Coca-Cola',
  [YILDIZ]: 'Yıldız',
  'PRAN-RFL Group': 'PRAN-RFL',
  'Atlantic Grupa': 'Atlantic',
  'Danube Foods': 'Danube',
  'CMI (Corporacion Multi Inversiones)': 'CMI',
  'Muller Group': 'Müller',
  FrieslandCampina: 'Friesl.',
  Almarai: 'Almarai',
  Maspex: 'Maspex',
}
const short = (p: string) => SHORT[p] ?? p.split(/[ (]/)[0]

function wrapLabel(s: string) {
  return s.length > 26 ? s.replace('Lobbying or trade-association opposition', 'Lobbying / trade-assoc. opposition') : s
}
