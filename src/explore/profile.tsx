/** Shared pieces for the country and firm profile pages. */
import * as d3 from 'd3'
import { Link } from 'react-router-dom'
import { Tooltip, useTooltip } from '../components/ui'
import type { Deal } from '../lib/data'
import { usdAxis, usdM } from '../lib/format'
import { useSize } from '../lib/hooks'
import { lenderColor } from '../lib/tokens'
import { bandChip } from './DealTable'

/** Year bars: food-manufacturing money (muted blue) with Tier 1 (copper) in front; optional rule markers. */
export function YearBars({
  rows,
  markers = [],
  height = 260,
}: {
  rows: { year: number; food: number; t1: number }[]
  markers?: { year: number; label: string; color: string }[]
  height?: number
}) {
  const [ref, { width }] = useSize<HTMLDivElement>()
  const { tip, show, move, hide } = useTooltip()
  const m = { top: 34, right: 10, bottom: 26, left: 46 }
  const iw = Math.max(0, width - m.left - m.right)
  const ih = height - m.top - m.bottom
  const x = d3.scaleBand<number>().domain(d3.range(2010, 2026)).range([0, iw]).padding(0.22)
  const max = d3.max(rows, (r) => Math.max(r.food, r.t1)) || 1
  const y = d3.scaleLinear().domain([0, max]).nice(4).range([ih, 0])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Money by year: ${rows.filter((r) => r.food > 0).map((r) => `${r.year} ${usdM(r.food)} food manufacturing, ${usdM(r.t1)} Tier 1`).join('; ')}`}>
          <g transform={`translate(${m.left},${m.top})`}>
            {y.ticks(4).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={iw} stroke="#E7E1D6" strokeDasharray={t ? '2 3' : undefined} />
                <text x={-6} dy="0.32em" textAnchor="end" fontSize={10.5} fill="#5E6472">
                  {t ? usdAxis(t) : '0'}
                </text>
              </g>
            ))}
            {markers.map((mk, i) => {
              const cx = (x(Math.min(2025, Math.max(2010, mk.year))) ?? 0) + (mk.year < 2010 ? 0 : x.bandwidth() / 2)
              return (
                <g key={mk.label} transform={`translate(${cx},0)`}>
                  <line y1={-6 - i * 13} y2={ih} stroke={mk.color} strokeDasharray="3 3" />
                  <text y={-10 - i * 13} x={4} fontSize={10.5} fontWeight={650} fill={mk.color}>
                    {mk.label}
                  </text>
                </g>
              )
            })}
            {rows.map((r) => (
              <g
                key={r.year}
                transform={`translate(${x(r.year)},0)`}
                onPointerEnter={(e) =>
                  show(
                    e,
                    <>
                      <div className="tt-title">{r.year}</div>
                      <div className="tt-row"><span>Tier 1</span><span>{usdM(r.t1)}</span></div>
                      <div className="tt-row"><span>All food mfg</span><span>{usdM(r.food)}</span></div>
                    </>,
                  )
                }
                onPointerMove={move}
                onPointerLeave={hide}
              >
                <rect width={x.bandwidth()} height={ih} fill="transparent" />
                <rect y={y(r.food)} width={x.bandwidth()} height={ih - y(r.food)} fill="#3B6EA5" opacity={0.28} rx={1.5} />
                <rect y={y(r.t1)} width={x.bandwidth()} height={ih - y(r.t1)} fill="#B05A2B" rx={1.5} />
              </g>
            ))}
            {d3.range(2010, 2026, width < 500 ? 3 : 1).map((yr) => (
              <text key={yr} x={(x(yr) ?? 0) + x.bandwidth() / 2} y={ih + 16} textAnchor="middle" fontSize={10.5} fill="#5E6472">
                {width < 500 || yr % 5 === 0 ? yr : `’${String(yr).slice(2)}`}
              </text>
            ))}
          </g>
        </svg>
      )}
      <div className="map-legend">
        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><span style={{ width: 10, height: 10, background: '#B05A2B', borderRadius: 2 }} />Tier 1</span>
        <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><span style={{ width: 10, height: 10, background: '#3B6EA5', opacity: 0.35, borderRadius: 2 }} />All food manufacturing</span>
        <span>US$ at 2024 prices · commitments</span>
      </div>
      <Tooltip tip={tip} />
    </div>
  )
}

/** Compact deal line: lender · year · company/title · band · amount. */
export function DealLine({ d, showCompany = true }: { d: Deal; showCompany?: boolean }) {
  return (
    <div className="pf-deal">
      <span className="lender-tag" style={{ ['--c' as string]: lenderColor[d.lender] }}>{d.lender === 'IDB Invest' ? 'IDB' : d.lender}</span>
      <span className="muted">{d.year}</span>
      <span className="t" title={`${d.company} · ${d.title ?? ''}`}>
        {d.tier1 && <span className="chip" style={{ marginRight: 6, color: '#fff', background: '#B05A2B', borderColor: '#B05A2B', fontSize: '0.62rem', padding: '0 0.4rem' }}>T1{d.supply_chain ? ' · SCF' : ''}</span>}
        {d.source_url ? (
          <a href={d.source_url} target="_blank" rel="noreferrer">
            {showCompany ? d.company : d.title ?? d.company}
          </a>
        ) : showCompany ? (
          d.company
        ) : (
          d.title
        )}
      </span>
      <span className="band">{bandChip(d.band)}</span>
      <span className="n">{usdM(d.amount)}</span>
    </div>
  )
}

export function ProfileLinks({ links }: { links: { to: string; label: string; external?: boolean }[] }) {
  return (
    <div className="pf-links">
      {links.map((l) =>
        l.external ? (
          <a key={l.label} className="explore-link" href={l.to} target="_blank" rel="noreferrer">
            {l.label} ↗
          </a>
        ) : (
          <Link key={l.label} className="explore-link" to={l.to}>
            {l.label} <span aria-hidden="true">→</span>
          </Link>
        ),
      )}
    </div>
  )
}
