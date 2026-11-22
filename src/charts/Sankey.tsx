/**
 * "Follow the money" Sankey: lender → income group at approval → parent group
 * → COI obstruction grade, for Tier 1 core money (US$m 2024) of the filtered
 * deals. Display aggregation only. Links are coloured by lender.
 */
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'
import { useMemo, useState } from 'react'
import { money } from '../lib/aggregate'
import { parentName, type Deal, type Firm } from '../lib/data'
import { usdM } from '../lib/format'
import { useSize } from '../lib/hooks'
import { gradeColor, gradeLabel, incomeColor, LENDERS, lenderColor, type Lender } from '../lib/tokens'
import { Tooltip, useTooltip } from '../components/ui'

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
  source: string
  target: string
  value: number
  lender: Lender
}
type SN = SankeyNode<N, L>
type SL = SankeyLink<N, L>

const TOP_N = 12
const OTHER = 'Other groups'
const INCOME_ORDER = ['High', 'Middle', 'Low', 'Regional']

function build(deals: Deal[], firmByParent: Map<string, Firm>, topN = TOP_N) {
  const rows = deals.filter((d) => money(d, 't1') > 0)
  const byParent = d3.rollup(rows, (v) => d3.sum(v, (d) => money(d, 't1')), (d) => d.parent ?? 'Unassigned')
  const top = new Set(
    [...byParent.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map((e) => e[0]),
  )
  const nodes = new Map<string, N>()
  const links = new Map<string, L>()
  const add = (n: N) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n)
  }
  const link = (s: string, t: string, v: number, lender: Lender) => {
    const k = `${s}|${t}|${lender}`
    const e = links.get(k)
    if (e) e.value += v
    else links.set(k, { source: s, target: t, value: v, lender })
  }
  for (const d of rows) {
    const v = money(d, 't1')
    const inc = d.income ?? 'Regional'
    const p = d.parent ?? 'Unassigned'
    const pKey = top.has(p) ? p : OTHER
    const g = (d.parent ? firmByParent.get(d.parent)?.grade : 0) ?? 0
    add({ id: `L:${d.lender}`, label: d.lender, col: 0, color: lenderColor[d.lender] })
    add({ id: `I:${inc}`, label: inc === 'Regional' ? 'Regional deals' : `${inc} income`, col: 1, color: incomeColor[inc] ?? '#9AA0A6' })
    add({ id: `P:${pKey}`, label: pKey === OTHER ? OTHER : parentName(pKey), col: 2, color: '#5E6472' })
    add({ id: `G:${g}`, label: `${g} · ${gradeLabel[g]}`, col: 3, color: gradeColor[g] })
    link(`L:${d.lender}`, `I:${inc}`, v, d.lender)
    link(`I:${inc}`, `P:${pKey}`, v, d.lender)
    link(`P:${pKey}`, `G:${g}`, v, d.lender)
  }
  return { nodes: [...nodes.values()], links: [...links.values()], total: d3.sum(rows, (d) => money(d, 't1')) }
}

function order(n: N): number {
  if (n.col === 0) return LENDERS.indexOf(n.label as Lender)
  if (n.col === 1) return INCOME_ORDER.findIndex((i) => n.id === `I:${i}`)
  if (n.col === 3) return -Number(n.id.slice(2))
  return 0
}

export function FollowTheMoney({ deals, firmByParent, height: hProp }: FollowTheMoneyProps) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()
  const [focus, setFocus] = useState<{ kind: 'lender' | 'node'; id: string } | null>(null)
  const narrow = width > 0 && width < 640
  const data = useMemo(() => build(deals, firmByParent, narrow ? 7 : TOP_N), [deals, firmByParent, narrow])
  const height = hProp ?? (narrow ? 580 : 540)
  const mr = narrow ? 64 : 210
  const mt = narrow ? 8 : 26

  const graph = useMemo(() => {
    if (width <= 0 || data.links.length === 0) return null
    const gen = sankey<N, L>()
      .nodeId((n) => n.id)
      .nodeWidth(narrow ? 10 : 14)
      .nodePadding(narrow ? 7 : 10)
      .nodeSort((a, b) => {
        if (a.col === 2) {
          if (a.label === OTHER) return 1
          if (b.label === OTHER) return -1
          return (b.value ?? 0) - (a.value ?? 0)
        }
        return order(a) - order(b)
      })
      .extent([
        [4, mt],
        [width - mr, height - 6],
      ])
    return gen({ nodes: data.nodes.map((n) => ({ ...n })), links: data.links.map((l) => ({ ...l })) })
  }, [data, width, height, narrow, mr, mt])

  if (data.links.length === 0)
    return (
      <div ref={ref} className="card muted small" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        No Tier 1 money in the current selection. Widen the filters to follow the money.
      </div>
    )

  const isOn = (l: SL) => {
    if (!focus) return true
    if (focus.kind === 'lender') return l.lender === focus.id
    return (l.source as SN).id === focus.id || (l.target as SN).id === focus.id
  }
  const colX = graph ? [0, 1, 2, 3].map((c) => graph.nodes.find((n) => n.col === c)?.x0 ?? 0) : []
  const heads = ['Lender', 'Income at approval', 'Parent group', 'Obstruction grade']
  const leave = () => {
    setFocus(null)
    hide()
  }

  return (
    <div ref={ref} style={{ width: '100%', position: 'relative' }}>
      {graph && (
        <svg width={width} height={height} role="img" aria-label={`Follow the money: ${usdM(data.total)} of Tier 1 money from lender to income group, parent group and obstruction grade`}>
          {!narrow &&
            heads.map((h, i) => (
              <text key={h} x={colX[i]} y={11} fontSize={10} fontWeight={700} letterSpacing="0.08em" fill="#5E6472">
                {h.toUpperCase()}
              </text>
            ))}
          <g fill="none">
            {graph.links.map((l, i) => {
              const on = isOn(l)
              return (
                <path
                  key={i}
                  d={sankeyLinkHorizontal()(l as never) ?? ''}
                  stroke={lenderColor[l.lender]}
                  strokeOpacity={on ? (focus ? 0.7 : 0.42) : 0.07}
                  strokeWidth={Math.max(1, l.width ?? 1)}
                  style={{ transition: 'stroke-opacity 300ms var(--ease)' }}
                  onPointerEnter={(e) => {
                    setFocus({ kind: 'lender', id: l.lender })
                    show(
                      e,
                      <>
                        <div className="tt-title">
                          {(l.source as SN).label} → {(l.target as SN).label}
                        </div>
                        <div className="tt-row">
                          <span>{l.lender}</span>
                          <span>{usdM(l.value)}</span>
                        </div>
                        <div className="tt-row">
                          <span>Share of selection</span>
                          <span>{((l.value / data.total) * 100).toFixed(1)}%</span>
                        </div>
                      </>,
                    )
                  }}
                  onPointerMove={move}
                  onPointerLeave={leave}
                />
              )
            })}
          </g>
          {graph.nodes.map((n) => {
            const v = n.value ?? 0
            const h = (n.y1 ?? 0) - (n.y0 ?? 0)
            const showLabel = h > (narrow ? 8 : 6)
            const label = narrow && n.col === 3 ? `Grade ${n.id.slice(2)}` : narrow && n.col === 1 ? n.label.replace(' income', '').replace(' deals', '') : truncate(n.label, narrow ? 12 : n.col === 3 ? 44 : 26)
            return (
              <g
                key={n.id}
                onPointerEnter={(e) => {
                  setFocus(n.col === 0 ? { kind: 'lender', id: n.label } : { kind: 'node', id: n.id })
                  show(
                    e,
                    <>
                      <div className="tt-title">{n.label}</div>
                      <div className="tt-row">
                        <span>Tier 1 money</span>
                        <span>{usdM(v)}</span>
                      </div>
                      <div className="tt-row">
                        <span>Share of selection</span>
                        <span>{((v / data.total) * 100).toFixed(1)}%</span>
                      </div>
                      {n.id === 'G:0' && <div style={{ marginTop: 4, opacity: 0.85 }}>Grade 0 means no evidence found, not no obstruction.</div>}
                    </>,
                  )
                }}
                onPointerMove={move}
                onPointerLeave={leave}
              >
                <rect x={n.x0} y={n.y0} width={(n.x1 ?? 0) - (n.x0 ?? 0)} height={Math.max(1, h)} fill={n.color} rx={2} stroke={n.id === 'G:0' ? '#B5A68C' : 'none'} />
                {showLabel && (
                  <text
                    x={(n.x1 ?? 0) + 6}
                    y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                    dy="0.32em"
                    fontSize={narrow ? 9.5 : 11.5}
                    fontWeight={n.col === 0 ? 700 : 560}
                    fill="#14213D"
                    style={{ paintOrder: 'stroke', stroke: '#F7F5F1', strokeWidth: 3, strokeLinejoin: 'round' }}
                    pointerEvents="none"
                  >
                    {label}
                    {(!narrow || n.col === 0) && <tspan fill="#5E6472" fontWeight={400}>
                      {' '}
                      {v >= 1000 ? `${(v / 1000).toFixed(2)}bn` : `${Math.round(v)}m`}
                    </tspan>}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
