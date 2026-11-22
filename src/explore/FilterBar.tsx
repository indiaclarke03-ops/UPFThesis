/**
 * Sticky global filter bar. Every control writes to the URL via onChange.
 */
import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_FILTERS, filterDeals, money, type Filters } from '../lib/aggregate'
import { countryName, parentName, type SiteData } from '../lib/data'
import { bandColor, gradeColor, gradeLabel, incomeColor, LENDERS, lenderColor } from '../lib/tokens'

interface Props {
  data: SiteData
  f: Filters
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}

export function FilterBar({ data, f, onChange, onReset }: Props) {
  const [collapsed, setCollapsed] = useState(true)
  const [q, setQ] = useState(f.q)
  useEffect(() => setQ(f.q), [f.q])
  // debounce search into the URL
  useEffect(() => {
    if (q === f.q) return
    const id = setTimeout(() => onChange({ q }), 250)
    return () => clearTimeout(id)
  }, [q, f.q, onChange])

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const countryOpts = useMemo(
    () =>
      data.countries
        .filter((c) => c.n_food > 0)
        .map((c) => ({ iso3: c.iso3, name: countryName(c.name), t1: c.t1 }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.countries],
  )

  const active: { label: string; clear: Partial<Filters> }[] = []
  f.iso3s.forEach((i) =>
    active.push({ label: i === 'REGIONAL' ? 'Regional deals' : countryName(data.countryByIso.get(i)?.name ?? i), clear: { iso3s: f.iso3s.filter((x) => x !== i) } }),
  )
  if (f.parent) active.push({ label: parentName(f.parent), clear: { parent: null } })
  if (f.q) active.push({ label: `“${f.q}”`, clear: { q: '' } })

  const nFilters =
    f.lenders.length + f.iso3s.length + f.income.length + f.bands.length + f.grades.length + (f.binding !== 'any' ? 1 : 0) + (f.parent ? 1 : 0) + (f.q ? 1 : 0) + (f.y0 !== 2010 || f.y1 !== 2025 ? 1 : 0) + (f.scope !== 't1' ? 1 : 0)

  return (
    <div className={`fbar ${collapsed ? 'collapsed' : ''}`} role="region" aria-label="Filters">
      <div className="fbar-row">
        <div className="fgroup" role="group" aria-label="Scope">
          <span className="fgroup-label">Scope</span>
          <div className="toggle">
            <button type="button" aria-pressed={f.scope === 't1'} onClick={() => onChange({ scope: 't1' })} title="Tier 1: manufacturers with NOVA 4 at least 20% of sales">
              Tier 1
            </button>
            <button type="button" aria-pressed={f.scope === 'food'} onClick={() => onChange({ scope: 'food' })} title="All food-manufacturing deals">
              All food mfg
            </button>
          </div>
        </div>
        <div className="fgroup" role="group" aria-label="Lender">
          <span className="fgroup-label">Lender</span>
          {LENDERS.map((l) => {
            const on = f.lenders.includes(l)
            return (
              <button key={l} type="button" className="fchip" aria-pressed={on} style={on ? { background: '#14213D' } : undefined} onClick={() => onChange({ lenders: toggle(f.lenders, l) })}>
                <span className="sw" style={{ background: lenderColor[l] }} />
                {l}
              </button>
            )
          })}
        </div>
        <YearBrush data={data} f={f} onChange={onChange} />
        <input
          className="fsearch"
          type="search"
          placeholder="Search company, country…"
          aria-label="Search deals"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn fbar-toggle" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem' }} aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? 'More filters' : 'Fewer filters'}
          {nFilters > 0 && ` (${nFilters})`}
        </button>
        {nFilters > 0 && (
          <button type="button" className="btn" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem' }} onClick={onReset}>
            Reset
          </button>
        )}
      </div>
      <div className="fbar-row more" style={{ marginTop: '0.45rem' }}>
        <div className="fgroup">
          <label className="fgroup-label" htmlFor="f-country">
            Country
          </label>
          <select
            id="f-country"
            className="fselect"
            value=""
            onChange={(e) => e.target.value && onChange({ iso3s: toggle(f.iso3s, e.target.value) })}
          >
            <option value="">Add country / region…</option>
            <option value="REGIONAL">Regional / multi-country deals</option>
            {countryOpts.map((c) => (
              <option key={c.iso3} value={c.iso3}>
                {c.name}
                {c.t1 > 0 ? ` · US$${Math.round(c.t1)}m` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="fgroup" role="group" aria-label="Income group at approval">
          <span className="fgroup-label">Income</span>
          {['High', 'Middle', 'Low', 'Regional'].map((i) => {
            const on = f.income.includes(i)
            return (
              <button key={i} type="button" className="fchip" aria-pressed={on} style={on ? { background: '#14213D' } : undefined} onClick={() => onChange({ income: toggle(f.income, i) })}>
                <span className="sw" style={{ background: incomeColor[i] }} />
                {i}
              </button>
            )
          })}
        </div>
        <div className="fgroup" role="group" aria-label="NOVA band">
          <span className="fgroup-label">Band</span>
          {(f.scope === 't1' ? ['A', 'B'] : ['A', 'B', 'C', 'C/D', 'D', 'E']).map((b) => {
            const on = f.bands.includes(b)
            return (
              <button key={b} type="button" className="fchip" aria-pressed={on} style={on ? { background: '#14213D' } : undefined} onClick={() => onChange({ bands: toggle(f.bands, b) })}>
                <span className="sw" style={{ background: bandColor[b] }} />
                {b}
              </button>
            )
          })}
        </div>
        <div className="fgroup" role="group" aria-label="Binding regulation at approval">
          <span className="fgroup-label">Binding rule at approval</span>
          <div className="toggle">
            {(['any', 'yes', 'no'] as const).map((b) => (
              <button key={b} type="button" aria-pressed={f.binding === b} onClick={() => onChange({ binding: b })}>
                {b === 'any' ? 'Any' : b === 'yes' ? 'In force' : 'Not in force'}
              </button>
            ))}
          </div>
        </div>
        <div className="fgroup" role="group" aria-label="Conflict-of-interest grade of the parent group">
          <span className="fgroup-label">COI grade</span>
          {[0, 1, 2, 3].map((g) => {
            const on = f.grades.includes(g)
            return (
              <button key={g} type="button" className="fchip" aria-pressed={on} title={gradeLabel[g]} style={on ? { background: '#14213D' } : undefined} onClick={() => onChange({ grades: toggle(f.grades, g) })}>
                <span className="sw" style={{ background: gradeColor[g] }} />
                {g}
              </button>
            )
          })}
        </div>
      </div>
      {active.length > 0 && (
        <div className="fbar-active">
          {active.map((a) => (
            <button key={a.label} type="button" className="pill" onClick={() => onChange(a.clear)} aria-label={`Remove filter ${a.label}`}>
              {a.label} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Mini timeline of money by year with a d3 brush for the year range. */
function YearBrush({ data, f, onChange }: Omit<Props, "onReset">) {
  const ref = useRef<SVGGElement>(null)
  const W = 168
  const H = 30
  const x = useMemo(() => d3.scaleBand<number>().domain(d3.range(2010, 2026)).range([0, W]).padding(0.15), [])
  // bars use all filters except the year range, so the brush shows context
  const yearly = useMemo(() => {
    const pool = filterDeals(data.deals, { ...f, y0: 2010, y1: 2025 }, data.firmByParent)
    const m = new Map<number, number>()
    for (const d of pool) if (d.year != null) m.set(d.year, (m.get(d.year) ?? 0) + money(d, f.scope))
    return d3.range(2010, 2026).map((y) => ({ y, v: m.get(y) ?? 0 }))
  }, [data, f])
  const yMax = d3.max(yearly, (d) => d.v) || 1

  const fRef = useRef(f)
  fRef.current = f
  useEffect(() => {
    const g = ref.current
    if (!g) return
    const step = x.step()
    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [W, H],
      ])
      .on('end', (ev: d3.D3BrushEvent<unknown>) => {
        if (!ev.sourceEvent) return
        if (!ev.selection) {
          onChange({ y0: DEFAULT_FILTERS.y0, y1: DEFAULT_FILTERS.y1 })
          return
        }
        const [a, b] = ev.selection as [number, number]
        const y0 = Math.max(2010, Math.min(2025, 2010 + Math.round(a / step)))
        const y1 = Math.max(y0, Math.min(2025, 2010 + Math.round(b / step) - 1))
        onChange({ y0, y1 })
      })
    const sel = d3.select(g)
    sel.call(brush)
    const cur = fRef.current
    if (cur.y0 !== 2010 || cur.y1 !== 2025) sel.call(brush.move, [(cur.y0 - 2010) * step, (cur.y1 - 2010 + 1) * step])
    else sel.call(brush.move, null)
    return () => {
      sel.on('.brush', null)
    }
  }, [x, onChange, f.y0, f.y1])

  return (
    <div className="fbar-brush" role="group" aria-label="Year range">
      <span className="fgroup-label">Years</span>
      <svg width={W} height={H} aria-hidden="true" style={{ overflow: 'visible' }}>
        {yearly.map((d) => (
          <rect
            key={d.y}
            x={x(d.y)}
            width={x.bandwidth()}
            y={H - (d.v / yMax) * (H - 2)}
            height={(d.v / yMax) * (H - 2)}
            fill={d.y >= f.y0 && d.y <= f.y1 ? '#B05A2B' : '#C9C2B4'}
            rx={1}
          />
        ))}
        <g ref={ref} className="brush" />
      </svg>
      <span className="years">
        {f.y0}–{f.y1}
      </span>
      <label className="sr-only" htmlFor="f-y0">
        From year
      </label>
      <select id="f-y0" className="sr-only" value={f.y0} onChange={(e) => onChange({ y0: Number(e.target.value), y1: Math.max(Number(e.target.value), f.y1) })}>
        {d3.range(2010, 2026).map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="f-y1">
        To year
      </label>
      <select id="f-y1" className="sr-only" value={f.y1} onChange={(e) => onChange({ y1: Number(e.target.value), y0: Math.min(Number(e.target.value), f.y0) })}>
        {d3.range(2010, 2026).map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}
