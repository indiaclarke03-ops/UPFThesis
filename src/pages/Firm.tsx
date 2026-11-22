/** /firm/:slug: one parent group's subsidiaries, deals, lenders, grade and evidence. */
import * as d3 from 'd3'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Info } from '../components/Info'
import { Skeleton } from '../components/ui'
import { exploreHref } from '../lib/aggregate'
import { countryName, parentName, useData } from '../lib/data'
import { usdBn, usdM } from '../lib/format'
import { gradeColor, gradeLabel, LENDERS, lenderColor, lenderLong } from '../lib/tokens'
import { DealLine, ProfileLinks, YearBars } from '../explore/profile'
import '../explore/explore.css'
import './profile_pages.css'

const YILDIZ = 'Yildiz Holding (Ulker/pladis)'

export default function Firm() {
  const { slug = '' } = useParams()
  const data = useData()

  const view = useMemo(() => {
    if (!data) return null
    const f = data.firmBySlug.get(slug)
    if (!f) return { f: null }
    const deals = data.deals.filter((d) => d.parent === f.parent).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.amount ?? 0) - (a.amount ?? 0))
    const subs = d3.groups(deals, (d) => d.company ?? '—').sort((a, b) => d3.sum(b[1], (d) => d.amount ?? 0) - d3.sum(a[1], (d) => d.amount ?? 0))
    const rows = d3.range(2010, 2026).map((y) => ({
      year: y,
      t1: d3.sum(deals.filter((d) => d.year === y), (d) => d.t1 ?? 0),
      food: d3.sum(deals.filter((d) => d.year === y), (d) => d.food ?? 0),
    }))
    const suits = data.lawsuits.filter((l) => l.parent === f.parent).sort((a, b) => (b.filed ?? 0) - (a.filed ?? 0))
    const rank = data.firms.findIndex((x) => x.parent === f.parent) + 1
    return { f, deals, subs, rows, suits, rank }
  }, [data, slug])

  if (!data || !view)
    return (
      <div className="container pf-page">
        <Skeleton height={120} style={{ marginBottom: 16 }} />
        <Skeleton height={320} />
      </div>
    )
  if (!view.f)
    return (
      <div className="narrow pf-page" style={{ minHeight: '50vh' }}>
        <h1>Parent group not found</h1>
        <p>
          Only the {data.firms.length} parent groups that received core Tier 1 money have profiles. <Link to="/explore">Open the explorer</Link>.
        </p>
      </div>
    )

  const { f, deals = [], subs = [], rows = [], suits = [], rank = 0 } = view
  const share = f.t1 / data.results.computed.t1_core_usd_m
  const lenderMax = Math.max(...Object.values(f.lenders).map((v) => v ?? 0), 1)
  const evidenceRows: [string, string | null][] = [
    ['Interest-group memberships', f.interest_groups != null ? String(f.interest_groups) : 'Not researched'],
    ['Trade association opposed regulation', f.trade_assoc],
    ['Documented lobbying', f.lobbying],
    ['Lawsuits against health regulation', String(f.n_lawsuits)],
    ['Evidence confidence', f.confidence && f.confidence !== '—' ? f.confidence : '—'],
  ]

  return (
    <div className="container pf-page">
      <Link to="/explore" className="ex-back">
        ← Explorer
      </Link>{' '}
      <span className="muted">·</span>{' '}
      <Link to="/" className="ex-back">
        Back to the story
      </Link>
      <div className="pf-hero">
        <div>
          <div className="kicker" style={{ marginTop: '0.9rem' }}>
            Parent group · #{rank} of {data.firms.length} by Tier 1 money
          </div>
          <h1>{parentName(f.parent)}</h1>
          <div className="pf-chips">
            <span className="chip" style={{ background: gradeColor[f.grade], color: f.grade >= 2 ? '#fff' : '#14213D', borderColor: 'transparent' }}>
              Grade {f.grade}: {gradeLabel[f.grade]}
            </span>
            {f.coi && (
              <span className="chip" style={{ color: '#5C1A1B', borderColor: '#A4483A' }}>
                Conflict-of-interest flag
              </span>
            )}
            {f.countries.map((c) => {
              const iso = f.iso3s.find((i) => countryName(data.countryByIso.get(i)?.name) === countryName(c))
              return iso ? (
                <Link key={c} className="chip" to={`/country/${iso}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {countryName(c)}
                </Link>
              ) : (
                <span key={c} className="chip">
                  {c}
                </span>
              )
            })}
          </div>
        </div>
        <div>
          <div className="pf-big">{f.t1 >= 1000 ? usdBn(f.t1) : usdM(f.t1)}</div>
          <div className="pf-big-sub">
            core Tier 1 money, 2010–2025 · {(share * 100).toFixed(1)}% of all Tier 1 money · {f.n_t1} Tier 1 deal{f.n_t1 === 1 ? '' : 's'} in {f.iso3s.length || 'no single'} countr
            {f.iso3s.length === 1 ? 'y' : 'ies'}
          </div>
        </div>
      </div>

      <div className="pf-grid">
        <div className="panel">
          <h2>Where it sits on the grade ladder</h2>
          <div className="panel-sub">Documented opposition to health regulation, graded 0–3. The highest grade with evidence counts.</div>
          <div className="pf-ladder" role="list">
            {[0, 1, 2, 3].map((g) => (
              <div key={g} role="listitem" className={`pf-rung ${g === f.grade ? 'on' : ''}`} aria-current={g === f.grade ? 'true' : undefined}>
                <span className="bar" style={{ background: gradeColor[g] }} />
                <span className="g">{g}</span>
                {gradeLabel[g]}
              </div>
            ))}
          </div>
          {f.grade === 0 && <p className="pf-note">Grade 0 means no evidence was found, not that the group did not oppose regulation. Many regional firms were not researched in depth.</p>}
          {f.parent === YILDIZ && (
            <p className="pf-note">
              Yıldız’s grade rests on its UK arm, pladis, while its deals are mostly in Türkiye. That is why the thesis reports the share of Tier 1 money to
              groups graded 2 or 3 both ways: 42.8%, or 32.2% without Yıldız.
              <Info id="coi_share" />
            </p>
          )}
          {f.coi && f.parent !== YILDIZ && (
            <p className="pf-note">
              A public lender financing a group graded 2 or 3 is the conflict of interest the thesis flags (WHO EB142/23, by analogy). Across all groups, 42.8%
              of Tier 1 money went to such groups (32.2% without Yıldız).
              <Info id="coi_share" />
            </p>
          )}
          <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '0.4rem 1rem', fontSize: '0.85rem', marginTop: '1rem' }}>
            {evidenceRows.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt className="muted">{k}</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
          {f.evidence && <p className="small" style={{ marginTop: '0.8rem' }}>{f.evidence}</p>}
          {f.links.length > 0 && (
            <>
              <div className="fgroup-label" style={{ marginTop: '0.8rem' }}>
                Evidence sources
              </div>
              <ul className="small" style={{ paddingLeft: '1.1rem', margin: '0.3rem 0 0' }}>
                {f.links.map((u) => (
                  <li key={u} style={{ wordBreak: 'break-all' }}>
                    <a href={u} target="_blank" rel="noreferrer">
                      {u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80)}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="panel">
          <h2>Lenders</h2>
          <div className="panel-sub">Core Tier 1 money by lender.</div>
          <ul className="bars">
            {LENDERS.filter((l) => f.lenders[l]).map((l) => (
              <li key={l} style={{ padding: '0.3rem 0.2rem' }} title={lenderLong[l]}>
                <div className="bl-top">
                  <span className="bl-name">
                    <span className="grade-dot" style={{ background: lenderColor[l] }} />
                    {l}
                  </span>
                  <span className="bl-val">{usdM(f.lenders[l] ?? 0)}</span>
                </div>
                <div className="bl-track">
                  <div className="bl-fill" style={{ width: `${((f.lenders[l] ?? 0) / lenderMax) * 100}%`, background: lenderColor[l] }} />
                </div>
              </li>
            ))}
          </ul>
          <h2 style={{ marginTop: '1.4rem' }}>Over time</h2>
          <YearBars rows={rows} height={200} />
        </div>
      </div>

      <div className="pf-grid even">
        <div className="panel">
          <h2>Subsidiaries and deals</h2>
          <div className="panel-sub">
            {subs.length} borrowing compan{subs.length === 1 ? 'y' : 'ies'} as named in the lenders’ disclosures, {deals.length} food-manufacturing deals.
          </div>
          <div style={{ maxHeight: 480, overflow: 'auto' }}>
            {subs.map(([company, ds]) => (
              <div className="pf-sub" key={company}>
                <div className="pf-sub-name">{company}</div>
                {ds.map((d) => (
                  <DealLine key={d.id} d={d} showCompany={false} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Lawsuits against health regulation</h2>
          <div className="panel-sub">Cases linked to this group in the Lighthouse Reports litigation dataset.</div>
          {suits.length ? (
            <div className="pf-lawsuits" tabIndex={0} role="region" aria-label="Lawsuits">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Filed</th>
                    <th scope="col">Country</th>
                    <th scope="col">Disputed law</th>
                    <th scope="col">Court</th>
                  </tr>
                </thead>
                <tbody>
                  {suits.map((s) => (
                    <tr key={s.id}>
                      <td>{s.filed ?? '—'}</td>
                      <td>{s.country}</td>
                      <td>{s.law}</td>
                      <td title={s.plaintiff ?? ''}>{s.court}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="small muted">No lawsuit in the Lighthouse Reports dataset is linked to this group.</p>
          )}
          <p className="small muted" style={{ marginTop: '0.75rem' }}>
            Litigation data: Lighthouse Reports, coded to parent groups for this thesis.
          </p>
        </div>
      </div>

      <ProfileLinks
        links={[
          { to: exploreHref({ parent: f.parent }), label: `Explore ${parentName(f.parent)}’s Tier 1 deals` },
          { to: exploreHref({ parent: f.parent, scope: 'food' }), label: 'All its food-manufacturing deals' },
          { to: exploreHref({ grades: [f.grade] }), label: `Other grade ${f.grade} groups` },
        ]}
      />
    </div>
  )
}
