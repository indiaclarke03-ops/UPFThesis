import { useEffect, useRef, useState, type ReactNode } from 'react'
import scrollama from 'scrollama'

/**
 * Sticky graphic + text steps. `graphic` is a render function receiving the
 * active step index (0-based) and progress within that step (0–1).
 * Steps are plain ReactNodes (≤ 40 words each). Works with keyboard: steps
 * are focusable and focusing one activates it.
 */
export function ScrollStory({
  steps,
  graphic,
  side = 'left',
  id,
  dark = false,
  onStep,
}: {
  steps: ReactNode[]
  graphic: (step: number, progress: number) => ReactNode
  side?: 'left' | 'right'
  id?: string
  dark?: boolean
  onStep?: (i: number) => void
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

  return (
    <div className={`scrolly ${side === 'right' ? 'graphic-right' : ''} ${dark ? 'dark' : ''}`} id={id}>
      <div className="scrolly-graphic" aria-live="polite">
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
