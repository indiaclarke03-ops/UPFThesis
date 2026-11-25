/**
 * "Follow the money": lender → income group at approval → parent group →
 * COI obstruction grade, for core Tier 1 money (US$m 2024) of the given deals.
 * Display aggregation only.
 *
 * Clarity design:
 *  - few, labelled nodes (value + share on each), column headers;
 *  - flows muted by default; hover / click / focus a node (or a lender button)
 *    to light up exactly that money's path through every column (an overlay
 *    whose width is the selected money inside each flow);
 *  - colour flows by lender or by COI grade;
 *  - a live sentence summarises the selection (grades 2–3 share always shown
 *    with the without-Yıldız figure).
 */
import * as d3 from 'd3'
import { sankey, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { motion as m } from 'framer-motion'
import { useMemo, useState } from 'react'
import { money } from '../lib/aggregate'
import { parentName, type Deal, type Firm } from '../lib/data'
import { pct, usdM } from '../lib/format'
import { useReducedMotion, useSize } from '../lib/hooks'
import { gradeColor, gradeLabel, incomeColor, LENDERS, lenderColor, lenderText, type Lender } from '../lib/tokens'
import { Toggle, Tooltip, useTooltip } from '../components/ui'

export interface FollowTheMoneyProps {
  deals: Deal[] // already filtered by the explorer filter bar
  firmByParent: Map<string, Firm>
  height?: number
}

interface N {
  id: string
  label: string
  col: number
  color: string
}
interface L {
  key: string
  source: string
  target: string
  value: number
  lender: Lender
  grade: number
}
type SN = SankeyNode<N, L>
type SL = SankeyLink<N, L>

const OTHER = 'Other groups'
const YILDIZ = 'Yildiz Holding (Ulker/pladis)'
const INCOME_ORDER = ['High', 'Middle', 'Low', 'Regional']
/** Link colours for grades: grade 0 darkened slightly so flows stay visible on paper. */
const GRADE_LINK = ['#BFB197', gradeColor[1], gradeColor[2], gradeColor[3]]
const GRADE_SHORT = ['No evidence found', 'Interest group', 'Lobbying / opposition', 'Litigation']
const INK = '#14213D'
const MUTED = '#5E6472'

type Layer = 'L' | 'I' | 'P' | 'G'

interface Row {
  d: Deal
  v: number
  keys: Record<Layer, string>
  grade: number
  links: string[]
}

function build(deals: Deal[], firmByParent: Map<string, Firm>, topN: number, layers: Layer[], colorBy: 'lender' | 'grade') {
  const base = deals.filter((d) => money(d, 't1') > 0)
  const byParent = d3.rollup(base, (v) => d3.sum(v, (d) => money(d, 't1')), (d) => d.parent ?? 'Unassigned')
  const top = new Set(
    [...byParent.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map((e) => e[0]),
  )
  const nodes = new Map<string, N>()
  const links = new Map<string, L>()
  const link = (s: string, t: string, v: number, lender: Lender, grade: number) => {
    // one flow per (source, target, colour): fewer, clearer ribbons
    const key = colorBy === 'lender' ? `${s}|${t}|${lender}` : `${s}|${t}|g${grade}`
    const e = links.get(key)
    if (e) e.value += v
    else links.set(key, { key, source: s, target: t, value: v, lender, grade })
    return key
  }
  const rows: Row[] = base.map((d) => {
    const v = money(d, 't1')
    const inc = d.income ?? 'Regional'
    const p = d.parent ?? 'Unassigned'
    const pName = top.has(p) ? p : OTHER
    const grade = (d.parent ? firmByParent.get(d.parent)?.grade : 0) ?? 0
    const keys: Record<Layer, string> = { L: `L:${d.lender}`, I: `I:${inc}`, P: `P:${pName}`, G: `G:${grade}` }
    const meta: Record<Layer, Omit<N, 'col'>> = {
      L: { id: keys.L, label: d.lender, color: lenderColor[d.lender] },
      I: { id: keys.I, label: inc === 'Regional' ? 'Regional deals' : `${inc} income`, color: incomeColor[inc] ?? '#9AA0A6' },
      P: { id: keys.P, label: pName === OTHER ? OTHER : parentName(pName), color: '#3D4659' },
      G: { id: keys.G, label: GRADE_SHORT[grade], color: gradeColor[grade] },
    }
    layers.forEach((ly, col) => {
      if (!nodes.has(keys[ly])) nodes.set(keys[ly], { ...meta[ly], col })
    })
    const ls = layers.slice(1).map((ly, i) => link(keys[layers[i]], keys[ly], v, d.lender, grade))
    return { d, v, keys, grade, links: ls }
  })
  return { nodes: [...nodes.values()], links: [...links.values()], rows, total: d3.sum(rows, (r) => r.v) }
}

function order(n: N): number {
  if (n.id.startsWith('L:')) return LENDERS.indexOf(n.label as Lender)
  if (n.id.startsWith('I:')) return INCOME_ORDER.findIndex((i) => n.id === `I:${i}`)
  if (n.id.startsWith('G:')) return -Number(n.id.slice(2))
  return 0
}

const inRow = (r: Row, id: string) => r.keys.L === id || r.keys.I === id || r.keys.P === id || r.keys.G === id

export function FollowTheMoney({ deals, firmByParent, height: hProp }: FollowTheMoneyProps) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const { tip, show, move, hide } = useTooltip()
  const [colorBy, setColorBy] = useState<'lender' | 'grade'>('lender')
  const [selected, setSelected] = useState<string | null>(null) // node id: clicked or via buttons
  const [hover, setHover] = useState<string | null>(null)
  const narrow = width > 0 && width < 640
  const layers: Layer[] = narrow ? ['L', 'G'] : ['L', 'I', 'P', 'G']
  const data = useMemo(() => build(deals, firmByParent, 9, narrow ? ['L', 'G'] : ['L', 'I', 'P', 'G'], colorBy), [deals, firmByParent, narrow, colorBy])
  const height = hProp ?? (narrow ? 380 : 520)
  const labelRoom = narrow ? 2 : 180
  const mt = 30
  const cols = layers.length
  const dur = reduce ? 0 : 0.5

  const graph = useMemo(() => {
    if (width <= 0 || data.links.length === 0) return null
    const gen = sankey<N, L>()
      .nodeId((n) => n.id)
      .nodeWidth(narrow ? 10 : 14)
      .nodePadding(narrow ? 10 : 14)
      .nodeSort((a, b) => {
        if (a.id.startsWith('P:')) {
          if (a.label === OTHER) return 1
          if (b.label === OTHER) return -1
          return (b.value ?? 0) - (a.value ?? 0)
        }
        return order(a) - order(b)
      })
      .extent([
        [2, mt],
        [width - labelRoom, height - 6],
      ])
    return gen({ nodes: data.nodes.map((n) => ({ ...n })), links: data.links.map((l) => ({ ...l })) })
  }, [data, width, height, narrow, labelRoom])

  // a selected node that no longer exists (filters changed) is ignored
  const validSel = selected && data.nodes.some((n) => n.id === selected) ? selected : null
  const active = hover ?? validSel
  const sel = useMemo(() => {
    if (!active) return null
    const rows = data.rows.filter((r) => inRow(r, active))
    const perLink = new Map<string, number>()
    for (const r of rows) for (const k of r.links) if (k) perLink.set(k, (perLink.get(k) ?? 0) + r.v)
    const tot = d3.sum(rows, (r) => r.v)
    const coi = d3.sum(rows.filter((r) => r.grade >= 2), (r) => r.v)
    const coiNoY = d3.sum(rows.filter((r) => r.grade >= 2 && r.d.parent !== YILDIZ), (r) => r.v)
    const topParent = d3.greatest(d3.rollups(rows, (v) => d3.sum(v, (r) => r.v), (r) => r.d.parent ?? '—'), (e) => e[1])
    const topInc = d3.greatest(d3.rollups(rows, (v) => d3.sum(v, (r) => r.v), (r) => r.d.income ?? 'Regional'), (e) => e[1])
    return { rows, perLink, tot, coi, coiNoY, topParent, topInc, hasY: rows.some((r) => r.d.parent === YILDIZ) }
  }, [active, data])

  if (data.links.length === 0)
    return (
      <div ref={ref} className="card muted small" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        No Tier 1 money in the current selection. Widen the filters to follow the money.
      </div>
    )

  const nodeLabel = (id: string | null) => (id ? (data.nodes.find((n) => n.id === id)?.label ?? id) : '')
  const allCoi = d3.sum(data.rows.filter((r) => r.grade >= 2), (r) => r.v)
  const allCoiNoY = d3.sum(data.rows.filter((r) => r.grade >= 2 && r.d.parent !== YILDIZ), (r) => r.v)
  const anyY = data.rows.some((r) => r.d.parent === YILDIZ)
  const coiText = (coi: number, noY: number, tot: number, hasY: boolean) =>
    `${pct(coi / tot)} went to groups graded 2–3${hasY ? ` (${pct(noY / tot)} without Yıldız)` : ''}`

  const summary = sel
    ? `${nodeLabel(active)}: ${usdM(sel.tot)}, ${pct(sel.tot / data.total)} of the money shown. ${coiText(sel.coi, sel.coiNoY, sel.tot, sel.hasY)}.${
        sel.topParent && !active?.startsWith('P:') ? ` Largest recipient: ${parentName(sel.topParent[0])} (${usdM(sel.topParent[1], 0)}).` : ''
      }${
        sel.topInc && !active?.startsWith('I:') && !narrow
          ? ` Mostly to ${sel.topInc[0] === 'Regional' ? 'regional deals' : `${sel.topInc[0].toLowerCase()}-income countries`}.`
          : ''
      }`
    : `${usdM(data.total)} of core Tier 1 money. ${coiText(allCoi, allCoiNoY, data.total, anyY)}. Hover or tap any block to follow its money.`

  const HEAD: Record<Layer, string> = { L: 'Lender', I: 'Income at approval', P: 'Parent group', G: 'COI grade' }
  const heads = layers.map((l) => HEAD[l])
  const colX = graph
    ? d3.range(cols).map((c) => d3.min(graph.nodes.filter((n) => (n.depth ?? 0) === c), (n) => n.x0 ?? 0) ?? 0)
    : []
  const linkColor = (l: SL) => (colorBy === 'lender' ? lenderColor[l.lender] : GRADE_LINK[l.grade])
  const flowPath = (l: SL, w: number) => {
    const s = l.source as SN
    const t = l.target as SN
    const x0 = s.x1 ?? 0
    const x1 = t.x0 ?? 0
    const y0 = (l.y0 ?? 0) - (l.width ?? 0) / 2 + w / 2
    const y1 = (l.y1 ?? 0) - (l.width ?? 0) / 2 + w / 2
    const mx = (x0 + x1) / 2
    return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`
  }
  const lendersPresent = LENDERS.filter((l) => data.nodes.some((n) => n.id === `L:${l}`))
  const toggleSel = (id: string) => setSelected(validSel === id ? null : id)

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 0.9rem', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span className="small muted" style={{ fontWeight: 600 }}>
          Colour by
        </span>
        <Toggle
          label="Colour flows by"
          value={colorBy}
          onChange={setColorBy}
          options={[
            { value: 'lender', label: 'Lender' },
            { value: 'grade', label: 'COI grade' },
          ]}
        />
        <span className="small muted" style={{ fontWeight: 600 }}>
          Follow
        </span>
        <div className="toggle" role="group" aria-label="Follow one lender's money">
          <button type="button" aria-pressed={!validSel} onClick={() => setSelected(null)}>
            All
          </button>
          {lendersPresent.map((l) => (
            <button key={l} type="button" aria-pressed={validSel === `L:${l}`} onClick={() => toggleSel(`L:${l}`)}>
              <span aria-hidden="true" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: lenderColor[l], marginRight: 5 }} />
              {l}
            </button>
          ))}
        </div>
      </div>
      <p
        className="small"
        aria-live="polite"
        style={{
          margin: '0 0 0.6rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          borderLeft: `3px solid ${sel ? '#B05A2B' : 'var(--rule)'}`,
          borderRadius: 6,
          minHeight: narrow ? 62 : 42,
        }}
      >
        {summary}
      </p>
      {graph && (
        <svg
          width={width}
          height={height}
          role="group"
          aria-label={`Follow the money: ${usdM(data.total)} of Tier 1 money by ${heads.join(', ').toLowerCase()}`}
        >
          {heads.map((h, i) => (
            <text
              key={h}
              x={i === cols - 1 ? (colX[i] ?? 0) + (narrow ? 10 : 14) : colX[i]}
              y={14}
              textAnchor={i === cols - 1 ? 'end' : 'start'}
              fontSize={narrow ? 9.5 : 10.5}
              fontWeight={700}
              letterSpacing="0.08em"
              fill={MUTED}
            >
              {h.toUpperCase()}
            </text>
          ))}
          {/* base flows */}
          <g>
            {graph.links.map((l) => (
              <m.path
                key={l.key}
                d={flowPath(l, l.width ?? 1)}
                fill="none"
                initial={false}
                animate={{ strokeWidth: Math.max(1, l.width ?? 1), opacity: sel ? 0.05 : 0.36, stroke: linkColor(l) }}
                transition={{ duration: dur }}
                style={{ mixBlendMode: 'multiply' }}
                onPointerEnter={(e) =>
                  show(
                    e,
                    <>
                      <div className="tt-title">
                        {(l.source as SN).label} → {(l.target as SN).label}
                      </div>
                      <div className="tt-row">
                        <span>{colorBy === 'lender' ? l.lender : GRADE_SHORT[l.grade]}</span>
                        <span>{usdM(l.value)}</span>
                      </div>
                    </>,
                  )
                }
                onPointerMove={move}
                onPointerLeave={hide}
              />
            ))}
          </g>
          {/* selection overlay: the selected money inside each flow */}
          {sel && (
            <g pointerEvents="none">
              {graph.links.map((l) => {
                const v = sel.perLink.get(l.key) ?? 0
                if (v <= 0) return null
                const w = Math.max(1, ((l.width ?? 0) * v) / l.value)
                return (
                  <m.path
                    key={l.key}
                    d={flowPath(l, w)}
                    fill="none"
                    stroke={linkColor(l)}
                    strokeWidth={w}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.92 }}
                    transition={{ duration: dur / 2 }}
                  />
                )
              })}
            </g>
          )}
          {/* nodes */}
          {graph.nodes.map((n) => {
            const v = n.value ?? 0
            const h = Math.max(2, (n.y1 ?? 0) - (n.y0 ?? 0))
            const last = (n.depth ?? 0) === cols - 1
            const on = active === n.id || validSel === n.id
            const nodeVal = sel ? d3.sum(sel.rows.filter((r) => inRow(r, n.id)), (r) => r.v) : v
            const dim = sel && nodeVal <= 0
            const lx = last ? (n.x0 ?? 0) - 6 : (n.x1 ?? 0) + 6
            const cy = ((n.y0 ?? 0) + (n.y1 ?? 0)) / 2
            const nameColor = n.id.startsWith('L:') ? lenderText[n.label as Lender] : INK
            const two = h >= 22
            const name = n.label
            const val = `${usdM(nodeVal, 0)} · ${pct(nodeVal / data.total, 0)}`
            const halo = { paintOrder: 'stroke' as const, stroke: '#F7F5F1', strokeWidth: 3, strokeLinejoin: 'round' as const }
            return (
              <g
                key={n.id}
                tabIndex={0}
                role="button"
                aria-pressed={validSel === n.id}
                aria-label={`${name} ${two ? val : usdM(nodeVal, 0)}. ${n.label}: ${usdM(v)}, ${pct(v / data.total)}. Follow this money.`}
                style={{ cursor: 'pointer', outline: 'none', transition: 'opacity 400ms' }}
                opacity={dim ? 0.35 : 1}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover(null)}
                onClick={() => toggleSel(n.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleSel(n.id)
                  }
                }}
              >
                <rect
                  x={n.x0}
                  y={n.y0}
                  width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                  height={h}
                  rx={2}
                  fill={n.id.startsWith('G:') ? gradeColor[Number(n.id.slice(2))] : n.color}
                  stroke={on ? '#B05A2B' : n.id === 'G:0' ? '#BFB197' : 'none'}
                  strokeWidth={on ? 2 : 1}
                />
                <rect x={(n.x0 ?? 0) - 4} y={(n.y0 ?? 0) - 3} width={(n.x1 ?? 0) - (n.x0 ?? 0) + 8} height={h + 6} fill="transparent" />
                <text x={lx} y={cy} dy={two && !dim ? '-0.2em' : '0.32em'} textAnchor={last ? 'end' : 'start'} fontSize={narrow ? 10 : 11.5} fontWeight={on ? 750 : 620} fill={nameColor} {...halo}>
                  {name}
                  {!two && !dim && (
                    <tspan fontWeight={450} fill={MUTED}>
                      {' '}
                      {usdM(nodeVal, 0)}
                    </tspan>
                  )}
                </text>
                {two && !dim && (
                  <text x={lx} y={cy} dy="1em" textAnchor={last ? 'end' : 'start'} fontSize={narrow ? 9.5 : 10.5} fill={MUTED} {...halo}>
                    {' '}
                    {val}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      <div className="small muted" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem', marginTop: '0.4rem' }}>
        {colorBy === 'lender'
          ? lendersPresent.map((l) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i style={{ width: 14, height: 6, borderRadius: 3, background: lenderColor[l], display: 'inline-block' }} />
                {l}
              </span>
            ))
          : [0, 1, 2, 3].map((g) => (
              <span key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i style={{ width: 14, height: 6, borderRadius: 3, background: GRADE_LINK[g], display: 'inline-block' }} />
                {g} · {gradeLabel[g]}
              </span>
            ))}
        <span>Flow width = core Tier 1 money (2024 US$). Grade 0 means no evidence found, not no obstruction.</span>
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}
