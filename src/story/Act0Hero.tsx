import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { heroRadius } from '../charts/a012_heroScale'
import { Info } from '../components/Info'
import { CountUp } from '../components/ui'
import type { SiteData } from '../lib/data'
import './a012_acts.css'

const HeroMap = lazy(() => import('../charts/a012_HeroMap').then((m) => ({ default: m.HeroMap })))

/** Key: what each dot means, with sample sizes drawn on the map's own scale. */
function HeroKey({ data }: { data: SiteData }) {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const max = Math.max(...data.deals.filter((d) => d.tier1).map((d) => d.t1 ?? 0))
  const r = heroRadius(w < 700 ? w * 1.6 : w, max)
  const samples = [10, 100, 250]
  const rMax = r(250)
  let x = 2
  const pos = samples.map((v) => {
    const cx = x + r(v)
    x += r(v) * 2 + 8
    return { v, cx }
  })
  return (
    <div className="a012-key" role="note" aria-label="Map key">
      <div className="a012-key-item">
        <svg width={x} height={rMax * 2 + 4} aria-hidden="true">
          <defs>
            <radialGradient id="a012-keyfill" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#F6CBA6" />
              <stop offset="55%" stopColor="#DC7638" />
              <stop offset="100%" stopColor="#A9501F" />
            </radialGradient>
          </defs>
          {pos.map((p) => (
            <circle key={p.v} cx={p.cx} cy={rMax * 2 + 2 - r(p.v)} r={r(p.v)} fill="url(#a012-keyfill)" stroke="rgba(11,20,38,0.6)" strokeWidth={0.6} />
          ))}
        </svg>
        <span>
          <strong>One dot = one Tier 1 deal</strong>
          <span className="a012-key-sub">Size = money committed (US$10m, 100m, 250m shown)</span>
        </span>
      </div>
      <div className="a012-key-item">
        <svg width={26} height={26} aria-hidden="true">
          <circle cx={13} cy={13} r={10} fill="rgba(233,180,143,0.08)" stroke="#F0C7A6" strokeWidth={1.6} strokeDasharray="3 2.5" />
        </svg>
        <span>
          <strong>Dashed ring</strong>
          <span className="a012-key-sub">Regional or multi-country deal</span>
        </span>
      </div>
    </div>
  )
}

/** Act 0 · Hook. Full-bleed map of every Tier 1 deal under one headline. */
export default function Act0Hero({ data }: { data: SiteData }) {
  const c = data.results.computed
  return (
    <section className="dark a012-hero" id="act-0" aria-labelledby="act-0-title">
      <Suspense fallback={null}>
        <HeroMap data={data} />
      </Suspense>
      <div className="a012-hero-shade" aria-hidden="true" />
      <div className="a012-hero-text">
        <h1 id="act-0-title" className="a012-hero-h1">
          <span className="a012-hero-atleast">at least</span>
          <span className="a012-hero-number">
            <CountUp value={c.t1_core_usd_m / 1000} format={(v) => `US$${v.toFixed(2)}bn`} duration={2.2} />
            <Info id="t1_total" light />
          </span>
        </h1>
        <p className="a012-hero-sub">
          of public development money to <span style={{ whiteSpace: 'nowrap' }}>ultra-processed</span> food (UPF) manufacturers, 2010–2025</p>
        <HeroKey data={data} />
        <div className="a012-hero-actions">
          <a
            href="#act-1"
            className="btn primary a012-hero-btn"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('act-1')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Read the story <span aria-hidden="true">↓</span>
          </a>
          <Link to="/explore" className="btn a012-hero-btn">
            Skip to the explorer <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <div className="a012-scroll-cue" aria-hidden="true">
        <span className="a012-scroll-line" />
      </div>
    </section>
  )
}
