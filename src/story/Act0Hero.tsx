import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'

import { Info } from '../components/Info'
import { CountUp } from '../components/ui'
import type { SiteData } from '../lib/data'
import './a012_acts.css'

const HeroMap = lazy(() => import('../charts/a012_HeroMap').then((m) => ({ default: m.HeroMap })))

/** Act 0 · Hook. Dark full-bleed opening with the dataset made visible. */
export default function Act0Hero({ data }: { data: SiteData }) {
  const c = data.results.computed
  return (
    <section className="dark a012-hero" id="act-0" aria-labelledby="act-0-title">
      <Suspense fallback={null}>
        <HeroMap data={data} />
      </Suspense>
      <div className="a012-hero-shade" aria-hidden="true" />
      <div className="a012-hero-text">
        <div className="kicker">Public development finance · ultra-processed food · 2010–2025</div>
        <h1 id="act-0-title" className="a012-hero-h1">
          <span className="a012-hero-atleast">at least</span>
          <span className="a012-hero-number">
            <CountUp value={c.t1_core_usd_m / 1000} format={(v) => `US$${v.toFixed(2)} billion`} duration={2.2} />
            <Info id="t1_total" light />
          </span>
        </h1>
        <p className="a012-hero-sub">of public development money to ultra-processed food manufacturers, 2010–2025.</p>
        <p className="a012-hero-line">Governments regulate these firms. Through their development banks, they also finance them.</p>
        <p className="a012-hero-legend small">
          <span className="a012-dot" aria-hidden="true" /> Each dot is one of the {c.t1_deals} Tier 1 deals, sized by money.
          <span className="a012-dot a012-dot-regional" aria-hidden="true" /> Regional deal.
        </p>
        <div className="a012-hero-actions">
          <a
            href="#act-1"
            className="btn"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('act-1')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Read the story <span aria-hidden="true">↓</span>
          </a>
          <Link to="/explore" className="a012-skip">
            Skip to the explorer →
          </Link>
        </div>
        <p className="a012-hero-byline small">
          India Clarke · <em>Funding What We Regulate</em> · NYU Center for Global Affairs MS thesis
        </p>
      </div>
      <div className="a012-scroll-cue" aria-hidden="true">
        <span>Scroll</span>
        <span className="a012-scroll-line" />
      </div>
    </section>
  )
}
