import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import { ACTS, ProgressRail } from '../components/Layout'
import { Skeleton } from '../components/ui'
import { useData, type SiteData } from '../lib/data'
import Act0Hero from './Act0Hero'
import { Summary } from './a012_Summary'

// Acts 1–7 are split into their own chunks and mounted as the reader approaches,
// so the hero paints fast on phones. Deep links (#act-n) still work: the
// placeholder carries the act id and mounts immediately when targeted.
const LAZY: { id: string; C: React.LazyExoticComponent<ComponentType<{ data: SiteData }>> }[] = [
  { id: 'act-1', C: lazy(() => import('./Act1Context')) },
  { id: 'act-2', C: lazy(() => import('./Act2Scale')) },
  { id: 'act-3', C: lazy(() => import('./Act3BlindSpot')) },
  { id: 'act-4', C: lazy(() => import('./Act4Regulation')) },
  { id: 'act-5', C: lazy(() => import('./Act5Conflict')) },
  { id: 'act-6', C: lazy(() => import('./Act6Cases')) },
  { id: 'act-7', C: lazy(() => import('./Act7Close')) },
]

function Placeholder({ id }: { id: string }) {
  const title = ACTS.find((a) => a.id === id)?.title
  return (
    <section className="act" id={id} style={{ minHeight: '120vh' }} aria-busy="true">
      <div className="act-header">
        <span className="act-num">{title}</span>
        <Skeleton height={48} style={{ maxWidth: 420 }} />
      </div>
    </section>
  )
}

function LazyAct({ id, C, data, eager }: { id: string; C: (typeof LAZY)[number]['C']; data: SiteData; eager: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(eager || window.location.hash.includes(id))
  useEffect(() => {
    if (show) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: '150% 0px' })
    io.observe(el)
    // "Jump to act" requests mount every act up to the target so the layout is final before scrolling.
    const onJump = (e: Event) => {
      const target = LAZY.findIndex((a) => a.id === (e as CustomEvent<string>).detail)
      if (LAZY.findIndex((a) => a.id === id) <= target) setShow(true)
    }
    window.addEventListener('act-jump', onJump)
    return () => {
      io.disconnect()
      window.removeEventListener('act-jump', onJump)
    }
  }, [show, id])
  return (
    <div ref={ref}>
      {show ? (
        <Suspense fallback={<Placeholder id={id} />}>
          <C data={data} />
        </Suspense>
      ) : (
        <Placeholder id={id} />
      )}
    </div>
  )
}

/** The scroll story: Acts 0–7. Each act receives the loaded SiteData. */
export default function Story() {
  const data = useData()
  // Once the hero is up, warm the remaining act chunks in idle time.
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    if (!data) return
    const t = window.setTimeout(() => {
      Promise.all([import('./Act1Context'), import('./Act2Scale')]).then(() => setWarm(true))
    }, 1500)
    return () => window.clearTimeout(t)
  }, [data])
  if (!data)
    return (
      <div style={{ background: 'var(--night)', minHeight: '100vh', paddingTop: '30vh' }}>
        <div className="narrow">
          <Skeleton height={90} style={{ opacity: 0.15 }} />
        </div>
      </div>
    )
  return (
    <>
      <ProgressRail />
      <Act0Hero data={data} />
      <Summary data={data} />
      {LAZY.map((a, i) => (
        <LazyAct key={a.id} id={a.id} C={a.C} data={data} eager={warm && i < 1} />
      ))}
    </>
  )
}
