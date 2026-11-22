import { Link } from 'react-router-dom'
import { Info } from '../components/Info'
import type { SiteData } from '../lib/data'
import { pct, usdBn } from '../lib/format'
import './a567_acts.css'

/** Act 7 · What it means, and what is missing. */
export default function Act7Close({ data }: { data: SiteData }) {
  const c = data.results.computed
  const r = data.results
  const base = import.meta.env.BASE_URL
  const inter = c.intermediated.map((i) => `${i.lender} ${Math.round(i.share * 100)}%`).join(', ')

  const limits = [
    {
      tag: 'Out of sight',
      title: 'Intermediated lending',
      text: `${inter} of commitments go through banks and funds whose end-borrowers are not published. Some may reach UPF firms; none of it can be counted.`,
    },
    {
      tag: 'Promises, not payments',
      title: 'Commitments, not disbursements',
      text: 'Lenders publish what they approve or sign. Some commitments are later cancelled or only partly drawn.',
    },
    {
      tag: 'A floor',
      title: 'Tier 1 is a lower bound',
      text: 'Only firms with NOVA 4 at least 20% of sales count. About US$1.0bn of band C dairy, where the share was unclear, is left out.',
    },
    {
      tag: 'Thin records',
      title: 'Regional firms are under-studied',
      text: 'Most funded groups are regional or national champions with little public record, so “no evidence found” often means “not much to search”.',
    },
    {
      tag: 'Judgement',
      title: 'Moderate inter-coder agreement',
      text: `A second coder agreed moderately: κ ${r.kappa.role.toFixed(2)} on firm role and ${r.kappa.upf_without_unsure.toFixed(2)} on UPF status (excluding “unsure”). Bands are coding judgements, shown with their reasons.`,
      info: 'kappa',
    },
  ]

  return (
    <section className="act" id="act-7" aria-labelledby="act-7-title" style={{ paddingBottom: 0 }}>
      <div className="act-header">
        <span className="act-num">Act 7 · Conclusion</span>
        <h2 id="act-7-title">What it means, and what is missing</h2>
      </div>

      <div className="narrow">
        <ol className="a567-takeaways">
          <li>
            Public development banks committed at least {usdBn(c.t1_core_usd_m)} to UPF manufacturers in 2010–2025, mostly to firms the public cannot see by name.
          </li>
          <li>No lender screens UPF the way all of them screen tobacco, and binding national rules show no sign of reducing the flow.</li>
          <li>
            {pct(c.coi_share)} of the money ({pct(c.coi_share_without_yildiz)} without Yıldız) went to groups documented as lobbying against or litigating over health
            regulation.
          </li>
        </ol>
      </div>

      <div className="dark" style={{ padding: '14vh 0', marginTop: '8vh' }}>
        <div className="narrow">
          <div className="kicker">The contribution</div>
          <p className="a567-contribution">
            Governments do not just face UPF firms’ power: <em>they finance it, mostly out of sight.</em>
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '10vh var(--gutter) 4vh' }}>
        <div className="kicker">Honest limits</div>
        <h3>What this data cannot see</h3>
        <p className="muted" style={{ maxWidth: 640 }}>
          Every number on this site is a lower bound drawn from what lenders choose to publish. These are the gaps that matter most for reading it.
        </p>
        <div className="a567-limits">
          {limits.map((l) => (
            <div className="a567-limit" key={l.title}>
              <span className="chip">{l.tag}</span>
              <h4>
                {l.title}
                {l.info && <Info id={l.info} />}
              </h4>
              <p>{l.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container" style={{ padding: '4vh var(--gutter) 10vh' }}>
        <div className="kicker">Go further</div>
        <div className="a567-links">
          <Link to="/explore" className="a567-linkcard">
            <strong>Explorer →</strong>
            <span className="small muted">Every deal, country and firm behind each number, with filters you can share.</span>
          </Link>
          <Link to="/methods" className="a567-linkcard">
            <strong>Methods &amp; data →</strong>
            <span className="small muted">Counting rules, the UPF-firm definition, validation, sources and limitations.</span>
          </Link>
          <a href={`${base}data/deals.json`} className="a567-linkcard" download>
            <strong>Download the data ↓</strong>
            <span className="small muted">
              Public deal file (JSON). Also: <span>countries, firms, regulation, lawsuits</span>. Licensed data is not included.
            </span>
          </a>
          <Link to="/methods" className="a567-linkcard">
            <strong>Read the thesis →</strong>
            <span className="small muted">“Funding What We Regulate”, NYU Center for Global Affairs, 2026. Citation on the methods page.</span>
          </Link>
        </div>
        <p className="small muted" style={{ marginTop: '1rem' }}>
          Other files:{' '}
          {['countries', 'firms', 'regulation', 'lawsuits', 'exclusion_lists', 'results'].map((f, i) => (
            <span key={f}>
              {i > 0 && ' · '}
              <a href={`${base}data/${f}.json`} download>
                {f}.json
              </a>
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}
