/**
 * Virtualised, sortable, searchable deal table. Hand-rolled column model
 * (sort + render) over @tanstack/react-virtual for rows.
 */
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { countryName, parentName, type Deal } from '../lib/data'
import { num1 } from '../lib/format'
import { bandColor, lenderColor } from '../lib/tokens'

type Key = 'lender' | 'year' | 'company' | 'parent' | 'country' | 'sector' | 'title' | 'role' | 'band' | 'amount' | 'measure' | 'confidence' | 'source'

interface Col {
  key: Key
  label: string
  width: string
  num?: boolean
  sortVal?: (d: Deal) => string | number | null
  render: (d: Deal) => ReactNode
}

export const bandChip = (b: string | null) =>
  b ? (
    <span className="band-chip" style={{ background: bandColor[b] ?? '#eee', color: b === 'A' ? '#fff' : '#14213D' }}>
      {b}
    </span>
  ) : (
    <span className="muted">—</span>
  )

const COLS: Col[] = [
  { key: 'lender', label: 'Lender', width: '96px', sortVal: (d) => d.lender, render: (d) => <span className="lender-tag" style={{ ['--c' as string]: lenderColor[d.lender] }}>{d.lender}</span> },
  { key: 'year', label: 'Year', width: '56px', num: true, sortVal: (d) => d.year, render: (d) => d.year },
  { key: 'company', label: 'Company', width: 'minmax(180px,1.4fr)', sortVal: (d) => d.company, render: (d) => <span title={d.company ?? ''}>{d.company}</span> },
  { key: 'parent', label: 'Parent group', width: 'minmax(150px,1fr)', sortVal: (d) => d.parent, render: (d) => (d.parent ? parentName(d.parent) : <span className="muted">—</span>) },
  { key: 'country', label: 'Country', width: '130px', sortVal: (d) => d.country, render: (d) => (d.regional ? <span className="muted">{d.country ?? 'Regional'}</span> : countryName(d.country)) },
  { key: 'sector', label: 'Sector', width: '150px', sortVal: (d) => d.sector, render: (d) => <span title={d.sector ?? ''}>{d.sector}</span> },
  { key: 'title', label: 'Product / title', width: 'minmax(180px,1.3fr)', sortVal: (d) => d.title, render: (d) => <span title={d.title ?? ''}>{d.title}</span> },
  { key: 'role', label: 'Role', width: '120px', sortVal: (d) => d.role, render: (d) => d.role },
  { key: 'band', label: 'Band', width: '60px', sortVal: (d) => d.band, render: (d) => bandChip(d.band) },
  { key: 'amount', label: 'US$m 2024', width: '92px', num: true, sortVal: (d) => d.amount, render: (d) => <strong style={{ color: d.tier1 ? '#9A4A1F' : undefined }}>{num1(d.amount)}</strong> },
  { key: 'measure', label: 'Measure', width: '96px', sortVal: (d) => d.measure, render: (d) => (d.supply_chain ? 'supply chain' : d.measure) },
  { key: 'confidence', label: 'Conf.', width: '56px', num: true, sortVal: (d) => d.confidence, render: (d) => (d.confidence != null ? d.confidence.toFixed(2) : '—') },
  {
    key: 'source',
    label: 'Source',
    width: '74px',
    render: (d) =>
      d.source_url ? (
        <a href={d.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`Lender disclosure for ${d.company} (opens in new tab)`}>
          Lender ↗
        </a>
      ) : (
        '—'
      ),
  },
]

export function DealTable({ deals, selected, onSelect }: { deals: Deal[]; selected: string | null; onSelect: (d: Deal) => void }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'amount', dir: -1 })
  const scrollRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => {
    const col = COLS.find((c) => c.key === sort.key)
    if (!col?.sortVal) return deals
    const v = col.sortVal
    return [...deals].sort((a, b) => {
      const x = v(a)
      const y = v(b)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir
    })
  }, [deals, sort])

  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 40, overscan: 12 })
  const cols = COLS.map((c) => c.width).join(' ')

  return (
    <div className="dt-scroll" ref={scrollRef} role="table" aria-label="Deals in the current filter" aria-rowcount={rows.length + 1}>
      <div className="dt-inner" style={{ ['--cols' as string]: cols }}>
        <div className="dt-head" role="row">
          {COLS.map((c) => {
            const on = sort.key === c.key
            return (
              <div role="columnheader" key={c.key} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} style={{ display: 'contents' }}>
                {c.sortVal ? (
                  <button
                    type="button"
                    className={c.num ? 'n' : ''}
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? ((-s.dir) as 1 | -1) : c.num ? -1 : 1 }))}
                  >
                    {c.label}
                    <span aria-hidden="true">{on ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
                  </button>
                ) : (
                  <button type="button" disabled style={{ cursor: 'default' }}>
                    {c.label}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map((vi) => {
            const d = rows[vi.index]
            return (
              <div
                key={d.id}
                role="row"
                aria-rowindex={vi.index + 2}
                tabIndex={0}
                className={`dt-row ${selected === d.id ? 'sel' : ''}`}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: vi.size, transform: `translateY(${vi.start}px)` }}
                onClick={() => onSelect(d)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(d)
                  }
                }}
              >
                {COLS.map((c) => (
                  <div role="cell" key={c.key} className={c.num ? 'n' : ''}>
                    {c.render(d)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        {rows.length === 0 && <p className="muted" style={{ padding: '2rem', textAlign: 'center' }}>No deals match these filters.</p>}
      </div>
    </div>
  )
}

/** CSV of the filtered public table (whitelisted, sanitised columns only). */
export function toCSV(deals: Deal[]): string {
  const head = ['deal_id', 'lender', 'project_id', 'year', 'company', 'parent_group', 'iso3', 'country', 'sector', 'products_or_title', 'role', 'nova4_band', 'tier1', 'money_measure', 'amount_usd_m_2024', 'core_t1_usd_m_2024', 'core_food_usd_m_2024', 'supply_chain_t1_usd_m_2024', 'income_at_approval', 'binding_in_force_at_approval', 'confidence', 'coding_reason', 'source_url']
  const esc = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = deals.map((d) =>
    [d.id, d.lender, d.project_id, d.year, d.company, d.parent, d.iso3, d.country, d.sector, d.title, d.role, d.band, d.tier1 ? 1 : 0, d.measure, d.amount, d.t1, d.food, d.sc_t1, d.income, d.binding, d.confidence, d.reason, d.source_url].map(esc).join(','),
  )
  return [head.join(','), ...lines].join('\n')
}
