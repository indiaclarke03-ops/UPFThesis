/**
 * Linked explorer views: KPI tiles, parent-group bar list, regulation strip.
 */
import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { kpis, money, type Scope } from '../lib/aggregate'
import { countryName, parentName, type Deal, type SiteData } from '../lib/data'
import { usdBn, usdM } from '../lib/format'
import { useReducedMotion } from '../lib/hooks'
import { gradeColor, gradeLabel } from '../lib/tokens'

/** Number that tweens from its previous value. */
export function Tween({ value, format }: { value: number; format: (v: number) => string }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (reduce) {
      setV(value)
      prev.current = value
      return
    }
    const c = animate(prev.current, value, { duration: 0.55, ease: [0.22, 0.61, 0.36, 1], onUpdate: setV })
    prev.current = value
    return () => c.stop()
  }, [value, reduce])
  return (
    <span aria-live="polite" aria-atomic="true">
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(v)}</span>
    </span>
  )
}

export function Kpis({ deals, scope, total }: { deals: Deal[]; scope: Scope; total: ReturnType<typeof kpis> }) {
  const k = kpis(deals, scope)
  const tiles = [
    { label: scope === 't1' ? 'Tier 1 money' : 'Food-mfg money', v: k.usd, tot: total.usd, f: (x: number) => (x >= 1000 ? usdBn(x) : usdM(x, 0)), sub: 'US$ at 2024 prices, commitments' },
    { label: 'Deals', v: k.deals, tot: total.deals, f: (x: number) => Math.round(x).toLocaleString('en-US'), sub: `of ${total.deals.toLocaleString('en-US')} in scope` },
    { label: 'Countries', v: k.countries, tot: total.countries, f: (x: number) => String(Math.round(x)), sub: 'plus regional deals' },
    { label: 'Parent groups', v: k.parents, tot: total.parents, f: (x: number) => String(Math.round(x)), sub: 'receiving money' },
  ]
  return (
    <div className="kpis">
      {tiles.map((t) => (
        <div key={t.label} className="kpi" style={{ ['--fill' as string]: `${t.tot ? Math.min(100, (t.v / t.tot) * 100) : 0}%` }}>
          <div className="kpi-label">{t.label}</div>
          <div className="kpi-value">
            <Tween value={t.v} format={t.f} />
          </div>
          <div className="kpi-sub">
            {t.tot && t.v < t.tot ? `${((t.v / t.tot) * 100).toFixed(1)}% of all · ` : ''}
            {t.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ParentBars({
  data,
  deals,
  scope,
  active,
  highlight,
  onPick,
}: {
  data: SiteData
  deals: Deal[]
  scope: Scope
  active: string | null
  highlight?: string[]
  onPick: (p: string | null) => void
}) {
  const m = new Map<string, { usd: number; n: number; iso: Set<string> }>()
  for (const d of deals) {
    if (!d.parent) continue
    const v = money(d, scope)
    if (v <= 0) continue
    const e = m.get(d.parent) ?? { usd: 0, n: 0, iso: new Set() }
    e.usd += v
    e.n += 1
    if (d.iso3) e.iso.add(d.iso3)
    m.set(d.parent, e)
  }
  const rows = [...m.entries()].sort((a, b) => b[1].usd - a[1].usd).slice(0, 40)
  const max = rows[0]?.[1].usd || 1
  if (!rows.length) return <p className="muted small">No parent groups in this filter.</p>
  return (
    <ul className="bars">
      {rows.map(([p, v]) => {
        const g = data.firmByParent.get(p)?.grade
        const on = active === p
        return (
          <li key={p} className={highlight?.includes(p) || on ? 'hl' : ''}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? null : p)}
              title={g != null ? `COI grade ${g}: ${gradeLabel[g]}` : undefined}
            >
              <div className="bl-top">
                <span className="bl-name">
                  {g != null && <span className="grade-dot" style={{ background: gradeColor[g] }} aria-label={`grade ${g}`} />}
                  {parentName(p)}
                </span>
                <span className="bl-val">
                  {usdM(v.usd, 0)} <span className="muted" style={{ fontWeight: 400 }}>· {v.n}</span>
                </span>
              </div>
              <div className="bl-track">
                <div className="bl-fill" style={{ width: `${(v.usd / max) * 100}%`, background: on ? '#14213D' : '#B05A2B' }} />
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Regulation strip: for each country in the filter, the voluntary → binding timeline and its deals. */
export function RegStrip({ data, deals, scope }: { data: SiteData; deals: Deal[]; scope: Scope }) {
  const byIso = new Map<string, { usd: number; years: { y: number; v: number }[] }>()
  for (const d of deals) {
    if (!d.iso3 || d.year == null) continue
    const v = money(d, scope)
    if (v <= 0) continue
    const e = byIso.get(d.iso3) ?? { usd: 0, years: [] }
    e.usd += v
    e.years.push({ y: d.year, v })
    byIso.set(d.iso3, e)
  }
  const rows = [...byIso.entries()].sort((a, b) => b[1].usd - a[1].usd).slice(0, 30)
  const Y0 = 2005
  const Y1 = 2026
  const xp = (y: number) => ((y - Y0) / (Y1 - Y0)) * 100
  const rMax = Math.sqrt(Math.max(1, ...rows.flatMap(([, e]) => e.years.map((y) => y.v))))
  return (
    <div>
      <div className="regstrip-row" style={{ fontSize: '0.68rem', color: 'var(--muted)', height: 18 }}>
        <span />
        <span style={{ position: 'relative', height: 14 }}>
          {[2005, 2010, 2015, 2020, 2025].map((y) => (
            <span key={y} style={{ position: 'absolute', left: `${xp(y)}%`, transform: 'translateX(-50%)' }}>
              {y}
            </span>
          ))}
        </span>
      </div>
      <div className="regstrip">
        {rows.map(([iso, e]) => {
          const c = data.countryByIso.get(iso)!
          const vol = c.first_voluntary
          const bind = c.first_binding
          return (
            <div className="regstrip-row" key={iso}>
              <Link to={`/country/${iso}`} title={`Open ${countryName(c.name)} profile`}>
                {countryName(c.name)}
              </Link>
              <svg width="100%" height="18" aria-label={`${countryName(c.name)}: ${vol ? `voluntary rules from ${vol}` : 'no voluntary rule'}; ${bind ? `binding from ${bind}` : 'no binding rule'}`} style={{ overflow: 'visible' }}>
                <line x1="0" x2="100%" y1="9" y2="9" stroke="#E7E1D6" />
                {vol != null && (!bind || vol < bind) && <rect x={`${xp(Math.max(Y0, vol))}%`} width={`${xp(bind ?? Y1) - xp(Math.max(Y0, vol))}%`} y="5" height="8" fill="#9ED3CF" rx="2" />}
                {bind != null && <rect x={`${xp(Math.max(Y0, bind))}%`} width={`${xp(Y1) - xp(Math.max(Y0, bind))}%`} y="5" height="8" fill="#0F6E6E" rx="2" />}
                {e.years.map((d, i) => (
                  <circle key={i} cx={`${xp(d.y + 0.5)}%`} cy="9" r={2 + (Math.sqrt(d.v) / rMax) * 5} fill="#B05A2B" stroke="#fff" strokeWidth="0.8" opacity="0.9" />
                ))}
              </svg>
            </div>
          )
        })}
      </div>
      <div className="map-legend" style={{ marginTop: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 8, background: '#9ED3CF', borderRadius: 2 }} />Voluntary</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 8, background: '#0F6E6E', borderRadius: 2 }} />Binding UPF rule in force</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, background: '#B05A2B', borderRadius: '50%' }} />Deal (sized by money)</span>
      </div>
    </div>
  )
}
