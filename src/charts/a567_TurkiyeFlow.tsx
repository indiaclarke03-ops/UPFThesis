/**
 * Act 6 · Türkiye. Two views of the same 20 Tier 1 deals:
 *  - 'flow': lenders → parent groups (ribbon width = core Tier 1 money),
 *            with a qualitative "markets abroad" column (labelled as such);
 *  - 'timeline': each deal as a circle by year, over Türkiye's regulation timeline.
 */
import * as d3 from 'd3'
import { motion as m } from 'framer-motion'
import { useMemo } from 'react'
import { Tooltip, useTooltip } from '../components/ui'
import { parentName, type Deal, type RegEvent } from '../lib/data'
import { usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { lenderColor, motion, type Lender } from '../lib/tokens'

const YILDIZ = 'Yildiz Holding (Ulker/pladis)'
const TR_NAME: Record<string, string> = { Dogus: 'Doğuş', Ozgorkey: 'Özgörkey', Uludag: 'Uludağ', [YILDIZ]: 'Yıldız/Ülker' }
const trName = (p: string | null | undefined) => (p && TR_NAME[p]) || parentName(p)

/** Where the largest groups also sell. Company-reported context, not thesis data. */
const ABROAD: Record<string, string[]> = {
  [YILDIZ]: ['pladis (UK): McVitie’s, Godiva', 'Ülker exports: Middle East, Central Asia, N. Africa'],
  'Coca-Cola system': ['Coca-Cola İçecek bottles for Central Asia, Pakistan and the Middle East'],
}

export function TurkiyeFlow({
  deals,
  regulation,
  view,
  highlight,
  showAbroad,
  regionalCci,
}: {
  deals: Deal[] // Tier 1 deals in TUR
  regulation: RegEvent[] // TUR events
  view: 'flow' | 'timeline'
  highlight?: string | null
  showAbroad?: boolean
  regionalCci?: Deal | null
}) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const phone = width < 560
  const height = phone ? 330 : 480
  const dur = reduce ? 0 : motion.slow / 1000

  /* ------------------------------------------------------------- flow layout */
  const flow = useMemo(() => {
    const lenders = d3.rollups(deals, (v) => ({ usd: d3.sum(v, (d) => d.t1 ?? 0), n: v.length }), (d) => d.lender).sort((a, b) => b[1].usd - a[1].usd)
    const parents = d3
      .rollups(deals, (v) => ({ usd: d3.sum(v, (d) => d.t1 ?? 0), n: v.length }), (d) => d.parent ?? d.company ?? '—')
      .sort((a, b) => b[1].usd - a[1].usd)
    const total = d3.sum(parents, (p) => p[1].usd)
    const top = 34
    const gap = phone ? 6 : 8
    const avail = height - top - 30 - gap * (parents.length - 1)
    const k = avail / total
    const colX = { l: phone ? 4 : 10, p: phone ? width * 0.42 : width * 0.34, a: width * 0.34 + 222 }
    const nodeW = 12
    // lender nodes, centred vertically
    const lH = d3.sum(lenders, (l) => l[1].usd * k) + gap * 3 * (lenders.length - 1)
    let ly = top + (avail + gap * (parents.length - 1) - lH) / 2
    const lNodes = lenders.map(([key, v]) => {
      const n = { key: key as Lender, ...v, y0: ly, y1: ly + v.usd * k }
      ly = n.y1 + gap * 3
      return n
    })
    let py = top
    const pNodes = parents.map(([key, v]) => {
      const n = { key, ...v, y0: py, y1: py + v.usd * k }
      py = n.y1 + gap
      return n
    })
    // links lender → parent
    const lOff = new Map(lNodes.map((n) => [n.key, n.y0]))
    const pOff = new Map(pNodes.map((n) => [n.key, n.y0]))
    const links = d3
      .rollups(deals, (v) => d3.sum(v, (d) => d.t1 ?? 0), (d) => d.parent ?? d.company ?? '—', (d) => d.lender)
      .flatMap(([p, ls]) => ls.map(([l, usd]) => ({ p, l: l as Lender, usd })))
      .sort((a, b) => (pNodes.findIndex((n) => n.key === a.p) - pNodes.findIndex((n) => n.key === b.p)))
      .map((lk) => {
        const w = lk.usd * k
        const sy = lOff.get(lk.l)!
        const ty = pOff.get(lk.p)!
        lOff.set(lk.l, sy + w)
        pOff.set(lk.p, ty + w)
        return { ...lk, w, sy: sy + w / 2, ty: ty + w / 2 }
      })
    return { lNodes, pNodes, links, colX, nodeW }
  }, [deals, width, height, phone])

  /* --------------------------------------------------------- timeline layout */
  const margin = { top: 30, right: 16, bottom: 30, left: phone ? 8 : 120 }
  const x = d3.scaleLinear().domain([2001, 2026]).range([margin.left, width - margin.right])
  const r = d3.scaleSqrt().domain([0, 170]).range([0, phone ? 18 : 24])
  const regRows = useMemo(() => {
    const domains = Array.from(new Set(regulation.map((e) => e.domain)))
    return domains.map((dm) => ({ domain: dm, events: regulation.filter((e) => e.domain === dm).sort((a, b) => (a.year ?? 0) - (b.year ?? 0)) }))
  }, [regulation])
  const regTop = height * 0.56
  const rowH = Math.min(30, (height - regTop - margin.bottom) / Math.max(1, regRows.length))
  const dealsY = regTop * 0.55

  const dealTip = (d: Deal) => (
    <>
      <div className="tt-title">{d.company}</div>
      <div className="tt-row">
        <span>{d.lender}, {d.year}</span>
        <span>{usdM(d.t1)}</span>
      </div>
      <div>{trName(d.parent)}</div>
    </>
  )

  // beeswarm deals by year so same-year deals do not overlap
  const swarm = useMemo(() => {
    const ns = deals.map((d) => ({ d, x: x(d.year ?? 2010), y: dealsY, r: Math.max(3, r(d.t1 ?? 0)) }))
    const sim = d3
      .forceSimulation(ns as (typeof ns[number] & d3.SimulationNodeDatum)[])
      .force('x', d3.forceX<(typeof ns)[number] & d3.SimulationNodeDatum>((n) => x(n.d.year ?? 2010)).strength(1))
      .force('y', d3.forceY(dealsY).strength(0.08))
      .force('c', d3.forceCollide<(typeof ns)[number] & d3.SimulationNodeDatum>((n) => n.r + 1.5))
      .stop()
    for (let i = 0; i < 200; i++) sim.tick()
    return ns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, width, height])

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={view === 'flow' ? 'Flow from lenders to parent groups in Türkiye' : 'Türkiye Tier 1 deals by year over the regulation timeline'}>
          <>
            {view === 'flow' ? (
              <m.g key="flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur / 2 }}>
                <text x={flow.colX.l} y={16} fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill="#5E6472">
                  LENDER
                </text>
                <text x={flow.colX.p} y={16} fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill="#5E6472">
                  PARENT GROUP IN TÜRKIYE
                </text>
                {!phone && showAbroad && (
                  <text x={flow.colX.a} y={16} fontSize={10.5} fontWeight={700} letterSpacing="0.08em" fill="#5E6472">
                    ALSO SELLS ABROAD*
                  </text>
                )}
                {flow.links.map((lk, i) => {
                  const x0 = flow.colX.l + flow.nodeW
                  const x1 = flow.colX.p
                  const mx = (x0 + x1) / 2
                  const dim = highlight && lk.p !== highlight
                  return (
                    <m.path
                      key={`${lk.l}-${lk.p}`}
                      d={`M${x0},${lk.sy} C${mx},${lk.sy} ${mx},${lk.ty} ${x1},${lk.ty}`}
                      fill="none"
                      stroke={lenderColor[lk.l]}
                      strokeWidth={Math.max(1, lk.w)}
                      initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: dim ? 0.12 : 0.55 }}
                      transition={{ duration: reduce ? 0 : 1.2, delay: reduce ? 0 : 0.1 + i * 0.06, ease: motion.ease }}
                      onPointerEnter={(e) => show(e, <><div className="tt-title">{lk.l} → {trName(lk.p)}</div><div className="tt-row"><span>Core Tier 1</span><span>{usdM(lk.usd)}</span></div></>)}
                      onPointerMove={move}
                      onPointerLeave={hide}
                    />
                  )
                })}
                {flow.lNodes.map((n) => (
                  <g key={n.key}>
                    <rect x={flow.colX.l} y={n.y0} width={flow.nodeW} height={Math.max(2, n.y1 - n.y0)} fill={lenderColor[n.key]} rx={2} />
                    <text x={flow.colX.l + flow.nodeW + 6} y={n.y0 - 6} fontSize={phone ? 11 : 13} fontWeight={700} fill={lenderColor[n.key]}>
                      {n.key}
                    </text>
                    <text x={flow.colX.l + flow.nodeW + 6} y={(n.y0 + n.y1) / 2} dy="0.32em" fontSize={11} fill="#14213D" opacity={n.y1 - n.y0 > 30 ? 1 : 0}>
                      {n.n} deals · {usdM(n.usd, 0)}
                    </text>
                    {n.y1 - n.y0 <= 30 && (
                      <text x={flow.colX.l + flow.nodeW + 6} y={n.y1 + 13} fontSize={11} fill="#14213D">
                        {n.n} deals · {usdM(n.usd, 0)}
                      </text>
                    )}
                  </g>
                ))}
                {flow.pNodes.map((n) => {
                  const dim = highlight && n.key !== highlight
                  const big = n.key === YILDIZ
                  return (
                    <g key={n.key} opacity={dim ? 0.3 : 1} style={{ transition: 'opacity 500ms' }}>
                      <rect x={flow.colX.p} y={n.y0} width={flow.nodeW} height={Math.max(2, n.y1 - n.y0)} fill={big && highlight ? '#B05A2B' : '#14213D'} rx={2} />
                      <text x={flow.colX.p + flow.nodeW + 8} y={(n.y0 + n.y1) / 2} dy="0.32em" fontSize={big ? (phone ? 12 : 14) : phone ? 10.5 : 12} fontWeight={big ? 700 : 550} fill="#14213D">
                        {trName(n.key)}
                        <tspan fill="#5E6472" fontWeight={400}> {usdM(n.usd, 1)}</tspan>
                      </text>
                    </g>
                  )
                })}
                {showAbroad &&
                  !phone &&
                  flow.pNodes
                    .filter((n) => ABROAD[n.key])
                    .map((n, i) => {
                      const y = (n.y0 + n.y1) / 2
                      const ax = flow.colX.a
                      return (
                        <m.g key={n.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: dur, delay: reduce ? 0 : 0.2 + i * 0.2 }}>
                          <path d={`M${flow.colX.p + 192},${y} H${ax - 6}`} stroke="#B05A2B" strokeDasharray="4 3" fill="none" markerEnd="url(#a567-tur-arrow)" />
                          {ABROAD[n.key].map((t, j) => (
                            <text key={t} x={ax} y={y + (j - (ABROAD[n.key].length - 1) / 2) * 16} dy="0.32em" fontSize={11.5} fill="#9A4A1F">
                              {t}
                            </text>
                          ))}
                        </m.g>
                      )
                    })}
                {showAbroad && regionalCci && (
                  <m.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur, delay: reduce ? 0 : 0.6 }}>
                    <text x={phone ? 4 : flow.colX.p} y={height - 6} fontSize={11} fill="#9A4A1F">
                      + {usdM(regionalCci.t1, 0)} {regionalCci.lender} loan to Coca-Cola İçecek ({regionalCci.year}), booked as regional
                    </text>
                  </m.g>
                )}
                <defs>
                  <marker id="a567-tur-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="#B05A2B" />
                  </marker>
                </defs>
              </m.g>
            ) : (
              <m.g key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur / 2 }}>
                {/* year axis */}
                {d3.range(2002, 2027, phone ? 6 : 2).map((yr) => (
                  <g key={yr}>
                    <line x1={x(yr)} x2={x(yr)} y1={margin.top} y2={height - margin.bottom} stroke="#E7E1D6" strokeDasharray="2 4" />
                    <text x={x(yr)} y={height - 10} textAnchor="middle" fontSize={10.5} fill="#5E6472">
                      {yr}
                    </text>
                  </g>
                ))}
                <rect x={x(2010)} y={margin.top - 6} width={x(2025.5) - x(2010)} height={regTop - margin.top} fill="rgba(176,90,43,0.05)" rx={4} />
                <text x={x(2010) + 6} y={margin.top + 8} fontSize={10.5} fontWeight={700} fill="#9A4A1F" letterSpacing="0.06em">
                  TIER 1 DEALS, 2010–2025 (circle = US$m)
                </text>
                {swarm.map((n, i) => (
                  <m.circle
                    key={n.d.id}
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={lenderColor[n.d.lender]}
                    fillOpacity={0.85}
                    stroke={n.d.parent === YILDIZ ? '#14213D' : '#FFFDF9'}
                    strokeWidth={n.d.parent === YILDIZ ? 1.5 : 1}
                    initial={{ scale: reduce ? 1 : 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: dur, delay: reduce ? 0 : i * 0.025 }}
                    onPointerEnter={(e) => show(e, dealTip(n.d))}
                    onPointerMove={move}
                    onPointerLeave={hide}
                    onPointerDown={(e) => show(e, dealTip(n.d))}
                  />
                ))}
                {/* regulation lanes */}
                <text x={phone ? x(2000) : 8} y={regTop - 6} fontSize={10.5} fontWeight={700} fill="#0F6E6E" letterSpacing="0.06em">
                  REGULATION IN FORCE
                </text>
                {regRows.map((row, i) => {
                  const y = regTop + i * rowH
                  return (
                    <g key={row.domain}>
                      {!phone && (
                        <text x={8} y={y + rowH / 2} dy="0.32em" fontSize={11} fill="#14213D">
                          {row.domain}
                        </text>
                      )}
                      {row.events.map((e, j) => {
                        const next = row.events[j + 1]?.year ?? 2026
                        const end = e.end ?? next
                        const bind = e.strength === 'Binding'
                        return (
                          <g key={e.id}>
                            <m.rect
                              x={x(e.year ?? 2000)}
                              y={y + 4}
                              height={rowH - 8}
                              rx={3}
                              fill={bind ? '#0F6E6E' : '#9ED3CF'}
                              initial={{ width: reduce ? x(end) - x(e.year ?? 2000) : 0 }}
                              animate={{ width: Math.max(2, x(end) - x(e.year ?? 2000)) }}
                              transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.1 + i * 0.06 }}
                              onPointerEnter={(ev) => show(ev, <><div className="tt-title">{e.domain} · {e.strength}</div><div>{e.detail}</div><div style={{ opacity: 0.8 }}>In force {e.year}</div></>)}
                              onPointerMove={move}
                              onPointerLeave={hide}
                            />
                            <text x={x(e.year ?? 2000) + 5} y={y + rowH / 2} dy="0.32em" fontSize={10} fill={bind ? '#FFFDF9' : '#14213D'} pointerEvents="none">
                              {phone ? `${e.domain.split(' ')[0]} ${e.year}` : `${e.year} ${bind ? 'binding' : 'voluntary'}`}
                            </text>
                          </g>
                        )
                      })}
                    </g>
                  )
                })}
              </m.g>
            )}
          </>
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
