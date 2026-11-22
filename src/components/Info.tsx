import { useEffect, useId, useRef, useState } from 'react'
import { PROVENANCE } from '../lib/provenance'
import './Info.css'

/**
 * ⓘ provenance button. Hover (desktop) or tap (mobile) opens how the number
 * was made: dataset, filter, do-file section, decision ID and caveat.
 */
export function Info({ id, light = false }: { id: keyof typeof PROVENANCE | string; light?: boolean }) {
  const p = PROVENANCE[id]
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const popId = useId()

  useEffect(() => {
    if (!pinned) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) {
        setPinned(false)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [pinned])

  if (!p) return null
  const show = open || pinned
  return (
    <span
      className={`info ${light ? 'info-light' : ''}`}
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="info-btn"
        aria-label={`How this number was made: ${p.label}`}
        aria-expanded={show}
        aria-controls={popId}
        onClick={() => {
          setPinned((v) => !v)
          setOpen(true)
        }}
      >
        i
      </button>
      {show && (
        <span className="info-pop" role="dialog" id={popId} aria-label={p.label}>
          <span className="info-title">{p.label}</span>
          <span className="info-value">{p.value}</span>
          <dl>
            <dt>Dataset</dt>
            <dd>{p.dataset}</dd>
            <dt>Filter</dt>
            <dd>{p.filter}</dd>
            <dt>Source</dt>
            <dd>{p.source}</dd>
            {p.decision && (
              <>
                <dt>Decision</dt>
                <dd>{p.decision}</dd>
              </>
            )}
            {p.caveat && (
              <>
                <dt>Caveat</dt>
                <dd>{p.caveat}</dd>
              </>
            )}
          </dl>
        </span>
      )}
    </span>
  )
}
