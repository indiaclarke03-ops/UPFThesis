/**
 * Presentation mode (?present=1 or #/present): full-screen, keyboard-driven
 * slides for the December presentation. ←/→/space/PageUp/PageDown, Home/End,
 * Esc exits to the story. Large type, no scroll.
 */
import { AnimatePresence, motion as m } from 'framer-motion'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { LenderStream } from '../charts/LenderStream'
import { CiPlot, CoiBar, FogBars, GapGrid, MatrixMini, NovaStrip } from '../charts/x_slides'
import { CountUp } from '../components/ui'
import { DEFAULT_FILTERS, filterDeals } from '../lib/aggregate'
import { parentName, useData, type SiteData } from '../lib/data'
import { usdBn, usdM } from '../lib/format'
import { useReducedMotion } from '../lib/hooks'
import './x_present.css'

interface Slide {
  kicker?: string
  render: (d: SiteData, sub: number) => ReactNode
  /** number of in-slide build steps (default 1) */
  builds?: number
}

const SLIDES: Slide[] = [
  {
    render: (d) => (
      <div className="xp-title">
        <div className="xp-kicker">NYU Center for Global Affairs · MS thesis · December 2026</div>
        <h1>Funding What We Regulate</h1>
        <p className="xp-sub">Public money, corporate power and the ultra-processed food transition</p>
        <p className="xp-author">{d.meta.author}</p>
      </div>
    ),
  },
  {
    kicker: 'Act 0 · The hook',
    render: (d) => (
      <div className="xp-center">
        <div className="xp-mega copper">
          at least <CountUp value={d.results.computed.t1_core_usd_m / 1000} format={(v) => `US$${v.toFixed(2)}bn`} />
        </div>
        <p className="xp-lede">of public development money to ultra-processed food manufacturers, 2010–2025.</p>
        <p className="xp-note">IFC · EBRD · EIB · IDB Invest · 153 Tier 1 deals · 82 parent groups · 45 countries</p>
        <p className="xp-quote">Governments regulate these firms. Through their development banks, they also finance them.</p>
      </div>
    ),
  },
  {
    kicker: 'Act 1 · What counts as ultra-processed',
    render: () => (
      <div className="xp-split">
        <div>
          <h2>A firm is “Tier 1” when it makes mostly NOVA 4 food</h2>
          <p className="xp-lede">
            A manufacturer with NOVA 4 at least <strong className="copper">20%</strong> of sales: the IFC’s own materiality threshold.
          </p>
          <ul className="xp-bands">
            <li>
              <b style={{ background: '#E08A55' }}>A</b> NOVA 4 ≥ 50% of sales
            </li>
            <li>
              <b style={{ background: '#D98A55', opacity: 0.75 }}>B</b> 20–50%
            </li>
            <li className="dim">
              <b>C</b> some NOVA 4, under 20% · not counted
            </li>
            <li className="dim">
              <b>D/E</b> little or none · too little information
            </li>
          </ul>
        </div>
        <NovaStrip />
      </div>
    ),
  },
  {
    kicker: 'Act 2 · H1 · Scale',
    render: (d) => {
      const c = d.results.computed
      return (
        <div className="xp-chart">
          <h2>
            The flow is growing: {usdBn(c.by_period['2010-13'].usd_m)} in 2010–13 → {usdBn(c.by_period['2022-25'].usd_m)} in 2022–25
          </h2>
          <div className="xp-chart-body">
            <LenderStream deals={filterDeals(d.deals, DEFAULT_FILTERS)} mode="periods" dark height={Math.min(520, window.innerHeight * 0.58)} />
          </div>
          <p className="xp-note">Core Tier 1 commitments, US$ at 2024 prices. Without the 2024 Coca-Cola İçecek deal, 2022–25 is still {usdBn(c.period_2022_25_without_cci)}.</p>
        </div>
      )
    },
  },
  {
    kicker: 'Act 2 · H1 · The disclosure gap',
    builds: 2,
    render: (d, sub) => {
      const h = d.results.computed.h1
      return (
        <div className="xp-split">
          <div>
            <h2>
              {sub === 0 ? (
                <>
                  Only <span className="copper">12 of 153</span> deals carry the name of a global top-30 UPF company
                </>
              ) : (
                <>
                  All Tier 1 money is about <span className="copper">seven times</span> the money to firms visible by name
                </>
              )}
            </h2>
            {sub === 1 && (
              <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="xp-stats">
                  <div>
                    <span className="xp-stat">{h.All.gap?.toFixed(2)}</span>pooled gap
                  </div>
                  <div>
                    <span className="xp-stat">{h.All.gap_parent?.toFixed(2)}</span>counting researched parents
                  </div>
                </div>
                <p className="xp-note">
                  By lender: IFC {h.IFC.gap?.toFixed(1)} · EBRD {h.EBRD.gap?.toFixed(1)} · EIB {h.EIB.gap?.toFixed(1)} · IDB Invest n/a (no named
                  recipients)
                </p>
              </m.div>
            )}
          </div>
          <GapGrid data={d} reveal={sub === 1} />
        </div>
      )
    },
  },
  {
    kicker: 'Act 2 · H1 · The money you cannot see at all',
    render: (d) => (
      <div className="xp-chart">
        <h2>25–56% of each lender’s commitments go through financial intermediaries, out of sight</h2>
        <FogBars data={d} />
        <p className="xp-note">Share of all commitments through financial intermediaries and funds, 2010–2025. Not claimed to reach UPF firms: it is the part that cannot be checked.</p>
      </div>
    ),
  },
  {
    kicker: 'Act 3 · H2 · The institutional blind spot',
    render: () => null,
  },
  {
    kicker: 'Act 4 · H3 · Does regulation change the flow?',
    render: (d) => {
      const r = d.results.h3_did_main
      return (
        <div className="xp-chart">
          <h2>No sign that binding rules reduced public lending to UPF firms</h2>
          <CiPlot b={r.value} lo={r.ci[0]} hi={r.ci[1]} />
          <p className="xp-lede" style={{ fontSize: '1.4rem' }}>
            b = +{r.value.toFixed(2)} log points · 95% CI −{Math.abs(r.ci[0]).toFixed(2)} to +{r.ci[1].toFixed(2)} · p = {r.p.toFixed(2)} · N = {r.n} ({r.groups.binding} binding vs {r.groups.none} none)
          </p>
          <p className="xp-note">The interval is wide, so a modest effect either way cannot be ruled out. A null is informative (Abadie 2020).</p>
        </div>
      )
    },
  },
  {
    kicker: 'Act 5 · H4 · The same firms',
    render: (d) => {
      const c = d.results.computed
      return (
        <div className="xp-chart">
          <h2>
            <span className="copper">{(c.coi_share * 100).toFixed(1)}%</span> of Tier 1 money went to groups documented as lobbying against or litigating over
            health regulation <span className="xp-alt">({(c.coi_share_without_yildiz * 100).toFixed(1)}% without Yıldız)</span>
          </h2>
          <CoiBar share={c.coi_share} noY={c.coi_share_without_yildiz} />
          <p className="xp-note">
            Nine groups graded 2–3 received {usdM(c.coi_groups_ge2_usd_m)}: {c.coi_groups_ge2.map((g) => parentName(g.parent)).join(', ')}. Grade 0 means no
            evidence found, not no obstruction.
          </p>
        </div>
      )
    },
  },
  {
    kicker: 'Act 6 · Two case studies, chosen by rule',
    render: (d) => {
      const c = d.results.computed
      return (
        <div className="xp-cases">
          <div className="xp-case">
            <div className="xp-kicker">Türkiye · the largest recipient</div>
            <div className="xp-stat">{usdM(c.turkiye.usd_m, 1)}</div>
            <p>
              {c.turkiye.deals} Tier 1 deals (EBRD {c.turkiye.by_lender.EBRD}, IFC {c.turkiye.by_lender.IFC}). Yıldız/Ülker alone: {usdM(c.turkiye.yildiz_in_tur)}. National
              champions built with public money, then exporting abroad.
            </p>
          </div>
          <div className="xp-case">
            <div className="xp-kicker">Mexico · lending alongside litigation</div>
            <div className="xp-stat">
              {c.mexico_lawsuits} <span style={{ fontSize: '0.45em', fontWeight: 500 }}>of {c.lawsuits_total} lawsuits</span>
            </div>
            <p>
              Mexico holds most of the Lighthouse Reports cases against food-health rules. Sugary-drink tax 2014, warning labels 2020, Supreme Court 2024, and public
              money kept flowing to the sector.
            </p>
          </div>
        </div>
      )
    },
  },
  {
    kicker: 'Act 7 · What it means',
    render: () => (
      <div className="xp-center" style={{ textAlign: 'left', maxWidth: 1100 }}>
        <ol className="xp-take">
          <li>Public lenders put at least US$6.43bn into UPF manufacturers, and most of it is invisible by name.</li>
          <li>Every lender screens tobacco; none screens UPF, and binding national rules do not visibly redirect the money.</li>
          <li>A large share goes to firms documented as fighting the regulation their own shareholders adopt.</li>
        </ol>
        <p className="xp-quote">Governments do not just face UPF firms’ power: they finance it, mostly out of sight.</p>
      </div>
    ),
  },
  {
    render: (d) => (
      <div className="xp-title">
        <div className="xp-kicker">Thank you</div>
        <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 4.2rem)' }}>Funding What We Regulate</h1>
        <p className="xp-cite">{d.meta.citation}</p>
        <p className="xp-note">
          Data version: {d.meta.data_version}. Commitments, not disbursements. Explore every deal at the companion site.
        </p>
      </div>
    ),
  },
]

// Act 3 slide uses the matrix
SLIDES[6].render = (d) => (
  <div className="xp-split wide-right">
    <div>
      <h2>Tobacco took a policy. UPF has none.</h2>
      <p className="xp-lede">
        <strong>10 of 10</strong> lender exclusion lists name tobacco. <strong className="copper">0 of 10</strong> name ultra-processed or unhealthy food.
      </p>
      <p className="xp-note">World Bank tobacco policy 1991 → IFC Exclusion List 2007 → GPFG tobacco exclusion 2010 → today: no UPF screen. ATNi’s investor guides show a nutrition screen already exists.</p>
    </div>
    <MatrixMini data={d} />
  </div>
)

export default function Present() {
  const data = useData()
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [sub, setSub] = useState(0)

  const go = useCallback(
    (dir: 1 | -1) => {
      const builds = SLIDES[i].builds ?? 1
      if (dir === 1) {
        if (sub < builds - 1) setSub(sub + 1)
        else if (i < SLIDES.length - 1) {
          setI(i + 1)
          setSub(0)
        }
      } else {
        if (sub > 0) setSub(sub - 1)
        else if (i > 0) {
          setI(i - 1)
          setSub((SLIDES[i - 1].builds ?? 1) - 1)
        }
      }
    },
    [i, sub],
  )

  useEffect(() => {
    const exit = () => {
      window.location.href = window.location.pathname + '#/'
    }
    const on = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        go(1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'Home') {
        setI(0)
        setSub(0)
      } else if (e.key === 'End') {
        setI(SLIDES.length - 1)
        setSub(0)
      } else if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [go])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const slide = SLIDES[i]
  return (
    <div className="xp" role="region" aria-roledescription="presentation" aria-label="Funding What We Regulate: presentation">
      <div className="xp-progress" style={{ transform: `scaleX(${(i + 1) / SLIDES.length})` }} aria-hidden="true" />
      <main className="xp-stage" onClick={(e) => (e.clientX > window.innerWidth / 3 ? go(1) : go(-1))}>
        {!data ? (
          <div className="xp-center xp-note">Loading…</div>
        ) : (
          <AnimatePresence mode="wait">
            <m.section
              key={i}
              className="xp-slide"
              aria-live="polite"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {slide.kicker && <div className="xp-kicker">{slide.kicker}</div>}
              {slide.render(data, sub)}
            </m.section>
          </AnimatePresence>
        )}
      </main>
      <footer className="xp-foot">
        <span>Funding What We Regulate · India Clarke</span>
        <span className="xp-keys" aria-hidden="true">
          ← → to move · Esc to exit
        </span>
        <span className="num">
          {i + 1} / {SLIDES.length}
        </span>
      </footer>
    </div>
  )
}
