/** Side drawer with the full coding card for one deal. */
import { AnimatePresence, motion as m } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { countryName, parentName, type Deal, type SiteData } from '../lib/data'
import { usdM } from '../lib/format'
import { useReducedMotion } from '../lib/hooks'
import { bandLabel, gradeColor, gradeLabel, lenderColor, lenderLong } from '../lib/tokens'
import { bandChip } from './DealTable'

export function DealDrawer({ data, deal, onClose }: { data: SiteData; deal: Deal | null; onClose: () => void }) {
  const reduce = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!deal) return
    closeRef.current?.focus()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [deal, onClose])

  return (
    <AnimatePresence>
      {deal && (
        <>
          <m.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <m.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Coding card: ${deal.company}`}
            initial={{ x: reduce ? 0 : 480, opacity: reduce ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : 480, opacity: reduce ? 0 : 1 }}
            transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <button ref={closeRef} type="button" className="drawer-close" onClick={onClose} aria-label="Close">
              ×
            </button>
            <DealCard data={data} d={deal} />
          </m.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function DealCard({ data, d }: { data: SiteData; d: Deal }) {
  const firm = d.parent ? data.firmByParent.get(d.parent) : undefined
  const c = d.iso3 ? data.countryByIso.get(d.iso3) : undefined
  const inForce = d.iso3 && d.year != null ? data.regulation.filter((e) => e.iso3 === d.iso3 && e.year != null && e.year <= d.year! && (e.end == null || e.end >= d.year!) && !e.strength.includes('future') && !e.strength.includes('not implemented')) : []
  const binding = inForce.filter((e) => e.strength === 'Binding')
  const voluntary = inForce.filter((e) => e.strength !== 'Binding')
  return (
    <div>
      <div className="kicker" style={{ marginBottom: 0 }}>
        <span style={{ color: lenderColor[d.lender] }}>●</span> {d.lender} · {d.year} · {d.id}
      </div>
      <h2>{d.company}</h2>
      <p className="small muted" style={{ marginBottom: '0.6rem' }}>
        {d.title}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {d.tier1 ? (
          <span className="chip" style={{ background: '#B05A2B', color: '#fff', borderColor: '#B05A2B' }}>
            Tier 1 {d.supply_chain ? '· supply-chain finance' : ''}
          </span>
        ) : (
          <span className="chip">Food manufacturing, not Tier 1</span>
        )}
        <span className="chip">{d.status}</span>
      </div>
      <dl>
        <dt>Commitment</dt>
        <dd>
          <strong>{usdM(d.amount)}</strong> <span className="muted small">2024 US$</span>
        </dd>
        <dt>Counted as</dt>
        <dd>{d.tier1 ? (d.supply_chain ? `Supply-chain Tier 1 (${usdM(d.sc_t1)}, separate measure)` : `Core Tier 1 (${usdM(d.t1)})`) : d.food ? `Core food manufacturing (${usdM(d.food)})` : d.measure}</dd>
        <dt>Lender</dt>
        <dd>{lenderLong[d.lender]}</dd>
        <dt>Country</dt>
        <dd>
          {d.iso3 ? <Link to={`/country/${d.iso3}`}>{countryName(c?.name ?? d.country)}</Link> : <span>{d.country ?? 'Regional'} (regional deal)</span>}
          {d.income && <span className="muted small"> · {d.income}-income at approval</span>}
        </dd>
        <dt>Sector</dt>
        <dd>{d.sector ?? '—'}</dd>
        <dt>Role</dt>
        <dd>{d.role}</dd>
      </dl>

      <div className="card">
        <div className="card-k">NOVA band and coding reason</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
          {bandChip(d.band)} <span className="small">{d.band ? bandLabel[d.band] : 'Not banded'}</span>
        </div>
        <p className="small" style={{ margin: 0 }}>
          {d.reason ?? 'No reason recorded.'}
        </p>
        <p className="small muted" style={{ margin: '0.4rem 0 0' }}>
          Banding is a coding judgement (confidence {d.confidence?.toFixed(2) ?? '—'}). Second-coder κ for UPF status: 0.35 (0.55 without “Unsure”).
        </p>
      </div>

      <div className="card">
        <div className="card-k">Evidence source</div>
        {d.source_url ? (
          <a href={d.source_url} target="_blank" rel="noreferrer">
            {d.lender}’s own disclosure page ↗
          </a>
        ) : (
          '—'
        )}
        {d.project_id && <div className="small muted">Project ID {d.project_id}</div>}
      </div>

      <div className="card">
        <div className="card-k">Regulation in {countryName(c?.name ?? d.country)} in {d.year}</div>
        {!d.iso3 ? (
          <p className="small muted" style={{ margin: 0 }}>Regional deal: no single country’s regulation applies.</p>
        ) : (
          <>
            <p className="small" style={{ margin: '0 0 0.4rem' }}>
              {d.binding === 1 ? (
                <strong style={{ color: '#0F6E6E' }}>A binding UPF rule was in force at approval.</strong>
              ) : (
                <strong>No binding UPF rule was in force at approval.</strong>
              )}{' '}
              {c?.first_binding ? `First binding rule: ${c.first_binding}.` : 'No binding rule recorded to 2025.'}
            </p>
            {binding.length + voluntary.length > 0 && (
              <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {[...binding, ...voluntary].slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <span style={{ color: e.strength === 'Binding' ? '#0F6E6E' : '#5E6472', fontWeight: 600 }}>{e.domain}</span> ({e.strength.toLowerCase()}, {e.year})
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-k">Parent group and conflict-of-interest grade</div>
        {d.parent ? (
          <>
            <div>
              {firm ? <Link to={`/firm/${firm.slug}`}>{parentName(d.parent)}</Link> : parentName(d.parent)}
            </div>
            {firm ? (
              <>
                <div className="ladder" aria-hidden="true">
                  {[0, 1, 2, 3].map((g) => (
                    <span key={g} className={g === firm.grade ? 'on' : ''} style={{ background: gradeColor[g] }} />
                  ))}
                </div>
                <div className="small">
                  Grade {firm.grade}: {gradeLabel[firm.grade]}
                  {firm.grade === 0 && <span className="muted"> (no evidence found, not “no obstruction”)</span>}
                </div>
              </>
            ) : (
              <div className="small muted">This group received no core Tier 1 money, so it was not graded.</div>
            )}
          </>
        ) : (
          <div className="small muted">No parent group assigned.</div>
        )}
      </div>
    </div>
  )
}
