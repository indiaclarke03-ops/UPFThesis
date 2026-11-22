/**
 * Act 5 · Cards for the nine parent groups graded 2 or 3.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { countryName, parentName, type Firm } from '../lib/data'
import { usdM } from '../lib/format'
import { gradeColor, gradeLabel, lenderColor, lenderText, type Lender } from '../lib/tokens'

/** Evidence notes can carry internal research notes after " | "; show only the finding. */
export function cleanEvidence(s: string | null) {
  if (!s) return null
  const first = s.split(' | ')[0]
  return first
    .split(/(?<=\.)\s+/)
    .filter((x) => !/India to|for me\b|not researched further/i.test(x))
    .join(' ')
    .trim()
}

function host(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

export function CoiCards({ firms, withoutYildiz }: { firms: Firm[]; withoutYildiz: boolean }) {
  return (
    <div className="a567-cards">
      {firms.map((f) => {
        const isY = f.parent === 'Yildiz Holding (Ulker/pladis)'
        const ev =
          cleanEvidence(f.evidence) ||
          (f.grade === 3 ? `Graded 3 because the group appears as a party in ${f.n_lawsuits} lawsuit${f.n_lawsuits === 1 ? '' : 's'} against health regulation in the Lighthouse Reports dataset.` : '')
        return (
          <article key={f.parent} className={`a567-card ${isY && withoutYildiz ? 'is-out' : ''}`}>
            <header>
              <span className="a567-grade" style={{ background: gradeColor[f.grade] }}>
                {f.grade}
              </span>
              <div>
                <h4>{parentName(f.parent)}</h4>
                <div className="small muted">{gradeLabel[f.grade]}</div>
              </div>
              <div className="a567-money num">{usdM(f.t1)}</div>
            </header>
            <div className="a567-lenders" aria-label="Tier 1 money by lender">
              {(Object.entries(f.lenders) as [Lender, number][]).map(([l, v]) => (
                <span key={l} style={{ flex: v, background: lenderColor[l] }} title={`${l}: ${usdM(v)}`} />
              ))}
            </div>
            <div className="small" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.8rem', margin: '0.35rem 0' }}>
              {(Object.entries(f.lenders) as [Lender, number][]).map(([l, v]) => (
                <span key={l}>
                  <b style={{ color: lenderText[l] }}>{l}</b> {usdM(v, 0)}
                </span>
              ))}
            </div>
            <div className="small muted">{f.countries.map(countryName).join(' · ')}</div>
            {isY && (
              <p className="small a567-note">
                Grade rests on UK evidence for pladis; its funded deals are mostly in Türkiye, where no evidence was found.
              </p>
            )}
            <Evidence text={ev} />
            <footer className="small">
              <span className="muted">
                Confidence: {f.confidence ?? '—'}
                {f.n_lawsuits > 0 ? ` · ${f.n_lawsuits} lawsuit${f.n_lawsuits === 1 ? '' : 's'}` : ''}
              </span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {f.links.slice(0, 3).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    {host(u)} ↗
                  </a>
                ))}
                <Link to={`/firm/${f.slug}`}>Profile →</Link>
              </span>
            </footer>
          </article>
        )
      })}
    </div>
  )
}

function Evidence({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 230
  const shown = !long || open ? text : text.slice(0, 210).replace(/\s+\S*$/, '') + '…'
  return (
    <p className="small" style={{ margin: '0.5rem 0' }}>
      {shown}{' '}
      {long && (
        <button type="button" className="a567-more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? 'less' : 'more'}
        </button>
      )}
    </p>
  )
}
