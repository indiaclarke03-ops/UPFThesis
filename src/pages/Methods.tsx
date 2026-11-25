/**
 * /methods: counting rules, definitions, regulation sources, the
 * H3 design and notes, limitations, AI disclosure, references, where every
 * number comes from, licence notes and data downloads.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Skeleton } from '../components/ui'
import { useData } from '../lib/data'
import { PROVENANCE } from '../lib/provenance'
import { bandColor } from '../lib/tokens'
import './x_methods.css'

const SECTIONS = [
  ['version', 'Data version & downloads'],
  ['counting', 'Counting rules'],
  ['definition', 'What counts as a UPF firm'],
  ['regulation', 'Regulation data'],
  ['did-notes', 'The H3 test'],
  ['coi', 'Conflict-of-interest grades'],
  ['limitations', 'Limitations'],
  ['provenance', 'Where every number comes from'],
  ['licence', 'Licensed data'],
  ['ai', 'AI assistance'],
  ['references', 'References'],
] as const

const FILES = [
  ['deals.json', 'Food-manufacturing deals (663), whitelisted columns, sanitised coding reasons'],
  ['countries.json', 'Per-country totals, income group, regulation timing, H3 group'],
  ['country_year.json', 'Country × year Tier 1 and food money, per 1,000 people'],
  ['regulation.json', 'H3-core regulation events'],
  ['firms.json', 'Funded parent groups with grades and evidence links'],
  ['lawsuits.json', 'Litigation cases (Lighthouse Reports)'],
  ['exclusion_lists.json', 'Exclusion-list coding (H2)'],
  ['did.json', 'H3 group means and country pre/post values (display only)'],
  ['results.json', 'Hand-entered Stata results and headline aggregates'],
  ['meta.json', 'Data version and citation'],
]

export default function Methods() {
  const data = useData()
  const { hash } = useLocation()
  const [active, setActive] = useState<string>('version')

  useEffect(() => {
    const on = () => {
      let cur: string = SECTIONS[0][0]
      for (const [id] of SECTIONS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 140) cur = id
      }
      setActive(cur)
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    // support /methods#did-notes style anchors inside the hash route
    const id = hash.replace('#', '')
    if (id && data) setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50)
  }, [hash, data])

  const regSources = useMemo(() => {
    if (!data) return []
    const byDomain = new Map<string, Map<string, number>>()
    for (const r of data.regulation) {
      const m = byDomain.get(r.domain) ?? new Map<string, number>()
      const src = (r.source ?? 'Unspecified').split(/[(;]/)[0].trim()
      m.set(src, (m.get(src) ?? 0) + 1)
      byDomain.set(r.domain, m)
    }
    return [...byDomain.entries()]
      .map(([domain, m]) => {
        const sorted = [...m.entries()].sort((a, b) => b[1] - a[1])
        const n = sorted.reduce((s, x) => s + x[1], 0)
        return { domain, main: sorted[0][0], mainN: sorted[0][1], n, others: sorted.length - 1 }
      })
      .sort((a, b) => b.n - a.n)
  }, [data])

  if (!data)
    return (
      <div className="container" style={{ paddingTop: 110 }}>
        <Skeleton height={60} style={{ maxWidth: 520, marginBottom: 24 }} />
        <Skeleton height={600} />
      </div>
    )

  const r = data.results
  const c = r.computed
  const base = `${import.meta.env.BASE_URL}data/`
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="xm-page">
      <header className="xm-hero">
        <div className="container">
          <div className="kicker">Methods &amp; data</div>
          <h1>How the numbers were made</h1>
          <p className="lede" style={{ maxWidth: 760 }}>
            Every figure on this site comes from the frozen thesis data and the Stata do-file. The site only adds, counts and divides; it
            never estimates a statistic of its own. This page sets out the rules, the definitions, what was checked, and what the data
            cannot see.
          </p>
        </div>
      </header>

      <div className="container xm-layout">
        <nav className="xm-toc" aria-label="On this page">
          <div className="xm-toc-head">On this page</div>
          <ol>
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} onClick={go(id)} className={active === id ? 'on' : ''} aria-current={active === id ? 'location' : undefined}>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="xm-body">
          <section id="version">
            <h2>Data version &amp; downloads</h2>
            <dl className="xm-facts">
              <dt>Data version</dt>
              <dd>{data.meta.data_version}</dd>
              <dt>Site build</dt>
              <dd>{data.meta.build_date}</dd>
              <dt>Lenders</dt>
              <dd>IFC, EBRD, EIB and IDB Invest, own-account commitments 2010–2025</dd>
              <dt>Stata do-file</dt>
              <dd>
                <code>Data/Stata/do/UPF_Thesis_Master_2026-11-21.do</code> (Part A builds the data, Part B runs the analysis)
              </dd>
              <dt>Checks</dt>
              <dd>
                The build fails unless every canonical number reproduces from the public files (±0.1 US$m, ±0.1 percentage points) and a
                licence scan finds no restricted columns.
              </dd>
            </dl>
            <h3>Download the public data</h3>
            <ul className="xm-files">
              {FILES.map(([f, d]) => (
                <li key={f}>
                  <a href={base + f} download>
                    {f}
                  </a>
                  <span className="muted small">{d}</span>
                </li>
              ))}
            </ul>
            <p className="small muted">
              A CSV of any filtered table is available from the <Link to="/explore">explorer</Link>.
            </p>
          </section>

          <section id="counting">
            <h2>Counting rules</h2>
            <ul className="xm-list">
              <li>
                <strong>Commitments, not disbursements.</strong> Each deal is the amount the lender committed or signed, as published. Money
                actually paid out may be lower, later, or cancelled.
              </li>
              <li>
                <strong>Gross, own-account.</strong> Amounts are the lender’s own commitment, gross of repayments. Syndicated (B-loan) and
                mobilised third-party money is not counted. Lending through financial intermediaries is untraceable and is not counted.
              </li>
              <li>
                <strong>2024 prices.</strong> EUR amounts are converted at the ECB annual average USD/EUR rate of the approval year, then
                every amount is moved to 2024 prices with the US GDP deflator (World Bank WDI NY.GDP.DEFL.ZS).
              </li>
              <li>
                <strong>Years.</strong> Approval (or signing) year, 2010–2025. Deals outside the window, not approved, or still in the
                pipeline are not counted.
              </li>
              <li>
                <strong>Supply-chain finance</strong> to Tier 1 firms (2 deals, US$135.3m) is a separate measure and is not in the US$6.43bn
                (decision D001).
              </li>
              <li>
                <strong>Regional deals</strong> (5 deals, US$424.6m) have no single country. They count in totals but not in country maps or
                country-level tests.
              </li>
              <li>
                <strong>Income groups</strong> use the World Bank historical classification. Lower-middle and upper-middle are combined as
                “Middle”. “At approval” uses the group in the approval year; “in 2010” uses FY2011.
              </li>
            </ul>
          </section>

          <section id="definition">
            <h2>What counts as a UPF firm</h2>
            <p>
              Products follow the NOVA classification (Monteiro et al. 2019). NOVA 4, ultra-processed foods, are industrial formulations such
              as soft drinks, packaged snacks, confectionery, biscuits and instant noodles.
            </p>
            <p>
              A deal is <strong>Tier 1</strong> when the borrower is a <strong>manufacturer</strong> and NOVA 4 products make up{' '}
              <strong>at least 20% of its sales</strong>, the materiality threshold the IFC itself uses for tobacco- and alcohol-type exposure
              in its financial-intermediary guidance. Each firm gets a band:
            </p>
            <table className="data-table xm-bands">
              <thead>
                <tr>
                  <th>Band</th>
                  <th>NOVA 4 share of sales</th>
                  <th>Counted as Tier 1?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['A', 'At least 50%', 'Yes'],
                  ['B', '20–50%', 'Yes'],
                  ['C', 'Some NOVA 4, under 20%', 'No'],
                  ['C/D', 'Little or none (borderline)', 'No'],
                  ['D', 'Little or none', 'No'],
                  ['E', 'Too little information to band', 'No'],
                ].map(([b, s, t]) => (
                  <tr key={b}>
                    <td>
                      <span className="chip" style={{ background: bandColor[b], color: b === 'A' ? '#fff' : 'var(--ink)', borderColor: 'transparent' }}>
                        {b}
                      </span>
                    </td>
                    <td>{s}</td>
                    <td>{t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">
              Ingredient processors, traders and retailers are not Tier 1 even when they supply UPF makers. The band is a coding judgement:
              every deal in the explorer shows its band and the coding reason. Reasons that quote licensed market-share data are replaced
              with “Coded from licensed market-share data (value not shown)”.
            </p>
            <p>
              <strong>Tier 1 is a lower bound.</strong> Band C firms (for example dairy groups with some NOVA 4 lines) are left out, about
              US$1.0bn of band C dairy alone.
            </p>
          </section>

          <section id="regulation">
            <h2>Regulation data</h2>
            <p>
              H3 uses {data.regulation.length} “core” regulation events in six domains: sugary-drink taxes, front-of-pack labels, marketing
              limits to children, salt and trans-fat limits, and taxes on unhealthy food or UPF. One designated source is used per domain;
              events from other sources fill gaps only after cross-checking.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Designated source</th>
                  <th className="n">Events</th>
                </tr>
              </thead>
              <tbody>
                {regSources.map((s) => (
                  <tr key={s.domain}>
                    <td>{s.domain}</td>
                    <td>
                      {s.main}
                      {s.others > 0 && <span className="muted small"> (+{s.others} supplementary)</span>}
                    </td>
                    <td className="n">{s.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">
              “Binding” means a mandatory rule in force; announced, future or unimplemented rules are not counted as binding. A country’s
              first binding year is the earliest year any core binding rule was in force.
            </p>
          </section>

          <section id="did-notes">
            <h2>The H3 test: does binding regulation change the flow?</h2>
            <p>
              A two-period difference-in-differences across countries (decision D066, agreed 21 November 2026). Countries whose first
              binding UPF rule came into force in <strong>2013–2019</strong> ({r.h3_did_main.groups.binding} countries) are compared with
              countries that had <strong>no measure at any point</strong> 2010–2025 ({r.h3_did_main.groups.none} countries). The pre period is
              2010–2012, the post period 2020–2025; the 2013–2019 window is dropped. Countries bound before 2013 or after 2019 are excluded.
            </p>
            <div className="xm-model">
              <code>{r.h3_did_main.model}</code>
              <span>Y = ln(1 + Tier 1 US$ per 1,000 people), averaged per country and period. N = {r.h3_did_main.n}.</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th className="n">Estimate</th>
                  <th className="n">p</th>
                  <th className="n">N</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Main (log points)</td>
                  <td className="n">
                    +{r.h3_did_main.value.toFixed(3)} (95% CI −{Math.abs(r.h3_did_main.ci[0]).toFixed(2)} to {r.h3_did_main.ci[1].toFixed(2)})
                  </td>
                  <td className="n">{r.h3_did_main.p.toFixed(3)}</td>
                  <td className="n">{r.h3_did_main.n}</td>
                </tr>
                <tr>
                  <td>+ log GDP per person</td>
                  <td className="n">+{r.h3_did_gdp.value.toFixed(3)}</td>
                  <td className="n">{r.h3_did_gdp.p.toFixed(3)}</td>
                  <td className="n">{r.h3_did_gdp.n}</td>
                </tr>
                <tr>
                  <td>Y in levels (US$ per 1,000 people)</td>
                  <td className="n">−{Math.abs(r.h3_did_levels.value).toFixed(1)}</td>
                  <td className="n">{r.h3_did_levels.p.toFixed(3)}</td>
                  <td className="n">104</td>
                </tr>
              </tbody>
            </table>
            <p>
              <strong>Reading.</strong> No sign that binding rules reduced public lending to UPF firms. The interval is wide, so a modest effect
              either way cannot be ruled out. The coefficient is not turned into a percentage.
            </p>
            <h3>Methods notes</h3>
            <ul className="xm-list">
              <li>
                <strong>Logs with zeros.</strong> Most country-years have no Tier 1 deal, so ln(1 + Y) is used. With many zeros the size, and
                even the sign, of a log-points coefficient depends on the units of Y (Chen and Roth 2024). The result reported is therefore the
                null, not its size; the units check (Y per person) is also non-significant.
              </li>
              <li>
                <strong>Two periods.</strong> Averaging each country to one pre and one post value avoids serial-correlation bias in
                multi-period DiD (Bertrand, Duflo and Mullainathan 2004). Fixing a single treatment window avoids the bias of two-way fixed
                effects with staggered adoption (Goodman-Bacon 2021).
              </li>
              <li>
                <strong>Clustered errors.</strong> Standard errors are clustered by country. With 52 clusters, cluster-robust inference is
                reasonable but not generous (Cameron and Miller 2015).
              </li>
              <li>
                <strong>Parallel trends.</strong> Yearly group means are noisy because most country-years are zero. A pre-trend check cannot
                prove parallel trends, and conditioning on it can distort inference (Roth 2022).
              </li>
              <li>
                <strong>Why a null matters.</strong> A non-significant estimate is informative about what the data rule out (Abadie 2020): even
                binding national rules show no visible redirection of public lending.
              </li>
            </ul>
          </section>

          <section id="coi">
            <h2>Conflict-of-interest grades</h2>
            <p>Each funded parent group gets an obstruction grade from public evidence:</p>
            <ol start={0} className="xm-list xm-grades">
              <li>
                <strong>0, no evidence found.</strong> Not “no obstruction”: many regional firms were researched only lightly.
              </li>
              <li>
                <strong>1, interest-group membership</strong> (industry associations named in the Lancet commercial-determinants series).
              </li>
              <li>
                <strong>2, lobbying or trade-association opposition</strong> to a health regulation, documented with a source.
              </li>
              <li>
                <strong>3, litigation</strong> against a health regulation (Lighthouse Reports cases matched to the parent group).
              </li>
            </ol>
            <p>
              A conflict of interest is flagged when a public lender finances a group graded 2 or 3, applying WHO EB142/23 by analogy.{' '}
              {(c.coi_share * 100).toFixed(1)}% of Tier 1 money went to such groups; {(c.coi_share_without_yildiz * 100).toFixed(1)}% without
              Yıldız, whose grade rests on its UK arm pladis while its deals are mostly in Türkiye. Both are always shown.
            </p>
          </section>

          <section id="limitations">
            <h2>Limitations: what this data cannot see</h2>
            <ul className="xm-list">
              <li>
                <strong>Intermediated lending.</strong> 25–56% of each lender’s commitments go through banks and funds whose end-borrowers are
                not disclosed.
              </li>
              <li>
                <strong>Commitments, not disbursements.</strong> Signed amounts may not all be paid out.
              </li>
              <li>
                <strong>A lower bound.</strong> Tier 1 excludes band C firms (about US$1.0bn of band C dairy) and supply-chain finance.
              </li>
              <li>
                <strong>Regional firms are under-studied.</strong> Evidence on lobbying and litigation is thinner outside large multinationals,
                so grade 0 often means “not found”, not “absent”.
              </li>
              <li>
                <strong>Moderate inter-coder agreement</strong> (κ {r.kappa.role} role; {r.kappa.upf_without_unsure} UPF excluding “Unsure”).
              </li>
              <li>
                <strong>Small, noisy DiD.</strong> 52 countries, many zeros; the interval is wide.
              </li>
              <li>
                <strong>Descriptive country patterns.</strong> Where the money goes is not evidence that it causes UPF growth.
              </li>
              <li>
                <strong>Four lenders.</strong> Other development banks (ADB, AIIB, AfDB, EDFI members, national DFIs) are not in the deal data.
              </li>
            </ul>
          </section>

          <section id="provenance">
            <h2>Where every number comes from</h2>
            <p className="small muted">The same entries open from every ⓘ on the site.</p>
            <div className="xm-prov">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Figure</th>
                    <th>Value</th>
                    <th>Source</th>
                    <th>Dataset and filter</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PROVENANCE).map(([id, p]) => (
                    <tr key={id}>
                      <td>
                        <strong>{p.label}</strong>
                      </td>
                      <td>{p.value}</td>
                      <td>
                        {p.source}
                        {p.decision && <div className="muted">{p.decision}</div>}
                      </td>
                      <td className="small">
                        <code>{p.dataset}</code>
                        <div className="muted">{p.filter}</div>
                        {p.caveat && <div className="xm-caveat">{p.caveat}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="licence">
            <h2>Licensed data</h2>
            <ul className="xm-list">
              <li>Euromonitor-based results appear in the thesis only as group summaries and are not on this site.</li>
              <li>No ATNi-derived row-level data and no PitchBook data are published.</li>
              <li>
                Which individual deals match the list of 30 global UPF companies is not published (the match uses licensed data). Only totals
                and ratios are shown, and the disclosure-gap grid does not identify the lit deals.
              </li>
              <li>The deal-level notes columns are not published, and coding reasons that quote market shares are replaced.</li>
              <li>A build check fails if any restricted column or file name appears in the public data.</li>
            </ul>
          </section>

          <section id="ai">
            <h2>AI assistance</h2>
            <p>
              Claude (Anthropic) was used for coding assistance: drafting data-cleaning and Stata code, a second pass over deal coding, and
              building this website and its data pipeline. All coding decisions were made and checked by the author, and every number on this
              site is asserted against the Stata do-file output before the site can build.
            </p>
          </section>

          <section id="references">
            <h2>References</h2>
            <ul className="xm-refs">
              <li>Abadie, Alberto. 2020. “Statistical Nonsignificance in Empirical Economics.” <em>American Economic Review: Insights</em> 2 (2): 193–208.</li>
              <li>
                Baker, Phillip, Priscila Machado, Thiago Santos, Katherine Sievert, Kathryn Backholer, Michalis Hadjikakou, Cherie Russell, et al. 2020.
                “Ultra-Processed Foods and the Nutrition Transition: Global, Regional and National Trends, Food Systems Transformations and Political
                Economy Drivers.” <em>Obesity Reviews</em> 21 (12): e13126.
              </li>
              <li>
                Bertrand, Marianne, Esther Duflo, and Sendhil Mullainathan. 2004. “How Much Should We Trust Differences-in-Differences Estimates?”{' '}
                <em>Quarterly Journal of Economics</em> 119 (1): 249–75.
              </li>
              <li>Cameron, A. Colin, and Douglas L. Miller. 2015. “A Practitioner’s Guide to Cluster-Robust Inference.” <em>Journal of Human Resources</em> 50 (2): 317–72.</li>
              <li>Chen, Jiafeng, and Jonathan Roth. 2024. “Logs with Zeros? Some Problems and Solutions.” <em>Quarterly Journal of Economics</em> 139 (2): 891–936.</li>
              <li>Goodman-Bacon, Andrew. 2021. “Difference-in-Differences with Variation in Treatment Timing.” <em>Journal of Econometrics</em> 225 (2): 254–77.</li>
              <li>Lighthouse Reports. Litigation dataset: lawsuits by industry against food and health regulation. Coded by parent group for this thesis (COI_Litigation).</li>
              <li>
                Monteiro, Carlos A., Geoffrey Cannon, Renata B. Levy, Jean-Claude Moubarac, Maria L. C. Louzada, Fernanda Rauber, Neha Khandpur, et al. 2019.
                “Ultra-Processed Foods: What They Are and How to Identify Them.” <em>Public Health Nutrition</em> 22 (5): 936–41.
              </li>
              <li>Roth, Jonathan. 2022. “Pretest with Caution: Event-Study Estimates after Testing for Parallel Trends.” <em>American Economic Review: Insights</em> 4 (3): 305–22.</li>
              <li>World Bank. 1999. <em>Curbing the Epidemic: Governments and the Economics of Tobacco Control</em>. Washington, DC: World Bank.</li>
              <li>
                World Health Organization. 2018. “Safeguarding against Possible Conflicts of Interest in Nutrition Programmes.” Report by the
                Director-General, EB142/23. Geneva: WHO Executive Board, 142nd session.
              </li>
            </ul>
            <h3>Exclusion-list documents (H2)</h3>
            <ul className="xm-refs">
              {data.exclusion.map((e) => (
                <li key={e.institution + e.document}>
                  {e.institution.replace(/^(Benchmark|Comparator): /, '')}. {e.version}. <em>{e.document}</em>.{' '}
                  {e.url.split(' ; ').map((u, i) => (
                    <span key={u}>
                      {i > 0 && '; '}
                      <a href={u.trim()} target="_blank" rel="noreferrer">
                        {u.trim().replace(/^https?:\/\//, '').slice(0, 60)}
                        {u.trim().length > 68 ? '…' : ''}
                      </a>
                    </span>
                  ))}
                  . Downloaded 15 November 2026.
                </li>
              ))}
            </ul>
            <h3>How to cite this site</h3>
            <p className="xm-cite">{data.meta.citation} Interactive companion, data version: {data.meta.data_version}.</p>
          </section>
        </article>
      </div>
    </div>
  )
}
