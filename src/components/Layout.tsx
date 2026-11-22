import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useData } from '../lib/data'
import './Layout.css'

export const ACTS = [
  { id: 'act-0', short: 'Hook', title: 'At least US$6.43 billion' },
  { id: 'act-1', short: 'UPF', title: 'What counts as ultra-processed' },
  { id: 'act-2', short: 'H1', title: 'How much, and how visible' },
  { id: 'act-3', short: 'H2', title: 'The institutional blind spot' },
  { id: 'act-4', short: 'H3', title: 'Does regulation change the flow?' },
  { id: 'act-5', short: 'H4', title: 'The same firms' },
  { id: 'act-6', short: 'Cases', title: 'Türkiye and Mexico' },
  { id: 'act-7', short: 'Meaning', title: 'What it means' },
] as const

export function Nav() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const onStory = pathname === '/'
  return (
    <header className={`nav ${scrolled || !onStory ? 'nav-solid' : 'nav-clear'}`}>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <Link to="/" className="nav-brand" aria-label="Funding What We Regulate: story">
        <span className="nav-mark" aria-hidden="true" />
        <span className="nav-title">Funding What We Regulate</span>
      </Link>
      <nav aria-label="Main" className="nav-links">
        <NavLink to="/" end>
          Story
        </NavLink>
        <NavLink to="/explore">Explorer</NavLink>
        <NavLink to="/scenarios">Scenarios</NavLink>
        <NavLink to="/methods">Methods</NavLink>
        <a href="?present=1#/" className="nav-present" title="Presentation mode">
          Present
        </a>
      </nav>
    </header>
  )
}

/** Persistent mini progress rail showing the acts on the story page. */
export function ProgressRail() {
  const [active, setActive] = useState<string>('act-0')
  const [frac, setFrac] = useState(0)
  useEffect(() => {
    const on = () => {
      const mid = window.innerHeight * 0.4
      let cur: string = ACTS[0].id
      for (const a of ACTS) {
        const el = document.getElementById(a.id)
        if (el && el.getBoundingClientRect().top < mid) cur = a.id
      }
      setActive(cur)
      const h = document.documentElement.scrollHeight - window.innerHeight
      setFrac(h > 0 ? window.scrollY / h : 0)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <nav className="rail" aria-label="Story progress">
      <div className="rail-bar" style={{ transform: `scaleY(${frac})` }} aria-hidden="true" />
      <ol>
        {ACTS.map((a, i) => (
          <li key={a.id} className={a.id === active ? 'on' : ''}>
            <a href={`#${a.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth' }) }} aria-current={a.id === active ? 'step' : undefined}>
              <span className="rail-dot" aria-hidden="true" />
              <span className="rail-label">
                <span className="rail-n">{i}</span> {a.short}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Footer() {
  const d = useData()
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="serif" style={{ fontSize: '1.2rem' }}>
            Funding What We Regulate
          </div>
          <p className="small muted" style={{ maxWidth: 440 }}>
            An interactive companion to India Clarke’s NYU Center for Global Affairs MS thesis on public development finance and
            ultra-processed food manufacturers, 2010–2025.
          </p>
        </div>
        <div className="small">
          <div>
            <strong>Data version:</strong> {d?.meta.data_version ?? 'Frozen 18 Nov 2026; H3 DiD per D066, 21 Nov 2026'}
          </div>
          <div>
            <strong>Commitments, not disbursements.</strong> US$ at 2024 prices.
          </div>
          <div className="muted">Lawsuit data: Lighthouse Reports. Exclusion lists: lenders’ own published documents.</div>
        </div>
        <div className="small">
          <strong>How to cite</strong>
          <p className="muted" style={{ margin: '0.25rem 0 0' }}>
            {d?.meta.citation ??
              'Clarke, India. 2026. “Funding What We Regulate: Public Money, Corporate Power and the Ultra-Processed Food Transition.” MS thesis, New York University Center for Global Affairs.'}
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <Link to="/methods">Methods &amp; data</Link> · <Link to="/explore">Explorer</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  )
}
