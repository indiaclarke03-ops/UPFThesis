/**
 * Small shared UI pieces: CountUp, Tooltip, ChartFrame (title + summary +
 * accessible data-table toggle), ExploreLink, Skeleton, Toggle.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useInView, useReducedMotion } from '../lib/hooks'

/* ---------------------------------------------------------------- CountUp */
export function CountUp({
  value,
  format,
  duration = 1.6,
  start = true,
}: {
  value: number
  format: (v: number) => string
  duration?: number
  start?: boolean
}) {
  const reduce = useReducedMotion()
  const [ref, seen] = useInView<HTMLSpanElement>(0.4)
  const [v, setV] = useState(reduce ? value : 0)
  const done = useRef(false)
  useEffect(() => {
    if (reduce) {
      setV(value)
      return
    }
    if (!seen || !start || done.current) return
    done.current = true
    // easeOutExpo-like curve via requestAnimationFrame (no animation library on the critical path)
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / (duration * 1000))
      setV(value * (1 - Math.pow(1 - t, 4)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, start, value, duration, reduce])
  return (
    <span ref={ref} className="num">
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(v)}</span>
    </span>
  )
}

/* ---------------------------------------------------------------- Tooltip */
export interface TipState {
  x: number
  y: number
  content: ReactNode
  pinned?: boolean
}

/** Cursor-following tooltip on desktop; tap-to-pin on touch. */
export function useTooltip() {
  const [tip, setTip] = useState<TipState | null>(null)
  useEffect(() => {
    if (!tip?.pinned) return
    const close = (e: Event) => {
      const t = e.target as HTMLElement
      if (!t.closest?.('.tooltip')) setTip(null)
    }
    const id = setTimeout(() => document.addEventListener('pointerdown', close), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('pointerdown', close)
    }
  }, [tip?.pinned])
  return {
    tip,
    show: (e: { clientX: number; clientY: number; pointerType?: string }, content: ReactNode) =>
      setTip({ x: e.clientX, y: e.clientY, content, pinned: e.pointerType === 'touch' }),
    move: (e: { clientX: number; clientY: number }) => setTip((t) => (t && !t.pinned ? { ...t, x: e.clientX, y: e.clientY } : t)),
    hide: () => setTip((t) => (t?.pinned ? t : null)),
    clear: () => setTip(null),
  }
}

export function Tooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200
  const left = tip.x + 16 + 300 > w ? Math.max(8, tip.x - 316) : tip.x + 16
  return (
    <div className={`tooltip ${tip.pinned ? 'pinned' : ''}`} style={{ left, top: tip.y + 14 }} role="status">
      {tip.content}
    </div>
  )
}

/* ------------------------------------------------------------- ChartFrame */
export function ChartFrame({
  title,
  sub,
  summary,
  table,
  children,
  explore,
  source,
}: {
  title?: ReactNode
  sub?: ReactNode
  /** Plain-language text summary for screen readers (and the table toggle). */
  summary: string
  /** Accessible data table: header row + rows. */
  table?: { head: string[]; rows: (string | number)[][] }
  children: ReactNode
  explore?: { to: string; label?: string }
  source?: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <figure className="chart-frame" style={{ margin: 0 }}>
      {title && <div className="chart-title">{title}</div>}
      {sub && <div className="chart-sub">{sub}</div>}
      <p className="sr-only">{summary}</p>
      {showTable && table ? (
        <div style={{ maxHeight: '55vh', overflow: 'auto' }}>
          <table className="data-table">
            <caption className="sr-only">{summary}</caption>
            <thead>
              <tr>
                {table.head.map((h, i) => (
                  <th key={h} className={i > 0 ? 'n' : ''} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={j > 0 ? 'n' : ''}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div aria-hidden={table ? undefined : undefined}>{children}</div>
      )}
      <figcaption className="chart-foot">
        <span>{source ?? 'Commitments, US$m at 2024 prices.'}</span>
        <span style={{ display: 'inline-flex', gap: '1rem', alignItems: 'center' }}>
          {table && (
            <button type="button" className="btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }} onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
              {showTable ? 'Show chart' : 'Show data table'}
            </button>
          )}
          {explore && <ExploreLink to={explore.to} label={explore.label} />}
        </span>
      </figcaption>
    </figure>
  )
}

export function ExploreLink({ to, label = 'Explore this data' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="explore-link">
      {label} <span aria-hidden="true">→</span>
    </Link>
  )
}

export function ActEnd({ to, label = 'Explore this' }: { to: string; label?: string }) {
  return (
    <div className="act-end">
      <ExploreLink to={to} label={label} />
    </div>
  )
}

export function Skeleton({ height = 320, style }: { height?: number | string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height, width: '100%', ...style }} aria-hidden="true" />
}

export function Toggle<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="toggle" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
