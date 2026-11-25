/**
 * "Ask the data" as a compact dropdown: one button opens a searchable,
 * grouped list of pre-written questions. Keeps the top of the explorer clear.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ASK_GROUPS, QUESTIONS } from './ask'

export function AskMenu({ activeId, onPick, onClear }: { activeId: string | null; onPick: (id: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrap = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const active = QUESTIONS.find((x) => x.id === activeId)

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    return ASK_GROUPS.map((g) => ({ g, qs: QUESTIONS.filter((x) => x.group === g && (!s || x.q.toLowerCase().includes(s))) })).filter((x) => x.qs.length)
  }, [q])

  return (
    <div className="askm" ref={wrap}>
      <span className="askm-label">
        <span aria-hidden="true">◆</span> Ask the data
      </span>
      <button type="button" className="askm-trigger" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)}>
        <span className="askm-current">{active ? active.q : `Choose one of ${QUESTIONS.length} questions…`}</span>
        <span aria-hidden="true" className="askm-caret">
          ▾
        </span>
      </button>
      {active && (
        <button type="button" className="askm-clear" onClick={onClear} aria-label="Clear question and filters">
          ✕
        </button>
      )}
      {open && (
        <div className="askm-pop" id={listId}>
          <input ref={input} type="search" className="askm-search" placeholder="Filter questions (e.g. Mexico, lender, screen)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter questions" />
          <div className="askm-list">
            {groups.map(({ g, qs }) => (
              <div key={g} role="group" aria-label={g}>
                <div className="askm-group">{g}</div>
                {qs.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="askm-item"
                    aria-pressed={x.id === activeId}
                    onClick={() => {
                      onPick(x.id)
                      setOpen(false)
                      setQ('')
                    }}
                  >
                    {x.q}
                  </button>
                ))}
              </div>
            ))}
            {!groups.length && <p className="small muted" style={{ padding: '0.5rem 0.75rem' }}>No question matches. Try another word.</p>}
          </div>
          <p className="askm-foot">Answers are sums and counts of the public deal table; each one also sets the filters below.</p>
        </div>
      )}
    </div>
  )
}
