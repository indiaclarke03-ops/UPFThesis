import { useEffect, useRef, useState, type ReactNode } from 'react'
import scrollama from 'scrollama'

/**
 * Sticky graphic + text steps. `graphic` is a render function receiving the
 * active step index (0-based) and progress within that step (0–1).
 * Steps are plain ReactNodes (≤ 40 words each). Works with keyboard: steps
 * are focusable and focusing one activates it.
 *
 * `stepLabels` (optional, one short label per step) adds a button bar above the
 * graphic so readers can jump straight to any view instead of scrolling.
 */
export function ScrollStory({
  steps,
  graphic,
  side = 'left',
  id,
  dark = false,
  onStep,
  stepLabels,
}: {
  steps: ReactNode[]
  graphic: (step: number, progress: number) => ReactNode
  side?: 'left' | 'right'
  id?: string
  dark?: boolean
  onStep?: (i: number) => void
  stepLabels?: string[]
}) {
  const stepsRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = stepsRef.current
    if (!el) return
    const s = scrollama()
    s.setup({
      step: Array.from(el.querySelectorAll<HTMLElement>('.step')),
      offset: 0.6,
      progress: true,
    })
      .onStepEnter(({ index }) => {
        setActive(index)
        onStep?.(index)
      })
      .onStepProgress(({ progress: p }) => setProgress(p))
    const onResize = () => s.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      s.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length])

  const jump = (i: number) => {
    setActive(i)
    onStep?.(i)
    const el = stepsRef.current?.querySelectorAll<HTMLElement>('.step')[i]
    if (!el) return
    // land the step's card just above scrollama's 60% trigger line
    const inner = el.querySelector<HTMLElement>('.step-inner') ?? el
    const y = inner.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.45
    window.scrollTo({ top: y, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <div className={`scrolly ${side === 'right' ? 'graphic-right' : ''} ${dark ? 'dark' : ''}`} id={id}>
      <div className="scrolly-graphic" aria-live="polite">
        {stepLabels && stepLabels.length === steps.length && (
          <div className="step-jump" role="group" aria-label="Jump to view">
            {stepLabels.map((l, i) => (
              <button key={l + i} type="button" aria-pressed={i === active} title={l} onClick={() => jump(i)}>
                <span className="step-jump-n" aria-hidden="true">{i + 1}</span>
                <span className="step-jump-l">{l}</span>
              </button>
            ))}
          </div>
        )}
        {graphic(active, progress)}
      </div>
      <div className="scrolly-steps" ref={stepsRef}>
        {steps.map((s, i) => (
          <div className={`step ${i === active ? 'is-active' : ''}`} key={i} data-step={i}>
            <div className="step-inner" tabIndex={0} onFocus={() => setActive(i)}>
              {s}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
